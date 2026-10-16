import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../common/StatusBadge';
import { Eye, Edit, Trash2, FolderOpen, Check, Calendar } from 'lucide-react';

export function ProductTable({ products, onOpen, onConsume, onDispose, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-3.5 px-4">Product</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Expiry Status</th>
              <th className="py-3.5 px-4">Deadline</th>
              <th className="py-3.5 px-4">Lifecycle</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => {
              const deadline = p.applicableDeadline?.date
                ? new Date(p.applicableDeadline.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: p.printedExpiryDatePrecision === 'month' ? undefined : 'numeric'
                  })
                : 'Unknown';

              return (
                <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                        {p.imagePath ? (
                          <img src={p.imagePath} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Calendar className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 line-clamp-1">{p.name}</div>
                        {p.brand && <div className="text-xs text-slate-400">{p.brand}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge type="category" value={p.category} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge type="expiry" value={p.expiryStatus} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{deadline}</div>
                    <div className="text-[11px] text-slate-400 capitalize">
                      {p.printedExpiryDatePrecision || 'unknown'} precision
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge type="lifecycle" value={p.lifecycleStatus} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/products/${p._id}`}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Details & History"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {p.lifecycleStatus === 'active' && !p.openedAt && (
                        <button
                          onClick={() => onOpen(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Open Product"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                      )}

                      {p.lifecycleStatus === 'active' && (
                        <button
                          onClick={() => onConsume(p)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Mark Consumed"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDelete(p)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
