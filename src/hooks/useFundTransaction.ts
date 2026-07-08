import { useEffect, useState } from "react";
import { parseEther, type Hash } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useToast } from "../components/ui/ToastProvider";
import { CONTRACT_ADDRESSES, FUNDME_ABI } from "../config/contracts";
import { getFriendlyErrorMessage } from "../lib/errors";

/** Ports legacy-site/script.js `fundWithEth` onto wagmi's useWriteContract +
 * useWaitForTransactionReceipt, replacing manual tx.wait() + string-matched error handling. */
export function useFundTransaction(onConfirmed?: () => void) {
  const { showToast } = useToast();
  const { writeContractAsync, isPending: isSubmitting } = useWriteContract();
  const [hash, setHash] = useState<Hash>();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      showToast("Funding successful! BRB tokens received!", "success");
      onConfirmed?.();
      setHash(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const fund = async (ethAmount: string) => {
    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.FUNDME,
        abi: FUNDME_ABI,
        functionName: "fund",
        value: parseEther(ethAmount),
      });
      setHash(txHash);
      showToast("Transaction submitted! Waiting for confirmation...", "success");
    } catch (error) {
      showToast(getFriendlyErrorMessage(error), "error");
    }
  };

  return { fund, isSubmitting, isConfirming, isBusy: isSubmitting || isConfirming };
}
