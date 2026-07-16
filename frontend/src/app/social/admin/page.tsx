"use client"

import { Loader2, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { NewOrderModal } from "@/components/social/NewOrderModal"
import { OrderDetailModal } from "@/components/social/OrderDetailModal"
import { OrdersTable } from "@/components/social/OrdersTable"
import { ORDER_TYPES } from "@/components/social/social-bits"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSocialOrders } from "@/hooks/query/useSocial"
import { useSubAccounts } from "@/hooks/query/useTeamMembers"

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PROPOSED", label: "Proposed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

function AdminSocialPage() {
  const [status, setStatus] = useState("")
  const [subAccountId, setSubAccountId] = useState("")
  const [orderType, setOrderType] = useState("")
  const { data: orders, isLoading } = useSocialOrders({
    ...(status && { status }),
    ...(subAccountId && { subAccountId }),
    ...(orderType && { orderType }),
  })
  const { data: subAccounts } = useSubAccounts()
  const [openId, setOpenId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  // Needs-attention counts across the unfiltered set aren't worth a second
  // request - derive from the current list when unfiltered.
  const totals = useMemo(() => {
    if (!orders || status || subAccountId || orderType) return null
    return {
      submitted: orders.filter((o) => o.status === "SUBMITTED").length,
      awaitingClient: orders.filter((o) => o.status === "PROPOSED").length,
      inProgress: orders.filter((o) => o.status === "IN_PROGRESS" || o.status === "ACCEPTED").length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
    }
  }, [orders, status, subAccountId, orderType])

  return (
    <AppShell
      title="Social orders"
      subtitle="Design and content orders from your clients - accept, assign, and deliver."
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-auto min-w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subAccountId || "all"} onValueChange={(v) => setSubAccountId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-auto min-w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {subAccounts?.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={orderType || "all"} onValueChange={(v) => setOrderType(v === "all" ? "" : v)}>
            <SelectTrigger className="w-auto min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ORDER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setNewOpen(true)} className="rounded-xl bg-black hover:bg-gray-800 text-white h-10 px-4">
            <Plus className="w-4 h-4 mr-1.5" /> Propose an order
          </Button>
        </div>
      }
    >
      {totals && (
        <div className="flex flex-wrap gap-2 text-[12px] text-gray-500 mb-4">
          {totals.submitted > 0 && (
            <span className="bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-amber-700">
              <strong>{totals.submitted}</strong> waiting for acceptance
            </span>
          )}
          {totals.awaitingClient > 0 && (
            <span className="bg-white border border-violet-200 rounded-lg px-2.5 py-1 text-violet-700">
              <strong>{totals.awaitingClient}</strong> awaiting client approval
            </span>
          )}
          <span className="bg-white border border-sky-200 rounded-lg px-2.5 py-1 text-sky-700">
            <strong>{totals.inProgress}</strong> in progress
          </span>
          {totals.delivered > 0 && (
            <span className="bg-white border border-cyan-200 rounded-lg px-2.5 py-1 text-cyan-700">
              <strong>{totals.delivered}</strong> delivered, unconfirmed
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
        </div>
      ) : (
        <OrdersTable
          orders={orders ?? []}
          onOpen={setOpenId}
          emptyText="No social orders yet - clients submit them from their portal, or propose one yourself."
        />
      )}

      {openId && <OrderDetailModal orderId={openId} onClose={() => setOpenId(null)} />}
      {newOpen && <NewOrderModal onClose={() => setNewOpen(false)} />}
    </AppShell>
  )
}

export default function Page() {
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <AdminSocialPage />
    </AuthGuard>
  )
}
