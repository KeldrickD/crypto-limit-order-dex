import Header from '@/components/Header';
import OrderForm from '@/components/OrderForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Create Limit Order
            </h1>
            <OrderForm />
          </div>
        </div>
      </div>
    </main>
  );
}
