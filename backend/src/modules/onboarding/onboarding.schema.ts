import { z } from "zod";

export const clientOnboardingSchema = z.object({
  body: z.object({
    crmStatus: z.enum(["new", "existing"]),

    // For "New in CRM"
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    personalEmail: z.string().email("Valid email is required").optional().or(z.literal("")),
    phone: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    personalAddress: z.string().optional(),

    friendlyBusinessName: z.string().optional(),
    legalBusinessName: z.string().optional(),
    businessEmail: z.string().email("Valid business email is required").optional().or(z.literal("")),
    businessPhone: z.string().optional(),
    brandedDomain: z.string().optional(),
    website: z.string().optional(),
    businessNiche: z.string().optional(),
    businessCurrency: z.string().optional(),
    
    businessStreetAddress: z.string().optional(),
    businessCity: z.string().optional(),
    businessPostalCode: z.string().optional(),
    businessStateRegion: z.string().optional(),
    businessCountry: z.string().optional(),
    businessTimeZone: z.string().optional(),
    platformLanguage: z.string().optional(),
    outboundLanguage: z.string().optional(),

    businessType: z.string().optional(),
    industry: z.string().optional(),
    customIndustry: z.string().optional(),
    registrationIdType: z.string().optional(),
    registrationNumber: z.string().optional(),
    isNotRegistered: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
    regionsOfOperations: z.union([z.array(z.string()), z.string()]).optional(),

    // For "Already have CRM"
    repFirstName: z.string().optional(),
    repLastName: z.string().optional(),
    repEmail: z.string().email("Valid email is required").optional().or(z.literal("")),
    repJobPosition: z.string().optional(),
    repPhone: z.string().optional(),
    repEinTin: z.string().min(1, "EIN / TIN number is required").optional(),

    // Common
    problemDetails: z.string().min(1, "Problem details are required"),
    currentTools: z.string().optional(),
    primaryGoal: z.string().min(1, "Primary goal is required"),
  }),
});
