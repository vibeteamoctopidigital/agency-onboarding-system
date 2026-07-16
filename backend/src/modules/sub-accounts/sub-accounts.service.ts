import { type GhlLocation, ghlClient } from "../../lib/ghl/ghl.client";
import { badRequest, notFound } from "../../utils/appError";
import { logAudit } from "../../utils/audit";
import { decryptSecret } from "../../utils/crypto";
import { prisma } from "../../utils/prisma";

// Short-lived per-agency cache of the GHL location list, so the overview page
// doesn't hammer GHL's API on every visit. "Refresh" bypasses it explicitly.
const GHL_LOCATIONS_CACHE_TTL_MS = 5 * 60 * 1000;
const ghlLocationsCache = new Map<string, { locations: GhlLocation[]; fetchedAt: number }>();

export class SubAccountsService {
  private async connectedAgencyOrThrow(agencyId: string) {
    const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });
    if (!agency.ghlCompanyId || !agency.ghlApiKeyEncrypted) {
      throw badRequest("Agency is not connected to GHL", "NOT_CONNECTED");
    }
    return agency;
  }

  /** Decrypt the agency's PIT - an unreadable key is a reconnect prompt, not a 500. */
  private decryptKeyOrThrow(encrypted: string): string {
    try {
      return decryptSecret(encrypted);
    } catch {
      throw badRequest(
        "The stored GHL API key can't be read - reconnect your agency (Connect page) to save a fresh Private Integration token.",
        "AGENCY_KEY_UNREADABLE",
      );
    }
  }

  private async fetchGhlLocations(agencyId: string, forceRefresh: boolean) {
    const cached = ghlLocationsCache.get(agencyId);
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < GHL_LOCATIONS_CACHE_TTL_MS) {
      return { locations: cached.locations, fetchedAt: cached.fetchedAt, fromCache: true };
    }
    const agency = await this.connectedAgencyOrThrow(agencyId);
    const apiKey = this.decryptKeyOrThrow(agency.ghlApiKeyEncrypted!);
    const locations = await ghlClient.listAllLocations(apiKey, agency.ghlCompanyId!);
    const fetchedAt = Date.now();
    ghlLocationsCache.set(agencyId, { locations, fetchedAt });
    return { locations, fetchedAt, fromCache: false };
  }

  /**
   * Owner overview: EVERY location under the agency in GHL, each merged with
   * our DB so the owner sees who is already connected, who is waiting, who was
   * rejected, and who has simply never opened the portal (NOT_CONNECTED).
   * GHL is the source of truth for the list; our DB for the status.
   */
  async overview(agencyId: string, forceRefresh = false) {
    const { locations, fetchedAt, fromCache } = await this.fetchGhlLocations(agencyId, forceRefresh);

    const dbRows = await prisma.subAccount.findMany({
      where: { agencyId },
      include: {
        decidedBy: { select: { name: true } },
        user: { select: { id: true, _count: { select: { subAccountTickets: { where: { stage: { not: "RESOLVED" } } } } } } },
      },
    });
    const byLocationId = new Map(dbRows.map((row) => [row.ghlLocationId, row]));

    const merged = locations
      .filter((loc) => loc.id)
      .map((loc) => {
        const row:any = byLocationId.get(loc.id);
        byLocationId.delete(loc.id);
        return {
          locationId: loc.id,
          name: row?.name || loc.name || loc.id,
          contactEmail: row?.contactEmail ?? loc.email ?? null,
          status: row ? row.status : ("NOT_CONNECTED" as const),
          subAccountId: row?.id ?? null,
          userId: row?.user?.id ?? null,
          requestedAt: row?.requestedAt ?? null,
          decidedAt: row?.decidedAt ?? null,
          decidedBy: row?.decidedBy?.name ?? null,
          rejectionComment: row?.rejectionComment ?? null,
          openTickets: row?.user?._count?.subAccountTickets ?? 0,
          inGhl: true,
        };
      });

    // DB rows whose location no longer exists in GHL (deleted/moved client) -
    // still shown so their ticket history isn't silently orphaned.
    for (const row of byLocationId.values() as any) {
      merged.push({
        locationId: row.ghlLocationId,
        name: row.name,
        contactEmail: row.contactEmail,
        status: row.status,
        subAccountId: row.id,
        userId: row.user?.id ?? null,
        requestedAt: row.requestedAt,
        decidedAt: row.decidedAt,
        decidedBy: row.decidedBy?.name ?? null,
        rejectionComment: row.rejectionComment,
        openTickets: row.user?._count?.subAccountTickets ?? 0,
        inGhl: false,
      });
    }

    // Connected first, then pending, then the rest - stable and scannable.
    const rank: Record<string, number> = { PENDING: 0, ACTIVE: 1, BLOCKED: 2, NOT_CONNECTED: 3, REJECTED: 4 };
    merged.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || a.name.localeCompare(b.name));

    return {
      locations: merged,
      totals: {
        inGhl: locations.length,
        connected: merged.filter((l) => l.status === "ACTIVE").length,
        pending: merged.filter((l) => l.status === "PENDING").length,
        notConnected: merged.filter((l) => l.status === "NOT_CONNECTED").length,
        rejected: merged.filter((l) => l.status === "REJECTED").length,
        blocked: merged.filter((l) => l.status === "BLOCKED").length,
      },
      syncedAt: new Date(fetchedAt).toISOString(),
      fromCache,
    };
  }

  /**
   * Owner pre-approves a single GHL location before it ever knocks on the
   * portal: verified against GHL, then activated directly (same effect as
   * approve, without waiting for the client's first click). Re-connecting a
   * rejected row is allowed - the owner clicking Connect IS the decision.
   */
  async connectLocation(agencyId: string, actorId: string, locationId: string) {
    const agency = await this.connectedAgencyOrThrow(agencyId);
    const apiKey = this.decryptKeyOrThrow(agency.ghlApiKeyEncrypted!);

    const location = await ghlClient.getLocation(apiKey, locationId);
    if (!location) throw notFound("This location does not exist under your GHL agency", "UNKNOWN_LOCATION");

    const existing = await prisma.subAccount.findUnique({
      where: { agencyId_ghlLocationId: { agencyId, ghlLocationId: locationId } },
    });
    if (existing?.status === "ACTIVE") return existing; // idempotent

    const row = existing
      ? await prisma.subAccount.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", decidedAt: new Date(), decidedById: actorId, rejectionComment: null },
        })
      : await prisma.subAccount.create({
          data: {
            agencyId,
            ghlLocationId: locationId,
            name: location.name || locationId,
            contactEmail: location.email ?? null,
            status: "ACTIVE",
            decidedAt: new Date(),
            decidedById: actorId,
          },
        });

    await logAudit({
      agencyId,
      actorId,
      action: "SUB_ACCOUNT_CONNECTED",
      entityType: "SubAccount",
      entityId: row.id,
      details: `Owner connected ${row.name} (${locationId}) directly from the GHL location list`,
    });
    return row;
  }

  async listRequests(agencyId: string) {
    return prisma.subAccount.findMany({
      where: { agencyId, status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      select: { id: true, ghlLocationId: true, name: true, contactEmail: true, status: true, requestedAt: true },
    });
  }

  async listAll(agencyId: string) {
    return prisma.subAccount.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ghlLocationId: true,
        name: true,
        contactEmail: true,
        status: true,
        requestedAt: true,
        decidedAt: true,
        rejectionComment: true,
        decidedBy: { select: { name: true } },
      },
    });
  }

  async approve(agencyId: string, actorId: string, subAccountId: string) {
    const subAccount = await prisma.subAccount.findFirst({ where: { id: subAccountId, agencyId } });
    if (!subAccount) throw notFound("Sub-account request not found");
    if (subAccount.status === "ACTIVE") return subAccount; // idempotent

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.subAccount.update({
        where: { id: subAccountId },
        data: { status: "ACTIVE", decidedAt: new Date(), decidedById: actorId, rejectionComment: null },
      });
      // Notification stub for the sub-account (email delivery comes later);
      // only possible once a user identity exists (created on first portal entry).
      if (row.userId) {
        await tx.notification.create({
          data: {
            userId: row.userId,
            type: "ACCESS_APPROVED",
            title: "Access approved",
            message: "Your support portal access has been approved.",
          },
        });
      }
      return row;
    });

    await logAudit({
      agencyId,
      actorId,
      action: "SUB_ACCOUNT_APPROVED",
      entityType: "SubAccount",
      entityId: subAccountId,
      details: `Approved portal access for ${subAccount.name} (${subAccount.ghlLocationId})`,
    });
    return updated;
  }

  async reject(agencyId: string, actorId: string, subAccountId: string, comment?: string) {
    const subAccount = await prisma.subAccount.findFirst({ where: { id: subAccountId, agencyId } });
    if (!subAccount) throw notFound("Sub-account request not found");
    if (subAccount.status === "REJECTED") return subAccount; // idempotent

    const updated = await prisma.subAccount.update({
      where: { id: subAccountId },
      data: { status: "REJECTED", decidedAt: new Date(), decidedById: actorId, rejectionComment: comment ?? null },
    });

    await logAudit({
      agencyId,
      actorId,
      action: "SUB_ACCOUNT_REJECTED",
      entityType: "SubAccount",
      entityId: subAccountId,
      details: `Rejected portal access for ${subAccount.name} (${subAccount.ghlLocationId})${comment ? ` - ${comment}` : ""}`,
    });
    return updated;
  }

  /**
   * Owner sets a sub-account's access directly from a status select box.
   * ACTIVE re-enables access, BLOCKED shuts the portal door (new sessions and
   * ticket writes are refused), REJECTED keeps the original meaning.
   */
  async changeStatus(
    agencyId: string,
    actorId: string,
    subAccountId: string,
    status: "ACTIVE" | "BLOCKED" | "REJECTED",
    comment?: string,
  ) {
    const subAccount = await prisma.subAccount.findFirst({ where: { id: subAccountId, agencyId } });
    if (!subAccount) throw notFound("Sub-account not found");
    if (subAccount.status === status) return subAccount; // idempotent

    const updated = await prisma.subAccount.update({
      where: { id: subAccountId },
      data: {
        status,
        decidedAt: new Date(),
        decidedById: actorId,
        rejectionComment: status === "ACTIVE" ? null : (comment ?? subAccount.rejectionComment),
      },
    });

    if (updated.userId) {
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          type: "ACCESS_STATUS_CHANGED",
          title: status === "ACTIVE" ? "Access restored" : "Access disabled",
          message:
            status === "ACTIVE"
              ? "Your support portal access has been restored."
              : "Your support portal access has been disabled by the agency.",
        },
      });
    }

    await logAudit({
      agencyId,
      actorId,
      action: `SUB_ACCOUNT_STATUS_${status}`,
      entityType: "SubAccount",
      entityId: subAccountId,
      details: `Status of ${subAccount.name} (${subAccount.ghlLocationId}) changed ${subAccount.status} → ${status}`,
    });
    return updated;
  }

  /**
   * One-time onboarding: fetch every location currently under the agency in
   * GHL and activate it directly, skipping the pending queue. Existing rows
   * are upgraded (pending → active); rejected rows are left untouched so a
   * deliberate rejection isn't silently reversed.
   */
  async bulkApprove(agencyId: string, actorId: string) {
    const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });
    if (!agency.ghlCompanyId || !agency.ghlApiKeyEncrypted) {
      throw badRequest("Agency is not connected to GHL", "NOT_CONNECTED");
    }

    const apiKey = this.decryptKeyOrThrow(agency.ghlApiKeyEncrypted);
    const locations = await ghlClient.listAllLocations(apiKey, agency.ghlCompanyId);

    let activated = 0;
    let skipped = 0;
    for (const location of locations) {
      if (!location.id) continue;
      const existing = await prisma.subAccount.findUnique({
        where: { agencyId_ghlLocationId: { agencyId, ghlLocationId: location.id } },
      });
      if (existing?.status === "REJECTED" || existing?.status === "ACTIVE") {
        skipped++;
        continue;
      }
      if (existing) {
        await prisma.subAccount.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", decidedAt: new Date(), decidedById: actorId },
        });
      } else {
        await prisma.subAccount.create({
          data: {
            agencyId,
            ghlLocationId: location.id,
            name: location.name || location.id,
            contactEmail: location.email ?? null,
            status: "ACTIVE",
            decidedAt: new Date(),
            decidedById: actorId,
          },
        });
      }
      activated++;
    }

    await logAudit({
      agencyId,
      actorId,
      action: "SUB_ACCOUNTS_BULK_APPROVED",
      entityType: "Agency",
      entityId: agencyId,
      details: `Bulk-approved ${activated} location(s) from GHL (${skipped} already decided, ${locations.length} total in GHL)`,
    });

    return { totalInGhl: locations.length, activated, skipped };
  }
}

export const subAccountsService = new SubAccountsService();
