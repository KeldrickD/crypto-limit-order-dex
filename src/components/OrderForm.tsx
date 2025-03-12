'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useOrders, OrderType } from '@/context/OrderContext';
import { SUPPORTED_TOKENS } from '@/constants/contracts';

export default function OrderForm() {
  const { isConnected } = useAccount();
  const { 
    createOrder, 
    isCreatingOrder, 
    error, 
    successMessage, 
    clearMessages,
    currentPrices
  } = useOrders();

  const [formData, setFormData] = useState({
    tokenIn: SUPPORTED_TOKENS[0].address,
    tokenOut: SUPPORTED_TOKENS[1].address,
    amountIn: '',
    targetPrice: '',
    orderType: 'LIMIT' as OrderType,
    stopPrice: '',
    trailingPercent: '',
  });

  // Clear form when order is successfully created
  useEffect(() => {
    if (successMessage && successMessage.includes('confirmed')) {
      setFormData({
        ...formData,
        amountIn: '',
        targetPrice: '',
        stopPrice: '',
        trailingPercent: '',
      });
    }
  }, [successMessage]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      return;
    }

    await createOrder(
      formData.tokenIn,
      formData.tokenOut,
      formData.amountIn,
      formData.targetPrice,
      formData.orderType,
      formData.stopPrice || undefined,
      formData.trailingPercent || undefined
    );
  };

  const getTokenSymbol = (address: string) => {
    return SUPPORTED_TOKENS.find(token => token.address === address)?.symbol || 'Unknown';
  };

  // Get current price for the selected token pair
  const getCurrentPrice = () => {
    const inToken = SUPPORTED_TOKENS.find(token => token.address === formData.tokenIn);
    const outToken = SUPPORTED_TOKENS.find(token => token.address === formData.tokenOut);
    
    if (!inToken || !outToken || !currentPrices[inToken.address] || !currentPrices[outToken.address]) {
      return null;
    }
    
    const inPrice = parseFloat(currentPrices[inToken.address]);
    const outPrice = parseFloat(currentPrices[outToken.address]);
    
    return (outPrice / inPrice).toFixed(inToken.symbol === 'WETH' ? 2 : 6);
  };

  const currentPrice = getCurrentPrice();

  // Determine if form is valid based on order type
  const isFormValid = () => {
    const baseValid = isConnected && !isCreatingOrder && formData.amountIn && formData.targetPrice;
    
    if (formData.orderType === 'LIMIT') {
      return baseValid;
    } else if (formData.orderType === 'STOP_LOSS') {
      return baseValid && !!formData.stopPrice;
    } else if (formData.orderType === 'TRAILING_STOP') {
      return baseValid && !!formData.trailingPercent;
    }
    
    return false;
  };

  // Get order type description
  const getOrderTypeDescription = () => {
    switch (formData.orderType) {
      case 'LIMIT':
        return `The order will execute when the price of ${getTokenSymbol(formData.tokenOut)} reaches ${formData.targetPrice} ${getTokenSymbol(formData.tokenOut)}/${getTokenSymbol(formData.tokenIn)}.`;
      case 'STOP_LOSS':
        return `The order will execute when the price of ${getTokenSymbol(formData.tokenOut)} falls below ${formData.stopPrice} ${getTokenSymbol(formData.tokenOut)}/${getTokenSymbol(formData.tokenIn)}.`;
      case 'TRAILING_STOP':
        return `The order will execute when the price of ${getTokenSymbol(formData.tokenOut)} falls by ${formData.trailingPercent}% from its highest point.`;
      default:
        return '';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Create Order</h2>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={clearMessages}
                  className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={clearMessages}
                  className="inline-flex rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="orderType" className="block text-sm font-medium text-gray-700">
              Order Type
            </label>
            <select
              id="orderType"
              name="orderType"
              value={formData.orderType}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="LIMIT">Limit Order</option>
              <option value="STOP_LOSS">Stop Loss</option>
              <option value="TRAILING_STOP">Trailing Stop</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.orderType === 'LIMIT' && "Executes when price reaches or exceeds target price"}
              {formData.orderType === 'STOP_LOSS' && "Executes when price falls below stop price"}
              {formData.orderType === 'TRAILING_STOP' && "Executes when price falls by specified percentage from highest point"}
            </p>
          </div>

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
              {SUPPORTED_TOKENS.map((token) => (
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
              {SUPPORTED_TOKENS.map((token) => (
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
            {currentPrice && (
              <p className="mt-1 text-sm text-blue-600">
                Current price: {currentPrice} {getTokenSymbol(formData.tokenOut)}/{getTokenSymbol(formData.tokenIn)}
              </p>
            )}
          </div>

          {formData.orderType === 'STOP_LOSS' && (
            <div>
              <label htmlFor="stopPrice" className="block text-sm font-medium text-gray-700">
                Stop Price
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  name="stopPrice"
                  id="stopPrice"
                  value={formData.stopPrice}
                  onChange={handleChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.0"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">{getTokenSymbol(formData.tokenOut)}/{getTokenSymbol(formData.tokenIn)}</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                The order will execute when the price falls below this value.
              </p>
            </div>
          )}

          {formData.orderType === 'TRAILING_STOP' && (
            <div>
              <label htmlFor="trailingPercent" className="block text-sm font-medium text-gray-700">
                Trailing Percentage
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  name="trailingPercent"
                  id="trailingPercent"
                  value={formData.trailingPercent}
                  onChange={handleChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.0"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                The order will execute when the price falls by this percentage from its highest point.
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Order Summary</h3>
          <p className="text-sm text-gray-600">
            {getOrderTypeDescription()}
          </p>
        </div>

        <div>
          <button
            type="submit"
            disabled={!isFormValid()}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              !isFormValid()
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isCreatingOrder ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Order...
              </span>
            ) : (
              `Create ${formData.orderType.replace('_', ' ')} Order`
            )}
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
                  <p>Please connect your wallet to create orders.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
} 