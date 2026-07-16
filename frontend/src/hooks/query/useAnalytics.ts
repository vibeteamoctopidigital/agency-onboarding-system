import { useQuery } from "@tanstack/react-query"
import { QUERY_KEYS } from "@/constants"
import { AnalyticsService } from "@/services/analytics.service"

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: QUERY_KEYS.ANALYTICS,
    queryFn: () => AnalyticsService.getDashboard(),
  })
}
