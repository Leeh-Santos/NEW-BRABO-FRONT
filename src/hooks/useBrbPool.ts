import { useQuery } from "@tanstack/react-query";
import { BASE_ADDRESSES } from "../config/contracts";

interface BrbPoolData {
  priceUsd: number | null;
  marketCapUsd: number | null;
}

async function fetchBrbPool(): Promise<BrbPoolData> {
  const res = await fetch(
    `https://api.geckoterminal.com/api/v2/networks/base/pools/${BASE_ADDRESSES.BRB_WETH_POOL}`,
  );
  const data = await res.json();
  const attrs = data?.data?.attributes;
  if (!attrs) return { priceUsd: null, marketCapUsd: null };

  const priceUsd = attrs.base_token_price_usd ? parseFloat(attrs.base_token_price_usd) : null;
  const fdv = attrs.fdv_usd ? parseFloat(attrs.fdv_usd) : null;
  const marketCap = attrs.market_cap_usd ? parseFloat(attrs.market_cap_usd) : null;
  const capValue = fdv || marketCap;

  return {
    priceUsd: priceUsd && priceUsd > 0 ? priceUsd : null,
    marketCapUsd: capValue && capValue > 0 && capValue < 1_000_000_000_000 ? capValue : null,
  };
}

/** Matches legacy-site/script.js's 30s cache on the GeckoTerminal BRB/WETH pool lookup
 * (used for both BRB price and market cap — one fetch covers both). */
export function useBrbPool() {
  return useQuery({
    queryKey: ["brb-pool", BASE_ADDRESSES.BRB_WETH_POOL],
    queryFn: fetchBrbPool,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
