import { prisma } from "../../utils/prisma";

export class AuditLogsService {
  async list(agencyId: string, page = 1, limit = 50) {
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { agencyId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: { select: { id: true, name: true, initials: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where: { agencyId } }),
    ]);

    return {
      logs: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(data: {
    agencyId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
  }) {
    return prisma.auditLog.create({ data });
  }
}

export const auditLogsService = new AuditLogsService();
