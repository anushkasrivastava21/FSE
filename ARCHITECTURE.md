# FSE — Food Surplus Exchange Architecture

## High-Level Overview

FSE is a decentralized platform built on Polygon that connects food donors (restaurants, supermarkets) with NGOs to efficiently distribute surplus food and reduce waste. 

The system utilizes an AI-driven urgency scoring mechanism to prioritize food matching based on perishability, location, and predicted demand. Donors are incentivized through Food Credit Tokens (FCT).

## Mermaid Architecture Diagram

```mermaid
graph TD
    %% Actors
    Donor[Donor Person A]
    NGO[NGO Person B]
    AI[AI Oracle Person C]
    
    %% Frontend Components
    subgraph Frontend [Next.js DApp]
        DonorPortal(Donor Portal)
        NGOPortal(NGO Portal)
        AIDashboard(AI Dashboard)
    end
    
    %% Backend Services
    subgraph Backend [NestJS Backend]
        API(REST API)
        Indexers(Blockchain Indexers)
        IPFS(IPFS Service)
    end
    
    %% Smart Contracts (Polygon/Hardhat)
    subgraph Contracts [Smart Contracts]
        ListingContract[Listing.sol]
        OrderContract[Order.sol]
        MatchingEngine[MatchingEngine.sol]
        Settlement[Settlement.sol]
        ForecastRegistry[ForecastRegistry.sol]
        Token[FoodCreditToken.sol]
    end
    
    %% Database
    DB[(SQLite/Prisma)]
    
    %% Connections - Frontend to Blockchain (Write)
    Donor -->|Creates Listing| DonorPortal
    DonorPortal -->|Tx: createListing| ListingContract
    DonorPortal -->|Tx: cancelListing| ListingContract
    
    NGO -->|Places Order| NGOPortal
    NGOPortal -->|Tx: placeOrder| OrderContract
    NGOPortal -->|Tx: recordHandoff| Settlement
    
    AI -->|Submits Forecast| AIDashboard
    AIDashboard -->|Tx: submitForecast| ForecastRegistry
    
    %% Connections - Contracts
    ListingContract <--> MatchingEngine
    OrderContract <--> MatchingEngine
    MatchingEngine -->|Execute Match| Settlement
    Settlement -->|Mint FCT| Token
    ForecastRegistry -.->|Provides Data| MatchingEngine
    
    %% Connections - Indexing (Read)
    ListingContract -.->|Events| Indexers
    OrderContract -.->|Events| Indexers
    MatchingEngine -.->|Events| Indexers
    Settlement -.->|Events| Indexers
    ForecastRegistry -.->|Events| Indexers
    
    %% Connections - Backend to DB
    Indexers -->|Write Data| DB
    API -->|Read Data| DB
    
    %% Connections - Frontend to Backend (Read)
    DonorPortal -->|Fetch Listings| API
    NGOPortal -->|Fetch Orders & Matches| API
    AIDashboard -->|Fetch Forecasts| API
    
    %% IPFS
    DonorPortal -->|Upload Image| IPFS
```

## System Components

### 1. Smart Contracts
- **Listing.sol**: Manages food surplus listings.
- **Order.sol**: Manages NGO requests.
- **ForecastRegistry.sol**: Stores AI-generated food shortage predictions.
- **MatchingEngine.sol**: Uses a linear programming inspired off-chain or on-chain logic to match Listings to Orders based on an urgency score (Perishability + AI Forecast).
- **Settlement.sol**: Records custody handoffs (PickedUp -> InTransit -> Delivered) and mints tokens on delivery.
- **FoodCreditToken.sol**: ERC20 token minted to donors as a tax/carbon offset credit.

### 2. Backend (NestJS)
- **Indexers**: Listens to Polygon/Localhost events (e.g., `ListingCreated`, `MatchExecuted`) and syncs them to the SQLite database.
- **REST API**: Exposes cached, indexed data to the frontend for snappy UI loading.
- **Prisma ORM**: Manages SQLite.

### 3. Frontend (Next.js)
- Uses `wagmi` and `RainbowKit` for Web3 connection.
- Communicates directly with the blockchain for WRITE operations.
- Communicates with the NestJS backend for READ operations.
