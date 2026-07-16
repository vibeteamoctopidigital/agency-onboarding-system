"use client"

import { Loader2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/auth/useAuth"
import { useCreateTicket, useUploadAttachments } from "@/hooks/query/useTickets"
import { useSubAccounts } from "@/hooks/query/useTeamMembers"
import { AttachmentPicker } from "./attachments"
import { CATEGORIES } from "./ticket-bits"

export function NewTicketModal({ onClose }: { onClose: () => void }) {
  const { isSubAccount } = useAuth()
  // Owner-only endpoint - a client submitting a ticket must not call it.
  const { data: subAccounts } = useSubAccounts({ enabled: !isSubAccount })
  const createTicket = useCreateTicket()
  const uploadAttachments = useUploadAttachments()

  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("technical")
  const [customCategory, setCustomCategory] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [subAccountId, setSubAccountId] = useState("")
  const [files, setFiles] = useState<File[]>([])

  const busy = createTicket.isPending || uploadAttachments.isPending

  const submit = () => {
    if (!subject.trim()) {
      toast.error("Give the ticket a subject")
      return
    }
    if (!isSubAccount && !subAccountId) {
      toast.error("Choose which client this ticket is for")
      return
    }
    if (category === "other" && !customCategory.trim()) {
      toast.error("Describe the category")
      return
    }
    createTicket.mutate(
      {
        subject: subject.trim(),
        description: description.trim(),
        category: category === "other" ? customCategory.trim() : category,
        priority,
        ...(isSubAccount ? {} : { subAccountId }),
      },
      {
        onSuccess: async (t) => {
          // Ticket exists now - upload any chosen files against it. A failed
          // upload doesn't undo the ticket; we just warn.
          if (files.length) {
            try {
              await uploadAttachments.mutateAsync({ id: t.id, files })
            } catch {
              toast.error("Ticket created, but some files failed to upload")
            }
          }
          toast.success(
            t.assignee
              ? `Ticket #${t.displayId} created and assigned to ${t.assignee.name}`
              : `Ticket #${t.displayId} created - waiting in the unassigned queue`,
          )
          onClose()
        },
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not create the ticket"),
      },
    )
  }

  const inputClass =
    "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{isSubAccount ? "Submit a ticket" : "New ticket"}</h2>
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
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary of the issue" className={inputClass} />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's going on?"
              className={`${inputClass} min-h-[90px]`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {category === "other" && (
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Custom category</label>
              <input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Integration, Migration, …"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Attachments</label>
            <AttachmentPicker files={files} onChange={setFiles} disabled={busy} label="Add screenshots or files" />
          </div>

          <p className="text-[11.5px] text-gray-400 leading-relaxed">
            {isSubAccount
              ? "Your agency's support team will pick this up shortly."
              : "New tickets land in the unassigned queue - assign a team member from there."}
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-lg text-gray-500">
            Cancel
          </Button>
          <Button disabled={busy} onClick={submit} className="rounded-lg bg-black hover:bg-gray-800 text-white">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create ticket
          </Button>
        </div>
      </div>
    </div>
  )
}
