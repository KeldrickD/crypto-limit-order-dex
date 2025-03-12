'use client';

import { useState, useEffect } from 'react';
import { useOrders } from '@/context/OrderContext';
import { SUPPORTED_TOKENS } from '@/constants/contracts';

export default function PriceDisplay() {
  const { currentPrices } = useOrders();
  const [priceChange, setPriceChange] = useState<Record<string, { value: number, direction: 'up' | 'down' | 'none' }>>(
    Object.fromEntries(SUPPORTED_TOKENS.map(token => [token.address, { value: 0, direction: 'none' }]))
  );

  // Track price changes for animation
  useEffect(() => {
    const newPriceChange = { ...priceChange };
    
    Object.entries(currentPrices).forEach(([address, price]) => {
      const currentValue = parseFloat(price);
      const previousValue = parseFloat(priceChange[address]?.value.toString() || '0');
      
      if (currentValue > previousValue) {
        newPriceChange[address] = { value: currentValue, direction: 'up' };
      } else if (currentValue < previousValue) {
        newPriceChange[address] = { value: currentValue, direction: 'down' };
      } else {
        newPriceChange[address] = { value: currentValue, direction: 'none' };
      }
    });
    
    setPriceChange(newPriceChange);
    
    // Reset direction after animation
    const timer = setTimeout(() => {
      setPriceChange(prev => {
        const reset = { ...prev };
        Object.keys(reset).forEach(key => {
          reset[key] = { ...reset[key], direction: 'none' };
        });
        return reset;
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [currentPrices]);

  const getDirectionColor = (direction: 'up' | 'down' | 'none') => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-900';
    }
  };

  const getDirectionIcon = (direction: 'up' | 'down' | 'none') => {
    switch (direction) {
      case 'up':
        return (
          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
        );
      case 'down':
        return (
          <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Live Market Prices</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUPPORTED_TOKENS.map(token => {
          const price = currentPrices[token.address];
          const change = priceChange[token.address];
          const direction = change?.direction || 'none';
          
          return (
            <div key={token.address} className="flex items-center p-3 border rounded-lg">
              <div className="flex-shrink-0 h-10 w-10 mr-3">
                <img src={token.logoURI} alt={token.symbol} className="h-10 w-10 rounded-full" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium">{token.name}</h3>
                <p className="text-xs text-gray-500">{token.symbol}</p>
              </div>
              <div className={`text-right transition-colors duration-500 ${getDirectionColor(direction)}`}>
                <div className="flex items-center justify-end">
                  <span className="text-lg font-semibold">${price || '0.00'}</span>
                  {getDirectionIcon(direction)}
                </div>
                <p className="text-xs">
                  {token.symbol === 'WETH' ? 'vs USD' : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-xs text-gray-500 text-center">
        Prices update every 10 seconds
      </div>
    </div>
  );
} 