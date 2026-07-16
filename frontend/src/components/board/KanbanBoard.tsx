"use client"

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { ChevronDown, Loader2 } from "lucide-react"
import { useState } from "react"
import { STAGES } from "@/constants"
import { cn } from "@/lib/utils"
import type { Ticket, TicketStage, UserRole } from "@/types"
import { Avatar, PriorityBadge } from "@/components/tickets/ticket-bits"

/** Client-side mirror of the backend stage-permission rules (UX only - the API re-checks). */
export function canMoveTo(role: UserRole | undefined, current: TicketStage, target: TicketStage): boolean {
  if (!role || target === current) return false
  if (role === "AGENCY_OWNER") return true
  if (role === "TEAM_MEMBER") return target !== "RESOLVED" && current !== "RESOLVED"
  return false
}

function TicketCard({
  ticket,
  role,
  draggable,
  saving,
  onOpen,
  onMove,
}: {
  ticket: Ticket
  role?: UserRole
  draggable: boolean
  saving: boolean
  onOpen: (t: Ticket) => void
  onMove: (t: Ticket, stage: TicketStage) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    disabled: !draggable || saving,
  })

  const movable = STAGES.filter((s) => canMoveTo(role, ticket.stage, s.key))

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "relative bg-white rounded-xl border border-gray-100 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-gray-200 transition-colors",
        draggable && !saving && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {/* Saving overlay - shown while a move is confirming on the server */}
      {saving && (
        <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Moving…
          </span>
        </div>
      )}

      <button type="button" onClick={() => onOpen(ticket)} className="block w-full text-left">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-mono text-gray-400">#{ticket.displayId}</span>
          <PriorityBadge priority={ticket.priority} />
        </div>
        <p className="text-[13.5px] font-semibold text-gray-900 leading-snug mb-1">{ticket.subject}</p>
        <p className="text-[11.5px] text-gray-500 mb-3">{ticket.subAccount?.name}</p>
      </button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar initials={ticket.assignee?.initials} name={ticket.assignee?.name} muted={!ticket.assignee} />
          <span className="text-[10.5px] bg-gray-50 border border-gray-100 rounded-md px-1.5 py-0.5 text-gray-500">
            {ticket.category}
          </span>
        </div>
        {movable.length > 0 && (
          <div className="relative">
            <button
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(!menuOpen)
              }}
              className="text-[11px] font-medium text-gray-500 border border-gray-100 rounded-lg px-2 py-1 hover:border-gray-300 flex items-center gap-1 disabled:opacity-50"
            >
              Move <ChevronDown className="w-3 h-3" />
            </button>
            {menuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} aria-label="Close menu" />
                <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden py-1">
                  {movable.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(false)
                        onMove(ticket, s.key)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-gray-700 hover:bg-gray-50 text-left"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StageColumn({
  stage,
  tickets,
  role,
  savingId,
  onOpen,
  onMove,
}: {
  stage: (typeof STAGES)[number]
  tickets: Ticket[]
  role?: UserRole
  savingId: string | null
  onOpen: (t: Ticket) => void
  onMove: (t: Ticket, stage: TicketStage) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })

  return (
    <div className="w-[272px] flex-shrink-0 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-1 pb-3 border-t-[3px] pt-2.5" style={{ borderTopColor: stage.color }}>
        <span className="text-[13px] font-bold text-gray-900">{stage.name}</span>
        <span
          className="text-[11px] font-bold rounded-full px-2 py-0.5"
          style={{ backgroundColor: `${stage.color}1A`, color: stage.color }}
        >
          {tickets.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[120px] rounded-xl flex flex-col gap-2.5 p-1 overflow-y-auto transition-all",
          isOver && "bg-white/80 ring-2 ring-offset-2",
        )}
        style={isOver ? ({ "--tw-ring-color": stage.color } as React.CSSProperties) : undefined}
      >
        {tickets.length === 0 ? (
          <div className={cn("text-center text-[11.5px] py-8 rounded-xl border-2 border-dashed transition-colors", isOver ? "border-gray-300 text-gray-400" : "border-transparent text-gray-300")}>
            {isOver ? "Drop here" : "No tickets"}
          </div>
        ) : (
          tickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              role={role}
              draggable={canDragAny(role, t)}
              saving={savingId === t.id}
              onOpen={onOpen}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </div>
  )
}

function canDragAny(role: UserRole | undefined, t: Ticket): boolean {
  return STAGES.some((s) => canMoveTo(role, t.stage, s.key))
}

export function KanbanBoard({
  tickets,
  role,
  savingId = null,
  onOpen,
  onMove,
}: {
  tickets: Ticket[]
  role?: UserRole
  /** Ticket id currently confirming a move on the server - shows a card overlay. */
  savingId?: string | null
  onOpen: (t: Ticket) => void
  onMove: (t: Ticket, stage: TicketStage) => void
}) {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragStart = (e: DragStartEvent) => {
    setActiveTicket(tickets.find((t) => t.id === e.active.id) ?? null)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTicket(null)
    const target = e.over?.id as TicketStage | undefined
    const ticket = tickets.find((t) => t.id === e.active.id)
    if (!target || !ticket || !canMoveTo(role, ticket.stage, target)) return
    onMove(ticket, target)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 items-stretch min-h-[60vh]">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage.key}
            stage={stage}
            tickets={tickets.filter((t) => t.stage === stage.key)}
            role={role}
            savingId={savingId}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTicket && (
          <div className="bg-white rounded-xl border-2 border-gray-300 p-3.5 shadow-2xl w-[260px] rotate-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-mono text-gray-400">#{activeTicket.displayId}</span>
              <PriorityBadge priority={activeTicket.priority} />
            </div>
            <p className="text-[13.5px] font-semibold text-gray-900">{activeTicket.subject}</p>
            <p className="text-[11.5px] text-gray-500 mt-1">{activeTicket.subAccount?.name}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
