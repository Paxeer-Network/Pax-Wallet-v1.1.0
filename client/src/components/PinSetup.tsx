import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, Check, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import paxeerLogo from "@assets/image_1756372459245.png";

interface PinSetupProps {
  onPinSet: (pin: string) => void;
}

export function PinSetup({ onPinSet }: PinSetupProps) {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const { toast } = useToast();

  const handleCreatePin = () => {
    if (pin.length < 6) {
      toast({
        title: "Error",
        description: "PIN must be at least 6 digits long",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d+$/.test(pin)) {
      toast({
        title: "Error", 
        description: "PIN must contain only numbers",
        variant: "destructive",
      });
      return;
    }

    setStep('confirm');
  };

  const handleConfirmPin = () => {
    if (pin !== confirmPin) {
      toast({
        title: "Error",
        description: "PINs don't match. Please try again.",
        variant: "destructive",
      });
      setConfirmPin('');
      return;
    }

    onPinSet(pin);
  };

  const handlePinInput = (value: string, isConfirm = false) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 8);
    if (isConfirm) {
      setConfirmPin(numericValue);
    } else {
      setPin(numericValue);
    }
  };

  return (
    <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <img src={paxeerLogo} alt="Paxeer" className="h-12 w-auto" />
        </div>
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-400" />
          </div>
        </div>
        <CardTitle className="text-2xl">
          {step === 'create' ? 'Create PIN' : 'Confirm PIN'}
        </CardTitle>
        <CardDescription className="text-white/80">
          {step === 'create' 
            ? 'Create a secure PIN to protect your wallet'
            : 'Re-enter your PIN to confirm'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'create' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter PIN</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => handlePinInput(e.target.value)}
                placeholder="Enter 6-8 digit PIN"
                className="text-center text-2xl tracking-widest bg-white/10 border-white/20 text-white placeholder-white/50"
                maxLength={8}
                data-testid="input-pin"
              />
            </div>

            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-400 mb-1">Security Tips</p>
                  <ul className="text-white/90 space-y-1">
                    <li>• Use at least 6 digits</li>
                    <li>• Don't use obvious patterns (123456)</li>
                    <li>• Don't share your PIN with anyone</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreatePin}
              disabled={pin.length < 6}
              className="w-full bg-white text-black hover:bg-white/90"
              data-testid="button-create-pin"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm PIN</label>
              <Input
                type="password"
                value={confirmPin}
                onChange={(e) => handlePinInput(e.target.value, true)}
                placeholder="Re-enter your PIN"
                className="text-center text-2xl tracking-widest bg-white/10 border-white/20 text-white placeholder-white/50"
                maxLength={8}
                data-testid="input-confirm-pin"
              />
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleConfirmPin}
                disabled={confirmPin.length < 6}
                className="w-full bg-white text-black hover:bg-white/90"
                data-testid="button-confirm-pin"
              >
                Complete Setup
                <Check className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setStep('create');
                  setConfirmPin('');
                }}
                className="w-full text-white/80 hover:text-white hover:bg-white/10"
              >
                Back
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}