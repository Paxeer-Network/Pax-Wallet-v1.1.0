# PaxeerWallet SDK Integration Guide

## Overview

The PaxeerWallet SDK allows external dApps to automatically connect to and interact with PaxeerWallet without requiring manual setup. This enables standalone applications like PaxeerLaunch to seamlessly integrate with the wallet.

## Architecture

The SDK provides a modular connection system with three main components:

1. **PaxeerWallet SDK** (`paxeerWalletSDK.ts`) - Main SDK for external apps
2. **Wallet Connection Interface** (`walletConnection.ts`) - Bridge between wallet and external apps  
3. **External App Integration** (`externalAppExample.ts`) - Example implementation

## Quick Start

### For External dApps (e.g., Standalone PaxeerLaunch)

1. **Include the SDK in your project:**

```typescript
import { paxeerWallet } from './lib/paxeerWalletSDK';
```

2. **Initialize wallet connection:**

```typescript
class MyDAppIntegration {
  private wallet = paxeerWallet;

  constructor() {
    this.initializeWallet();
  }

  private async initializeWallet() {
    // Set up event listeners
    this.wallet.on('connect', (account) => {
      console.log('Wallet connected:', account);
    });

    this.wallet.on('disconnect', () => {
      console.log('Wallet disconnected');
    });

    // Check if wallet is already available
    const connection = this.wallet.getConnection();
    if (connection.isConnected) {
      // Wallet is already connected
      console.log('Wallet already connected');
    }
  }
}
```

3. **Connect to wallet:**

```typescript
async connectWallet() {
  try {
    const connection = await this.wallet.requestConnection();
    if (connection.isConnected) {
      console.log('Successfully connected!');
      return connection.account;
    }
  } catch (error) {
    console.error('Failed to connect:', error);
  }
}
```

4. **Perform transactions:**

```typescript
async createToken(tokenData) {
  const transaction = {
    to: '0xFactoryAddress',
    data: '0x...',
    gasLimit: '500000'
  };
  
  const signature = await this.wallet.signTransaction(transaction);
  return signature;
}
```

## SDK Methods

### Connection Management

- `requestConnection()` - Request connection to PaxeerWallet
- `getConnection()` - Get current connection status
- `getAccounts()` - Get connected account information
- `disconnect()` - Disconnect from wallet

### Transaction Signing

- `signTransaction(tx)` - Sign a blockchain transaction
- `signMessage(message)` - Sign a message for authentication

### Event Handling

- `on(event, callback)` - Listen for wallet events
- `off(event, callback)` - Remove event listener

Available events:
- `connect` - Wallet connected
- `disconnect` - Wallet disconnected
- `accountsChanged` - User switched accounts
- `chainChanged` - Network changed

## Integration Modes

### 1. Same-Domain Integration

When your dApp runs on the same domain as PaxeerWallet:

```typescript
// Automatic detection via localStorage
const isWalletAvailable = await checkWalletAvailability();
```

### 2. Cross-Domain Integration

When your dApp runs on a different domain:

```typescript
// Cross-frame communication
window.postMessage({
  type: 'PAXEER_WALLET_REQUEST_CONNECTION'
}, '*');
```

### 3. Iframe Integration

When embedding your dApp in PaxeerWallet:

```typescript
// Parent-child frame communication
window.parent.postMessage({
  type: 'PAXEER_WALLET_REQUEST_CONNECTION'
}, '*');
```

## Example: PaxeerLaunch Integration

```typescript
import { PaxeerLaunchIntegration } from './lib/externalAppExample';

const walletIntegration = new PaxeerLaunchIntegration();

// Connect wallet
document.getElementById('connect-wallet').onclick = async () => {
  const connected = await walletIntegration.connectWallet();
  if (connected) {
    // Update UI to show connected state
    showConnectedUI();
  }
};

// Create token
document.getElementById('create-token').onclick = async () => {
  try {
    const signature = await walletIntegration.createTokenLaunch({
      name: 'My Token',
      symbol: 'MTK',
      description: 'My awesome token'
    });
    console.log('Token created:', signature);
  } catch (error) {
    console.error('Failed to create token:', error);
  }
};
```

## Security Features

- **Auto-detection** - Automatically detects if PaxeerWallet is available
- **User consent** - Always requires user approval for connections and transactions
- **Secure communication** - Uses postMessage API for cross-frame communication
- **Session management** - Maintains connection state across page reloads

## Error Handling

```typescript
try {
  await paxeerWallet.requestConnection();
} catch (error) {
  if (error.message === 'Wallet not available') {
    // Show wallet installation instructions
  } else if (error.message === 'User rejected connection') {
    // Show connection required message
  } else {
    // Handle other errors
  }
}
```

## Network Configuration

The SDK is pre-configured for Paxeer Network:

- **Chain ID:** 80000
- **Network:** Paxeer Network
- **RPC:** https://rpc-paxeer-network-djjz47ii4b.t.conduit.xyz

## Benefits

✅ **Automatic Connection** - No manual wallet setup required  
✅ **Seamless UX** - Users don't need to copy/paste addresses  
✅ **Secure** - All transactions require user approval  
✅ **Cross-Platform** - Works across different domains and apps  
✅ **Event-Driven** - Real-time updates on wallet state changes  

## Migration from Integrated to Modular

### Before (Integrated):
```typescript
// Launch functionality was part of the wallet
<PaxeerLaunch onBack={() => setCurrentDApp(null)} />
```

### After (Modular with SDK):
```typescript
// Standalone PaxeerLaunch app connects via SDK
const walletIntegration = new PaxeerLaunchIntegration();
await walletIntegration.connectWallet();
```

This modular approach allows for:
- Independent development and deployment
- Better performance and user experience
- Easier maintenance and updates
- Flexibility to integrate with other wallets in the future

## Support

For questions or issues with the SDK integration, please refer to the example implementation in `externalAppExample.ts` or check the console for detailed error messages.