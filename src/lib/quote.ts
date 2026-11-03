import { formatEther, parseEther } from "viem";

/** Ported 1:1 from legacy-site/getprice.js `getQuoteSimple` — the FundMe contract splits every
 * funding tx 20% buyback swap / 80% batch-compensation allocation; this mirrors that split so the
 * UI can preview the exact same numbers before the user submits a transaction. */
export function splitFundAmount(ethAmount: string) {
  const totalWei = parseEther(ethAmount);
  const buybackWei = (totalWei * 20n) / 100n;
  const batchWei = totalWei - buybackWei;
  return { totalWei, buybackWei, batchWei };
}

/** compensation = getPicaPerWeth() * batchAllocation / 1e18, matching the contract's own formula. */
export function calculateCompensation(picaPerWeth: bigint, batchWei: bigint): bigint {
  return (picaPerWeth * batchWei) / parseEther("1");
}

/** Headroom over the exact minimum: the feed can tick down between quoting and the tx landing. */
export const MINIMUM_FUND_BUFFER_BPS = 100n;

/** Smallest msg.value that clears FundMe's `MINIMUM_USD` check. Mirrors PriceConverter: the
 * 8-decimal Chainlink answer is scaled to 18 decimals and `usd = price * wei / 1e18`, so the bound
 * is ceil(MINIMUM_USD * 1e18 / price), plus MINIMUM_FUND_BUFFER_BPS. */
export function minimumFundWei(minimumUsd: bigint, ethUsdAnswer: bigint): bigint {
  const price = ethUsdAnswer * 10n ** 10n;
  const exact = (minimumUsd * parseEther("1") + price - 1n) / price;
  return (exact * (10_000n + MINIMUM_FUND_BUFFER_BPS) + 9_999n) / 10_000n;
}

/** `wei` as an ETH string rounded *up* to 6 decimals, so filling it in never lands under the bound. */
export function roundUpEth(wei: bigint): string {
  const step = 10n ** 12n;
  return formatEther(((wei + step - 1n) / step) * step);
}

export function calculateBonusTokens(totalPica: bigint, bonusPercentage: bigint | number): bigint {
  return (totalPica * BigInt(bonusPercentage)) / 100n;
}

export interface FundQuote {
  buybackWei: bigint;
  batchWei: bigint;
  swapOutputPica: bigint;
  compensationPica: bigint;
  totalPica: bigint;
  bonusPercentage: bigint;
  tierName: string;
  bonusPica: bigint;
  totalWithBonus: bigint;
}
