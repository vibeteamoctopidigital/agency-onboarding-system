/**
 * Adds a manually-verified sub-account (no GHL API involved) so the client
 * flow is fully testable before the real agency-level GHL token arrives.
 * Idempotent — safe to run repeatedly.
 *
 * Portal URL after running:  /portal?location_id=aWST99zZBQl7KUbxQ100
 * (ALPHA PHYSIQUE — the real location we verified against GHL earlier.)
 */
import "dotenv/config";
import { prisma } from "../src/utils/prisma";

const LOCATION_ID = "aWST99zZBQl7KUbxQ100";
const NAME = "ALPHA PHYSIQUE";
const CONTACT = "robert@alphaphysique.com.au";

async function main() {
  const agency = await prisma.agency.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const owner = await prisma.user.findFirstOrThrow({
    where: { agencyId: agency.id, role: "AGENCY_OWNER", isDeleted: false },
  });

  const user = await prisma.user.upsert({
    where: { email_agencyId: { email: CONTACT, agencyId: agency.id } },
    update: {},
    create: {
      name: NAME,
      initials: "AP",
      role: "SUB_ACCOUNT",
      locationId: LOCATION_ID,
      contactEmail: CONTACT,
      email: CONTACT,
      agencyId: agency.id,
    },
  });

  await prisma.subAccount.upsert({
    where: { agencyId_ghlLocationId: { agencyId: agency.id, ghlLocationId: LOCATION_ID } },
    update: { status: "ACTIVE", decidedAt: new Date(), decidedById: owner.id, userId: user.id },
    create: {
      agencyId: agency.id,
      ghlLocationId: LOCATION_ID,
      name: NAME,
      contactEmail: CONTACT,
      status: "ACTIVE",
      decidedAt: new Date(),
      decidedById: owner.id,
      userId: user.id,
    },
  });

  console.log(`Manually-verified sub-account ready: ${NAME}`);
  console.log(`Test URL: http://localhost:3000/portal?location_id=${LOCATION_ID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
