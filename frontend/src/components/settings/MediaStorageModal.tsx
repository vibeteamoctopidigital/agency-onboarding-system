"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, KeyRound, Loader2, X } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { type MediaStorageFormData, mediaStorageSchema } from "@/schemas/auth.schema"
import { AuthService } from "@/services/auth.service"

/**
 * Owner sets/updates the media-storage sub-account (Location ID + location
 * PIT with medias.write). The backend validates the key live against GHL
 * before saving - bad keys fail here with GHL's exact reason.
 */
export function MediaStorageModal({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MediaStorageFormData>({ resolver: zodResolver(mediaStorageSchema) })

  const inputClass =
    "w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

  const onSubmit = async (data: MediaStorageFormData) => {
    setSaving(true)
    try {
      await AuthService.updateMediaStorage(data)
      toast.success("Media storage saved - uploads now go to that sub-account's GHL Media Library")
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Could not save the media storage settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Media storage</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <p className="text-[12.5px] text-gray-500 leading-relaxed">
            All uploaded files (ticket & order attachments) are stored in ONE sub-account&apos;s GHL Media
            Library. Create a Private Integration <strong>inside</strong> that sub-account with the{" "}
            <strong>medias.write</strong> and <strong>medias.readonly</strong> scopes, then paste both values.
            The key is validated with GHL before saving and stored encrypted.
          </p>

          <div>
            <label htmlFor="ms-location" className="block text-sm font-medium text-gray-700 mb-1.5">
              Sub-account Location ID
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="ms-location" type="text" placeholder="Location ID" className={inputClass} {...register("ghlMediaLocationId")} />
            </div>
            {errors.ghlMediaLocationId && <p className="text-red-500 text-xs mt-1">{errors.ghlMediaLocationId.message}</p>}
          </div>

          <div>
            <label htmlFor="ms-key" className="block text-sm font-medium text-gray-700 mb-1.5">
              Sub-account PIT token (media scopes)
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="ms-key" type="password" autoComplete="off" placeholder="pit-..." className={inputClass} {...register("ghlMediaApiKey")} />
            </div>
            {errors.ghlMediaApiKey && <p className="text-red-500 text-xs mt-1">{errors.ghlMediaApiKey.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validating with GoHighLevel...
              </>
            ) : (
              "Save media storage"
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
