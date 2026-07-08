import { useAccount, useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, ERC20_ABI } from "../config/contracts";

/** Wallet $BRB balance (separate from the FundMe contract's internal accounting) — mirrors
 * legacy-site/script.js `loadPortfolioData`'s ad-hoc ERC20 balanceOf read. */
export function useBrbBalance() {
  const { address, isConnected } = useAccount();

  return useReadContract({
    address: CONTRACT_ADDRESSES.PICA_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });
}
