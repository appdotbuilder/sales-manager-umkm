
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '../../../server/src/schema';

interface CustomerManagementProps {
  onDataChange: () => void;
}

export function CustomerManagement({ onDataChange }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: '',
    email: null,
    phone: null,
    address: null,
    city: null
  });

  const loadCustomers = useCallback(async () => {
    try {
      const result = await trpc.customers.getAll.query();
      setCustomers(result);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: null,
      phone: null,
      address: null,
      city: null
    });
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingCustomer) {
        const updateData: UpdateCustomerInput = {
          id: editingCustomer.id,
          ...formData
        };
        await trpc.customers.update.mutate(updateData);
      } else {
        await trpc.customers.create.mutate(formData);
      }

      await loadCustomers();
      onDataChange();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) return;

    try {
      await trpc.customers.delete.mutate({ id });
      await loadCustomers();
      onDataChange();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">👥 Manajemen Pelanggan</h2>
          <p className="text-gray-600">Kelola data pelanggan Anda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>+ Tambah Pelanggan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? 'Perbarui informasi pelanggan' : 'Masukkan detail pelanggan baru'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Pelanggan *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateCustomerInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nama lengkap pelanggan"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateCustomerInput) => ({
                        ...prev,
                        email: e.target.value || null
                      }))
                    }
                    placeholder="email@contoh.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor Telepon</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateCustomerInput) => ({
                        ...prev,
                        phone: e.target.value || null
                      }))
                    }
                    placeholder="08xxxxxxxxxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateCustomerInput) => ({
                        ...prev,
                        address: e.target.value || null
                      }))
                    }
                    placeholder="Alamat lengkap"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Kota</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateCustomerInput) => ({
                        ...prev,
                        city: e.target.value || null
                      }))
                    }
                    placeholder="Nama kota"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Menyimpan...' : (editingCustomer ? 'Perbarui' : 'Simpan')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">Belum Ada Pelanggan</h3>
            <p className="text-gray-600 text-center mb-6">
              Tambahkan pelanggan pertama Anda untuk mulai mencatat pesanan dan membangun database pelanggan.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>+ Tambah Pelanggan Pertama</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {customers.map((customer: Customer) => (
            <Card key={customer.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{customer.name}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <p className="font-medium">{customer.email || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Telepon:</span>
                        <p className="font-medium">{customer.phone || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Alamat:</span>
                        <p className="font-medium">{customer.address || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Kota:</span>
                        <p className="font-medium">{customer.city || '-'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-400">
                      Terdaftar: {customer.created_at.toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(customer.id)}>
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
