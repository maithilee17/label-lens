import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Scan,
  PackageCheck,
  Bell,
  Settings,
  X,
  HelpCircle
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Scan Product', path: '/scan', icon: Scan },
  { name: 'My Products', path: '/products', icon: PackageCheck },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Settings', path: '/settings', icon: Settings }
];

export function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 lg:hidden">
          <span className="text-sm font-bold text-slate-800">Navigation Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Inventory & Scanner
          </div>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60 shadow-sm shadow-emerald-500/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-emerald-600 stroke-[2.2]' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        <div className="p-4 m-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>Zero Guesswork</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            LabelLens never invents dates. Uncertain scans always request your confirmation before saving.
          </p>
        </div>
      </aside>
    </>
  );
}
