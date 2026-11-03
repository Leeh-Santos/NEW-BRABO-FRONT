import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseEther } from "viem";
import { FundingCard } from "./FundingCard";

// Chain reads are mocked: this covers how the card treats the minimum. The fork suite checks the
// minimum itself against the deployed FundMe.
const state = vi.hoisted(() => ({ minimumWei: undefined as bigint | undefined }));
const fund = vi.hoisted(() => vi.fn());

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1111111111111111111111111111111111111111", isConnected: true }),
  useBalance: () => ({ data: { value: parseEther("1") } }),
}));
vi.mock("../../hooks/useDebouncedValue", () => ({ useDebouncedValue: (v: string) => v }));
vi.mock("../../hooks/useEthPrice", () => ({ useEthPrice: () => ({ data: 2000 }) }));
vi.mock("../../hooks/useFundQuote", () => ({ useFundQuote: () => ({ data: undefined, isFetching: false }) }));
vi.mock("../../hooks/useFundTransaction", () => ({ useFundTransaction: () => ({ fund, isBusy: false }) }));
vi.mock("../../hooks/useUserData", () => ({
  useUserData: () => ({ bonusPercentage: 0n, tierName: "No NFT", refetch: vi.fn() }),
}));
vi.mock("../../hooks/useFundMinimum", () => ({
  useFundMinimum: () =>
    state.minimumWei === undefined ? {} : { minimumWei: state.minimumWei, minimumUsd: 0.2 },
}));

beforeEach(() => {
  state.minimumWei = parseEther("0.000101");
  fund.mockReset();
});
afterEach(cleanup);

const input = () => screen.getByLabelText("ETH Amount");

describe("FundingCard minimum", () => {
  it("shows the minimum, rounded up", () => {
    render(<FundingCard />);
    expect(screen.getByText(/Minimum/).textContent).toBe("Minimum 0.000101 ETH (≈ $0.20)");
  });

  it("blocks an amount under the minimum", () => {
    render(<FundingCard />);
    fireEvent.change(input(), { target: { value: "0.00003" } });
    const button = screen.getByRole("button", { name: "Below $0.20 Minimum" });
    expect(button).toHaveProperty("disabled", true);
    expect(document.querySelector(".eth-input-min.is-below")).not.toBeNull();
  });

  it("fills the minimum when clicked, which can then be funded", () => {
    render(<FundingCard />);
    fireEvent.click(screen.getByRole("button", { name: "0.000101 ETH" }));
    expect(input()).toHaveProperty("value", "0.000101");
    fireEvent.click(screen.getByRole("button", { name: "Fund Now" }));
    expect(fund).toHaveBeenCalledWith("0.000101");
  });

  it("does not block while the minimum is still loading", () => {
    state.minimumWei = undefined;
    render(<FundingCard />);
    fireEvent.change(input(), { target: { value: "0.00003" } });
    expect(screen.queryByText(/Minimum/)).toBeNull();
    expect(screen.getByRole("button", { name: "Fund Now" })).toHaveProperty("disabled", false);
  });
});
