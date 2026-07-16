import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { QUERY_KEYS } from "@/constants"
import { TicketService } from "@/services/ticket.service"

export function useTickets(params?: {
  stage?: string
  priority?: string
  category?: string
  assigneeId?: string
  subAccountId?: string
  search?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TICKETS, params],
    queryFn: () => TicketService.listTickets(params),
  })
}

export function useMyTickets() {
  return useQuery({
    queryKey: QUERY_KEYS.MY_TICKETS,
    queryFn: () => TicketService.getMine(),
  })
}

export function useMySubmittedTickets() {
  return useQuery({
    // Distinct from MY_TICKETS (team member's /tickets/mine) - same key with a
    // different fetcher would cross-serve cached payloads between roles.
    queryKey: ["tickets", "my-submitted"] as const,
    queryFn: () => TicketService.getMy(),
  })
}

export function useUnassignedTickets() {
  return useQuery({
    queryKey: QUERY_KEYS.UNASSIGNED,
    queryFn: () => TicketService.getUnassigned(),
  })
}

export function useReviewTickets() {
  return useQuery({
    queryKey: QUERY_KEYS.REVIEW,
    queryFn: () => TicketService.getReview(),
  })
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.TICKET(id),
    queryFn: () => TicketService.getById(id),
    enabled: !!id,
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      subject: string
      description?: string
      category: string
      priority: string
      subAccountId?: string
    }) => TicketService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TICKETS })
      queryClient.invalidateQueries({ queryKey: ["ticket"] })
    },
  })
}

export function useMoveStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { stage: string; comment?: string; sendEmail?: boolean }
    }) => TicketService.moveStage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TICKETS })
      queryClient.invalidateQueries({ queryKey: ["ticket"] })
    },
  })
}

export function useAssignTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string | null }) =>
      TicketService.assign(id, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TICKETS })
      queryClient.invalidateQueries({ queryKey: ["ticket"] })
    },
  })
}

export function useUploadAttachments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, files, historyId }: { id: string; files: File[]; historyId?: string }) =>
      TicketService.uploadAttachments(id, files, historyId),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TICKET(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TICKETS })
    },
  })
}

export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { comment: string; isInternalNote?: boolean; sendEmail?: boolean }
    }) => TicketService.addComment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TICKETS })
      queryClient.invalidateQueries({ queryKey: ["ticket"] })
    },
  })
}

export function useApproveTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      TicketService.approve(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TICKETS })
      queryClient.invalidateQueries({ queryKey: ["ticket"] })
    },
  })
}

export function useRejectTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      TicketService.reject(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TICKETS })
      queryClient.invalidateQueries({ queryKey: ["ticket"] })
    },
  })
}
