"use client"

import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { TeamDashboardContent } from "@/components/dashboard/DashboardContent"
import { useAuth } from "@/hooks/auth/useAuth"

function TeamDashboardPage() {
  const { user } = useAuth()
  return (
    <AppShell title={`Hello, ${user?.name?.split(" ")[0] ?? ""}!`} subtitle="Your workload at a glance.">
      <TeamDashboardContent />
    </AppShell>
  )
}

export default function TeamDashboardRoute() {
  return (
    <AuthGuard allowedRoles={["TEAM_MEMBER"]}>
      <TeamDashboardPage />
    </AuthGuard>
  )
}
