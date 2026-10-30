import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseUnits } from "viem";
import { DiceStatus, GAME_DURATION_SECONDS, type DiceGame } from "../../lib/dice";
import { CreateGameCard } from "./CreateGameCard";
import { DiceGameTable } from "./DiceGameTable";
import { FlipStage } from "./FlipStage";

const ALICE = "0x1111111111111111111111111111111111111111";
const BOB = "0x2222222222222222222222222222222222222222";
const ZERO = "0x0000000000000000000000000000000000000000";
const T0 = 1_800_000_000;

// Wallet + contract reads are mocked: these tests cover what the components render for a given
// chain state. The fork and E2E suites cover the real reads and writes.
const wallet = vi.hoisted(() => ({
  address: undefined as string | undefined,
  balance: undefined as bigint | undefined,
  game: undefined as unknown,
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: wallet.address, isConnected: !!wallet.address }),
}));
vi.mock("../../hooks/useBrbBalance", () => ({
  useBrbBalance: () => ({ data: wallet.balance, refetch: vi.fn() }),
}));
vi.mock("../../hooks/useDiceGames", () => ({
  useDiceGame: () => ({ data: wallet.game }),
}));

beforeEach(() => {
  wallet.address = undefined;
  wallet.balance = undefined;
  wallet.game = undefined;
});
afterEach(cleanup);

const game = (overrides: Partial<DiceGame> = {}): DiceGame => ({
  id: 7n,
  creator: ALICE,
  challenger: ZERO,
  winner: ZERO,
  amount: parseUnits("1000", 18),
  createdAt: T0,
  acceptedAt: 0,
  creatorSide: 1,
  challengerSide: 0,
  status: DiceStatus.Open,
  ...overrides,
});

describe("CreateGameCard", () => {
  it("asks for a wallet when disconnected", () => {
    render(<CreateGameCard isBusy={false} onThrow={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Connect Wallet First" })).toHaveProperty("disabled", true);
  });

  it("shows the pot and submits the stake in wei", async () => {
    wallet.address = ALICE;
    wallet.balance = parseUnits("5000", 18);
    const onThrow = vi.fn().mockResolvedValue(1n);
    render(<CreateGameCard isBusy={false} onThrow={onThrow} />);

    fireEvent.change(screen.getByLabelText("Stake ($BRB)"), { target: { value: "1500" } });
    expect(screen.getByText("3,000.00 $BRB")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Throw Coin" }));
    expect(onThrow).toHaveBeenCalledWith(parseUnits("1500", 18));
  });

  it("blocks a stake above the wallet balance", () => {
    wallet.address = ALICE;
    wallet.balance = parseUnits("10", 18);
    render(<CreateGameCard isBusy={false} onThrow={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Stake ($BRB)"), { target: { value: "11" } });
    expect(screen.getByRole("button", { name: "Insufficient $BRB" })).toHaveProperty("disabled", true);
  });

  it("presets fill the input and Max uses the full balance", () => {
    wallet.address = ALICE;
    wallet.balance = parseUnits("42.5", 18);
    render(<CreateGameCard isBusy={false} onThrow={vi.fn()} />);
    const input = screen.getByLabelText("Stake ($BRB)") as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "10,000" }));
    expect(input.value).toBe("10000");
    fireEvent.click(screen.getByRole("button", { name: "Max" }));
    expect(input.value).toBe("42.5");
  });

  it("shows the busy label while a transaction runs", () => {
    wallet.address = ALICE;
    render(<CreateGameCard isBusy busyLabel="Approving $BRB..." onThrow={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Approving $BRB..." })).toHaveProperty("disabled", true);
  });
});

describe("DiceGameTable", () => {
  it("renders the empty state", () => {
    render(<DiceGameTable variant="lobby" games={[]} now={T0} empty="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });

  it("lobby row: creator, stake, landed side, time left, action", () => {
    render(
      <DiceGameTable
        variant="lobby"
        games={[game()]}
        now={T0 + GAME_DURATION_SECONDS - 2 * 3600}
        empty=""
        renderAction={() => <button type="button">Match</button>}
      />,
    );
    expect(screen.getByText("#7")).toBeTruthy();
    expect(screen.getByText("0x1111...1111")).toBeTruthy();
    expect(screen.getByText("1,000.00")).toBeTruthy();
    expect(screen.getByText("Tails")).toBeTruthy();
    expect(screen.getByText("2h 00m")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Match" })).toBeTruthy();
  });

  it("history row marks the viewer as You and shows Won/Lost", () => {
    wallet.address = BOB;
    const finished = game({ status: DiceStatus.Finished, challenger: BOB, winner: BOB, acceptedAt: T0 });
    const onSelect = vi.fn();
    render(<DiceGameTable variant="history" games={[finished]} now={T0 + 120} empty="" onSelect={onSelect} />);
    expect(screen.getByText("You")).toBeTruthy();
    expect(screen.getByText("Won")).toBeTruthy();
    expect(screen.getByText("2m ago")).toBeTruthy();
    fireEvent.click(screen.getByText("#7"));
    expect(onSelect).toHaveBeenCalledWith(finished);
  });
});

describe("FlipStage", () => {
  const chainGame = (overrides: Partial<DiceGame> = {}) => {
    const { id: _id, ...g } = game(overrides);
    return { ...g, createdAt: BigInt(g.createdAt), acceptedAt: BigInt(g.acceptedAt) };
  };

  it("idle table explains the rule", () => {
    render(<FlipStage onClear={vi.fn()} />);
    expect(screen.getByText("The table")).toBeTruthy();
  });

  it("spins while the creator's VRF flip is pending", () => {
    wallet.address = ALICE;
    wallet.game = chainGame({ status: DiceStatus.AwaitingCreatorFlip });
    const { container } = render(<FlipStage gameId={7n} onClear={vi.fn()} />);
    expect(screen.getByText("Coin in the air")).toBeTruthy();
    expect(container.querySelectorAll(".coin.is-spinning")).toHaveLength(1);
  });

  it("shows the creator's landed side once open", () => {
    wallet.address = ALICE;
    wallet.game = chainGame({ status: DiceStatus.Open, creatorSide: 1 });
    const { container } = render(<FlipStage gameId={7n} onClear={vi.fn()} />);
    expect(screen.getByText("Landed Tails")).toBeTruthy();
    expect(container.querySelector(".coin.is-tails")).toBeTruthy();
  });

  it("announces the winner to the winner and the loser", () => {
    wallet.game = chainGame({ status: DiceStatus.Finished, challenger: BOB, winner: BOB, challengerSide: 0 });
    wallet.address = BOB;
    const { container, unmount } = render(<FlipStage gameId={7n} onClear={vi.fn()} />);
    expect(screen.getByText("You won")).toBeTruthy();
    expect(container.querySelector(".flip-stage.is-win")).toBeTruthy();
    unmount();

    wallet.address = ALICE;
    render(<FlipStage gameId={7n} onClear={vi.fn()} />);
    expect(screen.getByText("You lost")).toBeTruthy();
  });
});
