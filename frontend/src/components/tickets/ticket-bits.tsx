"use client"

import { STAGES } from "@/constants"
import { cn } from "@/lib/utils"
import type { TicketPriority, TicketStage } from "@/types"

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s])) as Record<
  TicketStage,
  (typeof STAGES)[number]
>

export function StageBadge({ stage, className }: { stage: TicketStage; className?: string }) {
  const s = STAGE_MAP[stage]
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1", className)}
      style={{ backgroundColor: `${s.color}1A`, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.name}
    </span>
  )
}

const PRIORITY_STYLES: Record<TicketPriority, { color: string; label: string }> = {
  URGENT: { color: "#DC2626", label: "Urgent" },
  HIGH: { color: "#EA580C", label: "High" },
  MEDIUM: { color: "#6B7280", label: "Medium" },
  LOW: { color: "#94A3B8", label: "Low" },
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const p = PRIORITY_STYLES[priority]
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] font-semibold rounded-md px-1.5 py-0.5"
      style={{ backgroundColor: `${p.color}14`, color: p.color }}
      title={`${p.label} priority`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
      {p.label}
    </span>
  )
}

export function Avatar({ initials, name, muted }: { initials?: string | null; name?: string | null; muted?: boolean }) {
  return (
    <span
      title={name ?? "Unassigned"}
      className={cn(
        "w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0",
        muted ? "bg-gray-100 text-gray-400 border border-dashed border-gray-300" : "bg-black text-white",
      )}
    >
      {initials ?? "-"}
    </span>
  )
}

export const CATEGORIES = [
  { value: "technical", label: "Technical" },
  { value: "automation", label: "Automation" },
  { value: "crm", label: "CRM" },
  { value: "billing", label: "Billing" },
  { value: "api", label: "API" },
  { value: "onboarding", label: "Onboarding" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
]
