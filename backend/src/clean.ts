import { prisma } from "./utils/prisma";

async function main() {
  const email = "anna@xpm.agency";
  const user = await prisma.user.findFirst({ where: { email } });
  
  if (user) {
    console.log(`Deleting user ${user.id} and its agency ${user.agencyId}...`);
    await prisma.subAccount.deleteMany({ where: { agencyId: user.agencyId } });
    await prisma.user.deleteMany({ where: { agencyId: user.agencyId } });
    await prisma.agency.delete({ where: { id: user.agencyId } });
    console.log("Cleanup complete!");
  } else {
    console.log("Agency not found, nothing to clean.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
