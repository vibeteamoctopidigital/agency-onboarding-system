import { API_ENDPOINTS } from "@/constants"
import axiosInstance from "@/lib/axios"
import { tokenStorage } from "@/lib/token-storage"
import type { AuthResponse, User } from "@/types"

export const AuthService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await axiosInstance.post<{ success: boolean; data: AuthResponse }>(
      API_ENDPOINTS.AUTH.LOGIN,
      { email, password },
    )
    return response.data.data
  },

  /** First-time agency owner connect - validates BOTH GHL keys server-side. */
  async connect(params: {
    agencyName: string
    email: string
    password: string
    ghlCompanyId: string
    ghlApiKey: string
    ghlMediaLocationId: string
    ghlMediaApiKey: string
  }): Promise<AuthResponse | any> {
    const response = await axiosInstance.post<{ success: boolean; data: AuthResponse }>(
      API_ENDPOINTS.AUTH.CONNECT,
      params,
    );
    return response.data.data
  },

  /** Agency owner impersonates a team member - returns tokens for their session. */
  async impersonate(userId: string): Promise<AuthResponse> {
    // The axios interceptor picks the token based on the current URL path.
    // On /team/{userId} it would try the (non-existent) team token, so we
    // explicitly attach the admin token for this request.
    const adminToken =
      tokenStorage.getTokensForRole("admin").accessToken ?? tokenStorage.getAccessToken()
    const response = await axiosInstance.post<{ success: boolean; data: AuthResponse }>(
      API_ENDPOINTS.AUTH.IMPERSONATE,
      { userId },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    )
    return response.data.data
  },

  /** Owner sets/updates the media-storage sub-account credentials (validated live). */
  async updateMediaStorage(params: { ghlMediaLocationId: string; ghlMediaApiKey: string }) {
    const response = await axiosInstance.put<{ success: boolean; data: { ghlMediaLocationId: string } }>(
      API_ENDPOINTS.AUTH.MEDIA_STORAGE,
      params,
    )
    return response.data.data
  },

  async getMe(): Promise<User> {
    const response = await axiosInstance.get<{ success: boolean; data: User }>(
      API_ENDPOINTS.AUTH.ME,
    )
    return response.data.data
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await axiosInstance.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    })
  },

  /** First-login password set for a team member on a temporary password. */
  async firstLoginPassword(newPassword: string): Promise<void> {
    await axiosInstance.post(API_ENDPOINTS.AUTH.FIRST_LOGIN_PASSWORD, { newPassword })
  },
}
