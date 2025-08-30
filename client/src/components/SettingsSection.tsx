import React, { useState, useEffect } from "react";
import { WalletService } from "@/lib/wallet";
import { PinService } from "@/lib/pinService";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Key, Shield, ChevronRight, FileText, Download, Lock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SettingsSection() {
  const [accounts, setAccounts] = useState(WalletService.getAccounts());
  const [activeAccount, setActiveAccount] = useState(WalletService.getActiveAccount());
  const [autoLock, setAutoLock] = useState(true);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showExportKey, setShowExportKey] = useState(false);
  const [showImportAccount, setShowImportAccount] = useState(false);
  const [showExportMnemonic, setShowExportMnemonic] = useState(false);
  const [showImportWallet, setShowImportWallet] = useState(false);
  const [showPinSettings, setShowPinSettings] = useState(false);
  const [showResetWallet, setShowResetWallet] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [importAccountName, setImportAccountName] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [exportedKey, setExportedKey] = useState("");
  const [exportedMnemonic, setExportedMnemonic] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [hasPIN, setHasPIN] = useState(PinService.hasPIN());
  const { toast } = useToast();

  useEffect(() => {
    // Initialize wallet with mnemonic if needed
    WalletService.initializeIfNeeded();
    setAccounts(WalletService.getAccounts());
    setActiveAccount(WalletService.getActiveAccount());
  }, []);

  const handleCreateAccount = () => {
    if (!newAccountName.trim()) {
      toast({
        title: "Invalid name",
        description: "Please enter a valid account name",
        variant: "destructive",
      });
      return;
    }

    try {
      // Initialize wallet if not exists
      if (!WalletService.isWalletInitialized()) {
        const mnemonic = WalletService.initializeWallet();
        toast({
          title: "New wallet created",
          description: "A new wallet with mnemonic seed has been created. Please backup your seed phrase!",
        });
      }
      
      const newAccount = WalletService.generateAccount(newAccountName);
      
      setAccounts(WalletService.getAccounts());
      setActiveAccount(WalletService.getActiveAccount());
      setNewAccountName("");
      setShowCreateAccount(false);

      toast({
        title: "Account created",
        description: `${newAccountName} has been created successfully`,
      });
    } catch (error) {
      toast({
        title: "Failed to create account",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleImportAccount = () => {
    if (!importAccountName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an account name",
        variant: "destructive",
      });
      return;
    }

    if (!privateKeyInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a private key",
        variant: "destructive",
      });
      return;
    }

    try {
      const importedAccount = WalletService.importAccount(privateKeyInput.trim(), importAccountName);
      
      setAccounts(WalletService.getAccounts());
      setActiveAccount(WalletService.getActiveAccount());
      setImportAccountName("");
      setPrivateKeyInput("");
      setShowImportAccount(false);
      
      toast({
        title: "Account imported",
        description: `${importedAccount.name} has been imported successfully`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Invalid private key format",
        variant: "destructive",
      });
    }
  };

  const handleSwitchAccount = (address: string) => {
    WalletService.setActiveAccount(address);
    setActiveAccount(WalletService.getActiveAccount());
    
    toast({
      title: "Account switched",
      description: "Active account has been changed",
    });
  };

  const handleExportPrivateKey = () => {
    if (!activeAccount) return;
    
    const privateKey = WalletService.exportPrivateKey(activeAccount.address);
    if (privateKey) {
      setExportedKey(privateKey);
      setShowExportKey(true);
    }
  };

  const handleCopyPrivateKey = async () => {
    try {
      await navigator.clipboard.writeText(exportedKey);
      toast({
        title: "Private key copied",
        description: "Private key copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy private key to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleExportMnemonic = () => {
    const mnemonic = WalletService.exportMnemonic();
    if (mnemonic) {
      setExportedMnemonic(mnemonic);
      setShowExportMnemonic(true);
    } else {
      toast({
        title: "No mnemonic found",
        description: "This wallet doesn't have a mnemonic seed phrase",
        variant: "destructive",
      });
    }
  };

  const handleCopyMnemonic = async () => {
    try {
      await navigator.clipboard.writeText(exportedMnemonic);
      toast({
        title: "Seed phrase copied",
        description: "Seed phrase copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy seed phrase to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleImportWallet = () => {
    if (!mnemonicInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a mnemonic seed phrase",
        variant: "destructive",
      });
      return;
    }

    try {
      const accounts = WalletService.importWalletFromMnemonic(mnemonicInput.trim());
      
      setAccounts(WalletService.getAccounts());
      setActiveAccount(WalletService.getActiveAccount());
      setMnemonicInput("");
      setShowImportWallet(false);
      
      toast({
        title: "Wallet imported",
        description: `Wallet imported successfully with ${accounts.length} account(s)`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Invalid mnemonic phrase",
        variant: "destructive",
      });
    }
  };

  const handleSetPIN = () => {
    if (newPin.length < 6) {
      toast({
        title: "Error",
        description: "PIN must be at least 6 digits long",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      toast({
        title: "Error", 
        description: "PIN must contain only numbers",
        variant: "destructive",
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: "Error",
        description: "PINs don't match",
        variant: "destructive",
      });
      return;
    }

    PinService.setPIN(newPin);
    setHasPIN(true);
    setNewPin("");
    setConfirmPin("");
    setCurrentPin("");
    setShowPinSettings(false);

    toast({
      title: "Success",
      description: "PIN has been set successfully",
    });
  };

  const handleChangePIN = () => {
    if (!PinService.verifyPIN(currentPin)) {
      toast({
        title: "Error",
        description: "Current PIN is incorrect",
        variant: "destructive",
      });
      return;
    }

    if (newPin.length < 6) {
      toast({
        title: "Error",
        description: "New PIN must be at least 6 digits long",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      toast({
        title: "Error", 
        description: "PIN must contain only numbers",
        variant: "destructive",
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: "Error",
        description: "New PINs don't match",
        variant: "destructive",
      });
      return;
    }

    PinService.setPIN(newPin);
    setNewPin("");
    setConfirmPin("");
    setCurrentPin("");
    setShowPinSettings(false);

    toast({
      title: "Success",
      description: "PIN has been changed successfully",
    });
  };

  const handleRemovePIN = () => {
    if (!PinService.verifyPIN(currentPin)) {
      toast({
        title: "Error",
        description: "Current PIN is incorrect",
        variant: "destructive",
      });
      return;
    }

    PinService.clearPIN();
    setHasPIN(false);
    setCurrentPin("");
    setShowPinSettings(false);

    toast({
      title: "Success",
      description: "PIN has been removed successfully",
    });
  };

  const handleResetWallet = () => {
    // Clear all wallet data
    localStorage.clear();
    
    toast({
      title: "Wallet Reset",
      description: "All wallet data has been cleared. Please refresh the page.",
    });

    // Refresh the page to restart the app
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  return (
    <section className="space-y-4">
      <h3 className="text-white font-semibold text-lg">Settings</h3>

      {/* Account Management */}
      <div className="space-y-3">
        <h4 className="text-white/80 font-medium text-sm uppercase tracking-wide">Account</h4>
        
        <Dialog open={showCreateAccount} onOpenChange={setShowCreateAccount}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="bg-card-bg hover:bg-card-bg/80 rounded-xl p-4 w-full flex items-center justify-between text-white"
              data-testid="button-manage-accounts"
            >
              <div className="flex items-center space-x-3">
                <Users className="text-primary" />
                <span>Manage Accounts</span>
              </div>
              <ChevronRight className="text-white/60" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-card-bg">
            <DialogHeader>
              <DialogTitle className="text-white">Manage Accounts</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account-name" className="text-white">Account Name</Label>
                <Input
                  id="account-name"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="Enter account name"
                  className="bg-card-bg text-white border-card-bg"
                  data-testid="input-account-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleCreateAccount}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-create-account"
                >
                  Create Account
                </Button>
                <Button
                  onClick={() => setShowImportAccount(true)}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                  data-testid="button-import-account"
                >
                  Import Key
                </Button>
                <Button
                  onClick={() => setShowImportWallet(true)}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent/10"
                  data-testid="button-import-wallet"
                >
                  Import Wallet
                </Button>
                <Button
                  onClick={handleExportMnemonic}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent/10"
                  data-testid="button-export-mnemonic"
                >
                  Export Seed
                </Button>
              </div>
              
              <div className="space-y-2">
                <h5 className="text-white font-medium">Existing Accounts</h5>
                {accounts.map((account, index) => (
                  <Button
                    key={account.address}
                    variant="ghost"
                    className={`w-full justify-start p-3 ${
                      activeAccount?.address === account.address 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-card-bg/30 text-white hover:bg-card-bg/50'
                    }`}
                    onClick={() => handleSwitchAccount(account.address)}
                    data-testid={`button-account-${index}`}
                  >
                    <div className="text-left">
                      <p className="font-medium" data-testid={`text-account-name-${index}`}>{account.name}</p>
                      <p className="text-xs opacity-60" data-testid={`text-account-address-${index}`}>
                        {account.address.slice(0, 6)}...{account.address.slice(-4)}
                      </p>
                      <p className="text-xs opacity-40">
                        {account.derivationPath === 'imported' ? 'Imported' : `Path: ${account.derivationPath}`}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Account Dialog */}
        <Dialog open={showImportAccount} onOpenChange={setShowImportAccount}>
          <DialogContent className="bg-black border-card-bg">
            <DialogHeader>
              <DialogTitle className="text-white">Import Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-account-name" className="text-white">Account Name</Label>
                <Input
                  id="import-account-name"
                  value={importAccountName}
                  onChange={(e) => setImportAccountName(e.target.value)}
                  placeholder="Enter account name"
                  className="bg-card-bg text-white border-card-bg"
                  data-testid="input-import-account-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="private-key" className="text-white">Private Key</Label>
                <Input
                  id="private-key"
                  type="password"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="Enter private key (0x...)"
                  className="bg-card-bg/50 text-white border-card-bg font-mono text-sm"
                  data-testid="input-private-key"
                />
              </div>
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                <p className="text-accent text-xs">
                  ⚠️ Never share your private key with anyone. It gives complete access to your funds.
                </p>
              </div>
              <Button
                onClick={handleImportAccount}
                className="w-full bg-primary hover:bg-primary/90"
                data-testid="button-confirm-import"
              >
                Import Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showExportKey} onOpenChange={setShowExportKey}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="bg-card-bg hover:bg-card-bg/80 rounded-xl p-4 w-full flex items-center justify-between text-white"
              onClick={handleExportPrivateKey}
              data-testid="button-export-private-key"
            >
              <div className="flex items-center space-x-3">
                <Key className="text-accent" />
                <span>Export Private Key</span>
              </div>
              <ChevronRight className="text-white/60" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-card-bg">
            <DialogHeader>
              <DialogTitle className="text-white">Private Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-card-bg p-4 rounded-xl">
                <p className="text-white/80 text-sm mb-2">⚠️ Never share your private key</p>
                <p className="text-white font-mono text-xs break-all" data-testid="text-private-key">
                  {exportedKey}
                </p>
              </div>
              <Button
                onClick={handleCopyPrivateKey}
                className="w-full bg-accent text-dark-bg hover:bg-accent/90"
                data-testid="button-copy-private-key"
              >
                Copy Private Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Mnemonic Dialog */}
        <Dialog open={showExportMnemonic} onOpenChange={setShowExportMnemonic}>
          <DialogContent className="bg-black border-card-bg">
            <DialogHeader>
              <DialogTitle className="text-white">Seed Phrase</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm font-medium mb-2">🔒 CRITICAL SECURITY WARNING</p>
                <p className="text-red-300 text-xs">
                  This seed phrase gives complete control over ALL accounts in your wallet. 
                  Never share it with anyone or store it online. Anyone with this phrase can steal all your funds.
                </p>
              </div>
              <div className="bg-card-bg p-4 rounded-xl">
                <p className="text-white font-mono text-sm break-all" data-testid="text-mnemonic">
                  {exportedMnemonic}
                </p>
              </div>
              <Button
                onClick={handleCopyMnemonic}
                className="w-full bg-accent text-dark-bg hover:bg-accent/90"
                data-testid="button-copy-mnemonic"
              >
                Copy Seed Phrase
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Wallet Dialog */}
        <Dialog open={showImportWallet} onOpenChange={setShowImportWallet}>
          <DialogContent className="bg-black border-card-bg">
            <DialogHeader>
              <DialogTitle className="text-white">Import Wallet from Seed</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mnemonic-input" className="text-white">Seed Phrase (12-24 words)</Label>
                <Textarea
                  id="mnemonic-input"
                  value={mnemonicInput}
                  onChange={(e) => setMnemonicInput(e.target.value)}
                  placeholder="Enter your 12 or 24 word seed phrase..."
                  className="bg-card-bg/50 text-white border-card-bg font-mono text-sm min-h-[100px]"
                  data-testid="input-mnemonic"
                />
              </div>
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                <p className="text-accent text-xs">
                  ⚠️ This will replace your current wallet. Make sure you have backed up your current seed phrase!
                </p>
              </div>
              <Button
                onClick={handleImportWallet}
                className="w-full bg-primary hover:bg-primary/90"
                data-testid="button-confirm-import-wallet"
              >
                Import Wallet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Security */}
      <div className="space-y-3">
        <h4 className="text-white/80 font-medium text-sm uppercase tracking-wide">Security</h4>
        
        {/* PIN Settings */}
        <Dialog open={showPinSettings} onOpenChange={setShowPinSettings}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="bg-card-bg hover:bg-card-bg/80 rounded-xl p-4 w-full flex items-center justify-between text-white"
              data-testid="button-pin-settings"
            >
              <div className="flex items-center space-x-3">
                <Lock className="text-primary" />
                <div className="flex flex-col items-start">
                  <span>PIN Protection</span>
                  <span className="text-xs text-white/60">
                    {hasPIN ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
              <ChevronRight className="text-white/60" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-card-bg">
            <DialogHeader>
              <DialogTitle className="text-white">PIN Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!hasPIN ? (
                <>
                  <p className="text-white/80 text-sm">Set up a PIN to secure your wallet</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-pin" className="text-white">New PIN (6-8 digits)</Label>
                      <Input
                        id="new-pin"
                        type="password"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="Enter new PIN"
                        className="bg-card-bg text-white border-card-bg text-center tracking-widest"
                        data-testid="input-new-pin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pin" className="text-white">Confirm PIN</Label>
                      <Input
                        id="confirm-pin"
                        type="password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="Confirm PIN"
                        className="bg-card-bg text-white border-card-bg text-center tracking-widest"
                        data-testid="input-confirm-pin"
                      />
                    </div>
                    <Button
                      onClick={handleSetPIN}
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={newPin.length < 6 || confirmPin.length < 6}
                      data-testid="button-set-pin"
                    >
                      Set PIN
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-white/80 text-sm">PIN protection is enabled</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="current-pin" className="text-white">Current PIN</Label>
                      <Input
                        id="current-pin"
                        type="password"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="Enter current PIN"
                        className="bg-card-bg text-white border-card-bg text-center tracking-widest"
                        data-testid="input-current-pin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-pin" className="text-white">New PIN (6-8 digits)</Label>
                      <Input
                        id="new-pin"
                        type="password"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="Enter new PIN"
                        className="bg-card-bg text-white border-card-bg text-center tracking-widest"
                        data-testid="input-new-pin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pin" className="text-white">Confirm New PIN</Label>
                      <Input
                        id="confirm-pin"
                        type="password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="Confirm new PIN"
                        className="bg-card-bg text-white border-card-bg text-center tracking-widest"
                        data-testid="input-confirm-pin"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={handleChangePIN}
                        className="bg-primary hover:bg-primary/90"
                        disabled={currentPin.length < 6 || newPin.length < 6 || confirmPin.length < 6}
                        data-testid="button-change-pin"
                      >
                        Change PIN
                      </Button>
                      <Button
                        onClick={handleRemovePIN}
                        variant="destructive"
                        disabled={currentPin.length < 6}
                        data-testid="button-remove-pin"
                      >
                        Remove PIN
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Wallet Reset */}
        <Dialog open={showResetWallet} onOpenChange={setShowResetWallet}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="bg-card-bg hover:bg-card-bg/80 rounded-xl p-4 w-full flex items-center justify-between text-white"
              data-testid="button-reset-wallet"
            >
              <div className="flex items-center space-x-3">
                <AlertTriangle className="text-destructive" />
                <span>Reset Wallet</span>
              </div>
              <ChevronRight className="text-white/60" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-card-bg">
            <DialogHeader>
              <DialogTitle className="text-white">Reset Wallet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-destructive/20 border border-destructive/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-destructive mb-1">Warning</p>
                    <p className="text-white/90">
                      This will permanently delete all wallet data including accounts, private keys, and settings. 
                      Make sure you have backed up your recovery phrase before proceeding.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleResetWallet}
                variant="destructive"
                className="w-full"
                data-testid="button-confirm-reset"
              >
                Reset Wallet (Cannot be undone)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="bg-card-bg rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="text-success" />
            <span className="text-white">Auto-Lock</span>
          </div>
          <Switch
            checked={autoLock}
            onCheckedChange={setAutoLock}
            data-testid="switch-auto-lock"
          />
        </div>
      </div>

      {/* Network */}
      <div className="space-y-3">
        <h4 className="text-white/80 font-medium text-sm uppercase tracking-wide">Network</h4>
        
        <div className="bg-card-bg/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white">Current Network</span>
            <span className="text-primary text-sm" data-testid="status-network-connected">Connected</span>
          </div>
          <p className="text-white font-medium" data-testid="text-network-name">Paxeer Network</p>
          <p className="text-white/60 text-sm" data-testid="text-chain-id">Chain ID: 80000</p>
        </div>
      </div>
    </section>
  );
}
