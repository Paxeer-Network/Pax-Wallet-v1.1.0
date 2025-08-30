import { ethers } from "ethers";
import * as bip39 from "@scure/bip39";
import { HDKey } from "@scure/bip32";
import { wordlist } from "@scure/bip39/wordlists/english";

export interface WalletAccount {
  address: string;
  privateKey: string;
  name: string;
  derivationPath: string;
  accountIndex: number;
}

export interface WalletState {
  mnemonic: string;
  accounts: WalletAccount[];
  nextAccountIndex: number;
}

export class WalletService {
  private static readonly STORAGE_KEY = "paxeer_wallet_state";
  private static readonly ACTIVE_ACCOUNT_KEY = "paxeer_active_account";
  private static readonly BASE_PATH = "m/44'/60'/0'/0"; // Standard Ethereum BIP44 path
  private static readonly LEGACY_STORAGE_KEY = "paxeer_wallet_accounts"; // For migration

  static initializeWallet(): string {
    // Generate a new 12-word mnemonic
    const mnemonic = bip39.generateMnemonic(wordlist);
    
    const walletState: WalletState = {
      mnemonic,
      accounts: [],
      nextAccountIndex: 0
    };
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(walletState));
    return mnemonic;
  }

  static getWalletState(): WalletState | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  static saveWalletState(state: WalletState): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  static generateAccount(name: string): WalletAccount {
    let walletState = this.getWalletState();
    
    // Initialize wallet if it doesn't exist
    if (!walletState) {
      const mnemonic = this.initializeWallet();
      walletState = this.getWalletState()!;
    }
    
    // Derive account from mnemonic using BIP44 path
    const accountIndex = walletState.nextAccountIndex;
    const derivationPath = `${this.BASE_PATH}/${accountIndex}`;
    
    // Generate account from mnemonic
    const seed = bip39.mnemonicToSeedSync(walletState.mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const derivedKey = hdKey.derive(derivationPath);
    
    if (!derivedKey.privateKey) {
      throw new Error("Failed to derive private key");
    }
    
    const privateKeyHex = '0x' + Array.from(derivedKey.privateKey).map(b => b.toString(16).padStart(2, '0')).join('');
    const wallet = new ethers.Wallet(privateKeyHex);
    
    const account: WalletAccount = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      name,
      derivationPath,
      accountIndex
    };
    
    // Update wallet state
    walletState.accounts.push(account);
    walletState.nextAccountIndex++;
    this.saveWalletState(walletState);
    
    // Set as active if it's the first account
    if (walletState.accounts.length === 1) {
      this.setActiveAccount(account.address);
    }
    
    return account;
  }

  static saveAccount(account: WalletAccount): void {
    const walletState = this.getWalletState();
    if (!walletState) {
      throw new Error("Wallet not initialized");
    }
    
    walletState.accounts.push(account);
    this.saveWalletState(walletState);
    
    // Set as active if it's the first account
    if (walletState.accounts.length === 1) {
      this.setActiveAccount(account.address);
    }
  }

  static getAccounts(): WalletAccount[] {
    const walletState = this.getWalletState();
    return walletState ? walletState.accounts : [];
  }

  static getActiveAccount(): WalletAccount | null {
    const activeAddress = localStorage.getItem(this.ACTIVE_ACCOUNT_KEY);
    if (!activeAddress) return null;
    
    const accounts = this.getAccounts();
    return accounts.find(acc => acc.address === activeAddress) || null;
  }

  static setActiveAccount(address: string): void {
    localStorage.setItem(this.ACTIVE_ACCOUNT_KEY, address);
  }

  static deleteAccount(address: string): void {
    const walletState = this.getWalletState();
    if (!walletState) return;
    
    walletState.accounts = walletState.accounts.filter(acc => acc.address !== address);
    this.saveWalletState(walletState);
    
    // If we deleted the active account, set a new one
    const activeAddress = localStorage.getItem(this.ACTIVE_ACCOUNT_KEY);
    if (activeAddress === address && walletState.accounts.length > 0) {
      this.setActiveAccount(walletState.accounts[0].address);
    } else if (walletState.accounts.length === 0) {
      localStorage.removeItem(this.ACTIVE_ACCOUNT_KEY);
    }
  }

  static exportPrivateKey(address: string): string | null {
    const accounts = this.getAccounts();
    const account = accounts.find(acc => acc.address === address);
    return account ? account.privateKey : null;
  }

  static exportMnemonic(): string | null {
    const walletState = this.getWalletState();
    return walletState ? walletState.mnemonic : null;
  }

  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic, wordlist);
  }

  static importWalletFromMnemonic(mnemonic: string): WalletAccount[] {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }
    
    // Clear existing wallet and create new one from mnemonic
    const walletState: WalletState = {
      mnemonic,
      accounts: [],
      nextAccountIndex: 0
    };
    
    // Generate first account
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const derivationPath = `${this.BASE_PATH}/0`;
    const derivedKey = hdKey.derive(derivationPath);
    
    if (!derivedKey.privateKey) {
      throw new Error("Failed to derive private key from mnemonic");
    }
    
    const privateKeyHex = '0x' + Array.from(derivedKey.privateKey).map(b => b.toString(16).padStart(2, '0')).join('');
    const wallet = new ethers.Wallet(privateKeyHex);
    
    const account: WalletAccount = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      name: "Account 1",
      derivationPath,
      accountIndex: 0
    };
    
    walletState.accounts.push(account);
    walletState.nextAccountIndex = 1;
    
    this.saveWalletState(walletState);
    this.setActiveAccount(account.address);
    
    return [account];
  }

  static importAccount(privateKey: string, name: string): WalletAccount {
    try {
      // Validate private key
      const wallet = new ethers.Wallet(privateKey);
      
      // Check if account already exists
      const accounts = this.getAccounts();
      const existingAccount = accounts.find(acc => acc.address.toLowerCase() === wallet.address.toLowerCase());
      if (existingAccount) {
        throw new Error("Account already exists in wallet");
      }
      
      const account: WalletAccount = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        name,
        derivationPath: "imported",
        accountIndex: -1 // Mark as imported
      };

      this.saveAccount(account);
      return account;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Invalid private key format");
    }
  }

  static isWalletInitialized(): boolean {
    return this.getWalletState() !== null;
  }

  static migrateLegacyWallet(): boolean {
    const legacyAccounts = localStorage.getItem(this.LEGACY_STORAGE_KEY);
    if (!legacyAccounts) return false;
    
    try {
      const accounts = JSON.parse(legacyAccounts) as any[];
      if (accounts.length === 0) return false;
      
      // Create new wallet with mnemonic
      const mnemonic = this.initializeWallet();
      const walletState = this.getWalletState()!;
      
      // Add legacy accounts as imported
      accounts.forEach(account => {
        const migratedAccount: WalletAccount = {
          address: account.address,
          privateKey: account.privateKey,
          name: account.name || "Migrated Account",
          derivationPath: "imported",
          accountIndex: -1
        };
        walletState.accounts.push(migratedAccount);
      });
      
      walletState.nextAccountIndex = 1; // Start new accounts from index 1
      this.saveWalletState(walletState);
      
      // Set first account as active
      if (accounts.length > 0) {
        this.setActiveAccount(accounts[0].address);
      }
      
      // Remove legacy storage
      localStorage.removeItem(this.LEGACY_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Failed to migrate legacy wallet:", error);
      return false;
    }
  }

  static initializeIfNeeded(): void {
    if (!this.isWalletInitialized()) {
      // Try to migrate legacy wallet first
      if (!this.migrateLegacyWallet()) {
        // Create fresh wallet
        this.initializeWallet();
      }
    }
  }

  static clearWallet(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.ACTIVE_ACCOUNT_KEY);
    localStorage.removeItem(this.LEGACY_STORAGE_KEY);
  }
}

// Transaction utilities
export interface TransactionData {
  to: string;
  value: string;
  gasLimit?: string;
  gasPrice?: string;
  tokenAddress?: string; // For ERC-20 transfers
  decimals?: number;
}

const PAXEER_RPC_URL = "https://rpc-paxeer-network-djjz47ii4b.t.conduit.xyz/DgdWRnqiV7UGiMR2s9JPMqto415SW9tNG";
const PAXEER_CHAIN_ID = 80000;

export class TransactionService {
  static async sendTransaction(from: string, transactionData: TransactionData): Promise<string> {
    try {
      // Get the account's private key
      const privateKey = WalletService.exportPrivateKey(from);
      if (!privateKey) {
        throw new Error("Account private key not found");
      }

      // Connect to Paxeer Network RPC
      const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
      const wallet = new ethers.Wallet(privateKey, provider);

      let txHash: string;

      if (transactionData.tokenAddress) {
        // ERC-20 Token Transfer
        const erc20Abi = [
          "function transfer(address to, uint256 amount) returns (bool)",
          "function decimals() view returns (uint8)"
        ];
        
        const tokenContract = new ethers.Contract(transactionData.tokenAddress, erc20Abi, wallet);
        const decimals = transactionData.decimals || 18;
        const amount = ethers.parseUnits(transactionData.value, decimals);
        
        const tx = await tokenContract.transfer(transactionData.to, amount);
        txHash = tx.hash;
      } else {
        // Native PAX Transfer
        const amount = ethers.parseEther(transactionData.value);
        
        const tx = await wallet.sendTransaction({
          to: transactionData.to,
          value: amount,
          gasLimit: transactionData.gasLimit || "21000",
          gasPrice: transactionData.gasPrice
        });
        txHash = tx.hash;
      }

      return txHash;
    } catch (error) {
      console.error("Transaction failed:", error);
      if (error instanceof Error) {
        throw new Error(`Transaction failed: ${error.message}`);
      }
      throw new Error("Transaction failed");
    }
  }

  static formatAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  static formatAmount(amount: string, decimals: number = 18): string {
    const num = parseFloat(amount);
    if (num === 0) return "0";
    if (num < 0.01) return "<0.01";
    return num.toFixed(2);
  }

  static async estimateGas(from: string, transactionData: TransactionData): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
      
      if (transactionData.tokenAddress) {
        // ERC-20 token transfer typically uses ~50,000 gas
        return "50000";
      } else {
        // Native transfer
        const gasEstimate = await provider.estimateGas({
          to: transactionData.to,
          value: ethers.parseEther(transactionData.value),
          from: from
        });
        return gasEstimate.toString();
      }
    } catch (error) {
      console.error("Gas estimation failed:", error);
      // Return default values
      return transactionData.tokenAddress ? "50000" : "21000";
    }
  }

  static async getGasPrice(): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
      const feeData = await provider.getFeeData();
      return feeData.gasPrice?.toString() || "10000000000"; // 10 gwei default
    } catch (error) {
      console.error("Gas price fetch failed:", error);
      return "10000000000"; // 10 gwei default
    }
  }
}
