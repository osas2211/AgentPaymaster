import { formatUnits, parseUnits, type Address } from 'viem';
import { USDC_DECIMALS } from './constants';

// ============================================
// USDC Formatting
// ============================================

/**
 * Format USDC amount from smallest unit to display string
 * @param amount - Amount in smallest unit (6 decimals)
 * @param options - Formatting options
 * @returns Formatted string (e.g., "1,234.56")
 */
export function formatUSDC(
  amount: bigint | undefined,
  options: {
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  if (amount === undefined) return '0.00';

  const {
    showSymbol = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const formatted = formatUnits(amount, USDC_DECIMALS);
  const number = parseFloat(formatted);

  const result = new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(number);

  return showSymbol ? `${result} USDC` : result;
}

/**
 * Parse USDC display string to smallest unit
 * @param value - Display value (e.g., "1234.56")
 * @returns Amount in smallest unit
 */
export function parseUSDC(value: string): bigint {
  // Remove commas and whitespace
  const cleaned = value.replace(/,/g, '').trim();

  if (!cleaned || isNaN(parseFloat(cleaned))) {
    return BigInt(0);
  }

  return parseUnits(cleaned, USDC_DECIMALS);
}

/**
 * Validate USDC input string
 * @param value - Input string to validate
 * @returns Whether the value is a valid USDC amount
 */
export function isValidUSDCInput(value: string): boolean {
  const cleaned = value.replace(/,/g, '').trim();
  if (!cleaned) return true; // Empty is valid (user still typing)

  // Check format: optional digits, optional decimal, max 6 decimal places
  const regex = /^\d*\.?\d{0,6}$/;
  if (!regex.test(cleaned)) return false;

  const num = parseFloat(cleaned);
  return !isNaN(num) && num >= 0;
}

// ============================================
// Address Formatting
// ============================================

/**
 * Format address for display (truncated)
 * @param address - Full address
 * @param chars - Number of characters to show at start/end
 * @returns Truncated address (e.g., "0x1234...abcd")
 */
export function formatAddress(address: Address | undefined, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;

  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format address for display with ENS name if available
 * @param address - Full address
 * @param ensName - Optional ENS name
 * @returns ENS name or truncated address
 */
export function formatAddressOrENS(
  address: Address | undefined,
  ensName?: string | null
): string {
  if (ensName) return ensName;
  return formatAddress(address);
}

// ============================================
// Number Formatting
// ============================================

/**
 * Format a number with compact notation (K, M, B)
 * @param value - Number to format
 * @returns Formatted string (e.g., "1.2K", "3.4M")
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format percentage
 * @param value - Percentage value (e.g., 99.9)
 * @param decimals - Number of decimal places
 * @returns Formatted string (e.g., "99.9%")
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format gas amount in Gwei
 * @param wei - Amount in wei
 * @returns Formatted string (e.g., "25.5 Gwei")
 */
export function formatGwei(wei: bigint): string {
  const gwei = Number(wei) / 1e9;
  return `${gwei.toFixed(2)} Gwei`;
}

/**
 * Format USD amount
 * @param value - USD value
 * @param options - Formatting options
 * @returns Formatted string (e.g., "$1,234.56")
 */
export function formatUSD(
  value: number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

// ============================================
// Time Formatting
// ============================================

/**
 * Format timestamp to relative time
 * @param timestamp - Unix timestamp in seconds
 * @returns Relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return new Date(timestamp * 1000).toLocaleDateString();
}

/**
 * Format timestamp to date/time string
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date/time string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
