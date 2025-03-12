'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useOrders } from '@/context/OrderContext';
import { useTheme } from '@/context/ThemeContext';
import ConfirmationDialog from './ConfirmationDialog';
import OrderAnalyticsCharts from './OrderAnalyticsCharts';
import OrderExport from './OrderExport';
import ThemeToggle from './ThemeToggle';

export default function OrderList() {
  const { theme } = useTheme();
  const { isConnected } = useAccount();
  const { 
    orders,
    filteredOrders, 
    isLoading, 
    isCancellingOrder, 
    cancelOrder, 
    error, 
    successMessage, 
    refreshOrders,
    filter,
    setFilter,
    sort,
    setSort,
    resetFilters,
    getOrderAnalytics
  } = useOrders();

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<number | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Get analytics data
  const analytics = getOrderAnalytics();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return theme === 'dark' 
          ? 'bg-yellow-900 text-yellow-200' 
          : 'bg-yellow-100 text-yellow-800';
      case 'EXECUTED':
        return theme === 'dark' 
          ? 'bg-green-900 text-green-200' 
          : 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return theme === 'dark' 
          ? 'bg-red-900 text-red-200' 
          : 'bg-red-100 text-red-800';
      case 'PARTIALLY_FILLED':
        return theme === 'dark' 
          ? 'bg-blue-900 text-blue-200' 
          : 'bg-blue-100 text-blue-800';
      default:
        return theme === 'dark' 
          ? 'bg-gray-700 text-gray-200' 
          : 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleCancelClick = (orderId: number) => {
    setOrderToCancel(orderId);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (orderToCancel !== null) {
      await cancelOrder(orderToCancel);
      setIsConfirmDialogOpen(false);
      setOrderToCancel(null);
    }
  };

  const handleCancelDialog = () => {
    setIsConfirmDialogOpen(false);
    setOrderToCancel(null);
  };

  const handleRefresh = () => {
    refreshOrders();
  };

  const handleFilterChange = (field: keyof typeof filter, value: string | undefined) => {
    setFilter({ ...filter, [field]: value ? [value] : undefined });
  };

  const handleSortChange = (field: 'id' | 'timestamp' | 'amountIn' | 'targetPrice') => {
    setSort({
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleDateRangeChange = (type: 'from' | 'to', value: string) => {
    setFilter({
      ...filter,
      dateRange: {
        from: type === 'from' ? (value ? new Date(value) : null) : (filter.dateRange?.from ?? null),
        to: type === 'to' ? (value ? new Date(value) : null) : (filter.dateRange?.to ?? null)
      }
    });
  };

  if (!isConnected) {
    return (
      <div className="rounded-md bg-yellow-50 dark:bg-yellow-900 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Wallet not connected</h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>Please connect your wallet to view your orders.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Orders</h2>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <OrderExport />
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset Filters
            </button>
            <button 
              onClick={handleRefresh} 
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
              aria-label={isLoading ? 'Refreshing orders...' : 'Refresh orders'}
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700 dark:text-gray-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="-ml-1 mr-2 h-4 w-4 text-gray-700 dark:text-gray-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {showAnalytics && <OrderAnalyticsCharts />}

        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={filter.status?.[0] || ''}
                onChange={(e) => handleFilterChange('status', e.target.value as string | undefined)}
                aria-label="Filter by order status"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="EXECUTED">Executed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="PARTIALLY_FILLED">Partially Filled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Type</label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={filter.orderType?.[0] || ''}
                onChange={(e) => handleFilterChange('orderType', e.target.value as string | undefined)}
                aria-label="Filter by order type"
              >
                <option value="">All Types</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP_LOSS">Stop Loss</option>
                <option value="TRAILING_STOP">Trailing Stop</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From Date</label>
                <input
                  type="date"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={filter.dateRange?.from?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleDateRangeChange('from', e.target.value)}
                  aria-label="Filter orders from date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">To Date</label>
                <input
                  type="date"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={filter.dateRange?.to?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleDateRangeChange('to', e.target.value)}
                  aria-label="Filter orders to date"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-md bg-red-50 dark:bg-red-900 p-4" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="m-4 rounded-md bg-green-50 dark:bg-green-900 p-4" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400 dark:text-green-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading && filteredOrders.length === 0 ? (
          <div className="flex justify-center items-center py-12" role="status">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="sr-only">Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {orders.length > 0 ? 'No orders match your current filters.' : "You haven't created any orders yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" role="table">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('id')}>
                    <div className="flex items-center">
                      <span>ID</span>
                      {sort.field === 'id' && (
                        <svg className={`ml-2 h-4 w-4 ${sort.direction === 'desc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pair
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('amountIn')}>
                    <div className="flex items-center">
                      <span>Amount</span>
                      {sort.field === 'amountIn' && (
                        <svg className={`ml-2 h-4 w-4 ${sort.direction === 'desc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('targetPrice')}>
                    <div className="flex items-center">
                      <span>Target Price</span>
                      {sort.field === 'targetPrice' && (
                        <svg className={`ml-2 h-4 w-4 ${sort.direction === 'desc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('timestamp')}>
                    <div className="flex items-center">
                      <span>Created</span>
                      {sort.field === 'timestamp' && (
                        <svg className={`ml-2 h-4 w-4 ${sort.direction === 'desc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className={isLoading ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {order.tokenIn.symbol} → {order.tokenOut.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.amountIn} {order.tokenIn.symbol}
                      {order.filledAmount && (
                        <span className="text-blue-600 dark:text-blue-400">
                          <br />
                          Filled: {order.filledAmount} {order.tokenIn.symbol}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.targetPrice} {order.tokenOut.symbol}/{order.tokenIn.symbol}
                      {order.stopPrice && (
                        <span className="text-red-600 dark:text-red-400">
                          <br />
                          Stop: {order.stopPrice} {order.tokenOut.symbol}/{order.tokenIn.symbol}
                        </span>
                      )}
                      {order.trailingPercent && (
                        <span className="text-purple-600 dark:text-purple-400">
                          <br />
                          Trail: {order.trailingPercent}%
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.orderType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(order.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelClick(order.id)}
                          disabled={isCancellingOrder}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Cancel order #${order.id}`}
                        >
                          {isCancellingOrder && orderToCancel === order.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Cancel Order"
        cancelText="Keep Order"
        onConfirm={handleConfirmCancel}
        onCancel={handleCancelDialog}
        isLoading={isCancellingOrder}
      />
    </>
  );
} 