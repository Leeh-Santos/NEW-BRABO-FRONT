import { useContractStats } from "../../hooks/useContractStats";
import { formatEthAmount } from "../../lib/formatters";
import { StatCard } from "../ui/StatCard";

export function LiquidityStatsGrid() {
  const { batchAmount, minLiqAdd } = useContractStats();
  const isReady = batchAmount !== undefined && minLiqAdd !== undefined && batchAmount >= minLiqAdd;

  return (
    <div className="stats-grid">
      <StatCard label="Available Batch" value={`${formatEthAmount(batchAmount)} ETH`} />
      <StatCard label="Minimum Required" value={`${formatEthAmount(minLiqAdd)} ETH`} />
      <StatCard label="Status" value={isReady ? "Ready" : "Accumulating"} />
    </div>
  );
}
