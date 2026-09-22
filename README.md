# 🥗 Food Surplus Exchange (FSE)
> A trustless, auditable, real-time marketplace where surplus food is matched to need before it spoils.

## Tech Stack
| Layer | Tech |
|---|---|
| Smart Contracts | Solidity ^0.8.24 · Hardhat · OpenZeppelin · Polygon Amoy |
| Backend | NestJS · viem · Prisma · Supabase Postgres · BullMQ/Redis |
| Frontend | Next.js 14 · Tailwind CSS · wagmi · RainbowKit · React Query |
| Monorepo | pnpm workspaces · Turborepo |

## Quick Start (Localhost Testing)

Since we are using Option B (Local Hardhat Node) to bypass testnet faucet limits:

1. **Start Local Blockchain & Deploy Contracts**
   ```bash
   # Terminal 1
   cd contracts
   npx hardhat node
   # Terminal 2
   cd contracts
   npx hardhat run scripts/deploy.js --network localhost
   ```

2. **Start Backend (Indexers & API)**
   ```bash
   # Terminal 3
   cd backend
   pnpm install
   pnpm dev
   ```

3. **Start Frontend**
   ```bash
   # Terminal 4
   cd frontend
   pnpm install
   # Ensure .env has NEXT_PUBLIC_CHAIN_NETWORK=localhost
   pnpm dev
   ```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a comprehensive Mermaid diagram and system overview.

## Team Verticals
| Person | Vertical | Contracts | Backend modules | Frontend |
|---|---|---|---|---|
| **A** | Listing & Matching | `Listing.sol`, `MatchingEngine.sol` | `listing/`, `matching/`, `ipfs/` | `app/donor/` |
| **B** | Order, Settlement & Token | `Order.sol`, `Settlement.sol`, `FoodCreditToken.sol` | `order/`, `handoff/`, `token/` | `app/ngo/` |
| **C** | Forecast & Dashboard | `ForecastRegistry.sol` | `forecast/`, `dashboard/` | `app/dashboard/` |

## Repo Structure
```
FSE/
├── contracts/          # Solidity contracts (Hardhat)
│   └── src/
│       ├── interfaces/ # Cross-vertical interface stubs (Gate 0)
│       ├── Listing.sol, MatchingEngine.sol  ← Person A
│       ├── Order.sol, Settlement.sol, FoodCreditToken.sol  ← Person B
│       └── ForecastRegistry.sol  ← Person C
├── backend/            # NestJS API + indexer + jobs
├── frontend/           # Next.js App Router
├── shared/             # Auto-generated types, ABIs, Zod schemas
│   ├── types/index.ts  # Entity types — DO NOT hand-edit
│   ├── events.md       # All contract event schemas
│   └── abi/            # Populated at Gate 1
├── deployments/        # Contract addresses per network
│   └── testnet.json    # Populated at Gate 1 — never hardcode addresses
├── .env.example        # Copy to .env and fill in — never commit .env
└── turbo.json
```

## Getting Started

```bash
# 1. Install dependencies (from repo root)
pnpm install

# 2. Copy env file and fill in your values
cp .env.example .env

# 3. Start local Hardhat chain
pnpm --filter contracts run deploy:local

# 4. Start backend dev server
pnpm --filter backend dev

# 5. Start frontend
pnpm --filter frontend dev
```

## Gate Checklist
| Gate | Trigger | Status |
|---|---|---|
| Gate 0 | Repo scaffold, naming locked, interfaces published | ✅ Done |
| Gate 1 | All contracts deployed to testnet, ABIs frozen | ⏳ Week 4 |
| Gate 2 | All APIs live, OpenAPI spec frozen | ⏳ Week 7 |
| Gate 3 | Full flows demoable end-to-end | ⏳ Week 10 |
