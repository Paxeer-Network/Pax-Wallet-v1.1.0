import { queryClient } from "./queryClient";
import { apiCall } from "@/config/api";

export interface BlockchainStats {
  latestBlock: number;
  totalTransactions: number;
}

export interface AddressBalance {
  address: string;
  balance: string;
  source?: string;
}

export interface PaxeerTransaction {
  hash: string;
  from_address_hash?: string;
  to_address_hash?: string;
  from?: {
    hash: string;
    name?: string;
    is_contract?: boolean;
  };
  to?: {
    hash: string;
    name?: string;
    is_contract?: boolean;
  };
  value: string;
  gas_used: string;
  block_number: number;
  timestamp?: string;
  status?: string;
  method?: string;
  fee?: {
    type: string;
    value: string;
  };
}

export interface AddressTransactions {
  address: string;
  transactions: PaxeerTransaction[];
  source?: string;
}

export interface TokenDetails {
  name: string;
  symbol: string;
  decimals: string;
  type: string;
  contract?: string;
  address_hash?: string;
  fiat_value?: string;
  icon_url?: string;
  exchange_rate?: string;
  volume_24h?: string;
  holders_count?: string;
  total_supply?: string;
}

export interface TokenBalance {
  balance: string;
  token_id: string | null;
  details?: TokenDetails;
  token?: TokenDetails;
  value?: string;
}

export interface AddressTokens {
  address: string;
  tokens: TokenBalance[];
  source?: string;
}

export interface TokenTransfer {
  transaction_hash: string;
  from_address_hash?: string;
  to_address_hash?: string;
  from?: {
    hash: string;
    name?: string;
  };
  to?: {
    hash: string;
    name?: string;
  };
  amount?: string;
  token_ids?: string[] | null;
  block_number: number;
  timestamp?: string;
  method?: string;
  total?: {
    value: string;
    decimals: string;
  };
  token: {
    name: string;
    symbol: string;
    type: string;
    contract?: string;
    address_hash?: string;
    decimals?: string;
    exchange_rate?: string;
    icon_url?: string;
  };
}

export interface AddressTokenTransfers {
  address: string;
  transfers: TokenTransfer[];
  source?: string;
}

export class PaxeerAPI {
  private static readonly BASE_URL = "/api/paxeer";

  static async getStats(): Promise<BlockchainStats> {
    const response = await apiCall(`${this.BASE_URL}/stats`);
    if (!response.ok) {
      throw new Error("Failed to fetch blockchain stats");
    }
    return await response.json();
  }

  static async getAddressBalance(address: string): Promise<AddressBalance> {
    const response = await apiCall(`${this.BASE_URL}/address/${address}/balance`);
    if (!response.ok) {
      throw new Error("Failed to fetch address balance");
    }
    return await response.json();
  }

  static async getAddressTransactions(address: string): Promise<AddressTransactions> {
    const response = await apiCall(`${this.BASE_URL}/address/${address}/transactions`);
    if (!response.ok) {
      throw new Error("Failed to fetch address transactions");
    }
    return await response.json();
  }

  static async getAddressTokens(address: string): Promise<AddressTokens> {
    const response = await apiCall(`${this.BASE_URL}/address/${address}/tokens`);
    if (!response.ok) {
      throw new Error("Failed to fetch address tokens");
    }
    return await response.json();
  }

  static async getAddressTokenTransfers(address: string): Promise<AddressTokenTransfers> {
    const response = await apiCall(`${this.BASE_URL}/address/${address}/tokentransfers`);
    if (!response.ok) {
      throw new Error("Failed to fetch address token transfers");
    }
    return await response.json();
  }
}

// React Query hooks
export const usePaxeerQueries = {
  useStats: () => {
    return queryClient.getQueryData(["api", "paxeer", "stats"]) as BlockchainStats | undefined;
  },
  
  useAddressBalance: (address: string) => {
    return queryClient.getQueryData(["api", "paxeer", "address", address, "balance"]) as AddressBalance | undefined;
  },
  
  useAddressTransactions: (address: string) => {
    return queryClient.getQueryData(["api", "paxeer", "address", address, "transactions"]) as AddressTransactions | undefined;
  },
  
  useAddressTokens: (address: string) => {
    return queryClient.getQueryData(["api", "paxeer", "address", address, "tokens"]) as AddressTokens | undefined;
  },
};
