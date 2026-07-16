"use client"

import { ChevronLeft, ChevronRight, Download, FileText, X } from "lucide-react"
import { useCallback, useEffect } from "react"
import type { SocialOrderFile } from "@/services/social.service"

/**
 * Full-screen media lightbox: ← → to flip through an order's files, ESC or
 * backdrop click to close. Images and videos render inline; other files show
 * a download card. Deliberately minimal chrome - the media is the point.
 */
export function Lightbox({
  files,
  index,
  onIndexChange,
  onClose,
}: {
  files: SocialOrderFile[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const file = files[index]

  const prev = useCallback(() => {
    onIndexChange((index - 1 + files.length) % files.length)
  }, [index, files.length, onIndexChange])
  const next = useCallback(() => {
    onIndexChange((index + 1) % files.length)
  }, [index, files.length, onIndexChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, prev, next])

  if (!file) return null
  const isImage = file.fileType.startsWith("image/") && file.fileType !== "image/svg+xml"
  const isVideo = file.fileType.startsWith("video/")

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/90 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={file.fileName}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 text-white/80" onClick={(e) => e.stopPropagation()}>
        <span className="text-[13px] truncate max-w-[60vw]">{file.fileName}</span>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-white/50">
            {index + 1} / {files.length}
          </span>
          <a
            href={file.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Download"
          >
            <Download className="w-4 h-4" />
          </a>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center px-14 pb-8 min-h-0">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.fileUrl}
            alt={file.fileName}
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        ) : isVideo ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={file.fileUrl}
            controls
            autoPlay
            className="max-h-full max-w-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <a
            href={file.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl px-8 py-10 text-center hover:scale-[1.02] transition-transform"
          >
            <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-900">{file.fileName}</p>
            <p className="text-xs text-gray-400 mt-1">Tap to open / download</p>
          </a>
        )}
      </div>

      {/* Arrows */}
      {files.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  )
}
