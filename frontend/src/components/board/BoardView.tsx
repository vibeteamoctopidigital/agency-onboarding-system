"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"
import { KanbanBoard } from "@/components/board/KanbanBoard"
import { StageMoveModal } from "@/components/tickets/StageMoveModal"
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal"
import { useAuth } from "@/hooks/auth/useAuth"
import type { Ticket, TicketStage } from "@/types"

/**
 * Shared board behavior for owner + team boards: every stage move - drag or
 * menu - opens the mandatory comment modal; the card shows a saving overlay
 * while the server confirms.
 */
export function BoardView({ tickets, isLoading }: { tickets: Ticket[]; isLoading: boolean }) {
  const { user } = useAuth()
  const [openTicketId, setOpenTicketId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<{ ticket: Ticket; target: TicketStage } | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <>
      <KanbanBoard
        tickets={tickets}
        role={user?.role}
        savingId={savingId}
        onOpen={(t) => setOpenTicketId(t.id)}
        onMove={(ticket, target) => setPendingMove({ ticket, target })}
      />
      {openTicketId && <TicketDetailModal ticketId={openTicketId} onClose={() => setOpenTicketId(null)} />}
      {pendingMove && (
        <StageMoveModal
          ticket={pendingMove.ticket}
          targetStage={pendingMove.target}
          onClose={() => {
            setPendingMove(null)
            setSavingId(null)
          }}
          onDone={() => setSavingId(null)}
        />
      )}
    </>
  )
}
