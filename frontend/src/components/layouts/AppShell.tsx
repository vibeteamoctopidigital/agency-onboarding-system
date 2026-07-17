"use client"

import { UserCircle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { QUERY_KEYS } from "@/constants"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/auth/useAuth"
import { cn } from "@/lib/utils"
import { SocialService } from "@/services/social.service"
import { SubAccountsService } from "@/services/subaccounts.service"
import { TicketService } from "@/services/ticket.service"

/**
 * GHL-native top-tab shell. This app is embedded inside GoHighLevel through a
 * Custom Menu Link, and the client must never feel they left GHL - so no
 * custom sidebar, no product branding: a white top tab bar, GHL's light gray
 * canvas, and white bordered cards, exactly like GHL's own Payments pages.
 */

interface NavItem {
  href: string
  label: string
  /** Key into the live counts - renders an attention badge when > 0. */
  countKey?: "review" | "unassigned" | "requests" | "myActive" | "socialAttention" | "myOrders"
}

const OWNER_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/board", label: "Support board" },
  { href: "/admin/review", label: "Review queue", countKey: "review" },
  { href: "/admin/unassigned", label: "Unassigned", countKey: "unassigned" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/sub-accounts", label: "Sub-accounts" },
  { href: "/admin/requests", label: "Access requests", countKey: "requests" },
]

// Team members work BOTH products from one organized place.
const TEAM_NAV: NavItem[] = [
  { href: "/team/dashboard", label: "Dashboard" },
  { href: "/team/board", label: "My tickets", countKey: "myActive" },
  { href: "/team/orders", label: "My orders", countKey: "myOrders" },
]

const CLIENT_NAV: NavItem[] = [
  { href: "/client/dashboard", label: "My tickets" },
  { href: "/client/dashboard/profile", label: "Profile" },
]

// /social/* is a SEPARATE app in the UI (its own GHL menu link) - same design
// language and the same session, but its own nav with no ticket pages.
const SOCIAL_OWNER_NAV: NavItem[] = [
  { href: "/social/admin", label: "Social orders", countKey: "socialAttention" },
  { href: "/social/admin/sub-accounts", label: "Sub-accounts" },
]

const SOCIAL_CLIENT_NAV: NavItem[] = [
  { href: "/social/client", label: "My orders" },
  { href: "/client/dashboard/profile", label: "Profile" },
]

/**
 * Live attention counts for the nav badges. Uses the SAME query keys as the
 * pages themselves so the cache is shared - the Review queue page and its
 * badge always agree. Polls gently so counts stay fresh while embedded.
 */
function useNavCounts(role: { isOwner: boolean; isTeamMember: boolean }) {
  const shared = { staleTime: 30_000, refetchInterval: 60_000 } as const

  const review = useQuery({
    queryKey: QUERY_KEYS.REVIEW,
    queryFn: () => TicketService.getReview(),
    enabled: role.isOwner,
    ...shared,
  })
  const unassigned = useQuery({
    queryKey: QUERY_KEYS.UNASSIGNED,
    queryFn: () => TicketService.getUnassigned(),
    enabled: role.isOwner,
    ...shared,
  })
  const requests = useQuery({
    queryKey: QUERY_KEYS.SUB_ACCOUNT_REQUESTS,
    queryFn: () => SubAccountsService.listRequests(),
    enabled: role.isOwner,
    ...shared,
  })
  const mine = useQuery({
    queryKey: QUERY_KEYS.MY_TICKETS,
    queryFn: () => TicketService.getMine(),
    enabled: role.isTeamMember,
    ...shared,
  })
  // Role-scoped on the server: owner sees all orders, team member their own.
  const social = useQuery({
    queryKey: QUERY_KEYS.SOCIAL_ORDERS,
    queryFn: () => SocialService.list(),
    enabled: role.isOwner || role.isTeamMember,
    ...shared,
  })

  return {
    review: review.data?.length ?? 0,
    unassigned: unassigned.data?.length ?? 0,
    requests: requests.data?.length ?? 0,
    myActive: mine.data?.filter((t: { stage: string }) => t.stage !== "RESOLVED").length ?? 0,
    // Owner attention: freshly submitted orders + delivered-but-unconfirmed ones.
    socialAttention: social.data?.filter((o) => o.status === "SUBMITTED").length ?? 0,
    myOrders:
      social.data?.filter((o) => ["ACCEPTED", "IN_PROGRESS", "DELIVERED"].includes(o.status)).length ?? 0,
  }
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  )
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  fullWidth = false,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
  /** Board views need the whole viewport - skips the GHL content max-width. */
  fullWidth?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isOwner, isTeamMember, isSubAccount } = useAuth()
  const counts = useNavCounts({ isOwner, isTeamMember })

  // Inside /social/* the shell shows the social app's nav; everywhere else the
  // support desk's. Team members keep one combined nav in both.
  const inSocial = pathname.startsWith("/social")
  const nav = isSubAccount
    ? inSocial ? SOCIAL_CLIENT_NAV : CLIENT_NAV
    : isOwner
      ? inSocial ? SOCIAL_OWNER_NAV : OWNER_NAV
      : TEAM_NAV

  return (
    <div className="min-h-screen bg-[#F0F4F8] mt-5">
      {/* GHL-style top tab bar - transparent over the canvas, bordered tabs */}
      <header className="bg-transparent border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 h-[54px] flex items-center justify-between gap-3">
          {/* Owner or SubAccount app switcher: side-by-side links */}
          {(isOwner || isSubAccount) && (
            <div className="flex items-center space-x-2 shrink-0">
              <Link
                href={isOwner ? "/admin/dashboard" : "/client/dashboard"}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                  !inSocial ? "bg-black text-white" : "bg-gray-200 text-blue-600 hover:bg-gray-300"
                )}
              >
                Support tickets
              </Link>
              <Link
                href={isOwner ? "/social/admin" : "/social/client"}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                  inSocial ? "bg-black text-white" : "bg-gray-200 text-blue-600 hover:bg-gray-300"
                )}
              >
                Social orders
              </Link>
            </div>
          )}

          <nav className="flex items-center overflow-x-auto py-2 ml-auto" aria-label="Main">
            {nav.map((item, i) => {
              const active = pathname === item.href
              const count = item.countKey ? counts[item.countKey] : 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center whitespace-nowrap h-9 px-3.5 text-[13px] font-medium border transition-colors -ml-px",
                    i === 0 && "ml-0 rounded-l-lg",
                    i === nav.length - 1 && "rounded-r-lg",
                    active
                      ? "text-blue-600 bg-blue-50/50 border-blue-200 relative z-10"
                      : "text-gray-600 bg-gray-50  border-gray-200 hover:text-gray-900 hover:bg-gray-100",
                  )}
                >
                  {item.label}
                  <CountBadge count={count} />
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Page canvas - GHL gray with constrained content width */}
      <div className={cn("px-4 sm:px-6 py-6", !fullWidth && "w-full mx-auto")}>
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-[13px] text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
