import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import {
  User,
  Lock,
  Globe,
  Bell,
  Mail,
  Shield,
  Save,
  LogOut,
  AlertCircle
} from 'lucide-react';

const COMMON_TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney'
];

export function Settings() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();

  // Profile and Preferences form
  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [reminderDaysBefore, setReminderDaysBefore] = useState(user?.reminderDaysBefore || 2);
  const [expiryDayReminderEnabled, setExpiryDayReminderEnabled] = useState(
    user?.expiryDayReminderEnabled !== false
  );
  const [afterOpeningReminderEnabled, setAfterOpeningReminderEnabled] = useState(
    user?.afterOpeningReminderEnabled !== false
  );
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(
    Boolean(user?.emailNotificationsEnabled)
  );

  const [savingProfile, setSavingProfile] = useState(false);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.patch('/auth/profile', {
        name,
        timezone,
        reminderDaysBefore: Number(reminderDaysBefore),
        expiryDayReminderEnabled,
        afterOpeningReminderEnabled,
        emailNotificationsEnabled
      });

      if (res.data.success) {
        updateUser(res.data.user);
        toast.success('Preferences updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update preferences.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.patch('/auth/password', {
        currentPassword,
        newPassword
      });

      if (res.data.success) {
        toast.success('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Account & Notification Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Customize your reminder schedule, timezone, and security settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Profile & Notification Preferences */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Notification & Timezone Preferences</h2>
              <p className="text-xs text-slate-400">Configure how and when LabelLens reminds you.</p>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Timezone
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {COMMON_TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Advance Reminder ({reminderDaysBefore} Days Before Expiry)
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={reminderDaysBefore}
                  onChange={e => setReminderDaysBefore(e.target.value)}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-3"
                />
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={expiryDayReminderEnabled}
                  onChange={e => setExpiryDayReminderEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Expiry-Day Alert</div>
                  <div className="text-[11px] text-slate-400">
                    Receive an alert on the exact calendar day a product reaches its deadline.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={afterOpeningReminderEnabled}
                  onChange={e => setAfterOpeningReminderEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">After-Opening (PAO) Reminders</div>
                  <div className="text-[11px] text-slate-400">
                    Receive notifications before products degrade after unsealing or opening.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotificationsEnabled}
                  onChange={e => setEmailNotificationsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Email Notifications (When Configured)</div>
                  <div className="text-[11px] text-slate-400">
                    Send copies of critical expiry reminders to your registered email address.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingProfile ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>

        {/* Password Change Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-400">Ensure your account uses a secure password.</p>
            </div>
          </div>

          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="min. 8 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                <Shield className="w-3.5 h-3.5" />
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
