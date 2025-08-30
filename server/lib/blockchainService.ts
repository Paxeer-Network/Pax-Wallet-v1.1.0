import { ethers } from "ethers";

// Multi-source blockchain data service
export class BlockchainService {
  private static readonly WALLET_API_URL = "https://wallet-api.paxeer.app/api";
  private static readonly BLOCKSCOUT_API_URL = "https://paxscan.paxeer.app/api/v2";
  private static readonly RPC_URL = "https://rpc-paxeer-network-djjz47ii4b.t.conduit.xyz/DgdWRnqiV7UGiMR2s9JPMqto415SW9tNG";
  private static readonly CHAIN_ID = 80000;

  private static provider: ethers.JsonRpcProvider | null = null;

  static getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(this.RPC_URL, {
        chainId: this.CHAIN_ID,
        name: "paxeer-network"
      });
    }
    return this.provider;
  }

  // Consolidated balance fetching with multiple sources
  static async getAddressBalance(address: string): Promise<{
    address: string;
    balance: string;
    source: string;
  }> {
    const errors: string[] = [];

    // Primary: Direct RPC call (most accurate)
    try {
      const provider = this.getProvider();
      const balance = await provider.getBalance(address);
      return {
        address,
        balance: balance.toString(),
        source: "rpc"
      };
    } catch (error) {
      errors.push(`RPC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Fallback 1: Blockscout API
    try {
      const response = await fetch(`${this.BLOCKSCOUT_API_URL}/addresses/${address}`);
      if (response.ok) {
        const data = await response.json();
        return {
          address,
          balance: data.coin_balance || "0",
          source: "blockscout"
        };
      }
    } catch (error) {
      errors.push(`Blockscout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Fallback 2: Wallet API
    try {
      const response = await fetch(`${this.WALLET_API_URL}/address/${address}/balance`);
      if (response.ok) {
        const data = await response.json();
        return {
          address,
          balance: data.balance ? ethers.parseEther(data.balance.toString()).toString() : "0",
          source: "wallet-api"
        };
      }
    } catch (error) {
      errors.push(`Wallet API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    throw new Error(`All balance sources failed: ${errors.join(', ')}`);
  }

  // Enhanced transactions with rich Blockscout data
  static async getAddressTransactions(address: string): Promise<{
    address: string;
    transactions: any[];
    source: string;
  }> {
    const errors: string[] = [];

    // Primary: Blockscout API (richest data) - try multiple approaches for completeness
    try {
      // First try default endpoint
      let response = await fetch(`${this.BLOCKSCOUT_API_URL}/addresses/${address}/transactions`);
      if (response.ok) {
        const data = await response.json();
        let allTransactions = data.items || [];
        
        // Try to get more with different parameters if available
        try {
          const fromResponse = await fetch(`${this.BLOCKSCOUT_API_URL}/addresses/${address}/transactions?type=from`);
          if (fromResponse.ok) {
            const fromData = await fromResponse.json();
            const fromTxs = fromData.items || [];
            // Merge without duplicates
            fromTxs.forEach((tx: any) => {
              if (!allTransactions.find((existing: any) => existing.hash === tx.hash)) {
                allTransactions.push(tx);
              }
            });
          }
        } catch (e) {
          // Continue with what we have
        }
        
        // Normalize Blockscout transaction format
        const normalizedTransactions = allTransactions.map((item: any) => ({
          hash: item.hash,
          from_address_hash: item.from?.hash,
          to_address_hash: item.to?.hash,
          value: item.value || "0",
          gas_used: item.gas_used || "0",
          block_number: item.block_number,
          timestamp: item.timestamp,
          status: item.status,
          method: item.method,
          fee: item.fee
        }));
        
        return {
          address,
          transactions: normalizedTransactions,
          source: "blockscout"
        };
      }
    } catch (error) {
      errors.push(`Blockscout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Fallback: Wallet API
    try {
      const response = await fetch(`${this.WALLET_API_URL}/address/${address}/transactions`);
      if (response.ok) {
        const data = await response.json();
        return {
          address,
          transactions: data.transactions || [],
          source: "wallet-api"
        };
      }
    } catch (error) {
      errors.push(`Wallet API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    throw new Error(`All transaction sources failed: ${errors.join(', ')}`);
  }

  // Token balances with multiple sources
  static async getAddressTokens(address: string): Promise<{
    address: string;
    tokens: any[];
    source: string;
  }> {
    const errors: string[] = [];

    // Primary: Blockscout API (has metadata)
    try {
      const response = await fetch(`${this.BLOCKSCOUT_API_URL}/addresses/${address}/tokens`);
      if (response.ok) {
        const data = await response.json();
        // Normalize Blockscout format to match frontend expectations
        const normalizedTokens = (data.items || []).map((item: any) => ({
          balance: item.value || "0",
          token_id: item.token_id,
          details: {
            name: item.token.name,
            symbol: item.token.symbol,
            decimals: item.token.decimals,
            type: item.token.type,
            contract: item.token.address_hash,
            fiat_value: item.token.exchange_rate || "0",
            icon_url: item.token.icon_url
          }
        }));
        return {
          address,
          tokens: normalizedTokens,
          source: "blockscout"
        };
      }
    } catch (error) {
      errors.push(`Blockscout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Fallback: Wallet API
    try {
      const response = await fetch(`${this.WALLET_API_URL}/address/${address}/tokens`);
      if (response.ok) {
        const data = await response.json();
        return {
          address,
          tokens: data.tokens || [],
          source: "wallet-api"
        };
      }
    } catch (error) {
      errors.push(`Wallet API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      address,
      tokens: [],
      source: "fallback"
    };
  }

  // Token transfers from Blockscout
  static async getAddressTokenTransfers(address: string): Promise<{
    address: string;
    transfers: any[];
    source: string;
  }> {
    const errors: string[] = [];

    // Primary: Blockscout API
    try {
      const response = await fetch(`${this.BLOCKSCOUT_API_URL}/addresses/${address}/token-transfers`);
      if (response.ok) {
        const data = await response.json();
        // Normalize Blockscout token transfers format
        const normalizedTransfers = (data.items || []).map((item: any) => ({
          transaction_hash: item.transaction_hash,
          from_address_hash: item.from?.hash,
          to_address_hash: item.to?.hash,
          amount: item.total?.value || "0",
          block_number: item.block_number,
          timestamp: item.timestamp,
          method: item.method,
          token: {
            name: item.token.name,
            symbol: item.token.symbol,
            type: item.token.type,
            contract: item.token.address_hash,
            decimals: item.token.decimals
          }
        }));
        return {
          address,
          transfers: normalizedTransfers,
          source: "blockscout"
        };
      }
    } catch (error) {
      errors.push(`Blockscout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Fallback: Wallet API
    try {
      const response = await fetch(`${this.WALLET_API_URL}/address/${address}/tokentransfers`);
      if (response.ok) {
        const data = await response.json();
        return {
          address,
          transfers: data.transfers || [],
          source: "wallet-api"
        };
      }
    } catch (error) {
      errors.push(`Wallet API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      address,
      transfers: [],
      source: "fallback"
    };
  }

  // Get blockchain stats
  static async getBlockchainStats(): Promise<{
    latestBlock: number;
    totalTransactions: number;
    source: string;
  }> {
    const errors: string[] = [];

    // Try RPC first
    try {
      const provider = this.getProvider();
      const latestBlock = await provider.getBlockNumber();
      return {
        latestBlock,
        totalTransactions: 0, // RPC doesn't provide this easily
        source: "rpc"
      };
    } catch (error) {
      errors.push(`RPC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Fallback to Wallet API
    try {
      const response = await fetch(`${this.WALLET_API_URL}/stats`);
      if (response.ok) {
        const data = await response.json();
        return {
          latestBlock: data.latestBlock || 0,
          totalTransactions: data.totalTransactions || 0,
          source: "wallet-api"
        };
      }
    } catch (error) {
      errors.push(`Wallet API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    throw new Error(`All stats sources failed: ${errors.join(', ')}`);
  }

  // Enhanced token balance check via RPC for specific token
  static async getTokenBalance(address: string, tokenContract: string, decimals: number = 18): Promise<string> {
    try {
      const provider = this.getProvider();
      
      // ERC-20 balanceOf function signature
      const abi = ["function balanceOf(address owner) view returns (uint256)"];
      const contract = new ethers.Contract(tokenContract, abi, provider);
      
      const balance = await contract.balanceOf(address);
      return balance.toString();
    } catch (error) {
      console.error(`Failed to get token balance via RPC: ${error}`);
      return "0";
    }
  }

  // Verify transaction via RPC
  static async getTransactionByHash(hash: string): Promise<any> {
    try {
      const provider = this.getProvider();
      const tx = await provider.getTransaction(hash);
      const receipt = await provider.getTransactionReceipt(hash);
      
      return {
        transaction: tx,
        receipt: receipt,
        source: "rpc"
      };
    } catch (error) {
      console.error(`Failed to get transaction via RPC: ${error}`);
      return null;
    }
  }
}