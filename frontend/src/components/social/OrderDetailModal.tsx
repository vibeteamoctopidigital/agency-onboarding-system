"use client"

import { format, formatDistanceToNow } from "date-fns"
import { CalendarDays, Check, CheckCircle2, Copy, Loader2, Send, Undo2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "@/lib/toast"
import { AttachmentList, AttachmentPicker } from "@/components/tickets/attachments"
import { Avatar } from "@/components/tickets/ticket-bits"
import { Button } from "@/components/ui/button"
import { EditOrderModal } from "./EditOrderModal"
import { useAuth } from "@/hooks/auth/useAuth"
import {
  useAcceptOrder,
  useAddOrderNote,
  useAssignOrder,
  useCancelOrder,
  useConfirmOrder,
  useRequestOrderChanges,
  useRespondToProposal,
  useSetOrderStatus,
  useSocialOrder,
  useUploadOrderFiles,
} from "@/hooks/query/useSocial"
import { useTeamMembers } from "@/hooks/query/useTeamMembers"
import { cn } from "@/lib/utils"
import { ORDER_STATUS_META, OrderStatusBadge, isOverdue, orderTypeLabel } from "./social-bits"

function errMsg(error: any, fallback: string) {
  return error?.response?.data?.error?.message || fallback
}

export function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { isOwner, isSubAccount } = useAuth()
  const { data: order, isLoading } = useSocialOrder(orderId)
  const { data: team } = useTeamMembers({ enabled: isOwner })

  const accept = useAcceptOrder()
  const respond = useRespondToProposal()
  const assign = useAssignOrder()
  const setStatus = useSetOrderStatus()
  const addNote = useAddOrderNote()
  const confirm = useConfirmOrder()
  const requestChanges = useRequestOrderChanges()
  const cancel = useCancelOrder()
  const uploadFiles = useUploadOrderFiles()

  const [note, setNote] = useState("")
  const [changesNote, setChangesNote] = useState("")
  const [showChanges, setShowChanges] = useState(false)
  const [editAssignees, setEditAssignees] = useState(false)
  const [pendingAssignees, setPendingAssignees] = useState<string[] | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [showAllUpdates, setShowAllUpdates] = useState(false)

  if (isLoading || !order) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  const isStaff = !isSubAccount
  const open = !["COMPLETED", "CANCELLED"].includes(order.status)
  const assigneeIds = pendingAssignees ?? order.assignees.map((a) => a.id)
  const onErr = (fallback: string) => (e: any) => toast.error(errMsg(e, fallback))

  const toggleAssignee = (id: string) => {
    setPendingAssignees(assigneeIds.includes(id) ? assigneeIds.filter((a) => a !== id) : [...assigneeIds, id])
  }

  const saveAssignees = () =>
    assign.mutate(
      { id: order.id, assigneeIds },
      {
        onSuccess: () => {
          toast.success("Assignees updated")
          setEditAssignees(false)
          setPendingAssignees(null)
        },
        onError: onErr("Could not update assignees"),
      },
    )

  if (isEditing) {
    return <EditOrderModal order={order} onClose={() => setIsEditing(false)} />
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl my-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-xs font-mono text-gray-400">#{order.displayId}</span>
              <OrderStatusBadge status={order.status} staffView={isStaff} />
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                {orderTypeLabel(order)}
              </span>
              {isOverdue(order) && (
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600">
                  Overdue
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{order.title}</h2>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
              {order.subAccount?.name} · opened {format(new Date(order.createdAt), "MMM d, HH:mm")}
              {order.dueDate && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> due {format(new Date(order.dueDate), "MMM d, yyyy")}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
              >
                Edit
              </button>
            )}
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Proposal banner - the client approves or declines */}
          {order.status === "PROPOSED" && (
            <section className="bg-violet-50/70 border border-violet-200 rounded-xl p-4">
              <h3 className="text-[13px] font-bold text-gray-900 mb-1">
                {isSubAccount ? "Your agency proposed this order" : "Waiting for the client's approval"}
              </h3>
              {order.proposalNote && (
                <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
                  <span className="font-semibold text-gray-800">{order.createdBy?.name}:</span> “{order.proposalNote}”
                </p>
              )}
              {isSubAccount && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    disabled={respond.isPending}
                    onClick={() =>
                      respond.mutate(
                        { id: order.id, approve: true },
                        { onSuccess: () => toast.success("Proposal approved - the agency will start soon"), onError: onErr("Could not approve") },
                      )
                    }
                    className="rounded-lg bg-black hover:bg-gray-800 text-white h-9"
                  >
                    {respond.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
                    Approve order
                  </Button>
                  <Button
                    variant="outline"
                    disabled={respond.isPending}
                    onClick={() =>
                      respond.mutate(
                        { id: order.id, approve: false },
                        { onSuccess: () => toast.success("Proposal declined"), onError: onErr("Could not decline") },
                      )
                    }
                    className="rounded-lg border-gray-200 h-9 text-gray-600"
                  >
                    Decline
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Details */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Requirements</h3>
            <p className="text-[13.5px] text-gray-700 leading-relaxed whitespace-pre-wrap">{order.details}</p>
            
            {order.hashtags && order.hashtags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {order.hashtags.map((tag) => (
                  <span key={tag} className="group flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-100 pl-2.5 pr-1.5 py-1 text-[11px] font-medium text-blue-700">
                    #{tag}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(`#${tag}`)
                        toast.success("Hashtag copied")
                      }}
                      className="text-blue-400 hover:text-blue-700 transition-colors bg-white rounded p-0.5 shadow-sm opacity-0 group-hover:opacity-100"
                      title="Copy hashtag"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {order.hashtags.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(order.hashtags.map(t => `#${t}`).join(" "))
                      toast.success("All hashtags copied")
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors border border-transparent hover:border-gray-200 ml-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy all
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Assignees (staff view; owner can edit - one OR many members) */}
          {isStaff && (
            <section className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {order.assignees.length === 0 ? (
                    <span className="text-[13px] text-gray-500">No one assigned yet</span>
                  ) : (
                    order.assignees.map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg pl-1 pr-2.5 py-1">
                        <Avatar initials={a.initials} name={a.name} />
                        <span className="text-[12.5px] font-medium text-gray-800">{a.name}</span>
                      </span>
                    ))
                  )}
                </div>
                {isOwner && open && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditAssignees(!editAssignees)
                      setPendingAssignees(null)
                    }}
                    className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 flex-shrink-0"
                  >
                    {editAssignees ? "Close" : "Edit"}
                  </button>
                )}
              </div>

              {editAssignees && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {(team as any[])?.map((m) => (
                      <label
                        key={m.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                          assigneeIds.includes(m.id) ? "border-blue-300 bg-blue-50/60" : "border-gray-200 bg-white hover:border-gray-300",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={assigneeIds.includes(m.id)}
                          onChange={() => toggleAssignee(m.id)}
                          className="accent-blue-600"
                        />
                        <span className="text-[12.5px] font-medium text-gray-800">
                          {m.name}
                          {m.isAvailable ? "" : <span className="text-gray-400"> (away)</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                  <Button
                    disabled={assign.isPending}
                    onClick={saveAssignees}
                    className="mt-3 rounded-lg bg-black hover:bg-gray-800 text-white h-8 text-[12px]"
                  >
                    {assign.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Save assignees
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Work actions */}
          {open && order.status !== "PROPOSED" && (
            <section className="flex flex-wrap gap-2">
              {isOwner && order.status === "SUBMITTED" && (
                <Button
                  disabled={accept.isPending}
                  onClick={() =>
                    accept.mutate({ id: order.id }, { onSuccess: () => toast.success("Order accepted"), onError: onErr("Could not accept") })
                  }
                  className="rounded-lg bg-black hover:bg-gray-800 text-white h-9"
                >
                  {accept.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
                  Accept order
                </Button>
              )}
              {isStaff && (order.status === "ACCEPTED") && (
                <Button
                  variant="outline"
                  disabled={setStatus.isPending}
                  onClick={() =>
                    setStatus.mutate(
                      { id: order.id, status: "IN_PROGRESS" },
                      { onSuccess: () => toast.success("Marked in progress"), onError: onErr("Could not update status") },
                    )
                  }
                  className="rounded-lg border-gray-200 h-9"
                >
                  {setStatus.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  Start work
                </Button>
              )}
              {isStaff && (order.status === "IN_PROGRESS" || order.status === "ACCEPTED") && (
                <Button
                  disabled={setStatus.isPending}
                  onClick={() =>
                    setStatus.mutate(
                      { id: order.id, status: "DELIVERED" },
                      { onSuccess: () => toast.success("Delivered - the client will confirm"), onError: onErr("Could not update status") },
                    )
                  }
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white h-9"
                >
                  {setStatus.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                  Mark delivered
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  disabled={cancel.isPending}
                  onClick={() =>
                    cancel.mutate({ id: order.id }, { onSuccess: () => toast.success("Order cancelled"), onError: onErr("Could not cancel") })
                  }
                  className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 h-9"
                >
                  Cancel order
                </Button>
              )}
            </section>
          )}

          {/* Client's confirm / request-changes gate */}
          {isSubAccount && order.status === "DELIVERED" && (
            <section className="bg-cyan-50/60 border border-cyan-100 rounded-xl p-4">
              <h3 className="text-[13px] font-bold text-gray-900 mb-1">Your order is ready</h3>
              <p className="text-[12px] text-gray-500 mb-3">
                Review the delivered files. Confirm to complete the order, or request changes if something's off.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  disabled={confirm.isPending}
                  onClick={() =>
                    confirm.mutate({ id: order.id }, { onSuccess: () => toast.success("Order confirmed - thank you!"), onError: onErr("Could not confirm") })
                  }
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                >
                  {confirm.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                  Confirm received
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowChanges(!showChanges)}
                  className="rounded-lg border-gray-200 h-9 text-gray-600"
                >
                  <Undo2 className="w-4 h-4 mr-1.5" /> Request changes
                </Button>
              </div>
              {showChanges && (
                <div className="mt-3">
                  <textarea
                    value={changesNote}
                    onChange={(e) => setChangesNote(e.target.value)}
                    placeholder="Tell the team exactly what needs to change…"
                    className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10 min-h-[70px]"
                  />
                  <Button
                    disabled={requestChanges.isPending || !changesNote.trim()}
                    onClick={() =>
                      requestChanges.mutate(
                        { id: order.id, note: changesNote.trim() },
                        {
                          onSuccess: () => {
                            toast.success("Changes requested - the team is on it")
                            setShowChanges(false)
                            setChangesNote("")
                          },
                          onError: onErr("Could not request changes"),
                        },
                      )
                    }
                    className="mt-2 rounded-lg bg-black hover:bg-gray-800 text-white h-8 text-[12px]"
                  >
                    {requestChanges.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Send request
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Files - the order's own media folder */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">
              Order files ({order.files.length})
            </h3>
            {order.files.length > 0 && <AttachmentList attachments={order.files as never} />}
            {open && (
              <div className="mt-3 flex items-start gap-2 flex-wrap">
                <AttachmentPicker files={files} onChange={setFiles} disabled={uploadFiles.isPending} label="Add files to this order" />
                {files.length > 0 && (
                  <Button
                    disabled={uploadFiles.isPending}
                    onClick={() =>
                      uploadFiles.mutate(
                        { id: order.id, files },
                        {
                          onSuccess: () => {
                            toast.success("Files uploaded")
                            setFiles([])
                          },
                          onError: onErr("Upload failed"),
                        },
                      )
                    }
                    className="rounded-lg bg-black hover:bg-gray-800 text-white h-8 text-[12px]"
                  >
                    {uploadFiles.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Upload
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* Progress timeline */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Progress</h3>
            <div className="space-y-3">
              {order.updates.length > 3 && !showAllUpdates && (
                <div className="flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={() => setShowAllUpdates(true)}
                    className="text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full"
                  >
                    View older updates ({order.updates.length - 3})
                  </button>
                </div>
              )}
              {(showAllUpdates ? order.updates : order.updates.slice(-3)).map((u) => (
                <div key={u.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ORDER_STATUS_META[u.status]?.dot ?? "#9ca3af" }} />
                    <span className="w-px flex-1 bg-gray-100" />
                  </div>
                  <div className="pb-3 min-w-0">
                    <p className="text-[12px] text-gray-400">
                      <span className="font-semibold text-gray-700">{u.actor?.name}</span>
                      {" · "}
                      {format(new Date(u.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                    <p className="text-[13px] text-gray-700 leading-relaxed mt-0.5 whitespace-pre-wrap">{u.note}</p>
                  </div>
                </div>
              ))}
            </div>

            {open && (
              <div className="mt-2 flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && note.trim() && !addNote.isPending) {
                      addNote.mutate(
                        { id: order.id, note: note.trim() },
                        { onSuccess: () => setNote(""), onError: onErr("Could not add the note") },
                      )
                    }
                  }}
                  placeholder={isSubAccount ? "Add a note or clarification…" : "Post a progress update for the client…"}
                  className="flex-1 text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                />
                <Button
                  disabled={addNote.isPending || !note.trim()}
                  onClick={() =>
                    addNote.mutate(
                      { id: order.id, note: note.trim() },
                      { onSuccess: () => setNote(""), onError: onErr("Could not add the note") },
                    )
                  }
                  className="rounded-lg bg-black hover:bg-gray-800 text-white"
                >
                  {addNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
