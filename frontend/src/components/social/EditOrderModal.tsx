"use client"

import { Loader2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "@/lib/toast"
import { AttachmentPicker, formatBytes } from "@/components/tickets/attachments"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpdateOrder, useUploadOrderFiles } from "@/hooks/query/useSocial"
import type { SocialOrder } from "@/services/social.service"
import { ORDER_TYPES } from "./social-bits"

export function EditOrderModal({ order, onClose }: { order: SocialOrder; onClose: () => void }) {
  const updateOrder = useUpdateOrder()
  const uploadFiles = useUploadOrderFiles()

  const [title, setTitle] = useState(order.title)
  const [details, setDetails] = useState(order.details)
  const [orderType, setOrderType] = useState(order.orderType)
  const [customType, setCustomType] = useState(order.customType || "")
  const [dueDate, setDueDate] = useState(order.dueDate ? new Date(order.dueDate).toISOString().slice(0, 10) : "")
  const [hashtagInput, setHashtagInput] = useState("")
  const [hashtags, setHashtags] = useState<string[]>(order.hashtags || [])
  const [existingFiles, setExistingFiles] = useState(order.files || [])
  const [deletedFileIds, setDeletedFileIds] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])

  const busy = updateOrder.isPending || uploadFiles.isPending

  const inputClass =
    "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"

  const submit = () => {
    if (!title.trim()) return toast.error("Give the order a title")
    if (!details.trim()) return toast.error("Describe what you need")
    if (orderType === "other" && !customType.trim()) return toast.error("Describe the order type")

    updateOrder.mutate(
      {
        id: order.id,
        data: {
          title: title.trim(),
          details: details.trim(),
          orderType,
          customType: orderType === "other" ? customType.trim() : null,
          hashtags,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          deletedFileIds: deletedFileIds.length > 0 ? deletedFileIds : undefined,
        }
      },
      {
        onSuccess: async () => {
          if (newFiles.length) {
            try {
              await uploadFiles.mutateAsync({ id: order.id, files: newFiles })
            } catch {
              toast.error("Order updated, but some new files failed to upload")
            }
          }
          toast.success("Order updated successfully")
          onClose()
        },
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not update the order"),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Edit Order</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

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

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Manage Media & Files</label>
            
            {existingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {existingFiles.map(f => (
                  <div key={f.id} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 h-24 w-32 shrink-0">
                    {f.fileType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.fileUrl} alt={f.fileName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center p-2">
                        <span className="text-[10px] font-medium text-gray-600 text-center line-clamp-2 break-all">{f.fileName}</span>
                        <span className="text-[9px] text-gray-400 mt-1">{formatBytes(f.fileSize)}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setDeletedFileIds([...deletedFileIds, f.id])
                        setExistingFiles(existingFiles.filter(xf => xf.id !== f.id))
                      }}
                      className="absolute top-1 right-1 bg-white/80 hover:bg-white text-gray-600 hover:text-red-500 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                      title="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <AttachmentPicker files={newFiles} onChange={setNewFiles} disabled={busy} label="Upload additional files" />
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-lg text-gray-500">
            Cancel
          </Button>
          <Button disabled={busy} onClick={submit} className="rounded-lg bg-black hover:bg-gray-800 text-white">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}
