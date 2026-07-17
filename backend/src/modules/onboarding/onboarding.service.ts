import { prisma } from "../../utils/prisma";
import { badRequest } from "../../utils/appError";
import { logAudit } from "../../utils/audit";
import { signAccessToken, signRefreshToken, type JwtPayload } from "../../utils/jwt";
import { hashPassword } from "../../utils/password";
import { ghlClient } from "../../lib/ghl/ghl.client";
import { env } from "../../utils/envConfig";
import { storageService } from "../../lib/storage/storage.service";

export class OnboardingService {
  async onboardClient(data: any, files: Express.Multer.File[] = []) {
    // 1. Fetch the default agency (since this is a single-agency platform)
    const agency = await prisma.agency.findFirst();
    if (!agency) {
      throw badRequest("No agency configured in the system.");
    }

    const isNewInCrm = data.crmStatus === "new";
    const ghlLocationId = `pending_loc_${Math.random().toString(36).substring(7)}`;

    let personalInfos: any = {};
    let businessInfos: any = {};

    if (isNewInCrm) {
      personalInfos = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        country: data.country,
        city: data.city,
        personalAddress: data.personalAddress,
      };

      businessInfos = {
        friendlyBusinessName: data.friendlyBusinessName,
        legalBusinessName: data.legalBusinessName,
        businessEmail: data.businessEmail,
        businessPhone: data.businessPhone,
        brandedDomain: data.brandedDomain,
        website: data.website,
        businessNiche: data.businessNiche,
        businessCurrency: data.businessCurrency,
        businessStreetAddress: data.businessStreetAddress,
        businessCity: data.businessCity,
        businessPostalCode: data.businessPostalCode,
        businessStateRegion: data.businessStateRegion,
        businessCountry: data.businessCountry,
        businessTimeZone: data.businessTimeZone,
        platformLanguage: data.platformLanguage,
        outboundLanguage: data.outboundLanguage,
        businessType: data.businessType,
        industry: data.industry === "Other" ? data.customIndustry : data.industry,
        registrationIdType: data.registrationIdType,
        registrationNumber: data.registrationNumber,
        isNotRegistered: data.isNotRegistered,
        regionsOfOperations: data.regionsOfOperations,
      };
    } else {
      personalInfos = {
        repFirstName: data.repFirstName,
        repLastName: data.repLastName,
        repEmail: data.repEmail,
        repJobPosition: data.repJobPosition,
        repPhone: data.repPhone,
      };
    }

    const subAccountName = isNewInCrm 
      ? (data.friendlyBusinessName || data.legalBusinessName || "Pending Sub-Account") 
      : (data.repFirstName + " " + data.repLastName + " (Existing CRM)");
      
    const subAccountEmail = isNewInCrm ? (data.personalEmail || data.businessEmail) : data.repEmail;

    // Check if user already exists
    if (subAccountEmail) {
      const existingUser = await prisma.user.findFirst({
        where: { email: subAccountEmail, agencyId: agency.id }
      });
      if (existingUser) {
        throw badRequest(`An account with the email ${subAccountEmail} is already registered.`);
      }
    }

    // 4. Save to Database
    const subAccount = await prisma.subAccount.create({
      data: {
        agencyId: agency.id,
        ghlLocationId,
        name: subAccountName,
        contactEmail: subAccountEmail,
        businessEmail: isNewInCrm ? data.businessEmail : null,
        personalInfos,
        businessInfos,
        status: "PENDING", 
        isNewInCrm,
      },
    });

    // 5. Create the User with Default Password
    const defaultPassword = "ChangeMe123!";
    const userName = isNewInCrm ? `${data.firstName} ${data.lastName}` : `${data.repFirstName} ${data.repLastName}`;
    const firstInitial = isNewInCrm ? data.firstName?.[0] : data.repFirstName?.[0];
    const lastInitial = isNewInCrm ? data.lastName?.[0] : data.repLastName?.[0];
    const userInitials = `${firstInitial || ""}${lastInitial || ""}`.toUpperCase();

    const user = await prisma.user.create({
      data: {
        agencyId: agency.id,
        email: subAccountEmail, 
        name: userName,
        initials: userInitials,
        role: "SUB_ACCOUNT",
        passwordHash: defaultPassword, 
        tempPassword: true, 
      },
    });

    // Link user to subaccount
    await prisma.subAccount.update({
      where: { id: subAccount.id },
      data: { userId: user.id },
    });

    await logAudit({
      agencyId: agency.id,
      actorId: user.id,
      action: "CLIENT_ONBOARDED",
      entityType: "SubAccount",
      entityId: subAccount.id,
      details: `New client ${subAccountName} completed onboarding via form. Status is PENDING.`,
    });

    // 7. UPLOAD MEDIA TO GHL (if any files were attached)
    const uploadedMediaUrls: string[] = [];
    if (files.length > 0) {
      try {
        for (const file of files) {
          const stored = await storageService.upload(file.buffer, file.originalname, {
            agencyId: agency.id,
            uploaderName: user.name,
            uploaderRole: user.role,
          });
          uploadedMediaUrls.push(stored.url);
        }
        
        if (uploadedMediaUrls.length > 0) {
          await logAudit({
            agencyId: agency.id,
            actorId: user.id,
            action: "MEDIA_UPLOADED",
            entityType: "SubAccount",
            entityId: subAccount.id,
            details: `Uploaded ${uploadedMediaUrls.length} files to media library during onboarding: ${uploadedMediaUrls.join(", ")}`,
          });
        }
      } catch (err) {
        console.error("Failed to upload media during onboarding:", err);
      }
    }

    // Generate JWT tokens
    const jwtPayload: JwtPayload = { userId: user.id, role: user.role, agencyId: agency.id };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        initials: user.initials,
        agencyId: agency.id,
        agencyName: agency.name,
      },
      subAccount,
      accessToken: signAccessToken(jwtPayload),
      refreshToken: signRefreshToken(jwtPayload),
    };
  }
}

export const onboardingService = new OnboardingService();
