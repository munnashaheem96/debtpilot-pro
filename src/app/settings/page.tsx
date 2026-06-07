'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/db';
import { Settings, ShieldCheck, Mail, MessageSquare, Save, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  
  // Settings States
  const [currency, setCurrency] = useState('INR (₹)');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(false);
  const [offlineSync, setOfflineSync] = useState(true);
  const [loading, setLoading] = useState(false);

  // Load local settings if any
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem('debtpilot_pref_currency');
      const savedEmail = localStorage.getItem('debtpilot_pref_email');
      const savedWhatsapp = localStorage.getItem('debtpilot_pref_whatsapp');
      
      if (savedCurrency) setCurrency(savedCurrency);
      if (savedEmail) setEmailAlerts(savedEmail === 'true');
      if (savedWhatsapp) setWhatsappAlerts(savedWhatsapp === 'true');
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      localStorage.setItem('debtpilot_pref_currency', currency);
      localStorage.setItem('debtpilot_pref_email', emailAlerts.toString());
      localStorage.setItem('debtpilot_pref_whatsapp', whatsappAlerts.toString());
      
      await logActivity(user.uid, 'UPDATE', 'SYSTEM', 'Updated system notification and currency settings.');
      alert('Application preferences saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Application Settings</h1>
          <p className="text-sm text-slate-500">Configure currency codes, active notifications, and sync thresholds.</p>
        </div>

        <Card className="glass-card shadow-premium p-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Currency settings */}
            <div className="space-y-4 pb-4 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase block">Localization</span>
              <Select
                label="Primary Account Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: 'INR (₹)', label: 'INR - Indian Rupee (₹)' },
                  { value: 'USD ($)', label: 'USD - United States Dollar ($)' },
                  { value: 'EUR (€)', label: 'EUR - Euro (€)' },
                  { value: 'GBP (£)', label: 'GBP - British Pound (£)' },
                ]}
              />
            </div>

            {/* Notification triggers */}
            <div className="space-y-4 pb-4 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase block">Alert Schedules</span>
              
              <div className="space-y-3">
                {/* Email alerts */}
                <button
                  type="button"
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-left text-xs font-semibold text-slate-800 transition"
                >
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Email Statement Notifications</p>
                      <p className="text-[10px] text-slate-400 font-medium">Receive weekly breakdown metrics and overdue warnings</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition ${emailAlerts ? 'bg-brand-500' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition shadow-sm ${emailAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* WhatsApp alerts */}
                <button
                  type="button"
                  onClick={() => setWhatsappAlerts(!whatsappAlerts)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-left text-xs font-semibold text-slate-800 transition"
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-5 h-5 text-slate-400 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-bold">WhatsApp Alert Triggers (Future Ready)</p>
                      <p className="text-[10px] text-slate-400 font-medium">Receive automatic messaging alerts 3 days before due EMI</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition ${whatsappAlerts ? 'bg-brand-500' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition shadow-sm ${whatsappAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>
            </div>

            {/* Offline persistence status */}
            <div className="space-y-4 pb-4 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase block">Sync Configurations</span>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>Automatic Offline Local Database Persistence</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase">
                  Active
                </span>
              </div>
            </div>

            <Button type="submit" className="w-full" isLoading={loading}>
              <Save className="w-4.5 h-4.5 mr-2" /> Save Application Preferences
            </Button>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
