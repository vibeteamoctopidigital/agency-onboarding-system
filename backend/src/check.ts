import { ghlClient } from "./lib/ghl/ghl.client";
import { env } from "./utils/envConfig";

async function main() {
  const apiKey = env.GHL_VERIFY_API_KEY;
  const companyId = env.GHL_VERIFY_COMPANY_ID;

  if (!apiKey || !companyId) {
    console.error("Missing keys");
    process.exit(1);
  }

  const users = await ghlClient.listAllUsers(apiKey, companyId);
  console.log(`Found ${users.length} users in GHL.`);
  
  users.forEach(u => {
    console.log(JSON.stringify(u, null, 2));
  });
}

main().catch(console.error);
