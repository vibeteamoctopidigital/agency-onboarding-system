import { API_ENDPOINTS } from "@/constants"
import axiosInstance from "@/lib/axios"
import type { Attachment, Ticket, TicketStageHistory } from "@/types"

export const TicketService = {
  async listTickets(params?: {
    stage?: string
    priority?: string
    category?: string
    assigneeId?: string
    subAccountId?: string
    search?: string
    page?: number
    limit?: number
  }) {
    const response = await axiosInstance.get<{
      success: boolean
      tickets: Ticket[]
      meta: { total: number; page: number; limit: number; totalPages: number }
    }>(API_ENDPOINTS.TICKETS.LIST, { params })
    return response.data
  },

  async getMine() {
    const response = await axiosInstance.get<{ success: boolean; data: Ticket[] }>(
      API_ENDPOINTS.TICKETS.MINE,
    )
    return response.data.data
  },

  async getMy() {
    const response = await axiosInstance.get<{ success: boolean; data: Ticket[] }>(
      API_ENDPOINTS.TICKETS.MY,
    )
    return response.data.data
  },

  async getUnassigned() {
    const response = await axiosInstance.get<{ success: boolean; data: Ticket[] }>(
      API_ENDPOINTS.TICKETS.UNASSIGNED,
    )
    return response.data.data
  },

  async getReview() {
    const response = await axiosInstance.get<{ success: boolean; data: Ticket[] }>(
      API_ENDPOINTS.TICKETS.REVIEW,
    )
    return response.data.data
  },

  async getById(id: string) {
    const response = await axiosInstance.get<{ success: boolean; data: Ticket }>(
      API_ENDPOINTS.TICKETS.BY_ID(id),
    )
    return response.data.data
  },

  async create(data: {
    subject: string
    description?: string
    category: string
    priority: string
    subAccountId?: string
  }) {
    const response = await axiosInstance.post<{ success: boolean; data: Ticket }>(
      API_ENDPOINTS.TICKETS.LIST,
      data,
    )
    return response.data.data
  },

  async moveStage(
    id: string,
    data: { stage: string; comment?: string; sendEmail?: boolean },
  ) {
    const response = await axiosInstance.patch<{ success: boolean; data: Ticket }>(
      API_ENDPOINTS.TICKETS.MOVE_STAGE(id),
      data,
    )
    return response.data.data
  },

  async assign(id: string, assigneeId: string | null) {
    const response = await axiosInstance.patch<{ success: boolean; data: Ticket }>(
      API_ENDPOINTS.TICKETS.ASSIGN(id),
      { assigneeId },
    )
    return response.data.data
  },

  async addComment(
    id: string,
    data: { comment: string; isInternalNote?: boolean; sendEmail?: boolean },
  ) {
    const response = await axiosInstance.post<{
      success: boolean
      data: TicketStageHistory
    }>(API_ENDPOINTS.TICKETS.COMMENT(id), data)
    return response.data.data
  },

  /** Upload one or more files to a ticket, optionally tied to a specific reply. */
  async uploadAttachments(id: string, files: File[], historyId?: string) {
    const form = new FormData()
    for (const file of files) form.append("files", file)
    if (historyId) form.append("historyId", historyId)
    const response = await axiosInstance.post<{ success: boolean; data: Attachment[] }>(
      API_ENDPOINTS.TICKETS.ATTACHMENTS(id),
      form,
      // Unset the instance's default application/json so the browser sets
      // multipart/form-data WITH the boundary multer needs to parse the body.
      { headers: { "Content-Type": undefined } as never },
    )
    return response.data.data
  },

  async getHistory(id: string) {
    const response = await axiosInstance.get<{
      success: boolean
      data: TicketStageHistory[]
    }>(API_ENDPOINTS.TICKETS.HISTORY(id))
    return response.data.data
  },

  async approve(id: string, note?: string) {
    const response = await axiosInstance.post<{ success: boolean; data: Ticket }>(
      API_ENDPOINTS.TICKETS.APPROVE(id),
      { note },
    )
    return response.data.data
  },

  async reject(id: string, note: string) {
    const response = await axiosInstance.post<{ success: boolean; data: Ticket }>(
      API_ENDPOINTS.TICKETS.REJECT(id),
      { note },
    )
    return response.data.data
  },
}
