import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { GhlApiError, ghlClient } from "../ghl/ghl.client";
import { badGateway } from "../../utils/appError";
import { decryptSecret } from "../../utils/crypto";
import { env } from "../../utils/envConfig";
import { prisma } from "../../utils/prisma";

/**
 * File-storage abstraction for ticket/order attachments.
 *
 * THE store is the GHL Media Library of ONE designated sub-account: agency
 * PITs cannot carry media scopes (VERIFIED LIVE 2026-07-13), so the owner
 * provides a location-level PIT (medias.write) at connect time - mandatory -
 * and every uploaded file lands in that location's media library.
 *
 * Error discipline (client requirement): an upload failure surfaces GHL's
 * exact message to the uploader - never a bare "internal error" and never a
 * silent fallback that scatters files elsewhere. Local disk under ./uploads
 * remains ONLY as the dev fallback when the agency has no media credentials.
 *
 * File names carry who uploaded them: {account-name}-{role}-{filename}-{rand}.ext
 * and order files are additionally prefixed order-{displayId}- by the caller.
 */

export interface StoredFile {
  url: string;
  storageKey: string;
  provider: "ghl" | "local";
}

/** Who is uploading - drives the file name so files are identifiable later. */
export interface UploadContext {
  agencyId: string;
  uploaderName: string;
  uploaderRole: string; // AGENCY_OWNER | TEAM_MEMBER | SUB_ACCOUNT
}

// Local fallback: files live under <backend>/uploads and are served at /uploads.
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const ROLE_SLUGS: Record<string, string> = {
  AGENCY_OWNER: "agency-owner",
  TEAM_MEMBER: "team-member",
  SUB_ACCOUNT: "sub-account",
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "user";
}

/**
 * Client-mandated name format: {account-name}-{role}-{filename}.{ext}
 * e.g. "acme-dental-sub-account-invoice-x7k2f9.pdf". A short random suffix
 * keeps two "screenshot.png" uploads from colliding.
 */
function buildFileName(originalName: string, ctx?: UploadContext): string {
  const base = path.basename(originalName);
  const ext = path.extname(base);
  const stem = slug(base.slice(0, base.length - ext.length) || "file");
  const suffix = crypto.randomBytes(3).toString("hex");
  if (!ctx) return `${stem}-${suffix}${ext}`.slice(0, 200);
  const role = ROLE_SLUGS[ctx.uploaderRole] ?? slug(ctx.uploaderRole);
  return `${slug(ctx.uploaderName)}-${role}-${stem}-${suffix}${ext}`.slice(0, 200);
}

/** The agency's media-storage location credentials, or null when not set up. */
async function mediaCredentials(agencyId: string): Promise<{ apiKey: string; locationId: string } | null> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { ghlMediaLocationId: true, ghlMediaKeyEncrypted: true },
  });
  if (!agency?.ghlMediaLocationId || !agency.ghlMediaKeyEncrypted) return null;
  try {
    return { apiKey: decryptSecret(agency.ghlMediaKeyEncrypted), locationId: agency.ghlMediaLocationId };
  } catch {
    throw badGateway(
      "The stored media storage key can't be read (encryption key changed?) - the agency owner must re-save it in Media storage settings.",
      "MEDIA_KEY_UNREADABLE",
    );
  }
}

async function uploadToLocalDisk(buffer: Buffer, fileName: string): Promise<StoredFile> {
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOAD_DIR, fileName), buffer);
  return {
    url: `${env.publicBaseUrl}/uploads/${fileName}`,
    storageKey: fileName,
    provider: "local",
  };
}

const NOT_CONFIGURED_MESSAGE =
  "Media storage is not configured - the agency owner must add the media sub-account Location ID and PIT token (Connect form or Media storage settings).";

export const storageService = {
  /** Upload one file's bytes and return its public URL + storage key. */
  async upload(buffer: Buffer, originalName: string, ctx?: UploadContext): Promise<StoredFile> {
    const fileName = buildFileName(originalName, ctx);

    const creds = ctx ? await mediaCredentials(ctx.agencyId) : null;
    if (creds) {
      try {
        const uploaded = await ghlClient.uploadMediaFile(creds.apiKey, buffer, fileName, creds.locationId);
        return { url: uploaded.url, storageKey: uploaded.fileId, provider: "ghl" };
      } catch (err) {
        const msg = err instanceof GhlApiError || err instanceof Error ? err.message : String(err);
        console.error(`GHL media upload failed: ${msg}`);
        const hint =
          err instanceof GhlApiError && (err.httpStatus === 401 || err.httpStatus === 403)
            ? " The media storage PIT must be created INSIDE the designated sub-account with the medias.write scope - re-save it in Media storage settings."
            : "";
        throw badGateway(`Could not save the file to the GHL Media Library - ${msg}.${hint}`, "GHL_MEDIA_UPLOAD_FAILED");
      }
    }

    // No media credentials: local disk keeps dev working; production fails
    // with the exact instruction instead of a silent or cryptic error.
    if (env.isProduction) {
      throw badGateway(NOT_CONFIGURED_MESSAGE, "STORAGE_UNAVAILABLE");
    }
    return uploadToLocalDisk(buffer, fileName);
  },

  /** Best-effort delete - never throws (attachment DB row is the source of truth). */
  async remove(file: { provider: string; storageKey: string }): Promise<void> {
    try {
      if (file.provider === "local") {
        await fs.promises.unlink(path.join(UPLOAD_DIR, file.storageKey)).catch(() => {});
      }
      // "ghl": files stay in the designated sub-account's media library -
      // deleting there is a visible owner action in GHL, not a silent side effect.
    } catch {
      /* swallow - cleanup is best-effort */
    }
  },

  uploadDir: UPLOAD_DIR,
};
