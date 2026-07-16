"use client"

import { Loader2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { toast } from "@/lib/toast"
import { ROUTES } from "@/constants"
import { tokenStorage } from "@/lib/token-storage"
import { AuthService } from "@/services/auth.service"
import { useAppDispatch } from "@/store/hooks"
import { setUser } from "@/store/slices/auth.slice"

export default function TeamImpersonatePage() {
  const params = useParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const called = useRef(false)

  const userId = params?.userId as string

  useEffect(() => {
    if (!userId || called.current) return
    called.current = true

    AuthService.impersonate(userId)
      .then((data) => {
        tokenStorage.setTokensForRole("team", data.accessToken, data.refreshToken)
        dispatch(setUser(data.user))
        toast.success(`Signed in as ${data.user.name}`)
        router.replace(ROUTES.TEAM_DASHBOARD)
      })
      .catch((error: any) => {
        const message = error?.response?.data?.error?.message || "Could not switch to this team member"
        toast.error(message)
        router.replace("/admin/team")
      })
  }, [userId, router, dispatch])

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Switching to team member…</p>
      </div>
    </div>
  )
}
