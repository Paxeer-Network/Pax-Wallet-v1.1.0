// API Configuration for Paxeer Wallet
// This file centralizes all API endpoints and handles mobile/web environment differences

// Detect if running in mobile APK environment
export const isMobileApp = (): boolean => {
  return window.location.protocol === 'capacitor:' || 
         (window.location.protocol === 'https:' && (window as any).Capacitor) ||
         (window as any).isMobileApp === true;
};

// Base URLs for different environments
const WEB_BASE_URL = '';  // Relative URLs for web (same origin)
const MOBILE_BASE_URL = 'https://44fdc3fa-7083-43db-ab76-5472acf59ce2-00-2nh1as711ctbw.picard.replit.dev';

// Get the appropriate base URL
export const getBaseUrl = (): string => {
  return isMobileApp() ? MOBILE_BASE_URL : WEB_BASE_URL;
};

// API Endpoints Configuration
export const API_ENDPOINTS = {
  // Internal server routes (always go through our backend)
  SERVER: {
    ACCOUNTS: '/api/accounts',
    TRANSACTIONS: '/api/transactions', 
    LENDING_USER_DATA: (address: string) => `/api/lending/user/${address}/corrected-data`,
    REWARDS_LESSONS: '/api/rewards/lessons',
    REWARDS_DAILY_TASKS: '/api/rewards/daily-tasks',
    REWARDS_USER_PROGRESS: (address: string) => `/api/rewards/user/${address}/progress`,
    REWARDS_TRANSACTIONS: (address: string) => `/api/rewards/user/${address}/transactions`,
    OPTIONS_ASSETS: '/api/options/assets',
    OPTIONS_CHAIN: (tokenAddress: string) => `/api/options/chain/${tokenAddress}`,
    PAXEER_PROFILE: (address: string) => `/api/paxeer/address/${address}/profile`,
    PAXEER_BALANCE: (address: string) => `/api/paxeer/address/${address}/balance`,
    PAXEER_TRANSACTIONS: (address: string) => `/api/paxeer/address/${address}/transactions`,
    DEX_TOKENS: '/api/dex/tokens',
    SWAP_TRACK: '/api/swaps/track',
    SWAP_USER_TRANSACTIONS: (address: string) => `/api/swaps/${address}`,
    SWAP_USER_STATS: (address: string) => `/api/swaps/${address}/stats`,
    SWAP_GLOBAL_STATS: '/api/swaps/global/stats'
  },

  // External APIs (ALL routed through proxy to avoid CORS issues)
  EXTERNAL: {
    // PaxLend v1 API endpoints - always use proxy to avoid CORS
    LENDING_VAULTS: '/api/proxy/lending/v1/vaults',
    LENDING_USER_CREDIT: (address: string) => `/api/proxy/lending/v1/user/${address}/credit`,
    LENDING_PROTOCOL_STATS: '/api/proxy/lending/v1/protocol/stats',
    LENDING_VAULT_DETAIL: (vaultId: string) => `/api/proxy/lending/v1/vaults/${vaultId}`,
    
    // PaxDex Swap API endpoints - always use proxy to avoid CORS
    SWAP_TOKENS: '/api/proxy/swap/tokens',
    SWAP_QUOTE: '/api/proxy/swap/quote', 
    SWAP_EXECUTE: '/api/proxy/swap/execute',
    SWAP_PRICES: '/api/proxy/swap/prices',
    SWAP_ORDERBOOK: '/api/proxy/swap/orderbook',
    SWAP_TRANSACTIONS: '/api/proxy/swap/transactions',
    SWAP_PRICE_HISTORY: (tokenAddress: string) => `/api/proxy/swap/prices/${tokenAddress}/history`
  }
};

// Build full URL for any endpoint
export const buildUrl = (endpoint: string): string => {
  const baseUrl = getBaseUrl();
  // Handle absolute URLs (external APIs that aren't proxied)
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  // Handle relative URLs (our server APIs)
  return `${baseUrl}${endpoint}`;
};

// Standardized fetch configuration for mobile/web compatibility
export const getFetchConfig = (options: RequestInit = {}): RequestInit => {
  const mobile = isMobileApp();
  
  return {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(mobile && {
        'X-Mobile-App': 'true',
        'User-Agent': 'Paxeer-Wallet-Mobile/1.0'
      }),
      ...options.headers
    },
    credentials: mobile ? 'omit' : 'include',
    mode: mobile ? 'cors' : 'same-origin'
  };
};

// Wrapper for standardized API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = buildUrl(endpoint);
  const config = getFetchConfig(options);
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    throw error;
  }
};

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  isMobile: isMobileApp(),
  protocol: window.location.protocol,
  hostname: window.location.hostname,
  hasCapacitor: !!(window as any).Capacitor,
  baseUrl: getBaseUrl()
});