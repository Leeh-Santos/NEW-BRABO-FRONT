import { formatUnits } from "viem";
import { useUserData } from "../../hooks/useUserData";
import { TIER_ART } from "../../lib/tierArt";

// Legacy-site script.js defines its own TIER_THRESHOLDS ($5/$50/$100) which is what's actually
// used for the milestone track — constants.js's NFT_TIERS.threshold values (10/100/1000) appear
// to be stale/unused (never read anywhere in script.js), so intentionally not used here.
const TIERS = [
  { key: "bronze", name: "Bronze", thresholdUsd: 5, art: TIER_ART.bronze },
  { key: "silver", name: "Silver", thresholdUsd: 50, art: TIER_ART.silver },
  { key: "gold", name: "Gold", thresholdUsd: 100, art: TIER_ART.gold },
] as const;

export function TierProgressionTrack() {
  const { fundedUsd, isConnected } = useUserData();
  const fundedUsdNumber = fundedUsd !== undefined ? parseFloat(formatUnits(fundedUsd, 18)) : 0;

  return (
    <div className="tier-progression-section">
      <h3 className="section-title">NFT Tier Progression</h3>
      <div className="tier-progression-track">
        {TIERS.map((tier) => {
          const reached = isConnected && fundedUsdNumber >= tier.thresholdUsd;
          return (
            <div key={tier.key} className={`tier-milestone${reached ? " reached" : ""}`}>
              {/* Decorative: the tier name sits right beside it in text, so an
                  alt string here would just be read out twice. */}
              <img src={tier.art} className="tier-icon" alt="" width={56} height={56} loading="lazy" />
              <span className="tier-name">{tier.name}</span>
              <span className="tier-threshold">${tier.thresholdUsd}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
