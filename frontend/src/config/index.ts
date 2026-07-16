export const config = {
  app: {
    name: "Agency Dashboard",
    description: "Enterprise agency management system",
    version: "1.0.0",
  },
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50, 100] as const,
  },
  auth: {
    tokenKey: "access_token",
    refreshTokenKey: "refresh_token",
    adminTokenKey: "admin_access_token",
    adminRefreshTokenKey: "admin_refresh_token",
    teamTokenKey: "team_access_token",
    teamRefreshTokenKey: "team_refresh_token",
    clientTokenKey: "client_access_token",
    clientRefreshTokenKey: "client_refresh_token",
    sessionKey: "session",
  },
} as const
