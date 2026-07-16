import { prisma } from "../../utils/prisma";

export class AnalyticsService {
  async getDashboard(agencyId: string) {
    const tickets = await prisma.ticket.findMany({
      where: { agencyId },
      include: {
        assignee: { select: { id: true, name: true, initials: true } },
      },
    });

    const total = tickets.length;
    const stageBreakdown: Record<string, number> = {};
    for (const t of tickets) {
      stageBreakdown[t.stage] = (stageBreakdown[t.stage] || 0) + 1;
    }

    const resolved = tickets.filter((t) => t.stage === "RESOLVED").length;
    const unassigned = tickets.filter((t) => !t.assigneeId && t.stage !== "RESOLVED").length;

    const totalHistoryItems = await prisma.ticketStageHistory.count({
      where: { ticket: { agencyId } },
    });
    const avgTouches = total > 0 ? (totalHistoryItems / total).toFixed(1) : "0";

    const perAgent = await prisma.user.findMany({
      where: { agencyId, role: "TEAM_MEMBER", isDeleted: false },
      select: {
        id: true,
        name: true,
        initials: true,
        assignedTickets: {
          select: { stage: true },
        },
      },
    });

    const agentStats = perAgent.map((a) => ({
      id: a.id,
      name: a.name,
      initials: a.initials,
      totalAssigned: a.assignedTickets.length,
      solved: a.assignedTickets.filter((t) => t.stage === "RESOLVED").length,
      open: a.assignedTickets.filter((t) => t.stage !== "RESOLVED").length,
    }));

    return {
      total,
      resolved,
      unassigned,
      avgTouches: Number(avgTouches),
      stageBreakdown,
      agentStats,
    };
  }
}

export const analyticsService = new AnalyticsService();
