import { useAccount } from "wagmi";
import { useAddLiquidity } from "../../hooks/useAddLiquidity";
import { useContractStats } from "../../hooks/useContractStats";
import { formatEthAmount } from "../../lib/formatters";

export function AddLiquidityCard() {
  const { isConnected } = useAccount();
  const { batchAmount, minLiqAdd, refetch } = useContractStats();
  const { addLiquidity, isBusy } = useAddLiquidity(() => refetch());

  const isReady = batchAmount !== undefined && minLiqAdd !== undefined && batchAmount >= minLiqAdd;
  const progressPercent =
    batchAmount !== undefined && minLiqAdd !== undefined && minLiqAdd > 0n
      ? Math.min(100, (Number(batchAmount) / Number(minLiqAdd)) * 100)
      : 0;

  return (
    <div className="funding-card">
      <p>
        Once the accumulated batch reaches the minimum threshold, anyone can trigger adding it to
        the BRB/ETH liquidity pool. {formatEthAmount(batchAmount)} / {formatEthAmount(minLiqAdd)}{" "}
        ETH accumulated.
      </p>
      <div className="tier-progress-bar">
        <div className="tier-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <button
        type="button"
        className="fund-btn"
        disabled={!isConnected || !isReady || isBusy}
        onClick={() => addLiquidity(batchAmount, minLiqAdd)}
      >
        {!isConnected
          ? "Connect Wallet First"
          : isBusy
            ? "Processing..."
            : isReady
              ? "Add Liquidity to Pool"
              : "Threshold Not Yet Met"}
      </button>
    </div>
  );
}
