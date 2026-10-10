import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// API validation errors arrive as a list of objects; show a readable string either way.
const toText = (error) => (typeof error === 'string' ? error : error?.[0]?.msg || 'Something went wrong');

export default function Login() {
  const navigate = useNavigate();
  const { login, register, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegister && !(await register(email, password))) return;
    if (await login(email, password)) navigate('/dashboard');
  };

  const toggleMode = () => {
    useAuthStore.setState({ error: null });
    setIsRegister(!isRegister);
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-5" />
          </div>
          <CardTitle className="text-xl">Predictive Maintenance</CardTitle>
          <CardDescription>
            {isRegister ? 'Create an account to explore the platform' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={isRegister ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {isRegister && <p className="text-xs text-muted-foreground">At least 8 characters. New accounts are read-only until an admin grants engineer access.</p>}
            </div>
            {error && <p className="text-sm text-destructive">{toText(error)}</p>}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isRegister ? 'Already have an account?' : 'New here?'}{' '}
            <button type="button" onClick={toggleMode} className="text-primary underline-offset-4 hover:underline">
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
