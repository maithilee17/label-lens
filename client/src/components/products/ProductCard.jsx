import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../common/StatusBadge';
import {
  Calendar,
  Clock,
  Sparkles,
  MoreVertical,
  Check,
  Trash2,
  Eye,
  Edit,
  FolderOpen
} from 'lucide-react';

export function ProductCard({ product, onOpen, onConsume, onDispose, onEdit, onDelete }) {
  const deadline = product.applicableDeadline?.date
    ? new Date(product.applicableDeadline.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: product.printedExpiryDatePrecision === 'month' ? undefined : 'numeric'
      })
    : 'Unknown';

  const mfgFormatted = product.manufacturingDate
    ? new Date(product.manufacturingDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: product.manufacturingDatePrecision === 'month' ? undefined : 'numeric'
      })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      <div>
        {/* Top Image or Avatar Header */}
        <div className="relative h-44 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
          {product.imagePath ? (
            <img
              src={product.imagePath}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="text-slate-300 flex flex-col items-center">
              <Calendar className="w-12 h-12 stroke-[1.2]" />
              <span className="text-xs font-semibold text-slate-400 mt-2">No Label Photo</span>
            </div>
          )}

          <div className="absolute top-3 right-3 flex gap-1.5">
            <StatusBadge type="expiry" value={product.expiryStatus} />
          </div>

          <div className="absolute top-3 left-3">
            <StatusBadge type="category" value={product.category} />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3">
          <div>
            {product.brand && (
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">
                {product.brand}
              </span>
            )}
            <h3 className="text-base font-bold text-slate-900 line-clamp-1" title={product.name}>
              {product.name}
            </h3>
          </div>

          {/* Date Highlights */}
          <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Expiry Deadline:
              </span>
              <span className="font-bold text-slate-900">{deadline}</span>
            </div>

            {mfgFormatted && (
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Mfg Date:</span>
                <span>{mfgFormatted}</span>
              </div>
            )}

            {product.openedAt && (
              <div className="flex items-center justify-between text-[11px] text-blue-600 font-medium">
                <span>Opened:</span>
                <span>
                  {new Date(product.openedAt).toLocaleDateString()} ({product.afterOpeningDurationMonths}M PAO)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <StatusBadge type="lifecycle" value={product.lifecycleStatus} />
            <span className="text-[11px] text-slate-400 capitalize">
              Source: {product.dateSource?.replace('_', ' ') || 'Manual'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link
          to={`/products/${product._id}`}
          className="text-xs font-semibold text-slate-600 hover:text-emerald-600 flex items-center gap-1 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> Details
        </Link>

        <div className="flex items-center gap-1">
          {product.lifecycleStatus === 'active' && !product.openedAt && (
            <button
              onClick={() => onOpen(product)}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Open Product (Start PAO)"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          )}

          {product.lifecycleStatus === 'active' && (
            <button
              onClick={() => onConsume(product)}
              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Mark Consumed"
            >
              <Check className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onEdit(product)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Edit Details"
          >
            <Edit className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(product)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete Product"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
