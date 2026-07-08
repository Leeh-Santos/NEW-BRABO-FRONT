import { formatEther, formatUnits } from "viem";

export function formatNumber(value: number | string, decimals = 2): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!num || Number.isNaN(num)) return (0).toFixed(decimals);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatTokenAmount(amount: bigint | undefined, decimals = 18): string {
  if (amount === undefined) return "0.00";
  return formatNumber(formatUnits(amount, decimals), 2);
}

export function formatEthAmount(amount: bigint | undefined, decimals = 4): string {
  if (amount === undefined) return "0.00";
  return formatNumber(formatEther(amount), decimals);
}

export function formatUsd(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "$--";
  return `$${formatNumber(value, 2)}`;
}

export function formatMarketCap(marketCap: number | null | undefined): string {
  if (!marketCap || marketCap <= 0) return "$--";
  if (marketCap >= 1_000_000) return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  if (marketCap >= 1_000) return `$${(marketCap / 1_000).toFixed(2)}K`;
  return `$${marketCap.toFixed(2)}`;
}

export function formatTokenPrice(priceUsd: number | null | undefined): string {
  if (!priceUsd || priceUsd <= 0) return "$--";
  if (priceUsd < 0.000001) return `$${priceUsd.toExponential(4)}`;
  if (priceUsd < 0.01) return `$${formatNumber(priceUsd, 8)}`;
  return `$${formatNumber(priceUsd, 4)}`;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
