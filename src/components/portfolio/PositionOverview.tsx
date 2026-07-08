import { formatUnits } from "viem";
import { useBrbBalance } from "../../hooks/useBrbBalance";
import { useBrbPool } from "../../hooks/useBrbPool";
import { useUserData } from "../../hooks/useUserData";
import { formatEthAmount, formatNumber, formatUsd } from "../../lib/formatters";
import { StatCard } from "../ui/StatCard";

export function PositionOverview() {
  const { fundedEth, fundedUsd } = useUserData();
  const { data: brbBalance } = useBrbBalance();
  const { data: brbPool } = useBrbPool();

  const usdFundedNumber = fundedUsd !== undefined ? parseFloat(formatUnits(fundedUsd, 18)) : 0;
  const brbBalanceNumber = brbBalance !== undefined ? parseFloat(formatUnits(brbBalance, 18)) : 0;
  const brbValueUsd = brbPool?.priceUsd ? brbBalanceNumber * brbPool.priceUsd : undefined;

  return (
    <div className="stats-grid">
      <StatCard label="ETH Funded" value={`${formatEthAmount(fundedEth, 6)} ETH`} />
      <StatCard label="USD Funded" value={formatUsd(usdFundedNumber)} />
      <StatCard label="$BRB Balance" value={`${formatNumber(brbBalanceNumber)} $BRB`} />
      <StatCard label="$BRB Value" value={formatUsd(brbValueUsd)} />
    </div>
  );
}
