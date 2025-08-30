import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, DollarSign, Activity, Target, AlertTriangle, TestTube, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WalletService } from "@/lib/wallet";
import { ethers } from "ethers";

interface PaxeerOptionsProps {
  onBack: () => void;
}

interface OptionChainData {
  [expiry: string]: Array<{
    strike: number;
    call: { premium: string; iv: string };
    put: { premium: string; iv: string };
  }>;
}

interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  icon_url: string;
  value: string;
}

interface UserOption {
  id: string;
  underlyingAsset: string;
  strikePrice: string;
  expiry: number;
  optionType: number; // 0 for call, 1 for put
  premium: string;
  purchaseTime: number;
  symbol?: string;
}

const PAXEER_RPC_URL = "https://rpc-paxeer-network-djjz47ii4b.t.conduit.xyz/DgdWRnqiV7UGiMR2s9JPMqto415SW9tNG";
const OPTIONS_API_BASE = "https://options-api.paxeer.app";
const OPTIONS_VAULT_FACTORY = "0x45d33b64CD82D218Cbefcf2a3Ba57E037A1d3C4d";
const USDC_ADDRESS = "0x29e1f94f6b209b57ecdc1fe87448a6d085a78a5a";

// Token addresses and vault mappings from new API docs
const SUPPORTED_TOKENS = {
  "WBTC": { address: "0x96465d06640aff1a00888d4b9217c9eae708c419", vaultAddress: "0xD124636E2A44df7027F32D68f5117B2295320eFa" },
  "BNB": { address: "0xb947bcd6bcce03846ac716fc39a3133c4bf0108e", vaultAddress: "0x9b1D7dcEe6BbAb4EB392EA435Fb42C403d5FfF61" },
  "LINK": { address: "0x7a6ac59351dce9ce9c90e6568cb5ce25de19473c", vaultAddress: "0x7E4bA888Db4A80B333d1Bf197741ba08Bc783f78" },
  "UNI": { address: "0x90a271d104aea929b68867b3050efacbc1a28e84", vaultAddress: "0x9EB67652a43DC65f428F40b7bf8d35D11D480457" },
  "WETH": { address: "0xd0c1a714c46c364dbdd4e0f7b0b6ba5354460da7", vaultAddress: "0xF685C8d3A7E00De90413727FaDC548ED27eC909c" }
};

// Updated ABIs from new API docs
const OPTIONS_VAULT_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "underlyingAsset", "type": "address" },
          { "internalType": "uint256", "name": "strikePrice", "type": "uint256" },
          { "internalType": "uint256", "name": "expiration", "type": "uint256" },
          { "internalType": "bool", "name": "isCall", "type": "bool" }
        ],
        "internalType": "struct OptionsVault.Option",
        "name": "option",
        "type": "tuple"
      }
    ],
    "name": "buyOption",
    "outputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export function PaxeerOptions({ onBack }: PaxeerOptionsProps) {
  const [currentView, setCurrentView] = useState<"watchlist" | "options-chain" | "dashboard">("watchlist");
  const [selectedToken, setSelectedToken] = useState<SwapToken | null>(null);
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [optionType, setOptionType] = useState<"call" | "put">("call");
  const [isLoading, setIsLoading] = useState(false);
  const [showRiskDisclosure, setShowRiskDisclosure] = useState(true);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [selectedOptionType, setSelectedOptionType] = useState<"call" | "put">("call");
  const [selectedExpiryKey, setSelectedExpiryKey] = useState<string>("");
  const { toast } = useToast();

  const activeAccount = WalletService.getActiveAccount();

  // Helper function to safely format numbers
  const formatNumber = (value: string | number, decimals: number = 2): string => {
    try {
      // Convert to string first
      const str = typeof value === 'string' ? value : value.toString();
      
      // Remove any non-numeric characters except decimal point and minus
      const cleaned = str.replace(/[^0-9.-]/g, '');
      
      // Parse as float
      const num = parseFloat(cleaned);
      
      // Check if it's a valid number and within reasonable range
      if (isNaN(num) || !isFinite(num) || num > 1e10 || num < -1e10) {
        return '0.00';
      }
      
      return num.toFixed(decimals);
    } catch (error) {
      return '0.00';
    }
  };

  // Helper to get token icons (defined first)
  const getTokenIcon = (symbol: string): string => {
    const icons: { [symbol: string]: string } = {
      'WBTC': "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png",
      'BNB': "https://cryptologos.cc/logos/bnb-bnb-logo.png",
      'LINK': "https://cryptologos.cc/logos/chainlink-link-logo.png",
      'UNI': "https://cryptologos.cc/logos/uniswap-uni-logo.png",
      'WETH': "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    };
    return icons[symbol] || `https://via.placeholder.com/32?text=${symbol}`;
  };

  // Fetch supported options assets from backend (only supported tokens)
  const { data: optionsAssets = [], isLoading: tokensLoading } = useQuery<any[]>({
    queryKey: ['/api/options/assets'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch token prices and logos from DEX API (separate from options API)
  const { data: dexTokens = [], isLoading: dexLoading } = useQuery<any[]>({
    queryKey: ['/api/dex/tokens'],
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Convert options assets to token format for UI with DEX API pricing
  const tokens: SwapToken[] = optionsAssets.map((asset: any) => {
    // Find matching token from DEX API for price and logo
    const dexToken = dexTokens.find((token: any) => 
      token.symbol === asset.tokenSymbol || 
      token.address?.toLowerCase() === asset.tokenAddress?.toLowerCase()
    );
    
    return {
      address: asset.tokenAddress,
      symbol: asset.tokenSymbol,
      name: asset.tokenName,
      decimals: asset.tokenSymbol === 'WBTC' ? 8 : 
                asset.tokenSymbol === 'USDC' || asset.tokenSymbol === 'USDT' ? 6 : 
                asset.tokenSymbol === 'TON' ? 9 : 18,
      price: dexToken?.price || 0,
      icon_url: dexToken?.icon_url || asset.iconUrl || getTokenIcon(asset.tokenSymbol),
      value: dexToken?.price ? `$${dexToken.price.toFixed(4)}` : "Loading..."
    };
  });

  // Query options chain data from backend (which fetches from real API)
  const { data: rawOptionsChain = {}, isLoading: chainLoading } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/options/chain", selectedToken?.address],
    enabled: !!selectedToken?.address,
    staleTime: 1 * 60 * 1000, // Cache for 1 minute (API updates every 60 seconds)
  });

  // The backend now returns properly organized data by expiry dates
  // No need to reorganize since it's already structured correctly
  const optionChain: OptionChainData = {};
  
  if (rawOptionsChain && typeof rawOptionsChain === 'object') {
    // Convert the organized backend format to match frontend expectations
    Object.entries(rawOptionsChain).forEach(([expiryISOString, strikes]) => {
      const expiryDate = new Date(expiryISOString).toLocaleDateString();
      optionChain[expiryDate] = (strikes as any[]).map((strike: any) => ({
        strike: strike.strike,
        call: {
          premium: strike.call.premium > 0 ? strike.call.premium.toFixed(2) : "N/A",
          iv: strike.call.iv.toFixed(1)
        },
        put: {
          premium: strike.put.premium > 0 ? strike.put.premium.toFixed(2) : "N/A",
          iv: strike.put.iv.toFixed(1)
        }
      }));
    });
  }

  // Fetch user options from blockchain
  const { data: userOptions = [], isLoading: userOptionsLoading } = useQuery<UserOption[]>({
    queryKey: ["/api/options/user", activeAccount?.address],
    queryFn: async () => {
      if (!activeAccount) return [];
      
      try {
        const privateKey = WalletService.exportPrivateKey(activeAccount.address);
        if (!privateKey) return [];
        
        const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
        // Note: User options fetching will be implemented with new vault contract structure
        // For now, return empty array as this requires checking multiple vault contracts
        const userOptionsData: UserOption[] = [];
        
        // TODO: Implement user options fetching with new vault structure
        // This will require checking each vault contract for user's NFT balance
        /*
        for (const tokenInfo of Object.values(SUPPORTED_TOKENS)) {
          const vaultContract = new ethers.Contract(tokenInfo.vaultAddress, OPTIONS_VAULT_ABI, provider);
          const balance = await vaultContract.balanceOf(activeAccount.address);
          // Process each NFT...
        }
        */
        
        return userOptionsData;
      } catch (error) {
        console.error("Error connecting to blockchain:", error);
        return [];
      }
    },
    enabled: !!activeAccount && !!tokens,
    staleTime: 30000,
  });

  const handleBuyOption = async (strike: number, expiry: string, type: "call" | "put", premium: string) => {
    if (!activeAccount || !selectedToken) {
      toast({
        title: "Missing information",
        description: "Please connect wallet and select a token",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const privateKey = WalletService.exportPrivateKey(activeAccount.address);
      if (!privateKey) throw new Error("Private key not found");
      
      const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Get vault address for this token
      const tokenInfo = SUPPORTED_TOKENS[selectedToken.symbol as keyof typeof SUPPORTED_TOKENS];
      if (!tokenInfo) throw new Error("Unsupported token");
      
      // Convert expiry to timestamp
      const expiryTimestamp = Math.floor(new Date(expiry).getTime() / 1000);
      
      // Create option parameters struct
      const optionParameters = {
        underlyingAsset: tokenInfo.address,
        strikePrice: ethers.parseUnits(strike.toString(), 8), // Scale strike by 10^8
        expiration: expiryTimestamp,
        isCall: type === "call"
      };
      
      // Calculate premium in USDC (6 decimals)
      const premiumAmount = ethers.parseUnits(premium, 6);
      
      // First approve USDC spending for premium
      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
      
      // Check current allowance
      const currentAllowance = await usdcContract.allowance(activeAccount.address, tokenInfo.vaultAddress);
      if (currentAllowance < premiumAmount) {
        const approveTx = await usdcContract.approve(tokenInfo.vaultAddress, premiumAmount);
        await approveTx.wait();
        
        toast({
          title: "Approval Successful",
          description: "USDC spending approved for vault",
        });
      }
      
      // Buy option from the specific vault
      const vaultContract = new ethers.Contract(tokenInfo.vaultAddress, OPTIONS_VAULT_ABI, wallet);
      const buyTx = await vaultContract.buyOption(optionParameters);
      
      await buyTx.wait();

      toast({
        title: "Option Purchased!",
        description: `Successfully bought ${type.toUpperCase()} option for $${premium}. An NFT has been minted to your wallet.`,
      });
      
    } catch (error: any) {
      toast({
        title: "Failed to buy option",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeLeft = (expiry: number) => {
    const now = Date.now() / 1000;
    const timeLeft = expiry - now;
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const renderWatchlist = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Available Assets</h3>
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500">
          <TestTube className="w-3 h-3 mr-1" />
          BETA
        </Badge>
      </div>
      {tokensLoading || dexLoading ? (
        <div className="text-white/60 text-center py-8">Loading assets...</div>
      ) : (
        <div className="space-y-3">
          {tokens?.map((token, index) => (
            <Card key={`${token.address}-${index}`} className="bg-card-bg border-card-bg hover:bg-card-bg/80 cursor-pointer"
                  onClick={() => {
                    setSelectedToken(token);
                    setCurrentView("options-chain");
                  }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={token.icon_url} alt={token.symbol} className="w-10 h-10 rounded-full bg-white/10" 
                         onError={(e) => { e.currentTarget.src = getTokenIcon(token.symbol); }} />
                    <div>
                      <p className="text-white font-medium">{token.symbol}</p>
                      <p className="text-white/60 text-sm">{token.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">
                      {token.price > 0 ? `$${token.price.toFixed(4)}` : 'Loading...'}
                    </p>
                    <p className="text-white/60 text-sm">Available for options</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Initialize selected expiry when options chain data changes
  useEffect(() => {
    const expiryKeys = Object.keys(optionChain);
    if (!selectedExpiryKey && expiryKeys.length > 0) {
      setSelectedExpiryKey(expiryKeys[0]);
    }
  }, [optionChain, selectedExpiryKey]);

  const renderOptionsChain = () => {
    if (!selectedToken) return null;

    const expiryKeys = Object.keys(optionChain);
    const selectedStrikes = selectedExpiryKey ? optionChain[selectedExpiryKey] || [] : [];

    // Calculate breakeven and gains for display
    const calculateDisplayData = (strike: any, type: "call" | "put") => {
      const premium = parseFloat(type === "call" ? strike.call.premium : strike.put.premium);
      const strikePrice = strike.strike;
      const currentPrice = selectedToken.price;
      
      const breakeven = type === "call" ? strikePrice + premium : strikePrice - premium;
      const toBreakeven = type === "call" ? 
        ((breakeven - currentPrice) / currentPrice * 100) :
        ((currentPrice - breakeven) / currentPrice * 100);
      
      // Mock gains calculation (would be real-time in production)
      const randomGain = (Math.random() * 100 + 10).toFixed(2);
      
      return {
        breakeven: breakeven.toFixed(2),
        toBreakeven: Math.abs(toBreakeven).toFixed(2),
        gainPercent: `+${randomGain}%`,
        premium: premium.toFixed(2)
      };
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setCurrentView("watchlist")} className="text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assets
          </Button>
          <div className="text-center">
            <h2 className="text-white font-bold text-xl">{selectedToken.symbol}</h2>
            <p className="text-white/60 text-sm">Individual Account</p>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Date Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-2">
          <div className="flex space-x-1 min-w-max">
            {expiryKeys.slice(0, 6).map((expiryKey, index) => {
              const date = new Date(expiryKey);
              const isToday = date.toDateString() === new Date().toDateString();
              const displayText = isToday ? "Today" : 
                index === 0 ? "Builder" :
                date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              
              return (
                <button
                  key={expiryKey}
                  onClick={() => setSelectedExpiryKey(expiryKey)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedExpiryKey === expiryKey
                      ? "bg-green-500 text-black"
                      : "bg-gray-800 text-white/70 hover:bg-gray-700"
                  }`}
                >
                  {displayText}
                </button>
              );
            })}
          </div>
        </div>

        {/* Buy/Sell Toggle and Call/Put Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={selectedOptionType === "call" ? "default" : "outline"}
              onClick={() => setSelectedOptionType("call")}
              className={`${selectedOptionType === "call" ? "bg-white text-black" : "bg-gray-800 text-white border-gray-600"}`}
            >
              Buy
            </Button>
            <Button
              variant="outline"
              className="bg-gray-800 text-white/70 border-gray-600"
            >
              Sell
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={selectedOptionType === "call" ? "default" : "outline"}
              onClick={() => setSelectedOptionType("call")}
              className={`${selectedOptionType === "call" ? "bg-white text-black" : "bg-gray-800 text-white/70 border-gray-600"}`}
            >
              Call
            </Button>
            <Button
              variant={selectedOptionType === "put" ? "default" : "outline"}
              onClick={() => setSelectedOptionType("put")}
              className={`${selectedOptionType === "put" ? "bg-white text-black" : "bg-gray-800 text-white/70 border-gray-600"}`}
            >
              Put
            </Button>
          </div>
        </div>

        {/* Current Price Display */}
        <div className="text-center py-2">
          <div className="text-3xl font-bold text-white">${selectedToken.price.toFixed(2)}</div>
          <div className="text-green-400 text-sm">+1.54%</div>
        </div>

        {/* Options List */}
        {chainLoading ? (
          <div className="text-white/60 text-center py-8">Loading options chain...</div>
        ) : selectedStrikes.length > 0 ? (
          <div className="space-y-3">
            {selectedStrikes.slice(0, 8).map((strike, index) => {
              const displayData = calculateDisplayData(strike, selectedOptionType);
              const isInTheMoney = selectedOptionType === "call" ? 
                selectedToken.price > strike.strike : 
                selectedToken.price < strike.strike;
              
              return (
                <div key={`${selectedExpiryKey}-${strike.strike}-${index}`} 
                     className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-white font-semibold text-lg">
                          ${strike.strike} {selectedOptionType === "call" ? "Call" : "Put"}
                        </h3>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-white/60 mb-2">
                        <span>Breakeven</span>
                        <span>To Breakeven</span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-white">${displayData.breakeven}</span>
                        <span className="text-white">+{displayData.toBreakeven}%</span>
                      </div>
                      
                      <div className="mt-2">
                        <span className="text-green-400 text-sm font-medium">
                          {displayData.gainPercent} Today
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleBuyOption(strike.strike, selectedExpiryKey, selectedOptionType, displayData.premium)}
                        className="bg-green-500 hover:bg-green-600 text-black font-bold rounded-full w-16 h-16 flex items-center justify-center transition-colors"
                      >
                        <div className="text-center">
                          <div className="text-sm">${displayData.premium}</div>
                          <Plus className="w-4 h-4 mx-auto" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-white/60 text-center py-8">
            No options available for this expiry
          </div>
        )}
        
        {/* Share Price Footer */}
        {selectedStrikes.length > 0 && (
          <div className="text-center pt-4 border-t border-gray-800">
            <div className="text-white/60 text-sm">Share price: ${selectedToken.price.toFixed(2)}</div>
          </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <h3 className="text-white font-semibold text-lg">My Options Portfolio</h3>
      
      {/* Portfolio Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/20 to-secondary/20 border-card-bg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Total Invested</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">
              ${userOptions.reduce((sum, option) => sum + parseFloat(option.premium), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg border-card-bg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Active Positions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{userOptions.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg border-card-bg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Profit/Loss</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">+$42.30</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Positions */}
      <div className="space-y-3">
        <h4 className="text-white font-medium">Active Positions</h4>
        {userOptionsLoading ? (
          <div className="text-white/60 text-center py-8">Loading positions...</div>
        ) : userOptions.length > 0 ? (
          userOptions.map((option) => (
            <Card key={option.id} className="bg-card-bg border-card-bg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={option.optionType === 0 ? "default" : "secondary"}>
                        {option.optionType === 0 ? "CALL" : "PUT"}
                      </Badge>
                      <span className="text-white font-medium">{option.symbol}</span>
                      <span className="text-white/60">${option.strikePrice} Strike</span>
                    </div>
                    <p className="text-white/60 text-sm">
                      Premium Paid: ${option.premium}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center space-x-1 text-white/60">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{formatTimeLeft(option.expiry)}</span>
                    </div>
                    <p className="text-sm text-white">
                      Expires: {new Date(option.expiry * 1000).toLocaleDateString()}
                    </p>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={async () => {
                        try {
                          const privateKey = WalletService.exportPrivateKey(activeAccount!.address);
                          if (!privateKey) throw new Error("Private key not found");
                          
                          const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
                          const wallet = new ethers.Wallet(privateKey, provider);
                          // Note: Exercise functionality will be implemented with new vault structure
                          // const contract = new ethers.Contract(vaultAddress, OPTIONS_VAULT_ABI, wallet);
                          
                          // const tx = await contract.exerciseOption(option.id);
                          throw new Error("Exercise functionality not yet implemented with new API");
                          // await tx.wait();
                          
                          toast({
                            title: "Option Exercised",
                            description: "Your option has been exercised successfully!",
                          });
                        } catch (error: any) {
                          toast({
                            title: "Exercise Failed",
                            description: error.message || "Failed to exercise option",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Exercise
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-white/60 text-center py-8">
            No active positions. Start by buying your first option!
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Risk Disclosure Popup */}
      <Dialog open={showRiskDisclosure} onOpenChange={setShowRiskDisclosure}>
        <DialogContent className="bg-black border-red-500/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Options Trading Risk Disclosure
            </DialogTitle>
            <DialogDescription className="text-white/80 space-y-3">
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  <strong>BETA FEATURE:</strong> This options platform is in beta testing phase.
                </AlertDescription>
              </Alert>
              
              <div className="text-sm space-y-2">
                <p><strong>Options are extremely risky financial instruments.</strong></p>
                <p>Key risks include:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Total loss of premium paid</li>
                  <li>High volatility and leverage</li>
                  <li>Time decay (theta risk)</li>
                  <li>Implied volatility changes</li>
                  <li>Liquidity risks</li>
                  <li>Smart contract risks</li>
                </ul>
                <p className="text-red-400 font-semibold text-xs">
                  Options can expire worthless, resulting in 100% loss of invested capital.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox 
              id="risk-acceptance" 
              checked={riskAccepted}
              onCheckedChange={(checked) => setRiskAccepted(checked as boolean)}
            />
            <Label htmlFor="risk-acceptance" className="text-sm text-white">
              I understand and accept these risks
            </Label>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="border-gray-500 text-gray-300"
            >
              Go Back
            </Button>
            <Button 
              onClick={() => setShowRiskDisclosure(false)}
              disabled={!riskAccepted}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              Continue Trading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-white hover:bg-card-bg/50">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to dApps
        </Button>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-white">PaxeerOptions</h1>
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500 text-xs">
            <TestTube className="w-3 h-3 mr-1" />
            BETA
          </Badge>
        </div>
      </div>

      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card-bg">
          <TabsTrigger value="watchlist" className="text-white data-[state=active]:bg-primary">
            <Target className="w-4 h-4 mr-2" />
            Watchlist
          </TabsTrigger>
          <TabsTrigger value="options-chain" className="text-white data-[state=active]:bg-primary" disabled={!selectedToken}>
            <Activity className="w-4 h-4 mr-2" />
            Options Chain
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-primary">
            <DollarSign className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="watchlist">
          {renderWatchlist()}
        </TabsContent>

        <TabsContent value="options-chain">
          {renderOptionsChain()}
        </TabsContent>

        <TabsContent value="dashboard">
          {renderDashboard()}
        </TabsContent>
      </Tabs>
    </div>
  );
}