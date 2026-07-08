// Ported 1:1 from legacy-site/script.js `updateTierProgression`. Note this progression is driven
// purely by cumulative USD funded — it's independent of the NFT contract's actual minted tier
// (NftBrabo.getUserTier), which only advances once `upgradeTierForUser` has actually been called.
export const TIER_NAMES = ["No Tier", "Bronze", "Silver", "Gold"] as const;
export const TIER_THRESHOLDS = [0, 5, 50, 100] as const;

export interface TierProgress {
  currentTierIndex: number;
  currentTierName: string;
  nextTierIndex: number;
  nextTierName: string;
  progressPercent: number;
  nextThreshold: number;
  remainingToNextTier: number;
  isMaxTier: boolean;
}

export function calculateTierProgress(usdFunded: number): TierProgress {
  let currentTierIndex = 0;
  if (usdFunded >= 100) currentTierIndex = 3;
  else if (usdFunded >= 50) currentTierIndex = 2;
  else if (usdFunded >= 5) currentTierIndex = 1;

  const isMaxTier = currentTierIndex >= 3;
  const nextTierIndex = Math.min(currentTierIndex + 1, 3);
  const nextTierName = isMaxTier ? "Max Tier" : TIER_NAMES[nextTierIndex];

  const currentThreshold = TIER_THRESHOLDS[currentTierIndex];
  const nextThreshold = TIER_THRESHOLDS[nextTierIndex];

  let progressPercent = 100;
  if (!isMaxTier) {
    const range = nextThreshold - currentThreshold;
    const progress = usdFunded - currentThreshold;
    progressPercent = Math.max(0, Math.min((progress / range) * 100, 100));
  }

  return {
    currentTierIndex,
    currentTierName: TIER_NAMES[currentTierIndex],
    nextTierIndex,
    nextTierName,
    progressPercent,
    nextThreshold,
    remainingToNextTier: Math.max(0, nextThreshold - usdFunded),
    isMaxTier,
  };
}

// NFT-contract tier (0/1/2 = Bronze/Silver/Gold), distinct from the funding-based progression above.
export const NFT_TIER_NAMES = ["Bronze", "Silver", "Gold"] as const;
export const NFT_TIER_BONUSES = ["+2%", "+5%", "+10%"] as const;
