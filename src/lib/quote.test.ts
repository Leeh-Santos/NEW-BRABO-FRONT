import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import { minimumFundWei, roundUpEth } from "./quote";

const MINIMUM_USD = parseEther("0.2"); // FundMe.MINIMUM_USD = 2 * 10 ** 17

describe("minimumFundWei", () => {
  it("is $0.20 worth of ETH at the feed price, plus 1% headroom", () => {
    // $2,000.00 with the feed's 8 decimals → exactly 0.0001 ETH, then +1%.
    expect(minimumFundWei(MINIMUM_USD, 2_000n * 10n ** 8n)).toBe(parseEther("0.000101"));
  });

  it("rounds up, so the bound itself always passes the contract's check", () => {
    const answer = 226_644_183_097n; // a real Base ETH/USD answer
    const price = answer * 10n ** 10n;
    const exact = (MINIMUM_USD * 10n ** 18n + price - 1n) / price;
    expect((price * exact) / 10n ** 18n).toBeGreaterThanOrEqual(MINIMUM_USD);
    expect((price * (exact - 1n)) / 10n ** 18n).toBeLessThan(MINIMUM_USD);
    expect(minimumFundWei(MINIMUM_USD, answer)).toBeGreaterThan(exact);
  });
});

describe("roundUpEth", () => {
  it("rounds up to 6 decimals", () => {
    expect(roundUpEth(89_126_487_712_923n)).toBe("0.00009");
    expect(roundUpEth(parseEther("0.000089"))).toBe("0.000089");
    expect(roundUpEth(parseEther("0.0000890001"))).toBe("0.00009");
  });
});
