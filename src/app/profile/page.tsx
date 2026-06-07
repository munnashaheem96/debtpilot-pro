'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { fetchCollection, logActivity } from '@/lib/db';
import { ActivityLog } from '@/types';
import { User, ShieldCheck, Mail, Clock, Activity, Edit3 } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfileName, isMockMode } = useAuth();
  
  const [name, setName] = useState('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      fetchCollection<ActivityLog>('activityLogs', user.uid).then((data) => {
        setLogs(data.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      });
    }
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setUpdating(true);
    try {
      await updateProfileName(name.trim());
      await logActivity(user.uid, 'UPDATE', 'SYSTEM', `Changed user profile nickname to: ${name}.`);
      alert('Nickname updated successfully!');
    } catch (error) {
      console.error(error);
      alert('Error updating profile.');
    } finally {
      setUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Account</h1>
          <p className="text-sm text-slate-500">Manage profile data settings and review recent audit events.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* User profile card */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card shadow-premium p-5 text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-brand-600 text-3xl mb-3">
                {user.displayName?.charAt(0) || 'P'}
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{user.displayName}</h3>
              <span className="text-xs text-slate-400 font-medium block mt-1">{user.email}</span>

              <div className="w-full border-t border-slate-100 pt-4 mt-4 text-xs font-semibold text-slate-600 space-y-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Session mode: {isMockMode ? 'Offline Mock' : 'Firebase Prod'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Registered: {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>

            {/* Form to update name */}
            <Card className="glass-card shadow-premium p-5">
              <CardHeader className="p-0 pb-3 border-b border-slate-100 mb-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Update Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleUpdateName} className="space-y-4">
                  <Input
                    label="Display Nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full" isLoading={updating}>
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Audit Logs list */}
          <div className="lg:col-span-2">
            <Card className="glass-card shadow-premium p-6">
              <CardHeader className="p-0 pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                  <Activity className="w-4.5 h-4.5 mr-2 text-brand-500" /> Recent Audit Activity
                </CardTitle>
                <CardDescription>Chronological logging of structural actions performed</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-4 max-h-[70vh] overflow-y-auto space-y-4 pr-1">
                {logs.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 font-semibold">
                    No activity logs recorded.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border border-slate-100 bg-white text-xs font-semibold flex justify-between items-start"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          [{log.actionType}] - {log.entityType}
                        </span>
                        <span className="text-slate-700 font-medium block">{log.message}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
