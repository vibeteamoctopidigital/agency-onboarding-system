import { API_ENDPOINTS } from "@/constants"
import axiosInstance from "@/lib/axios"

interface DashboardAnalytics {
  total: number
  resolved: number
  unassigned: number
  avgTouches: number
  stageBreakdown: Record<string, number>
  agentStats: Array<{
    id: string
    name: string
    initials: string
    totalAssigned: number
    solved: number
    open: number
  }>
}

export const AnalyticsService = {
  async getDashboard() {
    const response = await axiosInstance.get<{
      success: boolean
      data: DashboardAnalytics
    }>(API_ENDPOINTS.ANALYTICS.DASHBOARD)
    return response.data.data
  },
}
