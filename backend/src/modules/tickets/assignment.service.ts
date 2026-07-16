import { prisma } from "../../utils/prisma";

export class AssignmentService {
  async autoAssign(agencyId: string, category: string): Promise<string | null> {
    const available = await prisma.user.findMany({
      where: {
        agencyId,
        role: "TEAM_MEMBER",
        isDeleted: false,
        isAvailable: true,
      },
      include: {
        assignedTickets: {
          where: { stage: { not: "RESOLVED" } },
          select: { id: true },
        },
      },
    });

    if (available.length === 0) return null;

    const skillMatch = available.filter((m) => {
      const skillList = m.skills ? m.skills.split(",").map((s) => s.trim()) : [];
      return skillList.includes(category);
    });
    const pool = skillMatch.length > 0 ? skillMatch : available;

    pool.sort((a, b) => a.assignedTickets.length - b.assignedTickets.length);

    return pool[0].id;
  }
}

export const assignmentService = new AssignmentService();
