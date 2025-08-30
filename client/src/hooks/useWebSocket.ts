import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketHookReturn {
  data: any;
  connected: boolean;
  error: Error | null;
  sendMessage: (message: any) => void;
  disabled: boolean;
}

const useWebSocket = (url: string, enabled: boolean = true): WebSocketHookReturn => {
  const [data, setData] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [disabled, setDisabled] = useState(!enabled);
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3; // Reduced attempts
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (disabled || !enabled) {
      console.log('🔌 WebSocket connection disabled, using REST API fallback');
      return;
    }

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        console.log('🔌 WebSocket connected to PaxeerLaunch');
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setData(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.current.onclose = (event) => {
        setConnected(false);
        console.log('🔌 WebSocket disconnected from PaxeerLaunch');
        
        // Don't try to reconnect if connection was deliberately closed
        if (event.code === 1000 || disabled) return;
        
        // Attempt reconnection with backoff, but stop after max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts.current - 1), 10000);
          console.log(`🔄 Reconnecting to PaxeerLaunch in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.log('❌ Max WebSocket reconnection attempts reached - switching to REST API mode');
          setDisabled(true);
          setError(new Error('WebSocket unavailable - using REST API fallback'));
        }
      };

      ws.current.onerror = (wsError) => {
        const error = new Error('WebSocket connection error');
        setError(error);
        console.error('🔌 PaxeerLaunch WebSocket error:', wsError);
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect WebSocket');
      setError(error);
      console.error('Failed to connect WebSocket:', err);
      // Disable WebSocket after connection creation fails
      setDisabled(true);
    }
  }, [url, disabled, enabled]);

  useEffect(() => {
    if (enabled && !disabled) {
      connect();
    }

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect, enabled, disabled]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  return { data, connected, error, sendMessage, disabled };
};

export default useWebSocket;