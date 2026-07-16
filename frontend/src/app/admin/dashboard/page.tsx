"use client"

import { HardDrive } from "lucide-react"
import { useState } from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { OwnerDashboardContent, TeamDashboardContent } from "@/components/dashboard/DashboardContent"
import { MediaStorageModal } from "@/components/settings/MediaStorageModal"
import { useAuth } from "@/hooks/auth/useAuth"

function AdminDashboard() {
  const { user, isOwner } = useAuth()

  return (
    <AppShell
      title={`Hello, ${user?.name?.split(" ")[0] ?? ""}!`}
      subtitle={isOwner ? "Here's where your support desk stands." : "Your workload at a glance."}
      
    >
      {isOwner ? <OwnerDashboardContent /> : <TeamDashboardContent />}
      
    </AppShell>
  )
}

export default function AdminDashboardPage() {
  // Strictly owner-only: a team member landing here is bounced to /team/dashboard.
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <AdminDashboard />
    </AuthGuard>
  )
}
