import { prisma } from "../utils/prisma";
import { ghlClient } from "../lib/ghl/ghl.client";
import { encryptSecret } from "../utils/crypto";
import { hashPassword } from "../utils/password";
import { env } from "../utils/envConfig";

async function main() {
  console.log("Starting GHL DB Seeding process...");

  const apiKey = env.GHL_VERIFY_API_KEY;
  const companyId = env.GHL_VERIFY_COMPANY_ID;

  if (!apiKey || !companyId) {
    console.error("Missing GHL_VERIFY_API_KEY or GHL_VERIFY_COMPANY_ID in environment.");
    process.exit(1);
  }

  // 1. Validate API Key and fetch Agency info
  console.log("Validating GHL API Key...");
  const validation = await ghlClient.validateApiKey(apiKey, companyId);
  if (!validation.valid) {
    console.error("GHL API Key validation failed:", validation.reason);
    process.exit(1);
  }

  // Fetch all users to find the agency admin's email and name
  console.log(`Fetching all users for company ${companyId}...`);
  const ghlUsers = await ghlClient.listAllUsers(apiKey, companyId);

  // Look for the actual agency owner
  const agencyAdmin = ghlUsers.find((u) => u.isAgencyOwner === true) || ghlUsers.find((u) => u.roles?.type === "agency" && u.roles?.role === "admin");
  const fallbackEmail = "admin@agency.com";
  
  const agencyName = agencyAdmin?.name || "My GHL Agency";
  const ownerEmail = agencyAdmin?.email || fallbackEmail;
  const ownerName = agencyAdmin?.name || "Agency Admin";
  const ownerPassword = "123456789";

  console.log(`Determined Agency Name: ${agencyName}`);
  console.log(`Determined Owner Email: ${ownerEmail}`);

  // Ensure DB doesn't already have this agency
  let agency = await prisma.agency.findUnique({ where: { ghlCompanyId: companyId } });
  
  if (agency) {
    console.log("Agency already exists in the database. Updating its users/locations instead.");
  } else {
    console.log("Creating new Agency record in database...");
    const slugBase = agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "agency";
    const passwordHash = await hashPassword(ownerPassword);
    
    agency = await prisma.agency.create({
      data: {
        name: agencyName,
        slug: `${slugBase}-${Date.now()}`,
        ghlCompanyId: companyId,
        ghlApiKeyEncrypted: encryptSecret(apiKey),
        connectedAt: new Date(),
        users: {
          create: {
            email: ownerEmail,
            passwordHash,
            name: ownerName,
            initials: ownerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "AD",
            role: "AGENCY_OWNER",
            locationId: companyId, // The agency owner belongs to the company root
          }
        }
      }
    });
    console.log(`Created Agency ${agency.id} and Owner User for ${ownerEmail}`);
  }

  // Fetch all locations (sub-accounts)
  console.log("Fetching all locations from GHL...");
  const locations = await ghlClient.listAllLocations(apiKey, companyId);
  console.log(`Found ${locations.length} locations in GHL.`);

  let seededCount = 0;
  for (const loc of locations) {
    if (!loc.id) continue;

    const existingSub = await prisma.subAccount.findFirst({
      where: { agencyId: agency.id, ghlLocationId: loc.id }
    });

    if (existingSub) {
      console.log(`SubAccount for Location ${loc.id} already exists. Skipping.`);
      continue;
    }

    console.log(`Seeding SubAccount: ${loc.name} (${loc.id})`);
    
    await prisma.subAccount.create({
      data: {
        agencyId: agency.id,
        ghlLocationId: loc.id,
        name: loc.name || "Unknown Location",
        contactEmail: loc.email || null,
        status: "ACTIVE", // Automatically mark them as ACTIVE so they show up
      }
    });
    seededCount++;
  }

  console.log(`\nSuccess! Seeded ${seededCount} new sub-accounts into the local database.`);
  console.log(`You can now log in at /admin/dashboard with:`);
  console.log(`Email: ${ownerEmail}`);
  console.log(`Password: ${ownerPassword}\n`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
