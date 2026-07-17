import { z } from "zod";
import { COUNTRIES } from "../data/countries";

export const onboardingSchema = z.object({
  crmStatus: z.enum(["new", "existing"]),

  // ==========================================
  // Fields for "New in CRM"
  // ==========================================
  // Personal Info (Existing minus NID/passport)
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  personalEmail: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  personalAddress: z.string().optional(),

  // Business Info (Images 1 & 2)
  friendlyBusinessName: z.string().optional(),
  legalBusinessName: z.string().optional(),
  businessEmail: z.string().optional(),
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
  isNotRegistered: z.boolean().optional(),
  regionsOfOperations: z.array(z.string()).optional(),

  // ==========================================
  // Fields for "Already have CRM"
  // ==========================================
  repFirstName: z.string().optional(),
  repLastName: z.string().optional(),
  repEmail: z.string().optional(),
  repJobPosition: z.string().optional(),
  repPhone: z.string().optional(),

  // ==========================================
  // Common Fields (Step 3)
  // ==========================================
  problemDetails: z.string().min(20, "Please provide more details about the problem (at least 20 characters)"),
  currentTools: z.string().optional(),
  primaryGoal: z.string().min(10, "Please describe your primary goal (at least 10 characters)"),
  media: z.array(z.any()).optional(),

  agreedToTerms: z.literal(true, {
    message: "You must agree to the terms and conditions",
  }),
}).superRefine((data, ctx) => {
  if (data.crmStatus === "new") {
    // Validate Personal Info
    if (!data.firstName || data.firstName.trim().length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["firstName"], message: "First name is required" });
    if (!data.lastName || data.lastName.trim().length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lastName"], message: "Last name is required" });
    if (!data.personalEmail || !/^\S+@\S+\.\S+$/.test(data.personalEmail)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["personalEmail"], message: "Valid email is required" });
    if (!data.phone || data.phone.trim().length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Phone number is required" });
    if (!data.country) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["country"], message: "Country is required" });
    if (!data.city) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["city"], message: "City is required" });
    if (!data.personalAddress || data.personalAddress.trim().length < 5) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["personalAddress"], message: "Address is required" });

    // Validate Business Info
    if (!data.friendlyBusinessName || data.friendlyBusinessName.trim().length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["friendlyBusinessName"], message: "Friendly business name is required" });
    if (!data.legalBusinessName || data.legalBusinessName.trim().length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["legalBusinessName"], message: "Legal business name is required" });
    if (!data.businessEmail || !/^\S+@\S+\.\S+$/.test(data.businessEmail)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["businessEmail"], message: "Valid business email is required" });
    if (!data.businessPhone || data.businessPhone.trim().length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["businessPhone"], message: "Business phone is required" });
    if (!data.businessStreetAddress || data.businessStreetAddress.trim().length < 5) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["businessStreetAddress"], message: "Street address is required" });
    if (!data.businessCity || data.businessCity.trim().length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["businessCity"], message: "City is required" });
    if (!data.businessCountry || data.businessCountry.trim().length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["businessCountry"], message: "Country is required" });
    if (!data.businessTimeZone || data.businessTimeZone.trim().length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["businessTimeZone"], message: "Time zone is required" });
    if (!data.businessType || data.businessType.trim().length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["businessType"], message: "Business type is required" });
    if (!data.industry || data.industry.trim().length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["industry"], message: "Industry is required" });

    // Check phone format
    if (data.country && data.phone) {
      const selectedCountry = COUNTRIES.find((c) => c.code === data.country);
      if (selectedCountry && !selectedCountry.phoneFormat.test(data.phone.replace(/\D/g, ''))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: `Invalid phone format for ${selectedCountry.name}` });
      }
    }
    
    // Check registration
    if (!data.isNotRegistered && (!data.registrationIdType || data.registrationIdType.trim().length === 0)) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["registrationIdType"], message: "Registration type is required" });
    }
    if (!data.isNotRegistered && (!data.registrationNumber || data.registrationNumber.trim().length === 0)) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["registrationNumber"], message: "Registration number is required" });
    }

  } else {
    // Existing CRM
    if (!data.repFirstName || data.repFirstName.trim().length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["repFirstName"], message: "First name is required" });
    if (!data.repLastName || data.repLastName.trim().length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["repLastName"], message: "Last name is required" });
    if (!data.repEmail || !/^\S+@\S+\.\S+$/.test(data.repEmail)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["repEmail"], message: "Valid email is required" });
    if (!data.repJobPosition || data.repJobPosition.trim().length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["repJobPosition"], message: "Job position is required" });
    if (!data.repPhone || data.repPhone.trim().length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["repPhone"], message: "Phone number is required" });
  }
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
