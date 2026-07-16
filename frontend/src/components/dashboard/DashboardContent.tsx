"use client"

import { ArrowRight, CheckCircle2, ClipboardCheck, Inbox, Loader2, Ticket as TicketIcon } from "lucide-react"
import Link from "next/link"
import { toast } from "@/lib/toast"
import { Avatar } from "@/components/tickets/ticket-bits"
import { STAGES } from "@/constants"
import { useDashboardAnalytics } from "@/hooks/query/useAnalytics"
import { useMyStats, useToggleAvailability } from "@/hooks/query/useTeamMembers"
import { useReviewTickets } from "@/hooks/query/useTickets"
import { cn } from "@/lib/utils"

// GHL-style stat card: small gray label on top, big bold value under it -
// mirrors GHL's own Payments summary cards so the embed feels native.
function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-[12.5px] font-medium text-gray-500">{label}</p>
      <p className={cn("text-[28px] font-bold mt-1.5 leading-none", accent ? "text-blue-600" : "text-gray-900")}>{value}</p>
    </div>
  )
}

export function OwnerDashboardContent() {
  const { data, isLoading } = useDashboardAnalytics()
  const { data: review } = useReviewTickets()

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>

  const breakdown = data?.stageBreakdown ?? {}
  const total = data?.total ?? 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total tickets" value={data?.total ?? 0} accent />
        <StatCard label="Resolved" value={data?.resolved ?? 0} />
        <StatCard label="Unassigned" value={data?.unassigned ?? 0} />
        <StatCard label="Waiting for review" value={review?.length ?? 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-[13px] font-bold text-gray-900 mb-4">Tickets per stage</h3>
          {total === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No tickets yet.</p>
          ) : (
            <div className="space-y-3">
              {STAGES.map((s) => {
                const count = breakdown[s.key] ?? 0
                const pct = total ? Math.round((count / total) * 100) : 0
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="w-28 text-[12px] text-gray-600 flex-shrink-0">{s.name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                    </div>
                    <span className="w-8 text-right text-[12px] font-semibold text-gray-700">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-[13px] font-bold text-gray-900 mb-4">Team workload</h3>
          {!data?.agentStats?.length ? (
            <p className="text-sm text-gray-400 py-6 text-center">No team members yet.</p>
          ) : (
            <div className="space-y-3">
              {data.agentStats.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <Avatar initials={a.initials} name={a.name} />
                  <span className="flex-1 text-[13px] text-gray-700">{a.name}</span>
                  <span className="text-[11.5px] text-gray-400">{a.open} open</span>
                  <span className="text-[11.5px] text-green-600 font-medium">{a.solved} solved</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { href: "/admin/board", icon: TicketIcon, label: "Open the board", desc: "Work the full pipeline" },
          { href: "/admin/review", icon: ClipboardCheck, label: "Review queue", desc: `${review?.length ?? 0} waiting for sign-off` },
          { href: "/admin/unassigned", icon: Inbox, label: "Unassigned", desc: `${data?.unassigned ?? 0} need a hand` },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-300 transition-colors group">
            <l.icon className="w-5 h-5 text-gray-400 mb-3" />
            <p className="text-[13.5px] font-semibold text-gray-900 flex items-center gap-1.5">
              {l.label}
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function TeamDashboardContent() {
  const { data: stats, isLoading } = useMyStats()
  const toggle = useToggleAvailability()

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Assigned to me" value={stats?.totalAssigned ?? 0} accent />
        <StatCard label="Open right now" value={stats?.openCount ?? 0} />
        <StatCard label="In review" value={stats?.reviewCount ?? 0} />
        <StatCard label="Solved" value={stats?.totalSolved ?? 0} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-[13.5px] font-bold text-gray-900">Available for assignment</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">When you're away, auto-assignment skips you.</p>
        </div>
        <button
          type="button"
          onClick={() =>
            toggle.mutate(undefined, {
              onSuccess: (r: any) => toast.success(r.isAvailable ? "You're available for new tickets" : "You're marked as away"),
              onError: () => toast.error("Could not update availability"),
            })
          }
          className={cn(
            "relative w-14 h-8 rounded-full transition-colors flex-shrink-0",
            stats?.isAvailable ? "bg-green-500" : "bg-gray-200",
          )}
          aria-label="Toggle availability"
        >
          <span
            className={cn(
              "absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all",
              stats?.isAvailable ? "left-7" : "left-1",
            )}
          />
        </button>
      </div>

      <Link href="/team/board" className="block bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-300 transition-colors">
        <p className="text-[13.5px] font-semibold text-gray-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gray-400" /> Go to my board
          <ArrowRight className="w-3.5 h-3.5" />
        </p>
      </Link>
    </div>
  )
}
