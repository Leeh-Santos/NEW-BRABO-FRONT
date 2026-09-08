import { formatUnits } from "viem";
import { useUserData } from "../../hooks/useUserData";
import { calculateTierProgress } from "../../lib/tiers";
import { TIER_ART } from "../../lib/tierArt";

const CARDS = [
  { name: "Bronze", art: TIER_ART.bronze, index: 1, threshold: 5 },
  { name: "Silver", art: TIER_ART.silver, index: 2, threshold: 50 },
  { name: "Gold", art: TIER_ART.gold, index: 3, threshold: 100 },
];

export function TierCards() {
  const { fundedUsd } = useUserData();
  const usdFunded = fundedUsd !== undefined ? parseFloat(formatUnits(fundedUsd, 18)) : 0;
  const { currentTierIndex } = calculateTierProgress(usdFunded);

  return (
    <div className="tier-cards-grid">
      {CARDS.map((tier) => {
        const unlocked = currentTierIndex >= tier.index;
        return (
          <div key={tier.name} className={`tier-card${unlocked ? " unlocked" : ""}`}>
            <img src={tier.art} className="tier-icon" alt="" width={56} height={56} loading="lazy" />
            <span className="tier-name">{tier.name}</span>
            <span className="tier-threshold">${tier.threshold}</span>
            <span className={unlocked ? "status-unlocked" : "status-locked"}>
              {unlocked ? "Unlocked" : "Locked"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
