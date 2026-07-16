"use client"

import { ArrowRight, Loader2, Mail, X } from "lucide-react"
import { useState } from "react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/auth/useAuth"
import { useMoveStage } from "@/hooks/query/useTickets"
import { STAGE_MAP } from "@/components/tickets/ticket-bits"
import type { Ticket, TicketStage } from "@/types"

/** Suggested client-facing comment per target stage - editable, never silent. */
function defaultComment(stage: TicketStage, category: string): string {
  const map: Record<TicketStage, string> = {
    NEW: "Returning this ticket to the queue.",
    ACCEPTED: "This has been acknowledged and queued for work.",
    WORKING: `We're actively working on your ${category} issue.`,
    PENDING: "We need a bit more information from you - please reply when you can.",
    REVIEW: "Work is complete and awaiting final sign-off from an admin.",
    RESOLVED: "This issue has been resolved. Thanks for your patience!",
  }
  return map[stage]
}

/**
 * Every stage move goes through this modal - a comment is mandatory for team
 * members (the backend enforces it too) and strongly encouraged for owners.
 */
export function StageMoveModal({
  ticket,
  targetStage,
  onClose,
  onDone,
}: {
  ticket: Ticket
  targetStage: TicketStage
  onClose: () => void
  onDone?: () => void
}) {
  const { isOwner } = useAuth()
  const moveStage = useMoveStage()
  const [comment, setComment] = useState(defaultComment(targetStage, ticket.category))
  const [sendEmail, setSendEmail] = useState(true)

  const from = STAGE_MAP[ticket.stage]
  const to = STAGE_MAP[targetStage]
  const commentMissing = !comment.trim()

  const submit = () => {
    if (commentMissing && !isOwner) {
      toast.error("A comment is required to move the ticket")
      return
    }
    moveStage.mutate(
      { id: ticket.id, data: { stage: targetStage, comment: comment.trim(), sendEmail } },
      {
        onSuccess: () => {
          toast.success(`#${ticket.displayId} moved to ${to.name}`)
          onDone?.()
          onClose()
        },
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not move the ticket"),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-gray-900">Move ticket</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-[12px] text-gray-500 mb-2 truncate">
              <span className="font-mono">#{ticket.displayId}</span> · {ticket.subject}
            </p>
            <div className="flex items-center gap-2.5 text-[13px] font-semibold">
              <span className="inline-flex items-center gap-1.5" style={{ color: from.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: from.color }} />
                {from.name}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-300" />
              <span className="inline-flex items-center gap-1.5" style={{ color: to.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: to.color }} />
                {to.name}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
              Comment {isOwner ? <span className="text-gray-400 font-normal">(what's happening with this ticket)</span> : <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full text-[13px] border border-gray-200 rounded-lg p-3 bg-white min-h-[90px] focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Explain this stage change for the record…"
            />
            {commentMissing && !isOwner && (
              <p className="text-[11.5px] text-red-500 mt-1">A comment is required - it becomes the client-facing update.</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-[12.5px] text-gray-600 cursor-pointer">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="rounded" />
            <Mail className="w-3.5 h-3.5" /> Email this update to the client
          </label>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={moveStage.isPending} className="rounded-lg text-gray-500">
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={moveStage.isPending || (commentMissing && !isOwner)}
            className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white"
          >
            {moveStage.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Moving…
              </>
            ) : (
              <>Move to {to.name}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
