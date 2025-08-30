/**
 * Example: How External dApps Can Use PaxeerWallet SDK
 * 
 * This file demonstrates how standalone applications like PaxeerLaunch
 * can automatically connect to PaxeerWallet using the SDK adapter.
 */

import { paxeerWallet } from './paxeerWalletSDK';

// Example usage for standalone PaxeerLaunch app
export class PaxeerLaunchIntegration {
  private wallet = paxeerWallet;
  private isInitialized = false;

  constructor() {
    this.initializeWalletConnection();
  }

  /**
   * Initialize connection to PaxeerWallet
   */
  private async initializeWalletConnection() {
    try {
      // Set up event listeners
      this.wallet.on('connect', (account) => {
        console.log('✅ PaxeerWallet connected:', account);
        this.onWalletConnected(account);
      });

      this.wallet.on('disconnect', () => {
        console.log('❌ PaxeerWallet disconnected');
        this.onWalletDisconnected();
      });

      this.wallet.on('accountsChanged', (accounts) => {
        console.log('🔄 Account changed:', accounts[0]);
        this.onAccountChanged(accounts[0]);
      });

      // Check if wallet is already connected
      const connection = this.wallet.getConnection();
      if (connection.isConnected && connection.account) {
        this.onWalletConnected(connection.account);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize wallet connection:', error);
    }
  }

  /**
   * Connect to wallet (called when user clicks connect button)
   */
  async connectWallet(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeWalletConnection();
      }

      const connection = await this.wallet.requestConnection();
      return connection.isConnected;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    }
  }

  /**
   * Get connected wallet account
   */
  getConnectedAccount() {
    const connection = this.wallet.getConnection();
    return connection.account;
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return this.wallet.getConnection().isConnected;
  }

  /**
   * Create a new token launch (example transaction)
   */
  async createTokenLaunch(tokenData: {
    name: string;
    symbol: string;
    description: string;
  }): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Please connect your wallet first');
    }

    try {
      // Example transaction for token creation
      const transaction = {
        to: '0xDE63a33db52EfAf44f28e6d99406874Cffe5820C', // PaxeerLaunch Factory
        data: `0x${tokenData.name}${tokenData.symbol}`, // Mock transaction data
        gasLimit: '500000',
        gasPrice: '20000000000'
      };

      const signature = await this.wallet.signTransaction(transaction);
      console.log('Token launch transaction signed:', signature);
      
      return signature;
    } catch (error) {
      console.error('Failed to create token launch:', error);
      throw error;
    }
  }

  /**
   * Buy tokens (example transaction)
   */
  async buyTokens(poolAddress: string, amount: string): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Please connect your wallet first');
    }

    try {
      const transaction = {
        to: poolAddress,
        value: amount,
        data: '0x', // Buy transaction data
        gasLimit: '300000',
        gasPrice: '20000000000'
      };

      const signature = await this.wallet.signTransaction(transaction);
      console.log('Buy transaction signed:', signature);
      
      return signature;
    } catch (error) {
      console.error('Failed to buy tokens:', error);
      throw error;
    }
  }

  /**
   * Sign a message for authentication
   */
  async signMessage(message: string): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Please connect your wallet first');
    }

    try {
      const signature = await this.wallet.signMessage({ message });
      console.log('Message signed:', signature);
      
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  disconnectWallet(): void {
    this.wallet.disconnect();
  }

  // Event handlers
  private onWalletConnected(account: any) {
    // Update UI to show connected state
    console.log('Wallet connected, updating UI...');
    // Example: Show user's address, update navigation, etc.
  }

  private onWalletDisconnected() {
    // Update UI to show disconnected state
    console.log('Wallet disconnected, updating UI...');
    // Example: Hide user info, show connect button, etc.
  }

  private onAccountChanged(account: any) {
    // Handle account change
    console.log('Account changed, updating UI...');
    // Example: Update displayed address, refresh balances, etc.
  }
}

// Example usage in a standalone PaxeerLaunch app:
/*
// In your PaxeerLaunch app main file:
import { PaxeerLaunchIntegration } from './paxeerLaunchIntegration';

const walletIntegration = new PaxeerLaunchIntegration();

// Connect wallet when user clicks connect button
document.getElementById('connect-wallet')?.addEventListener('click', async () => {
  const connected = await walletIntegration.connectWallet();
  if (connected) {
    console.log('Successfully connected to PaxeerWallet!');
  } else {
    console.log('Failed to connect to PaxeerWallet');
  }
});

// Create token when user submits form
document.getElementById('create-token')?.addEventListener('click', async () => {
  try {
    const signature = await walletIntegration.createTokenLaunch({
      name: 'My Token',
      symbol: 'MTK',
      description: 'My awesome token'
    });
    console.log('Token created with signature:', signature);
  } catch (error) {
    console.error('Failed to create token:', error);
  }
});
*/

export default PaxeerLaunchIntegration;