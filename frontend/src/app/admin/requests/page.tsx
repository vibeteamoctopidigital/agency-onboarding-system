"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { Check, DownloadCloud, Inbox, Loader2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "@/lib/toast"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { Button } from "@/components/ui/button"
import { QUERY_KEYS } from "@/constants"
import { type SubAccountRequest, SubAccountsService } from "@/services/subaccounts.service"

function statusBadge(status: SubAccountRequest["status"]) {
  const styles = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-100",
    ACTIVE: "bg-green-50 text-green-700 border-green-100",
    REJECTED: "bg-red-50 text-red-600 border-red-100",
    BLOCKED: "bg-gray-900 text-white border-gray-900",
  }
  return (
    <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

function RequestsPage() {
  const queryClient = useQueryClient()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState("")

  const { data: all, isLoading } = useQuery({
    queryKey: QUERY_KEYS.SUB_ACCOUNTS_ALL,
    queryFn: SubAccountsService.listAll,
    refetchInterval: 30_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUB_ACCOUNTS_ALL })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUB_ACCOUNT_REQUESTS })
  }

  const approveMutation = useMutation({
    mutationFn: SubAccountsService.approve,
    onSuccess: (row) => {
      toast.success(`${row.name} approved - they now have portal access.`)
      invalidate()
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error?.message || "Approval failed"),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      SubAccountsService.reject(id, comment),
    onSuccess: (row) => {
      toast.success(`${row.name} rejected.`)
      setRejectingId(null)
      setRejectComment("")
      invalidate()
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error?.message || "Rejection failed"),
  })

  const bulkMutation = useMutation({
    mutationFn: SubAccountsService.bulkApprove,
    onSuccess: (result) => {
      toast.success(
        `Bulk approve complete: ${result.activated} activated, ${result.skipped} already decided (${result.totalInGhl} locations in GHL).`,
      )
      invalidate()
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error?.message || "Bulk approve failed"),
  })

  const pending = all?.filter((r) => r.status === "PENDING") ?? []
  const decided = all?.filter((r) => r.status !== "PENDING") ?? []

  return (
    <AppShell
      title="Access requests"
      subtitle="Approve or reject sub-accounts asking to use the support portal."
      actions={
        <Button
          onClick={() => bulkMutation.mutate()}
          disabled={bulkMutation.isPending}
          variant="outline"
          className="rounded-xl border-gray-200 h-10 bg-white"
        >
          {bulkMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <DownloadCloud className="w-4 h-4 mr-2" />
          )}
          Bulk-approve GHL locations
        </Button>
      }
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Waiting for your decision ({pending.length})
          </h2>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 flex justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : pending.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No pending requests. New sub-accounts appear here when they first open the
                portal from inside GHL.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((request) => (
                <div key={request.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{request.name}</h3>
                        {statusBadge(request.status)}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {request.contactEmail || "No contact email"} ·{" "}
                        <span className="font-mono text-xs">{request.ghlLocationId}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Requested {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(request.id)}
                        disabled={approveMutation.isPending}
                        className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectingId(rejectingId === request.id ? null : request.id)
                          setRejectComment("")
                        }}
                        className="rounded-xl border-gray-200 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  {rejectingId === request.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <textarea
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        placeholder="Optional note (kept internally with the decision)"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[70px]"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            rejectMutation.mutate({ id: request.id, comment: rejectComment || undefined })
                          }
                          disabled={rejectMutation.isPending}
                          className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
                        >
                          {rejectMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                          Confirm rejection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {decided.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Decided ({decided.length})
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-5 py-3 font-medium text-gray-500">Sub-account</th>
                    <th className="px-5 py-3 font-medium text-gray-500 hidden sm:table-cell">Location ID</th>
                    <th className="px-5 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Decided by</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {decided.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="text-xs text-gray-400">{row.contactEmail || "no email found"}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500 hidden sm:table-cell">
                        {row.ghlLocationId}
                      </td>
                      <td className="px-5 py-3">{statusBadge(row.status)}</td>
                      <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                        {row.decidedBy?.name || "-"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {row.status === "REJECTED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => approveMutation.mutate(row.id)}
                            className="text-green-600 hover:bg-green-50"
                          >
                            Re-approve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}

export default function AdminRequestsPage() {
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <RequestsPage />
    </AuthGuard>
  )
}
