import { AddLiquidityCard } from "../components/liquidity/AddLiquidityCard";
import { LiquidityStatsGrid } from "../components/liquidity/LiquidityStatsGrid";

export function LiquidityPage() {
  return (
    <div className="page-content">
      <h1>Liquidity</h1>
      <p className="page-subtitle">
        20% of every funding transaction is reserved to buy back $BRB; the remaining 80% batches
        up here until it's large enough to add directly to the BRB/ETH pool.
      </p>
      <LiquidityStatsGrid />
      <AddLiquidityCard />
    </div>
  );
}
