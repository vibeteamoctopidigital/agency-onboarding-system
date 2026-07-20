"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Building2, UserCircle2 } from "lucide-react";
import axiosInstance from "@/lib/axios";
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
import { useAuth } from "@/hooks/auth/useAuth";

export function ClientOnboardingForm() {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [mediaFiles, setMediaFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(3);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { adoptSession } = useAuth();

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
  const crmStatus = formValues.crmStatus;
  const selectedCountryCode = watch("country");
  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountryCode);
  const selectedIndustry = watch("industry");

  const STEPS = React.useMemo(() => {
    if (!crmStatus) return [{ id: 1, title: "ACCOUNT SETUP" }];
    if (crmStatus === "existing") {
      return [
        { id: 1, title: "ACCOUNT SETUP" },
        { id: 2, title: "AUTHORIZED REP." },
        { id: 3, title: "PROBLEMS DETAILS" },
        { id: 4, title: "REVIEW & SUBMIT" },
      ];
    }
    return [
      { id: 1, title: "ACCOUNT SETUP" },
      { id: 2, title: "PERSONAL INFO" },
      { id: 3, title: "BUSINESS INFO" },
      { id: 4, title: "PROBLEMS DETAILS" },
      { id: 5, title: "REVIEW & SUBMIT" },
    ];
  }, [crmStatus]);

  // Auto-focus management on step change
  React.useEffect(() => {
    setTimeout(() => {
      if (currentStep === 2 && crmStatus === "new") setFocus("firstName");
      if (currentStep === 2 && crmStatus === "existing") setFocus("repFirstName");
      if (currentStep === 3 && crmStatus === "new") setFocus("friendlyBusinessName");
    }, 100);
  }, [currentStep, crmStatus, setFocus]);

  // Handle clearing city when country changes
  React.useEffect(() => {
    if (selectedCountryCode && formValues.city) {
      setValue("city", "", { shouldValidate: true });
    }
  }, [selectedCountryCode, setValue]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof OnboardingFormData)[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ["crmStatus"];
    } else if (crmStatus === "new") {
      if (currentStep === 2) {
        fieldsToValidate = ["firstName", "lastName", "personalEmail", "phone", "country", "city", "personalAddress"];
      } else if (currentStep === 3) {
        fieldsToValidate = [
          "friendlyBusinessName", "legalBusinessName", "businessEmail", "businessPhone",
          "businessStreetAddress", "businessCity", "businessCountry", "businessTimeZone",
          "businessType", "industry", "customIndustry", "registrationIdType", "registrationNumber"
        ];
      } else if (currentStep === 4) {
        fieldsToValidate = ["problemDetails", "currentTools", "primaryGoal"];
      }
    } else if (crmStatus === "existing") {
      if (currentStep === 2) {
        fieldsToValidate = ["repFirstName", "repLastName", "repEmail", "repJobPosition", "repPhone"];
      } else if (currentStep === 3) {
        fieldsToValidate = ["problemDetails", "currentTools", "primaryGoal"];
      }
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

  const onSubmit = async (data: OnboardingFormData) => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => formData.append(key, String(v)));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      mediaFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await axiosInstance.post("/onboarding/client", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data;
      
      if (result.data?.accessToken && result.data?.user) {
        adoptSession(result.data.user, result.data.accessToken, result.data.refreshToken);
      }

      setIsPending(true);
      
      let currentCount = 3;
      const interval = setInterval(() => {
        currentCount -= 1;
        setCountdown(currentCount);
        if (currentCount <= 0) {
          clearInterval(interval);
          const returnTo = searchParams.get("returnTo") || searchParams.get("redirect");
          if (returnTo) {
            window.location.href = returnTo;
          } else {
            window.location.href = "/client/dashboard";
          }
        }
      }, 1000);

    } catch (error: any) {
      console.error("Submission error:", error);
      alert(error?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onErrors = (errors: any) => {
    console.error("Validation Errors:", errors);
  };

  if (isPending) {
    return (
      <div className="w-full max-w-xl mx-auto p-12 bg-white rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center space-y-6">
        <Loader2 className="w-12 h-12 text-[#0f172a] animate-spin" />
        <h2 className="text-2xl font-bold text-gray-900">Processing Your Request</h2>
        <p className="text-gray-500">
          We are setting up your account. You will be redirected automatically in <strong className="text-gray-900 text-xl">{countdown}</strong> seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
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
          {currentStep === 1 && "Account Setup"}
          {crmStatus === "new" && currentStep === 2 && "Personal Information"}
          {crmStatus === "new" && currentStep === 3 && "Business Profile Settings"}
          {crmStatus === "existing" && currentStep === 2 && "Authorized Representative"}
          {(crmStatus === "new" ? currentStep === 4 : currentStep === 3) && "Problem Details & Objectives"}
          {(crmStatus === "new" ? currentStep === 5 : currentStep === 4) && "Review & Complete"}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onErrors)} className="space-y-6">
        
        {/* STEP 1: CRM Selection */}
        <div className={currentStep === 1 ? "block" : "hidden"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <label 
              className={`relative flex cursor-pointer rounded-2xl border p-6 shadow-sm hover:bg-gray-50 transition-all ${crmStatus === "new" ? "border-blue-600 ring-1 ring-blue-600 bg-blue-50/50" : "border-gray-200"}`}
            >
              <input type="radio" value="new" {...register("crmStatus")} className="sr-only" />
              <div className="flex flex-col items-center text-center w-full space-y-4">
                <div className={`p-4 rounded-full ${crmStatus === "new" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${crmStatus === "new" ? "text-blue-900" : "text-gray-900"}`}>New CRM Account</h3>
                  <p className="mt-2 text-sm text-gray-500">I need a new GoHighLevel account created and set up for my business.</p>
                </div>
              </div>
              {crmStatus === "new" && <Check className="absolute top-4 right-4 w-5 h-5 text-blue-600" />}
            </label>

            <label 
              className={`relative flex cursor-pointer rounded-2xl border p-6 shadow-sm hover:bg-gray-50 transition-all ${crmStatus === "existing" ? "border-blue-600 ring-1 ring-blue-600 bg-blue-50/50" : "border-gray-200"}`}
            >
              <input type="radio" value="existing" {...register("crmStatus")} className="sr-only" />
              <div className="flex flex-col items-center text-center w-full space-y-4">
                <div className={`p-4 rounded-full ${crmStatus === "existing" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                  <UserCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${crmStatus === "existing" ? "text-blue-900" : "text-gray-900"}`}>Existing CRM Account</h3>
                  <p className="mt-2 text-sm text-gray-500">I already have a CRM account and want to link it with the agency.</p>
                </div>
              </div>
              {crmStatus === "existing" && <Check className="absolute top-4 right-4 w-5 h-5 text-blue-600" />}
            </label>
          </div>
          {errors.crmStatus && <p className="text-red-500 text-sm mt-4 text-center">Please select an option to continue.</p>}
        </div>

        {/* STEP 2 (NEW CRM): PERSONAL */}
        <div className={currentStep === 2 && crmStatus === "new" ? "block" : "hidden"}>
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

            <div className="space-y-2">
              <Label>Country *</Label>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <CountryCombobox value={field.value || ""} onChange={field.onChange} error={!!errors.country} />
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
                  <CityCombobox countryCode={selectedCountryCode || ""} value={field.value || ""} onChange={field.onChange} error={!!errors.city} />
                )}
              />
              {errors.city && <p className="text-red-500 text-xs">{errors.city.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="personalAddress">Personal Address *</Label>
              <Input id="personalAddress" {...register("personalAddress")} placeholder="123 Main St, Apt 4B" className={errors.personalAddress ? "border-red-500" : ""} />
              {errors.personalAddress && <p className="text-red-500 text-xs">{errors.personalAddress.message}</p>}
            </div>
          </div>
        </div>

        {/* STEP 2 (EXISTING CRM): AUTHORIZED REP */}
        <div className={currentStep === 2 && crmStatus === "existing" ? "block" : "hidden"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="repFirstName">First Name *</Label>
              <Input id="repFirstName" {...register("repFirstName")} placeholder="John" className={errors.repFirstName ? "border-red-500" : ""} />
              {errors.repFirstName && <p className="text-red-500 text-xs">{errors.repFirstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="repLastName">Last Name *</Label>
              <Input id="repLastName" {...register("repLastName")} placeholder="Doe" className={errors.repLastName ? "border-red-500" : ""} />
              {errors.repLastName && <p className="text-red-500 text-xs">{errors.repLastName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="repEmail">Representative Email *</Label>
              <Input id="repEmail" type="email" {...register("repEmail")} placeholder="john@example.com" className={errors.repEmail ? "border-red-500" : ""} />
              {errors.repEmail && <p className="text-red-500 text-xs">{errors.repEmail.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="repJobPosition">Job Position *</Label>
              <Select onValueChange={(val) => setValue("repJobPosition", val)} defaultValue={formValues.repJobPosition}>
                <SelectTrigger className={errors.repJobPosition ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select Job Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.repJobPosition && <p className="text-red-500 text-xs">{errors.repJobPosition.message}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="repPhone">Phone Number (With Country Code) *</Label>
              <Input id="repPhone" type="tel" {...register("repPhone")} placeholder="+1 555 123 4567" className={errors.repPhone ? "border-red-500" : ""} />
              {errors.repPhone && <p className="text-red-500 text-xs">{errors.repPhone.message}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="repEinTin">EIN / TIN Number <span className="text-gray-400 font-normal">(Optional)</span></Label>
              <Input id="repEinTin" {...register("repEinTin")} placeholder="e.g. 12-3456789" className={errors.repEinTin ? "border-red-500" : ""} />
              {errors.repEinTin && <p className="text-red-500 text-xs">{errors.repEinTin.message}</p>}
            </div>
          </div>
        </div>

        {/* STEP 3 (NEW CRM): BUSINESS INFO */}
        <div className={currentStep === 3 && crmStatus === "new" ? "block" : "hidden"}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            
            <div className="space-y-8">
              {/* General Information */}
              <div className="border border-gray-200 p-6 rounded-xl space-y-6">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">General Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Business Logo (Upload max 2.5 MB)</Label>
                    <Input type="file" onChange={(e) => {
                      if (e.target.files) setMediaFiles(Array.from(e.target.files));
                    }} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="friendlyBusinessName">Friendly Business Name *</Label>
                    <Input id="friendlyBusinessName" {...register("friendlyBusinessName")} placeholder="ODL Automation" className={errors.friendlyBusinessName ? "border-red-500" : ""} />
                    {errors.friendlyBusinessName && <p className="text-red-500 text-xs">{errors.friendlyBusinessName.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="legalBusinessName">Legal Business Name *</Label>
                    <Input id="legalBusinessName" {...register("legalBusinessName")} placeholder="ODL Automation LLC" className={errors.legalBusinessName ? "border-red-500" : ""} />
                    {errors.legalBusinessName && <p className="text-red-500 text-xs">{errors.legalBusinessName.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="businessEmail">Business Email *</Label>
                    <Input id="businessEmail" type="email" {...register("businessEmail")} placeholder="hello@company.com" className={errors.businessEmail ? "border-red-500" : ""} />
                    {errors.businessEmail && <p className="text-red-500 text-xs">{errors.businessEmail.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="businessPhone">Business Phone *</Label>
                    <Input id="businessPhone" type="tel" {...register("businessPhone")} placeholder="+1 555..." className={errors.businessPhone ? "border-red-500" : ""} />
                    {errors.businessPhone && <p className="text-red-500 text-xs">{errors.businessPhone.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brandedDomain">Branded Domain</Label>
                    <Input id="brandedDomain" {...register("brandedDomain")} placeholder="app.company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Business Website</Label>
                    <Input id="website" type="url" {...register("website")} placeholder="https://company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessNiche">Business Niche</Label>
                    <Input id="businessNiche" {...register("businessNiche")} placeholder="Automation Company" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessCurrency">Business Currency</Label>
                    <Select onValueChange={(val) => setValue("businessCurrency", val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose one..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
            

              {/* Business Information */}
              <div className="border border-gray-200 p-6 rounded-xl space-y-6">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="businessType">Business Type *</Label>
                    <Select onValueChange={(val) => setValue("businessType", val)}>
                      <SelectTrigger className={errors.businessType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Pick Business Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LLC">LLC</SelectItem>
                        <SelectItem value="Corporation">Corporation</SelectItem>
                        <SelectItem value="SoleProprietorship">Sole Proprietorship</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.businessType && <p className="text-red-500 text-xs">{errors.businessType.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Business Industry *</Label>
                    <Controller
                      control={control}
                      name="industry"
                      render={({ field }) => (
                        <IndustryCombobox value={field.value || ""} onChange={field.onChange} error={!!errors.industry} />
                      )}
                    />
                    {errors.industry && <p className="text-red-500 text-xs">{errors.industry.message}</p>}
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="registrationIdType">Business Registration ID Type *</Label>
                    <Select onValueChange={(val) => setValue("registrationIdType", val)}>
                      <SelectTrigger className={errors.registrationIdType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Pick Business Registration ID Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EIN">EIN</SelectItem>
                        <SelectItem value="SSN">SSN</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.registrationIdType && <p className="text-red-500 text-xs">{errors.registrationIdType.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="registrationNumber">Business Registration Number *</Label>
                    <Input id="registrationNumber" {...register("registrationNumber")} placeholder="Business Registration Number" className={errors.registrationNumber ? "border-red-500" : ""} />
                    {errors.registrationNumber && <p className="text-red-500 text-xs">{errors.registrationNumber.message}</p>}
                    
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox id="isNotRegistered" onCheckedChange={(checked) => setValue("isNotRegistered", !!checked)} />
                      <Label htmlFor="isNotRegistered" className="text-sm font-normal text-gray-500">My business is Not registered</Label>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Business Regions of Operations</Label>
                    <div className="space-y-2 mt-2">
                      {["Africa", "Asia", "Europe", "Latin America", "USA and Canada"].map((region) => (
                        <div key={region} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`region-${region}`} 
                            onCheckedChange={(checked) => {
                              const current = formValues.regionsOfOperations || [];
                              if (checked) {
                                setValue("regionsOfOperations", [...current, region]);
                              } else {
                                setValue("regionsOfOperations", current.filter(r => r !== region));
                              }
                            }}
                          />
                          <Label htmlFor={`region-${region}`} className="text-sm font-normal">{region}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Business Physical Address */}
              <div className="border border-gray-200 p-6 rounded-xl space-y-6 w-full ">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Business Physical Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="businessStreetAddress">Street Address *</Label>
                    <Input id="businessStreetAddress" {...register("businessStreetAddress")} placeholder="123 Corporate Blvd" className={errors.businessStreetAddress ? "border-red-500" : ""} />
                    {errors.businessStreetAddress && <p className="text-red-500 text-xs">{errors.businessStreetAddress.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessCity">City *</Label>
                    <Input id="businessCity" {...register("businessCity")} placeholder="New York" className={errors.businessCity ? "border-red-500" : ""} />
                    {errors.businessCity && <p className="text-red-500 text-xs">{errors.businessCity.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessPostalCode">Postal/Zip Code</Label>
                    <Input id="businessPostalCode" {...register("businessPostalCode")} placeholder="10001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessStateRegion">State / Prov / Region</Label>
                    <Input id="businessStateRegion" {...register("businessStateRegion")} placeholder="NY" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessCountry">Country *</Label>
                    <Input id="businessCountry" {...register("businessCountry")} placeholder="United States" className={errors.businessCountry ? "border-red-500" : ""} />
                    {errors.businessCountry && <p className="text-red-500 text-xs">{errors.businessCountry.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="businessTimeZone">Time Zone *</Label>
                    <Input id="businessTimeZone" {...register("businessTimeZone")} placeholder="GMT-05:00 Eastern Time" className={errors.businessTimeZone ? "border-red-500" : ""} />
                    {errors.businessTimeZone && <p className="text-red-500 text-xs">{errors.businessTimeZone.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platformLanguage">Platform Language</Label>
                    <Select onValueChange={(val) => setValue("platformLanguage", val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="English (United States)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (United States)</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outboundLanguage">Outbound communication language</Label>
                    <Input id="outboundLanguage" {...register("outboundLanguage")} placeholder="English" />
                  </div>
                </div>
              </div>
            
          </div>
        </div>

        {/* DETAILS & MEDIA (Step 4 for New, Step 3 for Existing) */}
        <div className={(crmStatus === "new" && currentStep === 4) || (crmStatus === "existing" && currentStep === 3) ? "block" : "hidden"}>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="problemDetails">What is your biggest pain point or problems? *</Label>
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
              <Select onValueChange={(val) => setValue("currentTools", val)} defaultValue={formValues.currentTools}>
                <SelectTrigger className={errors.currentTools ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select current tools used..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GoHighLevel">GoHighLevel</SelectItem>
                  <SelectItem value="HubSpot">HubSpot</SelectItem>
                  <SelectItem value="Salesforce">Salesforce</SelectItem>
                  <SelectItem value="ClickFunnels">ClickFunnels</SelectItem>
                  <SelectItem value="Zapier">Zapier</SelectItem>
                  <SelectItem value="n&n">n&n</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
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

        {/* REVIEW (Step 5 for New, Step 4 for Existing) */}
        {((crmStatus === "new" && currentStep === 5) || (crmStatus === "existing" && currentStep === 4)) && (
          <div className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-xl space-y-6 border border-gray-100">
              
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
                  {crmStatus === "new" ? "Personal & Business Info" : "Authorized Representative Info"}
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {crmStatus === "new" ? (
                    <>
                      <div className="text-gray-500">Name</div>
                      <div className="font-medium text-gray-900">{formValues.firstName} {formValues.lastName}</div>
                      <div className="text-gray-500">Email</div>
                      <div className="font-medium text-gray-900">{formValues.personalEmail}</div>
                      <div className="text-gray-500">Business</div>
                      <div className="font-medium text-gray-900">{formValues.friendlyBusinessName}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-500">Representative Name</div>
                      <div className="font-medium text-gray-900">{formValues.repFirstName} {formValues.repLastName}</div>
                      <div className="text-gray-500">Job Position</div>
                      <div className="font-medium text-gray-900">{formValues.repJobPosition}</div>
                      <div className="text-gray-500">Email</div>
                      <div className="font-medium text-gray-900">{formValues.repEmail}</div>
                      <div className="text-gray-500">Phone</div>
                      <div className="font-medium text-gray-900">{formValues.repPhone}</div>
                      {formValues.repEinTin && (
                        <>
                          <div className="text-gray-500">EIN / TIN Number</div>
                          <div className="font-medium text-gray-900">{formValues.repEinTin}</div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="h-px bg-gray-200" />
              
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span>
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
          
          {!crmStatus ? (
            <Button type="button" disabled className="w-48 bg-gray-300 text-gray-500 shadow-sm cursor-not-allowed">
              Select Account Type
            </Button>
          ) : currentStep < STEPS.length ? (
            <Button type="button" onClick={handleNext} className="w-36 bg-[#0f172a] hover:bg-slate-800 text-white shadow-sm">
              Continue &rarr;
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="w-40 bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
