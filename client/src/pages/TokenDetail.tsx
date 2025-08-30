import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ethers } from "ethers";
import { WalletService } from "@/lib/wallet";
import { type AddressProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTokenIcon, getTokenGradient } from "@/lib/tokenIcons";
import { SendModal } from "@/components/SendModal";
import { ReceiveModal } from "@/components/ReceiveModal";

interface TokenDetailParams {
  tokenId: string;
  [key: string]: string;
}

export default function TokenDetail() {
  const [, params] = useRoute("/token/:tokenId");
  const [, setLocation] = useLocation();
  const [activeAccount, setActiveAccount] = useState(WalletService.getActiveAccount());
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  useEffect(() => {
    const account = WalletService.getActiveAccount();
    setActiveAccount(account);
  }, []);

  const { data: profile, isLoading } = useQuery<AddressProfile>({
    queryKey: ["/api", "paxeer", "address", activeAccount?.address, "profile"],
    enabled: !!activeAccount?.address,
    staleTime: 30000,
  });

  const handleBack = () => {
    setLocation("/");
  };

  const handleSend = () => {
    setShowSendModal(true);
  };

  const handleReceive = () => {
    setShowReceiveModal(true);
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

  const tokenId = params?.tokenId as string;
  
  if (!activeAccount || !tokenId) {
    return (
      <div className="max-w-md mx-auto bg-dark-bg min-h-screen">
        <div className="p-4 text-center">
          <p className="text-white/60">Token not found</p>
          <Button onClick={handleBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Find the specific token (PAX is index "pax", others by their index)
  const currentToken = tokenId === "pax" 
    ? null // We'll handle PAX separately
    : profile?.balances?.tokens?.[parseInt(tokenId)];

  const isPaxToken = tokenId === "pax";

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-dark-bg min-h-screen">
        <div className="p-4 space-y-6">
          <Skeleton className="h-12 w-full bg-white/20" />
          <Skeleton className="h-32 w-full bg-white/20" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full bg-white/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tokenName = isPaxToken ? "Paxeer Token" : currentToken?.name || "Unknown Token";
  const tokenSymbol = isPaxToken ? "PAX" : currentToken?.symbol || "???";
  const rawTokenBalance = isPaxToken ? (profile?.balances?.native || "0") : currentToken?.balance || "0";
  const tokenDecimals = isPaxToken ? 18 : currentToken?.decimals || 18;
  const tokenBalance = formatTokenAmount(rawTokenBalance, tokenDecimals);
  const tokenFiatValue = isPaxToken ? (parseFloat(formatTokenAmount(profile?.balances?.native || "0", 18)) * 0.99) : parseFloat(currentToken?.value_usd || '0');

  // Filter transactions for this specific token
  const filteredTransactions = profile?.transactions?.filter(transaction => {
    if (isPaxToken) {
      // For PAX, show native transactions
      return transaction.type === "native";
    }
    // For tokens, show token transactions matching this token
    return transaction.type === "token" && transaction.token?.symbol === tokenSymbol;
  }) || [];

  return (
    <div className="max-w-md mx-auto bg-dark-bg min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-secondary p-4">
        <div className="flex items-center space-x-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white font-semibold text-lg" data-testid="text-token-title">
            {tokenName}
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Token Balance Card */}
        <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img 
              src={isPaxToken ? getTokenIcon("PAX") : getTokenIcon(tokenSymbol, currentToken?.contract_address)}
              alt={tokenSymbol}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div 
              className="w-full h-full rounded-full flex items-center justify-center hidden"
              style={{ background: getTokenGradient(tokenSymbol) }}
            >
              <span className="text-white font-bold text-lg">
                {tokenSymbol.slice(0, 3)}
              </span>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2" data-testid="text-token-balance">
            {tokenBalance} {tokenSymbol}
          </h2>
          
          <p className="text-white/60 text-sm" data-testid="text-token-fiat-value">
            ≈ ${tokenFiatValue.toFixed(2)} USD
          </p>
        </div>

        {/* Token Info */}
        <div className="bg-card-bg/30 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-semibold">Token Information</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/60">Name</p>
              <p className="text-white font-medium" data-testid="text-token-info-name">
                {tokenName}
              </p>
            </div>
            <div>
              <p className="text-white/60">Symbol</p>
              <p className="text-white font-medium" data-testid="text-token-info-symbol">
                {tokenSymbol}
              </p>
            </div>
            {currentToken?.details?.type && (
              <>
                <div>
                  <p className="text-white/60">Type</p>
                  <p className="text-white font-medium" data-testid="text-token-info-type">
                    {currentToken.details.type}
                  </p>
                </div>
                <div>
                  <p className="text-white/60">Decimals</p>
                  <p className="text-white font-medium" data-testid="text-token-info-decimals">
                    {currentToken.details.decimals}
                  </p>
                </div>
              </>
            )}
          </div>
          
          {currentToken?.details?.contract && (
            <div>
              <p className="text-white/60 text-sm">Contract Address</p>
              <p className="text-white font-mono text-xs break-all" data-testid="text-token-contract">
                {currentToken.details.contract}
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="bg-primary hover:bg-primary/90 rounded-xl p-4 h-auto flex flex-col items-center space-y-2 text-white"
            onClick={handleSend}
            data-testid="button-send-token"
          >
            <ArrowUp className="w-6 h-6" />
            <span className="text-sm">Send</span>
          </Button>
          
          <Button
            className="bg-success hover:bg-success/90 rounded-xl p-4 h-auto flex flex-col items-center space-y-2 text-white"
            onClick={handleReceive}
            data-testid="button-receive-token"
          >
            <ArrowDown className="w-6 h-6" />
            <span className="text-sm">Receive</span>
          </Button>
        </div>

        {/* Token Transfers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Recent Transfers</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-sm hover:text-primary/80"
              data-testid="button-refresh-transfers"
            >
              <RefreshCw className="mr-1 w-4 h-4" />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-white/20" />
              ))}
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((transaction, index) => {
                const toAddress = transaction.to || '';
                const fromAddress = transaction.from || '';
                const isReceived = toAddress.toLowerCase() === activeAccount.address.toLowerCase();
                
                return (
                  <div key={`${transaction.hash || 'transfer'}-${index}-${transaction.block_number || 'noblock'}`} className="bg-card-bg/30 rounded-xl p-4" data-testid={`card-transfer-${index}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${isReceived ? 'bg-success' : 'bg-primary'} rounded-full flex items-center justify-center`}>
                          {isReceived ? (
                            <ArrowDown className="text-white text-sm" />
                          ) : (
                            <ArrowUp className="text-white text-sm" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium" data-testid={`text-transfer-type-${index}`}>
                            {isReceived ? "Received" : "Sent"}
                          </p>
                          <p className="text-white/60 text-sm" data-testid={`text-transfer-hash-${index}`}>
                            {transaction.hash.slice(0, 10)}...
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${isReceived ? 'text-success' : 'text-white'}`} data-testid={`text-transfer-amount-${index}`}>
                          {isReceived ? '+' : '-'}{formatTokenAmount(transaction.value, isPaxToken ? 18 : (transaction.token?.decimals || '18'))} {tokenSymbol}
                        </p>
                        <p className="text-white/60 text-sm">
                          Block #{transaction.block_number}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card-bg/30 rounded-xl p-4 text-center">
              <p className="text-white/60 text-sm">No transactions found for this token</p>
            </div>
          )}
        </div>
      </main>

      <SendModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
      />

      <ReceiveModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
      />
    </div>
  );
}