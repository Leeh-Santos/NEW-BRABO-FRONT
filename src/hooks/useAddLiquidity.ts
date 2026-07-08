import { useEffect, useState } from "react";
import { formatEther, formatUnits, parseEventLogs, type Hash } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useToast } from "../components/ui/ToastProvider";
import { CONTRACT_ADDRESSES, FUNDME_ABI } from "../config/contracts";
import { getFriendlyErrorMessage } from "../lib/errors";

/** Ports legacy-site/script.js `addLiquidityToPool`: client-side threshold check, send the tx,
 * then parse the LiquidityAdded event out of the receipt for a richer success toast. */
export function useAddLiquidity(onConfirmed?: () => void) {
  const { showToast } = useToast();
  const { writeContractAsync, isPending: isSubmitting } = useWriteContract();
  const [hash, setHash] = useState<Hash>();

  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess && receipt) {
      const events = parseEventLogs({
        abi: FUNDME_ABI,
        logs: receipt.logs,
        eventName: "LiquidityAdded",
      });
      const event = events[0];
      if (event) {
        const ethAmount = formatEther(event.args.ethAmount);
        const picaAmount = formatUnits(event.args.picaAmount, 18);
        showToast(
          `Liquidity added successfully! ${parseFloat(ethAmount).toFixed(4)} ETH + ${parseFloat(picaAmount).toFixed(2)} BRB`,
          "success",
        );
      } else {
        showToast("Liquidity added successfully!", "success");
      }
      onConfirmed?.();
      setHash(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, receipt]);

  const addLiquidity = async (batchAmount?: bigint, minLiqAdd?: bigint) => {
    if (batchAmount !== undefined && minLiqAdd !== undefined && batchAmount < minLiqAdd) {
      showToast(
        `Insufficient batch amount. Current: ${parseFloat(formatEther(batchAmount)).toFixed(4)} ETH, Minimum: ${parseFloat(formatEther(minLiqAdd)).toFixed(4)} ETH`,
        "error",
      );
      return;
    }

    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.FUNDME,
        abi: FUNDME_ABI,
        functionName: "addLiquidityToPool",
      });
      setHash(txHash);
      showToast("Transaction submitted! Adding liquidity to pool...", "success");
    } catch (error) {
      showToast(getFriendlyErrorMessage(error, "Failed to add liquidity"), "error");
    }
  };

  return { addLiquidity, isBusy: isSubmitting || isConfirming };
}
