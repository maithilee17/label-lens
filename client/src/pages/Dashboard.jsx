import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { AddProductModal } from '../components/products/AddProductModal';
import { useToast } from '../context/ToastContext';
import {
  Package,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FolderOpen,
  CheckCircle,
  Scan,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const toast = useToast();

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard/summary');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleAddProduct = async (productData) => {
    const res = await api.post('/products', productData);
    if (res.data.success) {
      toast.success('Product successfully added to inventory!');
      fetchDashboardData();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <LoadingSkeleton count={4} />
      </div>
    );
  }

  const stats = data?.stats || {};
  const useFirst = data?.useFirst || [];
  const statusChartData = (data?.statusChartData || []).filter(d => d.count > 0);
  const categoryChartData = (data?.categoryChartData || []).filter(d => d.count > 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Inventory Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time expiry metrics, risk prioritization, and freshness tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            Add Manually
          </button>

          <Link
            to="/scan"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 transition-all hover:scale-[1.01]"
          >
            <Scan className="w-4 h-4" />
            Scan New Label
          </Link>
        </div>
      </div>

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Products</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalActive || 0}</div>
          <div className="text-[11px] text-slate-400">Tracked in your pantry & stash</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm space-y-2 bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Expiring in 2 Days</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center animate-bounce">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{stats.expiringWithinTwoDays || 0}</div>
          <div className="text-[11px] text-amber-700 font-semibold">Immediate attention needed</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Expired</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{stats.expired || 0}</div>
          <div className="text-[11px] text-slate-400">Past confirmed deadline</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Opened (PAO Active)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600">{stats.opened || 0}</div>
          <div className="text-[11px] text-slate-400">Countdown timer running</div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-semibold text-slate-400">Unknown Expiry</div>
          <div className="text-lg font-bold text-slate-700">{stats.unknown || 0}</div>
        </div>
        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-semibold text-slate-400">Consumed Products</div>
          <div className="text-lg font-bold text-emerald-600">{stats.consumed || 0}</div>
        </div>
        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-semibold text-slate-400">Disposed</div>
          <div className="text-lg font-bold text-slate-500">{stats.disposed || 0}</div>
        </div>
      </div>

      {/* "Use First" Prioritization Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Use First Priority</h2>
              <p className="text-xs text-slate-400">Consume these items next to prevent waste.</p>
            </div>
          </div>
          <Link
            to="/products"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {useFirst.length === 0 ? (
          <EmptyState
            title="All Fresh & Clear"
            description="You have no active products nearing expiry right now. Keep scanning labels!"
            action={
              <Link
                to="/scan"
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                Scan a Product
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {useFirst.map(p => {
              const days = p.daysRemaining;
              let urgencyBg = 'bg-slate-50 text-slate-600 border-slate-200';
              if (days < 0) urgencyBg = 'bg-rose-50 text-rose-700 border-rose-200';
              else if (days <= 2) urgencyBg = 'bg-amber-50 text-amber-700 border-amber-200';
              else if (days <= 7) urgencyBg = 'bg-yellow-50 text-yellow-700 border-yellow-200';

              return (
                <Link
                  key={p._id}
                  to={`/products/${p._id}`}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between bg-white group"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-700">
                      {p.category.replace('_', ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700">
                      {p.name}
                    </h4>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(p.deadline).toLocaleDateString()}
                    </div>
                  </div>

                  <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${urgencyBg}`}>
                    {days < 0 ? 'Expired' : days === 0 ? 'Expires Today' : `${days}d left`}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Expiry Status Distribution</h3>
          {statusChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No products available for status breakdown.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {statusChartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Products by Category</h3>
          {categoryChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No products found in categories yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Manual Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddProduct}
      />
    </div>
  );
}
