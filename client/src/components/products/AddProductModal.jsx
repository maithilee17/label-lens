import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { PlusCircle, Calendar, Save } from 'lucide-react';

export function AddProductModal({ isOpen, onClose, onSave, initialData = null }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'food_beverage',
    brand: '',
    printedExpiryDate: '',
    printedExpiryDatePrecision: 'day',
    manufacturingDate: '',
    manufacturingDatePrecision: 'day',
    shelfLifeMonths: '',
    notes: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || 'food_beverage',
        brand: initialData.brand || '',
        printedExpiryDate: initialData.printedExpiryDate
          ? new Date(initialData.printedExpiryDate).toISOString().substring(0, 10)
          : '',
        printedExpiryDatePrecision: initialData.printedExpiryDatePrecision || 'day',
        manufacturingDate: initialData.manufacturingDate
          ? new Date(initialData.manufacturingDate).toISOString().substring(0, 10)
          : '',
        manufacturingDatePrecision: initialData.manufacturingDatePrecision || 'day',
        shelfLifeMonths: initialData.shelfLifeMonths || '',
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        name: '',
        category: 'food_beverage',
        brand: '',
        printedExpiryDate: '',
        printedExpiryDatePrecision: 'day',
        manufacturingDate: '',
        manufacturingDatePrecision: 'day',
        shelfLifeMonths: '',
        notes: ''
      });
    }
    setError('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Product name is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Product Details' : 'Add Product Manually'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Greek Yogurt, Retinol Serum, Ibuprofen..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="food_beverage">Food & Beverage</option>
              <option value="skincare">Skincare</option>
              <option value="makeup_cosmetics">Makeup & Cosmetics</option>
              <option value="medicine">Medicine</option>
              <option value="household">Household</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Brand (Optional)
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={e => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g. Nestlé, CeraVe, Tylenol"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Printed Expiry Date
            </label>
            <input
              type="date"
              value={formData.printedExpiryDate}
              onChange={e => setFormData({ ...formData, printedExpiryDate: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Expiry Date Precision
            </label>
            <select
              value={formData.printedExpiryDatePrecision}
              onChange={e => setFormData({ ...formData, printedExpiryDatePrecision: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="day">Day Precision (DD/MM/YYYY)</option>
              <option value="month">Month Precision (MM/YYYY)</option>
              <option value="year">Year Precision (YYYY)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Manufacturing Date (Optional)
            </label>
            <input
              type="date"
              value={formData.manufacturingDate}
              onChange={e => setFormData({ ...formData, manufacturingDate: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Shelf Life Duration (Months)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={formData.shelfLifeMonths}
              onChange={e => setFormData({ ...formData, shelfLifeMonths: e.target.value })}
              placeholder="e.g. 12, 24"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Storage location, instructions, batch number..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : initialData ? 'Save Changes' : 'Add to Inventory'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
