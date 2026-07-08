import { useQuery } from "@tanstack/react-query";

async function fetchEthPriceUsd(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
  );
  const data = await res.json();
  return data.ethereum.usd as number;
}

/** Matches legacy-site/script.js's 60s cache on the CoinGecko ETH/USD lookup. */
export function useEthPrice() {
  return useQuery({
    queryKey: ["eth-price"],
    queryFn: fetchEthPriceUsd,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
