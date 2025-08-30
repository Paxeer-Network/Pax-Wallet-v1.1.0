import { storage } from '../storage';

// API configuration - using the proper Paxeer Options API
const OPTIONS_API_BASE = 'https://options-api.paxeer.app';

// Types based on the actual API documentation
interface Quote {
  strike: number;          // USD price
  expiration: number;      // Unix timestamp in seconds
  type: 'CALL' | 'PUT';   // Option type
  bid: number;            // Bid price in USD
  ask: number;            // Ask price in USD
}

interface OptionsApiResponse {
  [symbol: string]: Quote[];  // Symbol -> array of quotes
}

// Supported tokens from the new API documentation with vault addresses
const SUPPORTED_TOKENS = [
  { name: "Wrapped BTC", symbol: "WBTC", address: "0x96465d06640aff1a00888d4b9217c9eae708c419", vaultAddress: "0xD124636E2A44df7027F32D68f5117B2295320eFa" },
  { name: "Binance Coin", symbol: "BNB", address: "0xb947bcd6bcce03846ac716fc39a3133c4bf0108e", vaultAddress: "0x9b1D7dcEe6BbAb4EB392EA435Fb42C403d5FfF61" },
  { name: "ChainLINK", symbol: "LINK", address: "0x7a6ac59351dce9ce9c90e6568cb5ce25de19473c", vaultAddress: "0x7E4bA888Db4A80B333d1Bf197741ba08Bc783f78" },
  { name: "Uniswap", symbol: "UNI", address: "0x90a271d104aea929b68867b3050efacbc1a28e84", vaultAddress: "0x9EB67652a43DC65f428F40b7bf8d35D11D480457" }, 
  { name: "Wrapped ETH", symbol: "WETH", address: "0xd0c1a714c46c364dbdd4e0f7b0b6ba5354460da7", vaultAddress: "0xF685C8d3A7E00De90413727FaDC548ED27eC909c" },
];

// Contract addresses from new API docs
const OPTIONS_VAULT_FACTORY = "0x45d33b64CD82D218Cbefcf2a3Ba57E037A1d3C4d";
const USDC_ADDRESS = "0x29e1f94f6b209b57ecdc1fe87448a6d085a78a5a";

// Vault addresses for smart contract interactions
const VAULT_ADDRESSES = {
  "WBTC": "0xD124636E2A44df7027F32D68f5117B2295320eFa",
  "BNB": "0x9b1D7dcEe6BbAb4EB392EA435Fb42C403d5FfF61", 
  "LINK": "0x7E4bA888Db4A80B333d1Bf197741ba08Bc783f78",
  "UNI": "0x9EB67652a43DC65f428F40b7bf8d35D11D480457",
  "WETH": "0xF685C8d3A7E00De90413727FaDC548ED27eC909c"
};

export class OptionsService {
  private static instance: OptionsService;
  
  static getInstance(): OptionsService {
    if (!OptionsService.instance) {
      OptionsService.instance = new OptionsService();
    }
    return OptionsService.instance;
  }

  async initializeAssets(): Promise<void> {
    console.log('Initializing supported options assets...');
    
    try {
      // Initialize only the supported tokens for options
      for (const token of SUPPORTED_TOKENS) {
        try {
          // Check if asset already exists
          const existingAsset = await storage.getOptionsAsset(token.address);
          
          if (!existingAsset) {
            await storage.createOptionsAsset({
              tokenAddress: token.address,
              tokenSymbol: token.symbol,
              tokenName: token.name,
              isActive: true,
            });
            console.log(`Created options asset for ${token.symbol} (${token.name})`);
          }
        } catch (error) {
          console.error(`Error creating asset ${token.symbol}:`, error);
        }
      }
      
      console.log('Options assets initialized successfully');
    } catch (error) {
      console.error('Failed to initialize assets:', error);
    }
  }

  async syncOptionsChains(): Promise<void> {
    console.log('Syncing options chains from Paxeer Options API...');
    
    try {
      // Log API request
      await storage.createOptionsApiLog({
        endpoint: `${OPTIONS_API_BASE}/quotes`,
        requestData: JSON.stringify({ timestamp: new Date() }),
        status: 'pending',
      });

      // Fetch from the real API endpoint
      const response = await fetch(`${OPTIONS_API_BASE}/quotes`);
      
      if (!response.ok) {
        throw new Error(`API response not ok: ${response.status}`);
      }

      const apiData: OptionsApiResponse = await response.json();
      
      // Log successful API response
      await storage.createOptionsApiLog({
        endpoint: `${OPTIONS_API_BASE}/quotes`,
        responseData: JSON.stringify(apiData).substring(0, 10000), // Limit size
        status: 'success',
      });

      console.log('API data received for symbols:', Object.keys(apiData));
      console.log('Sample API data structure:', JSON.stringify(apiData, null, 2).substring(0, 500));

      // Process each asset's quotes with new API structure
      for (const [symbol, expirationData] of Object.entries(apiData)) {
        try {
          // Find the corresponding supported token
          const token = SUPPORTED_TOKENS.find(t => t.symbol === symbol);
          if (!token) {
            console.warn(`Unknown symbol from API: ${symbol}`);
            continue;
          }

          // Get the asset from database
          const asset = await storage.getOptionsAsset(token.address);
          if (!asset) {
            console.warn(`Asset not found in database: ${symbol}`);
            continue;
          }

          // Validate expiration data structure
          if (typeof expirationData !== 'object' || expirationData === null) {
            console.error(`Invalid expiration data for ${symbol}:`, typeof expirationData);
            continue;
          }

          let totalQuotes = 0;
          
          // Process each expiration timestamp
          for (const [expirationTimestamp, categorizedData] of Object.entries(expirationData)) {
            const expiry = new Date(parseInt(expirationTimestamp) * 1000);
            
            // Process each category (atm, itm, otm)
            for (const [category, categoryData] of Object.entries(categorizedData as any)) {
              const { calls, puts } = categoryData as { calls: any[], puts: any[] };
              
              // Process calls
              if (Array.isArray(calls)) {
                for (const callQuote of calls) {
                  try {
                    if (this.isValidQuote(callQuote)) {
                      await this.processQuote(asset.id, callQuote, expiry, 'CALL');
                      totalQuotes++;
                    }
                  } catch (error) {
                    console.error(`Error processing call quote for ${symbol}:`, error);
                  }
                }
              }
              
              // Process puts
              if (Array.isArray(puts)) {
                for (const putQuote of puts) {
                  try {
                    if (this.isValidQuote(putQuote)) {
                      await this.processQuote(asset.id, putQuote, expiry, 'PUT');
                      totalQuotes++;
                    }
                  } catch (error) {
                    console.error(`Error processing put quote for ${symbol}:`, error);
                  }
                }
              }
            }
          }
          
          console.log(`Successfully processed ${totalQuotes} quotes for ${symbol}`);
        } catch (error) {
          console.error(`Error processing asset ${symbol}:`, error);
        }
      }
      
      console.log('Options chains synced successfully');
    } catch (error) {
      console.error('Error syncing options chains:', error);
      
      // Log API error
      await storage.createOptionsApiLog({
        endpoint: `${OPTIONS_API_BASE}/quotes`,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async processQuote(assetId: string, quote: any, expiry: Date, overrideType?: 'CALL' | 'PUT'): Promise<void> {
    const type = overrideType || quote.type;
    const premium = (quote.bid + quote.ask) / 2;
    
    // Check if we already have an entry for this strike/expiry
    const existingOption = await storage.getOptionsChainByStrikeAndExpiry(
      assetId,
      quote.strike.toString(),
      expiry
    );
    
    if (existingOption) {
      // Update existing record
      const updatedData = {
        assetId,
        strikePrice: quote.strike.toString(),
        expiry,
        callPremium: type === 'CALL' ? premium.toString() : existingOption.callPremium,
        putPremium: type === 'PUT' ? premium.toString() : existingOption.putPremium,
        callIv: type === 'CALL' ? '0' : existingOption.callIv, // IV not in API
        putIv: type === 'PUT' ? '0' : existingOption.putIv,
        isActive: true,
      };
      await storage.upsertOptionsChain(updatedData);
    } else {
      // Create new record
      await storage.upsertOptionsChain({
        assetId,
        strikePrice: quote.strike.toString(),
        expiry,
        callPremium: type === 'CALL' ? premium.toString() : '0',
        putPremium: type === 'PUT' ? premium.toString() : '0',
        callIv: '0', // IV not provided in API
        putIv: '0',
        isActive: true,
      });
    }
  }

  private isValidQuote(quote: any): quote is Quote {
    return (
      typeof quote.strike === 'number' &&
      typeof quote.expiration === 'number' &&
      typeof quote.bid === 'number' &&
      typeof quote.ask === 'number' &&
      (quote.type === 'CALL' || quote.type === 'PUT') &&
      quote.strike > 0 &&
      quote.bid >= 0 &&
      quote.ask >= 0 &&
      quote.ask >= quote.bid &&
      quote.expiration > Date.now() / 1000 // Future expiration
    );
  }

  async getOptionsChainForAsset(tokenAddress: string): Promise<any[]> {
    const asset = await storage.getOptionsAsset(tokenAddress);
    if (!asset) {
      return [];
    }
    
    return await storage.getOptionsChains(asset.id);
  }

  async getAllAssets(): Promise<any[]> {
    return await storage.getOptionsAssets();
  }

  // Get vault address for a token symbol
  getVaultAddress(symbol: string): string | undefined {
    const token = SUPPORTED_TOKENS.find(t => t.symbol === symbol);
    return token?.vaultAddress;
  }

  // Start periodic sync (every 60 seconds as per API docs)
  startSync(intervalSeconds: number = 60): void {
    console.log(`Starting options sync every ${intervalSeconds} seconds`);
    
    // Run initial sync
    this.syncOptionsChains();
    
    // Set up periodic sync
    setInterval(() => {
      this.syncOptionsChains();
    }, intervalSeconds * 1000);
  }
}
