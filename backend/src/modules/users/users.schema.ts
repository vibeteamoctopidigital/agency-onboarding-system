import { z } from "zod";

export const createTeamMemberSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    skills: z.array(z.string()).default([]),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    skills: z.array(z.string()).optional(),
    isAvailable: z.boolean().optional(),
  }),
});

export const urlParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const createSubAccountSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    locationId: z.string().min(1),
    contactEmail: z.string().email().optional(),
    plan: z.string().optional(),
  }),
});
