import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const connectSchema = z
  .object({
    agencyName: z.string().min(2, "Agency name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    ghlCompanyId: z
      .string()
      .min(1, "Company / Location ID is required")
      .regex(/^[\w-]+$/, "Only letters, numbers, dashes and underscores"),
    ghlApiKey: z.string().min(10, "GHL Private Integration key is required"),
    ghlMediaLocationId: z
      .string()
      .min(1, "Media storage Location ID is required")
      .regex(/^[\w-]+$/, "Only letters, numbers, dashes and underscores"),
    ghlMediaApiKey: z.string().min(10, "Media storage PIT token is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const mediaStorageSchema = z.object({
  ghlMediaLocationId: z
    .string()
    .min(1, "Media storage Location ID is required")
    .regex(/^[\w-]+$/, "Only letters, numbers, dashes and underscores"),
  ghlMediaApiKey: z.string().min(10, "Media storage PIT token is required"),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type LoginFormData = z.infer<typeof loginSchema>
export type ConnectFormData = z.infer<typeof connectSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
export type MediaStorageFormData = z.infer<typeof mediaStorageSchema>
