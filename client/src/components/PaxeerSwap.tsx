import { useState, useEffect, JSXElementConstructor, ReactElement, ReactNode, ReactPortal } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  ArrowDownUp, 
  Settings, 
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  BarChart3,
  Repeat,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WalletService } from "@/lib/wallet";
import { ethers } from "ethers";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from "recharts";
import { lazy, Suspense } from "react";
import { API_ENDPOINTS, apiCall } from "@/config/api";
import { TradeStreamProvider } from "@/lib/trade-stream-context";

// Advanced Trading Components - Mobile Optimized (Vite-compatible lazy loading)
const TradingViewWidget = lazy(() => import('./trading/MobileTradingChart'));
const OrderBookWidget = lazy(() => import('./trading/MobileOrderBook'));

// Constants - PaxDex Protocol Integration (Use Proxy Routes)
const VAULT_ADDRESS = "0x49B0f9a0554da1A7243A9C8ac5B45245A66D90ff";
const PAXEER_RPC_URL = "https://rpc-paxeer-network-djjz47ii4b.t.conduit.xyz/DgdWRnqiV7UGiMR2s9JPMqto415SW9tNG";
const SWAP_FEE_BPS = 30; // 0.3% fee as per PaxDex API
const BPS_DENOMINATOR = 10000;

// Types - Updated for new PaxDex API format
interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  image: string;
  rank: number;
}

interface SwapQuote {
  amountIn: string;
  amountOut: string;
  fee: string;
}

interface SwapTransaction {
  transactionHash: string;
  timestamp: string;
  user: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
}

interface UserSwap {
  id: string;
  userAddress: string;
  transactionHash: string;
  tokenInAddress: string;
  tokenInSymbol: string;
  tokenOutAddress: string;
  tokenOutSymbol: string;
  amountIn: string;
  amountOut: string;
  usdValueIn: string;
  usdValueOut: string;
  feeAmount: string;
  feeUsd: string;
  gasUsed: string;
  gasPrice: string;
  blockNumber: string;
  timestamp: string;
  createdAt: string;
}

interface SwapStats {
  totalVolume: number;
  totalSwaps: number;
  totalFees: number;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

interface PaxeerSwapProps {
  onBack: () => void;
}

// Format market cap with abbreviations
function formatMarketCap(marketCap: number) {
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(1)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(1)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(1)}M`;
  } else if (marketCap >= 1e3) {
    return `$${(marketCap / 1e3).toFixed(1)}K`;
  } else {
    return `$${marketCap.toFixed(2)}`;
  }
}

// ABI fragments
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)"
];

const VAULT_ABI = [
  "function swapExactTokensForTokens(address _tokenIn, address _tokenOut, uint256 _amountIn, uint256 _minAmountOut) external",
  "function SWAP_FEE_BPS() external view returns (uint256)",
  "function BPS_DENOMINATOR() external view returns (uint256)"
];

export function PaxeerSwap({ onBack }: PaxeerSwapProps) {
  const [activeView, setActiveView] = useState<"swap" | "watchlist" | "dashboard" | "trading">("swap");
  const [selectedTokenDetail, setSelectedTokenDetail] = useState<SwapToken | null>(null);
  const [fromToken, setFromToken] = useState<SwapToken | null>(null);
  const [toToken, setToToken] = useState<SwapToken | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [slippage, setSlippage] = useState("1.0");
  const [showRiskDisclaimer, setShowRiskDisclaimer] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState<"from" | "to" | null>(null);
  const [pendingQuote, setPendingQuote] = useState<SwapQuote | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showAdvancedTrading, setShowAdvancedTrading] = useState(false);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [tradingPair, setTradingPair] = useState('BTC/USDC');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeAccount = WalletService.getActiveAccount();

  // Fetch available tokens from PaxDex API via server proxy
  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ["swap/tokens"],
    queryFn: async () => {
      const response = await apiCall(API_ENDPOINTS.EXTERNAL.SWAP_TOKENS);
      const result = await response.json();
      return result.data || [];
    },
  });

  // Enhanced user swap statistics
  const { data: userSwapStats } = useQuery({
    queryKey: ["swap/user-stats", activeAccount?.address],
    queryFn: async () => {
      if (!activeAccount) return null;
      const response = await apiCall(`/api/proxy/swap/user/${activeAccount.address}/stats`);
      const result = await response.json();
      return result.data;
    },
    enabled: !!activeAccount,
  });

  // Fetch user's swap history
  const { data: userSwaps } = useQuery({
    queryKey: ["swap/transactions", activeAccount?.address],
    queryFn: async () => {
      if (!activeAccount) return [];
      const response = await apiCall(API_ENDPOINTS.SERVER.SWAP_USER_TRANSACTIONS(activeAccount.address));
      return await response.json();
    },
    enabled: !!activeAccount,
  });

  // Swap tracking queries
  const { data: globalSwapStats } = useQuery<SwapStats>({
    queryKey: ["swaps/global/stats"],
    staleTime: 60000,
  });

  // Update trading pair when tokens change
  useEffect(() => {
    if (fromToken && toToken) {
      setTradingPair(`${fromToken.symbol}/USDC`);
    }
  }, [fromToken, toToken]);

  // Simple price-based estimation for display
  useEffect(() => {
    if (fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0) {
      // Simple price-based estimation
      const inputValue = parseFloat(fromAmount) * fromToken.price;
      const outputAmount = inputValue / toToken.price;
      const formattedAmount = outputAmount.toFixed(6);
      setToAmount(formattedAmount);
    } else {
      setToAmount("");
    }
  }, [fromToken, toToken, fromAmount]);

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount("");
  };

  const toggleWatchlist = (tokenAddress: string) => {
    setWatchlist(prev => 
      prev.includes(tokenAddress) 
        ? prev.filter(addr => addr !== tokenAddress)
        : [...prev, tokenAddress]
    );
  };

  // Calculate fee using new PaxDex protocol fee structure
  const calculateFee = (amountIn: string, tokenDecimals: number) => {
    const amount = ethers.parseUnits(amountIn, tokenDecimals);
    const fee = (amount * BigInt(SWAP_FEE_BPS)) / BigInt(BPS_DENOMINATOR);
    return ethers.formatUnits(fee, tokenDecimals);
  };

  // Advanced PaxDex Trading - Market Order Execution
  const executeSwapMutation = useMutation({
    mutationFn: async (swapData: {
      fromToken: SwapToken;
      toToken: SwapToken;
      fromAmount: string;
      toAmount: string;
      slippage: string;
      orderType?: 'market' | 'limit';
    }) => {
      const { fromToken, toToken, fromAmount, slippage, orderType = 'market' } = swapData;
      
      if (!activeAccount) {
        throw new Error("No active account");
      }

      // Enhanced trading with PaxDex professional features
      const slippagePercent = parseFloat(slippage);
      const expectedOutput = parseFloat(toAmount);
      const minOutput = expectedOutput * (1 - slippagePercent / 100);

      const tradeRequest = {
        tokenIn: fromToken.address,
        tokenOut: toToken.address,
        amountIn: ethers.parseUnits(fromAmount, fromToken.decimals).toString(),
        minAmountOut: ethers.parseUnits(minOutput.toString(), toToken.decimals).toString(),
        recipient: activeAccount.address,
        slippageBps: Math.floor(slippagePercent * 100),
        orderType,
        timestamp: Date.now(),
        userAgent: navigator.userAgent.includes('Mobile') ? 'mobile-wallet' : 'web-wallet'
      };

      // Use PaxDex trading API for enhanced execution via proxy
      const response = await apiCall(API_ENDPOINTS.EXTERNAL.SWAP_EXECUTE, {
        method: "POST",
        headers: {
          "X-Wallet-Type": "paxeer-mobile"
        },
        body: JSON.stringify(tradeRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Trade execution failed");
      }

      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Executed Successfully",
        description: `Tx: ${data.txHash?.slice(0, 10)}...`,
      });
      setFromAmount("");
      setToAmount("");
      // Refresh all trading data
      queryClient.invalidateQueries({ queryKey: ["swap/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["swap/prices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Trade Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch price history for selected token
  const { data: priceHistory, isLoading: priceHistoryLoading } = useQuery({
    queryKey: ["swap/prices/history", selectedTokenDetail?.address],
    queryFn: async () => {
      if (!selectedTokenDetail) return [];
      const response = await apiCall(`${API_ENDPOINTS.EXTERNAL.SWAP_PRICE_HISTORY(selectedTokenDetail.address)}?timeframe=24h&limit=24`);
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!selectedTokenDetail,
  });

  // Format price history for chart
  const chartData = priceHistory?.map((point: PricePoint) => ({
    time: new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    price: point.price
  })) || [];

  const handleInitiateSwap = () => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      toast({
        title: "Missing information",
        description: "Please select tokens and enter amount",
        variant: "destructive",
      });
      return;
    }
    setShowRiskDisclaimer(true);
  };

  const executeSwap = async () => {
    if (!activeAccount || !fromToken || !toToken || !fromAmount) return;

    try {
      const privateKey = WalletService.exportPrivateKey(activeAccount.address);
      if (!privateKey) throw new Error("Private key not found");

      const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
      const wallet = new ethers.Wallet(privateKey, provider);
      const amountInWei = ethers.parseUnits(fromAmount, fromToken.decimals);
      
      // Calculate minimum amount out based on slippage tolerance
      const expectedAmountOut = ethers.parseUnits(toAmount, toToken.decimals);
      const slippageBps = Math.floor(parseFloat(slippage) * 100);
      const minAmountOut = (expectedAmountOut * BigInt(10000 - slippageBps)) / BigInt(10000);

      // Check allowance and approve if needed
      const tokenContract = new ethers.Contract(fromToken.address, ERC20_ABI, wallet);
      const allowance = await tokenContract.allowance(wallet.address, VAULT_ADDRESS);
      
      if (allowance < amountInWei) {
        toast({ title: "Approving token...", description: "Please confirm the approval transaction" });
        const approveTx = await tokenContract.approve(VAULT_ADDRESS, amountInWei);
        await approveTx.wait();
      }

      // Execute swap with proper gas estimation
      toast({ title: "Executing swap...", description: "Please confirm the swap transaction" });
      const vaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);
      
      // Estimate gas first
      const estimatedGas = await vaultContract.swapExactTokensForTokens.estimateGas(
        fromToken.address,
        toToken.address,
        amountInWei,
        minAmountOut
      );
      
      // Add 20% buffer to gas estimate
      const gasLimit = (estimatedGas * BigInt(120)) / BigInt(100);
      
      const swapTx = await vaultContract.swapExactTokensForTokens(
        fromToken.address,
        toToken.address,
        amountInWei,
        minAmountOut,
        { gasLimit }
      );
      
      const receipt = await swapTx.wait();
      
      // Track the swap in our database
      try {
        const feeAmount = (BigInt(amountInWei) * BigInt(SWAP_FEE_BPS)) / BigInt(BPS_DENOMINATOR);
        const usdValueIn = parseFloat(fromAmount) * fromToken.price;
        const usdValueOut = parseFloat(toAmount) * toToken.price;
        const feeUsd = parseFloat(ethers.formatUnits(feeAmount, fromToken.decimals)) * fromToken.price;
        
        const swapData = {
          userAddress: activeAccount.address,
          transactionHash: swapTx.hash,
          tokenInAddress: fromToken.address,
          tokenInSymbol: fromToken.symbol,
          tokenOutAddress: toToken.address,
          tokenOutSymbol: toToken.symbol,
          amountIn: fromAmount,
          amountOut: toAmount,
          usdValueIn: usdValueIn.toString(),
          usdValueOut: usdValueOut.toString(),
          feeAmount: ethers.formatUnits(feeAmount, fromToken.decimals),
          feeUsd: feeUsd.toString(),
          gasUsed: receipt.gasUsed?.toString() || "0",
          gasPrice: receipt.gasPrice?.toString() || "0",
          blockNumber: receipt.blockNumber?.toString() || "0",
          timestamp: new Date().toISOString(),
        };
        
        await apiCall(API_ENDPOINTS.SERVER.SWAP_TRACK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(swapData),
        });
      } catch (trackingError) {
        console.error("Failed to track swap:", trackingError);
        // Don't fail the whole operation if tracking fails
      }
      
      toast({
        title: "Swap successful!",
        description: `Swapped ${fromAmount} ${fromToken.symbol} for ${toToken.symbol}`,
      });
      
      // Reset form
      setFromAmount("");
      setToAmount("");
      setShowRiskDisclaimer(false);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["swap/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["paxeer/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["paxeer/tokentransfers"] });
      
    } catch (error) {
      console.error("Swap failed:", error);
      toast({
        title: "Swap failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Render token detail page
  if (selectedTokenDetail) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedTokenDetail(null)} className="text-white hover:bg-card-bg/50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="ghost" onClick={() => toggleWatchlist(selectedTokenDetail.address)} className="text-white hover:bg-card-bg/50">
            <Star className={`w-4 h-4 ${watchlist.includes(selectedTokenDetail.address) ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
        </div>

        {/* Token Header */}
        <div className="bg-card-bg rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <img src={selectedTokenDetail.image} alt={selectedTokenDetail.symbol} className="w-16 h-16 rounded-full" />
            <div className="flex-1">
              <h2 className="text-white text-2xl font-bold">{selectedTokenDetail.name}</h2>
              <div className="flex items-center space-x-2">
                <p className="text-white/60 text-lg">{selectedTokenDetail.symbol}</p>
                <Badge variant="secondary" className="text-xs">
                  Rank #{selectedTokenDetail.rank}
                </Badge>
              </div>
            </div>
          </div>

          {/* Price and Change */}
          <div className="space-y-2">
            <div className="flex items-baseline space-x-3">
              <span className="text-white text-3xl font-bold">${selectedTokenDetail.price.toFixed(6)}</span>
              <div className={`flex items-center space-x-1 ${selectedTokenDetail.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {selectedTokenDetail.priceChange24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {selectedTokenDetail.priceChange24h >= 0 ? '+' : ''}{selectedTokenDetail.priceChange24h?.toFixed(2) || 0}%
                </span>
              </div>
            </div>
            <p className="text-white/60 text-sm">24h change</p>
          </div>
        </div>

        {/* Price Chart */}
        <div className="bg-card-bg rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-lg font-semibold">Price Chart (24h)</h3>
            <BarChart3 className="w-5 h-5 text-white/60" />
          </div>
          
          {priceHistoryLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="text-white/60">Loading chart data...</div>
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="time" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={['dataMin - 0.1', 'dataMax + 0.1']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickFormatter={(value) => `$${value.toFixed(3)}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke={selectedTokenDetail.priceChange24h >= 0 ? "#10B981" : "#EF4444"}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: selectedTokenDetail.priceChange24h >= 0 ? "#10B981" : "#EF4444" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <div className="text-white/60">No chart data available</div>
            </div>
          )}
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card-bg rounded-xl p-4">
            <p className="text-white/60 text-sm mb-1">Market Cap</p>
            <p className="text-white text-lg font-bold">
              {selectedTokenDetail.marketCap ? formatMarketCap(selectedTokenDetail.marketCap) : 'N/A'}
            </p>
          </div>
          <div className="bg-card-bg rounded-xl p-4">
            <p className="text-white/60 text-sm mb-1">24h Volume</p>
            <p className="text-white text-lg font-bold">
              {selectedTokenDetail.volume24h ? formatMarketCap(selectedTokenDetail.volume24h) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Contract Information */}
        <div className="bg-card-bg rounded-xl p-6 space-y-4">
          <h3 className="text-white text-lg font-semibold">Token Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/60">Contract Address</span>
              <div className="flex items-center space-x-2">
                <span className="text-white font-mono text-sm">
                  {`${selectedTokenDetail.address.slice(0, 6)}...${selectedTokenDetail.address.slice(-4)}`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(selectedTokenDetail.address)}
                  className="text-white/60 hover:text-white p-1 h-auto"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Decimals</span>
              <span className="text-white">{selectedTokenDetail.decimals}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Network</span>
              <span className="text-white">Paxeer Network</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={() => {
              setFromToken(selectedTokenDetail);
              setSelectedTokenDetail(null);
              setActiveView("swap");
            }}
            className="w-full bg-primary hover:bg-primary/90 text-white"
          >
            Buy {selectedTokenDetail.symbol}
          </Button>
          <Button 
            onClick={() => {
              setToToken(selectedTokenDetail);
              setSelectedTokenDetail(null);
              setActiveView("swap");
            }}
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            Sell {selectedTokenDetail.symbol}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-white hover:bg-card-bg/50">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Browser
        </Button>
        <h2 className="text-white text-xl font-bold">PaxeerSwap</h2>
        <div className="w-20" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-card-bg">
          <TabsTrigger value="swap" className="data-[state=active]:bg-primary">Swap</TabsTrigger>
          <TabsTrigger value="trading" className="data-[state=active]:bg-primary">Trade</TabsTrigger>
          <TabsTrigger value="watchlist" className="data-[state=active]:bg-primary">Watchlist</TabsTrigger>
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary">Dashboard</TabsTrigger>
        </TabsList>

        {/* Swap Tab */}
        <TabsContent value="swap" className="space-y-4">
          <div className="bg-card-bg rounded-xl p-6 space-y-4">
            {/* From Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-white/80 text-sm">From</label>
                <span className="text-white/60 text-xs">Balance: {fromToken ? "0.00" : "Select token"}</span>
              </div>
              <div className="flex space-x-2">
                <Input
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.0"
                  className="bg-card-bg/50 text-white border-card-bg flex-1"
                  data-testid="input-from-amount"
                  type="number"
                  step="any"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowTokenSelector("from")}
                  className="border-card-bg text-white hover:bg-card-bg/80 min-w-[120px]"
                  data-testid="button-select-from-token"
                >
                  {fromToken ? (
                    <div className="flex items-center space-x-2">
                      <img src={fromToken.image} alt={fromToken.symbol} className="w-5 h-5 rounded-full" />
                      <span>{fromToken.symbol}</span>
                    </div>
                  ) : (
                    "Select Token"
                  )}
                </Button>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwapTokens}
                className="text-white hover:bg-card-bg/50 rounded-full p-2"
                data-testid="button-swap-tokens"
              >
                <ArrowDownUp className="w-4 h-4" />
              </Button>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-white/80 text-sm">To</label>
                <span className="text-white/60 text-xs">Balance: {toToken ? "0.00" : "Select token"}</span>
              </div>
              <div className="flex space-x-2">
                <Input
                  value={toAmount}
                  readOnly
                  placeholder="0.0"
                  className="bg-card-bg/50 text-white border-card-bg flex-1 cursor-not-allowed"
                  data-testid="input-to-amount"
                  type="number"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowTokenSelector("to")}
                  className="border-card-bg text-white hover:bg-card-bg/80 min-w-[120px]"
                  data-testid="button-select-to-token"
                >
                  {toToken ? (
                    <div className="flex items-center space-x-2">
                      <img src={toToken.image} alt={toToken.symbol} className="w-5 h-5 rounded-full" />
                      <span>{toToken.symbol}</span>
                    </div>
                  ) : (
                    "Select Token"
                  )}
                </Button>
              </div>
            </div>

            {/* Market Order Notice */}
            <div className="flex items-center justify-between bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm font-medium">Market Order</span>
              </div>
              <span className="text-orange-300 text-xs">No slippage protection</span>
            </div>

            {/* Quote Info */}
            {fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && (
              <div className="bg-card-bg/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Expected Amount</span>
                  <span className="text-white">
                    {(() => {
                      const inputAmount = parseFloat(fromAmount);
                      const expectedOutput = (inputAmount * fromToken.price) / toToken.price;
                      return `${expectedOutput.toFixed(6)} ${toToken.symbol}`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Expected Value</span>
                  <span className="text-white">
                    ${(parseFloat(fromAmount) * fromToken.price).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Cost per {toToken.symbol}</span>
                  <span className="text-white">
                    ${toToken.price.toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Protocol Fee (0.3%)</span>
                  <span className="text-white">
                    ${(parseFloat(fromAmount) * fromToken.price * 0.003).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Network Fee</span>
                  <span className="text-white">
                    ~$0.01
                  </span>
                </div>
              </div>
            )}

            {/* Swap Button */}
            <Button
              onClick={handleInitiateSwap}
              disabled={!fromToken || !toToken || !fromAmount || parseFloat(fromAmount || "0") <= 0}
              className="w-full bg-primary hover:bg-primary/90 text-white"
              data-testid="button-initiate-swap"
            >
              Swap
            </Button>
          </div>
        </TabsContent>

        {/* Advanced Trading Tab */}
        <TabsContent value="trading" className="space-y-4">
          {/* Trading Chart */}
          <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
            <TradingViewWidget symbol={tradingPair} />
          </Suspense>
          
          {/* Order Book */}
          <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-lg" />}>
            <TradeStreamProvider baseCurrency={fromToken?.symbol || 'BTC'} initialGrouping="1" key={fromToken?.symbol || 'BTC'}>
              <OrderBookWidget symbol={tradingPair} baseCurrency={fromToken?.symbol || 'BTC'} grouping="1" />
            </TradeStreamProvider>
          </Suspense>
          
          {/* Professional Trading Interface */}
          <div className="bg-card-bg rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Professional Trading</h3>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant={orderType === 'market' ? 'default' : 'outline'}
                  onClick={() => setOrderType('market')}
                  className="text-xs"
                >
                  Market
                </Button>
                <Button
                  size="sm"
                  variant={orderType === 'limit' ? 'default' : 'outline'}
                  onClick={() => setOrderType('limit')}
                  className="text-xs"
                  disabled
                >
                  Limit (Soon)
                </Button>
              </div>
            </div>

            
            {/* From Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-white/80 text-sm">Sell</label>
                <span className="text-white/60 text-xs">Balance: {fromToken ? "0.00" : "Select token"}</span>
              </div>
              <div className="flex space-x-2">
                <Input
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.0"
                  className="bg-card-bg/50 text-white border-card-bg flex-1"
                  type="number"
                  step="any"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowTokenSelector("from")}
                  className="border-card-bg text-white hover:bg-card-bg/80 min-w-[120px]"
                >
                  {fromToken ? (
                    <div className="flex items-center space-x-2">
                      <img src={fromToken.image} alt={fromToken.symbol} className="w-5 h-5 rounded-full" />
                      <span>{fromToken.symbol}</span>
                    </div>
                  ) : (
                    "Select Token"
                  )}
                </Button>
              </div>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-white/80 text-sm">Buy</label>
                <span className="text-white/60 text-xs">Balance: {toToken ? "0.00" : "Select token"}</span>
              </div>
              <div className="flex space-x-2">
                <Input
                  value={toAmount}
                  readOnly
                  placeholder="0.0"
                  className="bg-card-bg/50 text-white border-card-bg flex-1 cursor-not-allowed"
                  type="number"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowTokenSelector("to")}
                  className="border-card-bg text-white hover:bg-card-bg/80 min-w-[120px]"
                >
                  {toToken ? (
                    <div className="flex items-center space-x-2">
                      <img src={toToken.image} alt={toToken.symbol} className="w-5 h-5 rounded-full" />
                      <span>{toToken.symbol}</span>
                    </div>
                  ) : (
                    "Select Token"
                  )}
                </Button>
              </div>
            </div>

            {/* Advanced Trading Info */}
            {fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && (
              <div className="bg-black/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-orange-400 text-sm font-medium flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Market Order - Instant Execution
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/60 block">Expected Output</span>
                    <span className="text-white font-medium">
                      {(() => {
                        const inputAmount = parseFloat(fromAmount);
                        const expectedOutput = (inputAmount * fromToken.price) / toToken.price;
                        return `${expectedOutput.toFixed(6)} ${toToken.symbol}`;
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60 block">Trade Value</span>
                    <span className="text-white font-medium">
                      ${(parseFloat(fromAmount) * fromToken.price).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60 block">Price per {toToken.symbol}</span>
                    <span className="text-white font-medium">
                      ${toToken.price.toFixed(6)}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60 block">Total Fees</span>
                    <span className="text-white font-medium">
                      ${((parseFloat(fromAmount) * fromToken.price * 0.003) + 0.01).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Execute Trade Button */}
            <Button
              onClick={handleInitiateSwap}
              disabled={!fromToken || !toToken || !fromAmount || parseFloat(fromAmount || "0") <= 0}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              {orderType === 'market' ? 'Execute Market Order' : 'Place Limit Order'}
            </Button>
          </div>
        </TabsContent>

        {/* Watchlist Tab */}
        <TabsContent value="watchlist" className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Available Tokens</h3>
            {tokensLoading ? (
              <div className="text-white/60 text-center py-8">Loading tokens...</div>
            ) : (
              <div className="space-y-2">
                {tokens?.map((token: SwapToken, index: number) => (
                  <div
                    key={`${token.address}-${index}-${token.symbol}`}
                    className="bg-card-bg rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-card-bg/80"
                    onClick={() => setSelectedTokenDetail(token)}
                    data-testid={`token-item-${token.symbol}-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <img src={token.image} alt={token.symbol} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="text-white font-medium">{token.symbol}</p>
                        <p className="text-white/60 text-sm">{token.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-white font-medium">${token.price.toFixed(6)}</p>
                        <p className="text-white/60 text-sm">
                          Market Cap: {formatMarketCap(token.marketCap || 0)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(token.address);
                        }}
                        className="text-white hover:bg-card-bg/50"
                        data-testid={`button-watchlist-${token.symbol}-${index}`}
                      >
                        <Star className={`w-4 h-4 ${watchlist.includes(token.address) ? "fill-yellow-400 text-yellow-400" : ""}`} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* Global Platform Stats */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Platform Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card-bg rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-white/80 text-sm">Global Volume</span>
                </div>
                <p className="text-white text-2xl font-bold">
                  {globalSwapStats ? formatMarketCap(globalSwapStats.totalVolume) : "$0.00"}
                </p>
                <p className="text-green-400 text-sm">All time</p>
              </div>

              <div className="bg-card-bg rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span className="text-white/80 text-sm">Total Swaps</span>
                </div>
                <p className="text-white text-2xl font-bold">
                  {globalSwapStats ? globalSwapStats.totalSwaps?.toLocaleString() : "0"}
                </p>
                <p className="text-blue-400 text-sm">All time</p>
              </div>

              <div className="bg-card-bg rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-purple-400" />
                  <span className="text-white/80 text-sm">Total Fees</span>
                </div>
                <p className="text-white text-2xl font-bold">
                  {globalSwapStats ? formatMarketCap(globalSwapStats.totalFees) : "$0.00"}
                </p>
                <p className="text-purple-400 text-sm">Collected</p>
              </div>
            </div>
          </div>

          {/* Personal Stats */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Your Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card-bg rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-white/80 text-sm">Your Volume</span>
                </div>
                <p className="text-white text-2xl font-bold">
                  {userSwapStats ? formatMarketCap(userSwapStats.totalVolume) : "$0.00"}
                </p>
                <p className="text-green-400 text-sm">Personal volume</p>
              </div>

              <div className="bg-card-bg rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span className="text-white/80 text-sm">Your Swaps</span>
                </div>
                <p className="text-white text-2xl font-bold">
                  {userSwapStats ? userSwapStats.totalSwaps?.toLocaleString() : "0"}
                </p>
                <p className="text-white/60 text-sm">Personal swaps</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Your Recent Swaps</h3>
            <div className="bg-card-bg rounded-xl p-4">
              {userSwaps && userSwaps.length > 0 ? (
                <div className="space-y-3">
                  {userSwaps.slice(0, 10).map((swap: { transactionHash: any; amountIn: string; tokenInSymbol: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; amountOut: string; tokenOutSymbol: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; timestamp: string | number | Date; usdValueIn: string; }, index: any) => (
                    <div key={`${swap.transactionHash}-${index}`} className="flex items-center justify-between border-b border-card-bg/50 pb-3">
                      <div className="flex items-center space-x-3">
                        <Repeat className="w-4 h-4 text-accent" />
                        <div>
                          <p className="text-white text-sm font-medium">
                            Swap {parseFloat(swap.amountIn).toFixed(6)} {swap.tokenInSymbol} → {parseFloat(swap.amountOut).toFixed(6)} {swap.tokenOutSymbol}
                          </p>
                          <p className="text-white/60 text-xs">
                            {new Date(swap.timestamp).toLocaleDateString()} • ${parseFloat(swap.usdValueIn).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white"
                        onClick={() => window.open(`https://paxscan.paxeer.app/tx/${swap.transactionHash}`, '_blank')}
                        data-testid={`button-view-swap-${index}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Repeat className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60">No recent activity</p>
                  <p className="text-white/40 text-sm">Start swapping to see your transaction history</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Token Selector Modal */}
      <Dialog open={!!showTokenSelector} onOpenChange={() => setShowTokenSelector(null)}>
        <DialogContent className="bg-black border-card-bg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Select a Token</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {tokens?.map((token: SwapToken, index: number) => (
              <Button
                key={`${token.address}-${index}-${token.symbol}`}
                variant="ghost"
                onClick={() => {
                  if (showTokenSelector === "from") {
                    setFromToken(token);
                  } else {
                    setToToken(token);
                  }
                  setShowTokenSelector(null);
                }}
                className="w-full bg-card-bg hover:bg-card-bg/80 rounded-xl p-4 h-auto text-left flex items-center space-x-3"
                data-testid={`select-token-${token.symbol}-${index}`}
              >
                <img src={token.image} alt={token.symbol} className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <p className="text-white font-medium">{token.symbol}</p>
                  <p className="text-white/60 text-sm">{token.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm">${token.price.toFixed(6)}</p>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Risk Disclaimer Modal */}
      <Dialog open={showRiskDisclaimer} onOpenChange={setShowRiskDisclaimer}>
        <DialogContent className="bg-black border-card-bg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span>Swap Risk Disclaimer</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-orange-400 font-medium text-sm">Market Order Execution</p>
                  <p className="text-orange-300 text-xs">
                    This swap executes as a <strong>market order</strong> with no slippage protection. You will receive whatever amount the liquidity pools provide at execution time.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-red-400 font-medium text-sm">No Slippage Protection</p>
                  <p className="text-red-300 text-xs">
                    <strong>Slippage can and will likely be exceeded.</strong> Final amount may differ significantly from estimate. Price impact and market volatility affect execution.
                  </p>
                </div>
              </div>
            </div>

            {pendingQuote && fromToken && toToken && (
              <div className="bg-card-bg rounded-xl p-4 space-y-2">
                <h4 className="text-white font-medium">Transaction Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">You pay:</span>
                    <span className="text-white">{fromAmount} {fromToken.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">You receive (est.):</span>
                    <span className="text-white">{toAmount} {toToken.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Execution type:</span>
                    <span className="text-orange-400 font-medium">Market Order</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Fee:</span>
                    <span className="text-white">
                      {calculateFee(fromAmount, fromToken.decimals)} {fromToken.symbol}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowRiskDisclaimer(false)}
                className="flex-1 border-card-bg text-white hover:bg-card-bg/50"
                data-testid="button-cancel-swap"
              >
                Cancel
              </Button>
              <Button
                onClick={executeSwap}
                className="flex-1 bg-primary hover:bg-primary/90"
                data-testid="button-confirm-swap"
              >
                I Understand, Swap
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}