import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import {
  BASE_ADDRESSES,
  BRB_WETH_POOL_FEE,
  CONTRACT_ADDRESSES,
  FUNDME_ABI,
  QUOTER_V2_ABI,
} from "../config/contracts";
import { calculateCompensation, splitFundAmount } from "../lib/quote";

/** Ports legacy-site/getprice.js `getQuoteSimple`: splits the input 20% buyback / 80% batch,
 * gets a QuoterV2 *simulate* call (never a real tx — quoteExactInputSingle isn't a view fn, it
 * works by reverting with encoded data) for the 20% swap leg, and reads getPicaPerWeth() for the
 * 80% compensation leg. Tier-bonus math is layered on top by the caller (see useUserData). */
export function useFundQuote(ethAmount: string) {
  const publicClient = usePublicClient();
  const parsedAmount = parseFloat(ethAmount);
  const enabled = !!publicClient && !!ethAmount && parsedAmount > 0;

  return useQuery({
    queryKey: ["fund-quote", ethAmount],
    enabled,
    queryFn: async () => {
      if (!publicClient) throw new Error("No public client");

      const { buybackWei, batchWei } = splitFundAmount(ethAmount);

      const [{ result: quoteResult }, picaPerWeth] = await Promise.all([
        publicClient.simulateContract({
          address: BASE_ADDRESSES.QUOTER_V2,
          abi: QUOTER_V2_ABI,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn: BASE_ADDRESSES.WETH,
              tokenOut: CONTRACT_ADDRESSES.PICA_TOKEN,
              amountIn: buybackWei,
              fee: BRB_WETH_POOL_FEE,
              sqrtPriceLimitX96: 0n,
            },
          ],
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.FUNDME,
          abi: FUNDME_ABI,
          functionName: "getPicaPerWeth",
        }),
      ]);

      const [swapOutputPica] = quoteResult;
      const compensationPica = calculateCompensation(picaPerWeth, batchWei);
      const totalPica = swapOutputPica + compensationPica;

      return { buybackWei, batchWei, swapOutputPica, compensationPica, totalPica };
    },
    staleTime: 15_000,
  });
}
