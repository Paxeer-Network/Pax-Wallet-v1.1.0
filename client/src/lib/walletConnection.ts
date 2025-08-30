/**
 * Wallet Connection Interface for External dApps
 * 
 * This module provides the connection interface that external standalone dApps
 * can use to automatically detect and connect to PaxeerWallet.
 */

import { WalletService } from './wallet';

export interface ExternalWalletConnection {
  connect(): Promise<boolean>;
  getAccount(): any | null;
  isConnected(): boolean;
  disconnect(): void;
  signTransaction(tx: any): Promise<string>;
  signMessage(message: string): Promise<string>;
}

class WalletConnectionManager implements ExternalWalletConnection {
  private connected = false;
  private account: any = null;

  constructor() {
    this.initializeConnection();
  }

  /**
   * Initialize the wallet connection
   */
  private async initializeConnection() {
    try {
      // Check if wallet is available
      if (WalletService.isWalletInitialized()) {
        const accounts = WalletService.getAccounts();
        const activeAccount = WalletService.getActiveAccount();
        
        if (activeAccount && accounts.length > 0) {
          this.account = activeAccount;
          this.connected = true;
          
          // Notify external apps that wallet is available
          this.broadcastWalletAvailability();
        }
      }
    } catch (error) {
      console.error('Error initializing wallet connection:', error);
    }
  }

  /**
   * Broadcast wallet availability to external frames/windows
   */
  private broadcastWalletAvailability() {
    // Broadcast to any listening external applications
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'PAXEER_WALLET_AVAILABLE',
        data: {
          isConnected: this.connected,
          account: this.account ? {
            address: this.account.address,
            name: this.account.name,
            publicKey: this.account.publicKey
          } : null
        }
      }, '*');
    }
  }

  /**
   * Connect to the wallet
   */
  async connect(): Promise<boolean> {
    try {
      if (!WalletService.isWalletInitialized()) {
        return false;
      }

      const activeAccount = WalletService.getActiveAccount();
      if (activeAccount) {
        this.account = activeAccount;
        this.connected = true;
        this.broadcastWalletAvailability();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      return false;
    }
  }

  /**
   * Get the connected account
   */
  getAccount(): any | null {
    return this.account;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.connected && this.account !== null;
  }

  /**
   * Disconnect from wallet
   */
  disconnect(): void {
    this.connected = false;
    this.account = null;
    
    // Broadcast disconnection
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'PAXEER_WALLET_DISCONNECTED'
      }, '*');
    }
  }

  /**
   * Sign a transaction (mock implementation)
   */
  async signTransaction(tx: any): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    // In a real implementation, this would open a signing modal
    // For now, return a mock signature
    return `0x${'a'.repeat(130)}`;
  }

  /**
   * Sign a message (mock implementation)
   */
  async signMessage(message: string): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    // In a real implementation, this would open a signing modal
    // For now, return a mock signature
    return `0x${'b'.repeat(130)}`;
  }
}

// Create global instance
export const walletConnection = new WalletConnectionManager();

// Make it available globally for external dApps
if (typeof window !== 'undefined') {
  (window as any).paxeerWalletConnection = walletConnection;
  
  // Set up message listener for external requests
  window.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
      case 'PAXEER_WALLET_REQUEST_CONNECTION':
        walletConnection.connect().then(connected => {
          if (connected) {
            window.postMessage({
              type: 'PAXEER_WALLET_CONNECTED',
              data: walletConnection.getAccount()
            }, '*');
          } else {
            window.postMessage({
              type: 'PAXEER_WALLET_CONNECTION_FAILED'
            }, '*');
          }
        });
        break;
        
      case 'PAXEER_WALLET_REQUEST_ACCOUNT':
        window.postMessage({
          type: 'PAXEER_WALLET_ACCOUNT_RESPONSE',
          data: walletConnection.getAccount()
        }, '*');
        break;
        
      case 'PAXEER_WALLET_SIGN_TRANSACTION':
        walletConnection.signTransaction(data.transaction).then(signature => {
          window.postMessage({
            type: 'PAXEER_WALLET_RESPONSE',
            data: {
              requestId: data.requestId,
              result: signature
            }
          }, '*');
        }).catch(error => {
          window.postMessage({
            type: 'PAXEER_WALLET_RESPONSE',
            data: {
              requestId: data.requestId,
              error: error.message
            }
          }, '*');
        });
        break;
        
      case 'PAXEER_WALLET_SIGN_MESSAGE':
        walletConnection.signMessage(data.message).then(signature => {
          window.postMessage({
            type: 'PAXEER_WALLET_RESPONSE',
            data: {
              requestId: data.requestId,
              result: signature
            }
          }, '*');
        }).catch(error => {
          window.postMessage({
            type: 'PAXEER_WALLET_RESPONSE',
            data: {
              requestId: data.requestId,
              error: error.message
            }
          }, '*');
        });
        break;
    }
  });
}