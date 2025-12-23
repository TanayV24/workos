import React, { useEffect, useState } from 'react';
import { Trash2, CheckCircle, AlertCircle, Loader, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { notificationRest } from '@/services/api';
import type { Notification } from '@/types/workos';

type Flash = { type: 'success' | 'error'; text: string };

const NOTIFICATION_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
  },
  success: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
  },
  warning: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
  },
};

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | Notification['type']>('all');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  useEffect(() => {
    loadNotifications();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (autoRefreshEnabled) {
        loadNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, filterType]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationRest.getNotifications(1, 50);
      const data = response.data || response;
      const notifList = Array.isArray(data) ? data : data.results || [];

      setNotifications(notifList);

      // Count unread
      const unread = notifList.filter((n: Notification) => !n.read).length;
      setUnreadCount(unread);
    } catch (err: any) {
      console.error('Failed to load notifications', err);
      setFlash({ type: 'error', text: 'Failed to load notifications' });
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((n) => n.type === filterType);
    }

    setFilteredNotifications(filtered);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationRest.markNotificationAsRead(notificationId);
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setFlash({ type: 'success', text: 'Marked as read' });
      setTimeout(() => setFlash(null), 2000);
    } catch (err) {
      console.error('Failed to mark as read', err);
      setFlash({ type: 'error', text: 'Failed to update notification' });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationRest.markAllNotificationsAsRead();
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setFlash({ type: 'success', text: 'Marked all as read' });
      setTimeout(() => setFlash(null), 2000);
    } catch (err) {
      console.error('Failed to mark all as read', err);
      setFlash({ type: 'error', text: 'Failed to update notifications' });
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationRest.deleteNotification(notificationId);
      setNotifications(notifications.filter((n) => n.id !== notificationId));
      setFlash({ type: 'success', text: 'Notification deleted' });
      setTimeout(() => setFlash(null), 2000);
    } catch (err) {
      console.error('Failed to delete notification', err);
      setFlash({ type: 'error', text: 'Failed to delete notification' });
    }
  };

  const getTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    return `${Math.floor(secondsAgo / 86400)}d ago`;
  };

  if (loading && notifications.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                Mark all as read
              </button>
            )}
            <button
              onClick={loadNotifications}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Flash Messages */}
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 p-4 mb-6 rounded-lg border ${
              flash.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {flash.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{flash.text}</span>
          </motion.div>
        )}

        {/* Filter & Search */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All types</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>

          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={autoRefreshEnabled}
              onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Auto-refresh</span>
          </label>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {notifications.length === 0
                    ? 'No notifications yet'
                    : 'No notifications match your filters'}
                </p>
              </motion.div>
            ) : (
              filteredNotifications.map((notification) => {
                const colors = NOTIFICATION_COLORS[notification.type];
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      colors.bg
                    } ${notification.read ? 'opacity-75' : 'shadow-md border-blue-200'}`}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {colors.icon}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${colors.text}`}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full" />
                            )}
                          </div>
                          <p className={`text-sm ${colors.text} mt-1`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {getTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="text-gray-400 hover:text-red-600 ml-4"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Loading indicator during auto-refresh */}
        {loading && notifications.length > 0 && (
          <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
            <Loader className="w-4 h-4 animate-spin mr-2" />
            Updating...
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;