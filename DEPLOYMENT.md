# Paxeer Wallet - Render Deployment Guide

## 🚀 Deploy to Render

### Option 1: Using render.yaml (Recommended)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Paxeer Wallet"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Render**:
   - Go to [render.com](https://render.com) and sign up
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`

3. **Environment Variables** (automatically configured in render.yaml):
   - `DATABASE_URL` - Auto-configured from PostgreSQL database
   - `PAXDEX_API_URL` - https://dex-api.paxeer.app
   - `PAXLEND_API_URL` - https://lending-api.paxeer.app
   - `VAULT_CONTRACT_ADDRESS` - 0x49B0f9a0554da1A7243A9C8ac5B45245A66D90ff
   - `USDC_ADDRESS` - 0x29e1f94f6b209b57ecdc1fe87448a6d085a78a5a
   - `PAXEER_RPC_URL` - https://rpc-paxeer-network-djjz47ii4b.t.conduit.xyz/DgdWRnqiV7UGiMR2s9JPMqto415SW9tNG
   - `CHAIN_ID` - 80000

### Option 2: Manual Setup

1. **Create Web Service**:
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect GitHub repository

2. **Configure Build & Start**:
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Node Version**: 18

3. **Create PostgreSQL Database**:
   - Click "New" → "PostgreSQL"
   - Name: `paxeer-wallet-db`
   - Plan: Starter (Free)

4. **Add Environment Variables** (same as above)

## 🗄️ Database Migration

Database tables will be automatically created during deployment via the `postbuild` script.

## 🔧 Production Configuration

- **Port**: Automatically set to 10000 (Render default)
- **Health Check**: `/api/health` endpoint
- **Node Environment**: Production mode
- **Background Services**: Reward processing and options sync will run automatically

## 📊 Monitoring

After deployment, monitor your app at:
- **Render Dashboard**: View logs, metrics, and performance
- **Health Check**: `https://your-app.onrender.com/api/health`

## 🆓 Free Tier Limits

Render Free Tier includes:
- **Web Service**: 750 hours/month (sleeps after 15min inactivity)
- **PostgreSQL**: 1GB storage, 1 month data retention
- **Build Time**: 500 build minutes/month

## 🔄 Auto-Deploy

Changes pushed to your main branch will automatically trigger new deployments.

## 🐛 Troubleshooting

1. **Build Fails**: Check Node.js version (should be 18+)
2. **Database Connection**: Ensure DATABASE_URL is properly set
3. **API Errors**: Verify external API endpoints are accessible
4. **Memory Issues**: Consider upgrading to paid plan if needed

Your Paxeer Wallet will be available at: `https://your-app-name.onrender.com`
