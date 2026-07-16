"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/auth/useAuth"

/**
 * A strict, non-dismissible modal that forces a sub-account to set a real
 * password before they can interact with the dashboard behind it.
 */
export function ForcePasswordModal() {
  const { user, firstLoginPassword } = useAuth()
  
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // TEMPORARILY DISABLED: Per user request to allow direct dashboard access without forcing password change
  // if (!user || !user.tempPassword) {
  //   return null
  // }
  
  return null

  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirm.length > 0 && confirm !== password
  const valid = password.length >= 8 && confirm === password

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    try {
      await firstLoginPassword(password)
      toast.success("Password set securely! Welcome to your dashboard.")
      // The useAuth hook will automatically update `user.tempPassword = false`,
      // which will cause this modal to immediately unmount!
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Could not set your password")
      setSubmitting(false)
    }
  }

  const inputBase =
    "w-full h-11 pl-10 pr-11 rounded-xl border bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Strict container - clicking outside does nothing */}
      <div className="bg-white rounded-2xl border border-gray-100 p-7 w-full max-w-md shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Accent top border */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />
        
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 mb-4 mt-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-900">Secure your account</h2>
        <p className="text-[14px] text-gray-500 mt-1 mb-6">
          Welcome to your new portal! Please set a secure password to finalize your account setup.
        </p>

        <form onSubmit={submit} className="space-y-4 flex flex-col">
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

          <Button
            type="submit"
            disabled={!valid || submitting}
            className="w-full h-11 mt-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-50"
          >
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Set password & enter portal"}
          </Button>
        </form>
      </div>
    </div>
  )
}
