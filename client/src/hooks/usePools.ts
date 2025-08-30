import { useState, useEffect } from 'react';
import { apiCall } from '@/config/api';

interface Pool {
  id: number;
  pool_address: string;
  project_token: string;
  token_name: string;
  token_symbol: string;
  current_price: number;
  market_cap: number;
  total_volume_usdc: number;
  total_trades: number;
  price_change_24h: number;
  ath_price: number;
  atl_price: number;
  created_at: string;
}

interface PoolsHookReturn {
  pools: Pool[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface PoolHookReturn {
  pool: Pool | null;
  loading: boolean;
  error: string | null;
}

export const usePools = (): PoolsHookReturn => {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use our backend API which handles CORS and fallback data
      const response = await apiCall('/api/launch/pools');
      
      if (!response.ok) {
        throw new Error(`API response not ok: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.data?.pools) {
        setPools(data.data.pools);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch pools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPools, 30000);
    return () => clearInterval(interval);
  }, []);

  return { pools, loading, error, refetch: fetchPools };
};

export const usePool = (poolAddress: string): PoolHookReturn => {
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!poolAddress) return;

    const fetchPool = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use our backend API
        const response = await apiCall(`/api/launch/pools/${poolAddress}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setPool(null);
            return;
          }
          throw new Error(`API response not ok: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
          setPool(data.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to fetch pool:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPool();
  }, [poolAddress]);

  return { pool, loading, error };
};

export type { Pool };