import { badRequest, forbidden, notFound } from "../../utils/appError";
import { logAudit } from "../../utils/audit";
import { prisma } from "../../utils/prisma";
import { storageService } from "../../lib/storage/storage.service";
import type { JwtPayload } from "../../utils/jwt";
import { emailQueue } from "../../queue/emailQueue";
import axios from "axios";
import { env } from "@/utils/envConfig";
import { sendMailByWebHook } from "@/utils/email.utils";

/**
 * Social orders - design/content work requests from sub-accounts, worked by
 * the agency. Mirrors the tickets module's patterns (displayId per agency,
 * timeline table, service-layer permission checks).
 *
 * Status flow:
 *   PROPOSED  → client approves → ACCEPTED, or declines → CANCELLED
 *   SUBMITTED → owner accepts  → ACCEPTED (owner may cancel)
 *   ACCEPTED  → IN_PROGRESS → DELIVERED
 *   DELIVERED → client confirms → COMPLETED, or requests changes → IN_PROGRESS
 */

const ORDER_INCLUDE = {
  subAccount: { select: { id: true, name: true, initials: true, contactEmail: true } },
  createdBy: { select: { id: true, name: true, initials: true, role: true } },
  assignees: { include: { user: { select: { id: true, name: true, initials: true } } } },
  updates: {
    orderBy: { createdAt: "asc" as const },
    include: { actor: { select: { id: true, name: true, initials: true, role: true } } },
  },
  files: {
    orderBy: { createdAt: "desc" as const },
    include: { uploadedBy: { select: { id: true, name: true, role: true } } },
  },
} as const;

export class SocialService {
  /** Same immediate-block rule as tickets: a blocked client cannot write. */
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

  private async orderOrThrow(orderId: string, user: JwtPayload) {
    const order = await prisma.socialOrder.findUnique({
      where: { id: orderId },
      include: { assignees: { select: { userId: true } }, subAccount: { select: { name: true } } },
    });
    if (!order || order.agencyId !== user.agencyId) throw notFound("Order not found");

    if (user.role === "SUB_ACCOUNT" && order.subAccountId !== user.userId) {
      throw forbidden("You do not have access to this order");
    }
    if (user.role === "TEAM_MEMBER" && !order.assignees.some((a) => a.userId === user.userId)) {
      throw forbidden("You do not have access to this order");
    }
    return order;
  }

  async create(
    dto: {
      title: string;
      details: string;
      orderType: string;
      customType?: string;
      hashtags?: string[];
      dueDate?: Date;
      subAccountId?: string;
      proposalNote?: string;
    },
    user: JwtPayload,
  ) {
    await this.assertSubAccountNotBlocked(user);

    if (dto.orderType === "other" && !dto.customType?.trim()) {
      throw badRequest("Describe the order type when choosing Other");
    }

    // A sub-account orders for itself; an owner PROPOSES on a client's behalf
    // (e.g. agreed in a meeting but the client forgot to post it).
    const isProposal = user.role === "AGENCY_OWNER";
    const subAccountId = isProposal ? dto.subAccountId : user.userId;
    if (!subAccountId) throw badRequest("subAccountId is required");
    if (isProposal && !dto.proposalNote?.trim()) {
      throw badRequest("Add a short message for the client explaining this proposal");
    }

    const subAccount = await prisma.user.findFirst({
      where: { id: subAccountId, agencyId: user.agencyId, role: "SUB_ACCOUNT", isDeleted: false },
      select: { id: true, name: true, email: true, contactEmail: true,locationId:true },
    });
    if (!subAccount) throw badRequest("Unknown sub-account for this agency");

    const status = isProposal ? "PROPOSED" : "SUBMITTED";

    const order = await prisma.$transaction(async (tx) => {
      const last = await tx.socialOrder.findFirst({
        where: { agencyId: user.agencyId },
        orderBy: { displayId: "desc" },
        select: { displayId: true },
      });

      const created = await tx.socialOrder.create({
        data: {
          displayId: (last?.displayId || 0) + 1,
          title: dto.title,
          details: dto.details,
          orderType: dto.orderType,
          customType: dto.orderType === "other" ? dto.customType?.trim() : null,
          hashtags: dto.hashtags ?? [],
          dueDate: dto.dueDate ?? null,
          status,
          createdById: user.userId,
          proposalNote: isProposal ? dto.proposalNote?.trim() : null,
          subAccountId,
          agencyId: user.agencyId,
          updates: {
            create: {
              status,
              actorId: user.userId,
              note: isProposal
                ? `Order proposed to ${subAccount.name}: ${dto.proposalNote?.trim()}`
                : "Order submitted.",
            },
          },
        },
        include: ORDER_INCLUDE,
      });

      if (isProposal) {
        await tx.notification.create({
          data: {
            userId: subAccountId,
            type: "social_proposal",
            title: "New order proposal from your agency",
            message: `"${created.title}" - please review and approve it.`,
          },
        });
        
        const recipientEmail = subAccount.email || subAccount.contactEmail;
        // if (recipientEmail) {
        //   await emailQueue.add("PROPOSAL_SENT", {
        //     email: "habib.octopidigital@gmail.com",
        //     clientName: subAccount.name,
        //     orderTitle: created.title,
        //     proposalNote: created.proposalNote,
        //   });
        // }

        await sendMailByWebHook({
             "email": recipientEmail, "name": subAccount.name,"type":"PROPOSAL_SENT",
            clientName: subAccount.name,
 orderTitle: created.title,
proposalNote: created.proposalNote, 
proposalUrl:`${env.CORS_ORIGIN}/social?location_id=${subAccount.locationId}`
        })

       
        

      } else {
        const owners = await tx.user.findMany({
          where: { agencyId: user.agencyId, role: "AGENCY_OWNER", isDeleted: false },
          select: { id: true },
        });
        await tx.notification.createMany({
          data: owners.map((o) => ({
            userId: o.id,
            type: "social_order",
            title: "New social order",
            message: `${subAccount.name} submitted "${created.title}".`,
          })),
        });
      }

      return created;
    });

    await logAudit({
      agencyId: user.agencyId,
      actorId: user.userId,
      action: isProposal ? "SOCIAL_ORDER_PROPOSED" : "SOCIAL_ORDER_SUBMITTED",
      entityType: "SocialOrder",
      entityId: order.id,
      details: `#${order.displayId} "${order.title}" for ${subAccount.name}`,
    });

    return this.format(order);
  }

  async list(user: JwtPayload, filters: { status?: string; subAccountId?: string; orderType?: string }) {
    const where: any = { agencyId: user.agencyId };
    if (user.role === "SUB_ACCOUNT") where.subAccountId = user.userId;
    if (user.role === "TEAM_MEMBER") where.assignees = { some: { userId: user.userId } };
    if (filters.status) where.status = filters.status;
    if (filters.subAccountId && user.role === "AGENCY_OWNER") where.subAccountId = filters.subAccountId;
    if (filters.orderType) where.orderType = filters.orderType;

    const orders = await prisma.socialOrder.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: ORDER_INCLUDE,
    });
    console.log(orders);
    
    return orders.map((o) => this.format(o));
  }

  async getById(orderId: string, user: JwtPayload) {
    await this.orderOrThrow(orderId, user);
    const order = await prisma.socialOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    return this.format(order);
  }

  async updateOrder(orderId: string, user: JwtPayload, data: any) {
    const order = await this.orderOrThrow(orderId, user);
    if (user.role === "SUB_ACCOUNT") throw forbidden("Clients cannot edit orders directly");
    
    const updated = await prisma.socialOrder.update({
      where: { id: orderId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.details !== undefined && { details: data.details }),
        ...(data.orderType !== undefined && { orderType: data.orderType }),
        ...(data.customType !== undefined && { customType: data.customType }),
        ...(data.hashtags !== undefined && { hashtags: data.hashtags }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      },
      include: ORDER_INCLUDE,
    });
    
    if (data.deletedFileIds && data.deletedFileIds.length > 0) {
      await prisma.socialOrderFile.deleteMany({
        where: {
          id: { in: data.deletedFileIds },
          orderId: orderId, // ensure they belong to this order
        }
      });
    }
    
    await logAudit({
      agencyId: user.agencyId,
      actorId: user.userId,
      action: "SOCIAL_ORDER_UPDATED",
      entityType: "SocialOrder",
      entityId: orderId,
      details: `Updated order #${order.displayId}`,
    });
    
    return this.format(updated);
  }

  /** Owner accepts a client-submitted order. */
  async accept(orderId: string, user: JwtPayload, note?: string) {
    const order = await this.orderOrThrow(orderId, user);
    if (order.status !== "SUBMITTED") throw badRequest("Only submitted orders can be accepted");

    const updated = await this.applyStatus(orderId, "ACCEPTED", user.userId, note || "Order accepted - we're on it.", {
      acceptedAt: new Date(),
    });
    await prisma.notification.create({
      data: {
        userId: order.subAccountId,
        type: "social_order",
        title: "Order accepted",
        message: `"${order.title}" was accepted by your agency.`,
      },
    });
    await logAudit({
      agencyId: user.agencyId,
      actorId: user.userId,
      action: "SOCIAL_ORDER_ACCEPTED",
      entityType: "SocialOrder",
      entityId: orderId,
      details: `#${order.displayId} accepted`,
    });
    return updated;
  }

  /** Client approves or declines an owner-created proposal. */
  async respondToProposal(orderId: string, user: JwtPayload, approve: boolean, note?: string) {
    await this.assertSubAccountNotBlocked(user);
    const order = await this.orderOrThrow(orderId, user);
    if (user.role !== "SUB_ACCOUNT") throw forbidden("Only the client can respond to a proposal");
    if (order.status !== "PROPOSED") throw badRequest("This order is not awaiting your approval");

    const status = approve ? "IN_PROGRESS" : "CANCELLED";
    const updated = await this.applyStatus(
      orderId,
      status,
      user.userId,
      note?.trim() || (approve ? "Proposal approved - go ahead." : "Proposal declined."),
      { acceptedAt: approve ? new Date() : null, proposalNote: !approve && note ? note.trim() : null },
    );

    const owners = await prisma.user.findMany({
      where: { agencyId: user.agencyId, role: "AGENCY_OWNER", isDeleted: false },
      select: { id: true, email: true, name: true },
    });
    await prisma.notification.createMany({
      data: owners.map((o) => ({
        userId: o.id,
        type: "social_order",
        title: approve ? "Proposal approved" : "Proposal declined",
        message: `"${order.title}" was ${approve ? "approved" : "declined"} by the client.`,
      })),
    });

    if (approve) {
      for (const owner of owners) {
        if (owner.email) {
          await sendMailByWebHook({
            email: owner.email,
            name: owner.name || "Agency Admin",
            type: "PROPOSAL_APPROVED",
            clientName: order.subAccount.name,
            orderTitle: order.title
          });
        }
      }
    }
    await logAudit({
      agencyId: user.agencyId,
      actorId: user.userId,
      action: approve ? "SOCIAL_PROPOSAL_APPROVED" : "SOCIAL_PROPOSAL_DECLINED",
      entityType: "SocialOrder",
      entityId: orderId,
      details: `#${order.displayId} proposal ${approve ? "approved" : "declined"}`,
    });
    return updated;
  }

  /** Owner sets the full assignee list (one or many team members). */
  async assign(orderId: string, user: JwtPayload, assigneeIds: string[]) {
    const order = await this.orderOrThrow(orderId, user);
    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      throw badRequest("This order is closed");
    }

    const unique = [...new Set(assigneeIds)];
    if (unique.length > 0) {
      const members = await prisma.user.findMany({
        where: { id: { in: unique }, agencyId: user.agencyId, role: "TEAM_MEMBER", isDeleted: false },
        select: { id: true },
      });
      if (members.length !== unique.length) {
        throw badRequest("Every assignee must be an active team member of this agency");
      }
    }

    const previous = new Set(order.assignees.map((a) => a.userId));
    const added = unique.filter((id) => !previous.has(id));

    await prisma.$transaction(async (tx) => {
      await tx.socialOrderAssignee.deleteMany({ where: { orderId, userId: { notIn: unique } } });
      await tx.socialOrderAssignee.createMany({
        data: added.map((userId) => ({ orderId, userId })),
        skipDuplicates: true,
      });
      await tx.notification.createMany({
        data: added.map((userId) => ({
          userId,
          type: "social_assignment",
          title: "Order assigned to you",
          message: `You were assigned to order "${order.title}".`,
        })),
      });
    });

    await logAudit({
      agencyId: user.agencyId,
      actorId: user.userId,
      action: "SOCIAL_ORDER_ASSIGNED",
      entityType: "SocialOrder",
      entityId: orderId,
      details: `#${order.displayId} assignees set (${unique.length})`,
    });
    return this.getById(orderId, user);
  }

  /** Owner or an assignee moves the work forward (IN_PROGRESS / DELIVERED). */
  async setStatus(orderId: string, user: JwtPayload, status: "IN_PROGRESS" | "DELIVERED", note?: string) {
    const order = await this.orderOrThrow(orderId, user);
    if (user.role === "SUB_ACCOUNT") throw forbidden("Clients cannot change the work status");

    const allowedFrom: Record<string, string[]> = {
      IN_PROGRESS: ["ACCEPTED", "DELIVERED"], // DELIVERED → IN_PROGRESS = rework after feedback
      DELIVERED: ["IN_PROGRESS", "ACCEPTED"],
    };
    if (!allowedFrom[status].includes(order.status)) {
      throw badRequest(`Cannot move a ${order.status.toLowerCase()} order to ${status.toLowerCase()}`);
    }

    const defaultNote =
      status === "IN_PROGRESS" ? "Work started on this order." : "Order delivered - please review and confirm.";
    const updated = await this.applyStatus(orderId, status, user.userId, note?.trim() || defaultNote, {
      ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
    });

    await prisma.notification.create({
      data: {
        userId: order.subAccountId,
        type: "social_order",
        title: status === "DELIVERED" ? "Order delivered - confirm it" : "Order update",
        message:
          status === "DELIVERED"
            ? `"${order.title}" is ready - review it and confirm receipt.`
            : `Work started on "${order.title}".`,
      },
    });
    return updated;
  }

  /** Progress note without a status change - the running commentary clients see. */
  async addProgressNote(orderId: string, user: JwtPayload, note: string) {
    const order = await this.orderOrThrow(orderId, user);
    if (user.role === "SUB_ACCOUNT") {
      // Clients may add notes too (e.g. clarifications) on open orders.
      await this.assertSubAccountNotBlocked(user);
      if (order.status === "COMPLETED" || order.status === "CANCELLED") {
        throw badRequest("This order is closed");
      }
    }

    const update = await prisma.socialOrderUpdate.create({
      data: { orderId, actorId: user.userId, status: order.status, note },
      include: { actor: { select: { id: true, name: true, initials: true, role: true } } },
    });

    // Staff note → notify the client; client note → notify the assignees.
    if (user.role === "SUB_ACCOUNT") {
      await prisma.notification.createMany({
        data: order.assignees.map((a) => ({
          userId: a.userId,
          type: "social_order",
          title: "Client added a note",
          message: `New note on order "${order.title}".`,
        })),
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: order.subAccountId,
          type: "social_order",
          title: "Order progress update",
          message: `New update on "${order.title}".`,
        },
      });
    }
    return update;
  }

  /** Client confirms the delivered order - the "actual order received" moment. */
  async confirm(orderId: string, user: JwtPayload, note?: string) {
    await this.assertSubAccountNotBlocked(user);
    const order = await this.orderOrThrow(orderId, user);
    if (user.role !== "SUB_ACCOUNT") throw forbidden("Only the client can confirm delivery");
    if (order.status !== "DELIVERED") throw badRequest("Only delivered orders can be confirmed");

    const updated = await this.applyStatus(
      orderId,
      "COMPLETED",
      user.userId,
      note?.trim() || "Confirmed - order received. Thank you!",
      { completedAt: new Date() },
    );

    const staff = [...new Set([order.createdById, ...order.assignees.map((a) => a.userId)])];
    await prisma.notification.createMany({
      data: staff.map((userId) => ({
        userId,
        type: "social_order",
        title: "Order confirmed by client",
        message: `"${order.title}" was confirmed as received.`,
      })),
    });
    await logAudit({
      agencyId: user.agencyId,
      actorId: user.userId,
      action: "SOCIAL_ORDER_COMPLETED",
      entityType: "SocialOrder",
      entityId: orderId,
      details: `#${order.displayId} confirmed by client`,
    });
    return updated;
  }

  /** Client asks for changes on a delivered order - back to IN_PROGRESS. */
  async requestChanges(orderId: string, user: JwtPayload, note: string) {
    await this.assertSubAccountNotBlocked(user);
    const order = await this.orderOrThrow(orderId, user);
    if (user.role !== "SUB_ACCOUNT") throw forbidden("Only the client can request changes");
    // if (order.status !== "DELIVERED") throw badRequest("Only delivered orders can be sent back");

    const updated = await this.applyStatus(orderId, "IN_PROGRESS", user.userId, `Changes requested: ${note}`, {
      proposalNote: `Changes requested: ${note}`
    });
    const staff = [...new Set([order.createdById, ...order.assignees.map((a) => a.userId)])];
    await prisma.notification.createMany({
      data: staff.map((userId) => ({
        userId,
        type: "social_order",
        title: "Changes requested",
        message: `The client requested changes on "${order.title}".`,
      })),
    });
    return updated;
  }

  /** Owner cancels an order at any open stage. */
  async cancel(orderId: string, user: JwtPayload, note?: string) {
    const order = await this.orderOrThrow(orderId, user);
    if (user.role !== "AGENCY_OWNER") throw forbidden("Only agency owners can cancel orders");
    if (order.status === "COMPLETED" || order.status === "CANCELLED") throw badRequest("This order is already closed");

    const updated = await this.applyStatus(orderId, "CANCELLED", user.userId, note?.trim() || "Order cancelled.");
    await prisma.notification.create({
      data: {
        userId: order.subAccountId,
        type: "social_order",
        title: "Order cancelled",
        message: `"${order.title}" was cancelled by your agency.`,
      },
    });
    return updated;
  }

  /** Per-order media folder: every file lands in GHL prefixed with the order id. */
  async addFiles(
    orderId: string,
    user: JwtPayload,
    files: Array<{ buffer: any; originalname: string; mimetype: string; size: number }>,
  ) {
    if (!files?.length) throw badRequest("No files were uploaded");
    await this.assertSubAccountNotBlocked(user);
    const order = await this.orderOrThrow(orderId, user);
    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      throw badRequest("This order is closed - files can no longer be added");
    }

    const uploader = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true },
    });

    const created: any[] = [];
    for (const file of files) {
      const stored = await storageService.upload(
        file.buffer,
        // "order-{displayId}-" prefix = the order's folder in the media library.
        `order-${order.displayId}-${file.originalname}`,
        { agencyId: user.agencyId, uploaderName: uploader?.name ?? "user", uploaderRole: user.role },
      );
      const row = await prisma.socialOrderFile.create({
        data: {
          orderId,
          fileName: file.originalname,
          fileUrl: stored.url,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedById: user.userId,
        },
        include: { uploadedBy: { select: { id: true, name: true, role: true } } },
      });
      created.push(row);
    }
    return created;
  }

  /** Owner's in-depth view of one client: tickets + orders + recent activity. */
  async subAccountProfile(agencyId: string, subAccountUserId: string) {
    const client = await prisma.user.findFirst({
      where: { id: subAccountUserId, agencyId, role: "SUB_ACCOUNT" },
      select: {
        id: true, name: true, initials: true, contactEmail: true, plan: true,
        locationId: true, createdAt: true, isDeleted: true,
        subAccountProfile: { select: { status: true, requestedAt: true, decidedAt: true } },
      },
    });
    if (!client) throw notFound("Sub-account not found");

    const [tickets, orders] = await Promise.all([
      prisma.ticket.findMany({
        where: { subAccountId: subAccountUserId },
        select: { id: true, displayId: true, subject: true, stage: true, priority: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.socialOrder.findMany({
        where: { subAccountId: subAccountUserId },
        select: {
          id: true, displayId: true, title: true, status: true, orderType: true,
          customType: true, dueDate: true, createdAt: true, updatedAt: true, completedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const now = new Date();
    const openOrderStatuses = ["PROPOSED", "SUBMITTED", "ACCEPTED", "IN_PROGRESS", "DELIVERED"];
    return {
      client: {
        ...client,
        accessStatus: client.subAccountProfile?.status ?? "ACTIVE",
        subAccountProfile: undefined,
      },
      ticketStats: {
        total: tickets.length,
        solved: tickets.filter((t) => t.stage === "RESOLVED").length,
        open: tickets.filter((t) => t.stage !== "RESOLVED").length,
        inReview: tickets.filter((t) => t.stage === "REVIEW").length,
      },
      orderStats: {
        total: orders.length,
        active: orders.filter((o) => openOrderStatuses.includes(o.status)).length,
        awaitingApproval: orders.filter((o) => o.status === "PROPOSED").length,
        delivered: orders.filter((o) => o.status === "DELIVERED").length,
        completed: orders.filter((o) => o.status === "COMPLETED").length,
        overdue: orders.filter(
          (o) => o.dueDate && o.dueDate < now && openOrderStatuses.includes(o.status),
        ).length,
      },
      recentTickets: tickets.slice(0, 8),
      recentOrders: orders.slice(0, 8),
    };
  }

  private async applyStatus(
    orderId: string,
    status: "ACCEPTED" | "IN_PROGRESS" | "DELIVERED" | "COMPLETED" | "CANCELLED",
    actorId: string,
    note: string,
    extra: Record<string, any> = {},
  ) {
    const order = await prisma.$transaction(async (tx) => {
      await tx.socialOrderUpdate.create({ data: { orderId, actorId, status, note } });
      return tx.socialOrder.update({
        where: { id: orderId },
        data: { status, ...extra },
        include: ORDER_INCLUDE,
      });
    });
    return this.format(order);
  }

  private format(order: any) {
    return {
      id: order.id,
      displayId: order.displayId,
      title: order.title,
      details: order.details,
      orderType: order.orderType,
      customType: order.customType,
      dueDate: order.dueDate,
      status: order.status,
      proposalNote: order.proposalNote,
      subAccount: order.subAccount,
      createdBy: order.createdBy,
      assignees: (order.assignees ?? []).map((a: any) => a.user).filter(Boolean),
      updates: order.updates ?? [],
      files: order.files ?? [],
      acceptedAt: order.acceptedAt,
      deliveredAt: order.deliveredAt,
      completedAt: order.completedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      hashtags:order.hashtags
    };
  }
}

export const socialService = new SocialService();
