# Brabo Markets — Old vs New: Main Changes

## TL;DR

The frontend migrated from a **vanilla HTML/CSS/JS** site (no build step, CDN libraries,
hand-rolled Web3) to a **Vite + React 19 + TypeScript** app using **wagmi v2**, **viem v2**,
and **RainbowKit v2**. Same 5 pages, same contracts, completely different stack.

---

## 1. File Architecture

### Old (legacy-site/)

```
public/
├── index.html          ← Fund page (all markup inline)
├── portfolio.html      ← Portfolio page
├── liquidity.html      ← Liquidity page
├── ecosystem.html      ← Ecosystem page
├── contracts.html      ← Contracts page
├── style.css           ← ~3 700 lines, everything in one file
├── background.css      ← background layer system
├── script.js           ← ~700 lines: wallet, Web3, contract calls,
│                          DOM manipulation, quote math, animations — all mixed
├── portfolio.js        ← portfolio-specific logic
├── getprice.js         ← ETH price + Uniswap quote helpers
├── check_price.js      ← secondary price util
├── constants.js        ← ABIs and contract addresses as raw JS objects
└── FundMe.sol / NftBrabo.sol   ← smart contract references
```

Every page was a separate `.html` file. Shared state (wallet address, ETH price)
was re-fetched independently on each page load. No module system — globals everywhere.

---

### New (src/)

```
src/
├── main.tsx                    ← entry point: mounts <App /> into #root
├── App.tsx                     ← provider tree + react-router-dom routes
├── index.css                   ← global resets only
│
├── config/
│   ├── contracts.ts            ← CONTRACT_ADDRESSES, all ABIs (as const → type inference)
│   ├── wagmi.ts                ← wagmiConfig via RainbowKit getDefaultConfig
│   └── env.ts                  ← VITE_WALLETCONNECT_PROJECT_ID, VITE_BASE_RPC_URL
│
├── pages/                      ← one component per route
│   ├── FundPage.tsx            ← /
│   ├── PortfolioPage.tsx       ← /portfolio
│   ├── LiquidityPage.tsx       ← /liquidity
│   ├── EcosystemPage.tsx       ← /ecosystem
│   └── ContractsPage.tsx       ← /contracts
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          ← logo + RainbowKit <ConnectButton />
│   │   ├── PageNav.tsx         ← 5 tabs using <NavLink> (active state automatic)
│   │   └── PageLayout.tsx      ← wraps every page with Navbar + PageNav
│   ├── fund/
│   │   ├── StatsGrid.tsx       ← 6 stat cards (ETH funded, funders, market cap…)
│   │   ├── FundingCard.tsx     ← ETH input + fund button
│   │   ├── QuoteBreakdown.tsx  ← 20/80 split preview + NFT bonus
│   │   ├── TierProgressionTrack.tsx
│   │   └── HowItWorks.tsx
 
│   ├── portfolio/              ← PositionOverview, TierCards, NftDisplay, ActivitySummary…
│   ├── liquidity/              ← AddLiquidityCard, LiquidityStatsGrid
│   ├── contracts/              ← ContractAddressCard
│   └── ui/
│       ├── StatCard.tsx        ← reusable card with optional CountUp animation
│       └── ToastProvider.tsx   ← context-based toast (replaces manual DOM #toast)
│
├── hooks/                      ← all blockchain and async state here
│   ├── useContractStats.ts     ← multicall batch read of Fund-page stats
│   ├── useUserData.ts          ← connected user's funded amount + NFT tier
│   ├── useFundQuote.ts         ← 20/80 split quote calculation (debounced)
│   ├── useFundTransaction.ts   ← write contract + wait for receipt
│   ├── useAddLiquidity.ts      ← liquidity page transaction
│   ├── useEthPrice.ts          ← CoinGecko ETH/USD (TanStack Query, 60s cache)
│   ├── useBrbPool.ts           ← Uniswap V3 pool state
│   ├── useBrbBalance.ts        ← ERC-20 balance of connected wallet
│   ├── useFundPageAnimations.ts← GSAP + Lenis + Vanta (Fund page only)
│   ├── useCopyToClipboard.ts
│   └── useDebouncedValue.ts
│
├── lib/                        ← pure functions, no React, no blockchain
│   ├── quote.ts                ← splitFundAmount, calculateCompensation (bigint math)
│   ├── tiers.ts                ← tier lookup by funded amount
│   ├── formatters.ts           ← formatEth, formatUsd, formatBrb
│   ├── errors.ts               ← viem ContractFunctionRevertedError → human string
│   └── countup.ts              ← CountUp helper (see react-countup ESM gotcha)
│
├── styles/
│   └── background.css          ← ported from legacy, imported only by FundPage
│
└── types/
    └── vanta.d.ts              ← manual type declarations for Vanta.js
```

**Key architectural rule:** contract addresses/ABIs → `config/contracts.ts`;
contract reads/writes → `hooks/`; pure math/formatting → `lib/`; nothing mixes.

---

## 2. How wagmi is Used

wagmi v2 provides React hooks that wrap viem under the hood. It handles connection state,
account tracking, and the request lifecycle (submit → mempool → confirmed).

### Config (src/config/wagmi.ts)

```ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { base } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Brabo Markets",
  projectId: env.walletConnectProjectId,   // WalletConnect cloud project ID
  chains: [base],                          // Base mainnet only
  transports: {
    [base.id]: http(env.baseRpcUrl),       // custom RPC via env var
  },
  ssr: false,
});
```

`getDefaultConfig` from RainbowKit replaces the old manual `createConfig` boilerplate.
It sets up the wagmi store, WalletConnect transport, and injects all wallet connectors
(MetaMask, Coinbase Wallet, WalletConnect QR, injected) automatically.

### Reading contract data (useContractStats.ts)

Old way — sequential, manual ethers calls fired one by one:
```js
// legacy-site/script.js (simplified)
const total = await fundMeContract.totalEthFunded();
const funders = await fundMeContract.totalFunders();
// ...one await per call, serialized
```

New way — `useReadContracts` batches everything into a single multicall:
```ts
const { data } = useReadContracts({
  contracts: [
    { ...fundMeContract, functionName: "totalEthFunded" },
    { ...fundMeContract, functionName: "totalFunders" },
    { ...fundMeContract, functionName: "getPicaTokenBalance" },
    // …3 more
  ],
  query: { refetchInterval: 30_000 },  // auto-refresh every 30s
});
```

One network round-trip instead of 6 sequential ones. Results are typed: TypeScript knows
the return type of each function from the ABI shape (`as const`).

### Writing transactions (useFundTransaction.ts)

Old way — manually called ethers `contract.fund({ value })`, caught errors with
`error.message.includes("some string")`, polled `tx.wait()`.

New way:
```ts
const { writeContractAsync } = useWriteContract();

const txHash = await writeContractAsync({
  address: CONTRACT_ADDRESSES.FUNDME,
  abi: FUNDME_ABI,
  functionName: "fund",
  value: parseEther(ethAmount),     // viem utility — bigint wei
});

// Separate hook watches the receipt automatically
const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
```

- `useWriteContract` manages the pending/submitting state
- `useWaitForTransactionReceipt` polls the RPC for the receipt
- No manual polling loop, no `tx.wait()`

### Wallet connection

Old: ~200 lines in `script.js` detecting `window.ethereum`, manually handling
MetaMask / Phantom / Coinbase / WalletConnect SDKs, storing address in a global variable,
re-running wallet checks on every page load.

New: `<ConnectButton />` from RainbowKit + `useAccount()` from wagmi.
```ts
const { address, isConnected } = useAccount();
```
The address is in React state, reactive, shared across the whole app via `WagmiProvider`.

---

## 3. How viem is Used

viem is the low-level TypeScript library for Ethereum interaction that wagmi uses internally.
You also call it directly in a few places:

### Type-safe ABI encoding

```ts
import { getAddress } from "viem";

// In contracts.ts — checksums the address at import time
export const CONTRACT_ADDRESSES = {
  FUNDME: "0x010996547d68dA484b4FeBCC337A97d48b3Af8D7",
} as const;
```

The `as const` assertion + viem's ABI inference means TypeScript knows the exact
return types of every contract function — no manual type casting.

### BigInt math instead of ethers BigNumber

Old:
```js
const buyback = ethers.BigNumber.from(totalWei).mul(20).div(100);
```

New (lib/quote.ts):
```ts
import { parseEther } from "viem";

const totalWei = parseEther(ethAmount);          // string → bigint (wei)
const buybackWei = (totalWei * 20n) / 100n;     // native JS bigint operators
const batchWei = totalWei - buybackWei;
```

No BigNumber wrapper. JavaScript's native `bigint` (the `n` suffix) handles all
256-bit integer arithmetic. viem utilities (`parseEther`, `formatEther`) convert
between human-readable strings and raw wei bigints.

### Error handling

Old:
```js
catch (err) {
  if (err.message.includes("insufficient funds")) { ... }
  if (err.message.includes("user rejected")) { ... }
}
```

New (lib/errors.ts):
```ts
import { ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof UserRejectedRequestError) return "Transaction cancelled.";
  if (error instanceof ContractFunctionRevertedError)
    return error.data?.errorName ?? "Contract rejected the transaction.";
  // …
}
```

viem exports typed error classes for every failure mode — no string matching.

---

## 4. Other Key Differences

| Area | Old | New |
|---|---|---|
| **Routing** | 5 separate HTML files, browser navigates between them, full page reload | `react-router-dom` v7, client-side routing, no page reload, shared layout/state |
| **State** | Global `let address`, `let ethPrice` vars in script.js | React state + TanStack Query cache, reactive and scoped |
| **Wallet detection** | ~200 lines of manual provider detection | RainbowKit `<ConnectButton />` handles all wallets |
| **Contract reads** | Sequential ethers calls on every page load | `useReadContracts` multicall, auto-refetch, cached |
| **Transaction flow** | Manual `tx.wait()` polling + string-matched errors | `useWriteContract` + `useWaitForTransactionReceipt` + typed viem errors |
| **ETH price** | `fetch(coingecko)` every load, no caching | TanStack Query with 60s `staleTime`, shared across components |
| **Quote math** | Mixed into script.js alongside DOM code | Pure functions in `lib/quote.ts`, unit-testable, no DOM dependency |
| **Build output** | No build — served directly from `public/` | `npm run build` → `dist/` (Vite bundles, tree-shakes, code-splits by route) |
| **Types** | None | Full TypeScript — ABI return types inferred by viem from `as const` |
| **Design libs** | Added via CDN `<script>` tags in index.html | npm packages (`gsap`, `lenis`, `vanta`, `typed.js`, `react-countup`) |
| **CSS** | One 3 700-line `style.css` + `background.css`, global | `index.css` for resets, `background.css` imported only by FundPage.tsx |

---

## 5. What Did NOT Change

- The deployed smart contracts — same addresses on Base mainnet, same ABIs
- The 5 pages and their purpose
- The visual design (colors, layout, component names were ported 1:1)
- The 20/80 split math (ported verbatim from getprice.js into lib/quote.ts)
- The +50 funder count offset from the legacy site (preserved in useContractStats.ts)
- The 5 design animation libraries (GSAP, Lenis, Vanta, Typed.js, CountUp.js) — now npm packages instead of CDN, wired through `useFundPageAnimations.ts`
- The `legacy-site/` folder (the original `public/` — kept as reference, not deleted)
