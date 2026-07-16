"use client"

import { formatDistanceToNow } from "date-fns"
import { CalendarDays, Palette, FileText, Play, MessageSquare } from "lucide-react"
import { Avatar } from "@/components/tickets/ticket-bits"
import { cn } from "@/lib/utils"
import type { SocialOrder } from "@/services/social.service"
import { OrderStatusBadge, isOverdue, orderTypeLabel } from "./social-bits"

export function OrdersTable({
  orders,
  onOpen,
  emptyText = "No orders here yet.",
}: {
  orders: SocialOrder[]
  onOpen: (id: string) => void
  emptyText?: string
}) {
  if (!orders.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
        <Palette className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {orders.map((o) => {
        const mainFile = o.files?.[0];
        const isImage = mainFile?.fileType.startsWith("image/") && mainFile?.fileType !== "image/svg+xml";
        const isVideo = mainFile?.fileType.startsWith("video/");

        return (
          <div
            key={o.id}
            onClick={() => onOpen(o.id)}
            className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex flex-col h-full"
          >
            {/* Top Bar */}
            <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-mono text-gray-400">#{o.displayId}</span>
                <span className="text-xs font-semibold text-gray-600 line-clamp-1">{o.subAccount?.name}</span>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <OrderStatusBadge status={o.status} staffView />
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold text-gray-500">
                  {orderTypeLabel(o)}
                </span>
              </div>
            </div>

            {/* Thumbnail removed for simpler layout */}

            {/* Core Info */}
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-semibold text-gray-900 leading-tight mb-2 line-clamp-2">{o.title}</h3>
              <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-3 mb-4">{o.details}</p>

              {o.hashtags && o.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {o.hashtags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="inline-flex items-center rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 whitespace-nowrap">
                      #{tag}
                    </span>
                  ))}
                  {o.hashtags.length > 3 && (
                    <span className="text-[10px] text-gray-400 font-medium">+{o.hashtags.length - 3}</span>
                  )}
                </div>
              )}
              
              <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                <div className="flex items-center gap-3">
                  {o.assignees.length === 0 ? (
                    <span className="text-[11px] font-medium text-red-400">Unassigned</span>
                  ) : (
                    <div className="flex -space-x-1.5">
                      {o.assignees.slice(0, 3).map((a) => (
                        <span key={a.id} className="ring-2 ring-white rounded-full bg-white shadow-sm">
                          <Avatar initials={a.initials} name={a.name} />
                        </span>
                      ))}
                      {o.assignees.length > 3 && (
                        <span className="w-[26px] h-[26px] rounded-full bg-gray-100 text-gray-600 text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                          +{o.assignees.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  {o.updates && o.updates.length > 0 && (
                     <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400" title={`${o.updates.length} updates`}>
                       <MessageSquare className="w-3.5 h-3.5" />
                       {o.updates.length}
                     </div>
                  )}
                </div>
                
                {o.dueDate ? (
                  <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", isOverdue(o) ? "text-red-600" : "text-gray-500")}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    {new Date(o.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-300">No date</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

