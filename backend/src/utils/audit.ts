import { prisma } from "./prisma";

/**
 * Fire-and-log audit trail for sensitive actions. Failures are swallowed -
 * an audit-write hiccup must never fail the user-facing action - but the
 * caller's transaction-scoped client can be passed in when atomicity matters.
 */
export async function logAudit(params: {
  agencyId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  client?: Pick<typeof prisma, "auditLog">;
}): Promise<void> {
  const { client = prisma, ...data } = params;
  try {
    await client.auditLog.create({ data });
  } catch (err) {
    console.error("Audit log write failed:", err instanceof Error ? err.message : err);
  }
}
