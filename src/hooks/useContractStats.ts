import { useReadContracts } from "wagmi";
import { CONTRACT_ADDRESSES, FUNDME_ABI } from "../config/contracts";

const fundMeContract = {
  address: CONTRACT_ADDRESSES.FUNDME,
  abi: FUNDME_ABI,
} as const;

/** Batches the Fund-page stat grid reads into a single multicall (legacy-site did these as
 * separate sequential ethers calls). */
export function useContractStats() {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...fundMeContract, functionName: "totalEthFunded" },
      { ...fundMeContract, functionName: "totalFunders" },
      { ...fundMeContract, functionName: "getPicaTokenBalance" },
      { ...fundMeContract, functionName: "batchAmount" },
      { ...fundMeContract, functionName: "MINLIQADD" },
      { ...fundMeContract, functionName: "getPicaPerWeth" },
    ],
    query: {
      refetchInterval: 30_000,
    },
  });

  const [totalEthFunded, totalFunders, picaTokenBalance, batchAmount, minLiqAdd, picaPerWeth] =
    data ?? [];

  return {
    isLoading,
    refetch,
    totalEthFunded: totalEthFunded?.result as bigint | undefined,
    // Legacy site padded the displayed funder count by +50 (script.js loadContractStats) —
    // preserved here to match production numbers; flag to product if this should be removed.
    totalFunders:
      totalFunders?.result !== undefined ? Number(totalFunders.result) + 50 : undefined,
    picaTokenBalance: picaTokenBalance?.result as bigint | undefined,
    batchAmount: batchAmount?.result as bigint | undefined,
    minLiqAdd: minLiqAdd?.result as bigint | undefined,
    picaPerWeth: picaPerWeth?.result as bigint | undefined,
  };
}
