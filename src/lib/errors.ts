import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

/** Ports the error-message mapping from legacy-site/script.js `fundWithEth`/`addLiquidityToPool`
 * onto viem's structured error types. */
export function getFriendlyErrorMessage(error: unknown, fallback = "Transaction failed"): string {
  if (error instanceof BaseError) {
    const rejection = error.walk((e) => e instanceof UserRejectedRequestError);
    if (rejection) return "Transaction rejected by user";

    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const reason = revert.data?.errorName ?? revert.shortMessage;
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
