"use client"

import { format } from "date-fns"
import { Check, Loader2, Lock, Mail, Send, X } from "lucide-react"
import { useState } from "react"
import { toast } from "@/lib/toast"
import { canMoveTo } from "@/components/board/KanbanBoard"
import { StageMoveModal } from "@/components/tickets/StageMoveModal"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { STAGES } from "@/constants"
import { useAuth } from "@/hooks/auth/useAuth"
import {
  useAddComment,
  useApproveTicket,
  useAssignTicket,
  useRejectTicket,
  useTicket,
  useUploadAttachments,
} from "@/hooks/query/useTickets"
import { useTeamMembers } from "@/hooks/query/useTeamMembers"
import { cn } from "@/lib/utils"
import type { TicketStage } from "@/types"
import { AttachmentList, AttachmentPicker } from "./attachments"
import { Avatar, STAGE_MAP, StageBadge, PriorityBadge } from "./ticket-bits"

function errMsg(error: any, fallback: string) {
  return error?.response?.data?.error?.message || fallback
}

export function TicketDetailModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { user, isOwner, isSubAccount } = useAuth()
  const { data: ticket, isLoading } = useTicket(ticketId)
  // Owner-only endpoint - only fetched when the reassign dropdown will render.
  const { data: team } = useTeamMembers({ enabled: isOwner })

  const assign = useAssignTicket()
  const addComment = useAddComment()
  const approve = useApproveTicket()
  const reject = useRejectTicket()
  const uploadAttachments = useUploadAttachments()

  const [comment, setComment] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [reviewNote, setReviewNote] = useState("")
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  // Every stage move goes through the mandatory-comment modal - never silent.
  const [moveTarget, setMoveTarget] = useState<TicketStage | null>(null)

  if (isLoading || !ticket) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  const canComment = !isSubAccount || ticket.stage === "PENDING" || ticket.stage === "REVIEW"
  const movable = STAGES.filter((s) => canMoveTo(user?.role, ticket.stage, s.key))
  const isAdminReview = isOwner && ticket.stage === "REVIEW"

  const posting = addComment.isPending || uploadAttachments.isPending

  const submitComment = async () => {
    const hasComment = comment.trim().length > 0
    if (!hasComment && replyFiles.length === 0) return
    try {
      // Post the comment first (if any) so files can be tied to that reply;
      // files-only uploads attach at the ticket level.
      let historyId: string | undefined
      if (hasComment) {
        const history = await addComment.mutateAsync({
          id: ticket.id,
          data: { comment: comment.trim(), isInternalNote: isInternal, sendEmail },
        })
        historyId = history.id
      }
      if (replyFiles.length) {
        await uploadAttachments.mutateAsync({ id: ticket.id, files: replyFiles, historyId })
      }
      setComment("")
      setReplyFiles([])
      toast.success(hasComment ? (isInternal ? "Internal note added" : "Reply posted") : "Files uploaded")
    } catch (e) {
      toast.error(errMsg(e, "Could not post the comment"))
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-xs font-mono text-gray-400">#{ticket.displayId}</span>
              <StageBadge stage={ticket.stage} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{ticket.subject}</h2>
            <p className="text-xs text-gray-500 mt-1">
              {ticket.subAccount?.name} · {ticket.category} · opened {format(new Date(ticket.createdAt), "MMM d, HH:mm")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Description */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Description</h3>
            <p className="text-[13.5px] text-gray-700 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </section>

          {/* Ticket-level attachments (from submission or files-only uploads) */}
          {ticket.attachments.some((a) => !a.historyId) && (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Attachments</h3>
              <AttachmentList attachments={ticket.attachments.filter((a) => !a.historyId)} />
            </section>
          )}

          {/* Assignment (staff only) */}
          {!isSubAccount && (
            <section className="flex items-center justify-between gap-4 bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Avatar initials={ticket.assignee?.initials} name={ticket.assignee?.name} muted={!ticket.assignee} />
                <span className="text-[13px] text-gray-700">
                  {ticket.assignee ? ticket.assignee.name : "Unassigned - waiting in queue"}
                </span>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2">
                  {assign.isPending && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                  <Select
                    value={ticket.assignee?.id ?? "unassigned"}
                    disabled={assign.isPending}
                    onValueChange={(value) => {
                      const assigneeId = value === "unassigned" ? null : value
                      assign.mutate(
                        { id: ticket.id, assigneeId },
                        {
                          onSuccess: () => toast.success(assigneeId ? "Ticket reassigned" : "Assignee removed"),
                          onError: (err) => toast.error(errMsg(err, "Assignment failed")),
                        },
                      )
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={assign.isPending ? "Assigning…" : "Unassigned"} />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {team?.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                          {m.isAvailable ? "" : " (away)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </section>
          )}

          {/* Stage actions (staff only) - each opens the mandatory comment modal */}
          {movable.length > 0 && (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Move to stage</h3>
              <div className="flex flex-wrap gap-2">
                {movable.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setMoveTarget(s.key)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-400 disabled:opacity-50 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Review gate */}
          {isAdminReview && (
            <section className="bg-cyan-50/60 border border-cyan-100 rounded-xl p-4">
              <h3 className="text-[13px] font-bold text-gray-900 mb-1">Review & approve</h3>
              <p className="text-[12px] text-gray-500 mb-3">
                {ticket.assignee?.name ?? "The assignee"} marked this done. Approve to close, or send it back with feedback.
              </p>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Optional note (required when rejecting)"
                className="w-full text-[13px] border border-gray-200 rounded-lg p-2.5 bg-white min-h-[64px] focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
              <div className="flex gap-2 mt-2.5">
                <Button
                  size="sm"
                  disabled={approve.isPending}
                  onClick={() =>
                    approve.mutate(
                      { id: ticket.id, note: reviewNote || undefined },
                      {
                        onSuccess: () => { toast.success("Ticket approved and closed"); onClose() },
                        onError: (e) => toast.error(errMsg(e, "Approval failed")),
                      },
                    )
                  }
                  className="rounded-lg bg-black hover:bg-gray-800 text-white"
                >
                  <Check className="w-4 h-4 mr-1.5" /> Approve & close
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reject.isPending}
                  onClick={() => {
                    if (!reviewNote.trim()) {
                      toast.error("Add a note explaining what needs another pass")
                      return
                    }
                    reject.mutate(
                      { id: ticket.id, note: reviewNote.trim() },
                      {
                        onSuccess: () => { toast.success("Sent back to Working"); onClose() },
                        onError: (e) => toast.error(errMsg(e, "Rejection failed")),
                      },
                    )
                  }}
                  className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                >
                  Reject - back to Working
                </Button>
              </div>
            </section>
          )}

          {/* Timeline */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Timeline</h3>
            <div className="space-y-0">
              {ticket.history.map((h) => (
                <div key={h.id} className={cn("flex gap-3 py-3 border-b border-gray-50 last:border-0", h.isInternalNote && "bg-amber-50/60 -mx-2 px-2 rounded-lg border-b-0 my-1")}>
                  <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: STAGE_MAP[h.stage]?.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12.5px] font-semibold text-gray-900">{STAGE_MAP[h.stage]?.name}</span>
                      <span className="text-[10.5px] font-mono text-gray-400">
                        {format(new Date(h.createdAt), "MMM d, HH:mm")} · {h.actor?.name ?? "System"}
                      </span>
                      {h.isInternalNote && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 rounded-md px-1.5 py-0.5">
                          <Lock className="w-2.5 h-2.5" /> Internal
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{h.comment}</p>
                    {ticket.attachments.some((a) => a.historyId === h.id) && (
                      <AttachmentList attachments={ticket.attachments.filter((a) => a.historyId === h.id)} compact />
                    )}
                    {h.wasEmailed && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-blue-600 mt-1.5">
                        <Mail className="w-3 h-3" /> Emailed to client
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Comment box */}
          {canComment ? (
            <section className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={isSubAccount ? "Add the information the team asked for…" : isInternal ? "Internal note - never shown or emailed to the client" : "Write a reply to the client…"}
                className={cn(
                  "w-full text-[13px] border rounded-lg p-2.5 bg-white min-h-[70px] focus:outline-none focus:ring-2",
                  isInternal ? "border-amber-200 focus:ring-amber-200" : "border-gray-200 focus:ring-black/10",
                )}
              />
              {/* Internal notes are staff-only and never emailed, so no files there. */}
              {!isInternal && (
                <div className="mt-2.5">
                  <AttachmentPicker files={replyFiles} onChange={setReplyFiles} disabled={posting} />
                </div>
              )}

              <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
                {!isSubAccount ? (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-[12px] text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded" />
                      <Lock className="w-3 h-3" /> Internal note
                    </label>
                    {!isInternal && (
                      <label className="flex items-center gap-1.5 text-[12px] text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="rounded" />
                        <Mail className="w-3 h-3" /> Email client
                      </label>
                    )}
                  </div>
                ) : <span />}
                <Button size="sm" disabled={posting || (!comment.trim() && replyFiles.length === 0)} onClick={submitComment} className="rounded-lg bg-black hover:bg-gray-800 text-white">
                  {posting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                  {isSubAccount ? "Send reply" : isInternal ? "Add note" : "Post reply"}
                </Button>
              </div>
            </section>
          ) : isSubAccount ? (
            <p className="text-[12px] text-gray-400 text-center py-2">
              You can reply here once the team asks for information (Pending stage).
            </p>
          ) : null}
        </div>
      </div>

      {moveTarget && (
        // Stop propagation so clicking/closing the move modal doesn't bubble up
        // to the ticket-detail backdrop and close it too.
        <div onClick={(e) => e.stopPropagation()}>
          <StageMoveModal
            ticket={ticket}
            targetStage={moveTarget}
            onClose={() => setMoveTarget(null)}
          />
        </div>
      )}
    </div>
  )
}
