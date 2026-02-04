# AgentPaymaster

**Spending orchestration for AI agents** — Policy vaults + gasless execution + cross-chain routing.

Built for [HackMoney 2026](https://ethglobal.com/events/hackmoney2026) using Arc, Yellow Network, and LI.FI.

---

## Problem

AI agents need to spend money autonomously, but:

- No way to set spending limits → users risk losing everything
- $0.50+ gas per transaction → high-frequency strategies unprofitable
- Single-chain only → fragmented liquidity access

## Solution

AgentPaymaster lets users deposit USDC, set spending policies, and authorize AI agents to operate within those limits — with 99.9% gas savings via state channels.

```
User deposits USDC → Sets policies → Authorizes agent → Agent executes gaslessly
```

---

## How It Works

| Layer           | Technology      | Purpose                      |
| --------------- | --------------- | ---------------------------- |
| **Vault**       | Arc (Circle L2) | Hold funds, enforce policies |
| **Sessions**    | Yellow Network  | Gasless off-chain execution  |
| **Cross-chain** | LI.FI           | Bridge & swap across chains  |

### User Flow

1. **Create Vault** — Deploy PolicyVault, deposit USDC
2. **Set Policies** — Daily limits, per-tx caps, protocol whitelist
3. **Authorize Agents** — Add agent wallet addresses with custom rules
4. **Monitor** — Real-time dashboard showing all agent activity

### Agent Flow

1. Open Yellow Network session (funds allocated from vault)
2. Execute unlimited off-chain operations (validated against policy)
3. Settle once on-chain when done

---

## Tech Stack

- **Contracts**: Solidity, Foundry, Arc testnet
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind
- **Wallet**: wagmi v2, viem, ConnectKit
- **State Channels**: @erc7824/nitrolite (Yellow SDK)
- **Cross-chain**: @lifi/sdk

---

## Quick Start

```bash
# Clone
git clone https://github.com/your-org/agentpaymaster.git
cd agentpaymaster

# Install
pnpm install

# Environment
cp .env.example .env.local
# Fill in contract addresses and API keys

# Run
pnpm dev
```

### Environment Variables

```bash
NEXT_PUBLIC_POLICY_VAULT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_YELLOW_CLEARNODE_URL=wss://testnet.clearnet.yellow.com/ws
NEXT_PUBLIC_LIFI_INTEGRATOR=agentpaymaster
```

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│ PolicyVault │     │   Yellow    │
│  (Next.js)  │     │   (Arc)     │────▶│  ClearNode  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       └──────────────┬────────────────────────┘
                      ▼
               ┌─────────────┐
               │   LI.FI     │
               │  (Bridge)   │
               └─────────────┘
```

---

## Key Features

- **Policy Enforcement** — On-chain rules agents can't bypass
- **Gasless Operations** — 100+ transactions for the cost of one
- **Real-time Monitoring** — Live streaming of all agent activity
- **Instant Controls** — Pause or revoke agents immediately
- **Cross-chain** — Agents operate across multiple networks

---

## Sponsor Integration

| Sponsor    | Integration                        | Prize Track      |
| ---------- | ---------------------------------- | ---------------- |
| Arc/Circle | PolicyVault contract, native USDC  | Agentic Commerce |
| Yellow     | State channels, session management | SDK Integration  |
| LI.FI      | Cross-chain routing, bridge UI     | AI Smart App     |

---

## Project Structure

```
├── app/                 # Next.js pages
├── components/          # React components
├── contracts/           # Solidity (Foundry)
├── lib/
│   ├── hooks/          # React hooks
│   ├── yellow/         # Yellow SDK wrapper
│   └── contracts/      # ABIs, addresses
└── public/
```

---

## Demo

[📺 Watch Demo Video](#) _(coming soon)_

**What you'll see:**

1. Create vault and deposit 1,000 USDC
2. Authorize trading bot with $100/day limit
3. Bot executes 10 rapid transactions via Yellow
4. All 10 settle in ONE on-chain transaction
5. Gas savings: $4.50 → $0.12

---

## Links

- **Docs**: [Frontend Developer Guide](./FRONTEND-DEVELOPER-GUIDE.md)
- **PRD**: [Product Requirements](./AgentPaymaster-PRD.docx)
- **Arc**: [docs.arc.network](https://docs.arc.network)
- **Yellow**: [docs.yellow.org](https://docs.yellow.org)
- **LI.FI**: [docs.li.fi](https://docs.li.fi)

---

## Team

Solo builder — [@yourhandle](https://twitter.com/yourhandle)

Previous: 4th place Scaffold Stellar Hackathon (Sampled), Mezo Pesa, StoryScope

---

## License

MIT
