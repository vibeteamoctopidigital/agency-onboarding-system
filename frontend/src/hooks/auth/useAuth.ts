"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useCallback, useEffect } from "react"
import { toast } from "@/lib/toast"
import { ROUTES } from "@/constants"
import { getActiveRole, tokenStorage, type SessionRole } from "@/lib/token-storage"
import { AuthService } from "@/services/auth.service"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { logout, patchUser, setLoading, setUser } from "@/store/slices/auth.slice"
import type { User, UserRole } from "@/types"

function roleToSession(role: UserRole): SessionRole {
  if (role === "AGENCY_OWNER") return "admin"
  if (role === "TEAM_MEMBER") return "team"
  return "client"
}

/** Where each role lands after authenticating - strict per-role areas. */
export function homeRouteFor(role: UserRole): string {
  if (role === "SUB_ACCOUNT") return ROUTES.CLIENT_DASHBOARD
  if (role === "TEAM_MEMBER") return ROUTES.TEAM_DASHBOARD
  return ROUTES.ADMIN_DASHBOARD
}

export function useAuth() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth)

  const token = typeof window !== "undefined" ? tokenStorage.getAccessToken() : undefined
  // Which session bucket this page area uses - part of the query key so the
  // admin area and the client area each resolve THEIR OWN user, even though
  // both sessions live in the same browser.
  const area = typeof window !== "undefined" ? getActiveRole() : null

  const {
    data: me,
    isError: meError,
    isPending: mePending,
  } = useQuery({
    queryKey: ["auth", "me", area ?? "any"],
    queryFn: async () => {
      const userData = await AuthService.getMe()
      dispatch(setUser(userData))
      return userData
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  // A full page refresh wipes Redux but NOT the token in localStorage. While
  // that stored token is being re-validated via /auth/me, the session counts
  // as loading - otherwise AuthGuard sees "not authenticated" for a moment
  // and wrongly bounces a logged-in user to /login on every refresh.
  const isRestoringSession = !!token && !user && mePending && !meError

  useEffect(() => {
    if (meError) {
      // Only this area's session is invalid - the other buckets stay intact.
      tokenStorage.clear()
      dispatch(logout())
    }
  }, [meError, dispatch])

  const login = useCallback(
    async (email: string, password: string) => {
      dispatch(setLoading(true))
      try {
        const data = await AuthService.login(email, password)
        // Store into the bucket of the role the BACKEND returned - never a
        // shared slot, so this login can't stomp another role's session.
        tokenStorage.setTokensForRole(roleToSession(data.user.role), data.accessToken, data.refreshToken)
        dispatch(setUser(data.user))
        // Team members on a temporary password must set a new one (and read the
        // onboarding brief) before they can reach their dashboard.
        if (data.user.tempPassword && data.user.role === "TEAM_MEMBER") {
          toast.success("Welcome! Let's set up your account.")
          router.push(ROUTES.ONBOARDING)
        } else {
          toast.success(`Welcome back, ${data.user.name}!`)
          router.push(homeRouteFor(data.user.role))
        }
      } catch (error: any) {
        const message =
          error?.response?.data?.error?.message || "Invalid email or password"
        toast.error(message)
        throw error
      } finally {
        dispatch(setLoading(false))
      }
    },
    [dispatch, router],
  )

  /** First-time agency owner connect (email + password + Company ID + GHL key + media location). */
  const connect = useCallback(
    async (params: {
      agencyName: string
      email: string
      password: string
      ghlCompanyId: string
      ghlApiKey: string
      ghlMediaLocationId: string
      ghlMediaApiKey: string
    }) => {
      dispatch(setLoading(true))
      try {
        const data = await AuthService.connect(params)
        tokenStorage.setTokensForRole("admin", data.accessToken, data.refreshToken)
        dispatch(setUser(data.user))
        toast.success("Agency connected successfully!")
        router.push(ROUTES.ADMIN_DASHBOARD)
      } catch (error: any) {
        const message =
          error?.response?.data?.error?.message ||
          "Connection failed. Please check your details and try again."
        toast.error(message)
        throw error
      } finally {
        dispatch(setLoading(false))
      }
    },
    [dispatch, router],
  )

  /** Used by the /portal and /social flows once the backend has issued a sub-account session. */
  const adoptSession = useCallback(
    (sessionUser: User, accessToken: string, refreshToken: string) => {
      // Always the client bucket - a sub-account session must never be able to
      // overwrite the owner's or a team member's session in the same browser.
      tokenStorage.setTokensForRole("client", accessToken, refreshToken)
      dispatch(setUser(sessionUser))
    },
    [dispatch],
  )

  const switchRole = useCallback(
    async (sessionUser: User, accessToken: string, refreshToken: string) => {
      tokenStorage.setTokensForRole(roleToSession(sessionUser.role), accessToken, refreshToken)
      dispatch(setUser(sessionUser))
    },
    [dispatch],
  )

  const logoutUser = useCallback(async () => {
    // Sign out of THIS role only - other role sessions in the browser survive.
    if (user?.role) tokenStorage.clearRole(roleToSession(user.role))
    else tokenStorage.clear()
    dispatch(logout())
    toast.success("Signed out successfully")
    router.push(ROUTES.LOGIN)
  }, [dispatch, router, user?.role])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        await AuthService.changePassword(currentPassword, newPassword)
        toast.success("Password changed successfully")
        return true
      } catch (error: any) {
        const message =
          error?.response?.data?.error?.message || "Failed to change password"
        toast.error(message)
        throw error
      }
    },
    [],
  )

  /** Completes first-login setup: sets a real password, clearing tempPassword. */
  const firstLoginPassword = useCallback(
    async (newPassword: string) => {
      await AuthService.firstLoginPassword(newPassword)
      dispatch(patchUser({ tempPassword: false }))
      queryClient.setQueryData(["auth", "me", area ?? "any"], (old: any) => 
        old ? { ...old, tempPassword: false } : old
      )
    },
    [dispatch, queryClient, area],
  )

  const isOwner = user?.role === "AGENCY_OWNER"
  const isTeamMember = user?.role === "TEAM_MEMBER"
  const isSubAccount = user?.role === "SUB_ACCOUNT"

  return {
    // The area-scoped /auth/me result wins over Redux: after crossing between
    // areas (admin ↔ client) in one browser, Redux may still hold the OTHER
    // area's user for a moment - me is always fetched with this area's token.
    user: me ?? user ?? undefined,
    isAuthenticated: isAuthenticated || !!me,
    isLoading: isLoading || isRestoringSession,
    isOwner,
    isTeamMember,
    isSubAccount,
    login,
    connect,
    adoptSession,
    switchRole,
    logout: logoutUser,
    changePassword,
    firstLoginPassword,
  }
}
