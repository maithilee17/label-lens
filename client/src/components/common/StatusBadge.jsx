import React from 'react';

export function StatusBadge({ type, value }) {
  if (!value) return null;

  // Expiry Status
  if (type === 'expiry') {
    switch (value) {
      case 'fresh':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Fresh
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500 animate-ping"></span>
            Expiring Soon
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-500"></span>
            Expired
          </span>
        );
      case 'unknown':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-slate-400"></span>
            Unknown
          </span>
        );
    }
  }

  // Lifecycle Status
  if (type === 'lifecycle') {
    switch (value) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Active
          </span>
        );
      case 'consumed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Consumed
          </span>
        );
      case 'disposed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
            Disposed
          </span>
        );
      default:
        return null;
    }
  }

  // Category Badge
  if (type === 'category') {
    const labels = {
      food_beverage: 'Food & Beverage',
      skincare: 'Skincare',
      makeup_cosmetics: 'Makeup & Cosmetics',
      medicine: 'Medicine',
      household: 'Household',
      other: 'Other'
    };
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
        {labels[value] || value}
      </span>
    );
  }

  // Verification Status
  if (type === 'verification') {
    switch (value) {
      case 'clear_candidate':
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
            Verified
          </span>
        );
      case 'conflicting_dates':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
            Conflicting Dates
          </span>
        );
      case 'poor_image_quality':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
            Poor Image Quality
          </span>
        );
      case 'no_date_found':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            No Date Found
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
            Needs Verification
          </span>
        );
    }
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
      {value}
    </span>
  );
}
