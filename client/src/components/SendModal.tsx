import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WalletService, TransactionService } from "@/lib/wallet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTokenIcon } from "@/lib/tokenIcons";
import { type AddressProfile } from "@shared/schema";
import { ethers } from "ethers";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TokenOption {
  symbol: string;
  name: string;
  address?: string;
  decimals: number;
  balance: string;
  icon?: string;
}

export function SendModal({ isOpen, onClose }: SendModalProps) {
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<string>("PAX");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const activeAccount = WalletService.getActiveAccount();
  
  // Fetch user's tokens
  const { data: profile } = useQuery<AddressProfile>({
    queryKey: ["/api", "paxeer", "address", activeAccount?.address, "profile"],
    enabled: !!activeAccount?.address,
    staleTime: 30000,
  });

  // Get available tokens
  const getAvailableTokens = (): TokenOption[] => {
    const tokens: TokenOption[] = [
      {
        symbol: "PAX",
        name: "Paxeer Token",
        decimals: 18,
        balance: profile?.balances?.native || "0",
        icon: "https://storage.googleapis.com/conduit-prd-apps-web-cdn/paxeer-network-djjz47ii4b-b9823b7f-e867-44ff-8ff1-631e8d36f505.png"
      }
    ];
    
    // Add user's ERC-20 tokens
    if (profile?.balances?.tokens) {
      profile.balances.tokens.forEach((token) => {
        tokens.push({
          symbol: token.symbol,
          name: token.name,
          address: token.contract_address,
          decimals: token.decimals,
          balance: token.balance,
          icon: getTokenIcon(token.symbol, token.contract_address)
        });
      });
    }
    
    return tokens;
  };
  
  const availableTokens = getAvailableTokens();
  const currentToken = availableTokens.find(t => t.symbol === selectedToken);
  
  const formatTokenAmount = (rawAmount: string, decimals: number) => {
    try {
      const formattedAmount = ethers.formatUnits(rawAmount, decimals);
      const numAmount = parseFloat(formattedAmount);
      if (numAmount === 0) return "0";
      if (numAmount < 0.001) return "<0.001";
      if (numAmount < 1) return numAmount.toFixed(6).replace(/\.?0+$/, "");
      if (numAmount < 1000) return numAmount.toFixed(3).replace(/\.?0+$/, "");
      return numAmount.toFixed(2);
    } catch (error) {
      return rawAmount;
    }
  };

  const handleSend = async () => {
    if (!activeAccount) {
      toast({
        title: "No active account",
        description: "Please create or select an account first",
        variant: "destructive",
      });
      return;
    }

    if (!toAddress.trim()) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid recipient address",
        variant: "destructive",
      });
      return;
    }

    if (!amount.trim() || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to send",
        variant: "destructive",
      });
      return;
    }

    // Basic Ethereum address validation
    if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid address format",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const transactionData = {
        to: toAddress,
        value: amount,
        tokenAddress: currentToken?.address,
        decimals: currentToken?.decimals || 18
      };
      
      const txHash = await TransactionService.sendTransaction(activeAccount.address, transactionData);

      toast({
        title: "Transaction sent successfully!",
        description: `${amount} ${selectedToken} sent to ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`,
      });

      // Reset form and close modal
      setToAddress("");
      setAmount("");
      onClose();
    } catch (error) {
      toast({
        title: "Transaction failed",
        description: "Failed to send transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setToAddress("");
    setAmount("");
    setSelectedToken("PAX");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-black border-card-bg max-w-sm mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white font-semibold text-lg">Send {selectedToken}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white h-auto p-1"
              onClick={handleClose}
              data-testid="button-close-send-modal"
            >
              <X />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Token Selection */}
          <div>
            <Label className="text-white/80 text-sm mb-2 block">
              Asset
            </Label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger className="w-full bg-card-bg text-white rounded-xl p-4 border-none focus-visible:ring-2 focus-visible:ring-primary">
                <div className="flex items-center space-x-3">
                  {currentToken?.icon && (
                    <img src={currentToken.icon} alt={currentToken.symbol} className="w-6 h-6 rounded-full" />
                  )}
                  <div className="text-left flex-1">
                    <div className="font-medium">{selectedToken}</div>
                    <div className="text-xs text-white/60">
                      Balance: {currentToken ? formatTokenAmount(currentToken.balance, currentToken.decimals) : '0'} {selectedToken}
                    </div>
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-black border-card-bg">
                {availableTokens.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol} className="text-white hover:bg-card-bg">
                    <div className="flex items-center space-x-3">
                      {token.icon && (
                        <img src={token.icon} alt={token.symbol} className="w-6 h-6 rounded-full" />
                      )}
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-xs text-white/60">
                          Balance: {formatTokenAmount(token.balance, token.decimals)}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="to-address" className="text-white/80 text-sm mb-2 block">
              To Address
            </Label>
            <Input
              id="to-address"
              type="text"
              placeholder="0x..."
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="w-full bg-card-bg text-white rounded-xl p-4 border-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid="input-to-address"
            />
          </div>
          
          <div>
            <Label htmlFor="amount" className="text-white/80 text-sm mb-2 block">
              Amount
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-card-bg text-white rounded-xl p-4 pr-20 border-none focus-visible:ring-2 focus-visible:ring-primary"
                step="0.000001"
                min="0"
                data-testid="input-amount"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 text-sm">
                {selectedToken}
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleSend}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            data-testid="button-send-transaction"
          >
            {isLoading ? "Sending..." : "Send Transaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
