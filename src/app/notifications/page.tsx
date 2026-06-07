'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchCollection, saveDocumentItem, deleteDocumentItem } from '@/lib/db';
import { Notification } from '@/types';
import { Bell, Trash2, CheckCircle, ShieldCheck, MailOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function NotificationsPage() {
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCollection<Notification>('notifications', user.uid).then((data) => {
        setNotifications(data.sort((a, b) => b.date.localeCompare(a.date)));
        setLoading(false);
      });
    }
  }, [user]);

  const handleMarkRead = async (notif: Notification) => {
    if (!user) return;
    const updated: Notification = { ...notif, read: true };
    await saveDocumentItem('notifications', updated);
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? updated : n)));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    const promises = unread.map((n) => {
      const updated = { ...n, read: true };
      return saveDocumentItem('notifications', updated);
    });

    await Promise.all(promises);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = async (notifId: string) => {
    if (!user) return;
    await deleteDocumentItem('notifications', user.uid, notifId);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Loading notifications desk...</p>
        </div>
      </Shell>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
            <p className="text-sm text-slate-500">Monitor upcoming EMI alerts, budget alarms, and milestones.</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="secondary" onClick={handleMarkAllRead} size="sm">
              <MailOpen className="w-4 h-4 mr-2" /> Mark All Read
            </Button>
          )}
        </div>

        <Card className="glass-card shadow-premium p-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900">Notifications Feed</CardTitle>
            <span className="text-xs bg-indigo-50 border border-indigo-100 font-bold text-indigo-700 px-2 py-0.5 rounded-full">
              {unreadCount} Unread
            </span>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 font-semibold flex flex-col items-center justify-center">
                <Bell className="w-8 h-8 text-slate-300 mb-2 animate-bounce" />
                <span>No alerts registered in feed.</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`py-3.5 flex items-start justify-between space-x-4 transition ${
                    !notif.read ? 'bg-indigo-50/10' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <p className={`text-xs text-slate-700 font-semibold ${!notif.read ? 'text-slate-900 font-extrabold' : ''}`}>
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-slate-400 block font-medium">
                      {new Date(notif.date).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkRead(notif)}
                        className="text-[10px] text-brand-500 hover:text-brand-600 font-bold"
                      >
                        Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
