import React, { useState, useEffect } from "react";
import { WalletService } from "@/lib/wallet";
import { WalletHeader } from "@/components/WalletHeader";
import { PortfolioSection } from "@/components/PortfolioSection";
import { TransactionsSection } from "@/components/TransactionsSection";
import { BrowserSection } from "@/components/BrowserSection";
import { GamefiedRewards } from "@/components/GamefiedRewards";
import { SettingsSection } from "@/components/SettingsSection";
import { BottomNavigation, type TabType } from "@/components/BottomNavigation";
import { SendModal } from "@/components/SendModal";
import { ReceiveModal } from "@/components/ReceiveModal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Wallet() {
  const [activeTab, setActiveTab] = useState<TabType>("portfolio");
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [openDApp, setOpenDApp] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const accounts = WalletService.getAccounts();
    setHasAccounts(accounts.length > 0);
    
    // Create a default account if none exists
    if (accounts.length === 0) {
      const defaultAccount = WalletService.generateAccount("Account 1");
      WalletService.saveAccount(defaultAccount);
      setHasAccounts(true);
      
      toast({
        title: "Welcome to Paxeer Wallet",
        description: "Your first account has been created",
      });
    }
  }, [toast]);

  const handleAccountChange = () => {
    setActiveTab("settings");
  };

  const handleSend = () => {
    if (!hasAccounts) {
      toast({
        title: "No account found",
        description: "Please create an account first",
        variant: "destructive",
      });
      return;
    }
    setShowSendModal(true);
  };

  const handleReceive = () => {
    if (!hasAccounts) {
      toast({
        title: "No account found",
        description: "Please create an account first",
        variant: "destructive",
      });
      return;
    }
    setShowReceiveModal(true);
  };

  const handleSwap = () => {
    if (!hasAccounts) {
      toast({
        title: "No account found",
        description: "Please create an account first",
        variant: "destructive",
      });
      return;
    }
    // Navigate to browser tab and open PaxeerSwap
    setActiveTab("browser");
    setOpenDApp("PaxeerSwap");
  };

  const renderActiveSection = () => {
    switch (activeTab) {
      case "portfolio":
        return (
          <PortfolioSection
            onSend={handleSend}
            onReceive={handleReceive}
            onSwap={handleSwap}
          />
        );
      case "transactions":
        return <TransactionsSection />;
      case "browser":
        return <BrowserSection openDApp={openDApp} onDAppChange={setOpenDApp} />;
      case "rewards":
        return <GamefiedRewards />;
      case "settings":
        return <SettingsSection />;
      default:
        return (
          <PortfolioSection
            onSend={handleSend}
            onReceive={handleReceive}
            onSwap={handleSwap}
          />
        );
    }
  };

  return (
    <div className="max-w-md mx-auto bg-dark-bg min-h-screen relative pb-20">
      <WalletHeader onAccountChange={handleAccountChange} />
      
      <main className="p-4 space-y-6">
        {renderActiveSection()}
      </main>

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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
