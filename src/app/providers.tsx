'use client';

import { createWeb3Modal } from '@web3modal/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { ReactNode, useState } from 'react';

// Create wagmi config
const metadata = {
  name: 'Crypto Limit Order DEX',
  description: 'A decentralized exchange for limit orders on Base L2',
  url: 'https://crypto-limit-order-dex.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Create wagmi config
const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  metadata,
});

// Create web3modal instance
createWeb3Modal({
  wagmiConfig: config,
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  enableAnalytics: true,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#3b82f6',
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 