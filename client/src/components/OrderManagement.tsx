
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { Order, Customer, Product, CreateOrderInput, UpdateOrderInput } from '../../../server/src/schema';

interface OrderManagementProps {
  onDataChange: () => void;
}

interface OrderItem {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export function OrderManagement({ onDataChange }: OrderManagementProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const [ordersResult, customersResult, productsResult] = await Promise.all([
        trpc.orders.getAll.query(),
        trpc.customers.getAll.query(),
        trpc.products.getAll.query()
      ]);
      
      setOrders(ordersResult);
      setCustomers(customersResult);
      setProducts(productsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setSelectedCustomerId(null);
    setOrderItems([]);
    setNotes('');
  };

  const addOrderItem = () => {
    setOrderItems((prev: OrderItem[]) => [
      ...prev,
      { product_id: 0, quantity: 1, unit_price: 0 }
    ]);
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: number) => {
    setOrderItems((prev: OrderItem[]) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-fill unit price when product is selected
      if (field === 'product_id') {
        const product = products.find((p: Product) => p.id === value);
        if (product) {
          updated[index].unit_price = product.price;
        }
      }
      
      return updated;
    });
  };

  const removeOrderItem = (index: number) => {
    setOrderItems((prev: OrderItem[]) => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || orderItems.length === 0) return;

    setIsLoading(true);

    try {
      const orderData: CreateOrderInput = {
        customer_id: selectedCustomerId,
        items: orderItems.filter(item => item.product_id > 0),
        notes: notes || null
      };

      await trpc.orders.create.mutate(orderData);
      await loadData();
      onDataChange();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: number, status: Order['status']) => {
    try {
      const updateData: UpdateOrderInput = { id: orderId, status };
      await trpc.orders.update.mutate(updateData);
      await loadData();
      onDataChange();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusMap = {
      pending: { label: 'Menunggu', variant: 'secondary' as const },
      confirmed: { label: 'Dikonfirmasi', variant: 'default' as const },
      shipped: { label: 'Dikirim', variant: 'default' as const },
      delivered: { label: 'Selesai', variant: 'default' as const },
      cancelled: { label: 'Dibatalkan', variant: 'destructive' as const }
    };
    
    const config = statusMap[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">🛒 Manajemen Pesanan</h2>
          <p className="text-gray-600">Kelola pesanan pelanggan</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>+ Buat Pesanan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Buat Pesanan Baru</DialogTitle>
              <DialogDescription>
                Pilih pelanggan dan tambahkan produk untuk membuat pesanan
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Pilih Pelanggan *</Label>
                  <Select value={selectedCustomerId?.toString() || ''} onValueChange={(value) => setSelectedCustomerId(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pelanggan" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Item Pesanan</Label>
                    <Button type="button" variant="outline" onClick={addOrderItem}>
                      + Tambah Item
                    </Button>
                  </div>
                  
                  {orderItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label>Produk</Label>
                        <Select value={item.product_id.toString()} onValueChange={(value) => updateOrderItem(index, 'product_id', parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih produk" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.filter((p: Product) => p.is_active).map((product: Product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - Rp {product.price.toLocaleString('id-ID')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Jumlah</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)
                          }
                          min="1"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>Harga Satuan</Label>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>Total</Label>
                        <div className="text-sm font-medium pt-2">
                          Rp {(item.quantity * item.unit_price).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeOrderItem(index)}>
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}

                  {orderItems.length > 0 && (
                    <div className="flex justify-end">
                      <div className="text-lg font-semibold">
                        Total: Rp {calculateTotal().toLocaleString('id-ID')}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan untuk pesanan"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading || !selectedCustomerId || orderItems.length === 0}>
                  {isLoading ? 'Membuat...' : 'Buat Pesanan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-lg font-semibold mb-2">Belum Ada Pesanan</h3>
            <p className="text-gray-600 text-center mb-6">
              Buat pesanan pertama untuk mulai melacak penjualan Anda.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>+ Buat Pesanan Pertama</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order: Order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">#{order.order_number}</h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-gray-600">Pelanggan: {getCustomerName(order.customer_id)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      Rp {order.total_amount.toLocaleString('id-ID')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.order_date.toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </div>

                {order.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{order.notes}</p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Dibuat: {order.created_at.toLocaleDateString('id-ID')}
                  </div>
                  <div className="flex space-x-2">
                    {order.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'confirmed')}>
                          Konfirmasi
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(order.id, 'cancelled')}>
                          Batalkan
                        </Button>
                      </>
                    )}
                    {order.status === 'confirmed' && (
                      <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'shipped')}>
                        Kirim
                      </Button>
                    )}
                    {order.status === 'shipped' && (
                      <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'delivered')}>
                        Selesai
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
