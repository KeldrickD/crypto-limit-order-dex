# Crypto Limit Order DEX

A decentralized exchange that lets users place limit orders (buy/sell orders that execute automatically when price conditions are met) on Base L2. The DEX leverages smart contracts for order management, Chainlink for price feeds and automation, and Uniswap V3 for liquidity.

## Features

- **Smart Contract Order Book**: Create, cancel, and execute limit orders
- **Price Feeds Integration**: Uses Chainlink to fetch real-time price data
- **Liquidity Sourcing**: Integrates with Uniswap V3 on Base for trade execution
- **Wallet Integration**: Support for popular wallets via Web3 connectors
- **Order Automation**: Utilizes Chainlink Automation to trigger order execution

## Project Structure

```
crypto-limit-order-dex/
├── contracts/                # Smart contracts
│   ├── LimitOrderDEX.sol     # Main DEX contract
│   ├── LimitOrderKeeper.sol  # Chainlink Keeper contract
│   └── mocks/                # Mock contracts for testing
├── scripts/                  # Deployment scripts
├── test/                     # Test files
└── src/                      # Frontend (Next.js)
```

## Prerequisites

- Node.js (v16+)
- npm or yarn
- MetaMask or other Web3 wallet

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/crypto-limit-order-dex.git
   cd crypto-limit-order-dex
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```
   Fill in your private key and other required variables.

## Smart Contract Development

### Compile Contracts

```
npx hardhat compile
```

### Run Tests

```
npx hardhat test
```

### Deploy Contracts

To deploy to Base Sepolia testnet:

```
npx hardhat run scripts/deploy.ts --network baseSepolia
```

To deploy to Base mainnet:

```
npx hardhat run scripts/deploy.ts --network base
```

## Frontend Development

### Run Development Server

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```
npm run build
```

## Usage

1. Connect your wallet to the DEX
2. Select tokens for your limit order
3. Set the amount and target price
4. Submit the order
5. Orders will execute automatically when price conditions are met

## Architecture

### Smart Contracts

- **LimitOrderDEX**: Manages the order book, handles order creation, cancellation, and execution
- **LimitOrderKeeper**: Chainlink Keeper contract that automatically checks and executes orders when conditions are met

### Price Feeds

The DEX uses Chainlink price feeds to get real-time price data for tokens. This ensures that orders are executed at fair market prices.

### Order Execution

When a user creates a limit order, the tokens are locked in the contract. The Chainlink Keeper regularly checks if any orders can be executed based on current market prices. When the price condition is met, the order is executed using Uniswap V3 for the actual swap.

## License

MIT
