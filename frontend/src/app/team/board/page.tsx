"use client"

import { AuthGuard } from "@/components/auth/AuthGuard"
import { BoardView } from "@/components/board/BoardView"
import { AppShell } from "@/components/layouts/AppShell"
import { useMyTickets } from "@/hooks/query/useTickets"

function TeamBoardPage() {
  const { data: tickets, isLoading } = useMyTickets()

  return (
    <AppShell
      fullWidth
      title="My tickets"
      subtitle="Tickets assigned to you - move them through the pipeline up to Review."
    >
      <BoardView tickets={tickets ?? []} isLoading={isLoading} />
    </AppShell>
  )
}

export default function TeamBoardRoute() {
  return (
    <AuthGuard allowedRoles={["TEAM_MEMBER"]}>
      <TeamBoardPage />
    </AuthGuard>
  )
}
