import React, { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { WalletService } from "@/lib/wallet";
import { PinService } from "@/lib/pinService";
import "@/lib/walletConnection";
import WalletLanding from "@/pages/WalletLanding";
import { PinEntry } from "@/components/PinEntry";
import Wallet from "@/pages/Wallet";
import TokenDetail from "@/pages/TokenDetail";
import TransactionDetail from "@/pages/TransactionDetail";
import Rewards from "@/pages/Rewards";
import NotFound from "@/pages/not-found";

function Router() {
  const [isWalletInitialized, setIsWalletInitialized] = useState<boolean | null>(null);
  const [hasPIN, setHasPIN] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      // Check if wallet exists
      const walletExists = WalletService.isWalletInitialized();
      setIsWalletInitialized(walletExists);

      if (walletExists) {
        // Check if PIN is set
        const pinExists = PinService.hasPIN();
        setHasPIN(pinExists);

        if (pinExists) {
          // Check if session is valid
          const sessionValid = PinService.isSessionValid();
          setIsUnlocked(sessionValid);
        } else {
          setIsUnlocked(true); // No PIN required
        }
      } else {
        // No wallet means no PIN and should show landing
        setHasPIN(false);
        setIsUnlocked(true);
      }
    } catch (error) {
      console.error('Error in initialization:', error);
      // Fallback to safe defaults
      setIsWalletInitialized(false);
      setHasPIN(false);
      setIsUnlocked(true);
    }

    // Set up session extension on activity
    const handleActivity = () => {
      if (PinService.hasPIN() && PinService.isSessionValid()) {
        PinService.extendSession();
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, []);

  // Handle unlock
  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  // Show loading while checking state
  if (isWalletInitialized === null || hasPIN === null || isUnlocked === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Show landing screen if wallet not initialized
  if (!isWalletInitialized) {
    return <WalletLanding />;
  }

  // Show PIN entry if PIN is set but session invalid
  if (hasPIN && !isUnlocked) {
    return <PinEntry onUnlock={handleUnlock} />;
  }

  // Show main wallet interface
  return (
    <Switch>
      <Route path="/" component={Wallet} />
      <Route path="/rewards" component={Rewards} />
      <Route path="/token/:tokenId" component={TokenDetail} />
      <Route path="/transaction/:hash" component={TransactionDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
