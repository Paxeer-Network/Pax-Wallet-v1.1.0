// Orderbook configuration for PaxDex tokens
// Based on builders-workshop-ui orderbook patterns

interface GroupingOption {
  value: string;
  label: string;
}

interface PairOrderbookConfig {
  groupingOptions: GroupingOption[];
  // Maps grouping value (string) to nSigFigs (number or null)
  sigFigMapping: { [groupingValue: string]: number | null };
}

// --- Define Reusable Orderbook Configuration Patterns ---

const pattern5Decimal: PairOrderbookConfig = {
  groupingOptions: [
    { value: "0.00001", label: "0.00001" },
    { value: "0.0001", label: "0.0001" },
    { value: "0.001", label: "0.001" },
    { value: "0.01", label: "0.01" },
  ],
  sigFigMapping: {
    "0.00001": 5,
    "0.0001": 4,
    "0.001": 3,
    "0.01": 2,
  },
};

const pattern4Decimal: PairOrderbookConfig = {
  groupingOptions: [
    { value: "0.0001", label: "0.0001" },
    { value: "0.001", label: "0.001" },
    { value: "0.01", label: "0.01" },
    { value: "0.1", label: "0.1" },
  ],
  sigFigMapping: {
    "0.0001": 5,
    "0.001": 4,
    "0.01": 3,
    "0.1": 2,
  },
};

const pattern3Decimal: PairOrderbookConfig = {
  groupingOptions: [
    { value: "0.001", label: "0.001" },
    { value: "0.01", label: "0.01" },
    { value: "0.1", label: "0.1" },
    { value: "1", label: "1" },
  ],
  sigFigMapping: {
    "0.001": 5,
    "0.01": 4,
    "0.1": 3,
    "1": 2,
  },
};

const pattern2Decimal: PairOrderbookConfig = {
  groupingOptions: [
    { value: "0.01", label: "0.01" },
    { value: "0.1", label: "0.1" },
    { value: "1", label: "1.0" },
    { value: "10", label: "10.0" },
  ],
  sigFigMapping: {
    "0.01": 5,
    "0.1": 4,
    "1": 3,
    "10": 2,
  },
};

const pattern1Decimal: PairOrderbookConfig = {
  groupingOptions: [
    { value: "0.1", label: "0.1" },
    { value: "1", label: "1" },
    { value: "10", label: "10" },
    { value: "100", label: "100" },
  ],
  sigFigMapping: {
    "0.1": 5,
    "1": 4,
    "10": 3,
    "100": 2,
  },
};

const patternInteger: PairOrderbookConfig = {
  groupingOptions: [
    { value: "1", label: "1" },
    { value: "10", label: "10" },
    { value: "100", label: "100" },
    { value: "1000", label: "1000" },
  ],
  sigFigMapping: {
    "1": 5,
    "10": 4,
    "100": 3,
    "1000": 2,
  },
};

// Main configuration object for PaxDex tokens
// Keys are base currency names (e.g., "BTC", "ETH", "WBTC")
export const orderbookConfig: { [currency: string]: PairOrderbookConfig; default: PairOrderbookConfig } = {
  // Default configuration uses the 2-decimal pattern
  default: pattern2Decimal,

  // --- Major Cryptocurrencies ---
  BTC: patternInteger,
  WBTC: patternInteger,
  ETH: pattern1Decimal,
  WETH: pattern1Decimal,

  // --- Pattern 2 Decimal (Medium Value Assets) ---
  BNB: pattern2Decimal,
  SOL: pattern2Decimal,
  UNI: pattern2Decimal,

  // --- Pattern 3 Decimal (Lower Value Assets) ---
  DOT: pattern3Decimal,
  CRO: pattern3Decimal,

  // --- Pattern 4 Decimal (Small Value Assets) ---
  TON: pattern4Decimal,

  // --- Pattern 5 Decimal (Very Small Value Assets) ---
  // Stablecoins and very low value tokens
  USDT: pattern5Decimal,

  // --- Wrapped/Staked Versions ---
  wstETH: pattern1Decimal, // Use same as ETH
  stETH: pattern1Decimal,  // Use same as ETH

  // --- Traditional Assets (PaxDex Derivatives) ---
  SPYp: pattern2Decimal,   // S&P 500 ETF
  QQQp: pattern2Decimal,   // Nasdaq 100 ETF
  XAUp: patternInteger,    // Gold
  COINp: pattern2Decimal,  // Coinbase stock
  APPLp: pattern2Decimal,  // Apple stock
};

export type { GroupingOption, PairOrderbookConfig };
