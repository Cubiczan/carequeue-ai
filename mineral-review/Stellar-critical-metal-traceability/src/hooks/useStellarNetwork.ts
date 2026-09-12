import { useQuery } from "@tanstack/react-query";
import { getLatestLedger, horizon } from "@/lib/stellar";

export function useStellarLedger() {
  return useQuery({
    queryKey: ["stellar-ledger"],
    queryFn: getLatestLedger,
    refetchInterval: 6000, // Stellar ~5s block time
    retry: 2,
  });
}

export function useStellarLedgerHistory(limit = 10) {
  return useQuery({
    queryKey: ["stellar-ledger-history", limit],
    queryFn: async () => {
      const records = await horizon.ledgers().limit(limit).order("desc").call();
      return records.records;
    },
    refetchInterval: 10000,
    retry: 2,
  });
}
