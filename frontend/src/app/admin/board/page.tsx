"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { BoardView } from "@/components/board/BoardView"
import { AppShell } from "@/components/layouts/AppShell"
import { NewTicketModal } from "@/components/tickets/NewTicketModal"
import { CATEGORIES } from "@/components/tickets/ticket-bits"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/auth/useAuth"
import { useSubAccounts, useTeamMembers } from "@/hooks/query/useTeamMembers"
import { useMyTickets, useTickets } from "@/hooks/query/useTickets"

function OwnerBoard() {
  const [filters, setFilters] = useState({ subAccountId: "", assigneeId: "", priority: "", category: "" })
  const { data, isLoading } = useTickets({
    limit: 100,
    ...(filters.subAccountId && { subAccountId: filters.subAccountId }),
    ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.category && { category: filters.category }),
  })
  const { data: team } = useTeamMembers()
  const { data: subAccounts } = useSubAccounts()

  // Radix Select reserves the empty string, so "all" stands in for "no filter".
  const setFilter = (key: keyof typeof filters) => (value: string) =>
    setFilters({ ...filters, [key]: value === "all" ? "" : value })

  return (
    <>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Select value={filters.subAccountId || "all"} onValueChange={setFilter("subAccountId")}>
          <SelectTrigger className="w-auto min-w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {subAccounts?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.assigneeId || "all"} onValueChange={setFilter("assigneeId")}>
          <SelectTrigger className="w-auto min-w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {team?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.priority || "all"} onValueChange={setFilter("priority")}>
          <SelectTrigger className="w-auto min-w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.category || "all"} onValueChange={setFilter("category")}>
          <SelectTrigger className="w-auto min-w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <BoardView tickets={data?.tickets ?? []} isLoading={isLoading} />
    </>
  )
}

function TeamBoard() {
  const { data: tickets, isLoading } = useMyTickets()
  return <BoardView tickets={tickets ?? []} isLoading={isLoading} />
}

function BoardPage() {
  const { isOwner } = useAuth()
  const [newTicketOpen, setNewTicketOpen] = useState(false)

  return (
    <AppShell
      fullWidth
      title={isOwner ? "Support board" : "My tickets"}
      subtitle={
        isOwner
          ? "Every ticket across the agency, in one pipeline."
          : "Tickets assigned to you - move them through the pipeline up to Review."
      }
      actions={
        // Team members work tickets, they don't create them - the New ticket
        // action is owner-only (the backend blocks it for team members too).
        isOwner ? (
          <Button onClick={() => setNewTicketOpen(true)} className="rounded-xl bg-black hover:bg-gray-800 text-white h-10">
            <Plus className="w-4 h-4 mr-1.5" /> New ticket
          </Button>
        ) : undefined
      }
    >
      {isOwner ? <OwnerBoard /> : <TeamBoard />}
      {newTicketOpen && <NewTicketModal onClose={() => setNewTicketOpen(false)} />}
    </AppShell>
  )
}

export default function AdminBoardPage() {
  // Strictly owner-only: team members work their own board at /team/board.
  return (
    <AuthGuard allowedRoles={["AGENCY_OWNER"]}>
      <BoardPage />
    </AuthGuard>
  )
}
