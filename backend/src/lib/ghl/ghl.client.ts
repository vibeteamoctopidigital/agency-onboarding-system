import { badGateway, unauthorized } from "../../utils/appError";
import { env } from "../../utils/envConfig";

/**
 * GoHighLevel API v2 client - the ONLY place in the codebase allowed to call GHL.
 *
 * API discipline (see "first phase.md" §2/§4): every call below names its
 * endpoint, method, and headers, and states whether it is VERIFIED against
 * current GHL docs or ASSUMED and pending live confirmation.
 *
 * VERIFIED (2026-07-11, https://marketplace.gohighlevel.com/docs):
 *   - Base URL: https://services.leadconnectorhq.com
 *   - Headers on every call: Authorization: Bearer <PIT>, Version: 2021-07-28,
 *     Accept: application/json
 *   - Private Integration Tokens exist at Agency (Company) level
 *   - GET /locations/search  ("Search Sub-Account", takes companyId)
 *   - GET /locations/{locationId}
 *
 * VERIFIED LIVE (2026-07-12, real agency PIT against production GHL):
 *   - GET /locations/search returns 200 with the PIT alone - companyId query
 *     param is OPTIONAL for an agency-scoped token (company inferred from it)
 *   - Response shape confirmed: { locations: [{ id, companyId, name, email,
 *     address, city, state, country, timezone, ... }] }
 *   - Each location carries the agency's real companyId (an alphanumeric ID,
 *     e.g. "Ge4r..." - NOT the X-XXX-XXX "Relationship Number" shown in the
 *     GHL support UI), so the companyId can be DISCOVERED from the token
 *
 * VERIFIED LIVE (2026-07-13):
 *   - GET /users/search (scope: users.readonly) - takes companyId, returns
 *     { users: [{ id, name, firstName, lastName, email, phone, roles: { type,
 *     role, locationIds } }], count }
 *   - Agency-level PITs can NOT carry media scopes - /medias/* returns
 *     401 "The token is not authorized for this scope" no matter what the
 *     scope UI shows. Media therefore uses a LOCATION-level PIT (the owner
 *     designates one sub-account to host all uploads).
 *
 * ASSUMED - pending live confirmation:
 *   - Rate limits (client throttles conservatively until confirmed)
 *   - GET /medias/files + POST /medias/upload-file with a location PIT
 *     (scopes: medias.readonly / medias.write) - field names url/fileId are
 *     parsed defensively; verify live once a location PIT is provided.
 */

export interface GhlLocation {
  id: string;
  name: string;
  email?: string;
  companyId?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
}

export interface GhlUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  roles?: {
    type?: string; // "agency" | "account"
    role?: string; // "admin" | "user"
    locationIds?: string[];
  };
}

interface GhlRequestOptions {
  apiKey: string;
  path: string;
  query?: Record<string, string | number | undefined>;
}

export class GhlApiError extends Error {
  httpStatus: number;
  constructor(message: string, httpStatus: number) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

const REQUEST_TIMEOUT_MS = 15_000;
// ASSUMED rate limit - GHL has historically enforced burst limits per token.
// Serialize bulk calls with a small gap until real limits are confirmed.
const THROTTLE_GAP_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function ghlGet<T>({ apiKey, path, query }: GhlRequestOptions): Promise<T> {
  const url = new URL(path, env.GHL_API_BASE_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: env.GHL_API_VERSION,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (err) {
    throw new GhlApiError(
      err instanceof Error && err.name === "AbortError"
        ? "GHL API request timed out"
        : "Could not reach the GHL API",
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Never include the API key or full response body in errors that may be logged.
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      detail = Array.isArray(body.message) ? body.message.join("; ") : (body.message ?? "");
    } catch {
      /* non-JSON error body - status code is enough */
    }
    throw new GhlApiError(detail || `GHL API responded with ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

interface SearchLocationsResponse {
  locations?: GhlLocation[];
}

interface SearchUsersResponse {
  users?: GhlUser[];
  count?: number;
}

interface GetLocationResponse {
  location?: GhlLocation;
}

export const ghlClient = {

  /**
   * GET /locations/search - companyId is optional for an agency PIT (VERIFIED
   * LIVE: the token itself scopes the search to its own agency).
   */
  async searchLocations(apiKey: string, companyId?: string, limit = 100, skip = 0): Promise<GhlLocation[]> {
    const data = await ghlGet<SearchLocationsResponse>({
      apiKey,
      path: "/locations/search",
      query: { companyId, limit, skip },
    });
    return data.locations ?? [];
  },

  /**
   * Discovers the agency's real companyId from the token alone: searches one
   * location (no companyId param) and reads companyId off the result. Returns
   * null when the agency has no locations yet (nothing to read it from).
   * Throws GhlApiError on auth failures - callers surface those as key errors.
   */
  async discoverCompanyId(apiKey: string): Promise<string | null> {
    const locations = await this.searchLocations(apiKey, undefined, 1, 0);
    return locations[0]?.companyId ?? null;
  },


  async validateApiKey(apiKey: string, companyId: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      await this.searchLocations(apiKey, companyId, 1, 0);
      return { valid: true };
    } catch (err) {
      if (err instanceof GhlApiError) {
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          return {
            valid: false,
            reason: "GHL rejected this API key. Check that it is an agency-level Private Integration token with the locations.readonly scope, and that the Company/Location ID is correct.",
          };
        }
        if (err.httpStatus === 0) {
          throw badGateway("Could not reach GoHighLevel to validate the API key. Please try again.");
        }
        return { valid: false, reason: `GHL validation failed (${err.httpStatus}): ${err.message}` };
      }
      throw err;
    }
  },


  /**
   * GET /locations/{locationId} - returns null when the location is not
   * available under this token's agency.
   *
   * VERIFIED LIVE (2026-07-12): GHL answers 403 "Forbidden resource" BOTH for
   * a location that belongs to another agency AND for a completely made-up ID
   * (never 404). So 403 here means "not yours / doesn't exist" - NOT a bad
   * key - and must map to null, or the portal would misreport a foreign
   * location_id as a revoked API key. 401 alone means the token itself is bad.
   */
  async getLocation(apiKey: string, locationId: string): Promise<GhlLocation | null> {
    try {
      const data = await ghlGet<GetLocationResponse>({
        apiKey,
        path: `/locations/${encodeURIComponent(locationId)}`,
      });
      return data.location ?? null;
    } catch (err) {
      if (err instanceof GhlApiError) {
        if (
          err.httpStatus === 403 ||
          err.httpStatus === 404 ||
          err.httpStatus === 400 ||
          err.httpStatus === 422
        ) {
          return null;
        }
        if (err.httpStatus === 401) {
          throw unauthorized("The agency's GHL API key was rejected - it may have been rotated or revoked.", "GHL_KEY_INVALID");
        }
        if (err.httpStatus === 0) {
          throw badGateway("Could not reach GoHighLevel. Please try again.");
        }
      }
      throw err;
    }
  },


  /**
   * Validates a LOCATION-level PIT for media storage: GET /medias/files with
   * the location's own token (scope: medias.readonly). Returns a human-ready
   * reason on failure so the connect form can show exactly what's wrong.
   */
  async validateMediaLocationKey(apiKey: string, locationId: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      await ghlGet<unknown>({
        apiKey,
        path: "/medias/files",
        query: { type: "location", locationId, limit: 1, offset: 0 },
      });
      return { valid: true };
    } catch (err) {
      if (err instanceof GhlApiError) {
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          return {
            valid: false,
            reason:
              "GHL rejected the media storage key. It must be a Private Integration created INSIDE the chosen sub-account (location level) with the medias.write and medias.readonly scopes.",
          };
        }
        if (err.httpStatus === 0) {
          throw badGateway("Could not reach GoHighLevel to validate the media storage key. Please try again.");
        }
        return { valid: false, reason: `GHL media key validation failed (${err.httpStatus}): ${err.message}` };
      }
      throw err;
    }
  },

  /**
   * POST /medias/upload-file with a location PIT (scope: medias.write) -
   * stores the file in that location's Media Library and returns its URL.
   * Response shape parsed defensively (ASSUMED pending live confirmation).
   */
  async uploadMediaFile(
    apiKey: string,
    buffer: Buffer,
    fileName: string,
    locationId: string,
  ): Promise<{ url: string; fileId: string }> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buffer)]), fileName);
    form.append("name", fileName);
    form.append("hostId", locationId);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS * 2); // uploads are slower than GETs
    let response: Response;
    try {
      response = await fetch(new URL("/medias/upload-file", env.GHL_API_BASE_URL), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: env.GHL_API_VERSION,
          Accept: "application/json",
          // No Content-Type - fetch sets the multipart boundary itself.
        },
        body: form,
        signal: controller.signal,
      });
    } catch (err) {
      throw new GhlApiError(
        err instanceof Error && err.name === "AbortError"
          ? "GHL media upload timed out"
          : "Could not reach the GHL API for the media upload",
        0,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let detail = "";
      try {
        const body = (await response.json()) as { message?: string | string[] };
        detail = Array.isArray(body.message) ? body.message.join("; ") : (body.message ?? "");
      } catch {
        /* non-JSON error body */
      }
      throw new GhlApiError(detail || `GHL media upload responded with ${response.status}`, response.status);
    }

    const data = (await response.json()) as Record<string, any>;
    const url: string | undefined = data.url ?? data.fileUrl ?? data.file?.url;
    const fileId: string | undefined = data.fileId ?? data.id ?? data._id ?? data.file?.id;
    if (!url) throw new GhlApiError("GHL media upload returned no file URL", response.status);
    return { url, fileId: String(fileId ?? fileName) };
  },

  /**
   * GET /users/search - every user under the agency (scope: users.readonly).
   * VERIFIED LIVE 2026-07-13; paginates defensively.
   */
  async listAllUsers(apiKey: string, companyId: string): Promise<GhlUser[]> {
    const all: GhlUser[] = [];
    const pageSize = 100;
    let skip = 0;
    // Hard ceiling of 20 pages (2000 users) as a runaway guard.
    for (let page = 0; page < 20; page++) {
      const data = await ghlGet<SearchUsersResponse>({
        apiKey,
        path: "/users/search",
        query: { companyId, limit: pageSize, skip },
      });
      const batch = data.users ?? [];
      all.push(...batch);
      if (batch.length < pageSize) break;
      skip += pageSize;
      await sleep(THROTTLE_GAP_MS);
    }
    return all;
  },

  async listAllLocations(apiKey: string, companyId: string): Promise<GhlLocation[]> {
    const all: GhlLocation[] = [];
    const pageSize = 100;
    let skip = 0;
    // Hard ceiling of 50 pages (5000 locations) as a runaway guard.
    for (let page = 0; page < 50; page++) {
      const batch = await this.searchLocations(apiKey, companyId, pageSize, skip);
      all.push(...batch);
      if (batch.length < pageSize) break;
      skip += pageSize;
      await sleep(THROTTLE_GAP_MS);
    }
    return all;
  },
};
