/**
 * Live GHL verification for the two NEW integrations (same discipline as
 * verify-ghl.ts — run this BEFORE trusting the ASSUMED endpoints):
 *
 *   1. GET  /users/search       (scope: users.readonly) — team sync
 *   2. POST /medias/upload-file (scope: medias.write)   — attachment storage
 *
 * Usage — put this in backend/.env (never pass the key as a CLI arg):
 *   GHL_VERIFY_API_KEY=pit-...   (agency PIT WITH users.readonly + medias.write)
 * then run:
 *   npx tsx ghlscripts/verify-ghl-media-and-users.ts
 *
 * The API key is never printed. It uploads one tiny PNG named
 * "verify-agency-owner-test-<rand>.png" and prints the raw response shape so
 * the field names in storage.service.ts / ghl.client.ts can be confirmed.
 */
import crypto from "node:crypto";
import { ghlClient } from "../src/lib/ghl/ghl.client";
import { env } from "../src/utils/envConfig";

const apiKey = env.GHL_VERIFY_API_KEY;

if (!apiKey) {
  console.error("Set GHL_VERIFY_API_KEY in backend/.env first.");
  process.exit(1);
}

// 1x1 transparent PNG.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function main() {
  console.log("=== GHL live verification: users + media ===");
  console.log(`API key: ****${apiKey!.slice(-4)} (redacted)`);

  console.log("\n[1/3] Discovering Company ID ...");
  const companyId = await ghlClient.discoverCompanyId(apiKey!);
  if (!companyId) {
    console.error("No locations found — cannot discover companyId. Add a location in GHL first.");
    process.exit(1);
  }
  console.log(`Company ID: ${companyId}`);

  console.log("\n[2/3] GET /users/search (users.readonly) ...");
  try {
    const users = await ghlClient.listAllUsers(apiKey!, companyId);
    console.log(`OK — ${users.length} user(s) under the agency:`);
    for (const u of users.slice(0, 10)) {
      console.log(
        `  - ${u.name ?? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ?? "(no name)"} <${u.email ?? "no email"}> roles.type=${u.roles?.type ?? "?"} roles.role=${u.roles?.role ?? "?"}`,
      );
    }
    if (users[0]) {
      console.log("  Raw first-user keys:", Object.keys(users[0] as object).join(", "));
    }
  } catch (err) {
    console.error("FAILED — check that the PIT has the users.readonly scope:", err instanceof Error ? err.message : err);
  }

  console.log("\n[3/3] POST /medias/upload-file (medias.write) ...");
  const fileName = `verify-agency-owner-test-${crypto.randomBytes(3).toString("hex")}.png`;
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(TINY_PNG)]), fileName);
  form.append("name", fileName);

  const response = await fetch(new URL("/medias/upload-file", env.GHL_API_BASE_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: env.GHL_API_VERSION,
      Accept: "application/json",
    },
    body: form,
  });

  const body = await response.text();
  console.log(`HTTP ${response.status}`);
  console.log("Raw response body (confirm url/fileId field names against storage.service.ts):");
  console.log(body);
  if (!response.ok) {
    console.error("FAILED — check that the PIT has the medias.write scope.");
    process.exit(1);
  }
  console.log(`\nUploaded as "${fileName}" — open your GHL Media Library and confirm it appears and its URL loads.`);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
