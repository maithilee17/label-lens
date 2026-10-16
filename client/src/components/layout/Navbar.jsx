import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Bell, Scan, LogOut, Menu, X, ShieldCheck } from 'lucide-react';

export function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await api.get('/notifications?unreadOnly=true&limit=1');
        if (res.data.success) {
          setUnreadCount(res.data.unreadCount || 0);
        }
      } catch (err) {
        // silent fail
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                Label<span className="text-emerald-600">Lens</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Scan. Verify. Track.
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/scan"
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Scan className="w-4 h-4" />
            Scan Product
          </Link>

          <Link
            to="/notifications"
            className="relative p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-700 max-w-[120px] truncate">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
