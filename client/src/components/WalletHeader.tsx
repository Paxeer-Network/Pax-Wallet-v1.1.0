import React, { useState, useEffect } from "react";
import { WalletService } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { ChevronDown, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import paxeerLogo from "@assets/image_1756372459245.png";

interface WalletHeaderProps {
  onAccountChange: () => void;
}

export function WalletHeader({ onAccountChange }: WalletHeaderProps) {
  const [activeAccount, setActiveAccount] = useState(WalletService.getActiveAccount());
  const { toast } = useToast();

  useEffect(() => {
    setActiveAccount(WalletService.getActiveAccount());
  }, []);

  const handleCopyAddress = async () => {
    if (activeAccount) {
      try {
        await navigator.clipboard.writeText(activeAccount.address);
        toast({
          title: "Address copied",
          description: "Wallet address copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Failed to copy",
          description: "Could not copy address to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  if (!activeAccount) {
    return (
      <header className="bg-gradient-to-r from-primary to-secondary p-4 rounded-b-3xl">
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center space-y-2">
            <img 
              src={paxeerLogo} 
              alt="Paxeer" 
              className="h-8 w-auto"
              data-testid="paxeer-logo"
            />
            <p className="text-white/80 text-sm">No account found</p>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-gradient-to-r from-primary to-secondary p-4 rounded-b-3xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <img 
            src={paxeerLogo} 
            alt="Paxeer" 
            className="h-10 w-auto"
            data-testid="paxeer-logo"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
          onClick={onAccountChange}
          data-testid="button-account-selector"
        >
          <ChevronDown className="text-white text-sm" />
        </Button>
      </div>
      
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 text-sm" data-testid="text-account-name">{activeAccount.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white h-auto p-1"
            onClick={handleCopyAddress}
            data-testid="button-copy-address"
          >
            <Copy className="text-sm" />
          </Button>
        </div>
        <p className="text-white font-mono text-sm truncate" data-testid="text-account-address">
          {activeAccount.address}
        </p>
      </div>
    </header>
  );
}
