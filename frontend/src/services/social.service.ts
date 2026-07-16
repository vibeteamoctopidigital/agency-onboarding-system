import { API_ENDPOINTS } from "@/constants"
import axiosInstance from "@/lib/axios"

export type SocialOrderStatus =
  | "PROPOSED"
  | "SUBMITTED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"

export interface SocialOrderUpdate {
  id: string
  status: SocialOrderStatus
  note: string
  createdAt: string
  actor: { id: string; name: string; initials: string; role: string }
}

export interface SocialOrderFile {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  createdAt: string
  uploadedBy: { id: string; name: string; role: string }
}

export interface SocialOrder {
  id: string
  displayId: number
  title: string
  details: string
  orderType: string
  customType: string | null
  hashtags: string[]
  dueDate: string | null
  status: SocialOrderStatus
  proposalNote: string | null
  subAccount: { id: string; name: string; initials: string; contactEmail?: string | null }
  createdBy: { id: string; name: string; initials: string; role: string }
  assignees: Array<{ id: string; name: string; initials: string }>
  updates: SocialOrderUpdate[]
  files: SocialOrderFile[]
  acceptedAt: string | null
  deliveredAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SubAccountProfile {
  client: {
    id: string
    name: string
    initials: string
    contactEmail: string | null
    plan: string | null
    locationId: string | null
    createdAt: string
    isDeleted: boolean
    accessStatus: string
  }
  ticketStats: { total: number; solved: number; open: number; inReview: number }
  orderStats: {
    total: number
    active: number
    awaitingApproval: number
    delivered: number
    completed: number
    overdue: number
  }
  recentTickets: Array<{
    id: string
    displayId: number
    subject: string
    stage: string
    priority: string
    createdAt: string
    updatedAt: string
  }>
  recentOrders: Array<{
    id: string
    displayId: number
    title: string
    status: SocialOrderStatus
    orderType: string
    customType: string | null
    dueDate: string | null
    createdAt: string
    updatedAt: string
    completedAt: string | null
  }>
}

type OrderResponse = { success: boolean; data: SocialOrder }

export const SocialService = {
  async list(params?: { status?: string; subAccountId?: string; orderType?: string }) {
    const response = await axiosInstance.get<{ success: boolean; data: SocialOrder[] }>(
      API_ENDPOINTS.SOCIAL.ORDERS,
      { params },
    )
    return response.data.data
  },

  async getById(id: string) {
    const response = await axiosInstance.get<OrderResponse>(API_ENDPOINTS.SOCIAL.ORDER_BY_ID(id))
    return response.data.data
  },

  async create(data: {
    title: string
    details: string
    orderType: string
    customType?: string
    hashtags?: string[]
    dueDate?: string
    subAccountId?: string
    proposalNote?: string
  }) {
    const response = await axiosInstance.post<OrderResponse>(API_ENDPOINTS.SOCIAL.ORDERS, data)
    return response.data.data
  },

  async update(id: string, data: {
    title?: string
    details?: string
    orderType?: string
    customType?: string | null
    hashtags?: string[]
    dueDate?: string | null
    deletedFileIds?: string[]
  }) {
    const response = await axiosInstance.patch<OrderResponse>(API_ENDPOINTS.SOCIAL.ORDER_BY_ID(id), data)
    return response.data.data
  },

  async accept(id: string, note?: string) {
    const response = await axiosInstance.post<OrderResponse>(API_ENDPOINTS.SOCIAL.ACCEPT(id), { note })
    return response.data.data
  },

  async respondToProposal(id: string, approve: boolean, note?: string) {
    const response = await axiosInstance.post<OrderResponse>(API_ENDPOINTS.SOCIAL.RESPOND(id), { approve, note })
    return response.data.data
  },

  async assign(id: string, assigneeIds: string[]) {
    const response = await axiosInstance.patch<OrderResponse>(API_ENDPOINTS.SOCIAL.ASSIGN(id), { assigneeIds })
    return response.data.data
  },

  async setStatus(id: string, status: "IN_PROGRESS" | "DELIVERED", note?: string) {
    const response = await axiosInstance.patch<OrderResponse>(API_ENDPOINTS.SOCIAL.STATUS(id), { status, note })
    return response.data.data
  },

  async addProgressNote(id: string, note: string) {
    const response = await axiosInstance.post<{ success: boolean; data: SocialOrderUpdate }>(
      API_ENDPOINTS.SOCIAL.PROGRESS(id),
      { note },
    )
    return response.data.data
  },

  async confirm(id: string, note?: string) {
    const response = await axiosInstance.post<OrderResponse>(API_ENDPOINTS.SOCIAL.CONFIRM(id), { note })
    return response.data.data
  },

  async requestChanges(id: string, note: string) {
    const response = await axiosInstance.post<OrderResponse>(API_ENDPOINTS.SOCIAL.REQUEST_CHANGES(id), { note })
    return response.data.data
  },

  async cancel(id: string, note?: string) {
    const response = await axiosInstance.post<OrderResponse>(API_ENDPOINTS.SOCIAL.CANCEL(id), { note })
    return response.data.data
  },

  async uploadFiles(id: string, files: File[]) {
    const form = new FormData()
    for (const file of files) form.append("files", file)
    const response = await axiosInstance.post<{ success: boolean; data: SocialOrderFile[] }>(
      API_ENDPOINTS.SOCIAL.FILES(id),
      form,
      // Unset the default application/json so the browser sets the multipart boundary.
      { headers: { "Content-Type": undefined } as never },
    )
    return response.data.data
  },

  async subAccountProfile(id: string) {
    const response = await axiosInstance.get<{ success: boolean; data: SubAccountProfile }>(
      API_ENDPOINTS.SOCIAL.SUB_ACCOUNT_PROFILE(id),
    )
    return response.data.data
  },
}
