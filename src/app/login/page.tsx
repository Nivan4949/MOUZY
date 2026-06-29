'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(3, 'Username or email must be at least 3 characters long'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f19] px-4 py-12 font-sans select-none overflow-hidden">
      <Card className="w-full max-w-md border border-slate-800/80 bg-[#131924]/80 backdrop-blur-md p-8 shadow-2xl rounded-3xl">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          {/* Detailed logo nested in a squircle */}
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center bg-[#1c2230] rounded-2xl border border-slate-800 shadow-inner mb-4">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#ffd600] text-[#0b522c] shadow-md">
              <svg className="h-7 w-7" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Spoon Handle extending up */}
                <path d="M 48 12 L 52 12 L 52 45 L 48 45 Z" fill="currentColor" />
                {/* Spoon Bowl in the middle */}
                <ellipse cx="50" cy="42" rx="3.5" ry="6" fill="currentColor" />
                {/* Thick Banana crescent body with stems */}
                <path d="M 22,38 C 22,38 15,42 17,48 C 21,60 32,73 50,73 C 68,73 79,60 83,48 C 85,42 78,38 78,38 C 78,38 74,51 68,57 C 60,63 55,65 50,65 C 45,65 40,63 32,57 C 26,51 22,38 22,38 Z" fill="currentColor" />
                {/* Small stem details on banana ends */}
                <path d="M 22,38 C 22,38 23,35 20,36 C 17,37 17,45 17,45 Z" fill="currentColor" />
                <path d="M 78,38 C 78,38 77,35 80,36 C 83,37 83,45 83,45 Z" fill="currentColor" />
                {/* Floating Fruits (Circles representing fruits) */}
                <circle cx="35" cy="45" r="2.5" fill="currentColor" />
                <circle cx="42" cy="51" r="2" fill="currentColor" />
                <circle cx="38" cy="55" r="2" fill="currentColor" />
                <circle cx="65" cy="45" r="2.5" fill="currentColor" />
                <circle cx="58" cy="51" r="2" fill="currentColor" />
                <circle cx="62" cy="55" r="2" fill="currentColor" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            Mouzy ERP
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1.5">
            Log in to your POS terminal
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-950/20 p-3 text-xs font-semibold text-rose-450 border border-rose-900/40 text-center">
              {errorMsg}
            </div>
          )}
          
          {/* Username box */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Username
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-550" />
              <input
                id="username"
                type="text"
                placeholder="admin / cashier"
                className={`w-full bg-[#1a202c] border border-slate-800/80 text-white rounded-xl h-11 pl-10 pr-4 focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 focus:outline-none placeholder-slate-600 font-semibold text-xs transition-all ${
                  errors.username ? 'border-rose-800 focus:ring-rose-800' : ''
                }`}
                {...register('username')}
              />
            </div>
            {errors.username && (
              <p className="text-[10px] text-rose-500 font-bold">{errors.username.message}</p>
            )}
          </div>

          {/* Password box */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-550" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={`w-full bg-[#1a202c] border border-slate-800/80 text-white rounded-xl h-11 pl-10 pr-10 focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 focus:outline-none placeholder-slate-600 font-semibold text-xs transition-all ${
                  errors.password ? 'border-rose-800 focus:ring-rose-800' : ''
                }`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-550 hover:text-slate-350 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[10px] text-rose-500 font-bold">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2e7d32] hover:bg-[#276e2a] active:bg-[#1e5220] text-white rounded-xl h-11 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors mt-8 shadow-lg shadow-emerald-950/20"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn size={14} className="mr-0.5" />
                <span>Start Session</span>
              </>
            )}
          </Button>
        </form>

        {/* Footer text */}
        <p className="text-[8px] font-black text-slate-600 tracking-widest uppercase text-center mt-8 select-none">
          MOUZY ERP V1.2.0 • CLOUD SYNC ACTIVE
        </p>
      </Card>
    </div>
  );
}
