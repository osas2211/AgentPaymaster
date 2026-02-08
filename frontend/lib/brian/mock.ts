import type { Address } from 'viem';
import type { BrianTransactionResult } from './types';

// ============================================
// Mock Brian Client — Hackathon Demo Mode
// ============================================

// Realistic contract addresses
const UNISWAP_V3_ROUTER = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' as Address;
const UNISWAP_V3_QUOTER = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' as Address;
const AAVE_V3_POOL = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2' as Address;
const AAVE_V3_GATEWAY = '0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C' as Address;
const STARGATE_ROUTER = '0x8731d54E9D02c286767d56ac03e8037C07e01e98' as Address;
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address;
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' as Address;
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address;
const LIDO_STETH = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' as Address;

// Realistic-looking calldata snippets (ERC-20 approve + swap selectors)
const APPROVE_CALLDATA = '0x095ea7b30000000000000000000000006b175474e89094c44da98b954eedeac495271d0f';
const SWAP_CALLDATA = '0x5ae401dc00000000000000000000000000000000000000000000000000000000665c2b80';
const TRANSFER_CALLDATA = '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045';
const SUPPLY_CALLDATA = '0x617ba037000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const BRIDGE_CALLDATA = '0x9fbf10fc000000000000000000000000000000000000000000000000000000000000006e';
const STAKE_CALLDATA = '0xa1903eab0000000000000000000000000000000000000000000000000000000000000000';

function randomDelay(min = 600, max = 1500): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAmount(prompt: string): string {
  const match = prompt.match(/(\d+(?:[.,]\d+)?)/);
  return match ? match[1].replace(',', '') : '100';
}

function parseAddress(prompt: string): Address | null {
  const match = prompt.match(/(0x[a-fA-F0-9]{40})/);
  return match ? (match[1] as Address) : null;
}

// Well-known addresses for "send to vitalik" style prompts
const KNOWN_NAMES: Record<string, Address> = {
  'vitalik': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address,
  'vitalik.eth': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address,
  'uniswap': '0x1a9C8182C09F50C8318d769245beA52c32BE35BC' as Address,
  'aave': '0x464C71f6c2F760DdA6093dCB91C24c39e5d6e18c' as Address,
};

function resolveRecipient(prompt: string): Address {
  const addr = parseAddress(prompt);
  if (addr) return addr;

  const lower = prompt.toLowerCase();
  for (const [name, address] of Object.entries(KNOWN_NAMES)) {
    if (lower.includes(name)) return address;
  }

  return '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
}

function detectToken(prompt: string, position: 'from' | 'to'): { symbol: string; address: Address } {
  const lower = prompt.toLowerCase();

  // "swap X [token] for [token]" pattern
  const swapMatch = lower.match(/swap\s+[\d.,]+\s*(\w+)\s+(?:for|to|into)\s+(\w+)/i);
  if (swapMatch) {
    const token = position === 'from' ? swapMatch[1] : swapMatch[2];
    return resolveToken(token);
  }

  // Default
  if (position === 'from') return { symbol: 'USDC', address: USDC };
  return { symbol: 'ETH', address: WETH };
}

function resolveToken(name: string): { symbol: string; address: Address } {
  const map: Record<string, { symbol: string; address: Address }> = {
    usdc: { symbol: 'USDC', address: USDC },
    eth: { symbol: 'ETH', address: WETH },
    weth: { symbol: 'WETH', address: WETH },
    wbtc: { symbol: 'WBTC', address: WBTC },
    btc: { symbol: 'WBTC', address: WBTC },
    dai: { symbol: 'DAI', address: DAI },
    steth: { symbol: 'stETH', address: LIDO_STETH },
  };
  return map[name.toLowerCase()] ?? { symbol: name.toUpperCase(), address: USDC };
}

function computeToAmount(fromAmount: string, fromSymbol: string, toSymbol: string): string {
  const amount = parseFloat(fromAmount);
  const rates: Record<string, Record<string, number>> = {
    USDC: { ETH: 0.000312, WETH: 0.000312, WBTC: 0.0000098, DAI: 0.999, stETH: 0.000305 },
    ETH: { USDC: 3205.50, WBTC: 0.0314, DAI: 3205.50, stETH: 0.978 },
    DAI: { USDC: 1.001, ETH: 0.000312 },
  };
  const rate = rates[fromSymbol]?.[toSymbol];
  if (rate) return (amount * rate).toFixed(toSymbol === 'WBTC' ? 6 : 4);
  return (amount * 0.95).toFixed(4); // fallback ~5% slippage look
}

// ============================================
// Mock Response Generators
// ============================================

async function mockSwap(prompt: string, address: Address): Promise<BrianTransactionResult> {
  await randomDelay(800, 1400);

  const amount = parseAmount(prompt);
  const from = detectToken(prompt, 'from');
  const to = detectToken(prompt, 'to');
  const toAmount = computeToAmount(amount, from.symbol, to.symbol);

  // Detect protocol preference
  const lower = prompt.toLowerCase();
  let protocol = 'Uniswap V3';
  let router = UNISWAP_V3_ROUTER;
  if (lower.includes('sushi')) { protocol = 'SushiSwap'; router = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F' as Address; }
  if (lower.includes('1inch') || lower.includes('inch')) { protocol = '1inch'; router = '0x1111111254EEB25477B68fb85Ed929f73A960582' as Address; }
  if (lower.includes('curve')) { protocol = 'Curve'; router = '0x99a58482BD75cbab83b27EC03CA68fF489b5788f' as Address; }

  return {
    description: `Swap ${amount} ${from.symbol} for ~${toAmount} ${to.symbol} via ${protocol} on Ethereum`,
    fromToken: from.symbol,
    toToken: to.symbol,
    fromAmount: amount,
    toAmount,
    transactions: [
      // Step 1: Approve router to spend token
      {
        to: from.address,
        value: '0',
        data: APPROVE_CALLDATA,
        chainId: 1,
        from: address,
      },
      // Step 2: Execute swap
      {
        to: router,
        value: '0',
        data: SWAP_CALLDATA,
        chainId: 1,
        from: address,
      },
    ],
    protocol,
  };
}

async function mockTransfer(prompt: string, address: Address): Promise<BrianTransactionResult> {
  await randomDelay(500, 1000);

  const amount = parseAmount(prompt);
  const recipient = resolveRecipient(prompt);
  const recipientLabel = recipient.slice(0, 6) + '...' + recipient.slice(-4);

  // Detect token — use word boundary to avoid matching "vitalik.eth" as ETH token
  const lower = prompt.toLowerCase();
  let token = 'USDC';
  let tokenAddr = USDC;
  if (/\beth\b/.test(lower) && !lower.includes('steth') && !lower.includes('.eth')) { token = 'ETH'; tokenAddr = WETH; }
  if (lower.includes('usdc')) { token = 'USDC'; tokenAddr = USDC; }
  if (lower.includes('dai')) { token = 'DAI'; tokenAddr = DAI; }

  return {
    description: `Transfer ${amount} ${token} to ${recipientLabel}`,
    fromToken: token,
    fromAmount: amount,
    transactions: [
      {
        to: tokenAddr,
        value: token === 'ETH' ? String(BigInt(Math.round(parseFloat(amount) * 1e18))) : '0',
        data: TRANSFER_CALLDATA,
        chainId: 1,
        from: address,
      },
    ],
  };
}

async function mockBridge(prompt: string, address: Address): Promise<BrianTransactionResult> {
  await randomDelay(900, 1600);

  const amount = parseAmount(prompt);
  const lower = prompt.toLowerCase();

  let destChain = 'Arbitrum';
  if (lower.includes('optimism') || lower.includes('op')) destChain = 'Optimism';
  if (lower.includes('polygon') || lower.includes('matic')) destChain = 'Polygon';
  if (lower.includes('base')) destChain = 'Base';

  let protocol = 'Stargate';
  if (lower.includes('hop')) protocol = 'Hop Protocol';
  if (lower.includes('across')) protocol = 'Across';

  return {
    description: `Bridge ${amount} USDC from Ethereum to ${destChain} via ${protocol}`,
    fromToken: 'USDC',
    toToken: 'USDC',
    fromAmount: amount,
    toAmount: amount,
    transactions: [
      {
        to: USDC,
        value: '0',
        data: APPROVE_CALLDATA,
        chainId: 1,
        from: address,
      },
      {
        to: STARGATE_ROUTER,
        value: '0',
        data: BRIDGE_CALLDATA,
        chainId: 1,
        from: address,
      },
    ],
    protocol,
  };
}

async function mockDeposit(prompt: string, address: Address): Promise<BrianTransactionResult> {
  await randomDelay(700, 1300);

  const amount = parseAmount(prompt);
  const lower = prompt.toLowerCase();

  let protocol = 'Aave V3';
  let router = AAVE_V3_POOL;
  if (lower.includes('compound')) { protocol = 'Compound V3'; router = '0xc3d688B66703497DAA19211EEdff47f25384cdc3' as Address; }
  if (lower.includes('yearn')) { protocol = 'Yearn V3'; router = '0xa258C4606Ca8206D8aA700cE2143D7db854D168c' as Address; }

  const apy = (Math.random() * 4 + 2).toFixed(2);

  return {
    description: `Supply ${amount} USDC to ${protocol} lending pool (current APY: ${apy}%)`,
    fromToken: 'USDC',
    fromAmount: amount,
    transactions: [
      {
        to: USDC,
        value: '0',
        data: APPROVE_CALLDATA,
        chainId: 1,
        from: address,
      },
      {
        to: router,
        value: '0',
        data: SUPPLY_CALLDATA,
        chainId: 1,
        from: address,
      },
    ],
    protocol,
  };
}

async function mockStake(prompt: string, address: Address): Promise<BrianTransactionResult> {
  await randomDelay(700, 1200);

  const amount = parseAmount(prompt);

  return {
    description: `Stake ${amount} ETH with Lido for stETH (current APR: 3.2%)`,
    fromToken: 'ETH',
    toToken: 'stETH',
    fromAmount: amount,
    toAmount: (parseFloat(amount) * 0.998).toFixed(4),
    transactions: [
      {
        to: LIDO_STETH,
        value: String(BigInt(Math.round(parseFloat(amount) * 1e18))),
        data: STAKE_CALLDATA,
        chainId: 1,
        from: address,
      },
    ],
    protocol: 'Lido',
  };
}

async function mockBalance(prompt: string, address: Address): Promise<BrianTransactionResult> {
  await randomDelay(300, 600);

  const addrLabel = address.slice(0, 6) + '...' + address.slice(-4);

  return {
    description: `Balance check for ${addrLabel}: 1,247.83 USDC, 0.42 ETH, 0.0015 WBTC`,
    fromToken: 'USDC',
    transactions: [],
  };
}

async function mockApprove(prompt: string, address: Address): Promise<BrianTransactionResult> {
  await randomDelay(400, 800);

  const lower = prompt.toLowerCase();
  let spender = 'Uniswap V3 Router';
  let spenderAddr = UNISWAP_V3_ROUTER;
  if (lower.includes('aave')) { spender = 'Aave V3 Pool'; spenderAddr = AAVE_V3_POOL; }

  return {
    description: `Approve ${spender} to spend USDC on your behalf`,
    fromToken: 'USDC',
    transactions: [
      {
        to: USDC,
        value: '0',
        data: APPROVE_CALLDATA,
        chainId: 1,
        from: address,
      },
    ],
  };
}

async function mockWithdraw(prompt: string, address: Address): Promise<BrianTransactionResult> {
  await randomDelay(600, 1100);

  const amount = parseAmount(prompt);

  return {
    description: `Withdraw ${amount} USDC from Aave V3 lending pool`,
    fromToken: 'USDC',
    fromAmount: amount,
    transactions: [
      {
        to: AAVE_V3_GATEWAY,
        value: '0',
        data: '0x69328dec' + '0'.repeat(56),
        chainId: 1,
        from: address,
      },
    ],
    protocol: 'Aave V3',
  };
}

// ============================================
// Main Mock Entry Point
// ============================================

/**
 * Generate a realistic mock Brian transaction based on prompt keywords.
 * Covers: swap, transfer/send, bridge, deposit/supply/lend, stake,
 * withdraw, approve, balance/check. Falls back to balance check.
 */
export async function getMockTransaction(
  prompt: string,
  address: Address,
): Promise<BrianTransactionResult> {
  const lower = prompt.toLowerCase();

  if (lower.includes('swap') || lower.includes('exchange') || lower.includes('convert'))
    return mockSwap(prompt, address);

  if (lower.includes('transfer') || lower.includes('send') || lower.includes('pay'))
    return mockTransfer(prompt, address);

  if (lower.includes('bridge') || lower.includes('cross-chain') || lower.includes('crosschain'))
    return mockBridge(prompt, address);

  if (lower.includes('deposit') || lower.includes('supply') || lower.includes('lend'))
    return mockDeposit(prompt, address);

  if (lower.includes('stake') || lower.includes('staking'))
    return mockStake(prompt, address);

  if (lower.includes('withdraw') || lower.includes('redeem'))
    return mockWithdraw(prompt, address);

  if (lower.includes('approve') || lower.includes('allowance'))
    return mockApprove(prompt, address);

  // Default: balance check
  return mockBalance(prompt, address);
}
