'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { orderbookConfig } from '../config/orderbookConfig';

// Types for orderbook and trade data
interface OrderbookLevel {
  px: string;
  sz: string;
}

interface Orderbook {
  coin: string;
  levels: [OrderbookLevel[], OrderbookLevel[]];
  time: number;
  grouping?: string;
}

interface Trade {
  coin: string;
  side: string;
  px: string;
  sz: string;
  time: number;
  tid: number;
}

interface TradeStreamContextValue {
  orderbook: Orderbook | null;
  trades: Trade[];
  lastPrice: string | null;
  isConnected: boolean;
  updateSubscription: (grouping: string, baseCurrency: string) => void;
  reconnect: () => void;
}

const TradeStreamContext = createContext<TradeStreamContextValue | null>(null);

export const useTradeStream = () => {
  const context = useContext(TradeStreamContext);
  if (!context) {
    throw new Error('useTradeStream must be used within a TradeStreamProvider');
  }
  return context;
};

// Helper function to get nSigFigs for grouping
const getNSigFigsForGrouping = (grouping: string, coin: string): number | null => {
  const config = orderbookConfig[coin] || orderbookConfig.default;
  return config.sigFigMapping[grouping] || null;
};

interface TradeStreamProviderProps {
  children: React.ReactNode;
  baseCurrency?: string;
  initialGrouping?: string;
}

export const TradeStreamProvider: React.FC<TradeStreamProviderProps> = ({
  children,
  baseCurrency = 'BTC',
  initialGrouping = '1'
}) => {
  const [orderbook, setOrderbook] = useState<Orderbook | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [lastPrice, setLastPrice] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const hyperliquidWsRef = useRef<WebSocket | null>(null);
  const currentNSigFigsRef = useRef<number | null>(null);
  const currentGroupingRef = useRef<string>(initialGrouping);
  const tradesBufferRef = useRef<Trade[]>([]);
  const flushTradesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket connection
  const initializeHyperliquidConnection = useCallback(() => {
    console.log('[TradeStream] Initializing HyperLiquid connection...');
    
    if (hyperliquidWsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[TradeStream] Connection already open');
      return;
    }

    try {
      const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
      hyperliquidWsRef.current = ws;

      ws.onopen = () => {
        console.log('[TradeStream] HyperLiquid WebSocket connected');
        setIsConnected(true);
        
        // Subscribe to initial orderbook and trades
        const coin = baseCurrency;
        const nSigFigs = getNSigFigsForGrouping(currentGroupingRef.current, coin);
        
        if (nSigFigs !== null) {
          ws.send(JSON.stringify({
            method: "subscribe",
            subscription: { type: "l2Book", coin, nSigFigs }
          }));
          currentNSigFigsRef.current = nSigFigs;
        }

        // Subscribe to trades
        ws.send(JSON.stringify({
          method: "subscribe",
          subscription: { type: "trades", coin }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.channel === 'l2Book' && data.data) {
            const bookData = data.data;
            setOrderbook({
              coin: bookData.coin,
              levels: bookData.levels,
              time: bookData.time,
              grouping: currentGroupingRef.current
            });
          } else if (data.channel === 'trades' && data.data) {
            const newTrades = Array.isArray(data.data) ? data.data : [data.data];
            
            // Update last price from most recent trade
            if (newTrades.length > 0) {
              const mostRecent = newTrades[newTrades.length - 1];
              setLastPrice(mostRecent.px);
            }
            
            // Buffer trades for batched updates
            tradesBufferRef.current.push(...newTrades);
            
            // Clear existing timeout
            if (flushTradesTimeoutRef.current) {
              clearTimeout(flushTradesTimeoutRef.current);
            }
            
            // Set new timeout to flush trades
            flushTradesTimeoutRef.current = setTimeout(() => {
              if (tradesBufferRef.current.length > 0) {
                setTrades(prev => {
                  const combined = [...prev, ...tradesBufferRef.current];
                  // Keep only the most recent 100 trades
                  return combined.slice(-100).sort((a, b) => b.time - a.time);
                });
                tradesBufferRef.current = [];
              }
            }, 100);
          }
        } catch (error) {
          console.error('[TradeStream] Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[TradeStream] HyperLiquid WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('[TradeStream] HyperLiquid WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds if not a clean close
        if (event.code !== 1000) {
          setTimeout(() => {
            console.log('[TradeStream] Attempting to reconnect...');
            initializeHyperliquidConnection();
          }, 3000);
        }
      };
    } catch (error) {
      console.error('[TradeStream] Error initializing HyperLiquid connection:', error);
      setIsConnected(false);
    }
  }, [baseCurrency]);

  // Update subscription for different grouping or currency
  const updateHyperliquidSubscription = useCallback((grouping: string, baseCurrency: string) => {
    if (!hyperliquidWsRef.current || hyperliquidWsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[TradeStream] WebSocket not open, cannot update subscription.');
      return;
    }

    const coin = baseCurrency;
    const newNSigFigs = getNSigFigsForGrouping(grouping, coin);
    const oldNSigFigs = currentNSigFigsRef.current;
    const currentCoin = orderbook?.coin;

    // Update the current grouping reference
    currentGroupingRef.current = grouping;

    // If currency changed or nSigFigs changed, update subscription
    if (coin !== currentCoin || newNSigFigs !== oldNSigFigs) {
      // Clear orderbook when switching pairs
      setOrderbook(null);
      setTrades([]);
      setLastPrice(null);

      // Unsubscribe from old subscriptions
      if (oldNSigFigs !== null && currentCoin) {
        hyperliquidWsRef.current.send(JSON.stringify({
          method: "unsubscribe",
          subscription: { type: "l2Book", coin: currentCoin, nSigFigs: oldNSigFigs }
        }));
        hyperliquidWsRef.current.send(JSON.stringify({
          method: "unsubscribe",
          subscription: { type: "trades", coin: currentCoin }
        }));
      }

      // Subscribe to new currency
      if (newNSigFigs !== null) {
        hyperliquidWsRef.current.send(JSON.stringify({
          method: "subscribe",
          subscription: { type: "l2Book", coin, nSigFigs: newNSigFigs }
        }));
      }
      
      // Subscribe to trades for new currency
      hyperliquidWsRef.current.send(JSON.stringify({
        method: "subscribe",
        subscription: { type: "trades", coin }
      }));

      currentNSigFigsRef.current = newNSigFigs;
    } else {
      // Even if nSigFigs didn't change, update the orderbook's grouping property
      if (orderbook) {
        setOrderbook(prev => prev ? {
          ...prev,
          grouping
        } : null);
      }
    }
  }, [orderbook]);

  const reconnect = useCallback(() => {
    console.log('[TradeStream] Manual reconnect requested');
    if (hyperliquidWsRef.current) {
      hyperliquidWsRef.current.close();
    }
    initializeHyperliquidConnection();
  }, [initializeHyperliquidConnection]);

  // Initialize connection on mount
  useEffect(() => {
    initializeHyperliquidConnection();

    return () => {
      console.log('[TradeStream] Cleaning up WebSocket connection');
      if (flushTradesTimeoutRef.current) {
        clearTimeout(flushTradesTimeoutRef.current);
      }
      if (hyperliquidWsRef.current) {
        hyperliquidWsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [initializeHyperliquidConnection]);

  const contextValue: TradeStreamContextValue = {
    orderbook,
    trades,
    lastPrice,
    isConnected,
    updateSubscription: updateHyperliquidSubscription,
    reconnect
  };

  return (
    <TradeStreamContext.Provider value={contextValue}>
      {children}
    </TradeStreamContext.Provider>
  );
};
