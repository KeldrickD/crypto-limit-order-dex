# Crypto Limit Order DEX

A decentralized exchange (DEX) with limit order functionality built on Base blockchain.

## Features

- **Limit Orders**: Place buy and sell orders at specific price points
- **Advanced Charting**: Technical analysis with customizable indicators
- **Order Management**: Track and manage your active and historical orders
- **Portfolio Overview**: View your token holdings and performance
- **Customizable Dashboard**: Arrange widgets to suit your trading style
- **Dark/Light Mode**: Choose your preferred theme

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **Blockchain**: Solidity, Hardhat, Ethers.js
- **Testing**: Jest, React Testing Library, Playwright
- **State Management**: React Context API
- **Styling**: TailwindCSS, HeadlessUI

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MetaMask or other Web3 wallet

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/crypto-limit-order-dex.git
   cd crypto-limit-order-dex
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

### Unit Tests

Run unit tests with Jest:
```bash
npm test
```

Run tests with coverage report:
```bash
npm run test:coverage
```

### Integration Tests

Run integration tests with Playwright:
```bash
npm run test:integration
```

Run integration tests with UI:
```bash
npm run test:integration:ui
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deployment

Deploy to staging:
```bash
bash scripts/deploy-frontend.sh staging
```

Deploy to production:
```bash
bash scripts/deploy-frontend.sh production
```

## Smart Contracts

The DEX uses the following smart contracts:

- **LimitOrderDEX**: Main contract for placing and executing limit orders
- **LimitOrderKeeper**: Chainlink Keeper compatible contract for automated order execution

### Contract Deployment

Deploy contracts to Base network:
```bash
npx hardhat run scripts/deploy.ts --network base
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Base blockchain for providing the infrastructure
- Uniswap for DEX inspiration
- TradingView for charting inspiration
