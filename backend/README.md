# Backend — @fse/backend

NestJS API server, event indexer/listener, urgency-cache job, IPFS integration.

## Module ownership (by vertical)

| Module | Owner | What it does |
|---|---|---|
| `src/listing/` | **Person A** | Listing indexer, `/listings` REST endpoints |
| `src/matching/` | **Person A** | Matching indexer, `/matches/:id` endpoint, urgency-cache BullMQ job |
| `src/ipfs/` | **Person A** | Pinata upload helper |
| `src/order/` | **Person B** | Order indexer, `/orders` endpoints |
| `src/handoff/` | **Person B** | Handoff indexer, `/handoffs` endpoint |
| `src/token/` | **Person B** | Food Credit Token read endpoints |
| `src/forecast/` | **Person C** | Forecast indexer, forecast scoring cron job |
| `src/dashboard/` | **Person C** | Ticker aggregation endpoints (reads from A and B tables) |
| `src/auth/` | **All** | SIWE wallet auth middleware |

## Start developing

```bash
# From repo root
pnpm --filter backend dev
```

## Environment variables

Copy `../.env.example` to `../.env` and fill in `DATABASE_URL`, `REDIS_URL`, `PINATA_JWT`, `CONTRACT_ADDRESSES_PATH`.
