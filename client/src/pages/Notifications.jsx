import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import {
  Bell,
  CheckCheck,
  Check,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Calendar
} from 'lucide-react';

export function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const toast = useToast();

  const fetchNotifications = async () => {
    try {
      const res = await api.get(`/notifications?unreadOnly=${filterUnread}`);
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filterUnread]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      if (res.data.success) {
        setNotifications(prev =>
          prev.map(n => (n._id === id ? { ...n, readAt: new Date() } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        toast.success('Marked as read.');
      }
    } catch (err) {
      toast.error('Failed to update notification.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date() })));
        setUnreadCount(0);
        toast.success('All notifications marked as read.');
      }
    } catch (err) {
      toast.error('Failed to update notifications.');
    }
  };

  // Demo / Technical Evaluation Trigger
  const handleTriggerEvaluation = async () => {
    setEvaluating(true);
    try {
      const res = await api.post('/notifications/trigger-check', {});
      if (res.data.success) {
        toast.success(
          `Reminder evaluation finished! Created: ${res.data.results.createdNotifications}, Duplicates skipped: ${res.data.results.skippedDuplicates}`
        );
        fetchNotifications();
      }
    } catch (err) {
      toast.error('Failed to trigger reminder check.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Personalized expiry alerts, advance warnings, and after-opening reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              Mark All as Read
            </button>
          )}

          <button
            onClick={handleTriggerEvaluation}
            disabled={evaluating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-sm disabled:opacity-50"
            title="Evaluate reminder rules on-demand (Development / Test only)"
          >
            <Sparkles className={`w-4 h-4 text-emerald-600 ${evaluating ? 'animate-spin' : ''}`} />
            {evaluating ? 'Checking...' : 'Run Reminder Check (Test Evaluation)'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilterUnread(false)}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            !filterUnread
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => setFilterUnread(true)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            filterUnread
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Unread Only</span>
          {unreadCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterUnread ? 'bg-white text-emerald-800' : 'bg-rose-500 text-white'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={
            filterUnread
              ? 'You have read all your notifications!'
              : 'No alerts have been generated yet. Keep tracking products to receive timely reminders.'
          }
        />
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => {
            const isUnread = !notif.readAt;
            let iconBg = 'bg-blue-100 text-blue-700';
            if (notif.type === 'expired') iconBg = 'bg-rose-100 text-rose-700';
            if (notif.type === 'expiry_warning' || notif.type === 'after_opening_warning')
              iconBg = 'bg-amber-100 text-amber-700';

            return (
              <div
                key={notif._id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  isUnread
                    ? 'bg-white border-emerald-200 shadow-sm shadow-emerald-500/5'
                    : 'bg-white/60 border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}
                  >
                    <Bell className="w-4 h-4 stroke-[2.2]" />
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                      <span>• Channel: {notif.channel}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {notif.productId && (
                    <Link
                      to={`/products/${notif.productId._id || notif.productId}`}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors"
                      title="View Product Details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}

                  {isUnread && (
                    <button
                      onClick={() => handleMarkAsRead(notif._id)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors"
                      title="Mark as Read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
