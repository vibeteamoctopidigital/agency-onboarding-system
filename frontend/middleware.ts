import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/**
 * NOTE ON AUTH: this app runs inside a GHL iframe where third-party cookies
 * are routinely blocked, so access/refresh tokens live in localStorage and are
 * sent via the Authorization header (see src/lib/token-storage.ts) — NOT in
 * cookies. That means Next middleware cannot see the session, so the real
 * per-role route protection is enforced client-side by <AuthGuard> on every
 * /admin, /team and /client page (and again server-side by the API).
 *
 * This middleware is intentionally light: it only normalizes a couple of
 * legacy paths so old links keep working. It must never redirect protected
 * routes based on a cookie that will not exist.
 */

// Old single-dashboard scheme → new role-scoped homes. Owners/team landing on
// a bare /dashboard get routed to the admin dashboard; AuthGuard then bounces
// a team member to /team/dashboard if needed.
const LEGACY_REDIRECTS: Record<string, string> = {
  "/dashboard": "/admin/dashboard",
  "/register": "/connect",
  "/sub-account-login": "/portal",
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const legacy = LEGACY_REDIRECTS[pathname]
  if (legacy) {
    return NextResponse.redirect(new URL(legacy, request.url))
  }

  // Legacy /dashboard/* subpaths → /admin/* equivalents.
  if (pathname.startsWith("/dashboard/")) {
    const rest = pathname.slice("/dashboard/".length)
    return NextResponse.redirect(new URL(`/admin/${rest}`, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
