
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { ProductManagement } from '@/components/ProductManagement';
import { CustomerManagement } from '@/components/CustomerManagement';
import { OrderManagement } from '@/components/OrderManagement';
import { InventoryTracking } from '@/components/InventoryTracking';
import { SalesReports } from '@/components/SalesReports';
import type { User, Order } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    totalOrders: 0,
    lowStockCount: 0,
    pendingOrders: 0
  });

  const loadDashboardData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const [products, customers, orders, lowStockProducts] = await Promise.all([
        trpc.products.getAll.query(),
        trpc.customers.getAll.query(),
        trpc.orders.getAll.query(),
        trpc.inventory.getLowStock.query()
      ]);

      const pendingOrders = orders.filter((order: Order) => order.status === 'pending').length;

      setDashboardData({
        totalProducts: products.length,
        totalCustomers: customers.length,
        totalOrders: orders.length,
        lowStockCount: lowStockProducts.length,
        pendingOrders
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setDashboardData({
      totalProducts: 0,
      totalCustomers: 0,
      totalOrders: 0,
      lowStockCount: 0,
      pendingOrders: 0
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">🏪 UMKM Sales Manager</h1>
            <p className="text-gray-600 mt-2">Sistem Manajemen Penjualan untuk UMKM</p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">🏪 UMKM Sales Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{currentUser.role}</Badge>
                <span className="text-sm text-gray-700">{currentUser.full_name}</span>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="products">📦 Produk</TabsTrigger>
            <TabsTrigger value="customers">👥 Pelanggan</TabsTrigger>
            <TabsTrigger value="orders">🛒 Pesanan</TabsTrigger>
            <TabsTrigger value="inventory">📋 Stok</TabsTrigger>
            <TabsTrigger value="reports">📈 Laporan</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
                  <span className="text-2xl">📦</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">
                    Produk terdaftar
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pelanggan</CardTitle>
                  <span className="text-2xl">👥</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.totalCustomers}</div>
                  <p className="text-xs text-muted-foreground">
                    Pelanggan aktif
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
                  <span className="text-2xl">🛒</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.pendingOrders} menunggu
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
                  <span className="text-2xl">⚠️</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{dashboardData.lowStockCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Perlu restok
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Selamat Datang, {currentUser.full_name}! 👋</CardTitle>
                <CardDescription>
                  Kelola bisnis UMKM Anda dengan mudah. Pilih menu di atas untuk memulai.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold">📦 Manajemen Produk</h3>
                    <p className="text-sm text-gray-600 mt-1">Tambah, edit, dan kelola produk Anda</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold">🛒 Kelola Pesanan</h3>
                    <p className="text-sm text-gray-600 mt-1">Proses dan lacak pesanan pelanggan</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold">📈 Laporan Penjualan</h3>
                    <p className="text-sm text-gray-600 mt-1">Analisis performa bisnis Anda</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <ProductManagement onDataChange={loadDashboardData} />
          </TabsContent>

          <TabsContent value="customers">
            <CustomerManagement onDataChange={loadDashboardData} />
          </TabsContent>

          <TabsContent value="orders">
            <OrderManagement onDataChange={loadDashboardData} />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryTracking onDataChange={loadDashboardData} />
          </TabsContent>

          <TabsContent value="reports">
            <SalesReports />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
