'use client';

import Header from '@/components/Header';
import OrderForm from '@/components/OrderForm';
import OrderList from '@/components/OrderList';
import PriceDisplay from '@/components/PriceDisplay';
import Notification from '@/components/Notification';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <OrderForm />
              <div className="mt-6">
                <OrderList />
              </div>
            </div>
            <div>
              <PriceDisplay />
            </div>
          </div>
        </div>
      </div>
      <Notification />
    </main>
  );
}
