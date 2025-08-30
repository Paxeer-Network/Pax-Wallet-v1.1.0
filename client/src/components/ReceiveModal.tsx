import { useState, useEffect } from "react";
import { WalletService } from "@/lib/wallet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiveModal({ isOpen, onClose }: ReceiveModalProps) {
  const [activeAccount, setActiveAccount] = useState(WalletService.getActiveAccount());
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const account = WalletService.getActiveAccount();
    setActiveAccount(account);
    
    // Generate QR code when account changes or modal opens
    if (account?.address) {
      generateQRCode(account.address);
    }
  }, [isOpen]);

  const generateQRCode = async (address: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(address, {
        width: 200,
        margin: 2,
        color: {
          dark: '#2D3436',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

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
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-dark-bg border-card-bg max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold text-lg">Receive PAX</DialogTitle>
          </DialogHeader>
          <div className="text-center p-4">
            <p className="text-white/60">No active account found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-dark-bg border-card-bg max-w-sm mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white font-semibold text-lg">Receive PAX</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white h-auto p-1"
              onClick={onClose}
              data-testid="button-close-receive-modal"
            >
              <X />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="text-center space-y-4">
          {/* QR Code */}
          <div className="w-48 h-48 bg-white rounded-xl mx-auto flex items-center justify-center p-4">
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="Wallet Address QR Code" 
                className="w-full h-full object-contain"
                data-testid="img-qr-code"
              />
            ) : (
              <div className="text-black text-sm font-medium text-center">
                Generating QR Code...
              </div>
            )}
          </div>
          
          {/* Address Display */}
          <div className="bg-card-bg/30 rounded-xl p-4">
            <p className="text-white/80 text-sm mb-2">Your Paxeer Address</p>
            <p className="text-white font-mono text-sm break-all" data-testid="text-receive-address">
              {activeAccount.address}
            </p>
          </div>
          
          {/* Copy Button */}
          <Button
            onClick={handleCopyAddress}
            className="w-full bg-card-bg/50 hover:bg-card-bg/70 text-white font-semibold py-3 rounded-xl transition-colors"
            data-testid="button-copy-receive-address"
          >
            <Copy className="mr-2 w-4 h-4" />
            Copy Address
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
