import { badRequest, forbidden, notFound } from "../../utils/appError";
import { logAudit } from "../../utils/audit";
import { prisma } from "../../utils/prisma";
import { emailService } from "../../lib/email/email.service";
import { storageService } from "../../lib/storage/storage.service";
import type { JwtPayload } from "../../utils/jwt";
import { sendMailByWebHook } from "@/utils/email.utils";

const STAGE_NAMES: Record<string, string> = {
  NEW: "New",
  ACCEPTED: "Accepted",
  WORKING: "Working",
  PENDING: "Pending",
  REVIEW: "Review",
  RESOLVED: "Resolved",
};

const STAGE_ORDER: Record<string, number> = {
  NEW: 0,
  ACCEPTED: 1,
  WORKING: 2,
  PENDING: 3,
  REVIEW: 4,
  RESOLVED: 5,
};

export class TicketsService {
  /**
   * A blocked sub-account may still hold a valid JWT (up to a day) - refuse
   * writes at the service layer so the block takes effect immediately.
   */
  private async assertSubAccountNotBlocked(user: JwtPayload) {
    if (user.role !== "SUB_ACCOUNT") return;
    const row = await prisma.subAccount.findFirst({
      where: { userId: user.userId },
      select: { status: true },
    });
    if (row?.status === "BLOCKED") {
      throw forbidden("Your support portal access has been disabled by the agency", "ACCESS_BLOCKED");
    }
  }

  async create(dto: {
    subject: string;
    description: string;
    category: string;
    priority: string;
    subAccountId?: string;
  }, user: JwtPayload) {
    await this.assertSubAccountNotBlocked(user);

    const subAccountId = user.role === "SUB_ACCOUNT" ? user.userId : dto.subAccountId;
    if (!subAccountId) throw badRequest("subAccountId is required");

    // The client a ticket is filed for must be a sub-account of THIS agency.
    const subAccount = await prisma.user.findFirst({
      where: { id: subAccountId, agencyId: user.agencyId, role: "SUB_ACCOUNT", isDeleted: false },
      select: { id: true },
    });
    if (!subAccount) throw badRequest("Unknown sub-account for this agency");


    const ticket = await prisma.$transaction(async (tx) => {
      // displayId is computed inside the transaction to avoid races.
      const lastTicket = await tx.ticket.findFirst({
        where: { agencyId: user.agencyId },
        orderBy: { displayId: "desc" },
        select: { displayId: true },
      });
      const nextDisplayId = (lastTicket?.displayId || 0) + 1;

      const newTicket = await tx.ticket.create({
        data: {
          displayId: nextDisplayId,
          subject: dto.subject,
          description: dto.description || "(no description provided)",
          category: dto.category,
          priority: dto.priority as any,
          // New tickets always land unassigned in the NEW stage - assignment is
          // a deliberate admin action from the unassigned queue, never automatic.
          stage: "NEW",
          assigneeId: null,
          subAccountId,
          agencyId: user.agencyId,
          history: {
            create: {
              stage: "NEW",
              actorId: user.userId,
              comment: "Ticket submitted.",
              wasEmailed: false,
            },
          },
        },
        include: {
          history: { orderBy: { createdAt: "asc" } },
          assignee: { select: { id: true, name: true, initials: true } },
          subAccount: { select: { id: true, name: true, initials: true } },
        },
      });

      // Every new ticket lands in the unassigned queue; owners must know.
      const owners = await tx.user.findMany({
        where: { agencyId: user.agencyId, role: "AGENCY_OWNER", isDeleted: false },
        select: { id: true,email:true,name:true },
      });
      await tx.notification.createMany({
        data: owners.map((o) => ({
          userId: o.id,
          ticketId: newTicket.id,
          type: "unassigned",
          title: "Ticket needs manual assignment",
          message: `New ticket "${newTicket.subject}" is waiting in the unassigned queue.`,
        })),
      });

      // sending email  

              await sendMailByWebHook({
                   "email": owners[0].email, "name": owners[0].name,"type":"TICKET_SUBMITTED",
                  
       ticket_subject: newTicket.subject,
      ticket_decs: newTicket.description, 
                category: newTicket.category,
      submitted_user:newTicket.subAccount.name,
      priority:newTicket.priority,
      createdAt:newTicket.updatedAt
              })

      return newTicket;
    });

    return this.formatTicket(ticket);
  }

  async list(filters: {
    agencyId: string;
    stage?: string;
    priority?: string;
    category?: string;
    assigneeId?: string;
    subAccountId?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const where: any = { agencyId: filters.agencyId };

    if (filters.stage) where.stage = filters.stage;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category) where.category = filters.category;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.subAccountId) where.subAccountId = filters.subAccountId;
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          assignee: { select: { id: true, name: true, initials: true } },
          subAccount: { select: { id: true, name: true, initials: true } },
          history: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return {
      tickets: tickets.map((t) => this.formatTicket(t)),
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async listMine(userId: string) {
    const tickets = await prisma.ticket.findMany({
      where: { assigneeId: userId },
      orderBy: { updatedAt: "desc" },
      include: {
        assignee: { select: { id: true, name: true, initials: true } },
        subAccount: { select: { id: true, name: true, initials: true, contactEmail: true } },
      },
    });

    return tickets.map((t) => this.formatTicket(t));
  }

  async listMyTickets(userId: string) {
    const tickets = await prisma.ticket.findMany({
      where: { subAccountId: userId },
      orderBy: { updatedAt: "desc" },
      include: {
        assignee: { select: { id: true, name: true, initials: true } },
        subAccount: { select: { id: true, name: true, initials: true } },
        history: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return tickets.map((t) => this.formatTicket(t));
  }

  async getById(ticketId: string, user: JwtPayload) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignee: { select: { id: true, name: true, initials: true } },
        subAccount: { select: { id: true, name: true, initials: true, contactEmail: true } },
        history: {
          orderBy: { createdAt: "asc" },
          include: {
            actor: { select: { id: true, name: true, initials: true, role: true } },
          },
        },
        attachments: {
          orderBy: { createdAt: "desc" },
          include: { uploadedBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!ticket) throw notFound("Ticket not found");
    if (ticket.agencyId !== user.agencyId) throw notFound("Ticket not found");

    if (user.role === "TEAM_MEMBER" && ticket.assigneeId !== user.userId) {
      throw forbidden("You do not have access to this ticket");
    }
    if (user.role === "SUB_ACCOUNT" && ticket.subAccountId !== user.userId) {
      throw forbidden("You do not have access to this ticket");
    }

    if (user.role === "SUB_ACCOUNT") {
      // Internal notes - and any files attached TO them - are staff-only.
      const internalIds = new Set(ticket.history.filter((h) => h.isInternalNote).map((h) => h.id));
      ticket.history = ticket.history.filter((h) => !h.isInternalNote);
      ticket.attachments = ticket.attachments.filter((a) => !a.historyId || !internalIds.has(a.historyId));
    }

    return this.formatTicket(ticket);
  }

  async moveStage(ticketId: string, targetStage: string, user: JwtPayload, comment?: string, sendEmail = true) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.agencyId !== user.agencyId) throw notFound("Ticket not found");

    // Team members may only move tickets assigned to them.
    if (user.role === "TEAM_MEMBER" && ticket.assigneeId !== user.userId) {
      throw forbidden("You can only move tickets assigned to you");
    }
    if (targetStage === ticket.stage) throw badRequest("Ticket is already in that stage");
    if (!this.canMoveTo(ticket.stage, targetStage, user)) {
      throw forbidden("You do not have permission to move this ticket to that stage");
    }

    // Every team-member stage move must explain itself - the comment is the
    // client-facing record of what's happening with their ticket.
    if (user.role === "TEAM_MEMBER" && !comment?.trim()) {
      throw badRequest("A comment is required when moving a ticket to another stage", "COMMENT_REQUIRED");
    }

    const finalComment = comment?.trim() || this.getDefaultComment(targetStage, ticket.category);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.ticketStageHistory.create({
        data: {
          ticketId,
          stage: targetStage as any,
          actorId: user.userId,
          comment: finalComment,
          wasEmailed: sendEmail,
        },
      });

      return tx.ticket.update({
        where: { id: ticketId },
        data: { stage: targetStage as any },
        include: {
          assignee: { select: { id: true, name: true, initials: true } },
          subAccount: { select: { id: true, name: true, initials: true } },
          history: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
    });

    await prisma.notification.create({
      data: {
        userId: ticket.subAccountId,
        ticketId,
        type: "stage_change",
        title: "Ticket updated",
        message: `Ticket ${ticket.subject} moved to ${targetStage}.`,
      },
    });

    if (targetStage === "REVIEW" && ticket.assigneeId) {
      const admins = await prisma.user.findMany({
        where: { agencyId: user.agencyId, role: "AGENCY_OWNER" },
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            ticketId,
            type: "stage_change",
            title: "Ticket ready for review",
            message: `${ticket.subject} is waiting for your approval.`,
          },
        });
        
        if (admin.email) {
          await sendMailByWebHook({
            email: admin.email,
            name: admin.name || "Agency Admin",
            type: "TICKET_REVIEW",
            ticketSubject: ticket.subject,
           
          });
        }
      }
    }

    // Real email to the client on the stage change (fire-and-forget).
    if (sendEmail) {
      const [client, actor] = await Promise.all([
        prisma.user.findUnique({ where: { id: ticket.subAccountId }, select: { contactEmail: true, email: true } }),
        prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } }),
      ]);
      const to = client?.contactEmail || client?.email;
      if (to) {
        void emailService.ticketStageUpdate({
          to,
          displayId: ticket.displayId,
          subject: ticket.subject,
          stageName: STAGE_NAMES[targetStage] ?? targetStage,
          comment: finalComment,
          agentName: actor?.name,
        });
      }
    }

    return this.formatTicket(updated);
  }

  async assign(ticketId: string, assigneeId: string | null, user: JwtPayload) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.agencyId !== user.agencyId) throw notFound("Ticket not found");

    if (assigneeId) {
      const member = await prisma.user.findFirst({
        where: { id: assigneeId, agencyId: user.agencyId, role: "TEAM_MEMBER", isDeleted: false },
        select: { id: true },
      });
      if (!member) throw badRequest("Assignee must be an active team member of this agency");
    }

    // Reassigning mid-work keeps the current stage; a first assignment moves
    // NEW → ACCEPTED; removing the assignee returns the ticket to the queue -
    // EXCEPT a resolved ticket, which must never silently reopen.
    const nextStage = assigneeId
      ? ticket.stage === "NEW" ? "ACCEPTED" : ticket.stage
      : ticket.stage === "RESOLVED" ? "RESOLVED" : "NEW";

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.update({
        where: { id: ticketId },
        data: { assigneeId, stage: nextStage as any },
        include: {
          assignee: { select: { id: true, name: true, initials: true } },
          subAccount: { select: { id: true, name: true, initials: true } },
        },
      });

      await tx.ticketStageHistory.create({
        data: {
          ticketId,
          stage: nextStage as any,
          actorId: user.userId,
          comment: assigneeId ? `Assigned to ${t.assignee?.name}.` : "Assignee removed - returned to the unassigned queue.",
          isInternalNote: true, // assignment shuffles are staff-facing, not client updates
          wasEmailed: false,
        },
      });

      if (assigneeId) {
        await tx.notification.create({
          data: {
            userId: assigneeId,
            ticketId,
            type: "assignment",
            title: "Ticket assigned to you",
            message: `Ticket "${ticket.subject}" has been assigned to you.`,
          },
        });
      } else if (ticket.assigneeId) {
        await tx.notification.create({
          data: {
            userId: ticket.assigneeId,
            ticketId,
            type: "assignment",
            title: "Ticket unassigned",
            message: `Ticket "${ticket.subject}" is no longer assigned to you.`,
          },
        });
      }

      return t;
    });

    await logAudit({
      agencyId: user.agencyId,
      actorId: user.userId,
      action: assigneeId ? "TICKET_ASSIGNED" : "TICKET_UNASSIGNED",
      entityType: "Ticket",
      entityId: ticketId,
      details: assigneeId
        ? `#${ticket.displayId} assigned to ${updated.assignee?.name}`
        : `#${ticket.displayId} returned to unassigned queue`,
    });

    if (assigneeId) {
      const member = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { email: true, contactEmail: true },
      });
      const to = member?.email || member?.contactEmail;
      if (to) {
        void emailService.ticketAssigned({
          to,
          displayId: ticket.displayId,
          subject: ticket.subject,
          priority: ticket.priority,
        });
      }
    }

    return this.formatTicket(updated);
  }

  async addComment(ticketId: string, user: JwtPayload, comment: string, isInternalNote = false, sendEmail = true) {
    await this.assertSubAccountNotBlocked(user);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.agencyId !== user.agencyId) throw notFound("Ticket not found");

    if (user.role === "TEAM_MEMBER" && ticket.assigneeId !== user.userId) {
      throw forbidden("You do not have access to this ticket");
    }

    if (user.role === "SUB_ACCOUNT") {
      if (ticket.subAccountId !== user.userId) throw forbidden("You do not have access to this ticket");
      // Product decision (main-goal.md §10): clients can reply once the ticket
      // reaches Pending - i.e. in Pending or Review, not before, not after close.
      if (ticket.stage !== "PENDING" && ticket.stage !== "REVIEW") {
        throw forbidden("You can reply once the team asks for information (Pending stage onward)");
      }
      if (isInternalNote) throw forbidden("Sub-accounts cannot add internal notes");
    }

    const history = await prisma.ticketStageHistory.create({
      data: {
        ticketId,
        stage: ticket.stage as any,
        actorId: user.userId,
        comment,
        isInternalNote,
        wasEmailed: sendEmail && !isInternalNote,
      },
      include: {
        actor: { select: { id: true, name: true, initials: true, role: true } },
      },
    });

    if (!isInternalNote && sendEmail && user.role !== "SUB_ACCOUNT") {
      await prisma.notification.create({
        data: {
          userId: ticket.subAccountId,
          ticketId,
          type: "reply",
          title: "New reply on your ticket",
          message: `A team member replied to "${ticket.subject}".`,
        },
      });

      const client = await prisma.user.findUnique({
        where: { id: ticket.subAccountId },
        select: { contactEmail: true, email: true },
      });
      const to = client?.contactEmail || client?.email;
      if (to) {
        void emailService.ticketReply({
          to,
          displayId: ticket.displayId,
          subject: ticket.subject,
          comment,
          agentName: history.actor?.name,
        });
      }
    }

    if (!isInternalNote && sendEmail && user.role === "SUB_ACCOUNT" && ticket.assigneeId) {
      await prisma.notification.create({
        data: {
          userId: ticket.assigneeId,
          ticketId,
          type: "reply",
          title: "Client replied",
          message: `Client replied to "${ticket.subject}".`,
        },
      });

      const assignee = await prisma.user.findUnique({
        where: { id: ticket.assigneeId },
        select: { email: true, contactEmail: true },
      });
      const to = assignee?.email || assignee?.contactEmail;
      if (to) {
        void emailService.ticketReply({
          to,
          displayId: ticket.displayId,
          subject: ticket.subject,
          comment,
          agentName: history.actor?.name,
        });
      }
    }

    return history;
  }

  async addAttachments(
    ticketId: string,
    user: JwtPayload,
    files: Array<{ buffer: any; originalname: string; mimetype: string; size: number }>,
    historyId?: string,
  ) {
    if (!files?.length) throw badRequest("No files were uploaded");
    await this.assertSubAccountNotBlocked(user);

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.agencyId !== user.agencyId) throw notFound("Ticket not found");

    // Same access rules as viewing/commenting on the ticket.
    if (user.role === "TEAM_MEMBER" && ticket.assigneeId !== user.userId) {
      throw forbidden("You do not have access to this ticket");
    }
    if (user.role === "SUB_ACCOUNT") {
      if (ticket.subAccountId !== user.userId) throw forbidden("You do not have access to this ticket");
      // A resolved ticket is closed for the client - no more uploads.
      if (ticket.stage === "RESOLVED") throw badRequest("This ticket is resolved - open a new ticket to send more files");
    }

    // If tying files to a specific reply, that reply must belong to this ticket.
    if (historyId) {
      const h = await prisma.ticketStageHistory.findFirst({
        where: { id: historyId, ticketId },
        select: { id: true },
      });
      if (!h) throw badRequest("Reply not found on this ticket");
    }

    // Uploader identity goes into the stored file name (account-name-role-file)
    // so every file in the GHL media library says who uploaded it.
    const uploader = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true },
    });
    const uploadCtx = {
      agencyId: user.agencyId,
      uploaderName: uploader?.name ?? "user",
      uploaderRole: user.role,
    };

    const created:any = [];
    for (const file of files) {
      const stored = await storageService.upload(file.buffer, file.originalname, uploadCtx);
      const att = await prisma.attachment.create({
        data: {
          ticketId,
          historyId: historyId ?? null,
          fileName: file.originalname,
          fileUrl: stored.url,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedById: user.userId,
        },
        include: { uploadedBy: { select: { id: true, name: true } } },
      }) as any;
      created.push(att);
    }

    return created;
  }

  async approve(ticketId: string, user: JwtPayload, note?: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { assignee: { select: { id: true, name: true } } },
    });
    if (!ticket || ticket.agencyId !== user.agencyId) throw notFound("Ticket not found");
    if (ticket.stage !== "REVIEW") throw badRequest("Ticket is not in Review stage");
    if (user.role !== "AGENCY_OWNER") throw forbidden("Only agency owners can approve tickets");

    const updated = await prisma.$transaction(async (tx) => {
      await tx.ticketStageHistory.create({
        data: {
          ticketId,
          stage: "RESOLVED",
          actorId: user.userId,
          comment: note || "Approved - closing this ticket.",
          wasEmailed: true,
        },
      });

      const t = await tx.ticket.update({
        where: { id: ticketId },
        data: { stage: "RESOLVED" },
        include: {
          assignee: { select: { id: true, name: true, initials: true } },
          subAccount: { select: { id: true, name: true, initials: true } },
          history: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });

      await tx.notification.create({
        data: {
          userId: ticket.subAccountId,
          ticketId,
          type: "stage_change",
          title: "Ticket resolved",
          message: `Ticket "${ticket.subject}" has been resolved.`,
        },
      });

      if (ticket.assigneeId) {
        await tx.notification.create({
          data: {
            userId: ticket.assigneeId,
            ticketId,
            type: "stage_change",
            title: "Ticket approved",
            message: `Ticket "${ticket.subject}" was approved and closed.`,
          },
        });
      }

      return t;
    });

    await logAudit({
      agencyId: user.agencyId,
      actorId: user.userId,
      action: "TICKET_APPROVED",
      entityType: "Ticket",
      entityId: ticketId,
      details: `#${ticket.displayId} "${ticket.subject}" approved and resolved`,
    });

    const client = await prisma.user.findUnique({
      where: { id: ticket.subAccountId },
      select: { contactEmail: true, email: true },
    });
    const to = client?.contactEmail || client?.email;
    if (to) {
      void emailService.ticketResolved({
        to,
        displayId: ticket.displayId,
        subject: ticket.subject,
        comment: note || "Your ticket has been resolved and closed.",
      });
    }

    return this.formatTicket(updated);
  }

  async reject(ticketId: string, user: JwtPayload, note: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.agencyId !== user.agencyId) throw notFound("Ticket not found");
    if (ticket.stage !== "REVIEW") throw badRequest("Ticket is not in Review stage");
    if (user.role !== "AGENCY_OWNER") throw forbidden("Only agency owners can reject tickets");
    if (!note) throw badRequest("A note explaining the rejection is required");

    const updated = await prisma.$transaction(async (tx) => {
      await tx.ticketStageHistory.create({
        data: {
          ticketId,
          stage: "WORKING",
          actorId: user.userId,
          comment: `Sent back for more work: ${note}`,
          wasEmailed: false,
        },
      });

      const t = await tx.ticket.update({
        where: { id: ticketId },
        data: { stage: "WORKING" },
        include: {
          assignee: { select: { id: true, name: true, initials: true } },
          subAccount: { select: { id: true, name: true, initials: true } },
          history: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });

      if (ticket.assigneeId) {
        await tx.notification.create({
          data: {
            userId: ticket.assigneeId,
            ticketId,
            type: "stage_change",
            title: "Ticket returned for more work",
            message: `"${ticket.subject}" was rejected in review. ${note}`,
          },
        });
      }

      return t;
    });

    await logAudit({
      agencyId: user.agencyId,
      actorId: user.userId,
      action: "TICKET_REVIEW_REJECTED",
      entityType: "Ticket",
      entityId: ticketId,
      details: `#${ticket.displayId} sent back to Working: ${note}`,
    });

    return this.formatTicket(updated);
  }

  async getHistory(ticketId: string, user: JwtPayload) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.agencyId !== user.agencyId) throw notFound("Ticket not found");

    if (user.role === "TEAM_MEMBER" && ticket.assigneeId !== user.userId) {
      throw forbidden("You do not have access to this ticket");
    }
    if (user.role === "SUB_ACCOUNT" && ticket.subAccountId !== user.userId) {
      throw forbidden("You do not have access to this ticket");
    }

    const history = await prisma.ticketStageHistory.findMany({
      where: {
        ticketId,
        ...(user.role === "SUB_ACCOUNT" ? { isInternalNote: false } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: {
        actor: { select: { id: true, name: true, initials: true, role: true } },
      },
    });

    return history;
  }

  async getUnassigned(agencyId: string) {
    const tickets = await prisma.ticket.findMany({
      where: {
        agencyId,
        assigneeId: null,
        stage: { not: "RESOLVED" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        subAccount: { select: { id: true, name: true, initials: true } },
      },
    });

    return tickets.map((t) => ({
      id: t.id,
      displayId: t.displayId,
      subject: t.subject,
      priority: t.priority,
      category: t.category,
      stage: t.stage,
      subAccount: t.subAccount,
      createdAt: t.createdAt,
    }));
  }

  async getReviewQueue(agencyId: string) {
    const tickets = await prisma.ticket.findMany({
      where: { agencyId, stage: "REVIEW" },
      orderBy: { updatedAt: "desc" },
      include: {
        assignee: { select: { id: true, name: true, initials: true } },
        subAccount: { select: { id: true, name: true, initials: true } },
        history: {
          where: { stage: "REVIEW" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return tickets.map((t) => ({
      id: t.id,
      displayId: t.displayId,
      subject: t.subject,
      priority: t.priority,
      category: t.category,
      assignee: t.assignee,
      subAccount: t.subAccount,
      resolveNote: t.history[0]?.comment || "",
      updatedAt: t.updatedAt,
    }));
  }

  private canMoveTo(currentStage: string, targetStage: string, user: JwtPayload): boolean {
    if (user.role === "AGENCY_OWNER") return true;
    if (user.role === "SUB_ACCOUNT") return false;

    if (user.role === "TEAM_MEMBER") {
      // Team members work tickets through any stage EXCEPT Resolved - closing
      // requires the owner's approval via the Review gate. Backward moves
      // (e.g. Pending → Working) are legitimate day-to-day flow, but NEW is
      // reserved for the unassigned queue (an assigned-but-NEW ticket would be
      // invisible there yet re-trigger first-assignment logic).
      if (targetStage === "RESOLVED" || targetStage === "NEW") return false;
      if (currentStage === "RESOLVED") return false; // reopening is owner-only
      return targetStage in STAGE_ORDER;
    }

    return false;
  }

  private getDefaultComment(stage: string, category: string): string {
    const comments: Record<string, string> = {
      NEW: "Ticket submitted.",
      ACCEPTED: "This has been acknowledged and queued for work.",
      WORKING: `We're actively working on your ${category} issue.`,
      PENDING: "We're waiting on more information - please reply when you're ready.",
      REVIEW: "This is complete and with an admin for final sign-off.",
      RESOLVED: "This issue has been resolved. Thanks for your patience!",
    };
    return comments[stage] || `Moved to ${stage}`;
  }

  private formatTicket(ticket: any) {
    return {
      id: ticket.id,
      displayId: ticket.displayId,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category,
      stage: ticket.stage,
      assignee: ticket.assignee || null,
      subAccount: ticket.subAccount || null,
      history: ticket.history || [],
      attachments: ticket.attachments || [],
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}

export const ticketsService = new TicketsService();
