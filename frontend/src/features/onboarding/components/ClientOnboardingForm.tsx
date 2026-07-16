"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { onboardingSchema, type OnboardingFormData } from "../schemas/onboarding.schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCombobox } from "./CountryCombobox";
import { CityCombobox } from "./CityCombobox";
import { IndustryCombobox } from "./IndustryCombobox";
import { COUNTRIES } from "../data/countries";

const STEPS = [
  { id: 1, title: "PERSONAL INFORMATIONS" },
  { id: 2, title: "BUSINESS INFORMATIONS " },
  { id: 3, title: "PROBLEMS DETAILS" },
  { id: 4, title: "REVIEW & SUBMIT" },
];

export function ClientOnboardingForm() {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [mediaFiles, setMediaFiles] = React.useState<File[]>([]);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    control,
    setFocus,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
  });

  const formValues = watch();
  const selectedCountryCode = watch("country");
  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountryCode);
  const selectedIndustry = watch("industry");

  // Auto-focus management on step change
  React.useEffect(() => {
    setTimeout(() => {
      if (currentStep === 1) setFocus("firstName");
      if (currentStep === 2) setFocus("companyName");
      if (currentStep === 3) setFocus("problemDetails");
    }, 100);
  }, [currentStep, setFocus]);

  // Handle clearing city when country changes
  React.useEffect(() => {
    if (selectedCountryCode && formValues.city) {
      setValue("city", "", { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountryCode, setValue]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof OnboardingFormData)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = [
        "firstName", "lastName", "personalEmail", "phone", 
        "country", "city", "identity", "personalAddress", "passportNo", "nationalIdNo"
      ];
    } else if (currentStep === 2) {
      fieldsToValidate = [
        "companyName", "website", "companyBrief", "businessEmail", 
        "industry", "customIndustry", "employeeCount", "businessAddress", 
        "linkedInUrl", "socialLinks"
      ];
    } else if (currentStep === 3) {
      fieldsToValidate = ["problemDetails", "currentTools", "primaryGoal"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    } else {
      const firstErrorField = fieldsToValidate.find(field => errors[field]);
      if (firstErrorField) {
        const el = document.getElementsByName(firstErrorField)[0];
        if (el) el.focus();
      }
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = (data: OnboardingFormData) => {
    const payload = {
      ...data,
      media: mediaFiles,
    };
    console.log("🚀 READY TO SEND TO BACKEND:", JSON.stringify(payload, null, 2));
    console.log("Media Files attached:", mediaFiles.map(f => f.name));
    alert("Form submitted! Check the console for the payload.");
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Stepper Header */}
      <div className="mb-12 flex justify-between gap-6">
        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isActive = isCurrent || isCompleted;

          return (
             <div key={step.id} className="flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-4 pl-1">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm transition-colors border-[1.5px] 
                    ${isCompleted ? "bg-[#0f172a] text-white border-[#0f172a]" : 
                      isCurrent ? "border-[#0f172a] text-[#0f172a] bg-white" : 
                      "border-gray-300 text-gray-400 bg-white"}`}
                >
                  {isCompleted ? <Check className="w-5 h-5" strokeWidth={2.5} /> : `0${step.id}`}
                </div>
                <span className={`text-[12px] font-bold tracking-wider ${isActive ? "text-[#0f172a]" : "text-gray-400"}`}>
                  {step.title}
                </span>
              </div>
              <div className={`h-[4px] w-full rounded-full transition-colors duration-300 ${isActive ? "bg-[#0f172a]" : "bg-gray-200"}`} />
            </div>
          );
        })}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {currentStep === 1 && "Personal Information"}
          {currentStep === 2 && "Business Information"}
          {currentStep === 3 && "Problem Details & Objectives"}
          {currentStep === 4 && "Review & Complete"}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {currentStep === 1 && "Please provide your personal contact details and identity information."}
          {currentStep === 2 && "Tell us about your company and industry."}
          {currentStep === 3 && "Describe the challenges you're facing and your goals."}
          {currentStep === 4 && "Please review your information before submitting."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* STEP 1: PERSONAL */}
        <div className={currentStep === 1 ? "block" : "hidden"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register("firstName")} placeholder="John" className={errors.firstName ? "border-red-500" : ""} />
              {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register("lastName")} placeholder="Doe" className={errors.lastName ? "border-red-500" : ""} />
              {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="personalEmail">Personal Email *</Label>
              <Input id="personalEmail" type="email" {...register("personalEmail")} placeholder="john@example.com" className={errors.personalEmail ? "border-red-500" : ""} />
              {errors.personalEmail && <p className="text-red-500 text-xs">{errors.personalEmail.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="identity">Identity / Nationality *</Label>
              <Input id="identity" {...register("identity")} placeholder="e.g. American" className={errors.identity ? "border-red-500" : ""} />
              {errors.identity && <p className="text-red-500 text-xs">{errors.identity.message}</p>}
            </div>
            
            {/* Country and City MOVED TO STEP 1 */}
            <div className="space-y-2">
              <Label>Country *</Label>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <CountryCombobox 
                    value={field.value || ""} 
                    onChange={field.onChange} 
                    error={!!errors.country} 
                  />
                )}
              />
              {errors.country && <p className="text-red-500 text-xs">{errors.country.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Controller
                control={control}
                name="city"
                render={({ field }) => (
                  <CityCombobox 
                    countryCode={selectedCountryCode || ""}
                    value={field.value || ""} 
                    onChange={field.onChange} 
                    error={!!errors.city} 
                  />
                )}
              />
              {errors.city && <p className="text-red-500 text-xs">{errors.city.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2 ">
         <div className="flex w-full space-x-6">
              <div className="w-full">
               <Label htmlFor="personalAddress">Personal Address *</Label>
              <Input id="personalAddress" {...register("personalAddress")} placeholder="123 Main St, Apt 4B" className={errors.personalAddress ? "border-red-500" : ""} />
              {errors.personalAddress && <p className="text-red-500 text-xs">{errors.personalAddress.message}</p>}
             </div>
 <div className="w-full">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input 
                id="phone" 
                type="tel" 
                {...register("phone")} 
                placeholder={selectedCountryData ? `${selectedCountryData.dialCode} ` : "+1 (555) 000-0000"} 
                className={errors.phone ? "border-red-500" : ""} 
              />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
            </div>
         </div>
            </div>

           

            <div className="space-y-2">
              <Label htmlFor="nationalIdNo">National ID Number *</Label>
              <Input id="nationalIdNo" {...register("nationalIdNo")} placeholder="Enter National ID" className={errors.nationalIdNo ? "border-red-500" : ""} />
              {errors.nationalIdNo && <p className="text-red-500 text-xs">{errors.nationalIdNo.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="passportNo">Passport Number *</Label>
              <Input id="passportNo" {...register("passportNo")} placeholder="Enter passport number" className={errors.passportNo ? "border-red-500" : ""} />
              {errors.passportNo && <p className="text-red-500 text-xs">{errors.passportNo.message}</p>}
            </div>
          </div>
        </div>

        {/* STEP 2: BUSINESS */}
        <div className={currentStep === 2 ? "block" : "hidden"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input id="companyName" {...register("companyName")} placeholder="Acme Corp" className={errors.companyName ? "border-red-500" : ""} />
              {errors.companyName && <p className="text-red-500 text-xs">{errors.companyName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessEmail">Business Email *</Label>
              <Input id="businessEmail" type="email" {...register("businessEmail")} placeholder="hello@acme.com" className={errors.businessEmail ? "border-red-500" : ""} />
              {errors.businessEmail && <p className="text-red-500 text-xs">{errors.businessEmail.message}</p>}
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyBrief">Company Brief / Summary *</Label>
              <textarea 
                id="companyBrief" 
                {...register("companyBrief")} 
                placeholder="Briefly describe what your company does..." 
                className={`flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-y ${errors.companyBrief ? "border-red-500" : "border-input"}`} 
              />
              {errors.companyBrief && <p className="text-red-500 text-xs">{errors.companyBrief.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Industry *</Label>
              <Controller
                control={control}
                name="industry"
                render={({ field }) => (
                  <IndustryCombobox 
                    value={field.value || ""} 
                    onChange={field.onChange} 
                    error={!!errors.industry} 
                  />
                )}
              />
              {errors.industry && <p className="text-red-500 text-xs">{errors.industry.message}</p>}
            </div>

            {selectedIndustry === "Other" ? (
              <div className="space-y-2">
                <Label htmlFor="customIndustry">Please Specify Industry *</Label>
                <Input 
                  id="customIndustry" 
                  {...register("customIndustry")} 
                  placeholder="e.g. Space Exploration" 
                  className={errors.customIndustry ? "border-red-500" : ""} 
                />
                {errors.customIndustry && <p className="text-red-500 text-xs">{errors.customIndustry.message}</p>}
              </div>
            ) : (
              <div className="hidden md:block"></div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="employeeCount">Number of Employees *</Label>
              <Controller
                control={control}
                name="employeeCount"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className={errors.employeeCount ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select company size..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.employeeCount && <p className="text-red-500 text-xs">{errors.employeeCount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website URL (Optional)</Label>
              <Input id="website" type="url" {...register("website")} placeholder="https://acme.com" className={errors.website ? "border-red-500" : ""} />
              {errors.website && <p className="text-red-500 text-xs">{errors.website.message}</p>}
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessAddress">Business Address *</Label>
              <Input id="businessAddress" {...register("businessAddress")} placeholder="456 Corporate Blvd" className={errors.businessAddress ? "border-red-500" : ""} />
              {errors.businessAddress && <p className="text-red-500 text-xs">{errors.businessAddress.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedInUrl">LinkedIn Profile URL (Optional)</Label>
              <Input id="linkedInUrl" type="url" {...register("linkedInUrl")} placeholder="https://linkedin.com/company/acme" className={errors.linkedInUrl ? "border-red-500" : ""} />
              {errors.linkedInUrl && <p className="text-red-500 text-xs">{errors.linkedInUrl.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="socialLinks">Other Social Links (Optional)</Label>
              <Input id="socialLinks" {...register("socialLinks")} placeholder="Twitter, Instagram, etc." className={errors.socialLinks ? "border-red-500" : ""} />
              {errors.socialLinks && <p className="text-red-500 text-xs">{errors.socialLinks.message}</p>}
            </div>
          </div>
        </div>

        {/* STEP 3: DETAILS & MEDIA */}
        <div className={currentStep === 3 ? "block" : "hidden"}>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="problemDetails">What kind of problem are you facing? *</Label>
              <textarea 
                id="problemDetails" 
                {...register("problemDetails")} 
                placeholder="Please describe your current challenges and workflows in detail..." 
                className={`flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[120px] resize-y ${errors.problemDetails ? "border-red-500" : "border-input"}`} 
              />
              {errors.problemDetails && <p className="text-red-500 text-xs">{errors.problemDetails.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="primaryGoal">Primary Goal / Objective *</Label>
              <textarea 
                id="primaryGoal" 
                {...register("primaryGoal")} 
                placeholder="What is your main objective for seeking our services?" 
                className={`flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-y ${errors.primaryGoal ? "border-red-500" : "border-input"}`} 
              />
              {errors.primaryGoal && <p className="text-red-500 text-xs">{errors.primaryGoal.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentTools">Current Tools & Software Used (Optional)</Label>
              <Input id="currentTools" {...register("currentTools")} placeholder="e.g. HubSpot, Salesforce, Zapier, ClickFunnels" className={errors.currentTools ? "border-red-500" : ""} />
              {errors.currentTools && <p className="text-red-500 text-xs">{errors.currentTools.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Attach Media / Documents (Optional)</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  multiple 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files) {
                      setMediaFiles(Array.from(e.target.files));
                    }
                  }}
                />
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">Click to upload</span> or drag and drop<br/>
                  SVG, PNG, JPG, PDF or MP4 (max. 10MB)
                </div>
              </div>
              {mediaFiles.length > 0 && (
                <ul className="mt-3 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {mediaFiles.map((file, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 shrink-0" /> 
                      <span className="truncate">{file.name}</span> 
                      <span className="text-gray-400 shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* STEP 4: REVIEW */}
        {currentStep === 4 && (
          <div className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-xl space-y-6 border border-gray-100">
              
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
                  Personal & Location Info
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-gray-500">Name</div>
                  <div className="font-medium text-gray-900">{formValues.firstName} {formValues.lastName}</div>
                  <div className="text-gray-500">Email</div>
                  <div className="font-medium text-gray-900">{formValues.personalEmail}</div>
                  <div className="text-gray-500">Phone</div>
                  <div className="font-medium text-gray-900">{formValues.phone}</div>
                  <div className="text-gray-500">Location</div>
                  <div className="font-medium text-gray-900">{formValues.city}, {formValues.country}</div>
                  <div className="text-gray-500">Address</div>
                  <div className="font-medium text-gray-900">{formValues.personalAddress}</div>
                  <div className="text-gray-500">Identity</div>
                  <div className="font-medium text-gray-900">{formValues.identity}</div>
                  <div className="text-gray-500">Passport No</div>
                  <div className="font-medium text-gray-900">{formValues.passportNo}</div>
                  <div className="text-gray-500">National ID</div>
                  <div className="font-medium text-gray-900">{formValues.nationalIdNo}</div>
                </div>
              </div>
              
              <div className="h-px bg-gray-200" />
              
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span>
                  Business Information
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-gray-500">Company Name</div>
                  <div className="font-medium text-gray-900">{formValues.companyName}</div>
                  <div className="text-gray-500">Business Email</div>
                  <div className="font-medium text-gray-900">{formValues.businessEmail}</div>
                  <div className="text-gray-500">Industry</div>
                  <div className="font-medium text-gray-900">
                    {formValues.industry === "Other" ? formValues.customIndustry : formValues.industry}
                  </div>
                  <div className="text-gray-500">Company Size</div>
                  <div className="font-medium text-gray-900">{formValues.employeeCount}</div>
                  <div className="text-gray-500">Business Address</div>
                  <div className="font-medium text-gray-900">{formValues.businessAddress}</div>
                  <div className="text-gray-500">Website</div>
                  <div className="font-medium text-gray-900">{formValues.website || "N/A"}</div>
                  <div className="text-gray-500">LinkedIn</div>
                  <div className="font-medium text-gray-900">{formValues.linkedInUrl || "N/A"}</div>
                  <div className="text-gray-500">Social Links</div>
                  <div className="font-medium text-gray-900">{formValues.socialLinks || "N/A"}</div>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Company Brief</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    {formValues.companyBrief}
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-200" />
              
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">3</span>
                  Problem Details & Goals
                </h3>
                
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Problem Description</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    {formValues.problemDetails}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Primary Goal</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    {formValues.primaryGoal}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 text-sm mb-4">
                  <div className="text-gray-500">Current Tools</div>
                  <div className="font-medium text-gray-900">{formValues.currentTools || "N/A"}</div>
                </div>

                {mediaFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attached Files</div>
                    <ul className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                      {mediaFiles.map((f, i) => (
                        <li key={i} className="px-3 py-2 text-sm text-gray-700 flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </div>
                          <span className="text-gray-400 text-xs shrink-0 ml-4">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

            </div>

            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={formValues.agreedToTerms === true}
                  onCheckedChange={(checked) => setValue("agreedToTerms", (checked === true) as any, { shouldValidate: true })}
                />
                <Label htmlFor="terms" className="text-sm font-normal">
                  I agree to the <a href="#" className="text-blue-600 hover:underline">Terms & Conditions</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
                </Label>
              </div>
              {errors.agreedToTerms && <p className="text-red-500 text-xs">{errors.agreedToTerms.message}</p>}
            </div>

          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 1}
            className="w-28 shadow-sm"
          >
            Back
          </Button>
          
          {currentStep < STEPS.length ? (
            <Button type="button" onClick={handleNext} className="w-36 bg-[#0f172a] hover:bg-slate-800 text-white shadow-sm">
              Continue &rarr;
            </Button>
          ) : (
            <Button type="submit" className="w-36 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              Submit Request
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
