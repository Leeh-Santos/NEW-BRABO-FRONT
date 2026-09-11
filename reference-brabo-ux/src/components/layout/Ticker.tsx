import { formatEther, formatUnits } from "viem";
import { useBrbPool } from "../../hooks/useBrbPool";
import { useContractStats } from "../../hooks/useContractStats";
import { useEthPrice } from "../../hooks/useEthPrice";
import {
  formatEthAmount,
  formatMarketCap,
  formatTokenAmount,
  formatTokenPrice,
  formatUsd,
} from "../../lib/formatters";

/** The live tape.
 *
 * Everything on it is already fetched for the stats grid, so it costs no extra
 * RPC calls — it just puts the protocol's numbers where a trading product puts
 * them. The row is duplicated and the track translated by exactly -50%, which
 * is what makes the loop seamless; `aria-hidden` on the copy stops a screen
 * reader announcing every figure twice. */
export function Ticker() {
  const { totalEthFunded, totalFunders, picaTokenBalance } = useContractStats();
  const { data: ethPriceUsd } = useEthPrice();
  const { data: brbPool } = useBrbPool();

  const items: Array<{ label: string; value: string }> = [
    { label: "BRB", value: formatTokenPrice(brbPool?.priceUsd) },
    { label: "MCAP", value: formatMarketCap(brbPool?.marketCapUsd) },
    { label: "ETH", value: ethPriceUsd !== undefined ? formatUsd(ethPriceUsd) : "—" },
    { label: "RAISED", value: `${formatEthAmount(totalEthFunded)} ETH` },
    {
      label: "RAISED USD",
      value:
        totalEthFunded !== undefined && ethPriceUsd !== undefined
          ? formatUsd(parseFloat(formatEther(totalEthFunded)) * ethPriceUsd)
          : "—",
    },
    { label: "FUNDERS", value: totalFunders?.toString() ?? "—" },
    { label: "BRB IN CONTRACT", value: formatTokenAmount(picaTokenBalance) },
    {
      label: "SUPPLY IN POOL",
      value:
        picaTokenBalance !== undefined ? `${formatUnits(picaTokenBalance, 18).slice(0, 10)}` : "—",
    },
  ];

  const row = (copy: boolean) => (
    <div className="ticker-row" aria-hidden={copy || undefined}>
      {items.map((item) => (
        <span className="ticker-item" key={`${copy ? "b" : "a"}-${item.label}`}>
          <span className="ticker-key">{item.label}</span>
          <span className="ticker-val">{item.value}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="ticker">
      <span className="ticker-badge">LIVE · BASE</span>
      <div className="ticker-viewport">
        <div className="ticker-track">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}
