import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { WalletService } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Shield, Target, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, apiCall } from "@/config/api";

interface PoolData {
  assetAddress: string;
  pTokenAddress: string;
  symbol: string;
  decimals: number;
  totalSupplied: string;
  supplyApy: string;
  borrowApy: string;
}

interface UserData {
  address: string;
  creditScore: number;
  borrowingPower: string;
  amountBorrowed: string;
  availableToBorrow: string;
}

// Function to get token price from API data
const getTokenPrice = (symbol: string, tokensData?: any[]): number => {
  if (!tokensData) return 0;
  
  // Find token in API data
  const token = tokensData.find(t => 
    t.symbol === symbol || 
    t.symbol === symbol.replace('W', '') || // WETH -> ETH
    t.details?.symbol === symbol ||
    t.details?.symbol === symbol.replace('W', '')
  );
  
  if (token) {
    return parseFloat(token.price || token.details?.fiat_value || 0);
  }
  
  return 0;
};

interface PaxeerLendProps {
  onBack: () => void;
}

const LENDING_POOL_ADDRESS = "0xa0fE00Da13cD944F2e41531E1E23aCcF12deAE4a";
const PAXEER_RPC_URL = "https://rpc-paxeer-network-djjz47ii4b.t.conduit.xyz/DgdWRnqiV7UGiMR2s9JPMqto415SW9tNG";

const LENDING_POOL_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "asset", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "deposit", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "asset", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "asset", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "borrow", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "asset", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "repay", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  }
];

const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], 
    "stateMutability": "nonpayable", "type": "function"
  }
];

export function PaxeerLend({ onBack }: PaxeerLendProps) {
  const [activeView, setActiveView] = useState<"dashboard" | "pools">("dashboard");
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  const [actionType, setActionType] = useState<"deposit" | "withdraw" | "borrow" | "repay">("deposit");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [borrowingPowerBefore, setBorrowingPowerBefore] = useState<number | null>(null);
  const { toast } = useToast();

  const activeAccount = WalletService.getActiveAccount();

  // Fetch token prices from swap API
  const { data: tokenPrices } = useQuery({
    queryKey: ["swap/tokens"],
    queryFn: async () => {
      const response = await apiCall(API_ENDPOINTS.EXTERNAL.SWAP_TOKENS);
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 30000,
  });

  // Fetch pools data
  const { data: pools, isLoading: poolsLoading } = useQuery<PoolData[]>({
    queryKey: ["lending/vaults"],
    queryFn: async () => {
      const response = await apiCall(API_ENDPOINTS.EXTERNAL.LENDING_VAULTS);
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 30000,
  });

  // Fetch corrected user data from our backend
  const { data: correctedData, isLoading: userLoading, refetch: refetchUserData, error: userError } = useQuery({
    queryKey: ["lending/user-data", activeAccount?.address],
    queryFn: async () => {
      if (!activeAccount) return null;
      const response = await apiCall(API_ENDPOINTS.SERVER.LENDING_USER_DATA(activeAccount.address));
      return await response.json();
    },
    enabled: !!activeAccount?.address,
    staleTime: 30000,
    retry: 3,
    retryDelay: 1000,
  });

  // Extract data for compatibility with better error handling
  const userData = (correctedData as any)?.apiData || {
    creditScore: userError ? 0 : 750, // Show 0 if there's an actual error, 750 only as loading fallback
    borrowingPower: "0",
    availableToBorrow: "0", 
    amountBorrowed: "0"
  };

  const correctedValues = (correctedData as any)?.correctedData || {
    totalBorrowed: 0,
    totalSupplied: 0,
    borrowingPowerUsed: 0,
    positions: []
  };

  const getScoreColor = (score: number) => {
    if (score >= 800) return "text-green-400";
    if (score >= 700) return "text-yellow-400";
    return "text-red-400";
  };

  const handleTransaction = async () => {
    if (!activeAccount || !selectedPool || !amount) {
      toast({
        title: "Missing information",
        description: "Please ensure all fields are filled",
        variant: "destructive",
      });
      return;
    }

    // Store borrowing power before transaction for comparison
    if (userData?.borrowingPower && (actionType === "borrow" || actionType === "repay")) {
      setBorrowingPowerBefore(parseFloat(userData.borrowingPower));
    }

    setIsLoading(true);
    try {
      const privateKey = WalletService.exportPrivateKey(activeAccount.address);
      if (!privateKey) throw new Error("Private key not found");
      
      // Verify the private key generates the correct address
      const testWallet = new ethers.Wallet(privateKey);
      if (testWallet.address.toLowerCase() !== activeAccount.address.toLowerCase()) {
        toast({
          title: "Wallet Address Mismatch",
          description: `Private key address: ${testWallet.address} doesn't match account: ${activeAccount.address}. Please go to Settings → Export Private Key → Copy the key, then delete this account and re-import with the correct private key that generates ${activeAccount.address}.`,
          variant: "destructive",
        });
        return;
      }

      const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
      const wallet = new ethers.Wallet(privateKey, provider);
      const amountWei = ethers.parseUnits(amount, selectedPool.decimals);

      // Check native PAX balance for gas fees
      const walletAddress = wallet.address;
      const activeAddress = activeAccount.address;
      const nativeBalance = await provider.getBalance(walletAddress);
      const minGasNeeded = ethers.parseUnits("0.001", 18); // Require at least 0.001 PAX for gas
      
      console.log('Address Debug:', {
        activeAddress,
        walletAddress,
        nativeBalance: ethers.formatEther(nativeBalance),
        areAddressesEqual: walletAddress.toLowerCase() === activeAddress.toLowerCase()
      });
      
      if (nativeBalance < minGasNeeded) {
        toast({
          title: "Insufficient PAX for gas fees",
          description: `Address: ${walletAddress} has ${ethers.formatEther(nativeBalance)} PAX. You need at least 0.001 PAX for gas fees. Please ensure this address has PAX tokens.`,
          variant: "destructive",
        });
        return;
      }

      let tx: any;
      
      if (actionType === "deposit" || actionType === "repay") {
        // First approve the token
        const tokenContract = new ethers.Contract(selectedPool.assetAddress, ERC20_ABI, wallet);
        const approveTx = await tokenContract.approve(LENDING_POOL_ADDRESS, amountWei);
        await approveTx.wait();

        // Then perform the action
        const lendingContract = new ethers.Contract(LENDING_POOL_ADDRESS, LENDING_POOL_ABI, wallet);
        tx = actionType === "deposit" 
          ? await lendingContract.deposit(selectedPool.assetAddress, amountWei)
          : await lendingContract.repay(selectedPool.assetAddress, amountWei);
        
        await tx.wait();
      } else {
        // Direct action for withdraw/borrow
        const lendingContract = new ethers.Contract(LENDING_POOL_ADDRESS, LENDING_POOL_ABI, wallet);
        tx = actionType === "withdraw"
          ? await lendingContract.withdraw(selectedPool.assetAddress, amountWei)
          : await lendingContract.borrow(selectedPool.assetAddress, amountWei);
        
        await tx.wait();
      }

      // Calculate USD value for display using API prices
      const tokenPrice = getTokenPrice(selectedPool.symbol, tokenPrices);
      const amountUSD = parseFloat(amount) * tokenPrice;
      
      // Track the transaction in our backend
      console.log('Tracking lending transaction:', {
        userAddress: activeAccount.address,
        transactionHash: tx.hash,
        action: actionType,
        tokenSymbol: selectedPool.symbol,
        tokenAddress: selectedPool.assetAddress,
        amount,
        tokenPrice: tokenPrice.toString(),
      });
      
      try {
        const trackingResponse = await apiCall("/api/lending/track", {
          method: "POST",
          body: JSON.stringify({
            userAddress: activeAccount.address,
            transactionHash: tx.hash,
            action: actionType,
            tokenSymbol: selectedPool.symbol,
            tokenAddress: selectedPool.assetAddress,
            amount,
            tokenPrice: tokenPrice.toString(),
          }),
        });
        
        const trackingResult = await trackingResponse.json();
        console.log('Transaction tracking result:', trackingResult);
      } catch (error) {
        console.error("Failed to track lending transaction:", error);
      }
      
      toast({
        title: "Transaction successful!",
        description: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} ${amount} ${selectedPool.symbol} ($${amountUSD.toFixed(2)}) completed successfully`,
      });

      setAmount("");
      setSelectedPool(null);
      setBorrowingPowerBefore(null);
      
      // Refresh user data to show updated calculations
      setTimeout(() => {
        refetchUserData();
      }, 2000);
    } catch (error) {
      console.error("Transaction failed:", error);
      
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient PAX tokens for gas fees. Please add native PAX tokens to your wallet to pay for transaction costs.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Transaction failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Credit Score Card */}
      <Card className="bg-gradient-to-br from-primary/20 to-secondary/20 border-card-bg">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Credit Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userLoading ? (
            <div className="text-white/60">Loading credit score...</div>
          ) : userError ? (
            <div className="text-center">
              <div className="text-red-400 text-sm mb-2">Failed to load credit score</div>
              <Button 
                onClick={() => refetchUserData()}
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold ${getScoreColor(userData?.creditScore || 0)}`}>
                  {userData?.creditScore || 0}
                </div>
                <div className="text-white/60 text-sm">Out of 850</div>
                {userData?.creditScore === 750 && (
                  <div className="text-yellow-400 text-xs mt-1">Default Score</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-white/80 text-sm">Rating</div>
                <div className="text-white font-medium">
                  {(userData?.creditScore || 0) >= 800 ? "Excellent" : 
                   (userData?.creditScore || 0) >= 700 ? "Good" : 
                   (userData?.creditScore || 0) > 0 ? "Fair" : "No Data"}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Borrowing Power Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card-bg border-card-bg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Borrowing Power</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">
              ${parseFloat(userData?.borrowingPower || "0").toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-white/60 text-xs">Maximum borrowing capacity</div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg border-card-bg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Available to Borrow</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">
              ${Math.max(0, parseFloat(userData?.borrowingPower || "0") - correctedValues.totalBorrowed).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-white/60 text-xs">Remaining capacity</div>
          </CardContent>
        </Card>
      </div>

      {/* Amount Borrowed */}
      <Card className="bg-card-bg border-card-bg">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Current Borrowed Amount</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            ${correctedValues.totalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-white/60 text-sm mt-1">
            Active loans with proper USD calculation
          </div>
          {(correctedData as any)?.hasTrackedData && (
            <div className="text-success text-xs mt-1">
              ✅ Tracking {correctedValues.positions.filter((p: any) => p.positionType === 'borrow').length} lending position(s)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPools = () => (
    <div className="space-y-4">
      {poolsLoading ? (
        <div className="text-white/60 text-center py-8">Loading pools...</div>
      ) : (
        pools?.map((pool, index) => (
          <Card key={index} className="bg-card-bg border-card-bg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">{pool.symbol}</h3>
                  <p className="text-white/60 text-sm">Total Supplied: {parseFloat(pool.totalSupplied).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-success">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">{pool.supplyApy}% APY</span>
                  </div>
                  <div className="flex items-center space-x-1 text-red-400">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm">{pool.borrowApy}% APY</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {["deposit", "withdraw", "borrow", "repay"].map((action) => (
                  <Dialog key={action}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className={`${action === "deposit" || action === "repay" ? "bg-primary hover:bg-primary/90" : "bg-secondary hover:bg-secondary/90"} text-white`}
                        onClick={() => {
                          setSelectedPool(pool);
                          setActionType(action as typeof actionType);
                        }}
                      >
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-black border-card-bg">
                      <DialogHeader>
                        <DialogTitle className="text-white">
                          {action.charAt(0).toUpperCase() + action.slice(1)} {pool.symbol}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="amount" className="text-white">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-card-bg text-white border-card-bg"
                          />
                        </div>
                        <Button
                          onClick={handleTransaction}
                          disabled={isLoading || !amount}
                          className="w-full bg-primary hover:bg-primary/90"
                        >
                          {isLoading ? "Processing..." : `${action.charAt(0).toUpperCase() + action.slice(1)} ${pool.symbol}`}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-white/60 hover:text-white p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-white font-semibold text-lg">PaxeerLend</h2>
        <div />
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2">
        <Button
          variant={activeView === "dashboard" ? "default" : "ghost"}
          onClick={() => setActiveView("dashboard")}
          className={`flex-1 ${activeView === "dashboard" ? "bg-primary" : "text-white/60"}`}
        >
          Dashboard
        </Button>
        <Button
          variant={activeView === "pools" ? "default" : "ghost"}
          onClick={() => setActiveView("pools")}
          className={`flex-1 ${activeView === "pools" ? "bg-primary" : "text-white/60"}`}
        >
          Pools
        </Button>
      </div>

      {/* Content */}
      {activeView === "dashboard" ? renderDashboard() : renderPools()}
    </div>
  );
}