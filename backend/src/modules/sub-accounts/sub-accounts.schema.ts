import { z } from "zod";

export const rejectSchema = z.object({
  body: z.object({
    comment: z.string().max(1000).optional(),
  }),
});

export const connectLocationSchema = z.object({
  body: z.object({
    locationId: z.string().trim().min(1).max(100),
  }),
});

export const changeStatusSchema = z.object({
  body: z.object({
    status: z.enum(["ACTIVE", "BLOCKED", "REJECTED"]),
    comment: z.string().max(1000).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

export const decisionParamsSchema = z.object({
  body: z.object({}).passthrough().optional(),
  params: z.object({
    id: z.string().min(1),
  }),
});
