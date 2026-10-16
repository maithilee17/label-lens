import React from 'react';
import { PackageOpen } from 'lucide-react';

export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'There are no records matching your current filter.',
  action = null
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-sm">
        <Icon className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
