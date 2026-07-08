import { parseEther } from "viem";

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
