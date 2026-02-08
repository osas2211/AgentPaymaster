# AgentPaymaster

**Autonomous AI agent spending control** — on-chain policy vaults, off-chain gasless execution via Yellow Network state channels, and natural language commands powered by Brian AI.

Built on **Arc Testnet** (Chain ID 5042002) | **Yellow Network** Nitrolite SDK | **Brian AI** SDK

---

## Problem

AI agents need to spend crypto autonomously, but:

- **No spending guardrails** — users risk losing everything to a rogue agent
- **$0.50+ gas per transaction** — high-frequency agent strategies become unprofitable
- **No natural language interface** — agents need raw transaction calldata, not human-readable commands

## Solution

AgentPaymaster lets users deposit USDC, set granular spending policies, and authorize AI agents to operate within those limits. Agents interpret natural language commands via Brian AI and execute them gaslessly through Yellow Network state channels.

```
User deposits USDC → Sets policies → Authorizes agent
                                          ↓
                          "Swap 50 USDC for ETH"
                                          ↓
                  Brian AI interprets → PolicyVault validates → Yellow Network executes
                                          ↓
                              Zero gas. Instant. Auditable.
```

---

## How It Works

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Smart Contracts** | Arc Testnet (Solidity/Foundry) | PolicyVault — hold funds, enforce spending rules |
| **State Channels** | Yellow Network (Nitrolite SDK) | Gasless off-chain execution with authenticated WebSocket RPC |
| **AI Interpreter** | Brian AI SDK | Parse natural language into DeFi transactions |
| **Frontend** | Next.js 16 + React 19 | Real-time dashboard, agent terminal, session monitor |

### User Flow

1. **Connect Wallet** — MetaMask or any WalletConnect-compatible wallet on Arc Testnet
2. **Deposit USDC** — Fund the PolicyVault contract
3. **Set Policies** — Daily limits, per-transaction caps, protocol whitelists
4. **Authorize Agents** — Add agent wallet addresses with custom spending rules
5. **Monitor** — Real-time session monitor with live operation streaming

### Agent Execution Flow

1. User types a command: _"Swap 50 USDC for ETH"_
2. **Brian AI** interprets the prompt into transaction parameters
3. **PolicyVault** validates the spend against on-chain rules (daily limit, per-tx cap, whitelisted protocols)
4. **Yellow Network** executes the transfer off-chain through a state channel
5. Operations stream to the session monitor in real-time with gas savings tracked
6. Settle on-chain when done — one transaction covers all off-chain operations

---

## Architecture

```
                         ┌──────────────────────┐
                         │    Agent Terminal     │
                         │  (Natural Language)   │
                         └──────────┬───────────┘
                                    │ "Swap 50 USDC for ETH"
                                    ▼
                         ┌──────────────────────┐
                         │      Brian AI        │
                         │  (Intent Parsing)    │
                         └──────────┬───────────┘
                                    │ { type: swap, amount: 50, ... }
                                    ▼
┌───────────────┐       ┌──────────────────────┐       ┌───────────────────┐
│  PolicyVault  │◄──────│    Agent Runner      │──────▶│  Yellow Network   │
│   (Arc L2)    │       │  (Orchestrator)      │       │  (State Channel)  │
│               │       └──────────────────────┘       │                   │
│ - Daily limit │        validates ↑    ↓ executes     │ - Auth handshake  │
│ - Per-tx cap  │                  │    │              │ - Signed RPC      │
│ - Whitelist   │                  │    ▼              │ - Gasless xfers   │
└───────────────┘       ┌──────────────────────┐       └───────────────────┘
                        │   Session Monitor    │
                        │  (Live Operations)   │
                        └──────────────────────┘
```

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Chain** | Arc Testnet (Chain ID 5042002) |
| **Contracts** | Solidity, Foundry |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Wallet** | wagmi v2, viem, ConnectKit |
| **State Channels** | `@erc7824/nitrolite` v0.5.3 (Yellow Network SDK) |
| **AI** | `@brian-ai/sdk` (Brian AI) |
| **State Management** | Zustand |

---

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/dashboard` | Vault overview, balances, agent management |
| `/setup` | Policy configuration, agent authorization |
| `/agent` | AI agent terminal — natural language command interface |
| `/sessions` | Live session monitor, active state channels, gas savings dashboard |

---

## Yellow Network Integration

Full Nitrolite SDK integration with authenticated WebSocket RPC:

- **Session key generation** — Random ECDSA keypair per connection via `createECDSAMessageSigner`
- **Auth handshake** — `auth_request` → `auth_challenge` → EIP-712 signed `auth_verify` via `createEIP712AuthMessageSigner`
- **Channel operations** — `createCreateChannelMessage`, `createCloseChannelMessage`, `createTransferMessage`
- **Real-time notifications** — Balance updates, channel updates, transfer notifications pushed from ClearNode
- **Keepalive** — `createPingMessageV2` at 30s intervals
- **Reconnect** — Exponential backoff with fresh session key on each reconnect
- **Mock ClearNode** — Full protocol simulation for development/demos (`NEXT_PUBLIC_YELLOW_MOCK=true`)

### Key Files

```
lib/yellow/
├── constants.ts       # WS URL, mock flag, Nitrolite config
├── types.ts           # WebSocketLike interface, client config/handler types
├── signer.ts          # Session key generation + EIP-712 auth signer
├── client.ts          # NitroliteClient — auth flow, channel ops, message routing
└── mock-clearnode.ts  # MockClearNode — implements WebSocketLike for demos
```

## Brian AI Integration

Natural language to DeFi transaction interpretation:

- **Prompt parsing** — User types commands like "Swap 50 USDC for ETH" or "Transfer 25 USDC to 0x..."
- **Transaction extraction** — Brian AI returns structured transaction parameters (to, value, data, chain)
- **Policy validation** — Extracted amounts validated against on-chain PolicyVault rules before execution
- **Mock mode** — `NEXT_PUBLIC_BRIAN_MOCK=true` for development without API key

## Arc Testnet Integration

- **PolicyVault contract** deployed on Arc Testnet — enforces daily limits, per-tx caps, protocol whitelists
- **Native USDC** support with on-chain balance tracking
- **RPC transport** configured to `https://rpc.testnet.arc.network`
- **State channel sessions** opened and settled on Arc Testnet

---

## Quick Start

### Prerequisites

- Node.js 18+
- A wallet (MetaMask, etc.)

### Install & Run

```bash
# Clone
git clone https://github.com/osas2211/AgentPaymaster.git
cd AgentPaymaster/frontend

# Install (--legacy-peer-deps required for React 19 + ConnectKit)
npm install --legacy-peer-deps

# Environment
cp .env.example .env.local
# Edit .env.local with your values

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```bash
# Chain
NEXT_PUBLIC_CHAIN_ID=5042002

# Contracts (Arc Testnet)
NEXT_PUBLIC_POLICY_VAULT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...

# Yellow Network
NEXT_PUBLIC_YELLOW_WS_URL=wss://clearnet.yellow.com/ws
NEXT_PUBLIC_YELLOW_MOCK=false    # Set to 'true' for mock ClearNode

# RPC
NEXT_PUBLIC_ARC_TESTNET_RPC=https://rpc.testnet.arc.network

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# Brian AI
NEXT_PUBLIC_BRIAN_API_KEY=
NEXT_PUBLIC_BRIAN_MOCK=false      # Set to 'true' for mock mode
```

### Demo Mode

For a full demo without external dependencies:

```bash
NEXT_PUBLIC_BRIAN_MOCK=true
NEXT_PUBLIC_YELLOW_MOCK=true
```

This enables the mock Brian AI (simulated transaction parsing) and mock ClearNode (simulated Nitrolite protocol) so the entire flow works locally.

---

## Smart Contracts

Built with Foundry, deployed on Arc Testnet.

```bash
cd contracts

# Build
forge build

# Test
forge test

# Deploy
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.network --private-key <KEY>
```

### PolicyVault

- `deposit(uint256 amount)` — Deposit USDC into the vault
- `withdraw(uint256 amount)` — Withdraw USDC from the vault
- `authorizeAgent(address agent, Policy policy)` — Set spending policy for an agent
- `canSpend(address agent, uint256 amount)` — Check if agent can spend (returns bool + reason)
- `isAgentAuthorized(address agent)` — Check authorization status
- `getRemainingDailyLimit(address agent)` — Get remaining daily budget
- `openSession(bytes32 channelId, uint256 allocation)` — Open a state channel session
- `closeSession(bytes32 sessionId, uint256 finalSpent)` — Settle and close a session

---

## Project Structure

```
AgentPaymaster/
├── contracts/                    # Solidity (Foundry)
│   └── src/
│       └── PolicyVault.sol       # Core vault + policy enforcement
│
└── frontend/                     # Next.js 16 App
    ├── app/
    │   ├── page.tsx              # Landing page
    │   └── (inApp)/
    │       ├── dashboard/        # Vault overview
    │       ├── setup/            # Policy configuration
    │       ├── agent/            # AI agent terminal
    │       └── sessions/         # Live session monitor
    ├── components/
    │   ├── agent/                # AgentTerminal, AgentPromptInput, AgentActionFeed, AgentStats
    │   ├── sessions/             # SessionMonitor, ActiveStateChannels, GasSavingBanner
    │   └── providers/            # YellowProvider, WalletProvider
    ├── lib/
    │   ├── yellow/               # Nitrolite client, signer, mock ClearNode
    │   ├── brian/                # Brian AI client, types, constants
    │   ├── agent/                # AgentRunner orchestrator, PolicyValidator
    │   ├── hooks/                # React hooks (useWallet, useSession, useAgentRunner, etc.)
    │   ├── stores/               # Zustand stores (useSessionStore, useAgentStore)
    │   ├── contracts/            # ABIs, addresses, types
    │   └── config/               # wagmi + chain config
    └── types/                    # Shared TypeScript types
```

---

## Sponsor Integration

| Sponsor | What We Built | How It's Used |
|---------|--------------|---------------|
| **Arc Network** | PolicyVault contract on Arc Testnet, native USDC, full RPC integration | On-chain policy enforcement, session settlement, balance tracking |
| **Yellow Network** | Full Nitrolite SDK integration with auth handshake, state channels, mock ClearNode | Gasless off-chain execution, real-time operation streaming, session management |
| **Brian AI** | Natural language command interpreter | AI agents parse "Swap 50 USDC for ETH" into executable DeFi transactions |

---

## Team

Solo builder — [@osas2211](https://github.com/osas2211)

---

## License

MIT
