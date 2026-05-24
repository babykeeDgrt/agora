# Agora

> The data layer for autonomous AI agents on Somnia.

Agora is a novel, open marketplace where AI agents autonomously discover, negotiate, and trade verified real-world data on-chain, with no human intervention after setup. Built exclusively on Somnia's Agentic L1, the full loop from market creation to verified data delivery runs without keepers, trusted oracles, or off-chain middleware.

<!--**Live:** [agora.example.com](https://agora.example.com) · [Explorer](https://shannon-explorer.somnia.network) · Somnia Testnet (Chain ID: 50312)-->

---

## The Problem

AI agents need real-world data to act. Today every solution involves trust: a centralised API, a third-party oracle, or an off-chain relay you have to believe. There is no permissionless primitive for agents to acquire verified data from each other on-chain.

## The Solution

Agora is that primitive.

Agora has two primitives:

- **Auctions** for scarce, time-sensitive data where price discovery matters
- **Services** for commodity, recurring data where reliability matters

Provider agents wrap real-world APIs and can either list them as Dutch auctions or register them as always-on services. Consumer agents autonomously watch price ticks, decide when to buy, pay atomically, and receive data fetched on-chain by Somnia's native agent platform with multi-validator consensus. Once deployed, no human can intervene — the protocol runs itself.

This makes Agora a fuller agent economy primitive than a single-market demo. Autonomous agents do not always need the same market structure:

- If data is scarce or highly time-sensitive, agents need auction-based price discovery
- If data is commodity infrastructure like `ETH/USD`, agents need durable low-friction service access

Together, auctions and services cover the full spectrum of what autonomous agents need.

---

## Why This Matters For Somnia

The Somnia hackathon prompt is not about basic automation. It is about building a novel, high-impact, agent-driven application that is only credible because it runs on an Agentic L1.

Agora meets that bar because:

- **It is genuinely agent-driven.** Agents do not just submit one transaction. They monitor on-chain events, make decisions, trigger settlement, invoke validator-backed data fetches, and react to delivery autonomously.
- **It has real-world utility.** Any protocol or agent that needs live off-chain data can use Agora to acquire it without trusting a centralized oracle operator.
- **It uses Somnia-native primitives directly.** Reactivity, Somnia Agents, AgentKit identity, and cheap/final fast execution are all essential to the system rather than cosmetic add-ons.
- **It solves a real market design problem.** Auctions are right when price discovery matters. Services are right when repeatability and low friction matter. The protocol supports both.

---

## Real Autonomy — Not Basic Automation

Agora goes far beyond scripted automation. Every step after initial setup is driven by autonomous agents reacting to on-chain state:

**`AuctionClock.sol`** inherits `SomniaEventHandler` and subscribes to Somnia's `BlockTick` system event. On every block it iterates all active auctions and drops prices — no cron job, no keeper, no human.

**`ConsumerHandler.sol`** inherits `SomniaEventHandler` and self-subscribes to `PriceTick` events in its constructor. When price crosses its threshold it fires `snap()` autonomously, locks STT in escrow, and waits for delivery — no human fires this transaction.

**Provider agent** runs persistent `OnChainTrigger`s on both `AuctionSnapped` and `ServiceRegistry.DataRequested`. The moment a qualifying event lands on-chain, it computes the exact SOMI deposit and calls either `fulfillOrder()` or `fulfillRequest()` without human input.

**`DataProvider.sol`** and **`ServiceRegistry.sol`** call the Somnia Agent platform via `createRequest()`. Three independent validators fetch the API, reach consensus, and call back on-chain — releasing payment and delivering verified data on-chain.

**Qwen/Qwen3-32B planner** makes the economic decision — given auction state, budget, and urgency, it determines the optimal snap threshold before deploying the consumer's `ConsumerHandler`. The agent reasons about market conditions, not just executes a fixed rule.

> Once a provider lists data and a consumer agent is live, no human action is required to complete either an auction purchase or a service request. The protocol is fully self-executing.

---

## Why This Is Only Possible on Somnia

Agora uses four Somnia-native primitives together. Remove any one and the protocol breaks:

| Somnia Feature | How Agora Uses It | Why It Matters |
|----------------|------------------|----------------|
| **Somnia Agents** | `DataProvider` and `ServiceRegistry` call `platform.createRequest()` with live API metadata. Three validators fetch independently, reach consensus, and callback on-chain. | Eliminates trusted oracles entirely. Data is verified by the network, not a third party. |
| **Somnia Reactivity** | `AuctionClock` subscribes to `BlockTick` — self-driving price drops every block. `ConsumerHandler` subscribes to `PriceTick` — autonomous snap when threshold hit. Provider agents watch auction snaps and service requests in real time. | No keepers. No bots. The market mechanics are embedded in the chain and its agent runtime. |
| **Somnia AgentKit** | Provider and consumer agents use AgentKit's `OnChainTrigger`, `Agent` registry identity, and execution metrics. | On-chain agent identity and reputation for every marketplace participant. |
| **Sub-second finality + sub-cent fees** | Price ticks every block. Micro-payments in STT. The full loop completes in under 60 seconds. | Makes real-time autonomous agent commerce economically viable. Nothing like this works on Ethereum. |

---

## The Full Loop

### Mode 1: Auctions

```
Setup (once):
  Provider → startAuction(dataType, apiUrl, jsonSelector, startPrice, floorPrice...)
  Consumer → deploy ConsumerHandler(threshold, dataType, budget) [via AI planner]

Autonomous execution (no humans):

  Every block:
  AuctionClock._onEvent(BlockTick)
    └─ dropPrice() on all active auctions
    └─ DutchAuction emits PriceTick(auctionId, newPrice)

  When price ≤ threshold:
  ConsumerHandler._onEvent(PriceTick)
    └─ snap(auctionId) — sends STT
    └─ Escrow.lockPayment() — STT locked atomically
    └─ DutchAuction emits AuctionSnapped(auctionId, winner, price)

  Provider agent detects AuctionSnapped:
    └─ DataProvider.fulfillOrder(auctionId) + 0.12 SOMI deposit
    └─ platform.createRequest() → Somnia Agent platform invoked

  Somnia validators (async, 10-60s):
    └─ 3 validators independently fetch CoinGecko API
    └─ Reach consensus on result
    └─ Call DataProvider.handleResponse(requestId, responses, status)

  handleResponse():
    └─ Decode verified price from responses[0].result
    └─ Escrow.release() — STT sent to provider
    └─ Emit DataDelivered(auctionId, consumer, price, timestamp)

  ConsumerHandler._onEvent(DataDelivered):
    └─ Emit DataReceived(auctionId, price)
    └─ Verified price now available on-chain for any agent or contract
```

**Every arrow is a real on-chain transaction. Every step is verifiable on the Somnia explorer.**

### Mode 2: Always-On Services

```
Setup (once):
  Provider → ServiceRegistry.registerService(dataType, apiUrl, jsonSelector, decimals, pricePerRequest, timeoutBlocks)

Autonomous execution (repeat forever):

  Consumer:
    └─ requestData(serviceId) — sends fixed STT payment
    └─ ServiceRegistry stores ServiceRequest(Pending)
    └─ Emit DataRequested(requestId, serviceId, consumer, payment, blockNumber)

  Provider agent detects DataRequested:
    └─ ServiceRegistry.fulfillRequest(requestId) + 0.12 SOMI deposit
    └─ platform.createRequest() → Somnia Agent platform invoked

  Somnia validators (async):
    └─ 3 validators independently fetch the API
    └─ Reach consensus on result
    └─ Call ServiceRegistry.handleServiceResponse(agentRequestId, responses, status)

  handleServiceResponse():
    └─ Decode verified value from responses[0].result
    └─ Transfer fixed STT payment to provider
    └─ Emit DataDelivered(requestId, serviceId, consumer, price, timestamp)

  If provider never fulfills:
    └─ Consumer calls claimRefund(requestId) after timeout
```

This mode is critical for recurring data like `ETH/USD`, where re-listing an auction after every delivery is unnecessary friction. A service is registered once and can serve unlimited future requests.

---

## Real-World Utility

Agora is infrastructure, not a demo. Any developer can:

- **Deploy a consumer agent** that autonomously acquires verified price data for their DeFi protocol, trading bot, or prediction market — without API keys or trusted oracles
- **Become a provider** by wrapping any public JSON API and offering it either as an auction or as a persistent service — earning STT for every successful delivery
- **Build on top** by subscribing to `DataDelivered` events from `DataProvider` and `ServiceRegistry` — integrate verified on-chain data into any smart contract or agent workflow

The marketplace is open. No whitelist. No approval. Any wallet can participate.

---

## Architecture

```
contracts/
├── DutchAuction.sol      Auction state machine — create, tick, snap, expire
├── AuctionClock.sol      SomniaEventHandler — BlockTick → dropPrice() on all active auctions
├── Escrow.sol            Atomic STT custody — lock on snap, release on delivery, refund on timeout
├── DataProvider.sol      Somnia Agent bridge — createRequest() + handleResponse() async callback
├── ServiceRegistry.sol   Always-on service registry — register once, request forever, refund on timeout
└── ConsumerHandler.sol   SomniaEventHandler — autonomous snap + delivery receipt, per consumer

app/
├── agents/
│   ├── provider/         OnChainTrigger on AuctionSnapped → fulfillOrder() autonomously
│   │                     OnChainTrigger on DataRequested → fulfillRequest() autonomously
│   └── consumer/         Qwen/Qwen3-32B planner → optimal threshold → deploy ConsumerHandler
├── api/                  Express — chain reads, ServiceRegistry writes, ConsumerHandler deployment service
└── website/              Next.js — auctions + services marketplace, spawn agent UI, activity feed, dashboard
```

---

## Live Deployment (Somnia Testnet)

| Contract | Address | Explorer |
|----------|---------|---------|
| DutchAuction | `0xefc0C84206855A6319ceF167f4a8B734810e13d9` | [View](https://shannon-explorer.somnia.network/address/0xefc0C84206855A6319ceF167f4a8B734810e13d9) |
| DataProvider | `0x4D3047514E146f41033071e81F25A01eB016f762` | [View](https://shannon-explorer.somnia.network/address/0x4D3047514E146f41033071e81F25A01eB016f762) |
| Escrow | `0x8872f70DF76061728Dba2De51EEF124A0df04c7a` | [View](https://shannon-explorer.somnia.network/address/0x8872f70DF76061728Dba2De51EEF124A0df04c7a) |
| ServiceRegistry | `0x287e6060c3B7a35CE7Bc2c1154dEf7567cBc78c1` | [View](https://shannon-explorer.somnia.network/address/0x287e6060c3B7a35CE7Bc2c1154dEf7567cBc78c1) |

**Somnia Agent Platform:** `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`
**JSON API Agent ID:** `13174292974160097713`

---

## Contracts

### DutchAuction.sol

The marketplace core. Manages all auction state from creation through settlement.

**Key functions:**
- `startAuction(dataType, apiUrl, jsonSelector, decimals, startPrice, floorPrice, priceStep, timeoutBlocks)` — list data for sale
- `snap(auctionId)` — purchase at current price, atomically locks STT in escrow
- `dropPrice(auctionId)` — restricted to `AuctionClock` only via `onlyClock` modifier
- `getActiveAuctions()` — returns all live auction IDs for the clock to iterate
- `getAuction(auctionId)` — full auction record

**Key events:**
- `AuctionStarted(auctionId, provider, dataType, startPrice)`
- `PriceTick(auctionId, newPrice, blockNumber)` — drives ConsumerHandler Reactivity subscriptions
- `AuctionSnapped(auctionId, winner, finalPrice)` — drives provider agent OnChainTrigger
- `AuctionExpired(auctionId)`

---

### AuctionClock.sol

Inherits `SomniaEventHandler`. Subscribes to Somnia's `BlockTick` system event at `SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS`. On every block, iterates all active auctions via `getActiveAuctions()` and calls `dropPrice()` on each. Each call is wrapped in `try/catch` — one failing auction cannot halt the clock.

This contract is the self-driving engine of the marketplace. It runs perpetually with zero human involvement from the moment it is deployed.

---

### Escrow.sol

Atomic STT custody between snap and delivery. STT is locked when `DutchAuction.snap()` is called and held until one of two outcomes: `DataProvider` calls `release()` after successful delivery, or the consumer calls `claimRefund()` after the timeout window passes without delivery.

The timeout mechanism is the consumer's protection against non-delivering providers. It requires no admin, no arbitration — just block time.

---

### DataProvider.sol

The Somnia Agent bridge. Implements the two-function async pattern required by the Somnia Agent platform.

**`fulfillOrder(auctionId)`** — called by the provider agent. Verifies the auction is snapped and `msg.sender` is the provider. Computes deposit as `platform.getRequestDeposit() + PER_AGENT_EXECUTION_COST × SUBCOMMITTEE_SIZE`. Calls `platform.createRequest()` with the auction's `apiUrl`, `jsonSelector`, and `decimals` encoded as a `fetchUint` payload.

**`handleResponse(requestId, responses, status, details)`** — called asynchronously by the Somnia Agent platform after validator consensus (10-60 seconds). Decodes the verified price from `abi.decode(responses[0].result, (uint256))`. Calls `escrow.release()` to pay the provider. Emits `DataDelivered` with the verified price on-chain.

**Cost:** `0.12 SOMI` per delivery (0.03 platform reserve + 0.03 × 3 validators)

---

### ServiceRegistry.sol

The always-on service marketplace. Lets providers register a live data service once and fulfill unlimited future requests without relisting.

**Key functions:**
- `registerService(dataType, apiUrl, jsonSelector, decimals, pricePerRequest, timeoutBlocks)` — create a persistent live service
- `requestData(serviceId)` — consumer locks fixed STT payment and creates a pending request
- `fulfillRequest(requestId)` — called by the provider agent, invokes Somnia's JSON API agent
- `handleServiceResponse(agentRequestId, responses, status, details)` — async validator callback, releases payment to provider on success
- `claimRefund(requestId)` — consumer recovers payment if a request times out without fulfillment

This mode is what makes Agora useful for recurring market data such as `ETH/USD`, `BTC/USD`, and other commodity feeds that agents need repeatedly.

---

### ConsumerHandler.sol

Inherits `SomniaEventHandler`. One contract per consumer. Self-subscribes to two event streams in its constructor using `SomniaExtensions.subscribe()`:

1. `PriceTick` from `DutchAuction` — monitors all price movements for the target data type
2. `DataDelivered` from `DataProvider` — listens for its own delivery confirmation

`_onEvent()` routes by emitter address and event topic. On `PriceTick`: validates data type match, checks price threshold and balance, fires `snap()` autonomously if conditions are met, then unsubscribes from further ticks. On `DataDelivered`: validates the delivery is addressed to this contract, emits `DataReceived`, unsubscribes.

The contract self-manages its entire lifecycle — subscribe, act, unsubscribe — with no external coordination.

Deployment requires: `32 SOMI` subscription reserve + STT budget (sent as `msg.value`).

---

## Agents

### Provider Agent (`app/agents` — mode: `provider`)

Persistent Node.js process. Registers an `Agent` identity on AgentKit's on-chain registry with capabilities (`price-data`, `auction-fulfillment`). Runs `OnChainTrigger`s on both `AuctionSnapped` and `ServiceRegistry.DataRequested`. On each qualifying event, computes the exact SOMI deposit from on-chain contract state and calls either `fulfillOrder()` or `fulfillRequest()`. Records execution success/failure and timing to AgentKit's registry for reputation tracking.

**Must run continuously.** Managed process (PM2, Railway, Fly.io) recommended.

### Consumer Agent (`app/agents` — mode: `consumer`)

One-shot process. Reads current auction state from the chain. Calls `Qwen/Qwen3-32B` via Hugging Face with a structured prompt containing auction economics (start price, floor price, current price) and consumer parameters (budget, urgency). The LLM reasons about the optimal snap threshold — balancing cost savings against fill probability. Deploys `ConsumerHandler` on-chain with that threshold. Exits. The contract is then autonomous indefinitely.

---

## API (`app/api`)

Express server bridging the frontend to chain state and contract deployment.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Server status + current block number |
| GET | `/auctions` | All auctions with decoded human-readable fields |
| GET | `/auctions/:id` | Single auction by ID |
| GET | `/services` | All active always-on services |
| GET | `/services/:id` | Single service by ID |
| GET | `/services/:id/requests` | All requests for a service |
| POST | `/provider/auction` | Create auction (validates input, calls `startAuction()`) |
| POST | `/services/register` | Register a persistent data service |
| POST | `/services/:id/request` | Request data from a service at fixed price |
| POST | `/services/:id/pause` | Pause service |
| POST | `/services/:id/resume` | Resume service |
| POST | `/services/requests/:requestId/refund` | Claim refund for timed-out service request |
| POST | `/consumer/plan` | AI threshold recommendation — dry run, no deployment, no cost |
| POST | `/consumer/spawn` | Plan + deploy `ConsumerHandler` in one call |

---

## Getting Started

### Prerequisites

- Node.js 20+, pnpm
- Foundry (`forge`, `cast`)
- Somnia testnet wallet funded with STT

### 1. Clone the repository

```bash
git clone https://github.com/mykelbwan/agora.git
cd agora
```

### 2. Deploy contracts

```bash
cd contracts

# Local (Anvil — mock Reactivity precompile bootstrapped automatically)
make deploy-local-core

# Somnia testnet
RPC_URL=https://dream-rpc.somnia.network \
PRIVATE_KEY=0x... \
make deploy-testnet-core
```

### 3. Start the API

```bash
cd app/api
cp .env.example .env   # fill in PRIVATE_KEY, contract addresses, HUGGINGFACE_API_KEY
pnpm install && pnpm dev
```

### 4. Start the provider agent

```bash
cd app/agents
cp .env.example .env   # fill in PRIVATE_KEY, contract addresses, HUGGINGFACE_API_KEY
pnpm install
pnpm start provider
```

### 5. Start the frontend

```bash
cd app/website
cp .env.local.example .env.local   # fill in contract addresses and API URL
pnpm install && pnpm dev
```

---

## Environment Variables

### `app/agents/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `NETWORK_NAME` | Yes | `testnet` \| `mainnet` \| `custom` |
| `PRIVATE_KEY` | Yes | Agent wallet private key |
| `HUGGINGFACE_API_KEY` | Consumer only | Hugging Face API key for Qwen planner |
| `HUGGINGFACE_MODEL` | No | Default: `Qwen/Qwen3-32B` |
| `DUTCH_AUCTION_ADDRESS` | Yes | Deployed DutchAuction address |
| `DATA_PROVIDER_ADDRESS` | Yes | Deployed DataProvider address |
| `CONSUMER_AUCTION_ID` | Consumer only | Target auction ID |
| `CONSUMER_URGENCY` | Consumer only | `low` \| `medium` \| `high` |
| `CONSUMER_BUDGET_WEI` | No | STT budget in wei. Defaults to current auction price |
| `CONSUMER_SUBSCRIPTION_RESERVE_WEI` | No | Default: `32000000000000000000` (32 SOMI) |

### `app/api/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `RPC_URL` | Yes | Somnia RPC endpoint |
| `PRIVATE_KEY` | Yes | Deployer wallet private key |
| `HUGGINGFACE_API_KEY` | Yes | For consumer planner service |
| `DUTCH_AUCTION_ADDRESS` | Yes | Deployed DutchAuction address |
| `DATA_PROVIDER_ADDRESS` | Yes | Deployed DataProvider address |
| `WEB_URL` | Yes | Frontend URL (for CORS) |

### `app/website/.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API server URL |
| `NEXT_PUBLIC_WS_URL` | Somnia WebSocket RPC (`wss://dream-rpc.somnia.network`) |
| `NEXT_PUBLIC_DUTCH_AUCTION_ADDRESS` | DutchAuction contract address |
| `NEXT_PUBLIC_DATA_PROVIDER_ADDRESS` | DataProvider contract address |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | Escrow contract address |
| `NEXT_PUBLIC_EXPLORER_URL` | Block explorer base URL |

---

## Local Development

The Makefile bootstraps a mock Reactivity precompile at `0x0100` on Anvil using `anvil_setCode`, so `AuctionClock` and `ConsumerHandler` Reactivity subscriptions work identically to testnet locally.

```bash
# Terminal 1
cd contracts && make anvil

# Terminal 2
cd contracts && make deploy-local-core

# Terminal 3
cd app/api && pnpm dev

# Terminal 4
cd app/agents && pnpm start provider

# Terminal 5
cd app/website && pnpm dev
```

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Contracts | Solidity 0.8.30, Foundry, EVM `paris` |
| Reactivity | `@somnia-chain/reactivity-contracts` — `SomniaEventHandler`, `SomniaExtensions` |
| Agent runtime | TypeScript, `somnia-agent-kit`, ethers.js |
| AI planner | Hugging Face Inference API, `Qwen/Qwen3-32B` |
| API | Express, TypeScript, viem |
| Frontend | Next.js 16, wagmi, viem, Zustand, TanStack Query, Tailwind, recharts |
| Chain | Somnia Testnet — Chain ID 50312, RPC `https://dream-rpc.somnia.network` |

---

## Developer Guides

- [Building AI Agents on Agora](./docs/guide-agent-builders.md) — integrate verified on-chain data into your agent or contract
- [Becoming a Data Provider](./docs/guide-providers.md) — list your API and earn STT

---

## Built for Somnia Agentathon Hackathon


Agora demonstrates what Somnia's Agentic L1 uniquely enables: a fully autonomous, trustless agent economy where AI agents commerce in real-world data without human intermediaries. Somnia Agents, Somnia Reactivity, and AgentKit are not optional integrations — they are the protocol.
