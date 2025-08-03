
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { Customer, Product, SalesReportQuery } from '../../../server/src/schema';

interface SalesReport {
  total_revenue: number;
  total_orders: number;
  total_profit: number;
  average_order_value: number;
  period_start: Date;
  period_end: Date;
}

export function SalesReports() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reportData, setReportData] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SalesReportQuery>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end_date: new Date().toISOString().split('T')[0], // today
    customer_id: undefined,
    product_id: undefined
  });

  const loadData = useCallback(async () => {
    try {
      const [customersResult, productsResult] = await Promise.all([
        trpc.customers.getAll.query(),
        trpc.products.getAll.query()
      ]);
      
      setCustomers(customersResult);
      setProducts(productsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const reportResult: SalesReport = {
        total_revenue: 0,
        total_orders: 0,
        total_profit: 0,
        average_order_value: 0,
        period_start: new Date(filters.start_date),
        period_end: new Date(filters.end_date)
      };
      
      setReportData(reportResult);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedCustomerName = () => {
    if (!filters.customer_id) return 'Semua Pelanggan';
    const customer = customers.find((c: Customer) => c.id === filters.customer_id);
    return customer?.name || 'Unknown Customer';
  };

  const getSelectedProductName = () => {
    if (!filters.product_id) return 'Semua Produk';
    const product = products.find((p: Product) => p.id === filters.product_id);
    return product?.name || 'Unknown Product';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">📈 Laporan Penjualan</h2>
        <p className="text-gray-600">Analisis performa penjualan bisnis Anda</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
          <CardDescription>
            Tentukan periode dan kriteria untuk laporan penjualan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters((prev: SalesReportQuery) => ({ ...prev, start_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Tanggal Selesai</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters((prev: SalesReportQuery) => ({ ...prev, end_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Filter Pelanggan</Label>
              <Select 
                value={filters.customer_id?.toString() || 'all'} 
                onValueChange={(value) => 
                  setFilters((prev: SalesReportQuery) => ({ 
                    ...prev, 
                    customer_id: value === 'all' ? undefined : parseInt(value) 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua pelanggan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pelanggan</SelectItem>
                  {customers.map((customer: Customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filter Produk</Label>
              <Select 
                value={filters.product_id?.toString() || 'all'} 
                onValueChange={(value) => 
                  setFilters((prev: SalesReportQuery) => ({ 
                    ...prev, 
                    product_id: value === 'all' ? undefined : parseInt(value) 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua produk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Produk</SelectItem>
                  {products.map((product: Product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={generateReport} disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? 'Membuat Laporan...' : '📊 Buat Laporan'}
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Laporan</CardTitle>
              <CardDescription>
                Periode: {reportData.period_start.toLocaleDateString('id-ID')} - {reportData.period_end.toLocaleDateString('id-ID')}
                <br />
                Pelanggan: {getSelectedCustomerName()} | Produk: {getSelectedProductName()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    Rp {reportData.total_revenue.toLocaleString('id-ID')}
                  </div>
                  <div className="text-sm text-blue-800 mt-1">Total Pendapatan</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {reportData.total_orders}
                  </div>
                  <div className="text-sm text-green-800 mt-1">Total Pesanan</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">
                    Rp {reportData.total_profit.toLocaleString('id-ID')}
                  </div>
                  <div className="text-sm text-purple-800 mt-1">Total Keuntungan</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">
                    Rp {reportData.average_order_value.toLocaleString('id-ID')}
                  </div>
                  <div className="text-sm text-orange-800 mt-1">Rata-rata per Pesanan</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-lg font-semibold mb-2">Sistem Laporan dalam Pengembangan</h3>
              <p className="text-gray-600 text-center mb-6">
                Saat ini sistem menggunakan data demo. Laporan detail akan tersedia setelah Anda mulai melakukan transaksi penjualan.
              </p>
              <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                <strong>Fitur yang akan segera tersedia:</strong>
                <ul className="mt-2 space-y-1">
                  <li>• Grafik penjualan per periode</li>
                  <li>• Analisis produk terlaris</li>
                  <li>• Laporan pelanggan terbaik</li>
                  <li>• Analisis tren penjualan</li>
                  <li>• Export laporan ke PDF/Excel</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!reportData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Siap Membuat Laporan</h3>
            <p className="text-gray-600 text-center">
              Pilih periode dan filter yang diinginkan, lalu klik "Buat Laporan" untuk melihat analisis penjualan Anda.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
