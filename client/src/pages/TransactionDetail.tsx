import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ethers } from "ethers";
import { type TransactionDetail } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Copy, CheckCircle, XCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function TransactionDetailPage() {
  const [, params] = useRoute("/transaction/:hash");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const transactionHash = params?.hash as string;

  const { data: transaction, isLoading, error } = useQuery<TransactionDetail>({
    queryKey: ["/api", "paxeer", "transaction", transactionHash],
    enabled: !!transactionHash,
    staleTime: 60000, // Transaction details don't change often
  });


  const handleBack = () => {
    setLocation("/");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const formatTokenAmount = (rawAmount: string, decimals: number = 18) => {
    try {
      const formattedAmount = ethers.formatUnits(rawAmount, decimals);
      const numAmount = parseFloat(formattedAmount);
      
      if (numAmount === 0) return "0";
      if (numAmount < 0.001) return "<0.001";
      if (numAmount < 1) return numAmount.toFixed(6).replace(/\.?0+$/, "");
      if (numAmount < 1000) return numAmount.toFixed(3).replace(/\.?0+$/, "");
      return numAmount.toFixed(2);
    } catch (error) {
      console.error('Error formatting token amount:', error);
      return rawAmount;
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "error":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok":
        return "text-success";
      case "error":
        return "text-destructive";
      default:
        return "text-warning";
    }
  };

  if (!transactionHash) {
    return (
      <div className="max-w-md mx-auto bg-dark-bg min-h-screen">
        <div className="p-4 text-center">
          <p className="text-white/60">Transaction not found</p>
          <Button onClick={handleBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-dark-bg min-h-screen">
        <div className="p-4 space-y-6">
          <Skeleton className="h-12 w-full bg-white/20" />
          <Skeleton className="h-32 w-full bg-white/20" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full bg-white/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-dark-bg min-h-screen">
        <header className="bg-gradient-to-r from-primary to-secondary p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={handleBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-white font-semibold text-lg">Transaction Details</h1>
          </div>
        </header>
        <div className="p-4 text-center">
          <p className="text-white/60 mb-4">Failed to load transaction details</p>
          <p className="text-white/40 text-sm mb-4">Error: {error?.message || 'Unknown error'}</p>
          <Button onClick={handleBack}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-md mx-auto bg-dark-bg min-h-screen">
        <header className="bg-gradient-to-r from-primary to-secondary p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={handleBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-white font-semibold text-lg">Transaction Details</h1>
          </div>
        </header>
        <div className="p-4 text-center">
          <p className="text-white/60">Transaction not found</p>
          <Button onClick={handleBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-dark-bg min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-secondary p-4">
        <div className="flex items-center space-x-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white font-semibold text-lg">Transaction Details</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Status Card */}
        <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            {getStatusIcon(transaction.status)}
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${getStatusColor(transaction.status)}`} data-testid="text-transaction-status">
            {transaction.status === "ok" ? "Success" : transaction.status === "error" ? "Failed" : "Pending"}
          </h2>
          <p className="text-white/60 text-sm">
            {transaction.transaction_types.join(", ")}
          </p>
        </div>

        {/* Transaction Hash */}
        <div className="bg-card-bg/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold">Transaction Hash</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80"
              onClick={() => copyToClipboard(transaction.hash, "Transaction hash")}
              data-testid="button-copy-hash"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-white/80 font-mono text-xs break-words overflow-hidden" data-testid="text-transaction-hash">
            {transaction.hash}
          </p>
        </div>

        {/* Amount and Fee */}
        <div className="bg-card-bg/30 rounded-xl p-4 space-y-4">
          <div>
            <h3 className="text-white font-semibold mb-3">Value & Fees</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/60 text-sm">Amount</p>
                <p className="text-white font-medium" data-testid="text-transaction-amount">
                  {formatTokenAmount(transaction.value)} PAX
                </p>
                {transaction.exchange_rate && (
                  <p className="text-white/60 text-xs">
                    ≈ ${(parseFloat(formatTokenAmount(transaction.value)) * parseFloat(transaction.exchange_rate)).toFixed(2)} USD
                  </p>
                )}
              </div>
              <div>
                <p className="text-white/60 text-sm">Transaction Fee</p>
                <p className="text-white font-medium" data-testid="text-transaction-fee">
                  {formatTokenAmount(transaction.fee.value)} PAX
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* From/To Addresses */}
        <div className="bg-card-bg/30 rounded-xl p-4 space-y-4">
          <h3 className="text-white font-semibold">Addresses</h3>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/60 text-sm">From</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
                onClick={() => copyToClipboard(transaction.from.hash, "From address")}
                data-testid="button-copy-from"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-white font-mono text-xs break-words overflow-hidden" data-testid="text-from-address">
              {transaction.from.hash}
            </p>
            {transaction.from.name && (
              <p className="text-white/60 text-xs">{transaction.from.name}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/60 text-sm">To</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
                onClick={() => copyToClipboard(transaction.to.hash, "To address")}
                data-testid="button-copy-to"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-white font-mono text-xs break-words overflow-hidden" data-testid="text-to-address">
              {transaction.to.hash}
            </p>
            {transaction.to.name && (
              <p className="text-white/60 text-xs">{transaction.to.name}</p>
            )}
          </div>
        </div>

        {/* Gas Details */}
        <div className="bg-card-bg/30 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Gas Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/60">Gas Used</p>
              <p className="text-white font-medium" data-testid="text-gas-used">
                {parseInt(transaction.gas_used).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-white/60">Gas Limit</p>
              <p className="text-white font-medium" data-testid="text-gas-limit">
                {parseInt(transaction.gas_limit).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-white/60">Gas Price</p>
              <p className="text-white font-medium" data-testid="text-gas-price">
                {formatTokenAmount(transaction.gas_price, 9)} Gwei
              </p>
            </div>
            {transaction.base_fee_per_gas && (
              <div>
                <p className="text-white/60">Base Fee</p>
                <p className="text-white font-medium" data-testid="text-base-fee">
                  {formatTokenAmount(transaction.base_fee_per_gas, 9)} Gwei
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Block Information */}
        <div className="bg-card-bg/30 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Block Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/60">Block Number</p>
              <p className="text-white font-medium" data-testid="text-block-number">
                {transaction.block_number.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-white/60">Position</p>
              <p className="text-white font-medium" data-testid="text-transaction-position">
                {transaction.position}
              </p>
            </div>
            <div>
              <p className="text-white/60">Timestamp</p>
              <p className="text-white font-medium" data-testid="text-transaction-timestamp">
                {formatDate(transaction.timestamp)}
              </p>
            </div>
            <div>
              <p className="text-white/60">Confirmations</p>
              <p className="text-white font-medium" data-testid="text-confirmations">
                {transaction.confirmations}
              </p>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-card-bg/30 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Technical Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Nonce</span>
              <span className="text-white font-medium" data-testid="text-nonce">{transaction.nonce}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Type</span>
              <span className="text-white font-medium" data-testid="text-transaction-type">{transaction.type}</span>
            </div>
            {transaction.method && (
              <div className="flex justify-between">
                <span className="text-white/60">Method</span>
                <span className="text-white font-medium" data-testid="text-method">{transaction.method}</span>
              </div>
            )}
          </div>
        </div>

        {/* View on Explorer */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open(`https://paxscan.paxeer.app/tx/${transaction.hash}`, '_blank')}
          data-testid="button-view-explorer"
        >
          <ExternalLink className="mr-2 w-4 h-4" />
          View on Paxscan
        </Button>
      </main>
    </div>
  );
}