"use client"

import { formatDistanceToNow } from "date-fns"
import { ClipboardCheck, Loader2 } from "lucide-react"
import { useState } from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal"
import { Avatar, PriorityBadge } from "@/components/tickets/ticket-bits"
import { useReviewTickets } from "@/hooks/query/useTickets"

function ReviewPage() {
  const { data: tickets, isLoading } = useReviewTickets()
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <AppShell title="Review queue" subtitle="Work your team marked as done - approve to close, or send back with feedback.">
      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
      ) : !tickets?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <ClipboardCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nothing waiting for review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(tickets as any[]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpenId(t.id)}
              className="w-full text-left bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-gray-400">#{t.displayId}</span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <p className="text-[14px] font-semibold text-gray-900">{t.subject}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{t.subAccount?.name}</p>
                  {t.resolveNote && (
                    <p className="text-[12.5px] text-gray-600 mt-2.5 bg-cyan-50/60 border border-cyan-100 rounded-lg px-3 py-2 leading-relaxed">
                      “{t.resolveNote}”
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500 flex-shrink-0">
                  <Avatar initials={t.assignee?.initials} name={t.assignee?.name} muted={!t.assignee} />
                  <div className="leading-tight">
                    <p className="font-medium text-gray-700">{t.assignee?.name ?? "Unassigned"}</p>
                    <p className="text-[10.5px] text-gray-400">{formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {openId && <TicketDetailModal ticketId={openId} onClose={() => setOpenId(null)} />}
    </AppShell>
  )
}

export default function AdminReviewPage() {
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <ReviewPage />
    </AuthGuard>
  )
}
