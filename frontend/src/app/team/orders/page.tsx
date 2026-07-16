"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { OrderDetailModal } from "@/components/social/OrderDetailModal"
import { OrdersTable } from "@/components/social/OrdersTable"
import { useSocialOrders } from "@/hooks/query/useSocial"

function TeamOrdersPage() {
  // The backend scopes the list to orders assigned to this team member.
  const { data: orders, isLoading } = useSocialOrders()
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <AppShell title="My orders" subtitle="Social orders assigned to you - post progress and deliver.">
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
        </div>
      ) : (
        <OrdersTable
          orders={orders ?? []}
          onOpen={setOpenId}
          emptyText="No orders assigned to you yet."
        />
      )}
      {openId && <OrderDetailModal orderId={openId} onClose={() => setOpenId(null)} />}
    </AppShell>
  )
}

export default function Page() {
  return (
    <AuthGuard allowedRoles={["TEAM_MEMBER"]}>
      <TeamOrdersPage />
    </AuthGuard>
  )
}
