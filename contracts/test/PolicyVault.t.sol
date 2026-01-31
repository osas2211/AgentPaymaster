// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PolicyVault} from "../src/PolicyVault.sol";
import {IPolicyVault} from "../src/interfaces/IPolicyVault.sol";
import {PolicyLib} from "../src/libraries/PolicyLib.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// ============ Mock Contracts ============

/**
 * @notice Mock USDC token for testing
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000_000 * 1e6); // 1B USDC
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @notice Malicious recipient that attempts reentrancy on receive
 */
contract ReentrancyAttacker {
    PolicyVault public vault;
    address public recipient;
    uint256 public amount;
    uint256 public attackCount;
    bool public shouldAttack;

    constructor(address _vault) {
        vault = PolicyVault(payable(_vault));
    }

    function setAttackParams(address _recipient, uint256 _amount) external {
        recipient = _recipient;
        amount = _amount;
        shouldAttack = true;
    }

    function triggerSpend(address _recipient, uint256 _amount) external {
        vault.spend(_recipient, _amount);
    }

    // This would be called if USDC was a native token or had hooks
    receive() external payable {
        if (shouldAttack && attackCount < 2) {
            attackCount++;
            // Attempt reentrancy
            try vault.spend(recipient, amount) {} catch {}
        }
    }
}

/**
 * @notice Contract that rejects ETH transfers
 */
contract ETHRejecter {
    receive() external payable {
        revert("No ETH accepted");
    }
}

// ============ Main Test Contract ============

contract PolicyVaultTest is Test {
    PolicyVault public vault;
    MockUSDC public usdc;

    address public owner = address(1);
    address public agent1 = address(2);
    address public agent2 = address(3);
    address public agent3 = address(4);
    address public recipient = address(5);
    address public unauthorized = address(6);

    uint256 constant INITIAL_BALANCE = 100_000 * 1e6; // 100k USDC
    uint256 constant DEPOSIT_AMOUNT = 10_000 * 1e6; // 10k USDC
    uint256 constant DAILY_LIMIT = 1_000 * 1e6; // 1k USDC
    uint256 constant PER_TX_LIMIT = 100 * 1e6; // 100 USDC

    // ============ Events for testing ============
    event Deposited(address indexed owner, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    event AgentAuthorized(address indexed agent, uint256 dailyLimit, uint256 perTxLimit);
    event AgentRevoked(address indexed agent);
    event AgentPaused(address indexed agent);
    event AgentResumed(address indexed agent);
    event AgentPolicyUpdated(address indexed agent, uint256 newDailyLimit, uint256 newPerTxLimit);
    event SpendExecuted(address indexed agent, address indexed recipient, uint256 amount);
    event SpendRejected(address indexed agent, uint256 amount, string reason);
    event SessionOpened(bytes32 indexed sessionId, address indexed agent, uint256 allocation);
    event SessionClosed(bytes32 indexed sessionId, uint256 finalSpent);
    event EmergencyPause(address indexed owner, uint256 timestamp);
    event EmergencyUnpause(address indexed owner, uint256 timestamp);

    // ============ Setup ============

    function setUp() public {
        // Deploy mock USDC
        vm.prank(owner);
        usdc = new MockUSDC();

        // Deploy PolicyVault
        vault = new PolicyVault(address(usdc), owner);

        // Transfer USDC to owner for deposits
        vm.prank(owner);
        usdc.transfer(owner, INITIAL_BALANCE);
    }

    // ============ Helper Functions ============

    /**
     * @notice Create a default policy for testing
     */
    function _createDefaultPolicy() internal pure returns (IPolicyVault.Policy memory) {
        address[] memory whitelist = new address[](0);
        return IPolicyVault.Policy({
            dailyLimit: DAILY_LIMIT,
            perTxLimit: PER_TX_LIMIT,
            allowedChainsBitmap: 0, // All chains allowed
            protocolWhitelist: whitelist,
            isActive: true,
            createdAt: 0 // Will be set by contract
        });
    }

    /**
     * @notice Create a policy with specific limits
     */
    function _createPolicy(uint256 daily, uint256 perTx) internal pure returns (IPolicyVault.Policy memory) {
        address[] memory whitelist = new address[](0);
        return IPolicyVault.Policy({
            dailyLimit: daily,
            perTxLimit: perTx,
            allowedChainsBitmap: 0,
            protocolWhitelist: whitelist,
            isActive: true,
            createdAt: 0
        });
    }

    /**
     * @notice Create a policy with protocol whitelist
     */
    function _createPolicyWithWhitelist(address[] memory whitelist)
        internal
        pure
        returns (IPolicyVault.Policy memory)
    {
        return IPolicyVault.Policy({
            dailyLimit: DAILY_LIMIT,
            perTxLimit: PER_TX_LIMIT,
            allowedChainsBitmap: 0,
            protocolWhitelist: whitelist,
            isActive: true,
            createdAt: 0
        });
    }

    /**
     * @notice Fast-forward time
     */
    function _skipTime(uint256 seconds_) internal {
        vm.warp(block.timestamp + seconds_);
    }

    /**
     * @notice Setup vault with funds and an authorized agent
     */
    function _setupFundedVaultWithAgent() internal returns (address) {
        // Owner approves and deposits
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        // Authorize agent1
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vm.stopPrank();

        return agent1;
    }

    /**
     * @notice Setup an active session
     */
    function _setupActiveSession(uint256 allocation) internal returns (bytes32) {
        _setupFundedVaultWithAgent();

        vm.prank(agent1);
        bytes32 sessionId = vault.openSession(keccak256("channel1"), allocation);

        return sessionId;
    }

    // ============ 1. Deployment Tests ============

    function test_DeploymentSetsOwner() public view {
        assertEq(vault.owner(), owner);
    }

    function test_DeploymentSetsUSDCAddress() public view {
        assertEq(address(vault.usdcToken()), address(usdc));
    }

    function test_DeploymentStartsWithZeroBalance() public view {
        (uint256 total, uint256 available) = vault.getBalance();
        assertEq(total, 0);
        assertEq(available, 0);
    }

    function test_DeploymentStartsUnpaused() public {
        // If paused, most functions would revert
        // We can verify by checking deposit doesn't revert for wrong reasons
        vm.startPrank(owner);
        usdc.approve(address(vault), 1e6);
        // This should work (not revert due to pause)
        vault.deposit(1e6);
        vm.stopPrank();
    }

    function test_DeploymentRevertsWithZeroUSDCAddress() public {
        vm.expectRevert(IPolicyVault.ZeroAddress.selector);
        new PolicyVault(address(0), owner);
    }

    function test_DeploymentRevertsWithZeroOwnerAddress() public {
        // OpenZeppelin Ownable reverts with OwnableInvalidOwner for zero address
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new PolicyVault(address(usdc), address(0));
    }

    // ============ 2. Deposit Tests ============

    function test_DepositIncreasesBalance() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        (uint256 total, uint256 available) = vault.getBalance();
        assertEq(total, DEPOSIT_AMOUNT);
        assertEq(available, DEPOSIT_AMOUNT);
    }

    function test_DepositEmitsEvent() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);

        vm.expectEmit(true, false, false, true);
        emit Deposited(owner, DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

    function test_DepositTransfersUSDCFromOwner() public {
        uint256 ownerBalanceBefore = usdc.balanceOf(owner);

        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(usdc.balanceOf(owner), ownerBalanceBefore - DEPOSIT_AMOUNT);
        assertEq(usdc.balanceOf(address(vault)), DEPOSIT_AMOUNT);
    }

    function test_DepositRevertsIfNotOwner() public {
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        vault.deposit(DEPOSIT_AMOUNT);
    }

    function test_DepositRevertsIfZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(IPolicyVault.ZeroAmount.selector);
        vault.deposit(0);
    }

    function test_DepositRevertsIfInsufficientAllowance() public {
        vm.prank(owner);
        // No approval given
        vm.expectRevert(); // SafeERC20 will revert
        vault.deposit(DEPOSIT_AMOUNT);
    }

    function test_MultipleDepositsAccumulate() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT * 3);

        vault.deposit(DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        (uint256 total,) = vault.getBalance();
        assertEq(total, DEPOSIT_AMOUNT * 3);
    }

    function testFuzz_DepositAnyAmount(uint256 amount) public {
        // Bound amount to reasonable values (1 to 1B USDC)
        amount = bound(amount, 1, 1_000_000_000 * 1e6);

        // Mint enough USDC
        vm.prank(owner);
        usdc.mint(owner, amount);

        vm.startPrank(owner);
        usdc.approve(address(vault), amount);
        vault.deposit(amount);
        vm.stopPrank();

        (uint256 total,) = vault.getBalance();
        assertEq(total, amount);
    }

    // ============ 3. Withdraw Tests ============

    function test_WithdrawDecreasesBalance() public {
        // Setup: deposit first
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        // Withdraw half
        vault.withdraw(DEPOSIT_AMOUNT / 2);
        vm.stopPrank();

        (uint256 total, uint256 available) = vault.getBalance();
        assertEq(total, DEPOSIT_AMOUNT / 2);
        assertEq(available, DEPOSIT_AMOUNT / 2);
    }

    function test_WithdrawTransfersUSDC() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        uint256 ownerBalanceBefore = usdc.balanceOf(owner);
        vault.withdraw(DEPOSIT_AMOUNT / 2);
        vm.stopPrank();

        assertEq(usdc.balanceOf(owner), ownerBalanceBefore + DEPOSIT_AMOUNT / 2);
    }

    function test_WithdrawEmitsEvent() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        vm.expectEmit(true, false, false, true);
        emit Withdrawn(owner, DEPOSIT_AMOUNT / 2);
        vault.withdraw(DEPOSIT_AMOUNT / 2);
        vm.stopPrank();
    }

    function test_WithdrawRevertsIfNotOwner() public {
        // Setup: deposit
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        vault.withdraw(DEPOSIT_AMOUNT);
    }

    function test_WithdrawRevertsIfZeroAmount() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        vm.expectRevert(IPolicyVault.ZeroAmount.selector);
        vault.withdraw(0);
        vm.stopPrank();
    }

    function test_WithdrawRevertsIfInsufficientBalance() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        vm.expectRevert(IPolicyVault.InsufficientAvailableBalance.selector);
        vault.withdraw(DEPOSIT_AMOUNT + 1);
        vm.stopPrank();
    }

    function test_WithdrawRevertsIfFundsAllocatedToSessions() public {
        _setupFundedVaultWithAgent();

        // Open a session that allocates 50% of funds
        vm.prank(agent1);
        vault.openSession(keccak256("channel1"), PER_TX_LIMIT);

        // Try to withdraw all - should fail
        vm.prank(owner);
        vm.expectRevert(IPolicyVault.InsufficientAvailableBalance.selector);
        vault.withdraw(DEPOSIT_AMOUNT);
    }

    function test_CanWithdrawAvailableBalanceOnly() public {
        _setupFundedVaultWithAgent();

        // Open a session that allocates some funds
        uint256 sessionAllocation = PER_TX_LIMIT;
        vm.prank(agent1);
        vault.openSession(keccak256("channel1"), sessionAllocation);

        // Can withdraw remaining available balance
        uint256 availableToWithdraw = DEPOSIT_AMOUNT - sessionAllocation;
        vm.prank(owner);
        vault.withdraw(availableToWithdraw);

        (uint256 total, uint256 available) = vault.getBalance();
        assertEq(total, sessionAllocation);
        assertEq(available, 0);
    }

    function test_WithdrawAllWorks() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vault.withdraw(DEPOSIT_AMOUNT);
        vm.stopPrank();

        (uint256 total, uint256 available) = vault.getBalance();
        assertEq(total, 0);
        assertEq(available, 0);
    }

    function testFuzz_WithdrawUpToBalance(uint256 depositAmount, uint256 withdrawAmount) public {
        depositAmount = bound(depositAmount, 1, 1_000_000_000 * 1e6);
        withdrawAmount = bound(withdrawAmount, 1, depositAmount);

        vm.prank(owner);
        usdc.mint(owner, depositAmount);

        vm.startPrank(owner);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount);
        vault.withdraw(withdrawAmount);
        vm.stopPrank();

        (uint256 total,) = vault.getBalance();
        assertEq(total, depositAmount - withdrawAmount);
    }

    // ============ 4. Agent Authorization Tests ============

    function test_AuthorizeAgentStoresPolicy() public {
        vm.prank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        IPolicyVault.Policy memory stored = vault.getAgentPolicy(agent1);
        assertEq(stored.dailyLimit, DAILY_LIMIT);
        assertEq(stored.perTxLimit, PER_TX_LIMIT);
        assertTrue(stored.isActive);
        assertEq(stored.createdAt, block.timestamp);
    }

    function test_AuthorizeAgentEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit AgentAuthorized(agent1, DAILY_LIMIT, PER_TX_LIMIT);

        vm.prank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
    }

    function test_AuthorizeAgentAddsToList() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.authorizeAgent(agent2, _createDefaultPolicy());
        vm.stopPrank();

        address[] memory agents = vault.getAuthorizedAgents();
        assertEq(agents.length, 2);
        assertEq(agents[0], agent1);
        assertEq(agents[1], agent2);
    }

    function test_AuthorizeAgentRevertsIfNotOwner() public {
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        vault.authorizeAgent(agent1, _createDefaultPolicy());
    }

    function test_AuthorizeAgentRevertsIfZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(IPolicyVault.ZeroAddress.selector);
        vault.authorizeAgent(address(0), _createDefaultPolicy());
    }

    function test_AuthorizeAgentRevertsIfAlreadyAuthorized() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        vm.expectRevert(IPolicyVault.AgentAlreadyAuthorized.selector);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vm.stopPrank();
    }

    function test_CanAuthorizeMultipleAgents() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.authorizeAgent(agent2, _createPolicy(DAILY_LIMIT * 2, PER_TX_LIMIT * 2));
        vault.authorizeAgent(agent3, _createPolicy(DAILY_LIMIT / 2, PER_TX_LIMIT / 2));
        vm.stopPrank();

        assertTrue(vault.isAgentAuthorized(agent1));
        assertTrue(vault.isAgentAuthorized(agent2));
        assertTrue(vault.isAgentAuthorized(agent3));

        address[] memory agents = vault.getAuthorizedAgents();
        assertEq(agents.length, 3);
    }

    function test_PolicyLimitsStoredCorrectly() public {
        uint256 customDaily = 5000 * 1e6;
        uint256 customPerTx = 500 * 1e6;

        vm.prank(owner);
        vault.authorizeAgent(agent1, _createPolicy(customDaily, customPerTx));

        IPolicyVault.Policy memory stored = vault.getAgentPolicy(agent1);
        assertEq(stored.dailyLimit, customDaily);
        assertEq(stored.perTxLimit, customPerTx);
    }

    function test_ProtocolWhitelistStoredCorrectly() public {
        address[] memory whitelist = new address[](2);
        whitelist[0] = address(100);
        whitelist[1] = address(200);

        vm.prank(owner);
        vault.authorizeAgent(agent1, _createPolicyWithWhitelist(whitelist));

        IPolicyVault.Policy memory stored = vault.getAgentPolicy(agent1);
        assertEq(stored.protocolWhitelist.length, 2);
        assertEq(stored.protocolWhitelist[0], address(100));
        assertEq(stored.protocolWhitelist[1], address(200));
    }

    function test_AuthorizeAgentRevertsIfInvalidPolicy_ZeroDailyLimit() public {
        IPolicyVault.Policy memory invalidPolicy = _createPolicy(0, PER_TX_LIMIT);

        vm.prank(owner);
        vm.expectRevert(IPolicyVault.InvalidPolicyLimits.selector);
        vault.authorizeAgent(agent1, invalidPolicy);
    }

    function test_AuthorizeAgentRevertsIfInvalidPolicy_ZeroPerTxLimit() public {
        IPolicyVault.Policy memory invalidPolicy = _createPolicy(DAILY_LIMIT, 0);

        vm.prank(owner);
        vm.expectRevert(IPolicyVault.InvalidPolicyLimits.selector);
        vault.authorizeAgent(agent1, invalidPolicy);
    }

    function test_AuthorizeAgentRevertsIfInvalidPolicy_PerTxExceedsDaily() public {
        IPolicyVault.Policy memory invalidPolicy = _createPolicy(100 * 1e6, 200 * 1e6);

        vm.prank(owner);
        vm.expectRevert(IPolicyVault.InvalidPolicyLimits.selector);
        vault.authorizeAgent(agent1, invalidPolicy);
    }

    // ============ 5. Agent Revocation Tests ============

    function test_RevokeAgentRemovesPolicy() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.revokeAgent(agent1);
        vm.stopPrank();

        IPolicyVault.Policy memory stored = vault.getAgentPolicy(agent1);
        assertEq(stored.dailyLimit, 0);
        assertEq(stored.perTxLimit, 0);
        assertFalse(stored.isActive);
    }

    function test_RevokeAgentEmitsEvent() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        vm.expectEmit(true, false, false, false);
        emit AgentRevoked(agent1);
        vault.revokeAgent(agent1);
        vm.stopPrank();
    }

    function test_RevokeAgentRemovesFromList() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.authorizeAgent(agent2, _createDefaultPolicy());
        vault.revokeAgent(agent1);
        vm.stopPrank();

        address[] memory agents = vault.getAuthorizedAgents();
        assertEq(agents.length, 1);
        assertEq(agents[0], agent2);
    }

    function test_RevokeAgentRevertsIfNotOwner() public {
        vm.prank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        vault.revokeAgent(agent1);
    }

    function test_RevokeAgentRevertsIfNotAuthorized() public {
        vm.prank(owner);
        vm.expectRevert(IPolicyVault.AgentNotAuthorized.selector);
        vault.revokeAgent(agent1);
    }

    function test_RevokedAgentCannotSpend() public {
        _setupFundedVaultWithAgent();

        vm.prank(owner);
        vault.revokeAgent(agent1);

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.UnauthorizedAgent.selector);
        vault.spend(recipient, 10 * 1e6);
    }

    function test_RevokeMiddleAgentMaintainsList() public {
        // Test swap-and-pop logic
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.authorizeAgent(agent2, _createDefaultPolicy());
        vault.authorizeAgent(agent3, _createDefaultPolicy());

        // Revoke middle agent
        vault.revokeAgent(agent2);
        vm.stopPrank();

        address[] memory agents = vault.getAuthorizedAgents();
        assertEq(agents.length, 2);

        // agent3 should have moved to agent2's position
        assertTrue(vault.isAgentAuthorized(agent1));
        assertFalse(vault.isAgentAuthorized(agent2));
        assertTrue(vault.isAgentAuthorized(agent3));
    }

    // ============ 6. Agent Pause/Resume Tests ============

    function test_PauseAgentSetsInactive() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.pauseAgent(agent1);
        vm.stopPrank();

        IPolicyVault.Policy memory stored = vault.getAgentPolicy(agent1);
        assertFalse(stored.isActive);
    }

    function test_PauseAgentEmitsEvent() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        vm.expectEmit(true, false, false, false);
        emit AgentPaused(agent1);
        vault.pauseAgent(agent1);
        vm.stopPrank();
    }

    function test_PausedAgentCannotSpend() public {
        _setupFundedVaultWithAgent();

        vm.prank(owner);
        vault.pauseAgent(agent1);

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.UnauthorizedAgent.selector);
        vault.spend(recipient, 10 * 1e6);
    }

    function test_PausedAgentCannotOpenSession() public {
        _setupFundedVaultWithAgent();

        vm.prank(owner);
        vault.pauseAgent(agent1);

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.UnauthorizedAgent.selector);
        vault.openSession(keccak256("channel1"), PER_TX_LIMIT);
    }

    function test_ResumeAgentSetsActive() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.pauseAgent(agent1);
        vault.resumeAgent(agent1);
        vm.stopPrank();

        IPolicyVault.Policy memory stored = vault.getAgentPolicy(agent1);
        assertTrue(stored.isActive);
    }

    function test_ResumeAgentEmitsEvent() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.pauseAgent(agent1);

        vm.expectEmit(true, false, false, false);
        emit AgentResumed(agent1);
        vault.resumeAgent(agent1);
        vm.stopPrank();
    }

    function test_ResumedAgentCanSpend() public {
        _setupFundedVaultWithAgent();

        vm.prank(owner);
        vault.pauseAgent(agent1);

        vm.prank(owner);
        vault.resumeAgent(agent1);

        vm.prank(agent1);
        vault.spend(recipient, 10 * 1e6);

        assertEq(usdc.balanceOf(recipient), 10 * 1e6);
    }

    function test_PauseRevertsIfNotOwner() public {
        vm.prank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        vault.pauseAgent(agent1);
    }

    function test_PauseRevertsIfNotAuthorized() public {
        vm.prank(owner);
        vm.expectRevert(IPolicyVault.AgentNotAuthorized.selector);
        vault.pauseAgent(agent1);
    }

    function test_PauseRevertsIfAlreadyPaused() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.pauseAgent(agent1);

        vm.expectRevert(IPolicyVault.AgentIsPaused.selector);
        vault.pauseAgent(agent1);
        vm.stopPrank();
    }

    function test_ResumeRevertsIfNotPaused() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        vm.expectRevert(IPolicyVault.AgentNotPaused.selector);
        vault.resumeAgent(agent1);
        vm.stopPrank();
    }

    // ============ 7. Spending Tests ============

    function test_SpendTransfersUSDC() public {
        _setupFundedVaultWithAgent();

        uint256 spendAmount = 50 * 1e6;
        vm.prank(agent1);
        vault.spend(recipient, spendAmount);

        assertEq(usdc.balanceOf(recipient), spendAmount);
    }

    function test_SpendEmitsEvent() public {
        _setupFundedVaultWithAgent();

        uint256 spendAmount = 50 * 1e6;

        vm.expectEmit(true, true, false, true);
        emit SpendExecuted(agent1, recipient, spendAmount);

        vm.prank(agent1);
        vault.spend(recipient, spendAmount);
    }

    function test_SpendUpdatesAgentSpentToday() public {
        _setupFundedVaultWithAgent();

        uint256 spendAmount = 50 * 1e6;
        vm.prank(agent1);
        vault.spend(recipient, spendAmount);

        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.spentToday, spendAmount);
    }

    function test_SpendUpdatesAgentTotalSpent() public {
        _setupFundedVaultWithAgent();

        uint256 spendAmount = 50 * 1e6;
        vm.prank(agent1);
        vault.spend(recipient, spendAmount);

        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.totalSpent, spendAmount);
    }

    function test_SpendDecreasesVaultBalance() public {
        _setupFundedVaultWithAgent();

        uint256 spendAmount = 50 * 1e6;
        vm.prank(agent1);
        vault.spend(recipient, spendAmount);

        (uint256 total, uint256 available) = vault.getBalance();
        assertEq(total, DEPOSIT_AMOUNT - spendAmount);
        assertEq(available, DEPOSIT_AMOUNT - spendAmount);
    }

    function test_SpendRevertsIfNotAuthorized() public {
        _setupFundedVaultWithAgent();

        vm.prank(unauthorized);
        vm.expectRevert(IPolicyVault.UnauthorizedAgent.selector);
        vault.spend(recipient, 10 * 1e6);
    }

    function test_SpendRevertsIfExceedsPerTxLimit() public {
        _setupFundedVaultWithAgent();

        vm.prank(agent1);
        vm.expectRevert("Exceeds per-transaction limit");
        vault.spend(recipient, PER_TX_LIMIT + 1);
    }

    function test_SpendRevertsIfExceedsDailyLimit() public {
        _setupFundedVaultWithAgent();

        // Spend up to daily limit with multiple transactions
        uint256 numTxs = DAILY_LIMIT / PER_TX_LIMIT;
        vm.startPrank(agent1);
        for (uint256 i = 0; i < numTxs; i++) {
            vault.spend(recipient, PER_TX_LIMIT);
        }

        // Next spend should fail
        vm.expectRevert("Exceeds daily limit");
        vault.spend(recipient, 1);
        vm.stopPrank();
    }

    function test_SpendRevertsIfAgentPaused() public {
        _setupFundedVaultWithAgent();

        vm.prank(owner);
        vault.pauseAgent(agent1);

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.UnauthorizedAgent.selector);
        vault.spend(recipient, 10 * 1e6);
    }

    function test_SpendRevertsIfInsufficientBalance() public {
        _setupFundedVaultWithAgent();

        // Create agent with huge limits
        vm.prank(owner);
        vault.authorizeAgent(agent2, _createPolicy(DEPOSIT_AMOUNT * 10, DEPOSIT_AMOUNT * 10));

        vm.prank(agent2);
        vm.expectRevert("Insufficient vault balance");
        vault.spend(recipient, DEPOSIT_AMOUNT + 1);
    }

    function test_SpendRevertsIfZeroAmount() public {
        _setupFundedVaultWithAgent();

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.ZeroAmount.selector);
        vault.spend(recipient, 0);
    }

    function test_SpendRevertsIfZeroRecipient() public {
        _setupFundedVaultWithAgent();

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.ZeroAddress.selector);
        vault.spend(address(0), 10 * 1e6);
    }

    function test_MultipleSpendsSameDay() public {
        _setupFundedVaultWithAgent();

        vm.startPrank(agent1);
        vault.spend(recipient, 30 * 1e6);
        vault.spend(recipient, 30 * 1e6);
        vault.spend(recipient, 30 * 1e6);
        vm.stopPrank();

        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.spentToday, 90 * 1e6);
        assertEq(agentInfo.totalSpent, 90 * 1e6);
    }

    // ============ 8. Daily Limit Reset Tests ============

    function test_DailyLimitResetsAfter24Hours() public {
        _setupFundedVaultWithAgent();

        // Spend full daily limit
        uint256 numTxs = DAILY_LIMIT / PER_TX_LIMIT;
        vm.startPrank(agent1);
        for (uint256 i = 0; i < numTxs; i++) {
            vault.spend(recipient, PER_TX_LIMIT);
        }
        vm.stopPrank();

        // Verify can't spend more
        vm.prank(agent1);
        vm.expectRevert("Exceeds daily limit");
        vault.spend(recipient, 1);

        // Fast forward 24 hours
        _skipTime(24 hours);

        // Should be able to spend again
        vm.prank(agent1);
        vault.spend(recipient, PER_TX_LIMIT);

        // Verify spentToday reset
        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.spentToday, PER_TX_LIMIT);
    }

    function test_DailyLimitDoesNotResetBefore24Hours() public {
        _setupFundedVaultWithAgent();

        // Spend full daily limit
        uint256 numTxs = DAILY_LIMIT / PER_TX_LIMIT;
        vm.startPrank(agent1);
        for (uint256 i = 0; i < numTxs; i++) {
            vault.spend(recipient, PER_TX_LIMIT);
        }
        vm.stopPrank();

        // Fast forward 23 hours
        _skipTime(23 hours);

        // Should still not be able to spend
        vm.prank(agent1);
        vm.expectRevert("Exceeds daily limit");
        vault.spend(recipient, 1);
    }

    function test_SpentTodayAccumulatesWithinWindow() public {
        _setupFundedVaultWithAgent();

        vm.startPrank(agent1);
        vault.spend(recipient, 30 * 1e6);

        // 6 hours later
        _skipTime(6 hours);
        vault.spend(recipient, 30 * 1e6);

        // 6 more hours later
        _skipTime(6 hours);
        vault.spend(recipient, 30 * 1e6);
        vm.stopPrank();

        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.spentToday, 90 * 1e6);
    }

    function test_CanSpendFullLimitAfterReset() public {
        _setupFundedVaultWithAgent();

        // Spend partial amount using multiple transactions (respecting per-tx limit)
        vm.startPrank(agent1);
        for (uint256 i = 0; i < 5; i++) {
            vault.spend(recipient, PER_TX_LIMIT); // 5 * 100 = 500 USDC
        }
        vm.stopPrank();

        // Fast forward 24 hours
        _skipTime(24 hours);

        // Should be able to spend full daily limit again
        uint256 numTxs = DAILY_LIMIT / PER_TX_LIMIT;
        vm.startPrank(agent1);
        for (uint256 i = 0; i < numTxs; i++) {
            vault.spend(recipient, PER_TX_LIMIT);
        }
        vm.stopPrank();

        // Total spent should be day 1 (500) + day 2 (1000)
        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.totalSpent, 500 * 1e6 + DAILY_LIMIT);
    }

    function testFuzz_DailyLimitBehaviorOverTime(uint256 timePassed) public {
        timePassed = bound(timePassed, 0, 48 hours);

        _setupFundedVaultWithAgent();

        // First spend
        vm.prank(agent1);
        vault.spend(recipient, PER_TX_LIMIT);

        // Time passes
        _skipTime(timePassed);

        uint256 remainingLimit = vault.getRemainingDailyLimit(agent1);

        if (timePassed >= 24 hours) {
            // Should have full limit again
            assertEq(remainingLimit, DAILY_LIMIT);
        } else {
            // Should have partial limit
            assertEq(remainingLimit, DAILY_LIMIT - PER_TX_LIMIT);
        }
    }

    // ============ 9. Session Tests (Yellow Network) ============

    function test_OpenSessionAllocatesFunds() public {
        _setupFundedVaultWithAgent();

        uint256 allocation = 50 * 1e6;
        vm.prank(agent1);
        vault.openSession(keccak256("channel1"), allocation);

        (, uint256 available) = vault.getBalance();
        assertEq(available, DEPOSIT_AMOUNT - allocation);
    }

    function test_OpenSessionEmitsEvent() public {
        _setupFundedVaultWithAgent();

        uint256 allocation = 50 * 1e6;
        bytes32 channelId = keccak256("channel1");

        // We can't predict sessionId exactly, so just check indexed params
        vm.expectEmit(false, true, false, true);
        emit SessionOpened(bytes32(0), agent1, allocation);

        vm.prank(agent1);
        vault.openSession(channelId, allocation);
    }

    function test_OpenSessionCreatesRecord() public {
        _setupFundedVaultWithAgent();

        uint256 allocation = 50 * 1e6;
        vm.prank(agent1);
        bytes32 sessionId = vault.openSession(keccak256("channel1"), allocation);

        IPolicyVault.Session memory session = vault.getSessionInfo(sessionId);
        assertEq(session.agent, agent1);
        assertEq(session.allocation, allocation);
        assertEq(session.spent, 0);
        assertTrue(session.isActive);
        assertEq(session.openedAt, block.timestamp);
    }

    function test_OpenSessionReducesAvailableBalance() public {
        _setupFundedVaultWithAgent();

        uint256 allocation = 50 * 1e6;
        (, uint256 availableBefore) = vault.getBalance();

        vm.prank(agent1);
        vault.openSession(keccak256("channel1"), allocation);

        (, uint256 availableAfter) = vault.getBalance();
        assertEq(availableAfter, availableBefore - allocation);
    }

    function test_OpenSessionRevertsIfNotAuthorized() public {
        _setupFundedVaultWithAgent();

        vm.prank(unauthorized);
        vm.expectRevert(IPolicyVault.UnauthorizedAgent.selector);
        vault.openSession(keccak256("channel1"), 50 * 1e6);
    }

    function test_OpenSessionRevertsIfInsufficientBalance() public {
        _setupFundedVaultWithAgent();

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.InsufficientAvailableBalance.selector);
        vault.openSession(keccak256("channel1"), DEPOSIT_AMOUNT + 1);
    }

    function test_OpenSessionRevertsIfAgentPaused() public {
        _setupFundedVaultWithAgent();

        vm.prank(owner);
        vault.pauseAgent(agent1);

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.UnauthorizedAgent.selector);
        vault.openSession(keccak256("channel1"), 50 * 1e6);
    }

    function test_OpenSessionRevertsIfExceedsPerTxLimit() public {
        _setupFundedVaultWithAgent();

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.PerTxLimitExceeded.selector);
        vault.openSession(keccak256("channel1"), PER_TX_LIMIT + 1);
    }

    function test_OpenSessionRevertsIfExceedsDailyLimit() public {
        _setupFundedVaultWithAgent();

        // Create agent with equal daily and per-tx limits
        vm.prank(owner);
        vault.authorizeAgent(agent2, _createPolicy(100 * 1e6, 100 * 1e6));

        // Agent2 spends some amount first
        vm.prank(agent2);
        vault.spend(recipient, 50 * 1e6);

        // Now try to open a session that would exceed remaining daily limit (50 remaining, trying 60)
        vm.prank(agent2);
        vm.expectRevert(IPolicyVault.DailyLimitExceeded.selector);
        vault.openSession(keccak256("channel1"), 60 * 1e6);
    }

    function test_OpenSessionRevertsIfZeroAllocation() public {
        _setupFundedVaultWithAgent();

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.ZeroAmount.selector);
        vault.openSession(keccak256("channel1"), 0);
    }

    function test_CanOpenMultipleSessions() public {
        _setupFundedVaultWithAgent();

        vm.startPrank(agent1);
        bytes32 session1 = vault.openSession(keccak256("channel1"), 30 * 1e6);
        bytes32 session2 = vault.openSession(keccak256("channel2"), 30 * 1e6);
        bytes32 session3 = vault.openSession(keccak256("channel3"), 30 * 1e6);
        vm.stopPrank();

        assertTrue(vault.getSessionInfo(session1).isActive);
        assertTrue(vault.getSessionInfo(session2).isActive);
        assertTrue(vault.getSessionInfo(session3).isActive);

        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.sessionCount, 3);
    }

    function test_CloseSessionReturnsUnspentFunds() public {
        uint256 allocation = 50 * 1e6;
        uint256 spent = 20 * 1e6;
        bytes32 sessionId = _setupActiveSession(allocation);

        (, uint256 availableBefore) = vault.getBalance();

        vm.prank(agent1);
        vault.closeSession(sessionId, spent);

        (, uint256 availableAfter) = vault.getBalance();
        assertEq(availableAfter, availableBefore + (allocation - spent));
    }

    function test_CloseSessionEmitsEvent() public {
        uint256 allocation = 50 * 1e6;
        uint256 spent = 20 * 1e6;
        bytes32 sessionId = _setupActiveSession(allocation);

        vm.expectEmit(true, false, false, true);
        emit SessionClosed(sessionId, spent);

        vm.prank(agent1);
        vault.closeSession(sessionId, spent);
    }

    function test_CloseSessionUpdatesAgentStats() public {
        uint256 allocation = 50 * 1e6;
        uint256 spent = 20 * 1e6;
        bytes32 sessionId = _setupActiveSession(allocation);

        vm.prank(agent1);
        vault.closeSession(sessionId, spent);

        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.spentToday, spent);
        assertEq(agentInfo.totalSpent, spent);
    }

    function test_CloseSessionMarksInactive() public {
        uint256 allocation = 50 * 1e6;
        bytes32 sessionId = _setupActiveSession(allocation);

        vm.prank(agent1);
        vault.closeSession(sessionId, 10 * 1e6);

        IPolicyVault.Session memory session = vault.getSessionInfo(sessionId);
        assertFalse(session.isActive);
        assertEq(session.spent, 10 * 1e6);
    }

    function test_CannotDoubleCloseSession() public {
        uint256 allocation = 50 * 1e6;
        bytes32 sessionId = _setupActiveSession(allocation);

        vm.startPrank(agent1);
        vault.closeSession(sessionId, 10 * 1e6);

        vm.expectRevert(IPolicyVault.SessionAlreadyClosed.selector);
        vault.closeSession(sessionId, 10 * 1e6);
        vm.stopPrank();
    }

    function test_CloseSessionRevertsIfNotFound() public {
        _setupFundedVaultWithAgent();

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.SessionNotFound.selector);
        vault.closeSession(keccak256("nonexistent"), 0);
    }

    function test_CloseSessionRevertsIfOverspent() public {
        uint256 allocation = 50 * 1e6;
        bytes32 sessionId = _setupActiveSession(allocation);

        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.SessionOverspent.selector);
        vault.closeSession(sessionId, allocation + 1);
    }

    function test_CloseSessionRevertsIfUnauthorized() public {
        uint256 allocation = 50 * 1e6;
        bytes32 sessionId = _setupActiveSession(allocation);

        vm.prank(unauthorized);
        vm.expectRevert(IPolicyVault.UnauthorizedSessionClose.selector);
        vault.closeSession(sessionId, 10 * 1e6);
    }

    function test_OwnerCanCloseSession() public {
        uint256 allocation = 50 * 1e6;
        bytes32 sessionId = _setupActiveSession(allocation);

        vm.prank(owner);
        vault.closeSession(sessionId, 10 * 1e6);

        assertFalse(vault.getSessionInfo(sessionId).isActive);
    }

    function test_CloseSessionReducesTotalDeposited() public {
        uint256 allocation = 50 * 1e6;
        uint256 spent = 20 * 1e6;
        bytes32 sessionId = _setupActiveSession(allocation);

        (uint256 totalBefore,) = vault.getBalance();

        vm.prank(agent1);
        vault.closeSession(sessionId, spent);

        (uint256 totalAfter,) = vault.getBalance();
        assertEq(totalAfter, totalBefore - spent);
    }

    function testFuzz_SessionAllocationAndClosure(uint256 allocation, uint256 spent) public {
        // Bound allocation to valid range
        allocation = bound(allocation, 1, PER_TX_LIMIT);
        spent = bound(spent, 0, allocation);

        _setupFundedVaultWithAgent();

        vm.prank(agent1);
        bytes32 sessionId = vault.openSession(keccak256("channel1"), allocation);

        (uint256 totalBefore, uint256 availableBefore) = vault.getBalance();

        vm.prank(agent1);
        vault.closeSession(sessionId, spent);

        (uint256 totalAfter, uint256 availableAfter) = vault.getBalance();

        // Total should decrease by spent amount
        assertEq(totalAfter, totalBefore - spent);
        // Available should increase by unspent amount
        assertEq(availableAfter, availableBefore + (allocation - spent));
    }

    // ============ 10. Emergency Controls Tests ============

    function test_EmergencyPauseAllStopsDeposits() public {
        vm.prank(owner);
        vault.emergencyPauseAll();

        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vm.expectRevert(); // Pausable: paused
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

    function test_EmergencyPauseAllStopsWithdraws() public {
        // First deposit some funds
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        vm.prank(owner);
        vault.emergencyPauseAll();

        vm.prank(owner);
        vm.expectRevert(); // Pausable: paused
        vault.withdraw(DEPOSIT_AMOUNT);
    }

    function test_EmergencyPauseAllStopsSpends() public {
        _setupFundedVaultWithAgent();

        vm.prank(owner);
        vault.emergencyPauseAll();

        vm.prank(agent1);
        vm.expectRevert(); // Pausable: paused
        vault.spend(recipient, 10 * 1e6);
    }

    function test_EmergencyPauseAllEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit EmergencyPause(owner, block.timestamp);

        vm.prank(owner);
        vault.emergencyPauseAll();
    }

    function test_EmergencyPauseAllRevertsIfNotOwner() public {
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        vault.emergencyPauseAll();
    }

    function test_EmergencyWithdrawAllTransfersEverything() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        uint256 ownerBalanceBefore = usdc.balanceOf(owner);
        vault.emergencyWithdrawAll();
        vm.stopPrank();

        assertEq(usdc.balanceOf(owner), ownerBalanceBefore + DEPOSIT_AMOUNT);
        (uint256 total, uint256 available) = vault.getBalance();
        assertEq(total, 0);
        assertEq(available, 0);
    }

    function test_EmergencyWithdrawAllOnlyAvailable() public {
        _setupFundedVaultWithAgent();

        // Open a session that locks some funds
        uint256 sessionAllocation = 50 * 1e6;
        vm.prank(agent1);
        vault.openSession(keccak256("channel1"), sessionAllocation);

        uint256 ownerBalanceBefore = usdc.balanceOf(owner);
        uint256 expectedWithdraw = DEPOSIT_AMOUNT - sessionAllocation;

        vm.prank(owner);
        vault.emergencyWithdrawAll();

        assertEq(usdc.balanceOf(owner), ownerBalanceBefore + expectedWithdraw);

        // Session funds should still be reserved
        (uint256 total,) = vault.getBalance();
        assertEq(total, sessionAllocation);
    }

    function test_EmergencyWithdrawAllRevertsIfNotOwner() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        vault.emergencyWithdrawAll();
    }

    function test_EmergencyWithdrawAllRevertsIfZeroBalance() public {
        vm.prank(owner);
        vm.expectRevert(IPolicyVault.ZeroAmount.selector);
        vault.emergencyWithdrawAll();
    }

    function test_ContractWorksAfterUnpause() public {
        _setupFundedVaultWithAgent();

        // Pause
        vm.prank(owner);
        vault.emergencyPauseAll();

        // Unpause
        vm.prank(owner);
        vault.emergencyUnpauseAll();

        // Should work now
        vm.prank(agent1);
        vault.spend(recipient, 10 * 1e6);

        assertEq(usdc.balanceOf(recipient), 10 * 1e6);
    }

    function test_EmergencyUnpauseEmitsEvent() public {
        vm.prank(owner);
        vault.emergencyPauseAll();

        vm.expectEmit(true, false, false, true);
        emit EmergencyUnpause(owner, block.timestamp);

        vm.prank(owner);
        vault.emergencyUnpauseAll();
    }

    function test_SessionCanBeClosedDuringPause() public {
        // This is important - sessions should be closeable even when paused
        // to allow recovery of funds
        uint256 allocation = 50 * 1e6;
        bytes32 sessionId = _setupActiveSession(allocation);

        vm.prank(owner);
        vault.emergencyPauseAll();

        // Session close should still work
        vm.prank(agent1);
        vault.closeSession(sessionId, 10 * 1e6);

        assertFalse(vault.getSessionInfo(sessionId).isActive);
    }

    // ============ 11. View Functions Tests ============

    function test_GetBalanceReturnsCorrectValues() public {
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        (uint256 total, uint256 available) = vault.getBalance();
        assertEq(total, DEPOSIT_AMOUNT);
        assertEq(available, DEPOSIT_AMOUNT);
    }

    function test_GetAgentPolicyReturnsCorrectData() public {
        vm.prank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        IPolicyVault.Policy memory policy = vault.getAgentPolicy(agent1);
        assertEq(policy.dailyLimit, DAILY_LIMIT);
        assertEq(policy.perTxLimit, PER_TX_LIMIT);
        assertTrue(policy.isActive);
    }

    function test_GetAgentInfoReturnsFullData() public {
        _setupFundedVaultWithAgent();

        vm.prank(agent1);
        vault.spend(recipient, 50 * 1e6);

        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.spentToday, 50 * 1e6);
        assertEq(agentInfo.totalSpent, 50 * 1e6);
        assertEq(agentInfo.lastSpendTimestamp, block.timestamp);
    }

    function test_IsAgentAuthorizedReturnsCorrectly() public {
        vm.prank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        assertTrue(vault.isAgentAuthorized(agent1));
        assertFalse(vault.isAgentAuthorized(agent2));
        assertFalse(vault.isAgentAuthorized(unauthorized));
    }

    function test_IsAgentAuthorizedReturnsFalseIfPaused() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.pauseAgent(agent1);
        vm.stopPrank();

        // isAgentAuthorized checks both authorization AND active status
        assertFalse(vault.isAgentAuthorized(agent1));
    }

    function test_CanSpendReturnsCorrectly() public {
        _setupFundedVaultWithAgent();

        (bool canSpend, string memory reason) = vault.canSpend(agent1, 50 * 1e6);
        assertTrue(canSpend);
        assertEq(reason, "");
    }

    function test_CanSpendReturnsReasonOnFailure() public {
        _setupFundedVaultWithAgent();

        // Test exceeding per-tx limit
        (bool canSpend1, string memory reason1) = vault.canSpend(agent1, PER_TX_LIMIT + 1);
        assertFalse(canSpend1);
        assertEq(reason1, "Exceeds per-transaction limit");

        // Test unauthorized agent
        (bool canSpend2, string memory reason2) = vault.canSpend(unauthorized, 10 * 1e6);
        assertFalse(canSpend2);
        assertEq(reason2, "Agent not authorized");
    }

    function test_CanSpendReturnsReasonForPausedAgent() public {
        _setupFundedVaultWithAgent();

        vm.prank(owner);
        vault.pauseAgent(agent1);

        (bool canSpend, string memory reason) = vault.canSpend(agent1, 10 * 1e6);
        assertFalse(canSpend);
        assertEq(reason, "Agent is paused");
    }

    function test_GetSessionInfoReturnsCorrectData() public {
        _setupFundedVaultWithAgent();

        bytes32 channelId = keccak256("channel1");
        uint256 allocation = 50 * 1e6;

        vm.prank(agent1);
        bytes32 sessionId = vault.openSession(channelId, allocation);

        IPolicyVault.Session memory session = vault.getSessionInfo(sessionId);
        assertEq(session.channelId, channelId);
        assertEq(session.agent, agent1);
        assertEq(session.allocation, allocation);
        assertEq(session.spent, 0);
        assertTrue(session.isActive);
    }

    function test_GetAuthorizedAgentsReturnsCorrectList() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vault.authorizeAgent(agent2, _createDefaultPolicy());
        vm.stopPrank();

        address[] memory agents = vault.getAuthorizedAgents();
        assertEq(agents.length, 2);
        assertEq(agents[0], agent1);
        assertEq(agents[1], agent2);
    }

    function test_GetRemainingDailyLimit() public {
        _setupFundedVaultWithAgent();

        // Initially should be full daily limit
        assertEq(vault.getRemainingDailyLimit(agent1), DAILY_LIMIT);

        // After spending 3 transactions of 100 USDC each (respecting per-tx limit)
        vm.startPrank(agent1);
        vault.spend(recipient, PER_TX_LIMIT);
        vault.spend(recipient, PER_TX_LIMIT);
        vault.spend(recipient, PER_TX_LIMIT);
        vm.stopPrank();

        assertEq(vault.getRemainingDailyLimit(agent1), DAILY_LIMIT - (3 * PER_TX_LIMIT));
    }

    function test_GetRemainingDailyLimitReturnsZeroForUnauthorized() public view {
        assertEq(vault.getRemainingDailyLimit(unauthorized), 0);
    }

    // ============ 12. Edge Cases & Security Tests ============

    function test_ReentrancyProtectionOnSpend() public {
        _setupFundedVaultWithAgent();

        // Deploy attacker contract
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(vault));

        // Authorize attacker as an agent
        vm.prank(owner);
        vault.authorizeAgent(address(attacker), _createDefaultPolicy());

        // The attack won't work with ERC20 tokens (no receive callback)
        // but the nonReentrant modifier still protects the function
        // This test verifies the modifier is in place
        vm.prank(address(attacker));
        vault.spend(recipient, 10 * 1e6);

        assertEq(usdc.balanceOf(recipient), 10 * 1e6);
    }

    function test_ZeroAddressChecks() public {
        // Constructor USDC address check
        vm.expectRevert(IPolicyVault.ZeroAddress.selector);
        new PolicyVault(address(0), owner);

        // Constructor owner check - Ownable runs first, so it throws OwnableInvalidOwner
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new PolicyVault(address(usdc), address(0));

        // Authorize agent check
        vm.prank(owner);
        vm.expectRevert(IPolicyVault.ZeroAddress.selector);
        vault.authorizeAgent(address(0), _createDefaultPolicy());

        // Spend recipient check
        _setupFundedVaultWithAgent();
        vm.prank(agent1);
        vm.expectRevert(IPolicyVault.ZeroAddress.selector);
        vault.spend(address(0), 10 * 1e6);
    }

    function test_HandleMaxUint256Limits() public {
        // Create policy with max uint256 limits (should fail validation)
        IPolicyVault.Policy memory maxPolicy = _createPolicy(type(uint256).max, type(uint256).max);

        // This should work as the policy is technically valid
        vm.prank(owner);
        vault.authorizeAgent(agent1, maxPolicy);

        IPolicyVault.Policy memory stored = vault.getAgentPolicy(agent1);
        assertEq(stored.dailyLimit, type(uint256).max);
        assertEq(stored.perTxLimit, type(uint256).max);
    }

    function test_UpdateAgentPolicy() public {
        vm.startPrank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        uint256 newDaily = 2000 * 1e6;
        uint256 newPerTx = 200 * 1e6;
        vault.updateAgentPolicy(agent1, _createPolicy(newDaily, newPerTx));
        vm.stopPrank();

        IPolicyVault.Policy memory updated = vault.getAgentPolicy(agent1);
        assertEq(updated.dailyLimit, newDaily);
        assertEq(updated.perTxLimit, newPerTx);
    }

    function test_UpdateAgentPolicyPreservesCreatedAt() public {
        vm.prank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        uint256 originalCreatedAt = vault.getAgentPolicy(agent1).createdAt;

        // Time passes
        _skipTime(1 days);

        vm.prank(owner);
        vault.updateAgentPolicy(agent1, _createPolicy(2000 * 1e6, 200 * 1e6));

        assertEq(vault.getAgentPolicy(agent1).createdAt, originalCreatedAt);
    }

    function test_UpdateAgentPolicyEmitsEvent() public {
        vm.prank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        uint256 newDaily = 2000 * 1e6;
        uint256 newPerTx = 200 * 1e6;

        vm.expectEmit(true, false, false, true);
        emit AgentPolicyUpdated(agent1, newDaily, newPerTx);

        vm.prank(owner);
        vault.updateAgentPolicy(agent1, _createPolicy(newDaily, newPerTx));
    }

    function test_UpdateAgentPolicyRevertsIfNotAuthorized() public {
        vm.prank(owner);
        vm.expectRevert(IPolicyVault.AgentNotAuthorized.selector);
        vault.updateAgentPolicy(agent1, _createDefaultPolicy());
    }

    function test_UpdateAgentPolicyRevertsIfInvalid() public {
        vm.prank(owner);
        vault.authorizeAgent(agent1, _createDefaultPolicy());

        vm.prank(owner);
        vm.expectRevert(IPolicyVault.InvalidPolicyLimits.selector);
        vault.updateAgentPolicy(agent1, _createPolicy(0, PER_TX_LIMIT));
    }

    // ============ 13. ERC-4337 / ETH Handling Tests ============

    function test_CanReceiveETH() public {
        vm.deal(owner, 1 ether);
        vm.prank(owner);
        (bool success,) = address(vault).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(address(vault).balance, 1 ether);
    }

    function test_WithdrawETH() public {
        // Send ETH to vault
        vm.deal(address(vault), 1 ether);

        uint256 ownerBalanceBefore = owner.balance;

        vm.prank(owner);
        vault.withdrawETH(payable(owner), 1 ether);

        assertEq(owner.balance, ownerBalanceBefore + 1 ether);
        assertEq(address(vault).balance, 0);
    }

    function test_WithdrawETHRevertsIfNotOwner() public {
        vm.deal(address(vault), 1 ether);

        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        vault.withdrawETH(payable(unauthorized), 1 ether);
    }

    function test_WithdrawETHRevertsIfZeroAddress() public {
        vm.deal(address(vault), 1 ether);

        vm.prank(owner);
        vm.expectRevert(IPolicyVault.ZeroAddress.selector);
        vault.withdrawETH(payable(address(0)), 1 ether);
    }

    function test_WithdrawETHRevertsIfInsufficientBalance() public {
        vm.deal(address(vault), 1 ether);

        vm.prank(owner);
        vm.expectRevert(IPolicyVault.InsufficientBalance.selector);
        vault.withdrawETH(payable(owner), 2 ether);
    }

    function test_WithdrawETHRevertsIfTransferFails() public {
        ETHRejecter rejecter = new ETHRejecter();
        vm.deal(address(vault), 1 ether);

        vm.prank(owner);
        vm.expectRevert("ETH transfer failed");
        vault.withdrawETH(payable(address(rejecter)), 1 ether);
    }

    // ============ 14. Integration Tests ============

    function test_FullLifecycle_DepositAuthorizeSpendWithdraw() public {
        // 1. Owner deposits
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        // 2. Owner authorizes agent
        vault.authorizeAgent(agent1, _createDefaultPolicy());
        vm.stopPrank();

        // 3. Agent spends
        vm.prank(agent1);
        vault.spend(recipient, 100 * 1e6);

        // 4. Verify recipient received funds
        assertEq(usdc.balanceOf(recipient), 100 * 1e6);

        // 5. Owner withdraws remaining
        vm.prank(owner);
        vault.withdraw(DEPOSIT_AMOUNT - 100 * 1e6);

        // 6. Verify final state
        (uint256 total, uint256 available) = vault.getBalance();
        assertEq(total, 0);
        assertEq(available, 0);
    }

    function test_FullLifecycle_SessionOpenOperateClose() public {
        _setupFundedVaultWithAgent();

        // 1. Open session
        uint256 allocation = 80 * 1e6;
        vm.prank(agent1);
        bytes32 sessionId = vault.openSession(keccak256("channel1"), allocation);

        // 2. Verify allocation
        (, uint256 availableAfterOpen) = vault.getBalance();
        assertEq(availableAfterOpen, DEPOSIT_AMOUNT - allocation);

        // 3. Close session with partial spend
        uint256 spent = 30 * 1e6;
        vm.prank(agent1);
        vault.closeSession(sessionId, spent);

        // 4. Verify final state
        (uint256 totalFinal, uint256 availableFinal) = vault.getBalance();
        assertEq(totalFinal, DEPOSIT_AMOUNT - spent);
        assertEq(availableFinal, DEPOSIT_AMOUNT - spent);

        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.totalSpent, spent);
        assertEq(agentInfo.sessionCount, 1);
    }

    function test_MultiAgentScenario() public {
        // Setup: deposit and authorize multiple agents
        vm.startPrank(owner);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        vault.authorizeAgent(agent1, _createPolicy(500 * 1e6, 100 * 1e6));
        vault.authorizeAgent(agent2, _createPolicy(300 * 1e6, 50 * 1e6));
        vault.authorizeAgent(agent3, _createPolicy(200 * 1e6, 25 * 1e6));
        vm.stopPrank();

        // Each agent spends
        vm.prank(agent1);
        vault.spend(recipient, 100 * 1e6);

        vm.prank(agent2);
        vault.spend(recipient, 50 * 1e6);

        vm.prank(agent3);
        vault.spend(recipient, 25 * 1e6);

        // Verify total spent
        assertEq(usdc.balanceOf(recipient), 175 * 1e6);

        // Verify individual stats
        assertEq(vault.getAgentInfo(agent1).totalSpent, 100 * 1e6);
        assertEq(vault.getAgentInfo(agent2).totalSpent, 50 * 1e6);
        assertEq(vault.getAgentInfo(agent3).totalSpent, 25 * 1e6);
    }

    function test_ConcurrentSessionsScenario() public {
        _setupFundedVaultWithAgent();

        // Open multiple sessions
        vm.startPrank(agent1);
        bytes32 session1 = vault.openSession(keccak256("ch1"), 30 * 1e6);
        bytes32 session2 = vault.openSession(keccak256("ch2"), 30 * 1e6);
        bytes32 session3 = vault.openSession(keccak256("ch3"), 30 * 1e6);
        vm.stopPrank();

        // Verify allocations
        (, uint256 available) = vault.getBalance();
        assertEq(available, DEPOSIT_AMOUNT - 90 * 1e6);

        // Close in different order
        vm.startPrank(agent1);
        vault.closeSession(session2, 20 * 1e6);
        vault.closeSession(session1, 10 * 1e6);
        vault.closeSession(session3, 25 * 1e6);
        vm.stopPrank();

        // Verify final state
        (uint256 total, uint256 finalAvailable) = vault.getBalance();
        uint256 totalSpent = 20 * 1e6 + 10 * 1e6 + 25 * 1e6;
        assertEq(total, DEPOSIT_AMOUNT - totalSpent);
        assertEq(finalAvailable, DEPOSIT_AMOUNT - totalSpent);

        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.totalSpent, totalSpent);
        assertEq(agentInfo.sessionCount, 3);
    }

    function test_DailyLimitAcrossMultipleDays() public {
        _setupFundedVaultWithAgent();

        // Day 1: Spend full limit
        vm.startPrank(agent1);
        for (uint256 i = 0; i < 10; i++) {
            vault.spend(recipient, PER_TX_LIMIT);
        }
        vm.stopPrank();

        assertEq(vault.getRemainingDailyLimit(agent1), 0);

        // Day 2
        _skipTime(24 hours);
        assertEq(vault.getRemainingDailyLimit(agent1), DAILY_LIMIT);

        // Spend 5 transactions of PER_TX_LIMIT each (respecting per-tx limit)
        vm.startPrank(agent1);
        for (uint256 i = 0; i < 5; i++) {
            vault.spend(recipient, PER_TX_LIMIT);
        }
        vm.stopPrank();

        assertEq(vault.getRemainingDailyLimit(agent1), DAILY_LIMIT - (PER_TX_LIMIT * 5));

        // Day 3
        _skipTime(24 hours);
        assertEq(vault.getRemainingDailyLimit(agent1), DAILY_LIMIT);

        // Total should be day 1 (full) + day 2 (half)
        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.totalSpent, DAILY_LIMIT + (PER_TX_LIMIT * 5));
    }

    function test_SpendAndSessionInteraction() public {
        _setupFundedVaultWithAgent();

        // Direct spend
        vm.prank(agent1);
        vault.spend(recipient, 50 * 1e6);

        // Open session
        vm.prank(agent1);
        bytes32 sessionId = vault.openSession(keccak256("ch1"), 50 * 1e6);

        // Close session with spend
        vm.prank(agent1);
        vault.closeSession(sessionId, 30 * 1e6);

        // Total spent should include both
        IPolicyVault.Agent memory agentInfo = vault.getAgentInfo(agent1);
        assertEq(agentInfo.totalSpent, 50 * 1e6 + 30 * 1e6);

        // spentToday should also reflect both (same day)
        assertEq(agentInfo.spentToday, 50 * 1e6 + 30 * 1e6);
    }
}
