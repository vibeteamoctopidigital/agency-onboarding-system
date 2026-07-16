import { API_ENDPOINTS } from "@/constants"
import axiosInstance from "@/lib/axios"

export interface SubAccountRequest {
  id: string
  ghlLocationId: string
  name: string
  contactEmail: string | null
  status: "PENDING" | "ACTIVE" | "REJECTED" | "BLOCKED"
  requestedAt: string
  decidedAt?: string | null
  rejectionComment?: string | null
  decidedBy?: { name: string } | null
}

export interface BulkApproveResult {
  totalInGhl: number
  activated: number
  skipped: number
}

/** One GHL location merged with its connection status in our DB. */
export interface SubAccountOverviewRow {
  locationId: string
  name: string
  contactEmail: string | null
  status: "ACTIVE" | "PENDING" | "REJECTED" | "BLOCKED" | "NOT_CONNECTED"
  subAccountId: string | null
  /** The client's portal user id - set once they've entered the portal (links to the profile page). */
  userId: string | null
  requestedAt: string | null
  decidedAt: string | null
  decidedBy: string | null
  rejectionComment: string | null
  openTickets: number
  /** false = row exists in our DB but the location is gone from GHL */
  inGhl: boolean
}

export interface SubAccountOverview {
  locations: SubAccountOverviewRow[]
  totals: { inGhl: number; connected: number; pending: number; notConnected: number; rejected: number; blocked: number }
  syncedAt: string
  fromCache: boolean
}

export const SubAccountsService = {
  async listRequests(): Promise<SubAccountRequest[]> {
    const response = await axiosInstance.get<{ success: boolean; data: SubAccountRequest[] }>(
      API_ENDPOINTS.SUB_ACCOUNTS.REQUESTS,
    )
    return response.data.data
  },

  async listAll(): Promise<SubAccountRequest[]> {
    const response = await axiosInstance.get<{ success: boolean; data: SubAccountRequest[] }>(
      API_ENDPOINTS.SUB_ACCOUNTS.LIST,
    )
    return response.data.data
  },

  async approve(id: string): Promise<SubAccountRequest> {
    const response = await axiosInstance.post<{ success: boolean; data: SubAccountRequest }>(
      API_ENDPOINTS.SUB_ACCOUNTS.APPROVE(id),
    )
    return response.data.data
  },

  async reject(id: string, comment?: string): Promise<SubAccountRequest> {
    const response = await axiosInstance.post<{ success: boolean; data: SubAccountRequest }>(
      API_ENDPOINTS.SUB_ACCOUNTS.REJECT(id),
      { comment },
    )
    return response.data.data
  },

  async bulkApprove(): Promise<BulkApproveResult> {
    const response = await axiosInstance.post<{ success: boolean; data: BulkApproveResult }>(
      API_ENDPOINTS.SUB_ACCOUNTS.BULK_APPROVE,
    )
    return response.data.data
  },

  async overview(refresh = false): Promise<SubAccountOverview> {
    const response = await axiosInstance.get<{ success: boolean; data: SubAccountOverview }>(
      API_ENDPOINTS.SUB_ACCOUNTS.OVERVIEW,
      { params: refresh ? { refresh: "true" } : undefined },
    )
    return response.data.data
  },

  async changeStatus(id: string, status: "ACTIVE" | "BLOCKED" | "REJECTED", comment?: string): Promise<SubAccountRequest> {
    const response = await axiosInstance.patch<{ success: boolean; data: SubAccountRequest }>(
      API_ENDPOINTS.SUB_ACCOUNTS.STATUS(id),
      { status, comment },
    )
    return response.data.data
  },

  async connectLocation(locationId: string): Promise<SubAccountRequest> {
    const response = await axiosInstance.post<{ success: boolean; data: SubAccountRequest }>(
      API_ENDPOINTS.SUB_ACCOUNTS.CONNECT,
      { locationId },
    )
    return response.data.data
  },
}
