import { API_ENDPOINTS } from "@/constants"
import axiosInstance from "@/lib/axios"
import type { SubAccount, TeamMember } from "@/types"

export const UserService = {
  async getTeamMembers() {
    const response = await axiosInstance.get<{ success: boolean; data: TeamMember[] }>(
      API_ENDPOINTS.USERS.TEAM,
    )
    return response.data.data
  },

  async createTeamMember(data: { name: string; email: string; skills: string[] }) {
    const response = await axiosInstance.post<{
      success: boolean
      data: TeamMember & { tempPassword: string }
    }>(API_ENDPOINTS.USERS.TEAM, data)
    return response.data.data
  },

  async syncTeamFromGhl() {
    const response = await axiosInstance.post<{
      success: boolean
      data: {
        totalInGhl: number
        created: Array<{ id: string; name: string; email: string; tempPassword: string }>
        skippedExisting: number
        skippedNoEmail: number
      }
    }>(API_ENDPOINTS.USERS.TEAM_SYNC_GHL)
    return response.data.data
  },

  async updateTeamMember(
    id: string,
    data: { name?: string; skills?: string[]; isAvailable?: boolean },
  ) {
    const response = await axiosInstance.put<{ success: boolean; data: TeamMember }>(
      API_ENDPOINTS.USERS.TEAM_BY_ID(id),
      data,
    )
    return response.data.data
  },

  async deleteTeamMember(id: string) {
    const response = await axiosInstance.delete<{
      success: boolean
      data: { message: string }
    }>(API_ENDPOINTS.USERS.TEAM_BY_ID(id))
    return response.data.data
  },

  async toggleAvailability() {
    const response = await axiosInstance.patch<{
      success: boolean
      data: { isAvailable: boolean }
    }>(API_ENDPOINTS.USERS.AVAILABILITY)
    return response.data.data
  },

  async getMyStats() {
    const response = await axiosInstance.get<{
      success: boolean
      data: {
        totalAssigned: number
        totalSolved: number
        openCount: number
        reviewCount: number
        isAvailable: boolean
      }
    }>(API_ENDPOINTS.USERS.STATS_ME)
    return response.data.data
  },

  async getAllStats() {
    const response = await axiosInstance.get<{
      success: boolean
      data: Array<{
        id: string
        name: string
        initials: string
        totalAssigned: number
        solved: number
        open: number
      }>
    }>(API_ENDPOINTS.USERS.STATS_ALL)
    return response.data.data
  },

  async getSubAccounts() {
    const response = await axiosInstance.get<{ success: boolean; data: SubAccount[] }>(
      API_ENDPOINTS.USERS.SUB_ACCOUNTS,
    )
    return response.data.data
  },

  async createSubAccount(data: {
    name: string
    locationId: string
    contactEmail?: string
    plan?: string
  }) {
    const response = await axiosInstance.post<{ success: boolean; data: SubAccount }>(
      API_ENDPOINTS.USERS.SUB_ACCOUNTS,
      data,
    )
    return response.data.data
  },
}
