import { describe, expect, it } from "vitest";
import {
  DiceStatus,
  GAME_DURATION_SECONDS,
  VRF_TIMEOUT_SECONDS,
  describeStatus,
  formatAgo,
  formatTimeLeft,
  isOpenExpired,
  isPendingVrf,
  isRefundable,
  isSameAddress,
  sideLabel,
  type DiceGame,
} from "./dice";

const ALICE = "0x1111111111111111111111111111111111111111";
const BOB = "0x2222222222222222222222222222222222222222";
const CAROL = "0x3333333333333333333333333333333333333333";
const ZERO = "0x0000000000000000000000000000000000000000";
const T0 = 1_800_000_000;

const game = (overrides: Partial<DiceGame> = {}): DiceGame => ({
  id: 1n,
  creator: ALICE,
  challenger: ZERO,
  winner: ZERO,
  amount: 10n ** 21n,
  createdAt: T0,
  acceptedAt: 0,
  creatorSide: 0,
  challengerSide: 0,
  status: DiceStatus.Open,
  ...overrides,
});

describe("DiceStatus", () => {
  it("matches the Solidity enum order", () => {
    expect(Object.values(DiceStatus)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("isRefundable mirrors BraboDice.refund", () => {
  it("open game: only strictly after createdAt + 24h", () => {
    const g = game();
    expect(isRefundable(g, T0 + GAME_DURATION_SECONDS)).toBe(false);
    expect(isRefundable(g, T0 + GAME_DURATION_SECONDS + 1)).toBe(true);
  });

  it("awaiting creator flip: after createdAt + VRF timeout", () => {
    const g = game({ status: DiceStatus.AwaitingCreatorFlip });
    expect(isRefundable(g, T0 + VRF_TIMEOUT_SECONDS)).toBe(false);
    expect(isRefundable(g, T0 + VRF_TIMEOUT_SECONDS + 1)).toBe(true);
  });

  it("awaiting challenger flip: timed from acceptedAt, not createdAt", () => {
    const accepted = T0 + 20 * 3600;
    const g = game({ status: DiceStatus.AwaitingChallengerFlip, acceptedAt: accepted, challenger: BOB });
    expect(isRefundable(g, T0 + VRF_TIMEOUT_SECONDS + 1)).toBe(false);
    expect(isRefundable(g, accepted + VRF_TIMEOUT_SECONDS + 1)).toBe(true);
  });

  it("finished and refunded games never are", () => {
    const far = T0 + 10 * GAME_DURATION_SECONDS;
    expect(isRefundable(game({ status: DiceStatus.Finished }), far)).toBe(false);
    expect(isRefundable(game({ status: DiceStatus.Refunded }), far)).toBe(false);
  });
});

describe("describeStatus", () => {
  const finished = game({ status: DiceStatus.Finished, challenger: BOB, winner: BOB });

  it("labels the outcome from the viewer's side", () => {
    expect(describeStatus(finished, BOB, T0).label).toBe("Won");
    expect(describeStatus(finished, ALICE, T0).label).toBe("Lost");
    expect(describeStatus(finished, CAROL, T0).label).toBe("Settled");
    expect(describeStatus(finished, undefined, T0).label).toBe("Settled");
  });

  it("compares addresses case-insensitively", () => {
    expect(describeStatus(finished, BOB.toUpperCase().replace("0X", "0x"), T0).label).toBe("Won");
  });

  it("open vs expired vs pending", () => {
    expect(describeStatus(game(), ALICE, T0).label).toBe("Open");
    expect(describeStatus(game(), ALICE, T0 + GAME_DURATION_SECONDS + 1).label).toBe("Expired");
    expect(describeStatus(game({ status: DiceStatus.AwaitingCreatorFlip }), ALICE, T0).tone).toBe("pending");
    expect(describeStatus(game({ status: DiceStatus.AwaitingChallengerFlip }), ALICE, T0).tone).toBe("pending");
  });
});

describe("helpers", () => {
  it("isOpenExpired / isPendingVrf", () => {
    expect(isOpenExpired(game(), T0 + GAME_DURATION_SECONDS + 1)).toBe(true);
    expect(isOpenExpired(game({ status: DiceStatus.Finished }), T0 + GAME_DURATION_SECONDS + 1)).toBe(false);
    expect(isPendingVrf(game({ status: DiceStatus.AwaitingCreatorFlip }))).toBe(true);
    expect(isPendingVrf(game())).toBe(false);
  });

  it("sideLabel", () => {
    expect(sideLabel(0)).toBe("Heads");
    expect(sideLabel(1)).toBe("Tails");
  });

  it("isSameAddress", () => {
    expect(isSameAddress(ALICE, ALICE.toUpperCase())).toBe(true);
    expect(isSameAddress(ALICE, undefined)).toBe(false);
  });

  it("formatTimeLeft", () => {
    expect(formatTimeLeft(0)).toBe("Expired");
    expect(formatTimeLeft(45)).toBe("45s");
    expect(formatTimeLeft(5 * 60)).toBe("5m");
    expect(formatTimeLeft(23 * 3600 + 5 * 60)).toBe("23h 05m");
  });

  it("formatAgo", () => {
    expect(formatAgo(T0, T0 + 10)).toBe("just now");
    expect(formatAgo(T0, T0 + 120)).toBe("2m ago");
    expect(formatAgo(T0, T0 + 3 * 3600)).toBe("3h ago");
    expect(formatAgo(T0, T0 + 2 * 86400)).toBe("2d ago");
  });
});
