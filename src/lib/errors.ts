import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

const DICE_ERRORS: Record<string, string> = {
  BraboDice__ZeroAmount: "Enter a stake greater than zero",
  BraboDice__TransferFailed: "$BRB transfer failed — check your balance and allowance",
  BraboDice__FeeOnTransferNotSupported: "This token charges a transfer fee and can't be staked",
  BraboDice__GameNotOpen: "That game is no longer open — someone may have taken it",
  BraboDice__GameExpired: "That game has expired",
  BraboDice__CannotChallengeOwnGame: "You can't accept your own game",
  BraboDice__NotRefundable: "This game can't be refunded yet",
  BraboDice__NothingToWithdraw: "Nothing to withdraw",
};

/** Ports the error-message mapping from legacy-site/script.js `fundWithEth`/`addLiquidityToPool`
 * onto viem's structured error types. */
export function getFriendlyErrorMessage(error: unknown, fallback = "Transaction failed"): string {
  if (error instanceof BaseError) {
    const rejection = error.walk((e) => e instanceof UserRejectedRequestError);
    if (rejection) return "Transaction rejected by user";

    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const reason = revert.data?.errorName ?? revert.shortMessage;
      const diceMessage = reason ? DICE_ERRORS[reason] : undefined;
      if (diceMessage) return diceMessage;
      if (reason?.includes("InsufficientPica")) return "Insufficient BRB tokens in contract";
      if (revert.shortMessage?.toLowerCase().includes("spend more eth")) {
        return "Amount below minimum requirement ($0.20 USD)";
      }
      return revert.shortMessage ?? fallback;
    }

    if (error.shortMessage?.toLowerCase().includes("insufficient funds")) {
      return "Insufficient ETH in wallet";
    }

    return error.shortMessage ?? fallback;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}
