"use client"

import { format, formatDistanceToNow } from "date-fns"
import { ArrowLeft, CalendarDays, Loader2, Mail, MapPin } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { OrderDetailModal } from "@/components/social/OrderDetailModal"
import { OrderStatusBadge } from "@/components/social/social-bits"
import { Avatar, PriorityBadge, StageBadge } from "@/components/tickets/ticket-bits"
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal"
import { useSubAccountProfile } from "@/hooks/query/useSocial"
import { cn } from "@/lib/utils"

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneClass =
    tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-red-600" : "text-gray-900"
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
      <p className={cn("text-[22px] font-bold leading-none", value === 0 ? "text-gray-300" : toneClass)}>{value}</p>
      <p className="text-[11.5px] text-gray-400 mt-1.5">{label}</p>
    </div>
  )
}

function SubAccountProfilePage() {
  const params = useParams<{ id: string }>()
  const { data, isLoading } = useSubAccountProfile(params.id)
  const [openTicketId, setOpenTicketId] = useState<string | null>(null)
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)

  if (isLoading || !data) {
    return (
      <AppShell title="Client profile" subtitle="Loading…">
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
        </div>
      </AppShell>
    )
  }

  const { client, ticketStats, orderStats, recentTickets, recentOrders } = data

  return (
    <AppShell
      title={client.name}
      subtitle="In-depth client view - tickets, social orders, and activity."
      actions={
        <Link
          href="/admin/sub-accounts"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All sub-accounts
        </Link>
      }
    >
      {/* Identity card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-center gap-4 flex-wrap">
        <Avatar initials={client.initials} name={client.name} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{client.name}</p>
          <div className="flex items-center gap-3 flex-wrap text-[12px] text-gray-400 mt-0.5">
            {client.contactEmail && (
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3 h-3" /> {client.contactEmail}
              </span>
            )}
            {client.locationId && (
              <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                <MapPin className="w-3 h-3" /> {client.locationId}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> client since {format(new Date(client.createdAt), "MMM yyyy")}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            client.accessStatus === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : client.accessStatus === "BLOCKED"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-amber-50 text-amber-700 border-amber-200",
          )}
        >
          {client.accessStatus.charAt(0) + client.accessStatus.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Ticket stats */}
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Support tickets</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Total tickets" value={ticketStats.total} />
        <Stat label="Open" value={ticketStats.open} tone="warn" />
        <Stat label="In review" value={ticketStats.inReview} />
        <Stat label="Solved" value={ticketStats.solved} tone="good" />
      </div>

      {/* Order stats */}
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Social orders</h3>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-8">
        <Stat label="Total orders" value={orderStats.total} />
        <Stat label="Active" value={orderStats.active} />
        <Stat label="Awaiting approval" value={orderStats.awaitingApproval} tone="warn" />
        <Stat label="Delivered, unconfirmed" value={orderStats.delivered} tone="warn" />
        <Stat label="Overdue" value={orderStats.overdue} tone="bad" />
        <Stat label="Delivered successfully" value={orderStats.completed} tone="good" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent tickets */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-[13px] font-bold text-gray-900">Recent tickets</h3>
          </div>
          {!recentTickets.length ? (
            <p className="px-5 py-8 text-center text-[12.5px] text-gray-400">No tickets yet.</p>
          ) : (
            recentTickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setOpenTicketId(t.id)}
                className="w-full text-left px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10.5px] font-mono text-gray-400">#{t.displayId}</span>
                      <PriorityBadge priority={t.priority as never} />
                    </div>
                    <p className="text-[13px] font-medium text-gray-900 truncate mt-0.5">{t.subject}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <StageBadge stage={t.stage as never} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-[13px] font-bold text-gray-900">Recent social orders</h3>
          </div>
          {!recentOrders.length ? (
            <p className="px-5 py-8 text-center text-[12.5px] text-gray-400">No orders yet.</p>
          ) : (
            recentOrders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOpenOrderId(o.id)}
                className="w-full text-left px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-mono text-gray-400">#{o.displayId}</span>
                    <p className="text-[13px] font-medium text-gray-900 truncate mt-0.5">{o.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(o.updatedAt), { addSuffix: true })}
                      {o.dueDate ? ` · due ${new Date(o.dueDate).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} staffView />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {openTicketId && <TicketDetailModal ticketId={openTicketId} onClose={() => setOpenTicketId(null)} />}
      {openOrderId && <OrderDetailModal orderId={openOrderId} onClose={() => setOpenOrderId(null)} />}
    </AppShell>
  )
}

export default function Page() {
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <SubAccountProfilePage />
    </AuthGuard>
  )
}
