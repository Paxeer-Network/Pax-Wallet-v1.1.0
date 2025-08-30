import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Wallet, Download, ArrowRight, Eye, EyeOff } from "lucide-react";
import { WalletService } from "@/lib/wallet";
import { PinService } from "@/lib/pinService";
import { PinSetup } from "../components/PinSetup";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import paxeerLogo from "@assets/image_1756372459245.png";

export default function WalletLanding() {
  const [step, setStep] = useState<'welcome' | 'setup' | 'import' | 'pin'>('welcome');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string>('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleCreateWallet = () => {
    try {
      const mnemonic = WalletService.initializeWallet();
      setGeneratedMnemonic(mnemonic);
      setStep('setup');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImportWallet = () => {
    if (!importMnemonic.trim()) {
      toast({
        title: "Error",
        description: "Please enter your recovery phrase",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!WalletService.validateMnemonic(importMnemonic.trim())) {
        throw new Error("Invalid recovery phrase");
      }

      WalletService.importWalletFromMnemonic(importMnemonic.trim());
      setStep('pin');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid recovery phrase",
        variant: "destructive",
      });
    }
  };

  const handleMnemonicConfirmed = () => {
    setStep('pin');
  };

  const handlePinSetup = (pin: string) => {
    PinService.setPIN(pin);
    toast({
      title: "Success",
      description: "Wallet setup complete! Redirecting to your wallet...",
    });
    // Auto-redirect to portfolio after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  if (step === 'pin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
        <PinSetup onPinSet={handlePinSetup} />
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={paxeerLogo} alt="Paxeer" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl">Secure Your Wallet</CardTitle>
            <CardDescription className="text-white/80">
              Write down your recovery phrase and keep it safe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Recovery Phrase</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMnemonic(!showMnemonic)}
                  className="text-white/80 hover:text-white"
                >
                  {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {generatedMnemonic.split(' ').map((word, index) => (
                  <div
                    key={index}
                    className="bg-white/10 rounded p-2 text-center border border-white/20"
                  >
                    {showMnemonic ? word : '••••'}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-amber-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-400 mb-1">Important Security Notice</p>
                  <p className="text-white/90">
                    Write down this recovery phrase and store it safely. You'll need it to restore your wallet.
                    Never share it with anyone.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleMnemonicConfirmed}
                className="w-full bg-white text-black hover:bg-white/90"
                disabled={!showMnemonic}
              >
                I've Saved My Recovery Phrase
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep('welcome')}
                className="w-full text-white/80 hover:text-white hover:bg-white/10"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'import') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={paxeerLogo} alt="Paxeer" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl">Import Wallet</CardTitle>
            <CardDescription className="text-white/80">
              Enter your 12-word recovery phrase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recovery Phrase</label>
              <textarea
                value={importMnemonic}
                onChange={(e) => setImportMnemonic(e.target.value)}
                placeholder="Enter your 12-word recovery phrase..."
                className="w-full h-32 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 resize-none"
                data-testid="input-mnemonic"
              />
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleImportWallet}
                className="w-full bg-white text-black hover:bg-white/90"
                data-testid="button-import"
              >
                Import Wallet
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep('welcome')}
                className="w-full text-white/80 hover:text-white hover:bg-white/10"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <img src={paxeerLogo} alt="Paxeer" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-3xl mb-2">Welcome to Paxeer</CardTitle>
          <CardDescription className="text-white/80 text-lg">
            Your gateway to the Paxeer Network
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-sm">
              <Shield className="w-5 h-5 text-green-400" />
              <span>Secure & Non-custodial</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Wallet className="w-5 h-5 text-blue-400" />
              <span>Multi-account support</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Download className="w-5 h-5 text-purple-400" />
              <span>Easy backup & restore</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleCreateWallet}
              className="w-full bg-white text-black hover:bg-white/90 font-semibold"
              data-testid="button-create-wallet"
            >
              Create New Wallet
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep('import')}
              className="w-full border-white/30 text-white hover:bg-white/10"
              data-testid="button-import-wallet"
            >
              Import Existing Wallet
            </Button>
          </div>

          <p className="text-xs text-white/60 text-center">
            By creating a wallet, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}