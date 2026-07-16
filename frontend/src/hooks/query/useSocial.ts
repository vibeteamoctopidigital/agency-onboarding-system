import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { QUERY_KEYS } from "@/constants"
import { SocialService } from "@/services/social.service"

export function useSocialOrders(params?: { status?: string; subAccountId?: string; orderType?: string }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SOCIAL_ORDERS, params],
    queryFn: () => SocialService.list(params),
    enabled: options?.enabled ?? true,
  })
}

export function useSocialOrder(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.SOCIAL_ORDER(id),
    queryFn: () => SocialService.getById(id),
    enabled: !!id,
  })
}

export function useSubAccountProfile(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.SUB_ACCOUNT_PROFILE(id),
    queryFn: () => SocialService.subAccountProfile(id),
    enabled: !!id,
  })
}

/** Shared invalidation for every order mutation - lists and the open order. */
function useInvalidateOrders() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SOCIAL_ORDERS })
    queryClient.invalidateQueries({ queryKey: ["social", "order"] })
    queryClient.invalidateQueries({ queryKey: ["social", "profile"] })
  }
}

export function useCreateOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: (data: Parameters<typeof SocialService.create>[0]) => SocialService.create(data),
    onSuccess: invalidate,
  })
}

export function useUpdateOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof SocialService.update>[1] }) =>
      SocialService.update(id, data),
    onSuccess: invalidate,
  })
}

export function useAcceptOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => SocialService.accept(id, note),
    onSuccess: invalidate,
  })
}

export function useRespondToProposal() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      SocialService.respondToProposal(id, approve, note),
    onSuccess: invalidate,
  })
}

export function useAssignOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, assigneeIds }: { id: string; assigneeIds: string[] }) =>
      SocialService.assign(id, assigneeIds),
    onSuccess: invalidate,
  })
}

export function useSetOrderStatus() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: "IN_PROGRESS" | "DELIVERED"; note?: string }) =>
      SocialService.setStatus(id, status, note),
    onSuccess: invalidate,
  })
}

export function useAddOrderNote() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => SocialService.addProgressNote(id, note),
    onSuccess: invalidate,
  })
}

export function useConfirmOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => SocialService.confirm(id, note),
    onSuccess: invalidate,
  })
}

export function useRequestOrderChanges() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => SocialService.requestChanges(id, note),
    onSuccess: invalidate,
  })
}

export function useCancelOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => SocialService.cancel(id, note),
    onSuccess: invalidate,
  })
}

export function useUploadOrderFiles() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) => SocialService.uploadFiles(id, files),
    onSuccess: invalidate,
  })
}
