import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, AlertTriangle } from "lucide-react";
import { PinService } from "@/lib/pinService";
import { useToast } from "@/hooks/use-toast";
import paxeerLogo from "@assets/image_1756372459245.png";

interface PinEntryProps {
  onUnlock: () => void;
  showLogo?: boolean;
}

export function PinEntry({ onUnlock, showLogo = true }: PinEntryProps) {
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handlePinSubmit = () => {
    if (isLocked) return;

    if (pin.length < 6) {
      toast({
        title: "Error",
        description: "Please enter your complete PIN",
        variant: "destructive",
      });
      return;
    }

    const isValid = PinService.verifyPIN(pin);
    
    if (isValid) {
      setPin('');
      setAttempts(0);
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');

      if (newAttempts >= 3) {
        setIsLocked(true);
        setLockoutTime(30); // 30 seconds lockout
        toast({
          title: "Too Many Attempts",
          description: "Wallet locked for 30 seconds",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Incorrect PIN",
          description: `${3 - newAttempts} attempts remaining`,
          variant: "destructive",
        });
      }
    }
  };

  const handlePinInput = (value: string) => {
    if (isLocked) return;
    const numericValue = value.replace(/\D/g, '').slice(0, 8);
    setPin(numericValue);
  };

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white">
        <CardHeader className="text-center">
          {showLogo && (
            <div className="flex justify-center mb-4">
              <img src={paxeerLogo} alt="Paxeer" className="h-12 w-auto" />
            </div>
          )}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Enter PIN</CardTitle>
          <CardDescription className="text-white/80">
            {isLocked 
              ? `Wallet locked. Try again in ${formatTime(lockoutTime)}`
              : 'Enter your PIN to unlock your wallet'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Input
              type="password"
              value={pin}
              onChange={(e) => handlePinInput(e.target.value)}
              placeholder={isLocked ? "Locked" : "Enter your PIN"}
              className="text-center text-2xl tracking-widest bg-white/10 border-white/20 text-white placeholder-white/50"
              maxLength={8}
              disabled={isLocked}
              data-testid="input-unlock-pin"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handlePinSubmit();
                }
              }}
            />
          </div>

          {attempts > 0 && !isLocked && (
            <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-400">
                  {attempts} incorrect attempt{attempts > 1 ? 's' : ''}. 
                  {3 - attempts} remaining before lockout.
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handlePinSubmit}
            disabled={pin.length < 6 || isLocked}
            className="w-full bg-white text-primary hover:bg-white/90"
            data-testid="button-unlock"
          >
            {isLocked ? `Locked (${formatTime(lockoutTime)})` : 'Unlock Wallet'}
          </Button>

          <p className="text-xs text-white/60 text-center">
            Forgot your PIN? You'll need to restore from your recovery phrase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}