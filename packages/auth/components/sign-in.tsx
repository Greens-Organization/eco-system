'use client';

import { Button } from '@pack/design-system/components/ui/base-button';
import { Input } from '@pack/design-system/components/ui/base-input';
import { Label } from '@pack/design-system/components/ui/base-label';
import { type FormEvent, useState } from 'react';
import { authClient } from '../client';

type SignInProps = {
  callbackURL?: string;
};

export const SignIn = ({ callbackURL = '/' }: SignInProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    await authClient.signIn.email(
      { email, password, callbackURL },
      {
        onError: (ctx) => {
          setError(ctx.error.message);
        },
        onSuccess: () => {
          window.location.href = callbackURL;
        },
      }
    );

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
};
