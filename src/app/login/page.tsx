'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  username: z.string().min(3, 'Username or email must be at least 3 characters long'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Map username to email format if it is a plain username for Supabase backend/mock compatibility
      const email = values.username.includes('@')
        ? values.username
        : `${values.username}@mouzyerp.com`;

      // 1. Authenticate with Supabase GoTrue / Mock
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: values.password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-500">
            Mouzy ERP
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
            Enter your credentials below to access your branch ledger
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-500 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                {errorMsg}
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Username / Email
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="manager.402"
                className={`w-full focus:border-emerald-500 focus:ring-emerald-500 ${
                  errors.username ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''
                }`}
                {...register('username')}
              />
              {errors.username && (
                <p className="text-xs text-rose-500">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <a href="#" className="text-xs text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className={`w-full focus:border-emerald-500 focus:ring-emerald-500 ${
                  errors.password ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''
                }`}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-rose-500">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 h-10 font-medium"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
