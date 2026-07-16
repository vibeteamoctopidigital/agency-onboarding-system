import { z } from "zod";

export const clientOnboardingSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    personalEmail: z.string().email("Valid email is required"),
    phone: z.string().min(1, "Phone is required"),
    country: z.string().min(2, "Country is required"),
    city: z.string().min(2, "City is required"),
    personalAddress: z.string().min(5, "Personal address is required"),
    passportNo: z.string().min(5, "Passport number is required"),
    nationalIdNo: z.string().min(1, "National ID is required"),

    companyName: z.string().min(2, "Company name is required"),
    website: z.string().optional().or(z.literal("")),
    companyBrief: z.string().min(10, "Company brief is required"),
    businessEmail: z.string().email("Valid business email is required"),
    industry: z.string().min(2, "Industry is required"),
    customIndustry: z.string().optional(),
    employeeCount: z.string().min(1, "Employee count is required"),
    businessAddress: z.string().min(5, "Business address is required"),
    linkedInUrl: z.string().optional().or(z.literal("")),
    socialLinks: z.string().optional(),

    problemDetails: z.string().min(20, "Problem details are required"),
    currentTools: z.string().optional(),
    primaryGoal: z.string().min(10, "Primary goal is required"),
  }),
});
