import { useAccount, useReadContracts } from "wagmi";
import { CONTRACT_ADDRESSES, FUNDME_ABI, NFT_ABI } from "../config/contracts";

const fundMeContract = {
  address: CONTRACT_ADDRESSES.FUNDME,
  abi: FUNDME_ABI,
} as const;

const nftContract = {
  address: CONTRACT_ADDRESSES.NFT,
  abi: NFT_ABI,
} as const;

/** Per-connected-user reads (position, tier bonus, NFT ownership) — mirrors legacy-site/script.js
 * `loadUserData`. Disabled entirely while no wallet is connected. */
export function useUserData() {
  const { address, isConnected } = useAccount();

  const { data, isLoading, refetch } = useReadContracts({
    contracts: address
      ? [
          { ...fundMeContract, functionName: "getUserTierBonus", args: [address] },
          { ...fundMeContract, functionName: "getHowMuchDudeFunded", args: [address] },
          { ...fundMeContract, functionName: "getHowMuchDudeFundedInUsd", args: [address] },
          { ...nftContract, functionName: "balanceOf", args: [address] },
          { ...nftContract, functionName: "getUserTier", args: [address] },
          { ...nftContract, functionName: "getTokenIdByOwner", args: [address] },
        ]
      : [],
    query: {
      enabled: isConnected && !!address,
    },
  });

  const [tierBonus, fundedEth, fundedUsd, nftBalance, nftTier, nftTokenId] = data ?? [];
  const [bonusPercentage, tierName] =
    (tierBonus?.result as readonly [bigint, string] | undefined) ?? [];

  return {
    isLoading,
    refetch,
    address,
    isConnected,
    bonusPercentage: bonusPercentage,
    tierName: tierName ?? "No NFT",
    fundedEth: fundedEth?.result as bigint | undefined,
    fundedUsd: fundedUsd?.result as bigint | undefined,
    hasNft: nftBalance?.result !== undefined && (nftBalance.result as bigint) > 0n,
    nftTier: nftTier?.result as bigint | undefined,
    nftTokenId: nftTokenId?.result as bigint | undefined,
  };
}
