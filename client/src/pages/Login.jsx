import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back to LabelLens!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('demo@labellens.local');
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
          <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
          Sign in to Label<span className="text-emerald-600">Lens</span>
        </h2>
        <p className="mt-1.5 text-xs text-slate-500 font-medium">
          Scan it. Verify it. Track it. Never let safety expire.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3 text-center">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-xl transition-colors border border-emerald-200/60"
            >
              Fill Demo Credentials (Development Only)
            </button>

            <p className="text-xs text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-emerald-600 hover:text-emerald-700">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
