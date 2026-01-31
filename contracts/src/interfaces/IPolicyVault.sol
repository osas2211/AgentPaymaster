// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPolicyVault
 * @author AgentPaymaster Team - HackMoney 2026
 * @notice Interface for the PolicyVault contract that manages AI agent spending policies
 * @dev This interface defines the core functionality for depositing USDC, authorizing agents,
 *      enforcing spending policies, and managing Yellow Network sessions
 */
interface IPolicyVault {
    // ============ Structs ============

    /**
     * @notice Spending policy configuration for an authorized agent
     * @param dailyLimit Maximum amount the agent can spend in a rolling 24-hour period
     * @param perTxLimit Maximum amount the agent can spend in a single transaction
     * @param allowedChainsBitmap Bitmap of chain IDs the agent can operate on (bit N = chain N allowed)
     * @param protocolWhitelist Array of contract addresses the agent can interact with (empty = all allowed)
     * @param isActive Whether the agent's policy is currently active (can be paused without revoking)
     * @param createdAt Timestamp when the policy was created
     */
    struct Policy {
        uint256 dailyLimit;
        uint256 perTxLimit;
        uint256 allowedChainsBitmap;
        address[] protocolWhitelist;
        bool isActive;
        uint256 createdAt;
    }

    /**
     * @notice Agent state and spending tracking
     * @param policy The agent's current spending policy
     * @param spentToday Amount spent in the current rolling 24-hour window
     * @param lastSpendTimestamp Timestamp of the last spend (used for daily reset calculation)
     * @param totalSpent Lifetime total amount spent by this agent
     * @param sessionCount Number of Yellow Network sessions opened by this agent
     */
    struct Agent {
        Policy policy;
        uint256 spentToday;
        uint256 lastSpendTimestamp;
        uint256 totalSpent;
        uint256 sessionCount;
    }

    /**
     * @notice Yellow Network session state
     * @param channelId Yellow Network channel identifier
     * @param agent Address of the agent that opened this session
     * @param allocation Amount of USDC allocated to this session
     * @param spent Amount spent within this session
     * @param isActive Whether the session is currently active
     * @param openedAt Timestamp when the session was opened
     */
    struct Session {
        bytes32 channelId;
        address agent;
        uint256 allocation;
        uint256 spent;
        bool isActive;
        uint256 openedAt;
    }

    // ============ Events ============

    /// @notice Emitted when the owner deposits USDC into the vault
    event Deposited(address indexed owner, uint256 amount);

    /// @notice Emitted when the owner withdraws USDC from the vault
    event Withdrawn(address indexed owner, uint256 amount);

    /// @notice Emitted when a new agent is authorized with a spending policy
    event AgentAuthorized(address indexed agent, uint256 dailyLimit, uint256 perTxLimit);

    /// @notice Emitted when an agent's authorization is revoked
    event AgentRevoked(address indexed agent);

    /// @notice Emitted when an agent is paused
    event AgentPaused(address indexed agent);

    /// @notice Emitted when a paused agent is resumed
    event AgentResumed(address indexed agent);

    /// @notice Emitted when an agent's policy is updated
    event AgentPolicyUpdated(address indexed agent, uint256 newDailyLimit, uint256 newPerTxLimit);

    /// @notice Emitted when a spend is successfully executed
    event SpendExecuted(address indexed agent, address indexed recipient, uint256 amount);

    /// @notice Emitted when a spend is rejected due to policy violation
    event SpendRejected(address indexed agent, uint256 amount, string reason);

    /// @notice Emitted when a Yellow Network session is opened
    event SessionOpened(bytes32 indexed sessionId, address indexed agent, uint256 allocation);

    /// @notice Emitted when a Yellow Network session is closed
    event SessionClosed(bytes32 indexed sessionId, uint256 finalSpent);

    /// @notice Emitted when emergency pause is activated
    event EmergencyPause(address indexed owner, uint256 timestamp);

    /// @notice Emitted when emergency pause is deactivated
    event EmergencyUnpause(address indexed owner, uint256 timestamp);

    // ============ Errors ============

    /// @notice Thrown when caller is not an authorized agent
    error UnauthorizedAgent();

    /// @notice Thrown when agent is already authorized
    error AgentAlreadyAuthorized();

    /// @notice Thrown when agent is not authorized
    error AgentNotAuthorized();

    /// @notice Thrown when agent is paused
    error AgentIsPaused();

    /// @notice Thrown when agent is not paused
    error AgentNotPaused();

    /// @notice Thrown when spending would exceed daily limit
    error DailyLimitExceeded();

    /// @notice Thrown when spending would exceed per-transaction limit
    error PerTxLimitExceeded();

    /// @notice Thrown when there's insufficient balance in the vault
    error InsufficientBalance();

    /// @notice Thrown when there's insufficient available balance (not allocated to sessions)
    error InsufficientAvailableBalance();

    /// @notice Thrown when a zero amount is provided
    error ZeroAmount();

    /// @notice Thrown when a zero address is provided
    error ZeroAddress();

    /// @notice Thrown when session is not active
    error SessionNotActive();

    /// @notice Thrown when session is already closed
    error SessionAlreadyClosed();

    /// @notice Thrown when session does not exist
    error SessionNotFound();

    /// @notice Thrown when caller is not authorized to close session
    error UnauthorizedSessionClose();

    /// @notice Thrown when final spent exceeds session allocation
    error SessionOverspent();

    /// @notice Thrown when policy limits are invalid
    error InvalidPolicyLimits();

    // ============ Deposit & Withdraw Functions ============

    /**
     * @notice Deposit USDC into the vault
     * @param amount Amount of USDC to deposit (in USDC decimals, typically 6)
     */
    function deposit(uint256 amount) external;

    /**
     * @notice Withdraw USDC from the vault
     * @param amount Amount of USDC to withdraw
     */
    function withdraw(uint256 amount) external;

    /**
     * @notice Get the vault's balance information
     * @return total Total USDC deposited in the vault
     * @return available USDC available for spending (not allocated to sessions)
     */
    function getBalance() external view returns (uint256 total, uint256 available);

    // ============ Agent Management Functions ============

    /**
     * @notice Authorize a new agent with a spending policy
     * @param agent Address of the agent to authorize
     * @param policy Spending policy for the agent
     */
    function authorizeAgent(address agent, Policy calldata policy) external;

    /**
     * @notice Revoke an agent's authorization completely
     * @param agent Address of the agent to revoke
     */
    function revokeAgent(address agent) external;

    /**
     * @notice Temporarily pause an agent's spending ability
     * @param agent Address of the agent to pause
     */
    function pauseAgent(address agent) external;

    /**
     * @notice Resume a paused agent's spending ability
     * @param agent Address of the agent to resume
     */
    function resumeAgent(address agent) external;

    /**
     * @notice Update an agent's spending policy
     * @param agent Address of the agent to update
     * @param newPolicy New spending policy for the agent
     */
    function updateAgentPolicy(address agent, Policy calldata newPolicy) external;

    /**
     * @notice Get an agent's current policy
     * @param agent Address of the agent
     * @return The agent's spending policy
     */
    function getAgentPolicy(address agent) external view returns (Policy memory);

    /**
     * @notice Get full agent info including spending state
     * @param agent Address of the agent
     * @return The agent's full state
     */
    function getAgentInfo(address agent) external view returns (Agent memory);

    /**
     * @notice Check if an agent is authorized and active
     * @param agent Address of the agent
     * @return Whether the agent is authorized and active
     */
    function isAgentAuthorized(address agent) external view returns (bool);

    /**
     * @notice Get list of all authorized agents
     * @return Array of authorized agent addresses
     */
    function getAuthorizedAgents() external view returns (address[] memory);

    // ============ Spending Functions ============

    /**
     * @notice Execute a spend on behalf of the calling agent
     * @param recipient Address to receive the USDC
     * @param amount Amount of USDC to send
     */
    function spend(address recipient, uint256 amount) external;

    /**
     * @notice Check if an agent can spend a specific amount
     * @param agent Address of the agent
     * @param amount Amount to check
     * @return canSpend Whether the spend would be allowed
     * @return reason If canSpend is false, the reason why
     */
    function canSpend(address agent, uint256 amount) external view returns (bool canSpend, string memory reason);

    /**
     * @notice Get an agent's remaining daily limit
     * @param agent Address of the agent
     * @return Remaining amount the agent can spend today
     */
    function getRemainingDailyLimit(address agent) external view returns (uint256);

    // ============ Yellow Network Session Functions ============

    /**
     * @notice Open a new Yellow Network session with allocated funds
     * @param channelId Yellow Network channel identifier
     * @param allocation Amount of USDC to allocate to the session
     * @return sessionId Unique identifier for the session
     */
    function openSession(bytes32 channelId, uint256 allocation) external returns (bytes32 sessionId);

    /**
     * @notice Close a Yellow Network session and reconcile funds
     * @param sessionId Session identifier to close
     * @param finalSpent Final amount spent in the session
     */
    function closeSession(bytes32 sessionId, uint256 finalSpent) external;

    /**
     * @notice Get session information
     * @param sessionId Session identifier
     * @return Session struct with all session data
     */
    function getSessionInfo(bytes32 sessionId) external view returns (Session memory);

    // ============ Emergency Functions ============

    /**
     * @notice Emergency pause all spending operations
     */
    function emergencyPauseAll() external;

    /**
     * @notice Resume operations after emergency pause
     */
    function emergencyUnpauseAll() external;

    /**
     * @notice Emergency withdraw all available funds to owner
     */
    function emergencyWithdrawAll() external;
}
