/**
 * One-time GHL API verification script (see "first phase.md" §5 step 1).
 *
 * Confirms, against the LIVE GHL API with a real agency-level Private
 * Integration Token:
 *   1. The token is valid (GET /locations/search with the PIT alone)
 *   2. The agency's real Company ID, DISCOVERED from the response — no need
 *      to type it, and the X-XXX-XXX "Relationship Number" is never used
 *   3. Listing all locations under the company + response shape
 *   4. Single-location lookup (GET /locations/{id}) + response shape
 *
 * Usage — put these in backend/.env (never pass the key as a CLI arg,
 * it would land in shell history):
 *   GHL_VERIFY_API_KEY=pit-...            (required)
 *   GHL_VERIFY_LOCATION_ID=<location id>  (optional — tests single lookup)
 * then run:
 *   pnpm tsx ghlscripts/verify-ghl.ts
 *
 * The API key is never printed. Location data is printed (names/ids only)
 * so you can confirm it matches what you see inside GHL.
 */
import { ghlClient } from "../src/lib/ghl/ghl.client";
import { env } from "../src/utils/envConfig";

const apiKey = env.GHL_VERIFY_API_KEY;
const knownLocationId = env.GHL_VERIFY_LOCATION_ID;

if (!apiKey) {
  console.error("Set GHL_VERIFY_API_KEY in backend/.env first (optionally GHL_VERIFY_LOCATION_ID too).");
  process.exit(1);
}

async function main() {
  console.log("=== GHL live verification ===");
  console.log(`API key: ****${apiKey!.slice(-4)} (redacted)`);

  console.log("\n[1/4] Validating token + discovering Company ID via GET /locations/search (no companyId param) ...");
  const companyId = await ghlClient.discoverCompanyId(apiKey!);
  if (!companyId) {
    console.error(
      "  ✗ Token was accepted but no locations were returned — either the agency has no sub-accounts yet, or the token is missing the locations.readonly scope.",
    );
    process.exit(1);
  }
  console.log(`  ✓ Token accepted — agency-level PIT confirmed`);
  console.log(`  ✓ Discovered Company ID: ${companyId}  ← use this in /connect, NOT the relationship number`);

  console.log("\n[2/4] Cross-checking validateApiKey with the discovered Company ID ...");
  const validation = await ghlClient.validateApiKey(apiKey!, companyId);
  if (!validation.valid) {
    console.error(`  ✗ INVALID: ${validation.reason}`);
    process.exit(1);
  }
  console.log("  ✓ Search with explicit companyId works too");

  console.log("\n[3/4] Listing all locations under the company ...");
  const locations = await ghlClient.listAllLocations(apiKey!, companyId);
  console.log(`  ✓ ${locations.length} location(s) returned`);
  for (const loc of locations.slice(0, 10)) {
    console.log(`    - ${loc.id}  ${loc.name}  ${loc.email ?? "(no email)"}`);
  }
  if (locations.length > 10) console.log(`    ... and ${locations.length - 10} more`);

  console.log("\n[4/4] Fetching a single location by ID ...");
  const lookupId = knownLocationId || locations[0]?.id;
  if (!lookupId) {
    console.log("  (skipped — no locations to test with)");
  } else {
    const single = await ghlClient.getLocation(apiKey!, lookupId);
    if (single) {
      console.log(`  ✓ GET /locations/${lookupId} returned: ${single.name}`);
    } else {
      console.error(
        `  ✗ GET /locations/${lookupId} returned null — either this location is not under this agency, or the response shape differs. Paste this output back to Claude.`,
      );
      process.exit(1);
    }
  }

  console.log("\n=== All checks passed. GHL client behavior is confirmed against the live API. ===");
}

main().catch((err) => {
  console.error("\nVerification failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
