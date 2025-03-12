'use client';

import { ReactNode } from 'react';
import { OrderProvider } from '@/context/OrderContext';
import { ThemeProvider } from '@/context/ThemeContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <OrderProvider>
        {children}
      </OrderProvider>
    </ThemeProvider>
  );
} 