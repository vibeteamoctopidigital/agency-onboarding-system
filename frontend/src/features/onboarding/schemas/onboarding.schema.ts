import { z } from "zod";
import { COUNTRIES } from "../data/countries";

export const onboardingSchema = z.object({
  // Personal
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  personalEmail: z.string().email("Please enter a valid email address"),
  phone: z.string().min(1, "Phone number is required"),
  country: z.string().min(2, "Country is required"),
  city: z.string().min(2, "City is required"),
  personalAddress: z.string().min(5, "Address is required"),
  passportNo: z.string().min(5, "Passport number is required"),
  nationalIdNo: z.string().min(1, "National ID is required"),

  // Business
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  companyBrief: z.string().min(10, "Please provide a brief summary of the company"),
  businessEmail: z.string().email("Please enter a valid business email address"),
  industry: z.string().min(2, "Industry is required"),
  customIndustry: z.string().optional(),
  employeeCount: z.string().min(1, "Please select company size"),
  businessAddress: z.string().min(5, "Please enter your full business address"),
  linkedInUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  socialLinks: z.string().optional(),

  // Details
  problemDetails: z.string().min(20, "Please provide more details about the problem (at least 20 characters)"),
  currentTools: z.string().optional(),
  primaryGoal: z.string().min(10, "Please describe your primary goal (at least 10 characters)"),
  media: z.array(z.any()).optional(),

  agreedToTerms: z.literal(true, {
    message: "You must agree to the terms and conditions",
  }),
}).superRefine((data, ctx) => {
  if (data.country) {
    const selectedCountry = COUNTRIES.find((c) => c.code === data.country);
    
    if (selectedCountry) {
      // Validate phone based on country's format
      if (!selectedCountry.phoneFormat.test(data.phone.replace(/\D/g, ''))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: `Invalid phone format for ${selectedCountry.name}`,
        });
      }

      // Validate National ID based on country's format
      if (!selectedCountry.idFormat.test(data.nationalIdNo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nationalIdNo"],
          message: `Invalid National ID format for ${selectedCountry.name}`,
        });
      }
    }
  }

  // Validate custom industry if "Other" is selected
  if (data.industry === "Other" && (!data.customIndustry || data.customIndustry.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customIndustry"],
      message: "Please specify your industry (at least 2 characters)",
    });
  }
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
