import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ethers } from "ethers";
import { WalletService } from "@/lib/wallet";
import { PaxeerAPI } from "@/lib/api";
import { type AddressProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTokenIcon, getTokenGradient } from "@/lib/tokenIcons";

interface PortfolioSectionProps {
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
}

export function PortfolioSection({ onSend, onReceive, onSwap }: PortfolioSectionProps) {
  const [activeAccount, setActiveAccount] = useState(WalletService.getActiveAccount());
  const [, setLocation] = useLocation();

  useEffect(() => {
    const account = WalletService.getActiveAccount();
    setActiveAccount(account);
  }, []);

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery<AddressProfile>({
    queryKey: ["/api", "paxeer", "address", activeAccount?.address, "profile"],
    enabled: !!activeAccount?.address,
    staleTime: 30000,
  });


  const handleRefresh = () => {
    refetchProfile();
  };

  const handleTokenClick = (tokenIndex: number | "pax") => {
    setLocation(`/token/${tokenIndex}`);
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
      
      // Check if the amount contains scientific notation
      const isScientificNotation = amount.includes('e') || amount.includes('E');
      
      // Check if the amount is already formatted (contains decimal point and is reasonable)
      const numRawAmount = parseFloat(amount);
      const isAlreadyFormatted = !isScientificNotation && amount.includes('.') && numRawAmount > 0 && numRawAmount < 1e15;
      
      let numAmount: number;
      if (isAlreadyFormatted) {
        // API returned already formatted amount, use as-is
        numAmount = numRawAmount;
      } else if (isScientificNotation) {
        // Handle scientific notation - convert to regular number
        numAmount = numRawAmount;
        // If it's a very large number in scientific notation, it's likely wei
        if (numRawAmount > 1e15) {
          try {
            // Convert scientific notation to a proper BigInt-compatible string
            const bigIntValue = BigInt(Math.floor(numRawAmount));
            const formattedAmount = ethers.formatUnits(bigIntValue.toString(), decimalNum);
            numAmount = parseFloat(formattedAmount);
          } catch (scientificError) {
            console.warn('Failed to convert scientific notation:', numRawAmount, 'Error:', scientificError);
            // Fallback: use the number as-is if conversion fails
            numAmount = numRawAmount / Math.pow(10, decimalNum);
          }
        }
      } else {
        // Raw wei amount, format with ethers
        const formattedAmount = ethers.formatUnits(amount, decimalNum);
        numAmount = parseFloat(formattedAmount);
      }
      
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

  // Format USD amounts with proper commas
  const formatUSDAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate total portfolio value in USD
  const calculateTotalValue = (): { totalUSD: number; totalPAX: number } => {
    let totalUSD = 0;
    
    // Add PAX native balance (assuming PAX = $0.99)
    const paxBalance = parseFloat(formatTokenAmount(profile?.balances?.native || '0', 18));
    const paxValueUSD = paxBalance * 0.99;
    totalUSD += paxValueUSD;
    
    // Add token values
    if (profile?.balances?.tokens) {
      profile.balances.tokens.forEach((token) => {
        totalUSD += parseFloat(token.value_usd);
      });
    }
    
    return {
      totalUSD,
      totalPAX: totalUSD / 0.99 // Convert back to PAX equivalent
    };
  };

  if (!activeAccount) {
    return (
      <section className="space-y-4">
        <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-6 text-center">
          <p className="text-white/80 text-sm mb-2">Total Balance</p>
          <h2 className="text-3xl font-bold text-white mb-1">No Account</h2>
          <p className="text-white/60 text-sm">Create an account to get started</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-6 text-center relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 text-white/60 hover:text-white"
          onClick={handleRefresh}
          data-testid="button-refresh-balance"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        
        <p className="text-white/80 text-sm mb-2">Total Balance</p>
        
        {profileLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-32 mx-auto bg-white/20" />
            <Skeleton className="h-4 w-24 mx-auto bg-white/20" />
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-white mb-1" data-testid="text-total-balance">
              {formatUSDAmount(calculateTotalValue().totalUSD)}
            </h2>
            <p className="text-white/60 text-sm" data-testid="text-fiat-value">
              ≈ {calculateTotalValue().totalPAX.toFixed(2)} PAX
            </p>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          className="bg-card-bg/50 hover:bg-card-bg/70 rounded-xl p-4 h-auto flex flex-col items-center space-y-2 text-white"
          onClick={onSend}
          data-testid="button-send"
        >
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <ArrowUp className="text-white" />
          </div>
          <span className="text-sm">Send</span>
        </Button>
        
        <Button
          className="bg-card-bg/50 hover:bg-card-bg/70 rounded-xl p-4 h-auto flex flex-col items-center space-y-2 text-white"
          onClick={onReceive}
          data-testid="button-receive"
        >
          <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center">
            <ArrowDown className="text-white" />
          </div>
          <span className="text-sm">Receive</span>
        </Button>
        
        <Button
          className="bg-card-bg/50 hover:bg-card-bg/70 rounded-xl p-4 h-auto flex flex-col items-center space-y-2 text-white"
          onClick={onSwap}
          data-testid="button-swap"
        >
          <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
            <RefreshCw className="text-white" />
          </div>
          <span className="text-sm">Swap</span>
        </Button>
      </div>

      {/* Assets List */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-lg">Assets</h3>
        
        {profileLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card-bg/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
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
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Always show PAX token */}
            <Button
              variant="ghost"
              className="bg-card-bg/30 hover:bg-card-bg/50 rounded-xl p-4 flex items-center justify-between w-full h-auto"
              onClick={() => handleTokenClick("pax")}
              data-testid="card-token-pax"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://storage.googleapis.com/conduit-prd-apps-web-cdn/paxeer-network-djjz47ii4b-b9823b7f-e867-44ff-8ff1-631e8d36f505.png"
                    alt="PAX"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="text-white font-semibold text-sm hidden">PAX</span>
                </div>
                <div>
                  <p className="text-white font-medium" data-testid="text-token-name">Paxeer Token</p>
                  <p className="text-white/60 text-sm" data-testid="text-token-balance">
                    {formatTokenAmount(profile?.balances?.native || '0', 18)} PAX
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium" data-testid="text-token-fiat-value">
                  ${(parseFloat(formatTokenAmount(profile?.balances?.native || '0', 18)) * 0.99).toFixed(2)}
                </p>
                <p className="text-success text-sm" data-testid="text-token-price-change">+2.5%</p>
              </div>
            </Button>
            
            {/* Other tokens */}
            {profile?.balances?.tokens?.map((token, index) => (
              <Button
                key={`${token.contract_address || 'token'}-${index}-${token.symbol || 'unknown'}`}
                variant="ghost"
                className="bg-card-bg/30 hover:bg-card-bg/50 rounded-xl p-4 flex items-center justify-between w-full h-auto"
                onClick={() => handleTokenClick(index)}
                data-testid={`card-token-${index}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                    <img 
                      src={getTokenIcon(token.symbol, token.contract_address)}
                      alt={token.symbol}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div 
                      className="w-full h-full rounded-full flex items-center justify-center hidden"
                      style={{ background: getTokenGradient(token.symbol) }}
                    >
                      <span className="text-white font-semibold text-sm">
                        {token.symbol.slice(0, 3)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-medium" data-testid={`text-token-name-${index}`}>
                      {token.name}
                    </p>
                    <p className="text-white/60 text-sm" data-testid={`text-token-balance-${index}`}>
                      {formatTokenAmount(token.balance, token.decimals)} {token.symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium" data-testid={`text-token-fiat-value-${index}`}>
                    ${parseFloat(token.value_usd).toFixed(2)}
                  </p>
                  <p className="text-success text-sm">+0.0%</p>
                </div>
              </Button>
            ))}
            
            {(!profile?.balances?.tokens || profile.balances.tokens.length === 0) && !profileLoading && (
              <div className="bg-card-bg/30 rounded-xl p-4 text-center">
                <p className="text-white/60 text-sm">No additional tokens found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
