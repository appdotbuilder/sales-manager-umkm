
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/utils/trpc';
import type { Product, CreateProductInput, UpdateProductInput } from '../../../server/src/schema';

interface ProductManagementProps {
  onDataChange: () => void;
}

export function ProductManagement({ onDataChange }: ProductManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    description: null,
    sku: '',
    price: 0,
    cost_price: 0,
    stock_quantity: 0,
    min_stock_level: 5,
    category: null,
    is_active: true
  });

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.products.getAll.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: null,
      sku: '',
      price: 0,
      cost_price: 0,
      stock_quantity: 0,
      min_stock_level: 5,
      category: null,
      is_active: true
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      sku: product.sku,
      price: product.price,
      cost_price: product.cost_price,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      category: product.category,
      is_active: product.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingProduct) {
        const updateData: UpdateProductInput = {
          id: editingProduct.id,
          ...formData
        };
        await trpc.products.update.mutate(updateData);
      } else {
        await trpc.products.create.mutate(formData);
      }

      await loadProducts();
      onDataChange();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

    try {
      await trpc.products.delete.mutate({ id });
      await loadProducts();
      onDataChange();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) {
      return <Badge variant="destructive">Habis</Badge>;
    } else if (product.stock_quantity <= product.min_stock_level) {
      return <Badge variant="secondary">Stok Rendah</Badge>;
    }
    return <Badge variant="default">Tersedia</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">📦 Manajemen Produk</h2>
          <p className="text-gray-600">Kelola produk dan inventori Anda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>+ Tambah Produk</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Perbarui informasi produk' : 'Masukkan detail produk baru'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Produk *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Nama produk"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({ ...prev, sku: e.target.value }))
                      }
                      placeholder="SKU produk"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData((prev: CreateProductInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    placeholder="Deskripsi produk"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Harga Jual *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                      }
                      placeholder="0"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Harga Modal *</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      value={formData.cost_price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))
                      }
                      placeholder="0"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity">Stok Awal</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))
                      }
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_stock_level">Batas Minimum Stok</Label>
                    <Input
                      id="min_stock_level"
                      type="number"
                      value={formData.min_stock_level}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))
                      }
                      placeholder="5"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Input
                      id="category"
                      value={formData.category || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({
                          ...prev,
                          category: e.target.value || null
                        }))
                      }
                      placeholder="Kategori produk"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="is_active">Status Aktif</Label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked: boolean) =>
                          setFormData((prev: CreateProductInput) => ({ ...prev, is_active: checked }))
                        }
                      />
                      <Label htmlFor="is_active">
                        {formData.is_active ? 'Aktif' : 'Nonaktif'}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Menyimpan...' : (editingProduct ? 'Perbarui' : 'Simpan')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-semibold mb-2">Belum Ada Produk</h3>
            <p className="text-gray-600 text-center mb-6">
              Mulai dengan menambahkan produk pertama Anda untuk mengelola inventori dan penjualan.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>+ Tambah Produk Pertama</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product: Product) => (
            <Card key={product.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      {getStockStatus(product)}
                      {!product.is_active && (
                        <Badge variant="outline">Nonaktif</Badge>
                      )}
                    </div>
                    
                    {product.description && (
                      <p className="text-gray-600 mb-3">{product.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">SKU:</span>
                        <p className="font-medium">{product.sku}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Harga Jual:</span>
                        <p className="font-medium">Rp {product.price.toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Stok:</span>
                        <p className="font-medium">{product.stock_quantity} unit</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Kategori:</span>
                        <p className="font-medium">{product.category || '-'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-400">
                      Profit: Rp {(product.price - product.cost_price).toLocaleString('id-ID')} per unit
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                      Hapus
                    </Button>
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
