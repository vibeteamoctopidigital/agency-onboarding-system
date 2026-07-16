import { ghlClient } from "../../lib/ghl/ghl.client";
import { AppError } from "../../utils/appError";
import { decryptSecret, encryptSecret } from "../../utils/crypto";
import { env } from "../../utils/envConfig";
import { signAccessToken, signRefreshToken, type JwtPayload } from "../../utils/jwt";
import { prisma } from "../../utils/prisma";
import { StatusCodes } from "http-status-codes";

/**
 * Sub-account portal entry. SECURITY INVARIANT (first phase.md §4): the
 * location_id from the URL is a CLAIM, never a credential. Dashboard access
 * is only ever granted through our own signed session token, issued only
 * after the location is found ACTIVE in our database.
 */

type PortalResult =
  | { status: "ACTIVE"; user: object; accessToken: string; refreshToken: string }
  | { status: "PENDING"; requestedAt: Date; created: boolean }
  | { status: "REJECTED" }
  | { status: "BLOCKED" }
  | { status: "UNKNOWN_LOCATION" };

export class PortalService {
  /**
   * Single-agency deployment: resolve the one connected agency. Newest connect
   * wins - stale/demo rows from earlier environments must never capture the
   * portal (a seeded row with an undecryptable key once broke every entry).
   */
  private async connectedAgency() {
    const agency = await prisma.agency.findFirst({
      where: { ghlCompanyId: { not: null }, ghlApiKeyEncrypted: { not: null } },
      orderBy: { connectedAt: "desc" },
    });
    if (!agency) {
      throw new AppError(
        "No agency is connected yet. The agency owner must complete the connect step first.",
        StatusCodes.SERVICE_UNAVAILABLE,
        "NO_AGENCY_CONNECTED",
      );
    }
    return agency;
  }

  async enter(locationId: string): Promise<PortalResult> {
    // The same database can hold rows for this location under more than one
    // agency row (e.g. a stale demo/dev agency alongside the real one). A
    // client the owner has ACTIVATED anywhere must get in - an ACTIVE row wins
    // over whichever agency happens to be "newest connected".
    const rowsAnywhere = await prisma.subAccount.findMany({ where: { ghlLocationId: locationId } });
    const activeAnywhere = rowsAnywhere.find((r) => r.status === "ACTIVE");
    if (activeAnywhere) return this.issueSession(activeAnywhere.agencyId, activeAnywhere.id);

    const agency = await this.connectedAgency();

    const existing = rowsAnywhere.find((r) => r.agencyId === agency.id) ?? null;

    if (existing) {
      if (existing.status === "ACTIVE") return this.issueSession(agency.id, existing.id);
      if (existing.status === "REJECTED") return { status: "REJECTED" };
      if (existing.status === "BLOCKED") return { status: "BLOCKED" };
      return { status: "PENDING", requestedAt: existing.requestedAt, created: false };
    }

    // Unknown location - verify it actually exists under this agency in GHL
    // before creating anything. Garbage/guessed IDs create no rows.
    let apiKey: string;
    try {
      apiKey = decryptSecret(agency.ghlApiKeyEncrypted!);
    } catch {
      // Stored ciphertext doesn't match the current ENCRYPTION_KEY - an ops
      // problem, not the visitor's. Surface it clearly instead of a raw 500.
      throw new AppError(
        "The agency's stored GHL key cannot be read (encryption key changed?). The agency owner must reconnect.",
        StatusCodes.SERVICE_UNAVAILABLE,
        "AGENCY_KEY_UNREADABLE",
      );
    }
    const location = await ghlClient.getLocation(apiKey, locationId);
    if (!location) return { status: "UNKNOWN_LOCATION" };

    try {
      const created = await prisma.$transaction(async (tx) => {
        const subAccount = await tx.subAccount.create({
          data: {
            agencyId: agency.id,
            ghlLocationId: locationId,
            name: location.name || locationId,
            contactEmail: location.email ?? null,
            status: "PENDING",
          },
        });
        // In-app notification to every owner (email delivery is a Phase 2 stub).
        const owners = await tx.user.findMany({
          where: { agencyId: agency.id, role: "AGENCY_OWNER", isDeleted: false },
          select: { id: true },
        });
        await tx.notification.createMany({
          data: owners.map((owner) => ({
            userId: owner.id,
            type: "SUB_ACCOUNT_REQUEST",
            title: "New sub-account access request",
            message: `${location.name || locationId} is requesting portal access.`,
          })),
        });
        return subAccount;
      });
      return { status: "PENDING", requestedAt: created.requestedAt, created: true };
    } catch (err) {
      // Unique-constraint race: two simultaneous first clicks - treat as the
      // idempotent pending case instead of failing.
      if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
        const row = await prisma.subAccount.findUnique({
          where: { agencyId_ghlLocationId: { agencyId: agency.id, ghlLocationId: locationId } },
        });
        if (row?.status === "ACTIVE") return this.issueSession(agency.id, row.id);
        if (row?.status === "REJECTED") return { status: "REJECTED" };
        if (row?.status === "BLOCKED") return { status: "BLOCKED" };
        return { status: "PENDING", requestedAt: row?.requestedAt ?? new Date(), created: false };
      }
      throw err;
    }
  }

  /**
   * Single-agency owner auto-login (client requirement): SERVER-side check
   * only - no secret ever reaches the browser. Enabled when the backend env
   * carries GHL_VERIFY_COMPANY_ID + GHL_VERIFY_API_KEY and BOTH match the
   * connected agency row (companyId exists in the DB and the stored PIT equals
   * the env key). Unset either env var to disable auto-login entirely.
   */
  async adminEnter() {
    if (!env.GHL_VERIFY_COMPANY_ID || !env.GHL_VERIFY_API_KEY) {
      throw new AppError(
        "Auto-login is not enabled on this server (GHL_VERIFY_COMPANY_ID / GHL_VERIFY_API_KEY not set).",
        StatusCodes.UNAUTHORIZED,
        "AUTO_LOGIN_DISABLED",
      );
    }

    const inp = encryptSecret(env.GHL_VERIFY_API_KEY)
console.log(inp);

    // 1) The env company must exist in the DB as a connected agency.
    const agency = await prisma.agency.findUnique({ where: { ghlCompanyId: env.GHL_VERIFY_COMPANY_ID } });
    if (!agency || !agency.ghlApiKeyEncrypted) {
      const looksLikeRelationshipNumber = /^\d-\d{3}-\d{3}$/.test(env.GHL_VERIFY_COMPANY_ID.trim());
      throw new AppError(
        looksLikeRelationshipNumber
          ? "Auto-login rejected: GHL_VERIFY_COMPANY_ID is set to the X-XXX-XXX Relationship Number - use the alphanumeric API Company ID instead."
          : "Auto-login rejected: GHL_VERIFY_COMPANY_ID does not match any connected agency in the database.",
        StatusCodes.UNAUTHORIZED,
        "AUTO_LOGIN_INVALID",
      );
    }

    // 2) The env PIT must equal the agency's stored (encrypted) PIT.
    let storedKey: string;
    try {
      storedKey = decryptSecret(agency.ghlApiKeyEncrypted);
    } catch {
      throw new AppError(
        "Auto-login rejected: the agency's stored GHL key can't be read - reconnect the agency.",
        StatusCodes.UNAUTHORIZED,
        "AGENCY_KEY_UNREADABLE",
      );
    }
    const { timingSafeEqual } = await import("node:crypto");
    const a = Buffer.from(storedKey);
    const b = Buffer.from(env.GHL_VERIFY_API_KEY);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new AppError(
        "Auto-login rejected: GHL_VERIFY_API_KEY does not match the key this agency connected with.",
        StatusCodes.UNAUTHORIZED,
        "AUTO_LOGIN_INVALID",
      );
    }

    const owner = await prisma.user.findFirst({
      where: { agencyId: agency.id, role: "AGENCY_OWNER", isDeleted: false },
      orderBy: { createdAt: "asc" },
    });
    if (!owner) {
      throw new AppError("No active owner account exists for this agency.", StatusCodes.UNAUTHORIZED, "NO_OWNER");
    }

    const payload: JwtPayload = { userId: owner.id, role: owner.role, agencyId: agency.id };
    return {
      user: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: owner.role,
        initials: owner.initials,
        agencyId: agency.id,
        agencyName: agency.name,
      },
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }

  /** Issue a session for an ACTIVE sub-account, creating its user identity on first entry. */
  private async issueSession(agencyId: string, subAccountId: string): Promise<PortalResult> {
    const subAccount = await prisma.subAccount.findUniqueOrThrow({
      where: { id: subAccountId },
      include: { user: true, agency: { select: { name: true } } },
    });

    let user = subAccount.user;
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: subAccount.name,
          initials: subAccount.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "SA",
          role: "SUB_ACCOUNT",
          locationId: subAccount.ghlLocationId,
          contactEmail: subAccount.contactEmail,
          agencyId,
        },
      });
      await prisma.subAccount.update({ where: { id: subAccountId }, data: { userId: user.id } });
    }

    const payload: JwtPayload = { userId: user.id, role: user.role, agencyId };
    return {
      status: "ACTIVE",
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        initials: user.initials,
        contactEmail: user.contactEmail,
        locationId: subAccount.ghlLocationId,
        agencyId,
        agencyName: subAccount.agency.name,
      },
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }
}

export const portalService = new PortalService();
