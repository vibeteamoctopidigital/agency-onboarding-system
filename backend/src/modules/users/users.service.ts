import crypto from "node:crypto";
import { badGateway, badRequest, conflict, notFound } from "../../utils/appError";
import { logAudit } from "../../utils/audit";
import { emailService } from "../../lib/email/email.service";
import { GhlApiError, ghlClient } from "../../lib/ghl/ghl.client";
import { decryptSecret } from "../../utils/crypto";
import { prisma } from "../../utils/prisma";
import { hashPassword } from "../../utils/password";

export class UsersService {
  async listTeamMembers(agencyId: string) {
    const users = await prisma.user.findMany({
      where: { agencyId, role: "TEAM_MEMBER", isDeleted: false },
      orderBy: { name: "asc" },
      include: {
        assignedTickets: {
          where: { stage: { not: "RESOLVED" } },
          select: { id: true, stage: true },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      initials: u.initials,
      skills: u.skills ? u.skills.split(",").filter(Boolean) : [],
      isAvailable: u.isAvailable,
      openTickets: u.assignedTickets.length,
      reviewTickets: u.assignedTickets.filter((t) => t.stage === "REVIEW").length,
      createdAt: u.createdAt,
    }));
  }

  async createTeamMember(agencyId: string, actorId: string, dto: { name: string; email: string; skills: string[] }) {
    // Soft-deleted rows keep their (email, agencyId) slot - re-adding that email
    // must reactivate the old row, not collide with the unique constraint.
    const existing = await prisma.user.findFirst({
      where: { email: dto.email, agencyId },
    });
    if (existing && !existing.isDeleted) {
      throw conflict("A user with this email already exists in this agency");
    }
    if (existing && existing.role !== "TEAM_MEMBER") {
      throw conflict("This email belonged to a non-team account and can't be reused");
    }

    // Shown to the owner exactly once - they hand credentials to the member
    // directly (email delivery is a later phase).
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const passwordHash = await hashPassword(tempPassword);
    const initials = dto.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: dto.name,
            initials,
            passwordHash,
            skills: dto.skills.join(","),
            tempPassword: true,
            isDeleted: false,
            isAvailable: true,
          },
        })
      : await prisma.user.create({
          data: {
            email: dto.email,
            passwordHash,
            name: dto.name,
            initials,
            role: "TEAM_MEMBER",
            skills: dto.skills.join(","),
            tempPassword: true,
            agencyId,
          },
        });

    await logAudit({
      agencyId,
      actorId,
      action: "TEAM_MEMBER_CREATED",
      entityType: "User",
      entityId: user.id,
      details: `Team member ${dto.name} (${dto.email}) created`,
    });

    // Email the credentials to the new member (owner also sees them once in the
    // UI as a fallback). Fire-and-forget - creation succeeds regardless.
    const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { name: true } });
    void emailService.teamMemberCredentials({
      to: dto.email,
      name: dto.name,
      email: dto.email,
      tempPassword,
      agencyName: agency?.name ?? "your agency",
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      skills: user.skills,
      tempPassword,
      createdAt: user.createdAt,
    };
  }

  /**
   * Pulls every user from the GHL agency (Private Integration token, scope
   * users.readonly) and creates the missing ones as TEAM_MEMBERs. Each new
   * member gets a random temporary password emailed to them; tempPassword=true
   * forces the password change on first login (AuthGuard + /auth/first-login).
   * Existing emails (any role) are skipped - the sync is safely re-runnable.
   */
  async syncTeamFromGhl(agencyId: string, actorId: string) {
    const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });
    if (!agency.ghlCompanyId || !agency.ghlApiKeyEncrypted) {
      throw badRequest("Agency is not connected to GHL", "NOT_CONNECTED");
    }

    // A stored key encrypted with an older ENCRYPTION_KEY (or seeded demo data)
    // must read as "reconnect your agency", never as a raw 500.
    let apiKey: string;
    try {
      apiKey = decryptSecret(agency.ghlApiKeyEncrypted);
    } catch {
      throw badRequest(
        "The stored GHL API key can't be read - reconnect your agency (Connect page) to save a fresh Private Integration token.",
        "AGENCY_KEY_UNREADABLE",
      );
    }

    let ghlUsers: Awaited<ReturnType<typeof ghlClient.listAllUsers>>;
    try {
      ghlUsers = await ghlClient.listAllUsers(apiKey, agency.ghlCompanyId);
    } catch (err) {
      if (err instanceof GhlApiError) {
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          throw badRequest(
            "GHL rejected the team lookup - add the users.readonly scope to your Private Integration token, or reconnect with a fresh key.",
            "GHL_SCOPE_MISSING",
          );
        }
        if (err.httpStatus === 0) {
          throw badGateway("Could not reach GoHighLevel. Please try again shortly.");
        }
        throw badGateway(`GHL team lookup failed (${err.httpStatus}): ${err.message}`);
      }
      throw err;
    }

    if (ghlUsers.length === 0) {
      return { totalInGhl: 0, created: [], skippedExisting: 0, skippedNoEmail: 0 };
    }

    // Include soft-deleted rows: a removed member re-appearing in GHL must be
    // REACTIVATED, not re-created - the unique (email, agencyId) row still exists.
    const existing = await prisma.user.findMany({
      where: { agencyId, email: { not: null } },
      select: { id: true, email: true, role: true, isDeleted: true },
    });
    const byEmail = new Map(existing.map((u) => [u.email!.toLowerCase(), u]));

    const created: Array<{ id: string; name: string; email: string; tempPassword: string }> = [];
    let skippedExisting = 0;
    let skippedNoEmail = 0;

    for (const ghlUser of ghlUsers) {
      const email = ghlUser.email?.trim().toLowerCase();
      if (!email) {
        skippedNoEmail++;
        continue;
      }
      const known = byEmail.get(email);
      // Active user (any role) - or a soft-deleted non-team row whose email we
      // must not repurpose - counts as already present.
      if (known && (!known.isDeleted || known.role !== "TEAM_MEMBER")) {
        skippedExisting++;
        continue;
      }

      const name =
        ghlUser.name?.trim() ||
        [ghlUser.firstName, ghlUser.lastName].filter(Boolean).join(" ").trim() ||
        email;
      const tempPassword = crypto.randomBytes(8).toString("hex");
      const passwordHash = await hashPassword(tempPassword);
      const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

      const user = known
        ? await prisma.user.update({
            // Reactivate the soft-deleted member with fresh credentials.
            where: { id: known.id },
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
      byEmail.set(email, { id: user.id, email, role: "TEAM_MEMBER", isDeleted: false });
      created.push({ id: user.id, name, email, tempPassword });

      // Fire-and-forget credentials email - the sync result also lists them once.
      void emailService.teamMemberCredentials({
        to: email,
        name,
        email,
        tempPassword,
        agencyName: agency.name,
      });
    }

    await logAudit({
      agencyId,
      actorId,
      action: "TEAM_SYNCED_FROM_GHL",
      entityType: "Agency",
      entityId: agencyId,
      details: `GHL team sync: ${created.length} member(s) created, ${skippedExisting} already existed, ${skippedNoEmail} without email (${ghlUsers.length} users in GHL)`,
    });

    // tempPassword is included so the owner sees credentials ONCE (same rule as
    // createTeamMember) - it is never retrievable again after this response.
    return {
      totalInGhl: ghlUsers.length,
      created,
      skippedExisting,
      skippedNoEmail,
    };
  }

  async updateTeamMember(agencyId: string, userId: string, dto: { name?: string; skills?: string[]; isAvailable?: boolean }) {
    const user = await prisma.user.findFirst({
      where: { id: userId, agencyId, role: "TEAM_MEMBER", isDeleted: false },
    });
    if (!user) throw notFound("Team member not found");

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name, initials: dto.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) }),
        ...(dto.skills && { skills: dto.skills.join(",") }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      initials: updated.initials,
      skills: updated.skills ? updated.skills.split(",").filter(Boolean) : [],
      isAvailable: updated.isAvailable,
    };
  }

  async deleteTeamMember(agencyId: string, actorId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, agencyId, role: "TEAM_MEMBER", isDeleted: false },
    });
    if (!user) throw notFound("Team member not found");

    // Soft delete keeps historical tickets attributed to the member (product
    // decision in main-goal.md §10); their open work returns to the queue.
    const unassigned = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isDeleted: true, isAvailable: false },
      });

      const result = await tx.ticket.updateMany({
        where: { assigneeId: userId, stage: { not: "RESOLVED" } },
        data: { assigneeId: null, stage: "NEW" },
      });
      return result.count;
    });

    await logAudit({
      agencyId,
      actorId,
      action: "TEAM_MEMBER_REMOVED",
      entityType: "User",
      entityId: userId,
      details: `Team member ${user.name} removed; ${unassigned} open ticket(s) returned to the unassigned queue`,
    });
  }

  async toggleAvailability(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "TEAM_MEMBER") throw notFound("Team member not found");

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isAvailable: !user.isAvailable },
    });

    return { isAvailable: updated.isAvailable };
  }

  async getStats(userId: string, agencyId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, agencyId, isDeleted: false },
    });
    if (!user) throw notFound("User not found");

    const assignedTickets = await prisma.ticket.findMany({
      where: { assigneeId: userId },
    });

    const totalSolved = assignedTickets.filter((t) => t.stage === "RESOLVED").length;
    const openCount = assignedTickets.filter((t) => t.stage !== "RESOLVED").length;
    const reviewCount = assignedTickets.filter((t) => t.stage === "REVIEW").length;

    return {
      totalAssigned: assignedTickets.length,
      totalSolved,
      openCount,
      reviewCount,
      isAvailable: user.isAvailable,
    };
  }

  async listSubAccounts(agencyId: string) {
    // ACTIVE sub-accounts only get a portal user identity on their FIRST
    // visit - but the owner must be able to file tickets/propose orders for
    // them immediately after approving. Backfill missing identities here
    // (identical to what portal.issueSession creates on first entry).
    const missingIdentity = await prisma.subAccount.findMany({
      where: { agencyId, status: "ACTIVE", userId: null },
    });
    for (const row of missingIdentity) {
      const user = await prisma.user.create({
        data: {
          name: row.name,
          initials: row.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "SA",
          role: "SUB_ACCOUNT",
          locationId: row.ghlLocationId,
          contactEmail: row.contactEmail,
          agencyId,
        },
      });
      await prisma.subAccount.update({ where: { id: row.id }, data: { userId: user.id } });
    }

    const users = await prisma.user.findMany({
      where: { agencyId, role: "SUB_ACCOUNT", isDeleted: false },
      orderBy: { name: "asc" },
      include: {
        subAccountTickets: {
          where: { stage: { not: "RESOLVED" } },
          select: { id: true },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      initials: u.initials,
      contactEmail: u.contactEmail,
      plan: u.plan,
      locationId: u.locationId,
      openTickets: u.subAccountTickets.length,
      createdAt: u.createdAt,
    }));
  }

  async createSubAccount(agencyId: string, actorId: string, dto: { name: string; locationId: string; contactEmail?: string; plan?: string }) {
    const existing = await prisma.user.findFirst({
      where: { locationId: dto.locationId, agencyId },
    });
    if (existing) {
      throw conflict("A sub-account with this Location ID already exists");
    }

    // Manual creation is an owner-initiated approval: keep the SubAccount
    // access table in sync so the portal flow recognizes this location.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: dto.name,
          initials: dto.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
          role: "SUB_ACCOUNT",
          locationId: dto.locationId,
          contactEmail: dto.contactEmail,
          plan: dto.plan,
          agencyId,
        },
      });
      await tx.subAccount.upsert({
        where: { agencyId_ghlLocationId: { agencyId, ghlLocationId: dto.locationId } },
        update: { status: "ACTIVE", decidedAt: new Date(), decidedById: actorId, userId: created.id },
        create: {
          agencyId,
          ghlLocationId: dto.locationId,
          name: dto.name,
          contactEmail: dto.contactEmail ?? null,
          status: "ACTIVE",
          decidedAt: new Date(),
          decidedById: actorId,
          userId: created.id,
        },
      });
      return created;
    });

    await logAudit({
      agencyId,
      actorId,
      action: "SUB_ACCOUNT_CREATED_MANUALLY",
      entityType: "SubAccount",
      entityId: user.id,
      details: `Sub-account ${dto.name} (${dto.locationId}) created and activated by owner`,
    });

    return {
      id: user.id,
      name: user.name,
      initials: user.initials,
      locationId: user.locationId,
      contactEmail: user.contactEmail,
      plan: user.plan,
    };
  }

  async listAllTeamStats(agencyId: string) {
    const members = await prisma.user.findMany({
      where: { agencyId, role: "TEAM_MEMBER", isDeleted: false },
      include: {
        assignedTickets: true,
      },
    });

    return members.map((m) => {
      const total = m.assignedTickets.length;
      const solved = m.assignedTickets.filter((t) => t.stage === "RESOLVED").length;
      const review = m.assignedTickets.filter((t) => t.stage === "REVIEW").length;
      const open = m.assignedTickets.filter((t) => t.stage !== "RESOLVED").length;

      return {
        id: m.id,
        name: m.name,
        initials: m.initials,
        skills: m.skills ? m.skills.split(",").filter(Boolean) : [],
        isAvailable: m.isAvailable,
        totalAssigned: total,
        totalSolved: solved,
        openCount: open,
        reviewCount: review,
      };
    });
  }
}

export const usersService = new UsersService();
