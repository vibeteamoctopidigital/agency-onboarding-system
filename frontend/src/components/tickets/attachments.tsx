"use client"

import { ChevronLeft, ChevronRight, FileText, ImageIcon, Paperclip, X, Download } from "lucide-react"
import { useState } from "react"
import type { Attachment } from "@/types"

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function isImage(fileType: string): boolean {
  return fileType.startsWith("image/") && fileType !== "image/svg+xml"
}

/** Read-only list of uploaded attachments with inline previews for images. */
export function AttachmentList({ attachments, compact = false }: { attachments: Attachment[]; compact?: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  
  if (!attachments?.length) return null
  
  const images = attachments.filter(a => isImage(a.fileType))
  return (
    <>
      <div className={compact ? "flex flex-wrap gap-2 mt-2" : "grid grid-cols-2 sm:grid-cols-3 gap-2.5"}>
        {attachments.map((a) =>
          isImage(a.fileType) ? (
            <button
              type="button"
              key={a.id}
              onClick={(e) => {
                e.preventDefault()
                setSelectedIndex(images.findIndex(img => img.id === a.id))
              }}
              className="group relative block rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:border-gray-300 transition-colors text-left"
              title={a.fileName}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.fileUrl} alt={a.fileName} className={compact ? "h-16 w-24 object-cover" : "h-28 w-full object-cover"} />
              
              {/* Filename and Download Action */}
              <div className="absolute bottom-0 inset-x-0 bg-black/55 flex items-center justify-between">
                <span className="text-white text-[10px] px-1.5 py-0.5 truncate pr-6">
                  {a.fileName}
                </span>
                
                <a
                  href={a.fileUrl}
                  download={a.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 bottom-0 top-0 flex items-center justify-center px-1.5 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
                  title="Download image"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </button>
        ) : (
          <a
            key={a.id}
            href={a.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 hover:border-gray-300 transition-colors min-w-0"
            title={a.fileName}
          >
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="min-w-0">
              <span className="block text-[11.5px] font-medium text-gray-800 truncate">{a.fileName}</span>
              <span className="block text-[10px] text-gray-400">{formatBytes(a.fileSize)}</span>
            </span>
          </a>
        ),
      )}
      </div>

      {selectedIndex !== null && images[selectedIndex] && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedIndex(null)}
        >
          <button 
            type="button"
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-[210]"
            onClick={() => setSelectedIndex(null)}
          >
            <X className="w-8 h-8" />
          </button>
          
          {selectedIndex > 0 && (
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 z-[210]"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedIndex(selectedIndex - 1)
              }}
            >
              <ChevronLeft className="w-12 h-12" />
            </button>
          )}

          {selectedIndex < images.length - 1 && (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 z-[210]"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedIndex(selectedIndex + 1)
              }}
            >
              <ChevronRight className="w-12 h-12" />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={images[selectedIndex].fileUrl} 
            alt={images[selectedIndex].fileName} 
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl relative z-[205]" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

/** Controlled file picker - holds pending File objects before upload. */
export function AttachmentPicker({
  files,
  onChange,
  disabled,
  label = "Attach files",
}: {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  label?: string
}) {
  const add = (list: FileList | null) => {
    if (!list) return
    const next = [...files, ...Array.from(list)].slice(0, 8)
    onChange(next)
  }
  const remove = (idx: number) => onChange(files.filter((_, i) => i !== idx))

  return (
    <div>
      <label
        className={`inline-flex items-center gap-1.5 text-[12px] font-medium rounded-lg border border-gray-200 px-2.5 py-1.5 cursor-pointer hover:border-gray-400 transition-colors ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Paperclip className="w-3.5 h-3.5" /> {label}
        <input
          type="file"
          multiple
          className="hidden"
          disabled={disabled}
          accept="image/*,application/pdf,.csv,.zip,.mp4"
          onChange={(e) => {
            add(e.target.files)
            e.target.value = "" // allow re-selecting the same file
          }}
        />
      </label>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {files.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-1.5 text-[11px] bg-gray-100 border border-gray-200 rounded-md pl-2 pr-1 py-1 text-gray-600"
            >
              {f.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              <span className="max-w-[140px] truncate">{f.name}</span>
              <span className="text-gray-400">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                className="text-gray-400 hover:text-red-500 p-0.5"
                aria-label={`Remove ${f.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
