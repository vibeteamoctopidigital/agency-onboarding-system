"use client"

import { Loader2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "@/lib/toast"
import { AttachmentPicker } from "@/components/tickets/attachments"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/auth/useAuth"
import { useCreateOrder, useUploadOrderFiles } from "@/hooks/query/useSocial"
import { useSubAccounts } from "@/hooks/query/useTeamMembers"
import { ORDER_TYPES } from "./social-bits"

/**
 * One modal, two modes:
 *  - Sub-account: submits an order for itself (status SUBMITTED)
 *  - Agency owner: creates a PROPOSAL for a chosen client, with a message
 *    explaining why ("we agreed on this in our meeting - approving starts it").
 */
export function NewOrderModal({ onClose }: { onClose: () => void }) {
  const { isSubAccount } = useAuth()
  const { data: subAccounts } = useSubAccounts({ enabled: !isSubAccount })
  const createOrder = useCreateOrder()
  const uploadFiles = useUploadOrderFiles()

  const [title, setTitle] = useState("")
  const [details, setDetails] = useState("")
  const [orderType, setOrderType] = useState("poster")
  const [customType, setCustomType] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [subAccountId, setSubAccountId] = useState("")
  const [proposalNote, setProposalNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [hashtagInput, setHashtagInput] = useState("")
  const [hashtags, setHashtags] = useState<string[]>([])

  const busy = createOrder.isPending || uploadFiles.isPending

  const inputClass =
    "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"

  const submit = () => {
    if (!title.trim()) return toast.error("Give the order a title")
    if (!details.trim()) return toast.error("Describe what you need")
    if (orderType === "other" && !customType.trim()) return toast.error("Describe the order type")
    if (!isSubAccount && !subAccountId) return toast.error("Choose which client this order is for")
    if (!isSubAccount && !proposalNote.trim()) return toast.error("Add a short message for the client")

    createOrder.mutate(
      {
        title: title.trim(),
        details: details.trim(),
        orderType,
        ...(orderType === "other" ? { customType: customType.trim() } : {}),
        ...(hashtags.length ? { hashtags } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        ...(isSubAccount ? {} : { subAccountId, proposalNote: proposalNote.trim() }),
      },
      {
        onSuccess: async (order) => {
          if (files.length) {
            try {
              await uploadFiles.mutateAsync({ id: order.id, files })
            } catch {
              toast.error("Order created, but some files failed to upload")
            }
          }
          toast.success(
            isSubAccount
              ? `Order #${order.displayId} submitted - your agency will review it`
              : `Proposal #${order.displayId} sent to ${order.subAccount?.name} for approval`,
          )
          onClose()
        },
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not create the order"),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{isSubAccount ? "New order" : "Propose an order"}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!isSubAccount && (
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Client</label>
              <Select value={subAccountId || undefined} onValueChange={setSubAccountId}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Choose a sub-account…" />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {subAccounts?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Poster for summer campaign" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Order type</label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {ORDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Due date (optional)</label>
              <input
                type="date"
                value={dueDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDueDate(e.target.value)}
                className={`${inputClass} h-11`}
              />
            </div>
          </div>

          {orderType === "other" && (
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">What kind of order?</label>
              <input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="e.g. Business card design" className={inputClass} />
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Details & requirements</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe exactly what you need - sizes, text, colors, brand notes…"
              className={`${inputClass} min-h-[110px]`}
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Hashtags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {hashtags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  #{tag}
                  <button type="button" onClick={() => setHashtags(hashtags.filter((_, j) => j !== i))} className="text-blue-400 hover:text-blue-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    const tag = hashtagInput.trim().replace(/^#/, "")
                    if (tag && !hashtags.includes(tag)) {
                      setHashtags([...hashtags, tag])
                    }
                    setHashtagInput("")
                  }
                }}
                placeholder="Type a hashtag and press Enter…"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => {
                  const tag = hashtagInput.trim().replace(/^#/, "")
                  if (tag && !hashtags.includes(tag)) {
                    setHashtags([...hashtags, tag])
                  }
                  setHashtagInput("")
                }}
                className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold px-3 py-2 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {!isSubAccount && (
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Message to the client</label>
              <textarea
                value={proposalNote}
                onChange={(e) => setProposalNote(e.target.value)}
                placeholder="e.g. As discussed in our meeting - you mentioned you'd send this order, so here's the proposal. Approve it and we'll start."
                className={`${inputClass} min-h-[80px]`}
              />
              <p className="text-[11px] text-gray-400 mt-1.5">The client sees this message and must approve the proposal before work starts.</p>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Design samples & docs</label>
            <AttachmentPicker files={files} onChange={setFiles} disabled={busy} label="Add samples or documents" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-lg text-gray-500">
            Cancel
          </Button>
          <Button disabled={busy} onClick={submit} className="rounded-lg bg-black hover:bg-gray-800 text-white">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSubAccount ? "Submit order" : "Send proposal"}
          </Button>
        </div>
      </div>
    </div>
  )
}
