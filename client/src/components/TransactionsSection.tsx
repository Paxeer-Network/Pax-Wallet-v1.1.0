import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ethers } from "ethers";
import { WalletService } from "@/lib/wallet";
import { type AddressTransactions, type AddressTokenTransfers } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ENDPOINTS, apiCall } from "@/config/api";

export function TransactionsSection() {
  const [activeAccount, setActiveAccount] = useState(WalletService.getActiveAccount());
  const [, setLocation] = useLocation();

  useEffect(() => {
    const account = WalletService.getActiveAccount();
    setActiveAccount(account);
  }, []);

  const { data: transactions, isLoading, refetch } = useQuery<AddressTransactions>({
    queryKey: ["paxeer/transactions", activeAccount?.address],
    queryFn: async () => {
      if (!activeAccount) return null;
      const response = await apiCall(API_ENDPOINTS.SERVER.PAXEER_TRANSACTIONS(activeAccount.address));
      return await response.json();
    },
    enabled: !!activeAccount?.address,
    staleTime: 30000,
  });

  const { data: tokenTransfers, isLoading: transfersLoading, refetch: refetchTransfers } = useQuery<AddressTokenTransfers>({
    queryKey: ["paxeer/tokentransfers", activeAccount?.address],
    queryFn: async () => {
      if (!activeAccount) return null;
      const response = await apiCall(`/api/paxeer/address/${activeAccount.address}/tokentransfers`);
      return await response.json();
    },
    enabled: !!activeAccount?.address,
    staleTime: 30000,
  });

  const { data: swapTransactions, isLoading: swapsLoading, refetch: refetchSwaps } = useQuery({
    queryKey: ["swap/transactions", activeAccount?.address],
    queryFn: async () => {
      if (!activeAccount) return [];
      const response = await apiCall(API_ENDPOINTS.SERVER.SWAP_USER_TRANSACTIONS(activeAccount.address));
      return await response.json();
    },
    enabled: !!activeAccount?.address,
    staleTime: 30000,
  });

  const formatTime = (blockNumber: number) => {
    // Mock time calculation - in real implementation, convert block number to timestamp
    const hoursAgo = Math.floor(Math.random() * 24) + 1;
    return `${hoursAgo} hours ago`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTokenAmount = (rawAmount: string | number, decimals: string | number = 18) => {
    try {
      // Convert raw amount to readable format using specified decimals
      const amount = typeof rawAmount === 'string' ? rawAmount : rawAmount.toString();
      const decimalNum = typeof decimals === 'string' ? parseInt(decimals) : Number(decimals);
      
      // Ensure decimal number is valid
      if (isNaN(decimalNum) || decimalNum < 0) {
        console.error('Invalid decimals value:', decimals, 'converted to:', decimalNum);
        return rawAmount.toString();
      }
      
      const formattedAmount = ethers.formatUnits(amount, decimalNum);
      const numAmount = parseFloat(formattedAmount);
      
      // Format to reasonable decimal places
      if (numAmount === 0) return "0";
      if (numAmount < 0.001) return "<0.001";
      if (numAmount < 1) return numAmount.toFixed(6).replace(/\.?0+$/, "");
      if (numAmount < 1000) return numAmount.toFixed(3).replace(/\.?0+$/, "");
      return numAmount.toFixed(2);
    } catch (error) {
      console.error('Error formatting token amount:', error);
      return rawAmount.toString();
    }
  };

  // Merge regular transactions, token transfers, and swaps into a single chronological list
  const getAllTransactions = () => {
    const allTransactions: any[] = [];
    
    // Add regular transactions
    if (transactions?.transactions) {
      transactions.transactions.forEach(tx => {
        allTransactions.push({
          type: 'transaction',
          hash: tx.hash,
          timestamp: tx.timestamp,
          block_number: tx.block_number,
          from_address: tx.from?.hash || tx.from_address_hash,
          to_address: tx.to?.hash || tx.to_address_hash,
          value: tx.value,
          symbol: 'PAX',
          decimals: 18
        });
      });
    }
    
    // Add token transfers
    if (tokenTransfers?.transfers) {
      tokenTransfers.transfers.forEach(transfer => {
        allTransactions.push({
          type: 'token_transfer',
          hash: transfer.transaction_hash,
          timestamp: transfer.timestamp,
          block_number: transfer.block_number,
          from_address: transfer.from?.hash || transfer.from_address_hash,
          to_address: transfer.to?.hash || transfer.to_address_hash,
          value: transfer.total?.value || transfer.amount,
          symbol: transfer.token.symbol,
          decimals: parseInt(transfer.token.decimals || '18')
        });
      });
    }
    
    // Add swap transactions
    if (swapTransactions && Array.isArray(swapTransactions)) {
      swapTransactions.forEach(swap => {
        allTransactions.push({
          type: 'swap',
          hash: swap.transactionHash,
          timestamp: swap.timestamp,
          block_number: swap.blockNumber || '0',
          from_address: swap.userAddress,
          to_address: swap.userAddress,
          value: swap.amountIn,
          symbol: swap.tokenInSymbol,
          symbol_out: swap.tokenOutSymbol,
          amount_out: swap.amountOut,
          decimals: 18,
          usd_value: parseFloat(swap.usdValueIn || '0')
        });
      });
    }
    
    // Sort by timestamp or block number (newest first)
    allTransactions.sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : parseInt(a.block_number) * 1000;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : parseInt(b.block_number) * 1000;
      return bTime - aTime;
    });
    
    return allTransactions;
  };

  if (!activeAccount) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">Transactions</h3>
        </div>
        <div className="bg-card-bg/30 rounded-xl p-4 text-center">
          <p className="text-white/60 text-sm">No account selected</p>
        </div>
      </section>
    );
  }

  const allTransactions = getAllTransactions();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Transactions</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary text-sm hover:text-primary/80"
          onClick={() => {
            refetch();
            refetchTransfers();
            refetchSwaps();
          }}
          data-testid="button-refresh-transactions"
        >
          <RefreshCw className="mr-1 w-4 h-4" />
          Refresh
        </Button>
      </div>

      {isLoading || transfersLoading || swapsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card-bg/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-10 h-10 rounded-full bg-white/20" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20 bg-white/20" />
                    <Skeleton className="h-3 w-16 bg-white/20" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-16 bg-white/20" />
                  <Skeleton className="h-3 w-12 bg-white/20" />
                </div>
              </div>
              <Skeleton className="h-3 w-full bg-white/20" />
            </div>
          ))}
        </div>
      ) : allTransactions.length > 0 ? (
        <div className="space-y-3">
          {allTransactions.map((tx, index) => {
            const toAddress = tx.to_address || '';
            const isReceived = toAddress.toLowerCase() === activeAccount.address.toLowerCase();
            
            return (
              <Button
                key={`${tx.hash || 'tx'}-${index}-${tx.block_number || 'noblock'}`}
                variant="ghost"
                className="bg-card-bg/30 hover:bg-card-bg/50 rounded-xl p-4 flex flex-col w-full h-auto"
                onClick={() => setLocation(`/transaction/${tx.hash}`)}
                data-testid={`card-transaction-${index}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${isReceived ? 'bg-success' : 'bg-primary'} rounded-full flex items-center justify-center`}>
                      {isReceived ? (
                        <ArrowDown className="text-white text-sm" />
                      ) : (
                        <ArrowUp className="text-white text-sm" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium" data-testid={`text-transaction-type-${index}`}>
                        {tx.type === 'swap' 
                          ? `Swap ${tx.symbol} → ${tx.symbol_out}`
                          : isReceived ? "Received" : "Sent"} {tx.type === 'token_transfer' ? tx.symbol : ''}
                      </p>
                      <p className="text-white/60 text-sm" data-testid={`text-transaction-time-${index}`}>
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : `Block ${tx.block_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.type === 'swap' ? 'text-orange-400' : isReceived ? 'text-success' : 'text-white'}`} data-testid={`text-transaction-value-${index}`}>
                      {tx.type === 'swap' 
                        ? `${formatTokenAmount(tx.value, tx.decimals)} ${tx.symbol}`
                        : `${isReceived ? '+' : '-'}${formatTokenAmount(tx.value, tx.decimals)} ${tx.symbol}`}
                    </p>
                    <p className="text-white/60 text-sm" data-testid={`text-transaction-fiat-${index}`}>
                      {tx.type === 'swap' 
                        ? `≈ $${tx.usd_value.toFixed(2)}`
                        : tx.symbol === 'PAX' 
                        ? `≈ $${(parseFloat(formatTokenAmount(tx.value, tx.decimals)) * 3).toFixed(2)}`
                        : `${tx.type === 'token_transfer' ? 'Token Transfer' : 'Native Transfer'}`}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-white/50 font-mono w-full overflow-hidden">
                  <p className="break-words text-wrap" data-testid={`text-transaction-hash-${index}`} title={tx.hash}>
                    {tx.hash}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      ) : (
        <div className="bg-card-bg/30 rounded-xl p-4 text-center">
          <p className="text-white/60 text-sm">No transactions found</p>
        </div>
      )}
    </section>
  );
}