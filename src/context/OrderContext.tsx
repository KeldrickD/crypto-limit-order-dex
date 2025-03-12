'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther, parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES, LIMIT_ORDER_DEX_ABI, SUPPORTED_TOKENS } from '@/constants/contracts';

// Define order types
export type OrderType = 'LIMIT' | 'STOP_LOSS' | 'TRAILING_STOP';

// Define the Order type
export type Order = {
  id: number;
  owner: string;
  tokenIn: {
    symbol: string;
    address: string;
    decimals: number;
  };
  tokenOut: {
    symbol: string;
    address: string;
    decimals: number;
  };
  amountIn: string;
  amountOutMin: string;
  targetPrice: string;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'PARTIALLY_FILLED';
  timestamp: string;
  orderType: OrderType;
  // Additional fields for specific order types
  stopPrice?: string;        // For stop-loss orders
  trailingPercent?: string;  // For trailing stop orders
  filledAmount?: string;     // For partially filled orders
  remainingAmount?: string;  // For partially filled orders
  executionHistory?: Array<{
    amount: string;
    price: string;
    timestamp: string;
  }>;
};

// Define filter and sort options
export type OrderFilter = {
  status?: Array<Order['status']>;
  orderType?: Array<OrderType>;
  tokenIn?: string;
  tokenOut?: string;
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
};

export type OrderSort = {
  field: 'id' | 'timestamp' | 'amountIn' | 'targetPrice';
  direction: 'asc' | 'desc';
};

// Define the context type
type OrderContextType = {
  orders: Order[];
  filteredOrders: Order[];
  isLoading: boolean;
  isCreatingOrder: boolean;
  isCancellingOrder: boolean;
  error: string | null;
  successMessage: string | null;
  createOrder: (
    tokenIn: string, 
    tokenOut: string, 
    amountIn: string, 
    targetPrice: string, 
    orderType: OrderType,
    stopPrice?: string,
    trailingPercent?: string
  ) => Promise<void>;
  cancelOrder: (orderId: number) => Promise<void>;
  refreshOrders: () => Promise<void>;
  clearMessages: () => void;
  currentPrices: Record<string, string>;
  priceHistory: Record<string, Array<{price: string, timestamp: number}>>;
  // Filter and sort functions
  filter: OrderFilter;
  setFilter: (filter: OrderFilter) => void;
  sort: OrderSort;
  setSort: (sort: OrderSort) => void;
  resetFilters: () => void;
  // Analytics
  getOrderAnalytics: () => {
    totalOrders: number;
    pendingOrders: number;
    executedOrders: number;
    cancelledOrders: number;
    partiallyFilledOrders: number;
    totalVolume: Record<string, string>;
    averageExecutionTime: number;
  };
};

// Create the context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Default filter and sort values
const defaultFilter: OrderFilter = {
  status: undefined,
  orderType: undefined,
  tokenIn: undefined,
  tokenOut: undefined,
  dateRange: {
    from: null,
    to: null
  }
};

const defaultSort: OrderSort = {
  field: 'timestamp',
  direction: 'desc'
};

// Create a provider component
export function OrderProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, Array<{price: string, timestamp: number}>>>({});
  const [filter, setFilter] = useState<OrderFilter>(defaultFilter);
  const [sort, setSort] = useState<OrderSort>(defaultSort);

  // Contract interactions
  const { data: pendingOrderIds, refetch: refetchPendingOrders } = useReadContract({
    address: CONTRACT_ADDRESSES.testnet.limitOrderDEX as `0x${string}`,
    abi: LIMIT_ORDER_DEX_ABI,
    functionName: 'getPendingOrdersByUser',
    args: [address],
    query: {
      enabled: isConnected && !!address,
    },
  });

  const { writeContractAsync: writeCreateOrder } = useWriteContract();
  const { writeContractAsync: writeCancelOrder } = useWriteContract();

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Function to clear messages manually
  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // Function to get token details by address
  const getTokenDetails = (address: string) => {
    const token = SUPPORTED_TOKENS.find((t: any) => t.address.toLowerCase() === address.toLowerCase());
    return token || { symbol: 'Unknown', address, decimals: 18 };
  };

  // Function to reset filters
  const resetFilters = () => {
    setFilter(defaultFilter);
    setSort(defaultSort);
  };

  // Apply filters and sorting to orders
  useEffect(() => {
    let result = [...orders];
    
    // Apply filters
    if (filter.status && filter.status.length > 0) {
      result = result.filter(order => filter.status?.includes(order.status));
    }
    
    if (filter.orderType && filter.orderType.length > 0) {
      result = result.filter(order => filter.orderType?.includes(order.orderType));
    }
    
    if (filter.tokenIn) {
      result = result.filter(order => order.tokenIn.address.toLowerCase() === filter.tokenIn?.toLowerCase());
    }
    
    if (filter.tokenOut) {
      result = result.filter(order => order.tokenOut.address.toLowerCase() === filter.tokenOut?.toLowerCase());
    }
    
    if (filter.dateRange?.from || filter.dateRange?.to) {
      result = result.filter(order => {
        const orderDate = new Date(order.timestamp);
        if (filter.dateRange?.from && orderDate < filter.dateRange.from) {
          return false;
        }
        if (filter.dateRange?.to && orderDate > filter.dateRange.to) {
          return false;
        }
        return true;
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue: any = a[sort.field];
      let bValue: any = b[sort.field];
      
      // Handle special cases for different field types
      if (sort.field === 'timestamp') {
        aValue = new Date(a.timestamp).getTime();
        bValue = new Date(b.timestamp).getTime();
      } else if (sort.field === 'amountIn' || sort.field === 'targetPrice') {
        aValue = parseFloat(a[sort.field]);
        bValue = parseFloat(b[sort.field]);
      }
      
      if (sort.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredOrders(result);
  }, [orders, filter, sort]);

  // Function to fetch order details
  const fetchOrderDetails = async (orderId: number): Promise<Order | null> => {
    try {
      // In a real app, this would use the useReadContract hook
      // For now, we'll mock the data with different order types
      const orderTypes: OrderType[] = ['LIMIT', 'STOP_LOSS', 'TRAILING_STOP'];
      const statuses = ['PENDING', 'EXECUTED', 'CANCELLED', 'PARTIALLY_FILLED'];
      
      // Generate random order data for demo purposes
      const randomOrderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const randomTokenInIndex = Math.floor(Math.random() * SUPPORTED_TOKENS.length);
      const randomTokenOutIndex = (randomTokenInIndex + 1) % SUPPORTED_TOKENS.length;
      
      const mockOrderData = {
        owner: address || '0x0',
        tokenIn: SUPPORTED_TOKENS[randomTokenInIndex].address,
        tokenOut: SUPPORTED_TOKENS[randomTokenOutIndex].address,
        amountIn: BigInt(1000000000000000000 + Math.floor(Math.random() * 9000000000000000000)), // 1-10 ETH
        amountOutMin: BigInt(1900000000 + Math.floor(Math.random() * 1000000000)), // 1900-2900 USDC
        targetPrice: BigInt(1950000000000000000000 + Math.floor(Math.random() * 500000000000000000000)), // 1950-2450 USDC/ETH
        timestamp: BigInt(Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7)), // Random time in the last week
        status: statuses.indexOf(randomStatus),
        orderType: randomOrderType,
        stopPrice: randomOrderType === 'STOP_LOSS' ? BigInt(1900000000000000000000) : undefined,
        trailingPercent: randomOrderType === 'TRAILING_STOP' ? '5' : undefined,
        filledAmount: randomStatus === 'PARTIALLY_FILLED' ? BigInt(500000000000000000) : undefined,
        remainingAmount: randomStatus === 'PARTIALLY_FILLED' ? BigInt(500000000000000000) : undefined,
        executionHistory: randomStatus === 'PARTIALLY_FILLED' || randomStatus === 'EXECUTED' ? [
          {
            amount: '0.5',
            price: '1975',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          }
        ] : undefined
      };
      
      const tokenIn = getTokenDetails(mockOrderData.tokenIn);
      const tokenOut = getTokenDetails(mockOrderData.tokenOut);
      
      return {
        id: orderId,
        owner: mockOrderData.owner,
        tokenIn,
        tokenOut,
        amountIn: formatUnits(mockOrderData.amountIn, tokenIn.decimals),
        amountOutMin: formatUnits(mockOrderData.amountOutMin, tokenOut.decimals),
        targetPrice: formatUnits(mockOrderData.targetPrice, 18), // Target price is stored with 18 decimals
        status: statuses[Number(mockOrderData.status)] as 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'PARTIALLY_FILLED',
        timestamp: new Date(Number(mockOrderData.timestamp) * 1000).toISOString(),
        orderType: mockOrderData.orderType,
        stopPrice: mockOrderData.stopPrice ? formatUnits(mockOrderData.stopPrice, 18) : undefined,
        trailingPercent: mockOrderData.trailingPercent,
        filledAmount: mockOrderData.filledAmount ? formatUnits(mockOrderData.filledAmount, tokenIn.decimals) : undefined,
        remainingAmount: mockOrderData.remainingAmount ? formatUnits(mockOrderData.remainingAmount, tokenIn.decimals) : undefined,
        executionHistory: mockOrderData.executionHistory
      };
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      return null;
    }
  };

  // Function to refresh orders
  const refreshOrders = async () => {
    if (!isConnected || !address) {
      setOrders([]);
      return;
    }

    setIsLoading(true);
    try {
      await refetchPendingOrders();
      
      // For demo purposes, we'll create mock order IDs
      const mockOrderIds = Array.from({ length: 10 }, (_, i) => i + 1);
      
      const orderPromises = mockOrderIds.map(id => 
        fetchOrderDetails(id)
      );
      
      const fetchedOrders = await Promise.all(orderPromises);
      setOrders(fetchedOrders.filter(Boolean) as Order[]);
    } catch (error) {
      console.error('Error refreshing orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to create an order
  const createOrder = async (
    tokenIn: string, 
    tokenOut: string, 
    amountIn: string, 
    targetPrice: string,
    orderType: OrderType = 'LIMIT',
    stopPrice?: string,
    trailingPercent?: string
  ) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsCreatingOrder(true);
    clearMessages();

    try {
      const tokenInDetails = getTokenDetails(tokenIn);
      
      // Convert amounts to wei
      const amountInWei = parseUnits(amountIn, tokenInDetails.decimals);
      const targetPriceWei = parseEther(targetPrice);
      
      // Calculate minimum amount out (90% of expected amount)
      const expectedAmountOut = (BigInt(amountInWei) * BigInt(targetPriceWei)) / BigInt(10 ** 18);
      const amountOutMin = (expectedAmountOut * BigInt(90)) / BigInt(100);

      // Additional parameters for specific order types
      let stopPriceWei;
      if (orderType === 'STOP_LOSS' && stopPrice) {
        stopPriceWei = parseEther(stopPrice);
      }

      // In a real app, this would call the contract with different parameters based on order type
      // For demo, we'll simulate a successful transaction
      setSuccessMessage(`${orderType} order created successfully! Waiting for confirmation...`);
      
      // Simulate waiting for transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccessMessage(`${orderType} order confirmed and active!`);
      await refreshOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      setError(`Failed to create ${orderType} order. Please check your wallet and try again.`);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Function to cancel an order
  const cancelOrder = async (orderId: number) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsCancellingOrder(true);
    clearMessages();

    try {
      // In a real app, this would call the contract
      // For demo, we'll simulate a successful transaction
      setSuccessMessage('Cancellation submitted! Waiting for confirmation...');
      
      // Simulate waiting for transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccessMessage('Order cancelled successfully!');
      await refreshOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      setError('Failed to cancel order. Please try again.');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  // Function to get order analytics
  const getOrderAnalytics = () => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.status === 'PENDING').length;
    const executedOrders = orders.filter(order => order.status === 'EXECUTED').length;
    const cancelledOrders = orders.filter(order => order.status === 'CANCELLED').length;
    const partiallyFilledOrders = orders.filter(order => order.status === 'PARTIALLY_FILLED').length;
    
    // Calculate total volume by token
    const totalVolume: Record<string, string> = {};
    orders.forEach(order => {
      if (order.status === 'EXECUTED' || order.status === 'PARTIALLY_FILLED') {
        const token = order.tokenIn.symbol;
        const amount = order.status === 'EXECUTED' ? order.amountIn : (order.filledAmount || '0');
        
        if (!totalVolume[token]) {
          totalVolume[token] = '0';
        }
        
        totalVolume[token] = (parseFloat(totalVolume[token]) + parseFloat(amount)).toString();
      }
    });
    
    // Calculate average execution time (mock data for demo)
    const averageExecutionTime = 120; // 2 minutes in seconds
    
    return {
      totalOrders,
      pendingOrders,
      executedOrders,
      cancelledOrders,
      partiallyFilledOrders,
      totalVolume,
      averageExecutionTime
    };
  };

  // Simulate fetching current prices and historical data
  useEffect(() => {
    const fetchPrices = () => {
      // Mock prices for demo
      const mockPrices: Record<string, string> = {};
      const newPriceHistory: Record<string, Array<{price: string, timestamp: number}>> = {...priceHistory};
      
      SUPPORTED_TOKENS.forEach((token: any) => {
        if (token.symbol === 'WETH') {
          // Add some randomness to the price
          const basePrice = 1950.75;
          const randomChange = (Math.random() - 0.5) * 20; // Random change between -10 and +10
          const newPrice = (basePrice + randomChange).toFixed(2);
          mockPrices[token.address] = newPrice;
          
          // Add to price history
          if (!newPriceHistory[token.address]) {
            newPriceHistory[token.address] = [];
          }
          
          newPriceHistory[token.address].push({
            price: newPrice,
            timestamp: Date.now()
          });
          
          // Keep only the last 100 price points
          if (newPriceHistory[token.address].length > 100) {
            newPriceHistory[token.address] = newPriceHistory[token.address].slice(-100);
          }
        } else if (token.symbol === 'USDC') {
          mockPrices[token.address] = '1.00';
          
          // Add to price history
          if (!newPriceHistory[token.address]) {
            newPriceHistory[token.address] = [];
          }
          
          newPriceHistory[token.address].push({
            price: '1.00',
            timestamp: Date.now()
          });
          
          // Keep only the last 100 price points
          if (newPriceHistory[token.address].length > 100) {
            newPriceHistory[token.address] = newPriceHistory[token.address].slice(-100);
          }
        }
      });
      
      setCurrentPrices(mockPrices);
      setPriceHistory(newPriceHistory);
    };

    fetchPrices();
    // Set up polling for price updates every 10 seconds
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, [priceHistory]);

  // Fetch orders when connected
  useEffect(() => {
    refreshOrders();
  }, [isConnected, address]);

  // Set up polling for order updates every 30 seconds
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(refreshOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        filteredOrders,
        isLoading,
        isCreatingOrder,
        isCancellingOrder,
        error,
        successMessage,
        createOrder,
        cancelOrder,
        refreshOrders,
        clearMessages,
        currentPrices,
        priceHistory,
        filter,
        setFilter,
        sort,
        setSort,
        resetFilters,
        getOrderAnalytics
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

// Custom hook to use the order context
export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
} 