import { useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { BASE_ADDRESSES, CHAINLINK_FEED_ABI, CONTRACT_ADDRESSES, FUNDME_ABI } from "../config/contracts";
import { minimumFundWei } from "../lib/quote";

/** The least ETH `fund()` accepts right now, read from the same MINIMUM_USD constant and Chainlink
 * ETH/USD feed the contract checks against (not CoinGecko, which can disagree by enough to revert). */
export function useFundMinimum() {
  const { data } = useReadContracts({
    contracts: [
      { address: CONTRACT_ADDRESSES.FUNDME, abi: FUNDME_ABI, functionName: "MINIMUM_USD" },
      { address: BASE_ADDRESSES.CHAINLINK_ETH_USD, abi: CHAINLINK_FEED_ABI, functionName: "latestRoundData" },
    ],
    query: { refetchInterval: 60_000 },
  });

  const minimumUsd = data?.[0]?.result;
  const answer = data?.[1]?.result?.[1];
  if (minimumUsd === undefined || answer === undefined || answer <= 0n) return {};

  return {
    minimumWei: minimumFundWei(minimumUsd, answer),
    minimumUsd: Number(formatEther(minimumUsd)),
  };
}
