"use client"

import { format, formatDistanceToNow } from "date-fns"
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  FileText,
  ListFilter,
  Loader2,
  Palette,
  Play,
  Search,
  X,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { toast } from "@/lib/toast"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { Lightbox } from "@/components/social/Lightbox"
import {
  ORDER_TYPES,
  OrderStatusBadge,
  ProgressSteps,
  isOverdue,
  orderTypeLabel,
} from "@/components/social/social-bits"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/auth/useAuth"
import {
  useConfirmOrder,
  useRequestOrderChanges,
  useRespondToProposal,
  useSocialOrders,
  useAddOrderNote,
} from "@/hooks/query/useSocial"
import { cn } from "@/lib/utils"
import type { SocialOrder, SocialOrderFile } from "@/services/social.service"

/**
 * Client approval grid - modeled 1:1 on the client's Airtable reference:
 * a FLAT spreadsheet (no expanding rows, no toggles on rows), everything
 * rendered in the row itself. Approve/Reject sit on the right; the Status
 * cell on the left updates the moment a decision lands. Revision feedback
 * is typed directly inside its own cell. Visuals open a lightbox.
 */

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "PROPOSED", label: "Needs my approval" },
  { value: "SUBMITTED", label: "Requested" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DELIVERED", label: "Ready to review" },
  { value: "COMPLETED", label: "Approved" },
  { value: "CANCELLED", label: "Cancelled" },
]

const SORTS = [
  { value: "action", label: "Needs action first" },
  { value: "newest", label: "Recently updated" },
  { value: "due", label: "Due date" },
  { value: "oldest", label: "Oldest first" },
] as const
type SortKey = (typeof SORTS)[number]["value"]

function actionRank(o: SocialOrder): number {
  if (o.status === "PROPOSED" || o.status === "DELIVERED") return 0
  if (o.status === "COMPLETED" || o.status === "CANCELLED") return 2
  return 1
}

/** The client's most recent rejection/revision note - fills the feedback column. */
function lastClientFeedback(o: SocialOrder): string | null {
  for (let i = o.updates.length - 1; i >= 0; i--) {
    const u = o.updates[i];
    return u.note
    
    // if (u.actor?.role === "SUB_ACCOUNT") {
    //   return o.updates.map((y)=>y.note)[0]
    //   // const note = u.note.replace(/^Changes requested:\s*/i, "")
    //   // if (note && !/^(Proposal approved|Confirmed)/i.test(note)) return note
    // }
  }
  return null
}

function VisualCell({ files, onOpen }: { files: SocialOrderFile[]; onOpen: (index: number) => void }) {
  if (!files.length) return <span className="text-[11px] text-gray-300">-</span>
  const main = files[0]
  const isImage = main.fileType.startsWith("image/") && main.fileType !== "image/svg+xml"
  const isVideo = main.fileType.startsWith("video/")
  return (
    <div className="flex items-center gap-1.5 mx-auto">
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="relative w-[72px] h-[88px] rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:ring-2 hover:ring-blue-400 transition-shadow flex-shrink-0"
        title={main.fileName}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={main.fileUrl} alt={main.fileName} className="w-full h-full object-cover" />
        ) : isVideo ? (
          <span className="w-full h-full bg-gray-900 flex items-center justify-center">
            <Play className="w-6 h-6 text-white" />
          </span>
        ) : (
          <span className="w-full h-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-gray-400" />
          </span>
        )}
      </button>
      {files.length > 1 && (
        <button
          type="button"
          onClick={() => onOpen(1)}
          className="w-8 h-[88px] rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 hover:ring-2 hover:ring-blue-400 transition-shadow flex-shrink-0"
          title={`${files.length - 1} more file(s)`}
        >
          +{files.length - 1}
        </button>
      )}
    </div>
  )
}

function ClientApprovalGrid() {
  const { user } = useAuth()
  const { data: orders, isLoading } = useSocialOrders()
  const respond = useRespondToProposal()
  const confirm = useConfirmOrder()
  const requestChanges = useRequestOrderChanges()
  const addNote = useAddOrderNote()

  // Airtable-style toolbar state
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("action")

  // Reject flow: feedback typed directly in that row's feedback cell.
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<{ id: string; type: "approve" | "reject" | "note" } | null>(null)
  const [feedback, setFeedback] = useState("")
  const [lightbox, setLightbox] = useState<{ files: SocialOrderFile[]; index: number } | null>(null)
  const [descModal, setDescModal] = useState<{ title: string; details: string } | null>(null)
  const feedbackRef = useRef<HTMLTextAreaElement>(null)

  const activeFilters = (statusFilter ? 1 : 0) + (typeFilter ? 1 : 0)

  const visibleOrders = useMemo(() => {
    let list = orders ?? []
    if (statusFilter) list = list.filter((o) => o.status === statusFilter)
    if (typeFilter) list = list.filter((o) => o.orderType === typeFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((o) => o.title.toLowerCase().includes(q) || o.details.toLowerCase().includes(q))
    }
    const byNewest = (a: SocialOrder, b: SocialOrder) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    const sorted = [...list]
    if (sort === "action") sorted.sort((a, b) => actionRank(a) - actionRank(b) || byNewest(a, b))
    else if (sort === "newest") sorted.sort(byNewest)
    else if (sort === "oldest") sorted.sort((a, b) => -byNewest(a, b))
    else if (sort === "due")
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return byNewest(a, b)
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
    return sorted
  }, [orders, statusFilter, typeFilter, search, sort])

  const onErr = (fallback: string) => (e: any) => toast.error(e?.response?.data?.error?.message || fallback)

  const approve = (o: SocialOrder) => {
    setBusyAction({ id: o.id, type: "approve" })
    const done = () => setBusyAction(null)
    if (o.status === "PROPOSED") {
      respond.mutate(
        { id: o.id, approve: true },
        { onSuccess: () => toast.success(`"${o.title}" approved`), onError: onErr("Could not approve"), onSettled: done },
      )
    } else {
      confirm.mutate(
        { id: o.id },
        { onSuccess: () => toast.success(`"${o.title}" approved`), onError: onErr("Could not approve"), onSettled: done },
      )
    }
  }

  const sendReject = (o: SocialOrder) => {
    if (!feedback.trim()) return toast.error("Type what needs to change in the feedback box")
    setBusyAction({ id: o.id, type: "reject" })
    const done = () => {
      setBusyAction(null)
      setRejectingId(null)
      setFeedback("")
    }
    if (o.status === "PROPOSED") {
      respond.mutate(
        { id: o.id, approve: false, note: feedback.trim() },
        { onSuccess: () => toast.success("Declined - your feedback was sent"), onError: onErr("Could not send"), onSettled: done },
      )
    } else if (o.status === "IN_PROGRESS") {
      addNote.mutate(
        { id: o.id, note: feedback.trim() },
        { onSuccess: () => toast.success("Feedback sent to the team"), onError: onErr("Could not send"), onSettled: done },
      )
    } else {
      requestChanges.mutate(
        { id: o.id, note: feedback.trim() },
        { onSuccess: () => toast.success("Feedback sent - the team will revise it"), onError: onErr("Could not send"), onSettled: done },
      )
    }
  }

  const canAct = (o: SocialOrder) => o.status === "PROPOSED" || o.status === "DELIVERED"

    const STAGE_STYLES: Record<string, { bar: string; note: string }> = {
  OPEN:        { bar: "bg-blue-400",    note: "text-blue-600" },
  IN_PROGRESS: { bar: "bg-amber-400",   note: "text-amber-600" },
  PENDING:     { bar: "bg-purple-400",  note: "text-purple-600" },
  RESOLVED:    { bar: "bg-emerald-400", note: "text-emerald-600" },
  CLOSED:      { bar: "bg-gray-300",    note: "text-gray-500" },
};
const getStageStyle = (stage: string) => STAGE_STYLES[stage] ?? STAGE_STYLES.CLOSED;

const capitalizeStage = (stage: string): string => {
  return stage
    .toLowerCase()
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

  return (
    <AppShell fullWidth title="My orders" subtitle={`Signed in as ${user?.name ?? "…"} - review, approve, or send feedback.`}>
      {/* ── Airtable-style toolbar ─────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-1.5 mb-3 relative flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 w-[170px] pl-8 pr-3 rounded-lg border border-gray-200 bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setFilterOpen(!filterOpen)
              setSortOpen(false)
            }}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12.5px] font-medium transition-colors",
              activeFilters > 0 ? "border-violet-300 bg-violet-50 text-violet-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>
          {filterOpen && (
            <>
              <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setFilterOpen(false)} aria-label="Close" />
              <div className="absolute right-0 top-9 z-50 w-64 bg-white rounded-xl border border-gray-200 shadow-xl p-3 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Filter by</p>
                <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[120]">
                    {STATUS_FILTERS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[120]">
                    <SelectItem value="all">All types</SelectItem>
                    {ORDER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeFilters > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("")
                      setTypeFilter("")
                    }}
                    className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setSortOpen(!sortOpen)
              setFilterOpen(false)
            }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-[12.5px] font-medium text-gray-600 hover:border-gray-300 transition-colors"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            Sort
          </button>
          {sortOpen && (
            <>
              <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setSortOpen(false)} aria-label="Close" />
              <div className="absolute right-0 top-9 z-50 w-52 bg-white rounded-xl border border-gray-200 shadow-xl p-1.5">
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      setSort(s.value)
                      setSortOpen(false)
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-[12.5px] transition-colors",
                      sort === s.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── The grid ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
        </div>
      ) : !visibleOrders.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Palette className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">{orders?.length ? "Nothing matches" : "No orders yet"}</p>
          <p className="text-gray-400 text-[12.5px] mt-1">
            {orders?.length ? "Adjust the filter or search." : "Your agency will post work here for you to review."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[1180px] border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="border border-gray-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500 w-10 text-center">#</th>
                <th className="border border-gray-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">Status</th>
                <th className="border border-gray-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500 min-w-[150px]">Caption </th>
                <th className="border border-gray-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500 min-w-[220px]">Descriptions</th>
                <th className="border border-gray-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500 min-w-[220px]">Hash Tag</th>
                <th className="border border-gray-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">Visual</th>
                <th className="border border-gray-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500 min-w-[200px]">Revision Feedback</th>
                <th className="border border-gray-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500 text-center">Approved?</th>
                <th className="border border-gray-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">Progress</th>
                <th className="border border-gray-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">Importent Date</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((o, rowIndex) => {
                
                const isApproving = busyAction?.id === o.id && busyAction.type === "approve"
                const isRejectingSubmit = busyAction?.id === o.id && busyAction.type === "reject"
                const anyBusy = busyAction?.id === o.id
                const rejecting = rejectingId === o.id
                const existingFeedback = lastClientFeedback(o)
                return (
                  <tr
                    key={o.id}
                    className={cn(
                      "align-top transition-colors",
                      canAct(o) ? "bg-violet-50/20" : "hover:bg-gray-50/40",
                    )}
                  >
                    <td className="border border-gray-200 px-3 py-4 text-[12px] text-gray-500 text-center">{rowIndex + 1}</td>
                    {/* Status - updates the moment a decision is made (query invalidation) */}
                    <td className="border border-gray-200 px-3 py-4 text-center">
                      {anyBusy ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…
                        </span>
                      ) : (
                        <OrderStatusBadge status={o.status} />
                      )}
                    </td>
                    <td className="border border-gray-200 px-3 py-4">
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600 whitespace-nowrap mb-1.5">
                        {orderTypeLabel(o)}
                      </span>
                      <p className="text-[13px] font-semibold text-gray-900 leading-snug">{o.title}</p>
                      <p className="text-[10.5px] text-gray-400 mt-0.5">
                        {formatDistanceToNow(new Date(o.updatedAt), { addSuffix: true })}
                      </p>
                    </td>
                    <td className="border border-gray-200 px-3 py-4">
                      <div className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {o.details.length > 250 ? `${o.details.slice(0, 250)}...` : o.details}
                      </div>
                      {o.details.length > 250 && (
                        <button
                          type="button"
                          onClick={() => setDescModal({ title: o.title, details: o.details })}
                          className="text-[10px] text-blue-600 hover:text-blue-700 font-medium mt-1"
                        >
                          See more
                        </button>
                      )}
                      {/* {o.proposalNote && (
                        <p className="text-[10px] text-violet-600 mt-1.5 italic leading-relaxed">“{o.proposalNote}”</p>
                      )} */}
                    </td>
                    <td className="border border-gray-200 px-3 py-4  ">
                      <div className="flex flex-wrap gap-1">
                        {(o.hashtags?.length ? o.hashtags : []).map((tag, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700 whitespace-nowrap">
                            #{tag}
                          </span>
                        ))}
                        {(!o.hashtags || o.hashtags.length === 0) && (
                          <span className="text-[11px] text-gray-300">-</span>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-200 px-3 py-4 mx-auto">
                      <VisualCell files={o.files} onOpen={(i) => setLightbox({ files: o.files, index: i })}  />
                    </td>
                    {/* Revision feedback - typed DIRECTLY in this cell when rejecting */}
                    <td 
                      className={cn(
                        "border border-gray-200 px-3 py-4",
                        !rejecting && "cursor-text hover:bg-gray-50 transition-colors"
                      )}
                      onClick={() => {
                        if (!rejecting && !anyBusy && o.status !== "COMPLETED" && o.status !== "CANCELLED") {
                          setRejectingId(o.id)
                          setFeedback(existingFeedback || "")
                        }
                      }}
                      title={!rejecting && o.status !== "COMPLETED" && o.status !== "CANCELLED" ? "Click to write or edit feedback" : undefined}
                    >
                      {rejecting ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <textarea
                            ref={feedbackRef}
                            autoFocus
                            value={feedback}
                            disabled={o.status === "COMPLETED"}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="What should the team change?"
                            className="w-full text-[12px] border border-blue-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 min-h-[64px]"
                          />
                          <div className="flex gap-1.5 mt-1.5">
                            {feedback.trim() !== (existingFeedback || "") && (
                              <button
                                type="button"
                                disabled={isRejectingSubmit || !feedback.trim()}
                                onClick={(e) => { e.stopPropagation(); sendReject(o); }}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold px-2.5 py-1.5 transition-colors disabled:opacity-50"
                              >
                                {isRejectingSubmit && <Loader2 className="w-3 h-3 animate-spin" />}
                                {existingFeedback ? "Update" : "Send"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setRejectingId(null)
                                setFeedback("")
                              }}
                              className="inline-flex items-center rounded-md border border-gray-200 bg-white text-gray-500 text-[11px] font-medium px-2.5 py-1.5 hover:border-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="min-h-[20px]">
                          {existingFeedback ? (
                            <p className="text-[12px] text-gray-600 leading-relaxed">{existingFeedback}</p>
                          ) : (
                            <span className="text-[11px] text-gray-300">-</span>
                          )}
                        </div>
                      )}
                    </td>
                    {/* Approved? - decision buttons live in the row, like the reference */}
                    <td className="border border-gray-200 px-3 py-4 whitespace-nowrap text-center">
                      {o.status === "COMPLETED" ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100">
                          <Check className="w-4 h-4 text-emerald-600" />
                        </span>
                      ) : o.status === "CANCELLED" ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100">
                          <X className="w-4 h-4 text-gray-400" />
                        </span>
                      ) : canAct(o) ? (
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            disabled={anyBusy}
                            onClick={() => approve(o)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold px-3 py-1.5 transition-colors disabled:opacity-60"
                          >
                            {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={anyBusy}
                            onClick={() => {
                              if (rejecting) {
                                setRejectingId(null)
                              } else {
                                setRejectingId(o.id)
                                setFeedback(existingFeedback || "")
                              }
                            }}
                            className={cn(
                              "inline-flex items-center justify-center gap-1.5 rounded-lg border text-[12px] font-semibold px-3 py-1.5 transition-colors disabled:opacity-60",
                              rejecting
                                ? "border-red-300 bg-red-50 text-red-600"
                                : "border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:text-red-600",
                            )}
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300">Waiting</span>
                      )}
                    </td>
                    <td className="border border-gray-200 px-3 py-4">
                      <ProgressSteps status={o.status} compact />
                      <p className={`${getStageStyle(o.status).note} {getStageStyle(o.status).bar} mt-3`}>{capitalizeStage(o.status)}</p>
                    </td>
                    <td className="border border-gray-200 px-3 py-4 whitespace-nowrap">
                      {o.dueDate ? (
                        <span className={cn("inline-flex items-center gap-1 text-[12px]", isOverdue(o) ? "text-red-600 font-semibold" : "text-gray-500")}>
                          <CalendarDays className="w-3.5 h-3.5" />
                          {format(new Date(o.dueDate), "MMM d")}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-3 py-2.5 border-t border-gray-200 text-[11.5px] text-gray-500 bg-gray-50 rounded-b-lg">{visibleOrders.length} posts</div>
        </div>
      )}

      {lightbox && (
        <Lightbox
          files={lightbox.files}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox({ ...lightbox, index })}
          onClose={() => setLightbox(null)}
        />
      )}

      {descModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => setDescModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{descModal.title}</h2>
              <button type="button" onClick={() => setDescModal(null)} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{descModal.details}</p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

export default function Page() {
  return (
    <AuthGuard allowedRoles={["SUB_ACCOUNT"]} redirectTo="/social">
      <ClientApprovalGrid />
    </AuthGuard>
  )
}
