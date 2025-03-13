'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';
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

// Mock function to simulate contract read
const mockReadContract = async () => {
  return [];
};

// Mock function to simulate contract write
const mockWriteContract = () => {
  return {
    writeContractAsync: async () => {
      return '0x1234567890';
    }
  };
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

// Define the filter type
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

// Define the sort type
export type OrderSort = {
  field: 'id' | 'timestamp' | 'amountIn' | 'targetPrice';
  direction: 'asc' | 'desc';
};

// Create the context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Provider component
export function OrderProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  
  // State for orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // State for filters and sorting
  const [filter, setFilter] = useState<OrderFilter>({});
  const [sort, setSort] = useState<OrderSort>({ field: 'timestamp', direction: 'desc' });
  
  // State for price data
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, Array<{price: string, timestamp: number}>>>({});

  // Clear error and success messages
  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // Helper to get token details
  const getTokenDetails = (address: string) => {
    return SUPPORTED_TOKENS.find(token => token.address.toLowerCase() === address.toLowerCase());
  };

  // Reset filters
  const resetFilters = () => {
    setFilter({});
    setSort({ field: 'timestamp', direction: 'desc' });
  };

  // Apply filters and sorting
  useEffect(() => {
    if (orders.length === 0) {
      setFilteredOrders([]);
      return;
    }

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

    if (filter.dateRange && (filter.dateRange.from || filter.dateRange.to)) {
      result = result.filter(order => {
        const orderDate = new Date(parseInt(order.timestamp) * 1000);
        
        if (filter.dateRange?.from && filter.dateRange?.to) {
          return orderDate >= filter.dateRange.from && orderDate <= filter.dateRange.to;
        } else if (filter.dateRange?.from) {
          return orderDate >= filter.dateRange.from;
        } else if (filter.dateRange?.to) {
          return orderDate <= filter.dateRange.to;
        }
        
        return true;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';
      
      switch (sort.field) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'timestamp':
          aValue = parseInt(a.timestamp);
          bValue = parseInt(b.timestamp);
          break;
        case 'amountIn':
          aValue = parseFloat(a.amountIn);
          bValue = parseFloat(b.amountIn);
          break;
        case 'targetPrice':
          aValue = parseFloat(a.targetPrice);
          bValue = parseFloat(b.targetPrice);
          break;
      }
      
      if (sort.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(result);
  }, [orders, filter, sort]);

  // Fetch order details
  const fetchOrderDetails = async (orderId: number): Promise<Order | null> => {
    try {
      // In a real implementation, this would call the contract
      // const data = await readContract({
      //   address: CONTRACT_ADDRESSES.LIMIT_ORDER_DEX,
      //   abi: LIMIT_ORDER_DEX_ABI,
      //   functionName: 'getOrder',
      //   args: [orderId],
      // });
      
      // For now, return mock data
      const mockOrder: Order = {
        id: orderId,
        owner: address || '0x0',
        tokenIn: {
          symbol: 'WETH',
          address: '0x4200000000000000000000000000000000000006',
          decimals: 18
        },
        tokenOut: {
          symbol: 'USDC',
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          decimals: 6
        },
        amountIn: parseEther('1').toString(),
        amountOutMin: parseUnits('1800', 6).toString(),
        targetPrice: '1800',
        status: 'PENDING',
        timestamp: Math.floor(Date.now() / 1000).toString(),
        orderType: 'LIMIT'
      };
      
      return mockOrder;
    } catch (err) {
      console.error('Error fetching order details:', err);
      return null;
    }
  };

  // Refresh orders
  const refreshOrders = async () => {
    if (!isConnected || !address) {
      setOrders([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call the contract
      // const data = await readContract({
      //   address: CONTRACT_ADDRESSES.LIMIT_ORDER_DEX,
      //   abi: LIMIT_ORDER_DEX_ABI,
      //   functionName: 'getOrdersByUser',
      //   args: [address],
      // });
      
      // For now, use mock data
      const mockOrders: Order[] = Array(5).fill(0).map((_, i) => ({
        id: i + 1,
        owner: address,
        tokenIn: {
          symbol: i % 2 === 0 ? 'WETH' : 'USDC',
          address: i % 2 === 0 ? '0x4200000000000000000000000000000000000006' : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          decimals: i % 2 === 0 ? 18 : 6
        },
        tokenOut: {
          symbol: i % 2 === 0 ? 'USDC' : 'WETH',
          address: i % 2 === 0 ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' : '0x4200000000000000000000000000000000000006',
          decimals: i % 2 === 0 ? 6 : 18
        },
        amountIn: parseUnits(i % 2 === 0 ? '1' : '1800', i % 2 === 0 ? 18 : 6).toString(),
        amountOutMin: parseUnits(i % 2 === 0 ? '1800' : '1', i % 2 === 0 ? 6 : 18).toString(),
        targetPrice: i % 2 === 0 ? '1800' : '0.00055',
        status: ['PENDING', 'EXECUTED', 'CANCELLED', 'PARTIALLY_FILLED'][i % 4] as Order['status'],
        timestamp: (Math.floor(Date.now() / 1000) - i * 86400).toString(),
        orderType: ['LIMIT', 'STOP_LOSS', 'TRAILING_STOP'][i % 3] as OrderType
      }));
      
      setOrders(mockOrders);
    } catch (err) {
      console.error('Error refreshing orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create order
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
      setError('Please connect your wallet');
      return;
    }
    
    setIsCreatingOrder(true);
    setError(null);
    
    try {
      const tokenInDetails = getTokenDetails(tokenIn);
      const tokenOutDetails = getTokenDetails(tokenOut);
      
      if (!tokenInDetails || !tokenOutDetails) {
        throw new Error('Invalid token selection');
      }
      
      const amountInWei = parseUnits(amountIn, tokenInDetails.decimals);
      
      // Calculate minimum amount out based on target price
      const targetPriceFloat = parseFloat(targetPrice);
      const amountInFloat = parseFloat(amountIn);
      const amountOutMin = (amountInFloat * targetPriceFloat).toString();
      const amountOutMinWei = parseUnits(amountOutMin, tokenOutDetails.decimals);
      
      // In a real implementation, this would call the contract
      // const { writeContractAsync } = useWriteContract();
      // const hash = await writeContractAsync({
      //   address: CONTRACT_ADDRESSES.LIMIT_ORDER_DEX,
      //   abi: LIMIT_ORDER_DEX_ABI,
      //   functionName: 'createLimitOrder',
      //   args: [tokenIn, tokenOut, amountInWei, amountOutMinWei, targetPriceFloat],
      // });
      
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Order created successfully!');
      await refreshOrders();
    } catch (err) {
      console.error('Error creating order:', err);
      setError('Failed to create order. Please try again.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Cancel order
  const cancelOrder = async (orderId: number) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }
    
    setIsCancellingOrder(true);
    setError(null);
    
    try {
      // In a real implementation, this would call the contract
      // const { writeContractAsync } = useWriteContract();
      // const hash = await writeContractAsync({
      //   address: CONTRACT_ADDRESSES.LIMIT_ORDER_DEX,
      //   abi: LIMIT_ORDER_DEX_ABI,
      //   functionName: 'cancelOrder',
      //   args: [orderId],
      // });
      
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Order cancelled successfully!');
      await refreshOrders();
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError('Failed to cancel order. Please try again.');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  // Get analytics
  const getOrderAnalytics = () => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
    const executedOrders = orders.filter(o => o.status === 'EXECUTED').length;
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
    const partiallyFilledOrders = orders.filter(o => o.status === 'PARTIALLY_FILLED').length;
    
    // Calculate total volume by token
    const totalVolume: Record<string, string> = {};
    orders.forEach(order => {
      if (order.status === 'EXECUTED' || order.status === 'PARTIALLY_FILLED') {
        const token = order.tokenIn.symbol;
        const amount = order.status === 'EXECUTED' 
          ? order.amountIn 
          : (order.filledAmount || '0');
        
        if (totalVolume[token]) {
          const currentAmount = parseFloat(totalVolume[token]);
          // Convert the string amount to a number for calculation
          const orderAmount = parseFloat(amount) / (10 ** order.tokenIn.decimals);
          totalVolume[token] = (currentAmount + orderAmount).toString();
        } else {
          // Initialize with the first amount
          const orderAmount = parseFloat(amount) / (10 ** order.tokenIn.decimals);
          totalVolume[token] = orderAmount.toString();
        }
      }
    });
    
    // Calculate average execution time (mock data)
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

  // Fetch price data
  useEffect(() => {
    const fetchPrices = () => {
      // In a real implementation, this would fetch from an API or contract
      // For now, use mock data
      const mockCurrentPrices: Record<string, string> = {
        'WETH-USDC': '1850.25',
        'USDC-WETH': '0.00054',
        'WBTC-USDC': '52340.75',
        'USDC-WBTC': '0.000019'
      };
      
      const now = Date.now();
      const hour = 3600 * 1000;
      const day = 24 * hour;
      
      const mockPriceHistory: Record<string, Array<{price: string, timestamp: number}>> = {
        'WETH-USDC': Array(24).fill(0).map((_, i) => ({
          price: (1800 + Math.random() * 100).toFixed(2),
          timestamp: now - (23 - i) * hour
        })),
        'USDC-WETH': Array(24).fill(0).map((_, i) => ({
          price: (0.00054 + Math.random() * 0.00002).toFixed(8),
          timestamp: now - (23 - i) * hour
        })),
        'WBTC-USDC': Array(24).fill(0).map((_, i) => ({
          price: (52000 + Math.random() * 1000).toFixed(2),
          timestamp: now - (23 - i) * hour
        })),
        'USDC-WBTC': Array(24).fill(0).map((_, i) => ({
          price: (0.000019 + Math.random() * 0.000001).toFixed(9),
          timestamp: now - (23 - i) * hour
        }))
      };
      
      setCurrentPrices(mockCurrentPrices);
      setPriceHistory(mockPriceHistory);
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Load orders when connected
  useEffect(() => {
    refreshOrders();
  }, [address, isConnected]);

  const value = {
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
  };

  return (
    <OrderContext.Provider value={value}>
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