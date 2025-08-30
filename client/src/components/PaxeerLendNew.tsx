import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";
import { WalletService } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Shield, Target, Activity, Wallet, CreditCard, PiggyBank } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/config/api";

interface VaultData {
  id: string;
  name: string;
  symbol: string;
  display_symbol: string;
  icon_url: string;
  token_address: string;
  total_deposited: string;
  total_deposited_usd: string;
  total_borrowed: string;
  total_borrowed_usd: string;
  available_liquidity: string;
  available_liquidity_usd: string;
  supply_rate: string;
  borrow_rate: string;
  utilization: string;
  token_price: string;
  max_ltv: string;
  liquidation_threshold: string;
  liquidation_penalty: string;
  is_active: boolean;
  can_supply: boolean;
  can_borrow: boolean;
  can_use_as_collateral: boolean;
  raw_metrics: {
    supply_apy: number;
    borrow_apy: number;
    utilization_rate: number;
    max_ltv: number;
    price: number;
  };
}

interface UserCreditData {
  address: string;
  credit_score: number;
  credit_grade: string;
  max_borrow_capacity_usd: number;
  max_borrow_capacity_pax: number;
  risk_level: string;
  score_breakdown: {
    transaction_volume: number;
    transaction_count: number;
    coin_balance: number;
    account_age: number;
    activity_consistency: number;
  };
}

interface ProtocolStats {
  total_users: number;
  total_deposits_usd: number;
  total_borrows_usd: number;
  avg_credit_score: number;
  protocol_utilization: number;
  total_reserves: number;
}

interface PaxeerLendNewProps {
  onBack: () => void;
}

// Paxeer Lending Protocol Contract Address
const LENDING_POOL_ADDRESS = "0x0ec36805f1fbA98b1044822F9217DD2Dc854E407";

const PAXEER_RPC_URL = "https://rpc-paxeer-network-djjz47ii4b.t.conduit.xyz/DgdWRnqiV7UGiMR2s9JPMqto415SW9tNG";

// Official Paxeer Lending Pool ABI (from documentation)
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

// Fixed ERC20 ABI with proper stateMutability
const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export function PaxeerLendNew({ onBack }: PaxeerLendNewProps) {
  const [selectedVault, setSelectedVault] = useState<VaultData | null>(null);
  const [currentTab, setCurrentTab] = useState<"supply" | "borrow" | "dashboard">("supply");
  const [supplyAmount, setSupplyAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeAccount = WalletService.getActiveAccount();

  // Fetch all vaults from new API
  const { data: vaultsData, isLoading: vaultsLoading, error: vaultsError } = useQuery({
    queryKey: ['/api/proxy/lending/v1/vaults'],
    queryFn: async () => {
      const response = await apiCall('/api/proxy/lending/v1/vaults');
      return response.json();
    },
    staleTime: 60000, // 1 minute
    retry: 3,
  });

  // Fetch user credit data
  const { data: userCredit, isLoading: creditLoading } = useQuery<UserCreditData>({
    queryKey: ['/api/proxy/lending/v1/user/credit', activeAccount?.address],
    queryFn: async () => {
      if (!activeAccount?.address) throw new Error('No address');
      const response = await apiCall(`/api/proxy/lending/v1/user/${activeAccount.address}/credit`);
      return response.json();
    },
    enabled: !!activeAccount?.address,
    staleTime: 30000,
    retry: 2,
  });

  // Fetch protocol statistics
  const { data: protocolStats, isLoading: statsLoading } = useQuery<ProtocolStats>({
    queryKey: ['/api/proxy/lending/v1/protocol/stats'],
    queryFn: async () => {
      const response = await apiCall('/api/proxy/lending/v1/protocol/stats');
      return response.json();
    },
    staleTime: 120000, // 2 minutes
  });

  const vaults: VaultData[] = vaultsData?.vaults || [];

  // Supply mutation
  const supplyMutation = useMutation({
    mutationFn: async ({ vault, amount }: { vault: VaultData; amount: string }) => {
      if (!activeAccount) throw new Error('No wallet connected');
      
      const privateKey = WalletService.exportPrivateKey(activeAccount.address);
      if (!privateKey) throw new Error('Private key not found');

      const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Get token contract and fetch decimals properly
      const tokenContract = new ethers.Contract(vault.token_address, ERC20_ABI, wallet);
      
      let decimals;
      try {
        const decimalsResult = await tokenContract.decimals.staticCall();
        console.log('Raw decimals result:', decimalsResult, 'Type:', typeof decimalsResult);
        decimals = Number(decimalsResult);
        console.log('Converted decimals:', decimals);
      } catch (decimalsError) {
        console.error('Error fetching decimals:', decimalsError);
        // Fallback to common decimals for major tokens
        decimals = 18; // Most tokens use 18 decimals
        console.log('Using fallback decimals:', decimals);
      }
      
      // Validate decimals before using
      if (isNaN(decimals) || decimals < 0 || decimals > 77) {
        throw new Error(`Invalid decimals value: ${decimals}. Token: ${vault.token_address}`);
      }
      
      const amountWei = ethers.parseUnits(amount, decimals);
      
      // Approve spending
      const approveTx = await tokenContract.approve(LENDING_POOL_ADDRESS, amountWei);
      await approveTx.wait();
      
      // Deposit to lending pool
      const lendingContract = new ethers.Contract(LENDING_POOL_ADDRESS, LENDING_POOL_ABI, wallet);
      const depositTx = await lendingContract.deposit(vault.token_address, amountWei);
      
      return depositTx.wait();
    },
    onSuccess: () => {
      toast({
        title: "Supply Successful!",
        description: "Your tokens have been supplied to the vault.",
      });
      setSupplyAmount("");
      queryClient.invalidateQueries({ queryKey: ['/api/proxy/lending/v1/vaults'] });
    },
    onError: (error: any) => {
      toast({
        title: "Supply Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Borrow mutation
  const borrowMutation = useMutation({
    mutationFn: async ({ vault, amount }: { vault: VaultData; amount: string }) => {
      if (!activeAccount) throw new Error('No wallet connected');
      
      const privateKey = WalletService.exportPrivateKey(activeAccount.address);
      if (!privateKey) throw new Error('Private key not found');

      const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Get token contract for decimals (use wallet, not provider)
      const tokenContract = new ethers.Contract(vault.token_address, ERC20_ABI, wallet);
      
      let decimals;
      try {
        const decimalsResult = await tokenContract.decimals.staticCall();
        console.log('Raw decimals result:', decimalsResult, 'Type:', typeof decimalsResult);
        decimals = Number(decimalsResult);
        console.log('Converted decimals:', decimals);
      } catch (decimalsError) {
        console.error('Error fetching decimals:', decimalsError);
        // Fallback to common decimals for major tokens
        decimals = 18; // Most tokens use 18 decimals
        console.log('Using fallback decimals:', decimals);
      }
      
      // Validate decimals before using
      if (isNaN(decimals) || decimals < 0 || decimals > 77) {
        throw new Error(`Invalid decimals value: ${decimals}. Token: ${vault.token_address}`);
      }
      
      const amountWei = ethers.parseUnits(amount, decimals);
      
      // Borrow from lending pool
      const lendingContract = new ethers.Contract(LENDING_POOL_ADDRESS, LENDING_POOL_ABI, wallet);
      const borrowTx = await lendingContract.borrow(vault.token_address, amountWei);
      
      return borrowTx.wait();
    },
    onSuccess: () => {
      toast({
        title: "Borrow Successful!",
        description: "Tokens have been borrowed successfully.",
      });
      setBorrowAmount("");
      queryClient.invalidateQueries({ queryKey: ['/api/proxy/lending/v1/vaults'] });
    },
    onError: (error: any) => {
      toast({
        title: "Borrow Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSupply = () => {
    if (!selectedVault || !supplyAmount) return;
    supplyMutation.mutate({ vault: selectedVault, amount: supplyAmount });
  };

  const handleBorrow = () => {
    if (!selectedVault || !borrowAmount) return;
    borrowMutation.mutate({ vault: selectedVault, amount: borrowAmount });
  };

  const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[,$]/g, '')) : value;
    if (isNaN(num)) return '0';
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatPercentage = (value: string): string => {
    return value.endsWith('%') ? value : `${value}%`;
  };

  if (vaultsError) {
    return (
      <div className="bg-dark-bg text-white min-h-screen p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to dApps
          </Button>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Failed to Load PaxLend</h2>
          <p className="text-white/60">Unable to connect to lending protocol. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-bg text-white min-h-screen mobile-page-container">
      {/* Mobile-Optimized Header */}
      <div className="mobile-nav-header sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" onClick={onBack} className="text-white mobile-touch-target">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back to dApps</span>
            <span className="sm:hidden">Back</span>
          </Button>
          
          <div className="flex items-center space-x-2">
            <h1 className="text-white font-bold text-xl">PaxLend Protocol</h1>
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
              <Shield className="w-3 h-3 mr-1" />
              V2
            </Badge>
          </div>
          
          <div className="w-20" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Protocol Overview */}
        {protocolStats && (
          <Card className="bg-card-bg border-card-bg">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Protocol Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-white/60 text-sm">Total Deposits</p>
                  <p className="text-white font-semibold">${formatNumber(protocolStats.total_deposits_usd)}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">Total Borrowed</p>
                  <p className="text-white font-semibold">${formatNumber(protocolStats.total_borrows_usd)}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">Users</p>
                  <p className="text-white font-semibold">{formatNumber(protocolStats.total_users)}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">Avg Credit Score</p>
                  <p className="text-white font-semibold">{Math.round(protocolStats.avg_credit_score)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Credit Profile */}
        {userCredit && (
          <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Your Credit Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-white/60 text-sm">Credit Score</p>
                  <p className="text-white font-bold text-lg">{userCredit.credit_score}</p>
                  <p className="text-green-400 text-xs">{userCredit.credit_grade}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">Risk Level</p>
                  <p className="text-white font-semibold">{userCredit.risk_level}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">Max Borrow</p>
                  <p className="text-white font-semibold">${formatNumber(userCredit.max_borrow_capacity_usd)}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">Max Borrow PAX</p>
                  <p className="text-white font-semibold">{formatNumber(userCredit.max_borrow_capacity_pax)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vault Selection */}
        <Card className="bg-card-bg border-card-bg">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <PiggyBank className="w-5 h-5 mr-2" />
              Available Vaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vaultsLoading ? (
              <div className="text-white/60 text-center py-8">Loading vaults...</div>
            ) : vaults.length === 0 ? (
              <div className="text-white/60 text-center py-8">No vaults available</div>
            ) : (
              <div className="grid gap-4">
                {vaults.map((vault) => (
                  <div
                    key={vault.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all mobile-card-spacing ${
                      selectedVault?.id === vault.id
                        ? "border-primary bg-primary/10"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                    }`}
                    onClick={() => setSelectedVault(vault)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={vault.icon_url}
                          alt={vault.symbol}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = `https://via.placeholder.com/40?text=${vault.symbol}`;
                          }}
                        />
                        <div>
                          <h3 className="text-white font-semibold">{vault.symbol}</h3>
                          <p className="text-white/60 text-sm">{vault.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex space-x-4">
                          <div>
                            <p className="text-green-400 text-sm">{formatPercentage(vault.supply_rate)}</p>
                            <p className="text-white/60 text-xs">Supply APY</p>
                          </div>
                          <div>
                            <p className="text-orange-400 text-sm">{formatPercentage(vault.borrow_rate)}</p>
                            <p className="text-white/60 text-xs">Borrow APY</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-white/60">Available</p>
                        <p className="text-white">{vault.available_liquidity_usd}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Utilization</p>
                        <p className="text-white">{formatPercentage(vault.utilization)}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Price</p>
                        <p className="text-white">{vault.token_price}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Tabs */}
        {selectedVault && (
          <Card className="bg-card-bg border-card-bg">
            <CardContent className="p-0">
              <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as any)}>
                <TabsList className="grid w-full grid-cols-3 bg-card-bg">
                  <TabsTrigger value="supply" className="text-white data-[state=active]:bg-green-600">
                    Supply
                  </TabsTrigger>
                  <TabsTrigger value="borrow" className="text-white data-[state=active]:bg-orange-600">
                    Borrow
                  </TabsTrigger>
                  <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-primary">
                    Dashboard
                  </TabsTrigger>
                </TabsList>

                <div className="p-6">
                  <TabsContent value="supply" className="space-y-4">
                    <div>
                      <Label className="text-white">Supply Amount ({selectedVault.symbol})</Label>
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={supplyAmount}
                        onChange={(e) => setSupplyAmount(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <p className="text-white/60 text-sm mt-1">
                        Earn {formatPercentage(selectedVault.supply_rate)} APY
                      </p>
                    </div>
                    <Button
                      onClick={handleSupply}
                      disabled={!supplyAmount || supplyMutation.isPending || !selectedVault.can_supply}
                      className="w-full bg-green-600 hover:bg-green-700 mobile-touch-target"
                    >
                      {supplyMutation.isPending ? "Supplying..." : "Supply"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="borrow" className="space-y-4">
                    <div>
                      <Label className="text-white">Borrow Amount ({selectedVault.symbol})</Label>
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={borrowAmount}
                        onChange={(e) => setBorrowAmount(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <p className="text-white/60 text-sm mt-1">
                        Interest rate: {formatPercentage(selectedVault.borrow_rate)} APY
                      </p>
                      {userCredit && (
                        <p className="text-green-400 text-sm">
                          Max available: ${formatNumber(userCredit.max_borrow_capacity_usd)}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleBorrow}
                      disabled={!borrowAmount || borrowMutation.isPending || !selectedVault.can_borrow || !userCredit}
                      className="w-full bg-orange-600 hover:bg-orange-700 mobile-touch-target"
                    >
                      {borrowMutation.isPending ? "Borrowing..." : "Borrow"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="dashboard" className="space-y-4">
                    <div className="grid gap-4">
                      <h3 className="text-white font-semibold">{selectedVault.name} Details</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-3 rounded">
                          <p className="text-white/60 text-sm">Total Deposited</p>
                          <p className="text-white font-semibold">{selectedVault.total_deposited_usd}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded">
                          <p className="text-white/60 text-sm">Total Borrowed</p>
                          <p className="text-white font-semibold">{selectedVault.total_borrowed_usd}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded">
                          <p className="text-white/60 text-sm">Max LTV</p>
                          <p className="text-white font-semibold">{formatPercentage(selectedVault.max_ltv)}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded">
                          <p className="text-white/60 text-sm">Liquidation Threshold</p>
                          <p className="text-white font-semibold">{formatPercentage(selectedVault.liquidation_threshold)}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}