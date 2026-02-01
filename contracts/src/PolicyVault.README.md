# PolicyVault

AI Agent spending orchestration vault for the AgentPaymaster system.

## Overview

PolicyVault is a smart contract that enables secure, policy-controlled spending for AI agents. It allows vault owners to deposit USDC and authorize AI agents to spend within configurable limits, providing granular control over agent spending behavior.

**Built for:** HackMoney 2026 | **Target Chain:** Arc (Circle's EVM-compatible L2)

## Features

- **USDC Deposits** - Owner deposits USDC which agents can spend
- **Agent Authorization** - Authorize agents with custom spending policies
- **Spending Limits** - Enforce daily limits (rolling 24-hour window) and per-transaction limits
- **Yellow Network Integration** - Session-based fund allocation for off-chain payment channels
- **Emergency Controls** - Pause all operations and emergency fund recovery
- **ERC-4337 Compatible** - Designed for account abstraction workflows

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       PolicyVault                           │
├─────────────────────────────────────────────────────────────┤
│  Owner Functions          │  Agent Functions                │
│  ─────────────────────    │  ────────────────────           │
│  • deposit()              │  • spend()                      │
│  • withdraw()             │  • openSession()                │
│  • authorizeAgent()       │  • closeSession()               │
│  • revokeAgent()          │                                 │
│  • pauseAgent()           │  View Functions                 │
│  • resumeAgent()          │  ────────────────────           │
│  • updateAgentPolicy()    │  • canSpend()                   │
│  • emergencyPauseAll()    │  • getRemainingDailyLimit()     │
│  • emergencyWithdrawAll() │  • getSessionInfo()             │
└─────────────────────────────────────────────────────────────┘
```

## Data Structures

### Policy

Defines spending constraints for an authorized agent:

| Field | Type | Description |
|-------|------|-------------|
| `dailyLimit` | `uint256` | Maximum spend in rolling 24-hour period |
| `perTxLimit` | `uint256` | Maximum spend per transaction |
| `allowedChainsBitmap` | `uint256` | Bitmap of allowed chain IDs (0 = all allowed) |
| `protocolWhitelist` | `address[]` | Allowed contract addresses (empty = all allowed) |
| `isActive` | `bool` | Whether policy is active (pausable without revoking) |
| `createdAt` | `uint256` | Policy creation timestamp |

### Agent

Tracks agent state and spending history:

| Field | Type | Description |
|-------|------|-------------|
| `policy` | `Policy` | Agent's spending policy |
| `spentToday` | `uint256` | Amount spent in current rolling 24-hour window |
| `lastSpendTimestamp` | `uint256` | Timestamp of last spend |
| `totalSpent` | `uint256` | Lifetime total spent |
| `sessionCount` | `uint256` | Number of Yellow Network sessions opened |

### Session

Yellow Network session state:

| Field | Type | Description |
|-------|------|-------------|
| `channelId` | `bytes32` | Yellow Network channel identifier |
| `agent` | `address` | Agent that opened the session |
| `allocation` | `uint256` | USDC allocated to session |
| `spent` | `uint256` | Amount spent within session |
| `isActive` | `bool` | Whether session is active |
| `openedAt` | `uint256` | Session opening timestamp |

## Usage

### Deployment

```solidity
PolicyVault vault = new PolicyVault(
    0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, // USDC address
    0xYourOwnerAddress                            // Owner address
);
```

### Owner Operations

#### Deposit USDC

```solidity
// First approve the vault
usdc.approve(address(vault), 10000e6);

// Then deposit
vault.deposit(10000e6); // 10,000 USDC
```

#### Authorize an Agent

```solidity
IPolicyVault.Policy memory policy = IPolicyVault.Policy({
    dailyLimit: 1000e6,           // 1,000 USDC per day
    perTxLimit: 100e6,            // 100 USDC per transaction
    allowedChainsBitmap: 0,       // All chains allowed
    protocolWhitelist: new address[](0), // All protocols allowed
    isActive: true,
    createdAt: 0                  // Set automatically
});

vault.authorizeAgent(agentAddress, policy);
```

#### Manage Agent Lifecycle

```solidity
// Temporarily pause an agent
vault.pauseAgent(agentAddress);

// Resume a paused agent
vault.resumeAgent(agentAddress);

// Completely revoke authorization
vault.revokeAgent(agentAddress);

// Update policy limits
vault.updateAgentPolicy(agentAddress, newPolicy);
```

### Agent Operations

#### Direct Spending

```solidity
// Agent calls spend to transfer USDC to recipient
vault.spend(recipientAddress, 50e6); // 50 USDC
```

#### Yellow Network Sessions

```solidity
// Open a session with allocated funds
bytes32 sessionId = vault.openSession(channelId, 500e6); // 500 USDC allocation

// ... off-chain payments via Yellow Network ...

// Close session with final spent amount
vault.closeSession(sessionId, 300e6); // 300 USDC actually spent
// Remaining 200 USDC returned to available balance
```

### View Functions

```solidity
// Check vault balances
(uint256 total, uint256 available) = vault.getBalance();

// Check if agent can spend
(bool allowed, string memory reason) = vault.canSpend(agent, amount);

// Get remaining daily limit
uint256 remaining = vault.getRemainingDailyLimit(agent);

// Get agent info
IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent);

// Get session info
IPolicyVault.Session memory session = vault.getSessionInfo(sessionId);
```

## Spending Limit Mechanics

### Rolling 24-Hour Window

Daily limits use a rolling window rather than fixed calendar days:

- If `lastSpendTimestamp` is 0 or >24 hours ago, `spentToday` resets to 0
- Within 24 hours, spending accumulates against the daily limit
- Enables predictable behavior across timezone boundaries

### Limit Checks

For every spend, the contract verifies:

1. Agent is authorized and active
2. Amount > 0
3. Amount <= `perTxLimit`
4. `effectiveSpentToday + amount` <= `dailyLimit`
5. Amount <= `availableBalance`

## Emergency Functions

### Pause All Operations

```solidity
vault.emergencyPauseAll();  // Stops deposits, withdrawals, spending, new sessions
vault.emergencyUnpauseAll(); // Resumes operations
```

Note: Session closure is still allowed when paused (to recover allocated funds).

### Emergency Withdrawal

```solidity
vault.emergencyWithdrawAll(); // Withdraws all available balance to owner
```

Only withdraws non-session-allocated funds. Close sessions first to recover all funds.

## Events

| Event | Description |
|-------|-------------|
| `Deposited(owner, amount)` | USDC deposited into vault |
| `Withdrawn(owner, amount)` | USDC withdrawn from vault |
| `AgentAuthorized(agent, dailyLimit, perTxLimit)` | New agent authorized |
| `AgentRevoked(agent)` | Agent authorization revoked |
| `AgentPaused(agent)` | Agent temporarily paused |
| `AgentResumed(agent)` | Paused agent resumed |
| `AgentPolicyUpdated(agent, dailyLimit, perTxLimit)` | Policy limits updated |
| `SpendExecuted(agent, recipient, amount)` | Successful spend |
| `SpendRejected(agent, amount, reason)` | Spend rejected with reason |
| `SessionOpened(sessionId, agent, allocation)` | New Yellow Network session |
| `SessionClosed(sessionId, finalSpent)` | Session closed |
| `EmergencyPause(owner, timestamp)` | Emergency pause activated |
| `EmergencyUnpause(owner, timestamp)` | Emergency pause deactivated |

## Security Features

- **Reentrancy Protection** - All state-changing functions use `nonReentrant`
- **CEI Pattern** - Checks-Effects-Interactions pattern for external calls
- **SafeERC20** - Safe token transfer handling
- **Pausable** - Global pause capability for emergencies
- **Ownable** - Owner-only administrative functions
- **Input Validation** - Zero address and zero amount checks

## Dependencies

- OpenZeppelin Contracts v5.x
  - `IERC20` / `SafeERC20`
  - `Ownable`
  - `ReentrancyGuard`
  - `Pausable`

## Testing

Run the test suite:

```bash
forge test --match-contract PolicyVaultTest -vvv
```

Key test scenarios:
- Deposit/withdraw flows
- Agent authorization lifecycle
- Spending limit enforcement (daily + per-tx)
- Rolling 24-hour window behavior
- Session allocation and closure
- Emergency function behavior
- Edge cases (zero amounts, unauthorized calls, double authorization)

## License

MIT
