import { z } from "zod";

export const createTicketSchema = z.object({
  body: z.object({
    subject: z.string().min(1, "Subject is required"),
    description: z.string().default(""),
    category: z.string().min(1),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    subAccountId: z.string().optional(),
  }),
});

export const moveStageSchema = z.object({
  body: z.object({
    stage: z.enum(["NEW", "ACCEPTED", "WORKING", "PENDING", "REVIEW", "RESOLVED"]),
    comment: z.string().optional(),
    sendEmail: z.boolean().default(true),
  }),
});

export const assignSchema = z.object({
  body: z.object({
    assigneeId: z.string().nullable(),
  }),
});

export const commentSchema = z.object({
  body: z.object({
    comment: z.string().min(1, "Comment is required"),
    isInternalNote: z.boolean().default(false),
    sendEmail: z.boolean().default(true),
  }),
});

export const reviewSchema = z.object({
  body: z.object({
    note: z.string().optional(),
  }),
});

export const ticketIdParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const listTicketsSchema = z.object({
  query: z.object({
    // Enum-validated: a bogus ?stage= must 400, not crash Prisma into a 500.
    stage: z.enum(["NEW", "ACCEPTED", "WORKING", "PENDING", "REVIEW", "RESOLVED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    category: z.string().optional(),
    assigneeId: z.string().optional(),
    subAccountId: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});
