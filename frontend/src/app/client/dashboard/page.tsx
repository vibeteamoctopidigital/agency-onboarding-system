"use client"

import { formatDistanceToNow } from "date-fns"
import { Loader2, MessageSquareWarning, Paperclip, Plus, Tag, TicketCheck } from "lucide-react"
import { useState } from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { ForcePasswordModal } from "@/components/auth/ForcePasswordModal"
import { AppShell } from "@/components/layouts/AppShell"
import { NewTicketModal } from "@/components/tickets/NewTicketModal"
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal"
import { PriorityBadge, StageBadge } from "@/components/tickets/ticket-bits"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants"
import { useMySubmittedTickets } from "@/hooks/query/useTickets"

function ClientDashboard() {
  const STAGE_STYLES: Record<string, { bar: string; note: string }> = {
  OPEN:        { bar: "bg-blue-400",    note: "text-blue-600" },
  IN_PROGRESS: { bar: "bg-amber-400",   note: "text-amber-600" },
  PENDING:     { bar: "bg-purple-400",  note: "text-purple-600" },
  RESOLVED:    { bar: "bg-emerald-400", note: "text-emerald-600" },
  CLOSED:      { bar: "bg-gray-300",    note: "text-gray-500" },
};
const getStageStyle = (stage: string) => STAGE_STYLES[stage] ?? STAGE_STYLES.CLOSED;



  const { data: tickets, isLoading } = useMySubmittedTickets()
  const [openId, setOpenId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  return (
    <AppShell
      title="My tickets"
      subtitle="Track every ticket you've submitted and its current stage."
      actions={
        <Button onClick={() => setNewOpen(true)} className="rounded-xl bg-black hover:bg-gray-800 text-white h-10">
          <Plus className="w-4 h-4 mr-1.5" /> Submit a ticket
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
      ) : !tickets?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <TicketCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No tickets yet</p>
          <p className="text-gray-400 text-[12.5px] mt-1">Submit your first ticket and we'll route it to the right person.</p>
          <Button onClick={() => setNewOpen(true)} className="mt-5 rounded-xl bg-black hover:bg-gray-800 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Submit a ticket
          </Button>
        </div>
      ) : (<div className="space-y-3 grid grid-cols-2 grid-rows-2 gap-4">
  {tickets.map((t) => {
    const stageStyle = getStageStyle(t.stage);
    const isPending = t.stage === "PENDING";

    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setOpenId(t.id)}
        className={`  relative w-full text-left bg-white rounded-2xl border border-gray-100 pl-6 pr-5 py-5 overflow-hidden
          hover:border-gray-300 hover:shadow-sm transition-all
          ${isPending ? "ring-1 ring-purple-100" : ""}`}
      >
        {/* stage accent bar */}
        <span className={`absolute left-0 top-0 h-full w-1.5 ${stageStyle.bar}`} />

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1 pr-2">
            {/* category + priority */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {t.category && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                  <Tag className="w-3 h-3" />
                  {t.category}
                </span>
              )}
              <PriorityBadge priority={t.priority} />
            </div>

            {/* subject + description */}
            <p className="text-[14.5px] font-semibold text-gray-900">{t.subject}</p>
            {t.description && (
              <p className="text-[12.5px] text-gray-500 mt-1 line-clamp-2">{t.description}</p>
            )}

            {/* assignee / attachments / updated */}
            <div className="flex items-center gap-3 mt-3 flex-wrap text-[11.5px] text-gray-400">
              {t.assignee?.name && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[9px] font-semibold flex items-center justify-center">
                    {t.assignee.name.charAt(0).toUpperCase()}
                  </span>
                  {t.assignee.name}
                </span>
              )}

              {t.attachments?.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {t.attachments.slice(0, 3).map((a, i) => (
                    <img
                      key={i}
                      src={a.fileUrl}
                      alt=""
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(a.fileUrl, "_blank");
                      }}
                      className="w-5 h-5 rounded object-cover border border-gray-200 cursor-zoom-in hover:opacity-80"
                    />
                  ))}
                  {t.attachments.length > 3 && <span>+{t.attachments.length - 3}</span>}
                </span>
              )}

              <span>Updated {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</span>
            </div>

            {isPending && (
              <p className={`text-[11.5px] font-medium mt-2 flex items-center gap-1 ${stageStyle.note}`}>
                <MessageSquareWarning className="w-3.5 h-3.5" />
                The team asked for information - tap to reply
              </p>
            )}
          </div>

          <StageBadge stage={t.stage} />
        </div>
      </button>
    );
  })}
</div>
      )}
      {openId && <TicketDetailModal ticketId={openId} onClose={() => setOpenId(null)} />}
      {newOpen && <NewTicketModal onClose={() => setNewOpen(false)} />}
    </AppShell>
  )
}

export default function ClientDashboardPage() {
  return (
    <AuthGuard allowedRoles={["SUB_ACCOUNT"]} redirectTo={ROUTES.PORTAL}>
      <ClientDashboard />
      <ForcePasswordModal />
    </AuthGuard>
  )
}
