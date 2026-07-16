"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CloudOff, Link2, Loader2, RefreshCw, Store } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "@/lib/toast"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { Avatar } from "@/components/tickets/ticket-bits"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QUERY_KEYS } from "@/constants"
import { cn } from "@/lib/utils"
import { type SubAccountOverviewRow, SubAccountsService } from "@/services/subaccounts.service"

const STATUS_BADGE: Record<SubAccountOverviewRow["status"], { label: string; className: string }> = {
  ACTIVE: { label: "Connected", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { label: "Pending approval", className: "bg-amber-50 text-amber-700 border-amber-200" },
  NOT_CONNECTED: { label: "Not connected", className: "bg-gray-50 text-gray-500 border-gray-200" },
  REJECTED: { label: "Rejected", className: "bg-red-50 text-red-600 border-red-200" },
  BLOCKED: { label: "Blocked", className: "bg-gray-900 text-white border-gray-900" },
}

/** Owner-facing access control: ACTIVE / BLOCKED / REJECTED via one select box. */
function AccessStatusSelect({ row }: { row: SubAccountOverviewRow }) {
  const queryClient = useQueryClient()

  const changeStatus = useMutation({
    mutationFn: (status: "ACTIVE" | "BLOCKED" | "REJECTED") =>
      SubAccountsService.changeStatus(row.subAccountId!, status),
    onSuccess: (updated) => {
      toast.success(
        updated.status === "ACTIVE"
          ? `${row.name} can use the portal again`
          : `${row.name} is now ${updated.status.toLowerCase()}`,
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUB_ACCOUNTS_OVERVIEW })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUB_ACCOUNT_REQUESTS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUB_ACCOUNTS_ALL })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not change status"),
  })

  return (
    <div className="inline-flex items-center gap-2">
      {changeStatus.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
      <Select
        value={row.status}
        disabled={changeStatus.isPending}
        onValueChange={(value) => changeStatus.mutate(value as "ACTIVE" | "BLOCKED" | "REJECTED")}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="BLOCKED">Blocked</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
          {row.status === "PENDING" && (
            <SelectItem value="PENDING" disabled>
              Pending
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

function StatusBadge({ status }: { status: SubAccountOverviewRow["status"] }) {
  const badge = STATUS_BADGE[status]
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", badge.className)}>
      {badge.label}
    </span>
  )
}

function SubAccountsPage() {
  const queryClient = useQueryClient()
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.SUB_ACCOUNTS_OVERVIEW,
    queryFn: () => SubAccountsService.overview(),
  })

  const connect = useMutation({
    mutationFn: (locationId: string) => SubAccountsService.connectLocation(locationId),
    onMutate: (locationId) => setConnectingId(locationId),
    onSettled: () => setConnectingId(null),
    onSuccess: (row) => {
      toast.success(`${row.name} is now connected`)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUB_ACCOUNTS_OVERVIEW })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUB_ACCOUNT_REQUESTS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUB_ACCOUNTS_ALL })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || "Could not connect this location"),
  })

  const refresh = async () => {
    // Bypass the server-side GHL cache, then let the query pick up the result.
    try {
      const fresh = await SubAccountsService.overview(true)
      queryClient.setQueryData(QUERY_KEYS.SUB_ACCOUNTS_OVERVIEW, fresh)
      toast.success("Synced with GHL")
    } catch {
      toast.error("Could not refresh ")
      refetch()
    }
  }

  const totals = data?.totals

  return (
    <AppShell
      title="Sub-accounts"
      subtitle="Every location under your GHL agency and its portal connection status."
      actions={
        <button
          type="button"
          onClick={refresh}
          disabled={isFetching}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} /> Fetch Latest
        </button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
      ) : !data?.locations?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Store className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            No locations found under your GHL agency yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {totals && (
            <div className="flex flex-wrap gap-2 text-[12px] text-gray-500">
              <span className="bg-white border border-gray-200 rounded-lg px-2.5 py-1"><strong className="text-gray-900">{totals.inGhl}</strong> in GHL</span>
              <span className="bg-white border border-emerald-200 rounded-lg px-2.5 py-1 text-emerald-700"><strong>{totals.connected}</strong> connected</span>
              {totals.pending > 0 && <span className="bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-amber-700"><strong>{totals.pending}</strong> pending</span>}
              <span className="bg-white border border-gray-200 rounded-lg px-2.5 py-1"><strong className="text-gray-900">{totals.notConnected}</strong> not connected</span>
              {totals.rejected > 0 && <span className="bg-white border border-red-200 rounded-lg px-2.5 py-1 text-red-600"><strong>{totals.rejected}</strong> rejected</span>}
              {totals.blocked > 0 && <span className="bg-gray-900 border border-gray-900 rounded-lg px-2.5 py-1 text-white"><strong>{totals.blocked}</strong> blocked</span>}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Client</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Contact</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Location ID</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Open tickets</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.locations.map((s) => (
                  <tr key={s.locationId} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={s.name.slice(0, 2).toUpperCase()} name={s.name} />
                        <div className="min-w-0">
                          {s.userId ? (
                            <Link
                              href={`/social/admin/sub-accounts/${s.userId}`}
                              className="font-medium text-gray-900 block truncate hover:text-blue-600 transition-colors"
                            >
                              {s.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900 block truncate">{s.name}</span>
                          )}
                          {!s.inGhl && (
                            <span className="inline-flex items-center gap-1 text-[10.5px] text-orange-500">
                              <CloudOff className="w-3 h-3" /> No longer in GHL
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{s.contactEmail || "no email found"}</td>
                    <td className="px-5 py-3.5 font-mono text-[11.5px] text-gray-400">{s.locationId}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                    <td className="px-5 py-3.5">
                      <span className={cn("font-semibold", s.openTickets > 0 ? "text-gray-900" : "text-gray-300")}>{s.openTickets}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {s.status === "NOT_CONNECTED" && s.inGhl ? (
                        <button
                          type="button"
                          disabled={connect.isPending}
                          onClick={() => connect.mutate(s.locationId)}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          {connectingId === s.locationId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5" />
                          )}
                          Connect
                        </button>
                      ) : s.subAccountId ? (
                        <AccessStatusSelect row={s} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.syncedAt && (
            <p className="text-[11px] text-gray-400">
              Last synced with GHL: {new Date(data.syncedAt).toLocaleString()}
              {data.fromCache ? " (cached - use Refresh for a live pull)" : ""}
            </p>
          )}
        </div>
      )}
    </AppShell>
  )
}

export default function AdminSubAccountsPage() {
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <SubAccountsPage />
    </AuthGuard>
  )
}
