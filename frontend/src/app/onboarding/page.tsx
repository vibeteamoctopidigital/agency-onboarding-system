"use client"

import { CheckCircle2, Eye, EyeOff, HeadphonesIcon, Loader2, Lock, LogOut, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "@/lib/toast"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants"
import { useAuth, homeRouteFor } from "@/hooks/auth/useAuth"

const ONBOARDING_POINTS = [
  {
    title: "Work only your assigned tickets",
    body: "Your board shows tickets assigned to you. Pick them up promptly and keep their stage current so clients always know where things stand.",
  },
  {
    title: "Comment on every stage move",
    body: "A short, client-facing note is required each time you move a ticket. It's the update your client sees - be clear and professional.",
  },
  {
    title: "Review is the finish line",
    body: "You can take a ticket all the way to Review. An agency owner signs off before anything is marked Resolved - you can't close tickets yourself.",
  },
  {
    title: "Internal notes stay internal",
    body: "Use internal notes for staff-only context. They're never emailed or shown to the client. Public replies are.",
  },
]

const CLIENT_POINTS = [
  {
    title: "Track your requests",
    body: "Your dashboard shows the status of all your support tickets and social orders in real-time.",
  },
  {
    title: "Communicate securely",
    body: "All communication with our team happens securely through this portal. You'll be notified of any updates.",
  },
  {
    title: "Manage your account",
    body: "Update your profile, billing, and settings easily from your portal.",
  },
]

function OnboardingInner() {
  const { user, firstLoginPassword, logout } = useAuth()
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Someone who already has a real password doesn't belong here.
  useEffect(() => {
    if (user && !user.tempPassword) router.replace(homeRouteFor(user.role))
  }, [user, router])

  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirm.length > 0 && confirm !== password
  const valid = password.length >= 8 && confirm === password

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    try {
      await firstLoginPassword(password)
      toast.success("Password set - welcome aboard!")
      router.replace(homeRouteFor(user?.role || "TEAM_MEMBER"))
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Could not set your password")
    } finally {
      setSubmitting(false)
    }
  }

  const inputBase =
    "w-full h-11 pl-10 pr-11 rounded-xl border bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl grid md:grid-cols-2 gap-4">
        {/* Onboarding brief */}
        <div className="bg-white rounded-2xl border border-gray-100 p-7">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gray-900 mb-4">
            <HeadphonesIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Welcome, {user?.name?.split(" ")[0]}</h2>
          <p className="text-[13px] text-gray-500 mt-1 mb-5">
            {user?.role === "SUB_ACCOUNT" ? "A quick brief on what to expect." : "A quick brief on how support works here."}
          </p>
          <ul className="space-y-3.5">
            {(user?.role === "SUB_ACCOUNT" ? CLIENT_POINTS : ONBOARDING_POINTS).map((p) => (
              <li key={p.title} className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">{p.title}</p>
                  <p className="text-[12px] text-gray-500 leading-relaxed">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Forced password change */}
        <div className="bg-white rounded-2xl border border-gray-100 p-7 flex flex-col">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 mb-4">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Set your password</h2>
          <p className="text-[13px] text-gray-500 mt-1 mb-5">
            You're signed in with a temporary password. Choose a new one to finish setting up your account.
          </p>

          <form onSubmit={submit} className="space-y-4 flex-1 flex flex-col">
            <div>
              <label htmlFor="new-password" className="block text-[12px] font-semibold text-gray-600 mb-1.5">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="new-password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`${inputBase} ${tooShort ? "border-red-200 focus:ring-red-200" : "border-gray-200 focus:ring-blue-500"}`}
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {tooShort && <p className="text-red-500 text-[11.5px] mt-1">Must be at least 8 characters.</p>}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-[12px] font-semibold text-gray-600 mb-1.5">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="confirm-password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your new password"
                  className={`${inputBase} ${mismatch ? "border-red-200 focus:ring-red-200" : "border-gray-200 focus:ring-blue-500"}`}
                />
              </div>
              {mismatch && <p className="text-red-500 text-[11.5px] mt-1">Passwords don't match.</p>}
            </div>

            <div className="flex-1" />

            <Button
              type="submit"
              disabled={!valid || submitting}
              className="w-full h-11 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Set password & continue"}
            </Button>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center justify-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <AuthGuard allowedRoles={["TEAM_MEMBER", "SUB_ACCOUNT"]}>
      <OnboardingInner />
    </AuthGuard>
  )
}
