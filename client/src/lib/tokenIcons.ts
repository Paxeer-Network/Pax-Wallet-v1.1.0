// Token icon mapping for Paxeer Network tokens from Paxscan API
export const TOKEN_ICONS: { [symbol: string]: string } = {
  // Major tokens with real API data
  'PAX': 'https://storage.googleapis.com/conduit-prd-apps-web-cdn/paxeer-network-djjz47ii4b-b9823b7f-e867-44ff-8ff1-631e8d36f505.png',
  'WPAX': 'https://storage.googleapis.com/conduit-prd-apps-web-cdn/paxeer-network-djjz47ii4b-b9823b7f-e867-44ff-8ff1-631e8d36f505.png',
  'WBTC': 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
  'cbBTC': 'https://coin-images.coingecko.com/coins/images/27747/large/cbBTC.png',
  'wstETH': 'https://coin-images.coingecko.com/coins/images/18834/large/wstETH.png?1696518295',
  'WETH': 'https://coin-images.coingecko.com/coins/images/2518/large/weth.png?1696503332',
  'stETH': 'https://coin-images.coingecko.com/coins/images/13442/large/steth_logo.png?1696513206',
  'wBETH': 'https://coin-images.coingecko.com/coins/images/28909/large/wbeth.png',
  'BNB': 'https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
  'SOL': 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756',
  'LINK': 'https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  'UNI': 'https://coin-images.coingecko.com/coins/images/12504/large/uniswap-logo.png?1720676669',
  'DOT': 'https://coin-images.coingecko.com/coins/images/12171/large/polkadot.png?1696512008',
  'TONCOIN': 'https://coin-images.coingecko.com/coins/images/17980/large/TON_symbol.png',
  'TON': 'https://coin-images.coingecko.com/coins/images/17980/large/photo_2024-09-10_17.09.00.jpeg?1725963446',
  'USDe': 'https://coin-images.coingecko.com/coins/images/33613/large/ethena.png',
  'USDT': 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png?1696501661',
  'USDS': 'https://coin-images.coingecko.com/coins/images/32124/large/USDS.png',
  'USDC': 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
  'CRO': 'https://coin-images.coingecko.com/coins/images/7310/large/cro_token_logo.png',
  'SHIB': 'https://coin-images.coingecko.com/coins/images/11939/large/shiba.png?1696511800',
  'PEPE': 'https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg',
};

// Contract address to icon mapping for more precise matching
export const CONTRACT_ICONS: { [address: string]: string } = {
  // WPAX
  '0x17d6592a6b27564f3d0810d79405d366a4ac69e5': 'https://storage.googleapis.com/conduit-prd-apps-web-cdn/paxeer-network-djjz47ii4b-b9823b7f-e867-44ff-8ff1-631e8d36f505.png',
  // BNB
  '0xb947bcd6bcce03846ac716fc39a3133c4bf0108e': 'https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
  // USDT
  '0x2a401fe7616c4aba69b147b4b725ce48ca7ec660': 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png?1696501661',
  // USDC
  '0x29e1f94f6b209b57ecdc1fe87448a6d085a78a5a': 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
};

// Generate token icon URL with fallbacks
export function getTokenIcon(symbol: string, contractAddress?: string): string {
  // First check for contract address mapping (most precise)
  if (contractAddress) {
    const contractIcon = CONTRACT_ICONS[contractAddress.toLowerCase()];
    if (contractIcon) {
      return contractIcon;
    }
  }
  
  // Then check for known token icons by symbol
  const knownIcon = TOKEN_ICONS[symbol.toUpperCase()];
  if (knownIcon) {
    return knownIcon;
  }

  // Fallback to data URL with token symbol
  const svg = `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="24" fill="#667eea"/>
    <text x="24" y="28" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">
      ${symbol.slice(0, 3).toUpperCase()}
    </text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Generate gradient background for tokens without icons
export function getTokenGradient(symbol: string): string {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #ff8a80 0%, #ea80fc 100%)',
    'linear-gradient(135deg, #8fd3f4 0%, #84fab0 100%)',
    'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)',
  ];
  
  // Use symbol to consistently pick a gradient
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}