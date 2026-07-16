import { z } from "zod";

export const ORDER_TYPES = ["poster", "logo", "social-post", "reel-video", "banner", "flyer", "other"] as const;

const baseOrderBody = {
  title: z.string().trim().min(1).max(200),
  details: z.string().trim().min(1).max(10_000),
  orderType: z.enum(ORDER_TYPES),
  customType: z.string().trim().max(100).optional(),
  hashtags: z.array(z.string().trim().max(50)).max(20).optional(),
  dueDate: z.coerce.date().optional(),
};

export const createOrderSchema = z.object({
  body: z.object({
    ...baseOrderBody,
    // Owner creating on a client's behalf: which client + the proposal message
    subAccountId: z.string().optional(),
    proposalNote: z.string().trim().max(2000).optional(),
  }),
});

export const updateOrderSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    details: z.string().trim().min(1).max(10_000).optional(),
    orderType: z.enum(ORDER_TYPES).optional(),
    customType: z.string().trim().max(100).optional().nullable(),
    hashtags: z.array(z.string().trim().max(50)).max(20).optional(),
    dueDate: z.coerce.date().optional().nullable(),
    deletedFileIds: z.array(z.string()).optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const listOrdersSchema = z.object({
  query: z
    .object({
      // Enum-validated: a bogus ?status= must 400, not crash Prisma into a 500.
      status: z
        .enum(["PROPOSED", "SUBMITTED", "ACCEPTED", "IN_PROGRESS", "DELIVERED", "COMPLETED", "CANCELLED"])
        .optional(),
      subAccountId: z.string().optional(),
      orderType: z.enum(ORDER_TYPES).optional(),
    })
    .optional(),
});

export const assignOrderSchema = z.object({
  body: z.object({
    assigneeIds: z.array(z.string()).max(20),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const orderStatusSchema = z.object({
  body: z.object({
    status: z.enum(["IN_PROGRESS", "DELIVERED"]),
    note: z.string().trim().max(2000).optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const orderNoteSchema = z.object({
  body: z.object({
    note: z.string().trim().min(1).max(2000),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const optionalNoteSchema = z.object({
  body: z.object({
    note: z.string().trim().max(2000).optional(),
  }).optional(),
  params: z.object({ id: z.string().min(1) }),
});

export const respondProposalSchema = z.object({
  body: z.object({
    approve: z.boolean(),
    note: z.string().trim().max(2000).optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});
