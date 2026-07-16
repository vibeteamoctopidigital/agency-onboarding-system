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

    // 2. MOCKED GHL INTEGRATION
    // -------------------------------------------------------------
    // In a real scenario, we would call ghlClient.createLocation(...)
    // const ghlResponse = await ghlClient.createLocation(agency.ghlApiKeyEncrypted, {
    //   name: data.companyName,
    //   email: data.businessEmail,
    //   phone: data.phone,
    //   address: data.businessAddress,
    //   city: data.city,
    //   country: data.country
    // });
    // const ghlLocationId = ghlResponse.id;
    // -------------------------------------------------------------
    
    // MOCK: Generate a fake GHL location ID for testing
    const ghlLocationId = `ghl_loc_${Math.random().toString(36).substring(7)}`;

    // 3. Separate Personal and Business info
    const personalInfos = {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      country: data.country,
      city: data.city,
      personalAddress: data.personalAddress,
      passportNo: data.passportNo,
      nationalIdNo: data.nationalIdNo,
    };

    const businessInfos = {
      industry: data.industry === "Other" ? data.customIndustry : data.industry,
      employeeCount: data.employeeCount,
      businessAddress: data.businessAddress,
      website: data.website,
      linkedInUrl: data.linkedInUrl,
      socialLinks: data.socialLinks,
      companyBrief: data.companyBrief,
    };

    // 4. Save to Database
    const subAccount = await prisma.subAccount.create({
      data: {
        agencyId: agency.id,
        ghlLocationId,
        name: data.companyName,
        contactEmail: data.personalEmail,
        businessEmail: data.businessEmail,
        personalInfos,
        businessInfos,
        status: "ACTIVE", // Automatically active as per requirements
      },
    });

    // 5. Create the User with Default Password
    // A default plaintext password is used, which forces them to change it on login.
    const defaultPassword = "ChangeMe123!";
    
    // In auth.service, passwords might be hashed. Wait, the user specifically requested:
    // "auto login oky with default password (no need to hash this password oky ) after verify then check password changes or not if not change still default then force fully chnage password"
    // So we will literally store the plaintext password in passwordHash for this specific flow.
    const user = await prisma.user.create({
      data: {
        agencyId: agency.id,
        email: data.personalEmail, // Using personal email for portal login
        name: `${data.firstName} ${data.lastName}`,
        initials: `${data.firstName[0]}${data.lastName[0]}`.toUpperCase(),
        role: "SUB_ACCOUNT",
        passwordHash: defaultPassword, // Stored in plaintext as requested
        tempPassword: true, // Flag to force password change
      },
    });

    // Link user to subaccount
    await prisma.subAccount.update({
      where: { id: subAccount.id },
      data: { userId: user.id },
    });

    // 6. TICKET CREATION (Commented out as per request)
    // -------------------------------------------------------------
    // await prisma.ticket.create({
    //   data: {
    //     subject: "New Client Onboarding Details",
    //     description: `Problem Details:\n${data.problemDetails}\n\nGoal:\n${data.primaryGoal}\n\nTools:\n${data.currentTools}`,
    //     subAccountId: user.id,
    //     agencyId: agency.id,
    //     category: "Onboarding",
    //     stage: "NEW",
    //   }
    // });
    // -------------------------------------------------------------

    await logAudit({
      agencyId: agency.id,
      actorId: user.id,
      action: "CLIENT_ONBOARDED",
      entityType: "SubAccount",
      entityId: subAccount.id,
      details: `New client ${data.companyName} completed onboarding via form.`,
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
