"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Eye, EyeOff, HeadphonesIcon, KeyRound, Loader2, Lock, Mail, Plug } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/auth/useAuth"
import { type ConnectFormData, connectSchema } from "@/schemas/auth.schema"

export default function ConnectPage() {
  const { connect, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConnectFormData>({
    resolver: zodResolver(connectSchema),
  })

  const onSubmit = async (data: ConnectFormData) => {
    setConnectError(null)
    try {
      await connect({
        agencyName: data.agencyName,
        email: data.email,
        password: data.password,
        ghlCompanyId: data.ghlCompanyId,
        ghlApiKey: data.ghlApiKey,
        ghlMediaLocationId: data.ghlMediaLocationId,
        ghlMediaApiKey: data.ghlMediaApiKey,
      })
    } catch (error: any) {
      setConnectError(
        error?.response?.data?.error?.message ||
          "Connection failed. Check your GHL Company ID and API key, then try again.",
      )
    }
  }

  const inputClass =
    "w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 mb-4">
            <Plug className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Connect your agency</h1>
          <p className="text-sm text-gray-500 mt-1">
            One-time setup - we validate your GHL key before anything is saved
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="agencyName" className="block text-sm font-medium text-gray-700 mb-1.5">
              Agency name
            </label>
            <div className="relative">
              <HeadphonesIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="agencyName" type="text" placeholder="Your agency name" className={inputClass} {...register("agencyName")} />
            </div>
            {errors.agencyName && <p className="text-red-500 text-xs mt-1">{errors.agencyName.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="email" type="email" autoComplete="email" placeholder="you@agency.com" className={inputClass} {...register("email")} />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className={inputClass}
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="ghlCompanyId" className="block text-sm font-medium text-gray-700 mb-1.5">
              GHL Company / Location ID
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="ghlCompanyId" type="text" placeholder="Your agency-level GHL ID" className={inputClass} {...register("ghlCompanyId")} />
            </div>
            {errors.ghlCompanyId && <p className="text-red-500 text-xs mt-1">{errors.ghlCompanyId.message}</p>}
          </div>

          <div>
            <label htmlFor="ghlApiKey" className="block text-sm font-medium text-gray-700 mb-1.5">
              GHL Private Integration key
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="ghlApiKey"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                placeholder="pit-..."
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                {...register("ghlApiKey")}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.ghlApiKey && <p className="text-red-500 text-xs mt-1">{errors.ghlApiKey.message}</p>}
            <p className="text-xs text-gray-400 mt-1.5">
              Create one in GHL under Settings → Private Integrations (agency level, with location scopes). Stored encrypted - never shown again.
            </p>
          </div>

          {/* Media storage - agency PITs can't carry media scopes, so one
              designated sub-account hosts all uploaded files. Mandatory. */}
          <div className="border border-gray-100 bg-gray-50/60 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Media storage sub-account</p>
              <p className="text-xs text-gray-400 mt-0.5">
                All uploaded files (ticket & order attachments) are stored in ONE sub-account&apos;s GHL Media Library.
                Pick a sub-account, create a Private Integration <strong>inside it</strong> with the{" "}
                <strong>medias.write</strong> and <strong>medias.readonly</strong> scopes, and paste both values here.
              </p>
            </div>

            <div>
              <label htmlFor="ghlMediaLocationId" className="block text-sm font-medium text-gray-700 mb-1.5">
                Sub-account Location ID
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="ghlMediaLocationId"
                  type="text"
                  placeholder="Location ID of the media sub-account"
                  className={inputClass}
                  {...register("ghlMediaLocationId")}
                />
              </div>
              {errors.ghlMediaLocationId && <p className="text-red-500 text-xs mt-1">{errors.ghlMediaLocationId.message}</p>}
            </div>

            <div>
              <label htmlFor="ghlMediaApiKey" className="block text-sm font-medium text-gray-700 mb-1.5">
                Sub-account PIT token (media scopes)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="ghlMediaApiKey"
                  type={showKey ? "text" : "password"}
                  autoComplete="off"
                  placeholder="pit-..."
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  {...register("ghlMediaApiKey")}
                />
              </div>
              {errors.ghlMediaApiKey && <p className="text-red-500 text-xs mt-1">{errors.ghlMediaApiKey.message}</p>}
            </div>
          </div>

          {connectError && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{connectError}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validating with GoHighLevel...
              </>
            ) : (
              "Connect agency"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already connected?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
