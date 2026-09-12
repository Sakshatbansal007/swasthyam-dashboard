'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'INVALID CREDENTIALS. PLEASE TRY AGAIN.');
        setLoading(false);
        return;
      }

      // Successful login -> redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err) {
      setErrorMessage('COULD NOT CONNECT TO SERVER. PLEASE TRY AGAIN.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f9] flex flex-col items-center justify-center p-6 font-sans uppercase">
      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-8">
        <div className="bg-blue-600 p-2 rounded-xl shadow-sm">
          <Activity className="text-white w-7 h-7" />
        </div>
        <span className="font-black text-gray-900 text-2xl tracking-tight">Swasthyam Healthcare</span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Staff Portal</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Authorized personnel login</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-xs font-black tracking-wide">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
              Healthcare ID / Username
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-4 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="ENTER YOUR ID"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-blue-500 transition-colors text-sm normal-case"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-gray-200 font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-blue-500 transition-colors text-sm normal-case"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 px-6 rounded-xl transition-colors uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <span>Verifying...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center text-xs font-bold text-gray-400 tracking-wider">
        Confidential Medical Management Portal
      </div>
    </main>
  );
}
