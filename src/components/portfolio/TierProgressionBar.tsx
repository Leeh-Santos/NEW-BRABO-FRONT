import { formatUnits } from "viem";
import { useUserData } from "../../hooks/useUserData";
import { calculateTierProgress } from "../../lib/tiers";

export function TierProgressionBar() {
  const { fundedUsd } = useUserData();
  const usdFunded = fundedUsd !== undefined ? parseFloat(formatUnits(fundedUsd, 18)) : 0;
  const progress = calculateTierProgress(usdFunded);

  return (
    <div className="tier-progress-card">
      <div className="tier-progress-header">
        <span>{progress.currentTierName}</span>
        <span>{progress.nextTierName}</span>
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
