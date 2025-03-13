# Contract Deployment Guide

This guide walks you through the process of deploying the Crypto Limit Order DEX smart contracts to the Base Sepolia testnet.

## Prerequisites

Before you begin, make sure you have:

1. **A wallet with Base Sepolia ETH**
   - You'll need testnet ETH for gas fees
   - Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)

2. **Private key for deployment**
   - You'll need the private key of your wallet for deployment
   - NEVER share your private key or commit it to version control

3. **Node.js and npm**
   - Make sure you have Node.js installed (v16+)
   - All dependencies installed (`npm install`)

## Deployment Steps

### 1. Set Up Environment Variables

1. Create a `.env.deploy` file with your deployment credentials:
   ```
   cp .env.example .env.deploy
   ```

2. Edit `.env.deploy` and add your private key:
   ```
   PRIVATE_KEY=your_wallet_private_key_here_without_0x_prefix
   ```

### 2. Deploy Contracts

Run the deployment script:

```
npm run deploy:contracts
```

This script will:
- Check if you have the necessary environment variables
- Confirm you want to proceed with deployment
- Deploy the contracts to Base Sepolia
- Update `.env.staging` with the new contract addresses

### 3. Verify Contracts (Optional)

After deployment, you can verify your contracts on the Base Sepolia Explorer:

```
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

For example:
```
npx hardhat verify --network baseSepolia <LIMIT_ORDER_DEX_ADDRESS> "0x8357227D4eDc78991Db6FDB9bD6ADE250536dE1d"
```

### 4. Contract Addresses

After successful deployment, your contract addresses will be:

- **LimitOrderDEX**: The address will be updated in `.env.staging`
- **LimitOrderKeeper**: The address will be updated in `.env.staging`

These addresses will be automatically updated in your `.env.staging` file.

## Troubleshooting

### Common Issues

1. **Insufficient gas**
   - Make sure your wallet has enough Base Sepolia ETH for gas fees

2. **Nonce too high/low**
   - If you get nonce errors, try resetting your account in MetaMask

3. **Contract verification fails**
   - Make sure you're using the exact constructor arguments used during deployment
   - Check that you have the correct contract address

### Getting Help

If you encounter issues during deployment:

1. Check the error messages in the console
2. Verify your environment variables are set correctly
3. Make sure your wallet has enough testnet ETH

## Next Steps

After deploying your contracts:

1. Run the staging deployment: `npm run deploy:staging`
2. Test your application with the deployed contracts
3. Verify all functionality works as expected 