import { z } from "zod";

export const portalEnterSchema = z.object({
  body: z.object({
    locationId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[\w-]+$/, "Invalid location ID format"),
  }),
});

