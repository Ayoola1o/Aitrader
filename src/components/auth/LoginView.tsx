'use client';

import React, { useState } from 'react';
import {
  Brain,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Key,
  ArrowRight,
  Shield,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { sessionManager, UserSession } from '@/lib/auth/session';

interface LoginViewProps {
  onLoginSuccess: (user: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const [name, setName] = useState('Ayoola Adebisi');
  const [email, setEmail] = useState('Azahadinc');
  const [password, setPassword] = useState('Ayoola10');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        if (!email || !password) {
          setErrorMessage('Please enter email and password');
          setIsLoading(false);
          return;
        }
        const res = await sessionManager.signUpWithEmail(email, password, name);
        if (res.success && res.user) {
          setSuccessMessage('Account registered successfully!');
          setTimeout(() => onLoginSuccess(res.user!), 600);
        } else {
          setErrorMessage(res.error || 'Failed to create account');
        }
      } else {
        if (!email || !password) {
          setErrorMessage('Please enter email and password');
          setIsLoading(false);
          return;
        }
        const res = await sessionManager.loginWithEmail(email, password);
        if (res.success && res.user) {
          setSuccessMessage('Signed in successfully');
          setTimeout(() => onLoginSuccess(res.user!), 500);
        } else {
          setErrorMessage(res.error || 'Invalid credentials');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'Google' | 'GitHub') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await sessionManager.signInWithOAuth(provider.toLowerCase() as 'google' | 'github');
      if (!res.success) {
        setErrorMessage(res.error || `Failed to initialize ${provider} OAuth`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#040814] text-white flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden font-sans select-none">
      {/* Background Glows & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Grid: Left Hero Branding + Right Auth Card */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto z-10">
        
        {/* ── LEFT COLUMN: HERO & HOLOGRAPHIC STATS ── */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-white">AI QUANT TRADER</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30 uppercase tracking-widest">
                LITE
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              AI-Powered Quantitative Trading,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                Built for Traders
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 max-w-xl leading-relaxed">
              Advanced AI agents, real-time market intelligence, and institutional-grade analytics in one platform.
            </p>
          </div>

          {/* 4 Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#080E1A]/80 border border-gray-800/80 hover:border-cyan-500/40 transition-colors backdrop-blur-sm">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">AI AGENTS</span>
                <span className="text-[11px] text-gray-400">Multi-agent analysis & decision fusion</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#080E1A]/80 border border-gray-800/80 hover:border-cyan-500/40 transition-colors backdrop-blur-sm">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">REAL-TIME DATA</span>
                <span className="text-[11px] text-gray-400">Live market data & order book</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#080E1A]/80 border border-gray-800/80 hover:border-cyan-500/40 transition-colors backdrop-blur-sm">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">RISK CONTROL</span>
                <span className="text-[11px] text-gray-400">Advanced risk engine & safeguards</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#080E1A]/80 border border-gray-800/80 hover:border-cyan-500/40 transition-colors backdrop-blur-sm">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">PERFORMANCE ANALYTICS</span>
                <span className="text-[11px] text-gray-400">Deep insights & strategy attribution</span>
              </div>
            </div>
          </div>

          {/* 3D Holographic Pedestal with Floating Metric Cards */}
          <div className="relative pt-4 max-w-xl hidden sm:block">
            <div className="grid grid-cols-2 gap-4">
              {/* Card 1: Total Equity */}
              <div className="p-3.5 rounded-xl bg-[#091020]/90 border border-cyan-500/20 shadow-lg backdrop-blur-md space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">TOTAL EQUITY</div>
                <div className="text-lg font-black text-white font-mono">$125,340.27</div>
                <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
                  +1,245.31 (1.01%)
                </div>
              </div>

              {/* Card 2: Sharpe Ratio */}
              <div className="p-3.5 rounded-xl bg-[#091020]/90 border border-purple-500/20 shadow-lg backdrop-blur-md space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">SHARPE RATIO</div>
                <div className="text-lg font-black text-white font-mono">2.14</div>
                <div className="text-[10px] text-purple-400 font-bold font-mono">Top 5% Institutional</div>
              </div>

              {/* Card 3: Daily P&L */}
              <div className="p-3.5 rounded-xl bg-[#091020]/90 border border-emerald-500/20 shadow-lg backdrop-blur-md space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">DAILY P&L</div>
                <div className="text-lg font-black text-emerald-400 font-mono">+$1,245.31</div>
                <div className="text-[10px] text-gray-400 font-mono">+1.01% intraday</div>
              </div>

              {/* Card 4: Win Rate */}
              <div className="p-3.5 rounded-xl bg-[#091020]/90 border border-blue-500/20 shadow-lg backdrop-blur-md space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">WIN RATE</div>
                <div className="text-lg font-black text-cyan-300 font-mono">62.38%</div>
                <div className="text-[10px] text-gray-400 font-mono">616 Total Decisions</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: AUTHENTICATION CARD ── */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-[#0B111E]/95 border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 relative">
            
            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs text-gray-400">
                {authMode === 'signin'
                  ? 'Sign in to your AI Quant Trader Lite account'
                  : 'Get started with institutional AI quantitative trading'}
              </p>
            </div>

            {/* Alerts */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    FULL NAME
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Ayoola Adebisi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#070D18] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="trader@quantarion.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#070D18] border border-gray-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    PASSWORD
                  </label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => alert('Password reset link sent to your registered email.')}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#070D18] border border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Social OAuth */}
            <div className="space-y-3 pt-1">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-gray-800 w-full" />
                <span className="bg-[#0B111E] px-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  OR CONTINUE WITH
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('Google')}
                  className="p-2.5 rounded-xl bg-[#070D18] border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-rose-400">G</span> Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('GitHub')}
                  className="p-2.5 rounded-xl bg-[#070D18] border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-gray-300">🐙</span> GitHub
                </button>
              </div>
            </div>

            {/* Toggle Mode */}
            <div className="text-center text-xs text-gray-400 pt-2">
              {authMode === 'signin' ? (
                <span>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setErrorMessage(null);
                    }}
                    className="text-cyan-400 font-bold hover:underline"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setErrorMessage(null);
                    }}
                    className="text-cyan-400 font-bold hover:underline"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 pt-8 gap-3 border-t border-gray-900/60 z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Your data is encrypted and secure</span>
        </div>
        <div>
          © 2026 AI Quant Trader Lite. All rights reserved.
        </div>
        <div>
          Need help? <a href="mailto:support@quantarion.ai" className="text-cyan-400 hover:underline">Contact Support</a>
        </div>
      </div>
    </div>
  );
};
