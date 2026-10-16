import React from 'react';

export function LoadingSkeleton({ count = 3, type = 'card' }) {
  if (type === 'table') {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-200 rounded-lg w-full"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-slate-200 rounded-xl"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="h-8 bg-slate-200 rounded w-full"></div>
        </div>
      ))}
    </div>
  );
}
