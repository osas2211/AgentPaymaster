// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicyVault} from "../interfaces/IPolicyVault.sol";

/**
 * @title PolicyLib
 * @author AgentPaymaster Team - HackMoney 2026
 * @notice Library containing helper functions for policy validation and spending calculations
 * @dev Used by PolicyVault for policy-related computations and validations
 */
library PolicyLib {
    /// @notice Duration of one day in seconds (24 hours)
    uint256 internal constant ONE_DAY = 24 hours;

    /**
     * @notice Validate that a policy has sensible limits
     * @param policy The policy to validate
     * @return isValid Whether the policy is valid
     * @return reason If invalid, the reason why
     */
    function validatePolicy(IPolicyVault.Policy memory policy)
        internal
        pure
        returns (bool isValid, string memory reason)
    {
        // Daily limit must be non-zero
        if (policy.dailyLimit == 0) {
            return (false, "Daily limit cannot be zero");
        }

        // Per-tx limit must be non-zero
        if (policy.perTxLimit == 0) {
            return (false, "Per-tx limit cannot be zero");
        }

        // Per-tx limit should not exceed daily limit
        if (policy.perTxLimit > policy.dailyLimit) {
            return (false, "Per-tx limit exceeds daily limit");
        }

        return (true, "");
    }

    /**
     * @notice Calculate the effective daily spent amount considering the rolling window
     * @dev Implements a rolling 24-hour window. If more than 24 hours have passed since
     *      the last spend, the daily spent resets to 0.
     * @param spentToday Current recorded daily spend
     * @param lastSpendTimestamp Timestamp of the last spend
     * @param currentTimestamp Current block timestamp
     * @return effectiveSpent The amount that should be counted against today's limit
     */
    function calculateEffectiveDailySpent(
        uint256 spentToday,
        uint256 lastSpendTimestamp,
        uint256 currentTimestamp
    ) internal pure returns (uint256 effectiveSpent) {
        // If no previous spend or more than 24 hours have passed, daily spent resets
        if (lastSpendTimestamp == 0 || currentTimestamp >= lastSpendTimestamp + ONE_DAY) {
            return 0;
        }

        // Within the 24-hour window, return the current daily spent
        return spentToday;
    }

    /**
     * @notice Check if an amount can be spent given policy limits and current state
     * @param policy The agent's policy
     * @param spentToday Amount already spent today
     * @param lastSpendTimestamp Timestamp of last spend
     * @param availableBalance Available vault balance
     * @param amount Amount to spend
     * @return canSpend Whether the spend is allowed
     * @return reason If not allowed, the reason why
     */
    function checkSpendAllowed(
        IPolicyVault.Policy memory policy,
        uint256 spentToday,
        uint256 lastSpendTimestamp,
        uint256 availableBalance,
        uint256 amount
    ) internal view returns (bool canSpend, string memory reason) {
        // Check if policy is active
        if (!policy.isActive) {
            return (false, "Agent is paused");
        }

        // Check zero amount
        if (amount == 0) {
            return (false, "Amount cannot be zero");
        }

        // Check per-transaction limit
        if (amount > policy.perTxLimit) {
            return (false, "Exceeds per-transaction limit");
        }

        // Calculate effective daily spent with rolling window
        uint256 effectiveSpent = calculateEffectiveDailySpent(spentToday, lastSpendTimestamp, block.timestamp);

        // Check daily limit
        if (effectiveSpent + amount > policy.dailyLimit) {
            return (false, "Exceeds daily limit");
        }

        // Check available balance
        if (amount > availableBalance) {
            return (false, "Insufficient vault balance");
        }

        return (true, "");
    }

    /**
     * @notice Check if a chain is allowed by the policy's chain bitmap
     * @param allowedChainsBitmap Bitmap of allowed chain IDs
     * @param chainId Chain ID to check
     * @return Whether the chain is allowed
     */
    function isChainAllowed(uint256 allowedChainsBitmap, uint256 chainId) internal pure returns (bool) {
        // If bitmap is 0, all chains are allowed
        if (allowedChainsBitmap == 0) {
            return true;
        }

        // Check if the bit for this chain ID is set
        // Only supports chain IDs 0-255 for bitmap approach
        if (chainId > 255) {
            return false;
        }

        return (allowedChainsBitmap & (1 << chainId)) != 0;
    }

    /**
     * @notice Check if a protocol address is in the whitelist
     * @param whitelist Array of allowed protocol addresses
     * @param protocol Protocol address to check
     * @return Whether the protocol is allowed
     */
    function isProtocolAllowed(address[] memory whitelist, address protocol) internal pure returns (bool) {
        // Empty whitelist means all protocols are allowed
        if (whitelist.length == 0) {
            return true;
        }

        // Check if protocol is in the whitelist
        for (uint256 i = 0; i < whitelist.length;) {
            if (whitelist[i] == protocol) {
                return true;
            }
            unchecked {
                ++i;
            }
        }

        return false;
    }

    /**
     * @notice Generate a unique session ID from channel ID, agent, and timestamp
     * @param channelId Yellow Network channel ID
     * @param agent Agent address
     * @param timestamp Current timestamp
     * @param nonce Additional nonce for uniqueness (e.g., session count)
     * @return sessionId Unique session identifier
     */
    function generateSessionId(bytes32 channelId, address agent, uint256 timestamp, uint256 nonce)
        internal
        pure
        returns (bytes32 sessionId)
    {
        return keccak256(abi.encodePacked(channelId, agent, timestamp, nonce));
    }

    /**
     * @notice Calculate remaining daily limit for an agent
     * @param dailyLimit Agent's daily limit
     * @param spentToday Amount spent today
     * @param lastSpendTimestamp Timestamp of last spend
     * @return remaining Amount remaining in daily limit
     */
    function calculateRemainingDailyLimit(uint256 dailyLimit, uint256 spentToday, uint256 lastSpendTimestamp)
        internal
        view
        returns (uint256 remaining)
    {
        uint256 effectiveSpent = calculateEffectiveDailySpent(spentToday, lastSpendTimestamp, block.timestamp);

        if (effectiveSpent >= dailyLimit) {
            return 0;
        }

        return dailyLimit - effectiveSpent;
    }
}
