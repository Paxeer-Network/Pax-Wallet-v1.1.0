/**
 * PaxeerWallet SDK for External dApp Integration
 * 
 * This SDK allows external dApps (like standalone PaxeerLaunch) to automatically
 * connect to and interact with PaxeerWallet without requiring manual setup.
 */

export interface WalletAccount {
  address: string;
  name: string;
  publicKey: string;
}

export interface TransactionRequest {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface SignMessageRequest {
  message: string;
  type?: 'personal' | 'typed';
}

export interface WalletConnection {
  isConnected: boolean;
  account: WalletAccount | null;
  chainId: number;
  networkName: string;
}

// Events that the SDK can emit
export interface WalletEvents {
  accountsChanged: (accounts: WalletAccount[]) => void;
  chainChanged: (chainId: number) => void;
  disconnect: () => void;
  connect: (account: WalletAccount) => void;
}

class PaxeerWalletSDK {
  private eventListeners: Map<keyof WalletEvents, Function[]> = new Map();
  private connection: WalletConnection = {
    isConnected: false,
    account: null,
    chainId: 80000, // Paxeer Network
    networkName: 'Paxeer Network'
  };

  constructor() {
    this.initializeWalletDetection();
  }

  /**
   * Initialize automatic wallet detection
   */
  private initializeWalletDetection() {
    // Check if PaxeerWallet is available in the same domain/app
    if (typeof window !== 'undefined') {
      // Set up cross-frame communication for iframe integration
      window.addEventListener('message', this.handleWalletMessage.bind(this));
      
      // Auto-detect if wallet is available
      this.checkWalletAvailability();
    }
  }

  /**
   * Handle messages from PaxeerWallet
   */
  private handleWalletMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin) return;
    
    const { type, data } = event.data;
    
    switch (type) {
      case 'PAXEER_WALLET_ACCOUNT_CHANGED':
        this.handleAccountChange(data);
        break;
      case 'PAXEER_WALLET_CONNECTED':
        this.handleWalletConnect(data);
        break;
      case 'PAXEER_WALLET_DISCONNECTED':
        this.handleWalletDisconnect();
        break;
      case 'PAXEER_WALLET_RESPONSE':
        this.handleWalletResponse(data);
        break;
    }
  }

  /**
   * Check if PaxeerWallet is available
   */
  private async checkWalletAvailability(): Promise<boolean> {
    try {
      // Check localStorage for wallet data (same-domain integration)
      const walletData = localStorage.getItem('paxeer_wallet_accounts');
      const activeAccount = localStorage.getItem('paxeer_active_account');
      
      if (walletData && activeAccount) {
        const accounts = JSON.parse(walletData);
        const account = accounts.find((acc: any) => acc.address === activeAccount);
        
        if (account) {
          this.connection.isConnected = true;
          this.connection.account = {
            address: account.address,
            name: account.name,
            publicKey: account.publicKey
          };
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking wallet availability:', error);
      return false;
    }
  }

  /**
   * Request connection to PaxeerWallet
   */
  async requestConnection(): Promise<WalletConnection> {
    try {
      // First check if wallet is already available
      const isAvailable = await this.checkWalletAvailability();
      
      if (isAvailable) {
        this.emit('connect', this.connection.account!);
        return this.connection;
      }

      // If not available, try to open wallet in same domain
      if (window.parent !== window) {
        // We're in an iframe, request connection from parent
        window.parent.postMessage({
          type: 'PAXEER_WALLET_REQUEST_CONNECTION',
          origin: 'paxeer-sdk'
        }, '*');
      } else {
        // Direct integration - try to redirect to wallet
        const walletUrl = `${window.location.origin}?return_to=${encodeURIComponent(window.location.href)}`;
        
        // Show connection modal or redirect
        const shouldRedirect = await this.showConnectionModal();
        if (shouldRedirect) {
          window.location.href = walletUrl;
        }
      }

      return this.connection;
    } catch (error) {
      console.error('Error requesting wallet connection:', error);
      throw new Error('Failed to connect to PaxeerWallet');
    }
  }

  /**
   * Show connection modal to user
   */
  private async showConnectionModal(): Promise<boolean> {
    return new Promise((resolve) => {
      // Create a simple modal for wallet connection
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
      `;
      
      const content = document.createElement('div');
      content.style.cssText = `
        background: #1a1a1a;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        color: white;
        text-align: center;
      `;
      
      content.innerHTML = `
        <h3 style="margin: 0 0 16px 0; font-size: 18px;">Connect PaxeerWallet</h3>
        <p style="margin: 0 0 24px 0; color: #888; line-height: 1.5;">
          To use this dApp, you need to connect your PaxeerWallet. 
          You'll be redirected to the wallet to authenticate.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="connect-btn" style="
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
          ">Connect Wallet</button>
          <button id="cancel-btn" style="
            background: transparent;
            color: #888;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 14px;
            cursor: pointer;
          ">Cancel</button>
        </div>
      `;
      
      const connectBtn = content.querySelector('#connect-btn');
      const cancelBtn = content.querySelector('#cancel-btn');
      
      connectBtn?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(true);
      });
      
      cancelBtn?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });
      
      modal.appendChild(content);
      document.body.appendChild(modal);
    });
  }

  /**
   * Get current wallet connection status
   */
  getConnection(): WalletConnection {
    return { ...this.connection };
  }

  /**
   * Request account information
   */
  async getAccounts(): Promise<WalletAccount[]> {
    if (!this.connection.isConnected || !this.connection.account) {
      throw new Error('Wallet not connected');
    }
    
    return [this.connection.account];
  }

  /**
   * Sign a transaction
   */
  async signTransaction(transaction: TransactionRequest): Promise<string> {
    if (!this.connection.isConnected) {
      throw new Error('Wallet not connected');
    }

    // Send transaction request to wallet
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      
      // Store pending request
      (window as any).pendingRequests = (window as any).pendingRequests || {};
      (window as any).pendingRequests[requestId] = { resolve, reject };
      
      // Send message to wallet
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'PAXEER_WALLET_SIGN_TRANSACTION',
          requestId,
          data: transaction
        }, '*');
      } else {
        // Same domain integration
        reject(new Error('Transaction signing not available in current context'));
      }
    });
  }

  /**
   * Sign a message
   */
  async signMessage(request: SignMessageRequest): Promise<string> {
    if (!this.connection.isConnected) {
      throw new Error('Wallet not connected');
    }

    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      
      // Store pending request
      (window as any).pendingRequests = (window as any).pendingRequests || {};
      (window as any).pendingRequests[requestId] = { resolve, reject };
      
      // Send message to wallet
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'PAXEER_WALLET_SIGN_MESSAGE',
          requestId,
          data: request
        }, '*');
      } else {
        // Same domain integration - mock signature for demo
        resolve(`0x${'a'.repeat(130)}`); // Mock signature
      }
    });
  }

  /**
   * Disconnect from wallet
   */
  disconnect(): void {
    this.connection.isConnected = false;
    this.connection.account = null;
    this.emit('disconnect');
  }

  /**
   * Add event listener
   */
  on<K extends keyof WalletEvents>(event: K, listener: WalletEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener as Function);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof WalletEvents>(event: K, listener: WalletEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener as Function);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit<K extends keyof WalletEvents>(event: K, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  /**
   * Handle account change from wallet
   */
  private handleAccountChange(account: WalletAccount): void {
    this.connection.account = account;
    this.emit('accountsChanged', [account]);
  }

  /**
   * Handle wallet connection
   */
  private handleWalletConnect(account: WalletAccount): void {
    this.connection.isConnected = true;
    this.connection.account = account;
    this.emit('connect', account);
  }

  /**
   * Handle wallet disconnection
   */
  private handleWalletDisconnect(): void {
    this.connection.isConnected = false;
    this.connection.account = null;
    this.emit('disconnect');
  }

  /**
   * Handle response from wallet
   */
  private handleWalletResponse(data: any): void {
    const { requestId, result, error } = data;
    const pendingRequests = (window as any).pendingRequests || {};
    
    if (pendingRequests[requestId]) {
      if (error) {
        pendingRequests[requestId].reject(new Error(error));
      } else {
        pendingRequests[requestId].resolve(result);
      }
      delete pendingRequests[requestId];
    }
  }
}

// Global instance
export const paxeerWallet = new PaxeerWalletSDK();

// Make it available globally for external dApps
if (typeof window !== 'undefined') {
  (window as any).paxeerWallet = paxeerWallet;
}

export default PaxeerWalletSDK;