"use client"

import { cn } from "@/lib/utils"
import type { SocialOrder, SocialOrderStatus } from "@/services/social.service"

export const ORDER_TYPES = [
  { value: "poster", label: "Poster" },
  { value: "logo", label: "Logo" },
  { value: "social-post", label: "Social post" },
  { value: "reel-video", label: "Reel / video" },
  { value: "banner", label: "Banner" },
  { value: "flyer", label: "Flyer" },
  { value: "other", label: "Other" },
] as const

export function orderTypeLabel(order: Pick<SocialOrder, "orderType" | "customType">): string {
  if (order.orderType === "other") return order.customType || "Other"
  return ORDER_TYPES.find((t) => t.value === order.orderType)?.label ?? order.orderType
}

export const ORDER_STATUS_META: Record<SocialOrderStatus, { label: string; className: string; dot: string }> = {
  PROPOSED: { label: "Awaiting your approval", className: "bg-violet-50 text-violet-700 border-violet-200", dot: "#8b5cf6" },
  SUBMITTED: { label: "Submitted", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "#f59e0b" },
  ACCEPTED: { label: "Accepted", className: "bg-blue-50 text-blue-700 border-blue-200", dot: "#3b82f6" },
  IN_PROGRESS: { label: "In progress", className: "bg-sky-50 text-sky-700 border-sky-200", dot: "#0ea5e9" },
  DELIVERED: { label: "Delivered - confirm", className: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "#06b6d4" },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "#10b981" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200", dot: "#9ca3af" },
}

export function OrderStatusBadge({ status, staffView = false }: { status: SocialOrderStatus; staffView?: boolean }) {
  const meta = ORDER_STATUS_META[status]
  // "Awaiting your approval" only makes sense to the client; staff see "Proposed".
  const label = staffView && status === "PROPOSED" ? "Proposed" : staffView && status === "DELIVERED" ? "Delivered" : meta.label
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", meta.className)}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
      {label}
    </span>
  )
}

/** Open statuses - everything that still needs attention from someone. */
export const OPEN_ORDER_STATUSES: SocialOrderStatus[] = ["PROPOSED", "SUBMITTED", "ACCEPTED", "IN_PROGRESS", "DELIVERED"]

/** The client-facing journey, in order. CANCELLED renders separately. */
const PROGRESS_STEPS = ["Requested", "Accepted", "In progress", "Delivered", "Approved"] as const
const STATUS_STEP: Record<SocialOrderStatus, number> = {
  PROPOSED: 0,
  SUBMITTED: 0,
  ACCEPTED: 1,
  IN_PROGRESS: 2,
  DELIVERED: 3,
  COMPLETED: 4,
  CANCELLED: -1,
}

/**
 * Compact horizontal step tracker - the client sees where their order stands
 * at a glance, in every row, without opening anything.
 */
export function ProgressSteps({ status, compact = false }: { status: SocialOrderStatus; compact?: boolean }) {
  const current = STATUS_STEP[status]
  if (current === -1) {
    return <span className="text-[11px] font-semibold text-gray-400">Cancelled</span>
  }
  return (
    <div className="flex items-center" aria-label={`Progress: ${PROGRESS_STEPS[current]}`}>
      {PROGRESS_STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          {i > 0 && <span className={cn("h-[2px] rounded-full", compact ? "w-3" : "w-5", i <= current ? "bg-emerald-400" : "bg-gray-200")} />}
          <span
            title={step}
            className={cn(
              "rounded-full flex-shrink-0 transition-colors",
              compact ? "w-2 h-2" : "w-2.5 h-2.5",
              i < current ? "bg-emerald-400" : i === current ? "bg-blue-500 ring-4 ring-blue-100" : "bg-gray-200",
            )}
          />
        </div>
      ))}
      {!compact && (
        <span className="ml-2.5 text-[11px] font-semibold text-gray-600 whitespace-nowrap">{PROGRESS_STEPS[current]}</span>
      )}
    </div>
  )
}

export function isOverdue(order: Pick<SocialOrder, "dueDate" | "status">): boolean {
  return Boolean(
    order.dueDate && new Date(order.dueDate) < new Date() && OPEN_ORDER_STATUSES.includes(order.status),
  )
}
