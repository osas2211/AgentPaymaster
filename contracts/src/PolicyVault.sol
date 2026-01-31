// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {IPolicyVault} from "./interfaces/IPolicyVault.sol";
import {PolicyLib} from "./libraries/PolicyLib.sol";

/**
 * @title PolicyVault
 * @author AgentPaymaster Team - HackMoney 2026
 * @notice AI Agent spending orchestration vault for the AgentPaymaster system
 * @dev Manages USDC deposits, agent authorization with spending policies, and Yellow Network sessions.
 *      Designed for deployment on Arc (Circle's EVM-compatible L2) and compatible with Circle's
 *      Programmable Wallets and ERC-4337 account abstraction.
 *
 * Key Features:
 * - Owner deposits USDC and sets spending policies for AI agents
 * - Agents can spend within configured limits (daily + per-transaction)
 * - Rolling 24-hour window for daily limit enforcement
 * - Yellow Network session integration for off-chain payment channels
 * - Emergency controls for pause and recovery
 *
 * Testing Considerations:
 * - Deposit/withdraw flows with various amounts
 * - Agent authorization lifecycle (authorize, pause, resume, revoke)
 * - Spending limit enforcement (daily rolling window, per-tx limits)
 * - Session allocation, spending tracking, and closure
 * - Emergency functions (pause all, withdraw all)
 * - Edge cases: zero amounts, unauthorized calls, double authorization
 * - Reentrancy protection on all external calls
 * - Gas optimization verification
 */
contract PolicyVault is IPolicyVault, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using PolicyLib for IPolicyVault.Policy;

    // ============ Constants ============

    /// @notice USDC token contract
    IERC20 public immutable usdcToken;

    // ============ State Variables ============

    /// @notice Total USDC deposited in the vault
    uint256 public totalDeposited;

    /// @notice Available balance not allocated to active sessions
    uint256 public availableBalance;

    /// @notice Mapping of agent address to their state
    mapping(address => Agent) private _agents;

    /// @notice Mapping of session ID to session state
    mapping(bytes32 => Session) private _sessions;

    /// @notice Array of authorized agent addresses for enumeration
    address[] private _authorizedAgents;

    /// @notice Mapping to track agent index in _authorizedAgents array (1-indexed, 0 = not present)
    mapping(address => uint256) private _agentIndex;

    // ============ Modifiers ============

    /**
     * @notice Ensures caller is an authorized and active agent
     */
    modifier onlyAuthorizedAgent() {
        if (!_isAgentAuthorizedAndActive(msg.sender)) {
            revert UnauthorizedAgent();
        }
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize the PolicyVault with USDC token address
     * @param _usdcToken Address of the USDC token contract
     * @param _owner Address of the vault owner
     */
    constructor(address _usdcToken, address _owner) Ownable(_owner) {
        if (_usdcToken == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        usdcToken = IERC20(_usdcToken);
    }

    // ============ Deposit & Withdraw Functions ============

    /**
     * @inheritdoc IPolicyVault
     * @dev Transfers USDC from owner to vault. Requires prior approval.
     */
    function deposit(uint256 amount) external onlyOwner nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        // Transfer USDC from owner to vault
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update balances
        totalDeposited += amount;
        availableBalance += amount;

        emit Deposited(msg.sender, amount);
    }

    /**
     * @inheritdoc IPolicyVault
     * @dev Only withdraws from available balance (not allocated to sessions)
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (amount > availableBalance) revert InsufficientAvailableBalance();

        // Update balances before transfer (CEI pattern)
        availableBalance -= amount;
        totalDeposited -= amount;

        // Transfer USDC to owner
        usdcToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @inheritdoc IPolicyVault
     */
    function getBalance() external view returns (uint256 total, uint256 available) {
        return (totalDeposited, availableBalance);
    }

    // ============ Agent Management Functions ============

    /**
     * @inheritdoc IPolicyVault
     * @dev Creates a new agent entry with the provided policy
     */
    function authorizeAgent(address agent, Policy calldata policy) external onlyOwner whenNotPaused {
        if (agent == address(0)) revert ZeroAddress();
        if (_agentIndex[agent] != 0) revert AgentAlreadyAuthorized();

        // Validate policy
        (bool isValid,) = PolicyLib.validatePolicy(policy);
        if (!isValid) revert InvalidPolicyLimits();

        // Create agent with policy
        _agents[agent] = Agent({
            policy: Policy({
                dailyLimit: policy.dailyLimit,
                perTxLimit: policy.perTxLimit,
                allowedChainsBitmap: policy.allowedChainsBitmap,
                protocolWhitelist: policy.protocolWhitelist,
                isActive: true, // Always start as active
                createdAt: block.timestamp
            }),
            spentToday: 0,
            lastSpendTimestamp: 0,
            totalSpent: 0,
            sessionCount: 0
        });

        // Add to authorized agents list
        _authorizedAgents.push(agent);
        _agentIndex[agent] = _authorizedAgents.length; // 1-indexed

        emit AgentAuthorized(agent, policy.dailyLimit, policy.perTxLimit);
    }

    /**
     * @inheritdoc IPolicyVault
     * @dev Completely removes agent authorization
     */
    function revokeAgent(address agent) external onlyOwner {
        if (_agentIndex[agent] == 0) revert AgentNotAuthorized();

        // Remove from authorized agents array (swap and pop)
        uint256 indexToRemove = _agentIndex[agent] - 1; // Convert to 0-indexed
        uint256 lastIndex = _authorizedAgents.length - 1;

        if (indexToRemove != lastIndex) {
            address lastAgent = _authorizedAgents[lastIndex];
            _authorizedAgents[indexToRemove] = lastAgent;
            _agentIndex[lastAgent] = indexToRemove + 1; // Keep 1-indexed
        }

        _authorizedAgents.pop();
        delete _agentIndex[agent];
        delete _agents[agent];

        emit AgentRevoked(agent);
    }

    /**
     * @inheritdoc IPolicyVault
     * @dev Sets agent's policy.isActive to false
     */
    function pauseAgent(address agent) external onlyOwner {
        if (_agentIndex[agent] == 0) revert AgentNotAuthorized();
        if (!_agents[agent].policy.isActive) revert AgentIsPaused();

        _agents[agent].policy.isActive = false;

        emit AgentPaused(agent);
    }

    /**
     * @inheritdoc IPolicyVault
     * @dev Sets agent's policy.isActive to true
     */
    function resumeAgent(address agent) external onlyOwner {
        if (_agentIndex[agent] == 0) revert AgentNotAuthorized();
        if (_agents[agent].policy.isActive) revert AgentNotPaused();

        _agents[agent].policy.isActive = true;

        emit AgentResumed(agent);
    }

    /**
     * @inheritdoc IPolicyVault
     * @dev Updates policy while preserving spending history
     */
    function updateAgentPolicy(address agent, Policy calldata newPolicy) external onlyOwner {
        if (_agentIndex[agent] == 0) revert AgentNotAuthorized();

        // Validate new policy
        (bool isValid,) = PolicyLib.validatePolicy(newPolicy);
        if (!isValid) revert InvalidPolicyLimits();

        // Update policy, preserving createdAt
        uint256 originalCreatedAt = _agents[agent].policy.createdAt;
        _agents[agent].policy = Policy({
            dailyLimit: newPolicy.dailyLimit,
            perTxLimit: newPolicy.perTxLimit,
            allowedChainsBitmap: newPolicy.allowedChainsBitmap,
            protocolWhitelist: newPolicy.protocolWhitelist,
            isActive: newPolicy.isActive,
            createdAt: originalCreatedAt
        });

        emit AgentPolicyUpdated(agent, newPolicy.dailyLimit, newPolicy.perTxLimit);
    }

    /**
     * @inheritdoc IPolicyVault
     */
    function getAgentPolicy(address agent) external view returns (Policy memory) {
        return _agents[agent].policy;
    }

    /**
     * @inheritdoc IPolicyVault
     */
    function getAgentInfo(address agent) external view returns (Agent memory) {
        return _agents[agent];
    }

    /**
     * @inheritdoc IPolicyVault
     * @dev Returns true only if agent is authorized AND policy is active
     */
    function isAgentAuthorized(address agent) external view returns (bool) {
        return _isAgentAuthorizedAndActive(agent);
    }

    /**
     * @inheritdoc IPolicyVault
     */
    function getAuthorizedAgents() external view returns (address[] memory) {
        return _authorizedAgents;
    }

    // ============ Spending Functions ============

    /**
     * @inheritdoc IPolicyVault
     * @dev Executes USDC transfer to recipient if all policy checks pass
     */
    function spend(address recipient, uint256 amount)
        external
        onlyAuthorizedAgent
        nonReentrant
        whenNotPaused
    {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        Agent storage agent = _agents[msg.sender];

        // Check spending allowed
        (bool allowed, string memory reason) = PolicyLib.checkSpendAllowed(
            agent.policy, agent.spentToday, agent.lastSpendTimestamp, availableBalance, amount
        );

        if (!allowed) {
            emit SpendRejected(msg.sender, amount, reason);
            revert(reason);
        }

        // Calculate effective daily spent for rolling window
        uint256 effectiveSpent =
            PolicyLib.calculateEffectiveDailySpent(agent.spentToday, agent.lastSpendTimestamp, block.timestamp);

        // Update agent spending state
        if (agent.lastSpendTimestamp == 0 || block.timestamp >= agent.lastSpendTimestamp + PolicyLib.ONE_DAY) {
            // Reset daily spent if new window
            agent.spentToday = amount;
        } else {
            agent.spentToday = effectiveSpent + amount;
        }
        agent.lastSpendTimestamp = block.timestamp;
        agent.totalSpent += amount;

        // Update vault balance
        availableBalance -= amount;
        totalDeposited -= amount;

        // Transfer USDC to recipient
        usdcToken.safeTransfer(recipient, amount);

        emit SpendExecuted(msg.sender, recipient, amount);
    }

    /**
     * @inheritdoc IPolicyVault
     */
    function canSpend(address agent, uint256 amount) external view returns (bool, string memory reason) {
        // Check if agent exists and is authorized
        if (_agentIndex[agent] == 0) {
            return (false, "Agent not authorized");
        }

        Agent storage agentData = _agents[agent];

        return PolicyLib.checkSpendAllowed(
            agentData.policy, agentData.spentToday, agentData.lastSpendTimestamp, availableBalance, amount
        );
    }

    /**
     * @inheritdoc IPolicyVault
     */
    function getRemainingDailyLimit(address agent) external view returns (uint256) {
        if (_agentIndex[agent] == 0) {
            return 0;
        }

        Agent storage agentData = _agents[agent];
        return PolicyLib.calculateRemainingDailyLimit(
            agentData.policy.dailyLimit, agentData.spentToday, agentData.lastSpendTimestamp
        );
    }

    // ============ Yellow Network Session Functions ============

    /**
     * @inheritdoc IPolicyVault
     * @dev Allocates funds from available balance to a new session
     */
    function openSession(bytes32 channelId, uint256 allocation)
        external
        onlyAuthorizedAgent
        nonReentrant
        whenNotPaused
        returns (bytes32 sessionId)
    {
        if (allocation == 0) revert ZeroAmount();
        if (allocation > availableBalance) revert InsufficientAvailableBalance();

        Agent storage agent = _agents[msg.sender];

        // Check allocation against agent's remaining daily limit
        uint256 remainingLimit = PolicyLib.calculateRemainingDailyLimit(
            agent.policy.dailyLimit, agent.spentToday, agent.lastSpendTimestamp
        );
        if (allocation > remainingLimit) {
            revert DailyLimitExceeded();
        }

        // Check per-tx limit (session allocation treated as single tx for limit purposes)
        if (allocation > agent.policy.perTxLimit) {
            revert PerTxLimitExceeded();
        }

        // Generate unique session ID
        sessionId = PolicyLib.generateSessionId(channelId, msg.sender, block.timestamp, agent.sessionCount);

        // Create session
        _sessions[sessionId] = Session({
            channelId: channelId,
            agent: msg.sender,
            allocation: allocation,
            spent: 0,
            isActive: true,
            openedAt: block.timestamp
        });

        // Update agent state
        agent.sessionCount++;

        // Reserve funds from available balance
        availableBalance -= allocation;

        emit SessionOpened(sessionId, msg.sender, allocation);

        return sessionId;
    }

    /**
     * @inheritdoc IPolicyVault
     * @dev Closes session and reconciles: returns unspent funds, updates agent's daily spent
     */
    function closeSession(bytes32 sessionId, uint256 finalSpent) external nonReentrant {
        Session storage session = _sessions[sessionId];

        if (session.openedAt == 0) revert SessionNotFound();
        if (!session.isActive) revert SessionAlreadyClosed();

        // Only session agent or vault owner can close
        if (msg.sender != session.agent && msg.sender != owner()) {
            revert UnauthorizedSessionClose();
        }

        // Final spent cannot exceed allocation
        if (finalSpent > session.allocation) revert SessionOverspent();

        // Update session state
        session.spent = finalSpent;
        session.isActive = false;

        // Return unspent funds to available balance
        uint256 unspent = session.allocation - finalSpent;
        availableBalance += unspent;

        // Update agent's daily spent and total spent
        Agent storage agent = _agents[session.agent];

        // Calculate effective daily spent for rolling window
        uint256 effectiveSpent =
            PolicyLib.calculateEffectiveDailySpent(agent.spentToday, agent.lastSpendTimestamp, block.timestamp);

        if (agent.lastSpendTimestamp == 0 || block.timestamp >= agent.lastSpendTimestamp + PolicyLib.ONE_DAY) {
            agent.spentToday = finalSpent;
        } else {
            agent.spentToday = effectiveSpent + finalSpent;
        }
        agent.lastSpendTimestamp = block.timestamp;
        agent.totalSpent += finalSpent;

        // Reduce total deposited by actual spent amount
        totalDeposited -= finalSpent;

        emit SessionClosed(sessionId, finalSpent);
    }

    /**
     * @inheritdoc IPolicyVault
     */
    function getSessionInfo(bytes32 sessionId) external view returns (Session memory) {
        return _sessions[sessionId];
    }

    // ============ Emergency Functions ============

    /**
     * @inheritdoc IPolicyVault
     * @dev Pauses all spending operations. Sessions can still be closed.
     */
    function emergencyPauseAll() external onlyOwner {
        _pause();
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    /**
     * @inheritdoc IPolicyVault
     */
    function emergencyUnpauseAll() external onlyOwner {
        _unpause();
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }

    /**
     * @inheritdoc IPolicyVault
     * @dev Withdraws all available (non-session-allocated) funds to owner
     */
    function emergencyWithdrawAll() external onlyOwner nonReentrant {
        uint256 amount = availableBalance;
        if (amount == 0) revert ZeroAmount();

        // Update balances before transfer
        availableBalance = 0;
        totalDeposited -= amount;

        // Transfer all available USDC to owner
        usdcToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    // ============ Internal Functions ============

    /**
     * @notice Check if an agent is authorized and has an active policy
     * @param agent Address to check
     * @return Whether the agent is authorized and active
     */
    function _isAgentAuthorizedAndActive(address agent) internal view returns (bool) {
        return _agentIndex[agent] != 0 && _agents[agent].policy.isActive;
    }

    // ============ ERC-4337 Compatibility ============

    /**
     * @notice Allows the contract to receive ETH for gas sponsorship scenarios
     * @dev Useful for ERC-4337 bundler refunds or gas sponsorship on Arc
     */
    receive() external payable {}

    /**
     * @notice Withdraw any ETH sent to the contract
     * @param to Recipient address
     * @param amount Amount of ETH to withdraw
     */
    function withdrawETH(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount > address(this).balance) revert InsufficientBalance();

        (bool success,) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
    }
}
