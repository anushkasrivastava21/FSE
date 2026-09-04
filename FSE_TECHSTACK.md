# Tech Stack
## Blockchain Food Surplus Exchange (FSE)
**Version:** 1.0 · Companion to FSE_PRD.md and FSE_TRD.md

---

## 1. Repo & Tooling (whole team)

| Concern | Choice | Why |
|---|---|---|
| Monorepo tool | pnpm workspaces + Turborepo | Single install, shared `shared/` types package, cached builds, independent CI per package |
| Language | TypeScript everywhere (backend, frontend, scripts) + Solidity for contracts | One language reduces context-switching across a 3-person team and lets ABI-derived types flow end to end |
| Lint/format | ESLint + Prettier (JS/TS), Solhint (Solidity), pre-commit hook via Husky | Prevents formatting-only diffs from causing merge noise |
| CI | GitHub Actions, one workflow per package (`contracts.yml`, `backend.yml`, `frontend.yml`) | A frontend PR isn't blocked by a contract test failure and vice versa |

## 2. Smart Contracts (Phase 1 — all three, one vertical each: A=Listing/Matching, B=Order/Settlement/Token, C=Forecast)

| Layer | Choice | Notes |
|---|---|---|
| Language | Solidity ^0.8.24 | Built-in overflow checks |
| Framework | Hardhat (primary) — optionally Foundry for fuzz testing | Hardhat has the gentlest learning curve and best TS integration (typechain) for a first blockchain project; Foundry fuzzing is a strong stretch goal for the security section of the report |
| Libraries | OpenZeppelin Contracts (AccessControl, ERC-721, ReentrancyGuard) | Battle-tested, expected by any evaluator |
| Type generation | TypeChain | Generates TS types/bindings from ABI → feeds `shared/` package |
| Target chain | **Polygon Amoy testnet** (Polygon's current public testnet) | Low gas, EVM-compatible, well-documented faucets, widely accepted for academic/demo projects. (Mumbai is deprecated — do not use it.) |
| Off-chain storage for media | IPFS via **Pinata** (or web3.storage) | Free tier sufficient for a pilot; keeps images/receipts off-chain per TRD §2 |
| Local dev chain | Hardhat Network / Anvil (Foundry) | Fast iteration before touching testnet |

## 3. Backend (Phase 2 — same three people, same verticals, one layer up)

| Layer | Choice | Notes |
|---|---|---|
| Runtime/framework | Node.js + NestJS (or Express if the team wants something lighter) | NestJS's module structure maps cleanly onto the TRD's component split (indexer, API, jobs) and enforces separation that helps avoid one person's code sprawling into another's module |
| Chain interaction | **viem** (preferred over ethers v5 for new projects) + wagmi/core on the read side where useful | Modern, strongly typed, smaller bundle |
| Database | **Supabase (Postgres)** | Matches your existing Next.js/Supabase workflow — gives you managed Postgres, row-level security, and built-in auth/storage without standing up separate infra, which is a real speed win for a 3-month team project. If you'd rather keep the whole stack self-hosted for the report's "fully decentralized/no vendor" narrative, plain Postgres + Prisma is the drop-in alternative — decide once at Gate 0, since the schema in the TRD works either way. |
| ORM | Prisma (works with either Supabase's Postgres or self-hosted) | Type-safe queries, easy migrations, single migration owner (R2) as per PRD §10.3 |
| Realtime/ticker updates | Supabase Realtime (if using Supabase) or a plain WebSocket server (`ws` / Socket.IO) otherwise | Powers the live dashboard ticker without polling |
| Background jobs | BullMQ + Redis (urgency-cache refresh, forecast scoring cron) | Standard, well-documented queue for scheduled recomputation |
| Event indexing | Custom listener service using viem's `watchContractEvent`, or a hosted subgraph (The Graph) as a stretch goal | Custom listener is simpler to reason about for a first project; subgraph is a good "future work" line in the report |
| Auth | Wallet-based auth (SIWE — Sign-In With Ethereum) for donors/NGOs; Supabase Auth (or simple JWT) for admin panel | Keeps identity tied to the wallet address used on-chain, consistent with the trust model in the PRD |

## 4. Frontend (Phase 3 — same three people, same verticals, top layer)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router)** | Matches your existing full-stack experience — no new framework to learn, and Next's route handlers can double as thin backend-for-frontend if needed |
| Styling | Tailwind CSS | Fast to build a clean dashboard/ticker UI without hand-rolling CSS |
| Wallet connection | wagmi + RainbowKit (or ConnectKit) | Handles multi-wallet support, network switching prompts, and is the de facto standard — evaluators will recognize it |
| Server state | TanStack React Query | Caching layer over the backend REST API; pairs naturally with the WebSocket/Realtime feed for live ticker updates |
| Charts (ticker/dashboard) | Recharts | Lightweight, good for the "listed surplus / demand / volume" ticker visuals described in the PRD |
| Forms | React Hook Form + Zod | Zod schemas can be shared with backend validation for consistency |

## 5. Shared Package (`shared/`)

| Contents | Generated from | Owner |
|---|---|---|
| Contract ABIs + TS types | TypeChain output from `contracts/` build | Each person publishes their own vertical's ABI types as they finish Phase 1; everyone consumes |
| API types | `openapi-typescript` from each vertical's OpenAPI spec | Each person publishes their own vertical's API types after Phase 2; consumed mainly by that same person's own Phase-3 frontend, and by C's dashboard for cross-vertical aggregation |
| Zod schemas for shared entities (Listing, Order, Forecast) | Hand-written once, imported by both backend and frontend | Reviewed by all three at Gate 0/1 |

This package is what makes the sequencing in the PRD actually enforceable: nobody can "accidentally" build against a stale contract or API shape, because the types come from one generated source, and a breaking change shows up as a compile error, not a runtime surprise discovered during integration week.

## 6. Environment Variables (convention, fill in `.env.example` at Gate 0)

```
# contracts
PRIVATE_KEY=
AMOY_RPC_URL=
POLYGONSCAN_API_KEY=       # for contract verification

# backend
DATABASE_URL=              # Supabase or local Postgres connection string
REDIS_URL=
PINATA_JWT=
CONTRACT_ADDRESSES_PATH=./deployments/testnet.json

# frontend
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_CHAIN_ID=80002   # Polygon Amoy
```

## 7. Summary Table

| Area | Primary choice |
|---|---|
| Contracts | Solidity + Hardhat + OpenZeppelin, deployed to Polygon Amoy |
| Off-chain media | IPFS (Pinata) |
| Backend | Node.js + NestJS + viem + Prisma + Supabase Postgres + BullMQ/Redis |
| Frontend | Next.js + Tailwind + wagmi/RainbowKit + React Query + Recharts |
| Monorepo | pnpm + Turborepo, shared generated-types package |
| CI | GitHub Actions, per-package workflows |
