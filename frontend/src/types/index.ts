export type UserRole = "AGENCY_OWNER" | "TEAM_MEMBER" | "SUB_ACCOUNT"

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export type TicketStage =
  | "NEW"
  | "ACCEPTED"
  | "WORKING"
  | "PENDING"
  | "REVIEW"
  | "RESOLVED"

export interface User {
  id: string
  email?: string
  name: string
  initials: string
  role: UserRole
  agencyId: string
  agencyName?: string
  locationId?: string
  skills?: string[]
  isAvailable?: boolean
  tempPassword?: boolean
  contactEmail?: string
  plan?: string
  createdAt?: string
  /** Owner only - whether the media-storage sub-account credentials are saved. */
  mediaStorageConfigured?: boolean
  mediaLocationId?: string | null
}

export interface Ticket {
  id: string
  displayId: number
  subject: string
  description: string
  priority: TicketPriority
  category: string
  stage: TicketStage
  assignee: Pick<User, "id" | "name" | "initials"> | null
  subAccount: Pick<User, "id" | "name" | "initials"> | null
  history: TicketStageHistory[]
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface TicketStageHistory {
  id: string
  stage: TicketStage
  actorId: string
  actor: Pick<User, "id" | "name" | "initials" | "role">
  comment: string
  isInternalNote: boolean
  wasEmailed: boolean
  createdAt: string
}

export interface Attachment {
  id: string
  historyId?: string | null
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy: Pick<User, "id" | "name">
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  ticketId?: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  ticket?: Pick<Ticket, "id" | "displayId" | "subject">
}

export interface TeamMember {
  id: string
  name: string
  email?: string
  initials: string
  skills: string[]
  isAvailable: boolean
  openTickets: number
  reviewTickets: number
  createdAt: string
}

export interface SubAccount {
  id: string
  name: string
  initials: string
  contactEmail?: string
  plan?: string
  locationId?: string
  openTickets: number
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  code: string
  message: string
  details?: { field: string; message: string }[]
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}
