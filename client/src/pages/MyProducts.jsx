import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { ProductCard } from '../components/products/ProductCard';
import { ProductTable } from '../components/products/ProductTable';
import { LifecycleModal } from '../components/products/LifecycleModal';
import { AddProductModal } from '../components/products/AddProductModal';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import {
  Search,
  Filter,
  Grid,
  List,
  Plus,
  Scan,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

export function MyProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [lifecycleStatus, setLifecycleStatus] = useState('active');
  const [expiryStatus, setExpiryStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Modals state
  const [activeModalProduct, setActiveModalProduct] = useState(null);
  const [modalType, setModalType] = useState(null); // 'open' | 'consume' | 'dispose' | 'delete'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editProductData, setEditProductData] = useState(null);

  const toast = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 12,
        sortBy,
        sortOrder
      });

      if (category !== 'all') params.append('category', category);
      if (lifecycleStatus !== 'all') params.append('lifecycleStatus', lifecycleStatus);
      if (expiryStatus !== 'all') params.append('expiryStatus', expiryStatus);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/products?${params.toString()}`);
      if (res.data.success) {
        setProducts(res.data.products);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category, lifecycleStatus, expiryStatus, sortBy, sortOrder, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  // Lifecycle actions
  const handleOpenConfirm = async ({ openedAt, afterOpeningDurationMonths }) => {
    try {
      const res = await api.patch(`/products/${activeModalProduct._id}/open`, {
        openedAt,
        afterOpeningDurationMonths
      });
      if (res.data.success) {
        toast.success(`"${activeModalProduct.name}" marked as opened!`);
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open product.');
    }
  };

  const handleConsumeConfirm = async () => {
    try {
      const res = await api.patch(`/products/${activeModalProduct._id}/consume`);
      if (res.data.success) {
        toast.success(`"${activeModalProduct.name}" marked as consumed! Reminders stopped.`);
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status.');
    }
  };

  const handleDisposeConfirm = async () => {
    try {
      const res = await api.patch(`/products/${activeModalProduct._id}/dispose`);
      if (res.data.success) {
        toast.success(`"${activeModalProduct.name}" marked as disposed.`);
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status.');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await api.delete(`/products/${activeModalProduct._id}`);
      if (res.data.success) {
        toast.success('Product deleted.');
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete product.');
    }
  };

  const handleSaveProduct = async (formData) => {
    if (editProductData) {
      const res = await api.patch(`/products/${editProductData._id}`, formData);
      if (res.data.success) {
        toast.success('Product updated successfully!');
        setEditProductData(null);
        fetchProducts();
      }
    } else {
      const res = await api.post('/products', formData);
      if (res.data.success) {
        toast.success('Product added successfully!');
        fetchProducts();
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Product Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Browse, search, and manage your products across all categories and lifecycle stages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditProductData(null);
              setIsAddModalOpen(true);
            }}
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
            Scan Product
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by product name, brand..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Multi-filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-500">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
            </div>

            {/* Category */}
            <select
              value={category}
              onChange={e => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="food_beverage">Food & Beverage</option>
              <option value="skincare">Skincare</option>
              <option value="makeup_cosmetics">Makeup & Cosmetics</option>
              <option value="medicine">Medicine</option>
              <option value="household">Household</option>
              <option value="other">Other</option>
            </select>

            {/* Expiry Status */}
            <select
              value={expiryStatus}
              onChange={e => {
                setExpiryStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Expiry States</option>
              <option value="fresh">Fresh</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="unknown">Unknown</option>
            </select>

            {/* Lifecycle Status */}
            <select
              value={lifecycleStatus}
              onChange={e => {
                setLifecycleStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Lifecycle</option>
              <option value="active">Active Only</option>
              <option value="consumed">Consumed</option>
              <option value="disposed">Disposed</option>
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
            >
              <option value="createdAt">Date Added</option>
              <option value="expiryDate">Expiry Deadline</option>
              <option value="name">Product Name</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSkeleton count={6} type={viewMode === 'table' ? 'table' : 'card'} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try adjusting your filters or search terms, or add a product to get started."
          action={
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              Add Product Manually
            </button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <ProductCard
              key={p._id}
              product={p}
              onOpen={prod => {
                setActiveModalProduct(prod);
                setModalType('open');
              }}
              onConsume={prod => {
                setActiveModalProduct(prod);
                setModalType('consume');
              }}
              onDispose={prod => {
                setActiveModalProduct(prod);
                setModalType('dispose');
              }}
              onEdit={prod => {
                setEditProductData(prod);
                setIsAddModalOpen(true);
              }}
              onDelete={prod => {
                setActiveModalProduct(prod);
                setModalType('delete');
              }}
            />
          ))}
        </div>
      ) : (
        <ProductTable
          products={products}
          onOpen={prod => {
            setActiveModalProduct(prod);
            setModalType('open');
          }}
          onConsume={prod => {
            setActiveModalProduct(prod);
            setModalType('consume');
          }}
          onDispose={prod => {
            setActiveModalProduct(prod);
            setModalType('dispose');
          }}
          onEdit={prod => {
            setEditProductData(prod);
            setIsAddModalOpen(true);
          }}
          onDelete={prod => {
            setActiveModalProduct(prod);
            setModalType('delete');
          }}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200 text-xs">
          <div className="text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{products.length}</span> of{' '}
            <span className="font-bold text-slate-800">{pagination.total}</span> products
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-slate-700">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lifecycle Action Modal */}
      <LifecycleModal
        isOpen={!!modalType}
        onClose={() => {
          setModalType(null);
          setActiveModalProduct(null);
        }}
        type={modalType}
        product={activeModalProduct}
        onConfirm={
          modalType === 'open'
            ? handleOpenConfirm
            : modalType === 'consume'
            ? handleConsumeConfirm
            : modalType === 'dispose'
            ? handleDisposeConfirm
            : handleDeleteConfirm
        }
      />

      {/* Add / Edit Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditProductData(null);
        }}
        onSave={handleSaveProduct}
        initialData={editProductData}
      />
    </div>
  );
}
