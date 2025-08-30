import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTradeStream } from '../../lib/trade-stream-context';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface MobileOrderBookProps {
  symbol?: string;
  baseCurrency?: string;
  grouping?: string;
}

const MobileOrderBook: React.FC<MobileOrderBookProps> = ({ 
  symbol = 'BTC/USDC', 
  baseCurrency = 'BTC',
  grouping = '1' 
}) => {
  const { orderbook, lastPrice: streamLastPrice, isConnected, updateSubscription } = useTradeStream();
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [spread, setSpread] = useState<number>(0);
  const [lastPrice, setLastPrice] = useState<number>(0);

  // Process real orderbook data
  useEffect(() => {
    if (orderbook && orderbook.levels) {
      const [bidLevels, askLevels] = orderbook.levels;
      
      // Process bids (buy orders)
      const processedBids: OrderBookEntry[] = bidLevels.slice(0, 5).map(level => {
        const price = parseFloat(level.px);
        const amount = parseFloat(level.sz);
        return {
          price,
          amount,
          total: price * amount
        };
      });
      
      // Process asks (sell orders)
      const processedAsks: OrderBookEntry[] = askLevels.slice(0, 5).map(level => {
        const price = parseFloat(level.px);
        const amount = parseFloat(level.sz);
        return {
          price,
          amount,
          total: price * amount
        };
      }).reverse(); // Show lowest ask first
      
      setBids(processedBids);
      setAsks(processedAsks);
      
      // Calculate spread
      if (processedBids.length > 0 && processedAsks.length > 0) {
        const bestBid = processedBids[0].price;
        const bestAsk = processedAsks[processedAsks.length - 1].price;
        setSpread(bestAsk - bestBid);
      }
    }
  }, [orderbook]);
  
  // Update last price from stream
  useEffect(() => {
    if (streamLastPrice) {
      setLastPrice(parseFloat(streamLastPrice));
    }
  }, [streamLastPrice]);
  
  // Update subscription when currency or grouping changes
  useEffect(() => {
    updateSubscription(grouping, baseCurrency);
  }, [grouping, baseCurrency, updateSubscription]);

  return (
    <Card className="bg-card-bg border-card-bg">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm font-semibold flex items-center justify-between">
          Order Book
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {symbol}
            </Badge>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} title={isConnected ? 'Connected' : 'Disconnected'} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Current Price and Spread */}
        <div className="bg-black/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs">Last Price</span>
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400 font-medium text-sm">
                ${lastPrice > 0 ? lastPrice.toLocaleString() : 'Loading...'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs">Spread</span>
            <span className="text-white text-sm">
              ${spread > 0 ? spread.toFixed(2) : 'Loading...'}
            </span>
          </div>
        </div>

        {/* Asks (Sell Orders) */}
        <div className="space-y-1">
          <h4 className="text-red-400 text-xs font-medium flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            Asks
          </h4>
          <div className="space-y-1">
            {asks.slice(0, 3).map((ask, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-red-400 font-mono">
                  ${ask.price.toLocaleString()}
                </span>
                <span className="text-white/60">
                  {ask.amount.toFixed(4)}
                </span>
                <span className="text-white/40">
                  ${ask.total.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="space-y-1">
          <h4 className="text-green-400 text-xs font-medium flex items-center">
            <TrendingDown className="w-3 h-3 mr-1" />
            Bids
          </h4>
          <div className="space-y-1">
            {bids.slice(0, 3).map((bid, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-green-400 font-mono">
                  ${bid.price.toLocaleString()}
                </span>
                <span className="text-white/60">
                  {bid.amount.toFixed(4)}
                </span>
                <span className="text-white/40">
                  ${bid.total.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Market Depth Indicator */}
        <div className="bg-black/20 rounded p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Market Depth</span>
            <div className="flex space-x-2">
              <div className="w-8 h-1 bg-green-500/30 rounded">
                <div className="w-6 h-1 bg-green-500 rounded"></div>
              </div>
              <div className="w-8 h-1 bg-red-500/30 rounded">
                <div className="w-4 h-1 bg-red-500 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileOrderBook;
