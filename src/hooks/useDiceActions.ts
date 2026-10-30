import { useState } from "react";
import { parseEventLogs, type Hash } from "viem";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { useToast } from "../components/ui/ToastProvider";
import { BRABO_DICE_ABI, CONTRACT_ADDRESSES, ERC20_ABI } from "../config/contracts";
import { getFriendlyErrorMessage } from "../lib/errors";

export type DiceAction = "approve" | "throw" | "accept" | "refund" | "withdraw";

/** Every BraboDice write. Staking needs a $BRB allowance first, so `throwCoin` / `acceptChallenge`
 * are two sequential transactions when the allowance is short — awaited end to end here (rather
 * than with useWaitForTransactionReceipt, as the single-tx hooks do) so the second only fires once
 * the approval is mined. Only the exact stake is approved, never an unlimited allowance. */
export function useDiceActions(onConfirmed?: () => void) {
  const { showToast } = useToast();
  const config = useConfig();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState<{ action: DiceAction; gameId?: bigint } | null>(null);

  const confirm = async (hash: Hash) => {
    const receipt = await waitForTransactionReceipt(config, { hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted on-chain");
    return receipt;
  };

  const ensureAllowance = async (amount: bigint) => {
    if (!address) throw new Error("Connect your wallet first");
    const allowance = await readContract(config, {
      address: CONTRACT_ADDRESSES.PICA_TOKEN,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, CONTRACT_ADDRESSES.BRABO_DICE],
    });
    if (allowance >= amount) return;

    setBusy((b) => (b ? { ...b, action: "approve" } : b));
    showToast("Approve $BRB in your wallet to lock the stake…", "warning");
    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.PICA_TOKEN,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.BRABO_DICE, amount],
    });
    await confirm(hash);
  };

  const run = async <T,>(
    action: DiceAction,
    gameId: bigint | undefined,
    fn: () => Promise<T>,
    fallback: string,
  ): Promise<T | undefined> => {
    setBusy({ action, gameId });
    try {
      const result = await fn();
      onConfirmed?.();
      return result;
    } catch (error) {
      showToast(getFriendlyErrorMessage(error, fallback), "error");
      return undefined;
    } finally {
      setBusy(null);
    }
  };

  /** Resolves to the new game id once the transaction is mined. */
  const throwCoin = (amount: bigint) =>
    run("throw", undefined, async () => {
      await ensureAllowance(amount);
      setBusy({ action: "throw" });
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.BRABO_DICE,
        abi: BRABO_DICE_ABI,
        functionName: "throwCoin",
        args: [amount],
      });
      showToast("Coin thrown! Waiting for confirmation…", "success");
      const receipt = await confirm(hash);
      const [event] = parseEventLogs({
        abi: BRABO_DICE_ABI,
        logs: receipt.logs,
        eventName: "CoinThrown",
      });
      showToast("Stake locked — Chainlink VRF is flipping your coin.", "success");
      return event?.args.gameId;
    }, "Failed to throw coin");

  const acceptChallenge = (gameId: bigint, amount: bigint) =>
    run("accept", gameId, async () => {
      await ensureAllowance(amount);
      setBusy({ action: "accept", gameId });
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.BRABO_DICE,
        abi: BRABO_DICE_ABI,
        functionName: "acceptChallenge",
        args: [gameId],
      });
      showToast("Challenge submitted! Waiting for confirmation…", "success");
      await confirm(hash);
      showToast("Challenge accepted — your coin is in the air.", "success");
      return gameId;
    }, "Failed to accept challenge");

  const refund = (gameId: bigint) =>
    run("refund", gameId, async () => {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.BRABO_DICE,
        abi: BRABO_DICE_ABI,
        functionName: "refund",
        args: [gameId],
      });
      await confirm(hash);
      showToast(`Game #${gameId} refunded.`, "success");
    }, "Refund failed");

  const withdraw = () =>
    run("withdraw", undefined, async () => {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.BRABO_DICE,
        abi: BRABO_DICE_ABI,
        functionName: "withdraw",
      });
      await confirm(hash);
      showToast("Winnings withdrawn to your wallet.", "success");
    }, "Withdraw failed");

  return { throwCoin, acceptChallenge, refund, withdraw, busy };
}
