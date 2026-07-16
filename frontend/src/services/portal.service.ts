import { API_ENDPOINTS } from "@/constants"
import axiosInstance from "@/lib/axios"
import type { User } from "@/types"

export type PortalEnterResult =
  | { status: "ACTIVE"; user: User; accessToken: string; refreshToken: string }
  | { status: "PENDING"; requestedAt: string; created: boolean }
  | { status: "REJECTED" }
  | { status: "BLOCKED" }
  | { status: "UNKNOWN_LOCATION" }

export const PortalService = {
  async enter(locationId: string): Promise<PortalEnterResult> {
    const response = await axiosInstance.post<{ success: boolean; data: PortalEnterResult }>(
      API_ENDPOINTS.PORTAL.ENTER,
      { locationId },
    )
    return response.data.data
  },

  /** Single-agency owner auto-login - validation is entirely server-side. */
  async adminEnter(): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const response = await axiosInstance.post<{
      success: boolean
      data: { user: User; accessToken: string; refreshToken: string }
    }>(API_ENDPOINTS.PORTAL.ADMIN_ENTER, {})
    return response.data.data
  },
}
