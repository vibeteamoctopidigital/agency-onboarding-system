"use client"

import { CheckCircle2, Clock, ExternalLink, HeadphonesIcon, Loader2, ShieldX, XCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import { ROUTES } from "@/constants"
import { useAuth } from "@/hooks/auth/useAuth"
import { PortalService } from "@/services/portal.service"

/**
 * Sub-account entry point, opened from a GHL Custom Menu Link as
 * /portal?location_id={{location.id}}. Deliberately has NO manual entry
 * field - a missing location_id means it wasn't opened from inside GHL.
 */

type ScreenState =
  | { kind: "loading" }
  | { kind: "missing_param" }
  | { kind: "pending"; created: boolean }
  | { kind: "rejected" }
  | { kind: "blocked" }
  | { kind: "unknown_location" }
  | { kind: "error"; message: string }

function PortalScreen() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { adoptSession } = useAuth()
  const [state, setState] = useState<ScreenState>({ kind: "loading" })
  const entered = useRef(false)

  const locationId = searchParams.get("location_id")

  useEffect(() => {
    if (!locationId) {
      setState({ kind: "missing_param" })
      return
    }
    if (entered.current) return
    entered.current = true

    PortalService.enter(locationId)
      .then((result) => {
        if (result.status === "ACTIVE") {
          adoptSession(result.user, result.accessToken, result.refreshToken)
          router.replace(ROUTES.CLIENT_DASHBOARD)
          return
        }
        if (result.status === "PENDING") setState({ kind: "pending", created: result.created })
        else if (result.status === "REJECTED") setState({ kind: "rejected" })
        else if (result.status === "BLOCKED") setState({ kind: "blocked" })
        else setState({ kind: "unknown_location" })
      })
      .catch((error: any) => {
        setState({
          kind: "error",
          message:
            error?.response?.data?.error?.message ||
            "Something went wrong while checking your access. Please try again shortly.",
        })
      })
  }, [locationId, adoptSession, router])

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4">

      {state.kind === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          </>
        )}
    { state.kind !== "loading" && <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        

        {state.kind === "missing_param" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-amber-50 mb-4">
              <ExternalLink className="w-7 h-7 text-amber-500" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Open this from your GHL account</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              This support portal can only be opened through the menu link inside your
              GoHighLevel account. Log in to GHL and click the support link in your sidebar.
            </p>
          </>
        )}

        {state.kind === "pending" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 mb-4">
              <Clock className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">
              {state.created ? "Request sent - waiting for approval" : "Still waiting for approval"}
            </h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              {state.created
                ? "Your agency has been notified. Once they approve your access, opening this link again will take you straight to your tickets."
                : "Your access request is with your agency. Check back once they've approved it."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              No further action needed from you
            </div>
          </>
        )}

        {state.kind === "rejected" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-red-50 mb-4">
              <ShieldX className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Access not available</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Portal access hasn&apos;t been enabled for this account. Please contact your
              agency directly if you believe this is a mistake.
            </p>
          </>
        )}

        {state.kind === "blocked" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-red-50 mb-4">
              <ShieldX className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Access disabled</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Your support portal access has been disabled by your agency. Please contact
              them directly if you believe this is a mistake.
            </p>
          </>
        )}

        {state.kind === "unknown_location" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-red-50 mb-4">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Account not recognized</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              We couldn&apos;t find this location under the connected agency. Make sure you
              opened the link from inside your GoHighLevel account, or contact your agency.
            </p>
          </>
        )}

        {state.kind === "error" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-red-50 mb-4">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{state.message}</p>
          </>
        )}
      </div>}
    </div>
  )
}

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <PortalScreen />
    </Suspense>
  )
}
