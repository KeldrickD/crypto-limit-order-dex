'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';

// This would be imported from a constants file in a real app
const TOKENS = [
  { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
];

export default function OrderForm() {
  const { isConnected } = useAccount();
  const [formData, setFormData] = useState({
    tokenIn: TOKENS[0].address,
    tokenOut: TOKENS[1].address,
    amountIn: '',
    targetPrice: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      // In a real app, this would call the contract to create an order
      console.log('Creating order with data:', formData);
      
      // Mock success for now
      setTimeout(() => {
        alert('Order created successfully!');
        setFormData({
          ...formData,
          amountIn: '',
          targetPrice: '',
        });
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. See console for details.');
      setLoading(false);
    }
  };

  const getTokenSymbol = (address: string) => {
    return TOKENS.find(token => token.address === address)?.symbol || 'Unknown';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="tokenIn" className="block text-sm font-medium text-gray-700">
            Sell Token
          </label>
          <select
            id="tokenIn"
            name="tokenIn"
            value={formData.tokenIn}
            onChange={handleChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {TOKENS.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tokenOut" className="block text-sm font-medium text-gray-700">
            Buy Token
          </label>
          <select
            id="tokenOut"
            name="tokenOut"
            value={formData.tokenOut}
            onChange={handleChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {TOKENS.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="amountIn" className="block text-sm font-medium text-gray-700">
            Amount to Sell
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="text"
              name="amountIn"
              id="amountIn"
              value={formData.amountIn}
              onChange={handleChange}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
              placeholder="0.0"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">{getTokenSymbol(formData.tokenIn)}</span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="targetPrice" className="block text-sm font-medium text-gray-700">
            Target Price
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="text"
              name="targetPrice"
              id="targetPrice"
              value={formData.targetPrice}
              onChange={handleChange}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
              placeholder="0.0"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">{getTokenSymbol(formData.tokenOut)}/{getTokenSymbol(formData.tokenIn)}</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            The order will execute when the price of {getTokenSymbol(formData.tokenOut)} reaches this value in terms of {getTokenSymbol(formData.tokenIn)}.
          </p>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={!isConnected || loading || !formData.amountIn || !formData.targetPrice}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            !isConnected || loading || !formData.amountIn || !formData.targetPrice
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {loading ? 'Creating Order...' : 'Create Limit Order'}
        </button>
      </div>

      {!isConnected && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Wallet not connected</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please connect your wallet to create limit orders.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
} 