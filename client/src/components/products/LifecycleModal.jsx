import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FolderOpen, Check, Trash2, AlertTriangle, Calendar } from 'lucide-react';

export function LifecycleModal({
  isOpen,
  onClose,
  type, // 'open' | 'consume' | 'dispose' | 'delete'
  product,
  onConfirm
}) {
  const [openedAt, setOpenedAt] = useState(() => new Date().toISOString().substring(0, 10));
  const [paoMonths, setPaoMonths] = useState(6);
  const [submitting, setSubmitting] = useState(false);

  if (!product) return null;

  const handleAction = async () => {
    setSubmitting(true);
    try {
      if (type === 'open') {
        await onConfirm({
          openedAt,
          afterOpeningDurationMonths: Number(paoMonths)
        });
      } else {
        await onConfirm();
      }
      onClose();
    } catch (err) {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  if (type === 'open') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Open Product & Start PAO Timer">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
            <FolderOpen className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Opening "{product.name}"</span> starts the Period After Opening (PAO) countdown. Reminders will recalculate to protect freshness.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Opening Date
            </label>
            <input
              type="date"
              value={openedAt}
              onChange={e => setOpenedAt(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Period After Opening (PAO) Duration (Months)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[3, 6, 12, 24].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaoMonths(m)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    paoMonths === m
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m} Months
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="60"
              value={paoMonths}
              onChange={e => setPaoMonths(e.target.value)}
              placeholder="Or enter custom months..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAction}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
            >
              {submitting ? 'Saving...' : 'Set Opening Deadline'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Consume / Dispose / Delete Confirmations
  const config = {
    consume: {
      title: 'Mark as Consumed?',
      desc: `Are you sure you want to mark "${product.name}" as consumed? It will be moved to consumed inventory and active reminders will be stopped.`,
      btnText: 'Mark Consumed',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
      icon: Check
    },
    dispose: {
      title: 'Mark as Disposed?',
      desc: `Are you sure you want to mark "${product.name}" as disposed? Active reminders will be cancelled.`,
      btnText: 'Mark Disposed',
      btnColor: 'bg-amber-600 hover:bg-amber-700',
      icon: AlertTriangle
    },
    delete: {
      title: 'Delete Product Permanently?',
      desc: `This action cannot be undone. "${product.name}" and all associated history will be permanently removed.`,
      btnText: 'Delete Product',
      btnColor: 'bg-rose-600 hover:bg-rose-700',
      icon: Trash2
    }
  }[type] || {
    title: 'Confirm Action',
    desc: 'Are you sure you wish to proceed?',
    btnText: 'Confirm',
    btnColor: 'bg-emerald-600 hover:bg-emerald-700',
    icon: Check
  };

  const Icon = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">{config.desc}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAction}
            disabled={submitting}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all ${config.btnColor}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {submitting ? 'Processing...' : config.btnText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
