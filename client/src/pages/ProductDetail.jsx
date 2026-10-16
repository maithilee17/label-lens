import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LifecycleModal } from '../components/products/LifecycleModal';
import { AddProductModal } from '../components/products/AddProductModal';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  History,
  FolderOpen,
  Check,
  AlertTriangle,
  Edit,
  Trash2,
  FileText,
  Bell
} from 'lucide-react';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [scans, setScans] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalType, setModalType] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchProductHistory = async () => {
    try {
      const res = await api.get(`/products/${id}/history`);
      if (res.data.success) {
        setProduct(res.data.product);
        setScans(res.data.scans || []);
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      toast.error('Could not load product history.');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductHistory();
  }, [id]);

  const handleOpenConfirm = async ({ openedAt, afterOpeningDurationMonths }) => {
    try {
      const res = await api.patch(`/products/${id}/open`, {
        openedAt,
        afterOpeningDurationMonths
      });
      if (res.data.success) {
        toast.success('Product marked as opened!');
        fetchProductHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open product.');
    }
  };

  const handleConsumeConfirm = async () => {
    try {
      const res = await api.patch(`/products/${id}/consume`);
      if (res.data.success) {
        toast.success('Product marked as consumed!');
        fetchProductHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDisposeConfirm = async () => {
    try {
      const res = await api.patch(`/products/${id}/dispose`);
      if (res.data.success) {
        toast.success('Product marked as disposed.');
        fetchProductHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await api.delete(`/products/${id}`);
      if (res.data.success) {
        toast.success('Product deleted.');
        navigate('/products');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product.');
    }
  };

  const handleSaveEdit = async (formData) => {
    try {
      const res = await api.patch(`/products/${id}`, formData);
      if (res.data.success) {
        toast.success('Product details updated!');
        fetchProductHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-bold text-sm">
        Loading product audit details...
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>

        <div className="flex items-center gap-2">
          {product.lifecycleStatus === 'active' && !product.openedAt && (
            <button
              onClick={() => setModalType('open')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
            >
              <FolderOpen className="w-4 h-4" /> Open Product
            </button>
          )}

          {product.lifecycleStatus === 'active' && (
            <button
              onClick={() => setModalType('consume')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
            >
              <Check className="w-4 h-4" /> Mark Consumed
            </button>
          )}

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors"
          >
            <Edit className="w-4 h-4" /> Edit
          </button>

          <button
            onClick={() => setModalType('delete')}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-4 aspect-square rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
          {product.imagePath ? (
            <img src={product.imagePath} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Calendar className="w-16 h-16 text-slate-300 stroke-[1.2]" />
          )}
        </div>

        <div className="md:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge type="category" value={product.category} />
            <StatusBadge type="lifecycle" value={product.lifecycleStatus} />
            <StatusBadge type="verification" value={product.verificationStatus} />
          </div>

          <div>
            {product.brand && (
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                {product.brand}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {product.name}
            </h1>
          </div>

          {/* Key Dates Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Printed Expiry</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {product.printedExpiryDate
                  ? new Date(product.printedExpiryDate).toLocaleDateString()
                  : 'Not Specified'}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">{product.printedExpiryDatePrecision} precision</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manufacturing Date</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {product.manufacturingDate
                  ? new Date(product.manufacturingDate).toLocaleDateString()
                  : 'Not Specified'}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">{product.manufacturingDatePrecision} precision</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">After-Opening (PAO)</div>
              <div className="text-sm font-bold text-blue-700 mt-0.5">
                {product.afterOpeningDeadline
                  ? new Date(product.afterOpeningDeadline).toLocaleDateString()
                  : product.afterOpeningDurationMonths
                  ? `${product.afterOpeningDurationMonths}M (Not opened yet)`
                  : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-400">
                {product.openedAt ? `Opened on ${new Date(product.openedAt).toLocaleDateString()}` : 'Unopened'}
              </div>
            </div>
          </div>

          {product.notes && (
            <p className="text-xs text-slate-600 bg-amber-50/60 p-3 rounded-xl border border-amber-200/50">
              <span className="font-bold text-amber-900">Notes:</span> {product.notes}
            </p>
          )}
        </div>
      </div>

      {/* Lifecycle Timeline & Scan Audit */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lifecycle Audit & Verification History</h2>
            <p className="text-xs text-slate-400">
              Complete chronological audit trail preserving OCR detections, manual edits, and lifecycle milestones.
            </p>
          </div>
        </div>

        <div className="relative pl-6 border-l-2 border-slate-200 space-y-8 ml-3">
          {/* Creation Event */}
          <div className="relative">
            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm"></div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-900">
                Product Confirmed & Added to Inventory
              </div>
              <div className="text-[11px] text-slate-400">
                {new Date(product.createdAt).toLocaleString()}
              </div>
              <div className="text-xs text-slate-600">
                Initial verification status: <span className="font-semibold text-emerald-700">{product.verificationStatus}</span> via <span className="font-semibold">{product.dateSource}</span>.
              </div>
            </div>
          </div>

          {/* Original Scan Event if available */}
          {scans.map(scan => (
            <div key={scan._id} className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    OCR Scan Analysis
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(scan.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  OCR Confidence: <span className="font-bold text-slate-800">{scan.ocrConfidence}%</span> |
                  Image Quality: <span className="font-bold capitalize">{scan.imageQuality?.overallRating || 'acceptable'}</span>
                </div>

                {/* Correction details audit */}
                {scan.correctionDetails && scan.correctionDetails.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
                    <div className="text-[11px] font-bold text-slate-700">Audit Corrections Logged:</div>
                    {scan.correctionDetails.map((corr, idx) => (
                      <div key={idx} className="text-[11px] text-slate-500">
                        • Field <span className="font-semibold text-slate-700">{corr.field}</span>: changed from{' '}
                        <span className="line-through">{String(corr.fromValue || 'empty')}</span> to{' '}
                        <span className="font-semibold text-slate-800">{String(corr.toValue)}</span> ({corr.reason})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Opening Event */}
          {product.openedAt && (
            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-purple-500 border-4 border-white shadow-sm"></div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-purple-900">
                  Opened Event Triggered (PAO Active)
                </div>
                <div className="text-[11px] text-slate-400">
                  {new Date(product.openedAt).toLocaleString()}
                </div>
                <div className="text-xs text-slate-600">
                  PAO Duration: {product.afterOpeningDurationMonths} months. Calculated deadline:{' '}
                  <span className="font-bold text-purple-800">
                    {new Date(product.afterOpeningDeadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Consumption / Disposal Event */}
          {product.consumedAt && (
            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-600 border-4 border-white shadow-sm"></div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-emerald-900">Marked as Consumed</div>
                <div className="text-[11px] text-slate-400">
                  {new Date(product.consumedAt).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">
                  All pending reminders cancelled. Safely consumed before expiry.
                </div>
              </div>
            </div>
          )}

          {product.disposedAt && (
            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-500 border-4 border-white shadow-sm"></div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-900">Marked as Disposed</div>
                <div className="text-[11px] text-slate-400">
                  {new Date(product.disposedAt).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Log */}
          {notifications.length > 0 && (
            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-sm"></div>
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  Scheduled Reminders Generated ({notifications.length})
                </div>
                <div className="space-y-1.5">
                  {notifications.map(notif => (
                    <div key={notif._id} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/50 text-xs">
                      <div className="font-bold text-amber-900">{notif.title}</div>
                      <div className="text-amber-800 text-[11px]">{notif.message}</div>
                      <div className="text-[10px] text-amber-600 mt-1">
                        Scheduled for: {new Date(notif.scheduledFor).toLocaleDateString()} | Channel: {notif.channel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lifecycle Modal */}
      <LifecycleModal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        type={modalType}
        product={product}
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

      {/* Edit Modal */}
      <AddProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        initialData={product}
      />
    </div>
  );
}
