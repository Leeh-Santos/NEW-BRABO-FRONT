import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";
import { BRABO_DICE_ABI } from "../config/contracts";
import { getFriendlyErrorMessage } from "./errors";

/** Build the same error shape viem throws for a reverted contract call. */
function revert(errorName: string, args: readonly unknown[] = []) {
  const data = encodeErrorResult({ abi: BRABO_DICE_ABI, errorName, args } as never);
  const cause = new ContractFunctionRevertedError({ abi: BRABO_DICE_ABI, data, functionName: "x" });
  return new BaseError("Contract call reverted", { cause });
}

describe("getFriendlyErrorMessage — BraboDice", () => {
  it.each([
    ["BraboDice__ZeroAmount", [], "Enter a stake greater than zero"],
    ["BraboDice__GameNotOpen", [1n], "That game is no longer open — someone may have taken it"],
    ["BraboDice__GameExpired", [1n], "That game has expired"],
    ["BraboDice__CannotChallengeOwnGame", [], "You can't accept your own game"],
    ["BraboDice__NotRefundable", [1n], "This game can't be refunded yet"],
    ["BraboDice__NothingToWithdraw", [], "Nothing to withdraw"],
  ] as const)("%s", (name, args, expected) => {
    expect(getFriendlyErrorMessage(revert(name, args))).toBe(expected);
  });

  it("wallet rejection", () => {
    const err = new BaseError("rejected", { cause: new UserRejectedRequestError(new Error("no")) });
    expect(getFriendlyErrorMessage(err)).toBe("Transaction rejected by user");
  });
});
