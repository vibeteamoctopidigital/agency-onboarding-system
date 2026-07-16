/**
 * Dev-only E2E fixtures: marks the seeded demo agency as "connected" with an
 * encrypted FAKE GHL key and creates one PENDING + one REJECTED sub-account
 * row, so the portal state machine and approval queue can be exercised
 * end-to-end without a real GHL token (real-token verification happens
 * separately via verify-ghl.ts).
 */
import "dotenv/config";
import { encryptSecret } from "../src/utils/crypto";
import { prisma } from "../src/utils/prisma";

async function main() {
  const agency = await prisma.agency.findUniqueOrThrow({ where: { slug: "demo-agency" } });

  await prisma.agency.update({
    where: { id: agency.id },
    data: {
      ghlCompanyId: agency.ghlCompanyId ?? "demo-company-001",
      ghlApiKeyEncrypted: agency.ghlApiKeyEncrypted ?? encryptSecret("pit-fake-e2e-key-not-real"),
      connectedAt: agency.connectedAt ?? new Date(),
    },
  });

  await prisma.subAccount.upsert({
    where: { agencyId_ghlLocationId: { agencyId: agency.id, ghlLocationId: "loc-e2e-pending" } },
    update: { status: "PENDING", decidedAt: null, decidedById: null },
    create: {
      agencyId: agency.id,
      ghlLocationId: "loc-e2e-pending",
      name: "E2E Pending Co.",
      contactEmail: "pending@e2e.example",
      status: "PENDING",
    },
  });

  await prisma.subAccount.upsert({
    where: { agencyId_ghlLocationId: { agencyId: agency.id, ghlLocationId: "loc-e2e-rejected" } },
    update: { status: "REJECTED" },
    create: {
      agencyId: agency.id,
      ghlLocationId: "loc-e2e-rejected",
      name: "E2E Rejected Co.",
      contactEmail: "rejected@e2e.example",
      status: "REJECTED",
      decidedAt: new Date(),
    },
  });

  console.log("E2E fixtures ready: demo agency connected (fake key), loc-e2e-pending + loc-e2e-rejected created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
