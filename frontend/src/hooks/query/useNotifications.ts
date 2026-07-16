import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { QUERY_KEYS } from "@/constants"
import { NotificationService } from "@/services/notification.service"

export function useNotifications(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.NOTIFICATIONS, params],
    queryFn: () => NotificationService.getNotifications(params),
    refetchInterval: 30000,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: QUERY_KEYS.UNREAD_COUNT,
    queryFn: () => NotificationService.getUnreadCount(),
    refetchInterval: 30000,
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UNREAD_COUNT })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => NotificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UNREAD_COUNT })
    },
  })
}
