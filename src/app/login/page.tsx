'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Compass, Mail, Lock, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loginWithGoogle, resetPassword, loading, isMockMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google Authentication failed.');
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address to request a reset link.');
      return;
    }
    setError('');
    setIsResetting(true);
    try {
      await resetPassword(email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 relative overflow-hidden py-10">
      {/* Visual background details */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/5 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/25 mb-3">
            <Compass className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">DebtPilot Pro</h1>
          <p className="text-sm text-slate-500 mt-1">Track Loans. Master Debt. Grow Savings.</p>
        </div>

        <Card className="border border-slate-100 shadow-premium">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to manage your finance pilot desk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start space-x-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {resetSent && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start space-x-2 text-emerald-700 text-xs animate-pulse">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Reset link dispatched to {email}. Check your inbox!</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-500">Password</label>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-xs text-brand-500 hover:underline hover:text-brand-600 focus:outline-none"
                    disabled={isResetting}
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all duration-200"
                  required
                />
              </div>

              <Button type="submit" className="w-full" isLoading={submitting}>
                Sign In
              </Button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs">Or continue with</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={handleGoogleLogin}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Google
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  setEmail('demo@debtpilot.pro');
                  setPassword('demo-bypass-pass');
                  setSubmitting(true);
                  try {
                    await login('demo@debtpilot.pro', 'demo-bypass-pass');
                    router.push('/dashboard');
                  } catch (e) {
                    setError('Demo login failed.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100"
              >
                <ShieldCheck className="w-4 h-4 mr-2 text-brand-600" />
                Demo Mode
              </Button>
            </div>

            <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
              New to DebtPilot Pro?{' '}
              <Link href="/register" className="text-brand-500 hover:underline font-semibold">
                Create an account
              </Link>
            </div>
          </CardContent>
        </Card>

        {isMockMode && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start space-x-2 text-amber-700 text-xs">
            <Info className="w-4.5 h-4.5 shrink-0 text-amber-600" />
            <span>
              <strong>Note</strong>: Firebase credentials are not loaded in `.env`. The app is running in offline <strong>Mock Mode</strong>. Click <strong>Demo Mode</strong> to enter immediately with preloaded mock portfolios!
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
