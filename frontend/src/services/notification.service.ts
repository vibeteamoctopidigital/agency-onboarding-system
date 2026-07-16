import { API_ENDPOINTS } from "@/constants"
import axiosInstance from "@/lib/axios"
import type { Notification } from "@/types"

export const NotificationService = {
  async getNotifications(params?: { page?: number; limit?: number }) {
    const response = await axiosInstance.get<{
      success: boolean
      notifications: Notification[]
      meta: { total: number; page: number; limit: number; totalPages: number }
    }>(API_ENDPOINTS.NOTIFICATIONS.LIST, { params })
    return response.data
  },

  async getUnreadCount() {
    const response = await axiosInstance.get<{
      success: boolean
      data: { unreadCount: number }
    }>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT)
    return response.data.data
  },

  async markAsRead(id: string) {
    const response = await axiosInstance.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id))
    return response.data
  },

  async markAllAsRead() {
    const response = await axiosInstance.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ)
    return response.data
  },
}
