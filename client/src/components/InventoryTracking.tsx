
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { Product, InventoryTransaction, AdjustInventoryInput } from '../../../server/src/schema';

interface InventoryTrackingProps {
  onDataChange: () => void;
}

export function InventoryTracking({ onDataChange }: InventoryTrackingProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState<AdjustInventoryInput>({
    product_id: 0,
    quantity: 0,
    transaction_type: 'adjustment',
    notes: null
  });

  const loadData = useCallback(async () => {
    try {
      const [productsResult, lowStockResult, transactionsResult] = await Promise.all([
        trpc.products.getAll.query(),
        trpc.inventory.getLowStock.query(),
        trpc.inventory.getTransactions.query({})
      ]);
      
      setProducts(productsResult);
      setLowStockProducts(lowStockResult);
      setTransactions(transactionsResult);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setAdjustmentData({
      product_id: 0,
      quantity: 0,
      transaction_type: 'adjustment',
      notes: null
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustmentData.product_id === 0) return;

    setIsLoading(true);

    try {
      await trpc.inventory.adjust.mutate(adjustmentData);
      await loadData();
      onDataChange();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to adjust inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) {
      return <Badge variant="destructive">Habis</Badge>;
    } else if (product.stock_quantity <= product.min_stock_level) {
      return <Badge variant="secondary">Stok Rendah</Badge>;
    }
    return <Badge variant="default">Aman</Badge>;
  };

  const getTransactionTypeLabel = (type: InventoryTransaction['transaction_type']) => {
    const typeMap = {
      sale: 'Penjualan',
      purchase: 'Pembelian',
      adjustment: 'Penyesuaian',
      return: 'Retur'
    };
    return typeMap[type];
  };

  const getProductName = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">📋 Pelacakan Stok</h2>
          <p className="text-gray-600">Monitor dan kelola inventori produk</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>⚙️ Sesuaikan Stok</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Penyesuaian Stok</DialogTitle>
              <DialogDescription>
                Lakukan penyesuaian stok untuk produk tertentu
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Pilih Produk *</Label>
                  <Select 
                    value={adjustmentData.product_id > 0 ? adjustmentData.product_id.toString() : 'select-product'} 
                    onValueChange={(value) => 
                      setAdjustmentData((prev: AdjustInventoryInput) => ({ 
                        ...prev, 
                        product_id: value === 'select-product' ? 0 : parseInt(value) 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select-product" disabled>
                        {products.length === 0 ? 'Tidak ada produk tersedia' : 'Pilih produk'}
                      </SelectItem>
                      {products.map((product: Product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} (Stok: {product.stock_quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Jenis Transaksi</Label>
                  <Select 
                    value={adjustmentData.transaction_type} 
                    onValueChange={(value: AdjustInventoryInput['transaction_type']) => 
                      setAdjustmentData((prev: AdjustInventoryInput) => ({ 
                        ...prev, 
                        transaction_type: value 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adjustment">Penyesuaian</SelectItem>
                      <SelectItem value="purchase">Pembelian</SelectItem>
                      <SelectItem value="return">Retur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Jumlah Perubahan</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={adjustmentData.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdjustmentData((prev: AdjustInventoryInput) => ({ 
                        ...prev, 
                        quantity: parseInt(e.target.value) || 0 
                      }))
                    }
                    placeholder="Gunakan angka negatif untuk mengurangi stok"
                  />
                  <p className="text-xs text-gray-500">
                    Gunakan angka positif untuk menambah, negatif untuk mengurangi
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    value={adjustmentData.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setAdjustmentData((prev: AdjustInventoryInput) => ({ 
                        ...prev, 
                        notes: e.target.value || null 
                      }))
                    }
                    placeholder="Alasan penyesuaian stok"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading || adjustmentData.product_id === 0}>
                  {isLoading ? 'Memproses...' : 'Sesuaikan Stok'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Stok Saat Ini</TabsTrigger>
          <TabsTrigger value="low-stock">Stok Rendah</TabsTrigger>
          <TabsTrigger value="transactions">Riwayat Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          {products.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-semibold mb-2">Belum Ada Produk</h3>
                <p className="text-gray-600 text-center">
                  Tambahkan produk terlebih dahulu untuk melacak inventori.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {products.map((product: Product) => (
                <Card key={product.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{product.name}</h3>
                          {getStockStatus(product)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Stok Saat Ini:</span>
                            <p className="font-medium text-lg">{product.stock_quantity} unit</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Batas Minimum:</span>
                            <p className="font-medium">{product.min_stock_level} unit</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Harga Jual:</span>
                            <p className="font-medium">Rp {product.price.toLocaleString('id-ID')}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Nilai Stok:</span>
                            <p className="font-medium">
                              Rp {(product.stock_quantity * product.cost_price).toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="low-stock">
          {lowStockProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-lg font-semibold mb-2 text-green-600">Semua Stok Aman</h3>
                <p className="text-gray-600 text-center">
                  Tidak ada produk dengan stok rendah saat ini.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-orange-400 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-orange-700">
                      <strong>Perhatian:</strong> {lowStockProducts.length} produk memiliki stok rendah dan perlu direstock.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {lowStockProducts.map((product: Product) => (
                  <Card key={product.id} className="border-orange-200">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{product.name}</h3>
                            {getStockStatus(product)}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Stok Tersisa:</span>
                              <p className="font-medium text-lg text-orange-600">
                                {product.stock_quantity} unit
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Batas Minimum:</span>
                              <p className="font-medium">{product.min_stock_level} unit</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Perlu Ditambah:</span>
                              <p className="font-medium">
                                {Math.max(0, product.min_stock_level - product.stock_quantity + 10)} unit
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2">Belum Ada Transaksi</h3>
                <p className="text-gray-600 text-center">
                  Riwayat transaksi inventori akan muncul di sini.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {transactions.map((transaction: InventoryTransaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{getProductName(transaction.product_id)}</h4>
                          <Badge variant="outline">
                            {getTransactionTypeLabel(transaction.transaction_type)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Jumlah:</span>
                            <p className={`font-medium ${transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.quantity > 0 ? '+' : ''}{transaction.quantity} unit
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Tanggal:</span>
                            <p className="font-medium">
                              {transaction.created_at.toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Waktu:</span>
                            <p className="font-medium">
                              {transaction.created_at.toLocaleTimeString('id-ID')}
                            </p>
                          </div>
                          {transaction.notes && (
                            <div className="col-span-2 md:col-span-4">
                              <span className="text-gray-500">Catatan:</span>
                              <p className="font-medium">{transaction.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
