"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Copy, Loader2, RefreshCw, Trash2, UserPlus, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "@/lib/toast"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { Avatar } from "@/components/tickets/ticket-bits"
import { Button } from "@/components/ui/button"
import { QUERY_KEYS } from "@/constants"
import { useCreateTeamMember, useDeleteTeamMember, useTeamMembers } from "@/hooks/query/useTeamMembers"
import { UserService } from "@/services/user.service"

type SyncResult = Awaited<ReturnType<typeof UserService.syncTeamFromGhl>>

/** Credentials of freshly synced members - shown exactly once, like CreateMemberModal. */
function SyncResultModal({ result, onClose }: { result: SyncResult; onClose: () => void }) {
  const copyAll = () => {
    const text = result.created
      .map((m) => `${m.name}\nLogin: ${m.email}\nTemporary password: ${m.tempPassword}`)
      .join("\n\n")
    navigator.clipboard.writeText(text)
    toast.success("All credentials copied")
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {result.created.length} member{result.created.length === 1 ? "" : "s"} imported from GHL
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-[13px] text-gray-600 leading-relaxed mb-4">
            Each member was emailed their temporary password and must change it after first login.
            Credentials are shown here <strong>once</strong> as a backup - copy them before closing.
          </p>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {result.created.map((m) => (
              <div key={m.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-mono text-[12.5px]">
                <p className="text-gray-900 font-semibold">{m.name}</p>
                <p className="text-gray-600">{m.email}</p>
                <p className="text-gray-600">Password: <span className="text-gray-900">{m.tempPassword}</span></p>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-gray-400 mt-3">
            {result.skippedExisting} already existed · {result.skippedNoEmail} skipped (no email) · {result.totalInGhl} users in GHL
          </p>
          <Button onClick={copyAll} variant="outline" className="w-full mt-4 rounded-xl border-gray-200">
            <Copy className="w-4 h-4 mr-2" /> Copy all credentials
          </Button>
          <Button onClick={onClose} className="w-full mt-2 rounded-xl bg-black hover:bg-gray-800 text-white">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

function CreateMemberModal({ onClose }: { onClose: () => void }) {
  const createMember = useCreateTeamMember()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [skills, setSkills] = useState("")
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null)

  const inputClass =
    "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"

  const submit = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required")
      return
    }
    createMember.mutate(
      { name: name.trim(), email: email.trim(), skills: skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) },
      {
        onSuccess: (m: any) => {
          setCreated({ email: m.email, tempPassword: m.tempPassword })
          toast.success(`${m.name} created`)
        },
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not create the team member"),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={created ? undefined : onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{created ? "Credentials - shown once" : "New team member"}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {created ? (
          <div className="px-6 py-5">
            <p className="text-[13px] text-gray-600 leading-relaxed mb-4">
              Share these with the new member - the temporary password is <strong>not stored in plain text and cannot be shown again</strong>. They'll be asked to change it after first login.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 font-mono text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{created.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500">Password</span>
                <span className="text-gray-900">{created.tempPassword}</span>
              </div>
            </div>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(`Login: ${created.email}\nTemporary password: ${created.tempPassword}`)
                toast.success("Copied to clipboard")
              }}
              variant="outline"
              className="w-full mt-4 rounded-xl border-gray-200"
            >
              <Copy className="w-4 h-4 mr-2" /> Copy credentials
            </Button>
            <Button onClick={onClose} className="w-full mt-2 rounded-xl bg-black hover:bg-gray-800 text-white">
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="jane@agency.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Skills (comma-separated)</label>
                <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="technical, billing, api" className={inputClass} />
                <p className="text-[11px] text-gray-400 mt-1.5">Used by auto-assignment to match tickets by category.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} className="rounded-lg text-gray-500">Cancel</Button>
              <Button disabled={createMember.isPending} onClick={submit} className="rounded-lg bg-black hover:bg-gray-800 text-white">
                {createMember.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create member
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TeamPage() {
  const queryClient = useQueryClient()
  const { data: team, isLoading } = useTeamMembers()
  const deleteMember = useDeleteTeamMember()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  const syncGhl = useMutation({
    mutationFn: () => UserService.syncTeamFromGhl(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM_MEMBERS })
      if (result.created.length > 0) {
        setSyncResult(result)
      } else if (result.totalInGhl === 0) {
        toast.info("No team members found in your GHL agency yet")
      } else {
        toast.success(`Already in sync - ${result.skippedExisting} member(s) exist, nothing new in GHL`)
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not sync team from GHL"),
  })

  return (
    <AppShell
      title="Team roster"
      subtitle="Availability, skills, and live workload."
      actions={
        <>
          <Button
            variant="outline"
            disabled={syncGhl.isPending}
            onClick={() => syncGhl.mutate()}
            className="rounded-xl border-gray-200 bg-white text-gray-700 hover:text-gray-900 h-10"
          >
            {syncGhl.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1.5" />
            )}
            {syncGhl.isPending ? "Syncing…" : "Sync from GHL"}
          </Button>
          <Button onClick={() => setModalOpen(true)} className="rounded-xl bg-black hover:bg-gray-800 text-white h-10">
            <UserPlus className="w-4 h-4 mr-1.5" /> Add member
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Member</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Skills</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Open</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">In review</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(team as any[])?.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={m.initials} name={m.name} />
                      <div>
                        <p className="font-medium text-gray-900">{m.name}</p>
                        <p className="text-[11px] text-gray-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${m.isAvailable ? "text-green-700" : "text-gray-400"}`}>
                      <span className={`w-2 h-2 rounded-full ${m.isAvailable ? "bg-green-500" : "bg-gray-300"}`} />
                      {m.isAvailable ? "Available" : "Away"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {(Array.isArray(m.skills) ? m.skills : []).map((s: string) => (
                        <span key={s} className="text-[10.5px] bg-gray-50 border border-gray-100 rounded-md px-1.5 py-0.5 text-gray-500">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 font-medium">{m.openTickets}</td>
                  <td className="px-5 py-3.5 text-gray-700 font-medium">{m.reviewTickets}</td>
                  <td className="px-5 py-3.5 text-right">
                    {confirmDelete === m.id ? (
                      <span className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={deleteMember.isPending}
                          onClick={() =>
                            deleteMember.mutate(m.id, {
                              onSuccess: () => { toast.success(`${m.name} removed - open tickets returned to the queue`); setConfirmDelete(null) },
                              onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Removal failed"),
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                        >
                          {deleteMember.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {deleteMember.isPending ? "Removing…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          disabled={deleteMember.isPending}
                          onClick={() => setConfirmDelete(null)}
                          className="text-[12px] text-gray-400 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <>
                        <Link href={`/team/${m.id}`} className="text-gray-300 hover:text-blue-500 p-1 mr-1" title="Log in as this member">
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button type="button" onClick={() => setConfirmDelete(m.id)} className="text-gray-300 hover:text-red-500 p-1" title="Remove member">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modalOpen && <CreateMemberModal onClose={() => setModalOpen(false)} />}
      {syncResult && <SyncResultModal result={syncResult} onClose={() => setSyncResult(null)} />}
    </AppShell>
  )
}

export default function AdminTeamPage() {
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <TeamPage />
    </AuthGuard>
  )
}
