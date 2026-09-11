import { formatUnits } from "viem";
import { useUserData } from "../../hooks/useUserData";
import { calculateTierProgress } from "../../lib/tiers";
import { tierArt } from "../../lib/tierArt";

export function TierProgressionBar() {
  const { fundedUsd } = useUserData();
  const usdFunded = fundedUsd !== undefined ? parseFloat(formatUnits(fundedUsd, 18)) : 0;
  const progress = calculateTierProgress(usdFunded);

  // Undefined for "No Tier" and "Max Tier", which have no medallion of their own.
  const currentArt = tierArt(progress.currentTierName);
  const nextArt = tierArt(progress.nextTierName);

  return (
    <div className="tier-progress-card">
      <div className="tier-progress-header">
        <span className="tier-progress-end">
          {currentArt && <img src={currentArt} alt="" width={28} height={28} loading="lazy" />}
          {progress.currentTierName}
        </span>
        <span className="tier-progress-end">
          {progress.nextTierName}
          {nextArt && <img src={nextArt} alt="" width={28} height={28} loading="lazy" />}
        </span>
      </div>
      <div className="tier-progress-bar">
        <div className="tier-progress-fill" style={{ width: `${progress.progressPercent}%` }} />
      </div>
      <p className="tier-progress-message">
        {progress.isMaxTier ? (
          <strong>Maximum tier reached!</strong>
        ) : (
          <>
            Fund <strong>${progress.remainingToNextTier.toFixed(2)} more</strong> to reach{" "}
            {progress.nextTierName} tier
          </>
        )}
      </p>
    </div>
  );
}
