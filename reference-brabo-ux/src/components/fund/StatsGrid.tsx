import { formatEther, formatUnits } from "viem";
import { useBrbPool } from "../../hooks/useBrbPool";
import { useContractStats } from "../../hooks/useContractStats";
import { useEthPrice } from "../../hooks/useEthPrice";
import { useUserData } from "../../hooks/useUserData";
import {
  formatEthAmount,
  formatMarketCap,
  formatTokenAmount,
  formatTokenPrice,
  formatUsd,
} from "../../lib/formatters";
import { tierArt } from "../../lib/tierArt";
import { StatCard } from "../ui/StatCard";

export function StatsGrid() {
  const { totalEthFunded, totalFunders, picaTokenBalance } = useContractStats();
  const { data: ethPriceUsd } = useEthPrice();
  const { data: brbPool } = useBrbPool();
  const { isConnected, tierName, bonusPercentage, isLoading: isUserLoading } = useUserData();

  const totalEthFundedUsd =
    totalEthFunded !== undefined && ethPriceUsd !== undefined
      ? parseFloat(formatEther(totalEthFunded)) * ethPriceUsd
      : undefined;

  // CountUp can only animate a plain decimal number — skip it (fall back to the static formatted
  // string) whenever the display format uses M/K abbreviation or exponential notation, since
  // CountUp would otherwise overwrite the element with just the raw number and silently drop the
  // suffix (a real bug in the legacy CountUp.js integration this port intentionally avoids).
  const marketCap = brbPool?.marketCapUsd ?? undefined;
  const marketCapCountable = marketCap !== undefined && marketCap > 0 && marketCap < 1000;

  const brbPrice = brbPool?.priceUsd ?? undefined;
  const priceCountable = brbPrice !== undefined && brbPrice >= 0.000001;
  const priceDecimals = brbPrice !== undefined && brbPrice < 0.01 ? 8 : 4;

  return (
    <div className="stats-grid">
      <StatCard
        label="Total ETH Funded"
        value={`${formatEthAmount(totalEthFunded)} ETH`}
        loading={totalEthFunded === undefined}
        subValue={formatUsd(totalEthFundedUsd)}
        countUp={
          totalEthFunded !== undefined
            ? {
                end: parseFloat(formatEther(totalEthFunded)),
                decimals: 4,
                suffix: " ETH",
              }
            : undefined
        }
      />
      <StatCard
        label="Total Funders"
        value={totalFunders?.toString() ?? "--"}
        loading={totalFunders === undefined}
        countUp={totalFunders !== undefined ? { end: totalFunders, decimals: 0 } : undefined}
      />
      <StatCard
        label="BRB Market Cap"
        value={formatMarketCap(marketCap)}
        loading={marketCap === undefined}
        countUp={marketCapCountable ? { end: marketCap, prefix: "$", decimals: 2 } : undefined}
      />
      <StatCard
        label="BRB in Contract"
        value={formatTokenAmount(picaTokenBalance)}
        loading={picaTokenBalance === undefined}
        countUp={
          picaTokenBalance !== undefined
            ? { end: parseFloat(formatUnits(picaTokenBalance, 18)), decimals: 2 }
            : undefined
        }
      />
      <StatCard
        label="BRB Price"
        value={formatTokenPrice(brbPrice)}
        loading={brbPrice === undefined}
        countUp={
          priceCountable ? { end: brbPrice, prefix: "$", decimals: priceDecimals } : undefined
        }
      />
      <StatCard
        label="Your Tier"
        value={isConnected ? tierName : "Not connected"}
        loading={isConnected && isUserLoading}
        icon={isConnected ? tierArt(tierName) : undefined}
        subValue={isConnected && bonusPercentage !== undefined ? `${bonusPercentage}% Bonus` : undefined}
      />
    </div>
  );
}
