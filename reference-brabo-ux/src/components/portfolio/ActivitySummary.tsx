import { formatUnits } from "viem";
import { useUserData } from "../../hooks/useUserData";

// Faithful port of legacy-site/script.js `updateActivitySummary` — that function was already a
// placeholder (no real event-log tracking), not a simplification introduced by this migration.
export function ActivitySummary() {
  const { fundedUsd } = useUserData();
  const usdFunded = fundedUsd !== undefined ? parseFloat(formatUnits(fundedUsd, 18)) : 0;
  const hasFunded = usdFunded > 0;

  return (
    <div className="activity-summary">
      <div className="activity-row">
        <span>Total Transactions</span>
        <span>{hasFunded ? "1+" : "0"}</span>
      </div>
      <div className="activity-row">
        <span>First Funding</span>
        <span>{hasFunded ? "Recent" : "--"}</span>
      </div>
      <div className="activity-row">
        <span>Total Bonus Earned</span>
        <span>0.00 $BRB</span>
      </div>
    </div>
  );
}
