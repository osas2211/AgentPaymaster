// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PolicyVault} from "../src/PolicyVault.sol";

/**
 * @title DeployPolicyVault
 * @notice Deployment script for PolicyVault contract
 * @dev Run with:
 *      forge script script/Deploy.s.sol:DeployPolicyVault \
 *        --rpc-url https://rpc.testnet.arc.network \
 *        --private-key $PRIVATE_KEY \
 *        --broadcast
 *
 *      For verification, add:
 *        --verify --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployPolicyVault is Script {
    // Arc Testnet USDC address (update if different)
    address constant ARC_TESTNET_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external returns (PolicyVault) {
        // Get deployer address from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Allow overriding USDC address via environment variable
        address usdcAddress = vm.envOr("USDC_ADDRESS", ARC_TESTNET_USDC);

        // Allow overriding owner address (defaults to deployer)
        address owner = vm.envOr("VAULT_OWNER", deployer);

        console.log("Deploying PolicyVault...");
        console.log("  Deployer:", deployer);
        console.log("  USDC Address:", usdcAddress);
        console.log("  Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        PolicyVault vault = new PolicyVault(usdcAddress, owner);

        vm.stopBroadcast();

        console.log("PolicyVault deployed at:", address(vault));
        console.log("");
        console.log("Add to frontend .env.local:");
        console.log("  NEXT_PUBLIC_POLICY_VAULT_ADDRESS=", address(vault));
        console.log("  NEXT_PUBLIC_USDC_ADDRESS=", usdcAddress);

        return vault;
    }
}

/**
 * @title DeployMockUSDC
 * @notice Deploy a mock USDC token for testing (testnet only)
 * @dev Run with:
 *      forge script script/Deploy.s.sol:DeployMockUSDC \
 *        --rpc-url https://rpc.testnet.arc.network \
 *        --private-key $PRIVATE_KEY \
 *        --broadcast
 */
contract DeployMockUSDC is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying MockUSDC...");
        console.log("  Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC();

        vm.stopBroadcast();

        console.log("MockUSDC deployed at:", address(usdc));
        console.log("");
        console.log("To mint tokens, call: usdc.mint(address, amount)");
    }
}

/**
 * @title DeployAll
 * @notice Deploy MockUSDC and PolicyVault together (for testnet)
 * @dev Run with:
 *      forge script script/Deploy.s.sol:DeployAll \
 *        --rpc-url https://rpc.testnet.arc.network \
 *        --private-key $PRIVATE_KEY \
 *        --broadcast
 */
contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== Deploying AgentPaymaster Contracts ===");
        console.log("Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // Mint some USDC to deployer for testing
        usdc.mint(deployer, 100_000 * 1e6); // 100,000 USDC
        console.log("Minted 100,000 USDC to deployer");

        // Deploy PolicyVault
        PolicyVault vault = new PolicyVault(address(usdc), deployer);
        console.log("PolicyVault deployed at:", address(vault));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("");
        console.log("Add to frontend .env.local:");
        console.log("  NEXT_PUBLIC_POLICY_VAULT_ADDRESS=", address(vault));
        console.log("  NEXT_PUBLIC_USDC_ADDRESS=", address(usdc));
    }
}

/**
 * @title MockUSDC
 * @notice Simple ERC20 mock for USDC (testnet only)
 */
contract MockUSDC {
    string public constant name = "USD Coin";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(balanceOf[from] >= amount, "Insufficient balance");
        totalSupply -= amount;
        balanceOf[from] -= amount;
        emit Transfer(from, address(0), amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");

        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
