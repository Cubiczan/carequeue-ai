import { useQuery } from "@tanstack/react-query";
import { getNetworkMetrics, MOCK_NETWORK_METRICS } from "@/lib/liquify";

export function useLiquifyMetrics() {
  return useQuery({
    queryKey: ["liquify-metrics"],
    queryFn: async () => {
      try {
        return await getNetworkMetrics();
      } catch {
        // Fallback to mock data for demo
        return MOCK_NETWORK_METRICS;
      }
    },
    refetchInterval: 12000,
    retry: 2,
    staleTime: 10000,
  });
}
