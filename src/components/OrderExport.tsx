'use client';

import { useState } from 'react';
import { saveAs } from 'file-saver';
import { useOrders, Order } from '@/context/OrderContext';

export default function OrderExport() {
  const { filteredOrders } = useOrders();
  const [isExporting, setIsExporting] = useState(false);

  // Function to convert orders to CSV format
  const convertToCSV = (orders: Order[]) => {
    // Define CSV headers
    const headers = [
      'ID',
      'Order Type',
      'Token In',
      'Token Out',
      'Amount In',
      'Target Price',
      'Stop Price',
      'Trailing Percent',
      'Status',
      'Filled Amount',
      'Remaining Amount',
      'Created Date'
    ];

    // Create CSV content
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const order of orders) {
      const row = [
        order.id,
        order.orderType,
        order.tokenIn.symbol,
        order.tokenOut.symbol,
        order.amountIn,
        order.targetPrice,
        order.stopPrice || '',
        order.trailingPercent || '',
        order.status,
        order.filledAmount || '',
        order.remainingAmount || '',
        new Date(order.timestamp).toLocaleString()
      ];
      
      // Escape commas and quotes in the data
      const escapedRow = row.map(value => {
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      
      csvRows.push(escapedRow.join(','));
    }
    
    return csvRows.join('\n');
  };

  // Function to export orders as CSV
  const exportCSV = async () => {
    if (filteredOrders.length === 0) return;
    
    setIsExporting(true);
    try {
      const csvContent = convertToCSV(filteredOrders);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={exportCSV}
      disabled={isExporting || filteredOrders.length === 0}
      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Export orders to CSV file"
    >
      {isExporting ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Exporting...
        </>
      ) : (
        <>
          <svg className="-ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L17.707 7.707a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </>
      )}
    </button>
  );
} 