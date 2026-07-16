"use client"

import {
  BarChart3,
  ClipboardList,
  Home,
  Inbox,
  ListTodo,
  LogOut,
  Settings,
  Shield,
  UserPlus,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ROUTES } from "@/constants"
import { useAuth } from "@/hooks/auth/useAuth"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const _router = useRouter()
  const { user, isOwner, isTeamMember, isSubAccount, logout } = useAuth()

  const agencyOwnerNavItems = [
    { href: ROUTES.DASHBOARD, icon: Home, label: "Dashboard" },
    { href: ROUTES.BOARD, icon: ClipboardList, label: "Board" },
    { href: ROUTES.UNASSIGNED, icon: Inbox, label: "Unassigned" },
    { href: ROUTES.REVIEW, icon: Shield, label: "Review" },
    { href: ROUTES.TEAM, icon: Users, label: "Team" },
    { href: ROUTES.SUB_ACCOUNTS, icon: UserPlus, label: "Clients" },
    { href: ROUTES.REPORTS, icon: BarChart3, label: "Reports" },
    { href: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
  ]

  const teamMemberNavItems = [
    { href: ROUTES.DASHBOARD, icon: Home, label: "Dashboard" },
    { href: ROUTES.BOARD, icon: ClipboardList, label: "My Tickets" },
    { href: ROUTES.MY_PERFORMANCE, icon: BarChart3, label: "My Stats" },
    { href: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
  ]

  const subAccountNavItems = [
    { href: ROUTES.DASHBOARD, icon: Home, label: "Dashboard" },
    { href: ROUTES.BOARD, icon: ListTodo, label: "My Tickets" },
  ]

  let navItems: Array<{
    href: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
    label: string
  }> = []

  if (isOwner) {
    navItems = agencyOwnerNavItems
  } else if (isTeamMember) {
    navItems = teamMemberNavItems
  } else if (isSubAccount) {
    navItems = subAccountNavItems
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className="w-[88px] shrink-0 bg-primary rounded-[2.5rem] flex flex-col items-center py-10 shadow-[var(--shadow-soft)] my-2 relative">
      <div className="mb-12">
        <div className="text-primary-foreground font-orbitron text-3xl font-bold tracking-tighter">
          {user?.initials?.charAt(0) || "F"}
        </div>
      </div>
      <nav className="flex-1 flex flex-col gap-8 w-full items-center">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center justify-center transition-colors hover:text-white",
                  isActive ? "text-white" : "text-white/50",
                )}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              </Link>
              <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                {item.label}
              </span>
            </div>
          )
        })}
      </nav>
      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center text-white/50 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>
    </aside>
  )
}
