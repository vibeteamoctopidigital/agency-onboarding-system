import crypto from "node:crypto";
import { ghlClient } from "../../lib/ghl/ghl.client";
import { logAudit } from "../../utils/audit";
import { badGateway, badRequest, conflict, unauthorized } from "../../utils/appError";
import { decryptSecret, encryptSecret } from "../../utils/crypto";
import { prisma } from "../../utils/prisma";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, type JwtPayload } from "../../utils/jwt";

export class AuthService {
  /**
   * First-time Agency Owner connect: all four credentials required, the GHL
   * key is validated against the live API BEFORE anything is persisted, then
   * agency + owner are created in one transaction with the key encrypted at
   * rest. Repeat logins use login() with just email + password.
   */
  async connect(dto: {
    email: string;
    password: string;
    agencyName: string;
    ghlCompanyId: string;
    ghlApiKey: string;
    ghlMediaLocationId: string;
    ghlMediaApiKey: string;
  }) {
    const existingAgency = await prisma.agency.findUnique({ where: { ghlCompanyId: dto.ghlCompanyId } });
    if (existingAgency) {
      throw conflict("This GHL account is already connected. Please log in with your email and password.", "ALREADY_CONNECTED");
    }
    const existingUser = await prisma.user.findFirst({ where: { email: dto.email, isDeleted: false } });
    if (existingUser) {
      throw conflict("This email is already registered. Please log in instead.", "EMAIL_TAKEN");
    }

    // Validate against GHL first - nothing persists if the key is bad.
    // The token alone proves which agency it belongs to (each returned location
    // carries the real companyId), so we also catch a wrong/mistyped Company ID
    // here - e.g. the X-XXX-XXX "Relationship Number", which is NOT the API
    // Company ID and would otherwise poison every later GHL call.
    const validation = await ghlClient.validateApiKey(dto.ghlApiKey, dto.ghlCompanyId);
    if (!validation.valid) {
      throw unauthorized(validation.reason ?? "GHL rejected the API key.", "GHL_KEY_INVALID");
    }

    // Media storage key (location-level PIT) is validated live too - a bad
    // key must fail HERE with a clear reason, not at the first file upload.
    const mediaValidation = await ghlClient.validateMediaLocationKey(dto.ghlMediaApiKey, dto.ghlMediaLocationId);
    if (!mediaValidation.valid) {
      throw unauthorized(mediaValidation.reason ?? "GHL rejected the media storage key.", "GHL_MEDIA_KEY_INVALID");
    }
    let companyId = dto.ghlCompanyId;
    const discovered = await ghlClient.discoverCompanyId(dto.ghlApiKey).catch(() => null);
    if (discovered && discovered !== dto.ghlCompanyId) {
      if (/^\d-\d{3}-\d{3}$/.test(dto.ghlCompanyId.trim())) {
        // Unambiguous relationship-number format - correct it silently.
        companyId = discovered;
      } else {
        throw badRequest(
          `The Company ID you entered does not match this API key's agency. GHL reports your Company ID as "${discovered}" - please use that value (note: the X-XXX-XXX Relationship Number is not the Company ID).`,
          "COMPANY_ID_MISMATCH",
        );
      }
    }
    if (companyId !== dto.ghlCompanyId) {
      const clash = await prisma.agency.findUnique({ where: { ghlCompanyId: companyId } });
      if (clash) {
        throw conflict("This GHL account is already connected. Please log in with your email and password.", "ALREADY_CONNECTED");
      }
    }

    const passwordHash = await hashPassword(dto.password);
    const slugBase = dto.agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "agency";

    const agency = await prisma.$transaction(async (tx) => {
      return tx.agency.create({
        data: {
          name: dto.agencyName,
          slug: `${slugBase}-${Date.now()}`,
          ghlCompanyId: companyId,
          ghlApiKeyEncrypted: encryptSecret(dto.ghlApiKey),
          ghlMediaLocationId: dto.ghlMediaLocationId,
          ghlMediaKeyEncrypted: encryptSecret(dto.ghlMediaApiKey),
          connectedAt: new Date(),
          users: {
            create: {
              email: dto.email,
              passwordHash,
              name: dto.agencyName,
              initials: dto.agencyName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
              role: "AGENCY_OWNER",
              locationId: companyId,
            },
          },
        },
        include: { users: true },
      });
    });

    const user = agency.users[0];
    await logAudit({
      agencyId: agency.id,
      actorId: user.id,
      action: "AGENCY_CONNECTED",
      entityType: "Agency",
      entityId: agency.id,
      details: `Agency connected to GHL company ${companyId}`,
    });

    const jwtPayload: JwtPayload = { userId: user.id, role: user.role, agencyId: agency.id };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        initials: user.initials,
        agencyId: agency.id,
        agencyName: agency.name,
      },
      accessToken: signAccessToken(jwtPayload),
      refreshToken: signRefreshToken(jwtPayload),
    };
  }

  /**
   * Owner updates (or first adds) the media-storage sub-account credentials on
   * an already-connected agency - validated live before anything is saved.
   */
  async updateMediaStorage(agencyId: string, actorId: string, dto: { ghlMediaLocationId: string; ghlMediaApiKey: string }) {
    const validation = await ghlClient.validateMediaLocationKey(dto.ghlMediaApiKey, dto.ghlMediaLocationId);
    if (!validation.valid) {
      throw unauthorized(validation.reason ?? "GHL rejected the media storage key.", "GHL_MEDIA_KEY_INVALID");
    }

    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        ghlMediaLocationId: dto.ghlMediaLocationId,
        ghlMediaKeyEncrypted: encryptSecret(dto.ghlMediaApiKey),
      },
    });

    await logAudit({
      agencyId,
      actorId,
      action: "MEDIA_STORAGE_UPDATED",
      entityType: "Agency",
      entityId: agencyId,
      details: `Media storage set to location ${dto.ghlMediaLocationId}`,
    });

    return { ghlMediaLocationId: dto.ghlMediaLocationId };
  }

  /**
   * Agency owner impersonates a team member - issues a fresh JWT for the
   * target user without requiring their password.
   *
   * If the target isn't found by local DB ID, we fetch all users from GHL,
   * match by GHL user ID, and create/find the corresponding local user.
   */
  async impersonate(ownerId: string, agencyId: string, targetUserId: string) {
    // 1. Try local DB lookup first (fast path - local DB ID)
    let target = await prisma.user.findFirst({
      where: { id: targetUserId, agencyId, role: "TEAM_MEMBER", isDeleted: false },
    });

    // 2. Not found locally - it's probably a GHL user ID. Sync from GHL.
    if (!target) {
      const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
      if (!agency?.ghlCompanyId || !agency.ghlApiKeyEncrypted) {
        throw badRequest("Agency is not connected to GHL", "NOT_CONNECTED");
      }

      let apiKey: string;
      try { apiKey = decryptSecret(agency.ghlApiKeyEncrypted); } catch {
        throw badRequest("The stored GHL API key can't be read - reconnect your agency.", "AGENCY_KEY_UNREADABLE");
      }

      let ghlUsers: Awaited<ReturnType<typeof ghlClient.listAllUsers>>;
      try {
        ghlUsers = await ghlClient.listAllUsers(apiKey, agency.ghlCompanyId);
      } catch (err: any) {
        throw badGateway("Could not fetch users from GHL. Please try again.");
      }

      const ghlUser = ghlUsers.find((u) => u.id === targetUserId);
      if (!ghlUser) {
        throw badRequest("Team member not found in GHL", "USER_NOT_FOUND");
      }

      const email = ghlUser.email?.trim().toLowerCase();
      if (!email) {
        throw badRequest("This GHL user has no email address and cannot be impersonated", "MISSING_EMAIL");
      }

      // Check if a local user already exists with this email
      target = await prisma.user.findFirst({
        where: { email, agencyId, role: "TEAM_MEMBER", isDeleted: false },
      });

      // Still not found - create a new local user (same pattern as syncTeamFromGhl)
      if (!target) {
        const softDeleted = await prisma.user.findFirst({
          where: { email, agencyId },
        });

        const name = ghlUser.name?.trim() ||
          [ghlUser.firstName, ghlUser.lastName].filter(Boolean).join(" ").trim() ||
          email;
        const tempPassword = crypto.randomBytes(8).toString("hex");
        const passwordHash = await hashPassword(tempPassword);
        const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

        target = softDeleted
          ? await prisma.user.update({
              where: { id: softDeleted.id },
              data: { name, initials, passwordHash, tempPassword: true, isDeleted: false, isAvailable: true },
            })
          : await prisma.user.create({
              data: {
                email,
                passwordHash,
                name,
                initials,
                role: "TEAM_MEMBER",
                skills: "",
                tempPassword: true,
                agencyId,
              },
            });
      }
    }

    const jwtPayload: JwtPayload = { userId: target.id, role: target.role, agencyId: target.agencyId };

    await logAudit({
      agencyId,
      actorId: ownerId,
      action: "IMPERSONATED",
      entityType: "User",
      entityId: target.id,
      details: `Owner impersonated team member ${target.name} (${target.id})`,
    });

    return {
      user: {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
        initials: target.initials,
        agencyId: target.agencyId,
        tempPassword: target.tempPassword,
      },
      accessToken: signAccessToken(jwtPayload),
      refreshToken: signRefreshToken(jwtPayload),
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
      include: { agency: true },
    });

    if (!user || !user.passwordHash) {
      throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const jwtPayload: JwtPayload = { userId: user.id, role: user.role, agencyId: user.agencyId };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        initials: user.initials,
        agencyId: user.agencyId,
        agencyName: user.agency.name,
        tempPassword: user.tempPassword,
        isAvailable: user.isAvailable,
      },
      accessToken: signAccessToken(jwtPayload),
      refreshToken: signRefreshToken(jwtPayload),
    };
  }

  async refreshToken(token: string) {
    const { verifyRefreshToken } = await import("../../utils/jwt");
    // An expired/garbage refresh token is a routine 401, never a 500 - the
    // frontend relies on the status code to trigger its logout redirect.
    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw unauthorized("Refresh token expired or invalid", "REFRESH_INVALID");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { subAccountProfile: { select: { status: true } } },
    });

    if (!user || user.isDeleted) {
      throw unauthorized("This account is no longer active", "ACCOUNT_DISABLED");
    }
    if (user.role === "SUB_ACCOUNT" && user.subAccountProfile?.status === "BLOCKED") {
      throw unauthorized("Your support portal access has been disabled by the agency", "ACCESS_BLOCKED");
    }

    const jwtPayload: JwtPayload = { userId: user.id, role: user.role, agencyId: user.agencyId };

    return {
      accessToken: signAccessToken(jwtPayload),
      refreshToken: signRefreshToken(jwtPayload),
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw unauthorized("User not found", "USER_NOT_FOUND");
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw badRequest("Current password is incorrect", "WRONG_PASSWORD");
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tempPassword: false },
    });
  }

  /**
   * First-login password set for a team member who logged in with a temporary
   * password. No current password is required - the JWT from their successful
   * login is proof enough - but the account MUST still be flagged tempPassword,
   * so this can't be used to bypass the normal change-password flow.
   */
  async firstLoginSetPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) throw unauthorized("User not found", "USER_NOT_FOUND");
    if (!user.tempPassword) throw badRequest("Your password has already been set", "PASSWORD_ALREADY_SET");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tempPassword: false },
    });
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { agency: true },
    });

    if (!user) throw unauthorized("User not found", "USER_NOT_FOUND");

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      initials: user.initials,
      agencyId: user.agencyId,
      agencyName: user.agency.name,
      // Lets the admin UI show/prompt the media-storage settings state.
      mediaStorageConfigured: Boolean(user.agency.ghlMediaLocationId && user.agency.ghlMediaKeyEncrypted),
      mediaLocationId: user.agency.ghlMediaLocationId,
      locationId: user.locationId,
      skills: user.skills,
      isAvailable: user.isAvailable,
      tempPassword: user.tempPassword,
      contactEmail: user.contactEmail,
      plan: user.plan,
    };
  }
}

export const authService = new AuthService();
