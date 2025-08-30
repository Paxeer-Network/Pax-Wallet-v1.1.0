import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Box } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaxeerLendNew } from "@/components/PaxeerLendNew";
import { PaxeerSwap } from "@/components/PaxeerSwap";
import { PaxeerOptions } from "@/components/PaxeerOptions";

interface BrowserSectionProps {
  openDApp?: string | null;
  onDAppChange?: (dapp: string | null) => void;
}

export function BrowserSection({ openDApp, onDAppChange }: BrowserSectionProps) {
  const [url, setUrl] = useState("");
  const [currentDApp, setCurrentDApp] = useState<string | null>(null);
  const { toast } = useToast();

  // Handle external dApp opening requests
  useEffect(() => {
    if (openDApp) {
      setCurrentDApp(openDApp);
      onDAppChange?.(null); // Clear the external request
    }
  }, [openDApp, onDAppChange]);

  const popularDApps = [
    { name: "PaxeerSwap", description: "Decentralized Exchange", url: "https://swap.paxeer.app" },
    { name: "PaxeerLend", description: "Lending Protocol", url: "https://lend.paxeer.app" },
    { name: "PaxeerOptions", description: "Options Trading", url: "https://options.paxeer.app" },
  ];

  const handleSearch = () => {
    if (!url.trim()) {
      toast({
        title: "Enter URL",
        description: "Please enter a URL or search term",
        variant: "destructive",
      });
      return;
    }

    // In a real implementation, this would navigate to the dApp
    toast({
      title: "Navigation",
      description: `Would navigate to: ${url}`,
    });
  };

  const handleDAppClick = (dapp: typeof popularDApps[0]) => {
    if (dapp.name === "PaxeerLend") {
      setCurrentDApp("PaxeerLend");
    } else if (dapp.name === "PaxeerSwap") {
      setCurrentDApp("PaxeerSwap");
    } else if (dapp.name === "PaxeerOptions") {
      setCurrentDApp("PaxeerOptions");
    } else {
      toast({
        title: `Opening ${dapp.name}`,
        description: `Would open ${dapp.description}`,
      });
    }
  };

  // If a dApp is selected, render it
  if (currentDApp === "PaxeerLend") {
    return <PaxeerLendNew onBack={() => setCurrentDApp(null)} />;
  }
  
  if (currentDApp === "PaxeerSwap") {
    return <PaxeerSwap onBack={() => setCurrentDApp(null)} />;
  }


  if (currentDApp === "PaxeerOptions") {
    return <PaxeerOptions onBack={() => setCurrentDApp(null)} />;
  }

  return (
    <section className="space-y-4">
      <h3 className="text-white font-semibold text-lg">dApp Browser</h3>
      
      {/* Search Bar */}
      <div className="bg-card-bg/30 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <Search className="text-white/60 w-5 h-5" />
          <Input
            type="text"
            placeholder="Enter URL or search dApps"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="bg-transparent text-white placeholder-white/60 border-none outline-none focus-visible:ring-0"
            data-testid="input-dapp-url"
          />
        </div>
      </div>

      {/* Popular dApps */}
      <div className="space-y-3">
        <h4 className="text-white font-medium">Popular dApps</h4>
        <div className="grid grid-cols-2 gap-3">
          {popularDApps.map((dapp, index) => (
            <Button
              key={index}
              variant="ghost"
              className="bg-card-bg hover:bg-card-bg/80 rounded-xl p-4 text-left h-auto flex flex-col items-start space-y-3"
              onClick={() => handleDAppClick(dapp)}
              data-testid={`button-dapp-${index}`}
            >
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Box className="text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-sm" data-testid={`text-dapp-name-${index}`}>
                  {dapp.name}
                </p>
                <p className="text-white/60 text-xs" data-testid={`text-dapp-description-${index}`}>
                  {dapp.description}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Browser placeholder */}
      <div className="bg-card-bg/30 rounded-xl p-6 text-center">
        <p className="text-white/60 text-sm mb-2">dApp Browser</p>
        <p className="text-white/40 text-xs">
          Connect to decentralized applications on Paxeer Network
        </p>
      </div>
    </section>
  );
}
