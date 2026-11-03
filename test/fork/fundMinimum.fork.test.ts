// The Fund page's minimum against the deployed FundMe: it must read the same feed the contract
// prices with, so an amount at the shown minimum funds and the exact bound minus 1 wei reverts.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseEther } from "viem";
import {
  BASE_ADDRESSES,
  CHAINLINK_FEED_ABI,
  CONTRACT_ADDRESSES,
  FUNDME_ABI,
} from "../../src/config/contracts";
import { getFriendlyErrorMessage } from "../../src/lib/errors";
import { MINIMUM_FUND_BUFFER_BPS, minimumFundWei, roundUpEth } from "../../src/lib/quote";
import { PLAYERS, forkClient, startAnvil, type ForkClient } from "../helpers/fork";

let client: ForkClient;
let stopAnvil: () => void;
let minimumUsd: bigint;
let answer: bigint;

beforeAll(async () => {
  const anvil = await startAnvil(8549);
  stopAnvil = anvil.stop;
  client = forkClient(anvil.url);
  await client.setBalance({ address: PLAYERS.alice, value: parseEther("10") });
  minimumUsd = await client.readContract({
    address: CONTRACT_ADDRESSES.FUNDME,
    abi: FUNDME_ABI,
    functionName: "MINIMUM_USD",
  });
  [, answer] = await client.readContract({
    address: BASE_ADDRESSES.CHAINLINK_ETH_USD,
    abi: CHAINLINK_FEED_ABI,
    functionName: "latestRoundData",
  });
}, 60_000);

afterAll(() => stopAnvil?.());

const simulateFund = (value: bigint) =>
  client.simulateContract({
    address: CONTRACT_ADDRESSES.FUNDME,
    abi: FUNDME_ABI,
    functionName: "fund",
    value,
    account: PLAYERS.alice,
  });

describe("fund() minimum", () => {
  it("is $0.20", () => {
    expect(minimumUsd).toBe(parseEther("0.2"));
  });

  it("accepts the amount the page fills in", async () => {
    const shown = parseEther(roundUpEth(minimumFundWei(minimumUsd, answer)));
    await expect(simulateFund(shown)).resolves.toBeDefined();
  });

  it("reverts just under the unbuffered bound, with the friendly message", async () => {
    const buffered = minimumFundWei(minimumUsd, answer);
    const exact = (buffered * 10_000n) / (10_000n + MINIMUM_FUND_BUFFER_BPS) - 1n;
    await expect(simulateFund(exact - 10n ** 9n)).rejects.toSatisfy(
      (error) => getFriendlyErrorMessage(error) === "Amount below minimum requirement ($0.20 USD)",
    );
  });
});
