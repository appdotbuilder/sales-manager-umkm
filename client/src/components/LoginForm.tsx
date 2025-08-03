
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, LoginInput } from '../../../server/src/schema';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginInput>({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await trpc.auth.login.mutate(formData);
      onLogin(response.user);
    } catch (error) {
      setError('Username atau password salah. Silakan coba lagi.');
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Masuk ke Sistem</CardTitle>
        <CardDescription>
          Masukkan username dan password untuk mengakses aplikasi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: LoginInput) => ({ ...prev, username: e.target.value }))
              }
              placeholder="Masukkan username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Masukkan password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Demo:</strong> Gunakan username dan password apa saja untuk masuk (sistem demo)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
