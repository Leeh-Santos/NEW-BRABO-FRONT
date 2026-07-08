import { formatUnits } from "viem";
import { useUserData } from "../../hooks/useUserData";
import { calculateTierProgress } from "../../lib/tiers";

const CARDS = [
  { name: "Bronze", icon: "🥉", index: 1, threshold: 5 },
  { name: "Silver", icon: "🥈", index: 2, threshold: 50 },
  { name: "Gold", icon: "🥇", index: 3, threshold: 100 },
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
            <span className="tier-icon">{tier.icon}</span>
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
