import { config } from "@/config"

/**
 * Iframe-safe token storage with THREE fully isolated session buckets.
 *
 * GHL keeps the agency owner, team members, and sub-accounts in ONE browser
 * (switching sub-accounts / agency view inside the same iframe origin), so a
 * single token slot means every login overwrites the previous session and the
 * wrong role's data gets fetched. Each role therefore gets its own bucket:
 *
 *   admin_access_token / admin_refresh_token   → AGENCY_OWNER  (/admin, /social/admin)
 *   team_access_token / team_refresh_token     → TEAM_MEMBER   (/team, /onboarding)
 *   client_access_token / client_refresh_token → SUB_ACCOUNT   (/client, /portal, /social)
 *
 * RULES (the whole fix lives in these three lines):
 *   1. A bucket is only ever written by its own role's login/refresh.
 *   2. A page area only ever reads its own bucket - NO cross-bucket fallback.
 *   3. Clearing one bucket never touches the others.
 *
 * The legacy generic keys (access_token/refresh_token) are read ONLY by the
 * client area as a one-time migration for sessions created before this split,
 * and are cleared whenever any bucket is cleared.
 */

export type SessionRole = "admin" | "team" | "client"

const memoryStore = new Map<string, string>()

function storageAvailable(): boolean {
  if (typeof window === "undefined") return false
  try {
    const probe = "__storage_probe__"
    window.localStorage.setItem(probe, "1")
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

function get(key: string): string | undefined {
  if (storageAvailable()) return window.localStorage.getItem(key) ?? undefined
  return memoryStore.get(key)
}

function set(key: string, value: string): void {
  if (storageAvailable()) {
    window.localStorage.setItem(key, value)
  } else {
    memoryStore.set(key, value)
  }
}

function remove(key: string): void {
  if (storageAvailable()) window.localStorage.removeItem(key)
  memoryStore.delete(key)
}

/** Derive the active session bucket from the current URL path. */
export function getActiveRole(): SessionRole | null {
  if (typeof window === "undefined") return null
  const path = window.location.pathname
  if (path.startsWith("/social/admin")) return "admin"
  if (path.startsWith("/admin") || path.startsWith("/connect")) return "admin"
  if (path.startsWith("/team") || path.startsWith("/onboarding")) return "team"
  if (path.startsWith("/client") || path.startsWith("/portal") || path.startsWith("/social")) return "client"
  return null // e.g. /login - callers store per-role explicitly after auth
}

function roleTokenKey(role: SessionRole): { access: string; refresh: string } {
  if (role === "admin") return { access: config.auth.adminTokenKey, refresh: config.auth.adminRefreshTokenKey }
  if (role === "team") return { access: config.auth.teamTokenKey, refresh: config.auth.teamRefreshTokenKey }
  return { access: config.auth.clientTokenKey, refresh: config.auth.clientRefreshTokenKey }
}

export const tokenStorage = {
  getActiveRole,

  /** Access token for the current area's bucket only - never another role's. */
  getAccessToken: () => {
    const role = getActiveRole()
    if (role === "client") return get(config.auth.clientTokenKey) ?? get(config.auth.tokenKey) // legacy migration
    if (role) return get(roleTokenKey(role).access)
    return get(config.auth.tokenKey)
  },

  getRefreshToken: () => {
    const role = getActiveRole()
    if (role === "client") return get(config.auth.clientRefreshTokenKey) ?? get(config.auth.refreshTokenKey)
    if (role) return get(roleTokenKey(role).refresh)
    return get(config.auth.refreshTokenKey)
  },

  /**
   * Store tokens into the CURRENT AREA's bucket (used by the axios refresh
   * flow, which by definition refreshed the current area's session).
   */
  setTokens(accessToken: string, refreshToken?: string) {
    const role = getActiveRole()
    if (role) {
      const keys = roleTokenKey(role)
      set(keys.access, accessToken)
      if (refreshToken) set(keys.refresh, refreshToken)
      return
    }
    set(config.auth.tokenKey, accessToken)
    if (refreshToken) set(config.auth.refreshTokenKey, refreshToken)
  },

  /**
   * Store tokens into ONE role's bucket - used right after login/portal entry,
   * keyed by the role the BACKEND returned. Never mirrors into other buckets
   * or the legacy generic keys (that mirroring was the session-overlap bug).
   * Pre-vault leftovers (access_token/refresh_token) are purged here so old
   * browsers converge on the three clean role buckets.
   */
  setTokensForRole(role: SessionRole, accessToken: string, refreshToken?: string) {
    const keys = roleTokenKey(role)
    set(keys.access, accessToken)
    if (refreshToken) set(keys.refresh, refreshToken)
    remove(config.auth.tokenKey)
    remove(config.auth.refreshTokenKey)
  },

  /** Get tokens for a specific role (without path detection). */
  getTokensForRole(role: SessionRole) {
    const keys = roleTokenKey(role)
    return {
      accessToken: get(keys.access),
      refreshToken: get(keys.refresh),
    }
  },

  /** Clear the current area's bucket (+ legacy generic keys). */
  clear() {
    remove(config.auth.tokenKey)
    remove(config.auth.refreshTokenKey)
    const role = getActiveRole()
    if (role) {
      const keys = roleTokenKey(role)
      remove(keys.access)
      remove(keys.refresh)
    }
  },

  /** Clear ONE role's bucket - other roles' sessions survive untouched. */
  clearRole(role: SessionRole) {
    const keys = roleTokenKey(role)
    remove(keys.access)
    remove(keys.refresh)
    if (role === "client") {
      // Legacy generic keys belong to the client bucket post-migration.
      remove(config.auth.tokenKey)
      remove(config.auth.refreshTokenKey)
    }
  },

  /** Clear every session (all roles + legacy keys). */
  clearAll() {
    remove(config.auth.tokenKey)
    remove(config.auth.refreshTokenKey)
    remove(config.auth.adminTokenKey)
    remove(config.auth.adminRefreshTokenKey)
    remove(config.auth.teamTokenKey)
    remove(config.auth.teamRefreshTokenKey)
    remove(config.auth.clientTokenKey)
    remove(config.auth.clientRefreshTokenKey)
  },
}
