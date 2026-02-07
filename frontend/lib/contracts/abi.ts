// ============================================
// PolicyVault ABI
// ============================================

// Shared tuple components for struct encoding
const PolicyTuple = {
  name: 'policy',
  type: 'tuple',
  components: [
    { name: 'dailyLimit', type: 'uint256' },
    { name: 'perTxLimit', type: 'uint256' },
    { name: 'allowedChainsBitmap', type: 'uint256' },
    { name: 'protocolWhitelist', type: 'address[]' },
    { name: 'isActive', type: 'bool' },
    { name: 'createdAt', type: 'uint256' },
  ],
} as const;

const AgentTuple = {
  name: 'agent',
  type: 'tuple',
  components: [
    {
      name: 'policy',
      type: 'tuple',
      components: [
        { name: 'dailyLimit', type: 'uint256' },
        { name: 'perTxLimit', type: 'uint256' },
        { name: 'allowedChainsBitmap', type: 'uint256' },
        { name: 'protocolWhitelist', type: 'address[]' },
        { name: 'isActive', type: 'bool' },
        { name: 'createdAt', type: 'uint256' },
      ],
    },
    { name: 'spentToday', type: 'uint256' },
    { name: 'lastSpendTimestamp', type: 'uint256' },
    { name: 'totalSpent', type: 'uint256' },
    { name: 'sessionCount', type: 'uint256' },
  ],
} as const;

const SessionTuple = {
  name: 'session',
  type: 'tuple',
  components: [
    { name: 'channelId', type: 'bytes32' },
    { name: 'agent', type: 'address' },
    { name: 'allocation', type: 'uint256' },
    { name: 'spent', type: 'uint256' },
    { name: 'isActive', type: 'bool' },
    { name: 'openedAt', type: 'uint256' },
  ],
} as const;

export const PolicyVaultABI = [
  // ============================================
  // Read Functions
  // ============================================

  // Get vault balance (no args — single-owner vault)
  {
    type: 'function',
    name: 'getBalance',
    inputs: [],
    outputs: [
      { name: 'total', type: 'uint256' },
      { name: 'available', type: 'uint256' },
    ],
    stateMutability: 'view',
  },

  // Get agent info — returns Agent struct
  {
    type: 'function',
    name: 'getAgentInfo',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [AgentTuple],
    stateMutability: 'view',
  },

  // Get agent policy — returns Policy struct
  {
    type: 'function',
    name: 'getAgentPolicy',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [PolicyTuple],
    stateMutability: 'view',
  },

  // Get list of authorized agents (no args)
  {
    type: 'function',
    name: 'getAuthorizedAgents',
    inputs: [],
    outputs: [{ name: 'agents', type: 'address[]' }],
    stateMutability: 'view',
  },

  // Check if agent is authorized and active
  {
    type: 'function',
    name: 'isAgentAuthorized',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: 'authorized', type: 'bool' }],
    stateMutability: 'view',
  },

  // Check if agent can spend amount — returns (bool, string)
  {
    type: 'function',
    name: 'canSpend',
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [
      { name: 'allowed', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
    stateMutability: 'view',
  },

  // Get remaining daily limit for agent
  {
    type: 'function',
    name: 'getRemainingDailyLimit',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: 'remaining', type: 'uint256' }],
    stateMutability: 'view',
  },

  // Get session info — returns Session struct
  {
    type: 'function',
    name: 'getSessionInfo',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [SessionTuple],
    stateMutability: 'view',
  },

  // ============================================
  // Write Functions
  // ============================================

  // Deposit USDC into vault
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Withdraw USDC from vault
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Authorize an agent with Policy struct
  {
    type: 'function',
    name: 'authorizeAgent',
    inputs: [
      { name: 'agent', type: 'address' },
      PolicyTuple,
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Revoke agent authorization
  {
    type: 'function',
    name: 'revokeAgent',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Pause agent
  {
    type: 'function',
    name: 'pauseAgent',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Resume paused agent
  {
    type: 'function',
    name: 'resumeAgent',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Spend — agent calls to send USDC
  {
    type: 'function',
    name: 'spend',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Open a state channel session
  {
    type: 'function',
    name: 'openSession',
    inputs: [
      { name: 'channelId', type: 'bytes32' },
      { name: 'allocation', type: 'uint256' },
    ],
    outputs: [{ name: 'sessionId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
  },

  // Close a session and settle
  {
    type: 'function',
    name: 'closeSession',
    inputs: [
      { name: 'sessionId', type: 'bytes32' },
      { name: 'finalSpent', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Update agent policy
  {
    type: 'function',
    name: 'updateAgentPolicy',
    inputs: [
      { name: 'agent', type: 'address' },
      PolicyTuple,
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Emergency pause all
  {
    type: 'function',
    name: 'emergencyPauseAll',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Emergency unpause all
  {
    type: 'function',
    name: 'emergencyUnpauseAll',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Emergency withdraw all available funds
  {
    type: 'function',
    name: 'emergencyWithdrawAll',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // ============================================
  // Events
  // ============================================

  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'AgentAuthorized',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'dailyLimit', type: 'uint256', indexed: false },
      { name: 'perTxLimit', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'AgentRevoked',
    inputs: [{ name: 'agent', type: 'address', indexed: true }],
  },

  {
    type: 'event',
    name: 'AgentPaused',
    inputs: [{ name: 'agent', type: 'address', indexed: true }],
  },

  {
    type: 'event',
    name: 'AgentResumed',
    inputs: [{ name: 'agent', type: 'address', indexed: true }],
  },

  {
    type: 'event',
    name: 'AgentPolicyUpdated',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'newDailyLimit', type: 'uint256', indexed: false },
      { name: 'newPerTxLimit', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'SpendExecuted',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'SpendRejected',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'SessionOpened',
    inputs: [
      { name: 'sessionId', type: 'bytes32', indexed: true },
      { name: 'agent', type: 'address', indexed: true },
      { name: 'allocation', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'SessionClosed',
    inputs: [
      { name: 'sessionId', type: 'bytes32', indexed: true },
      { name: 'finalSpent', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'EmergencyPause',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'EmergencyUnpause',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ============================================
// ERC20 ABI (for USDC)
// ============================================

export const ERC20ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
  },

  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: 'remaining', type: 'uint256' }],
    stateMutability: 'view',
  },

  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
  },

  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: 'decimals', type: 'uint8' }],
    stateMutability: 'view',
  },

  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: 'symbol', type: 'string' }],
    stateMutability: 'view',
  },

  {
    type: 'event',
    name: 'Approval',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;
