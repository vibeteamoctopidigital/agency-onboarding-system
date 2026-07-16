import axios from "axios"
import { tokenStorage } from "@/lib/token-storage"

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
})

axiosInstance.interceptors.request.use(
  (configReq) => {
    // Allow explicit Authorization headers (e.g. impersonation) to bypass
    // the automatic token selection.
    if (configReq.headers.Authorization) return configReq
    const token = tokenStorage.getAccessToken()
    if (token) {
      configReq.headers.Authorization = `Bearer ${token}`
    }
    return configReq
  },
  (error) => Promise.reject(error),
)

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

function redirectToLogin() {
  if (typeof window === "undefined") return
  const path = window.location.pathname
  if (path.startsWith("/portal")) return
  // Sub-account surfaces: send clients back to their GHL-handshake entry -
  // the staff email/password login is useless to them inside the GHL iframe.
  if (path.startsWith("/client")) {
    window.location.href = "/portal"
    return
  }
  if (path.startsWith("/social/client")) {
    window.location.href = "/social"
    return
  }
  if (path === "/social") return // entry page handles its own auth flow
  window.location.href = "/login"
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return axiosInstance(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = tokenStorage.getRefreshToken()
        if (!refreshToken) {
          tokenStorage.clear()
          redirectToLogin()
          return Promise.reject(error)
        }

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken },
        )

        const { accessToken, refreshToken: newRefreshToken } = response.data.data
        tokenStorage.setTokens(accessToken, newRefreshToken)

        processQueue(null, accessToken)

        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        tokenStorage.clear()
        redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
