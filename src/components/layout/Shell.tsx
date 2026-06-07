'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchCollection } from '@/lib/db';
import { Notification } from '@/types';
import {
  LayoutDashboard,
  CreditCard,
  Coins,
  Target,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar as CalendarIcon,
  Compass,
  Sparkles,
  FileText,
  FileSpreadsheet,
  Settings,
  User,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  category: 'core' | 'planning' | 'ledger' | 'tools' | 'user';
}

const sidebarItems: SidebarItem[] = [
  // Core
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'core' },
  { name: 'Loans', href: '/loans', icon: CreditCard, category: 'core' },
  { name: 'Repayments', href: '/repayments', icon: Coins, category: 'core' },
  // Planning & Insights
  { name: 'Coverage Planner', href: '/loan-coverage-planner', icon: Compass, category: 'planning' },
  { name: 'AI Insights', href: '/ai-insights', icon: Sparkles, category: 'planning' },
  { name: 'Budget Planner', href: '/budget-planner', icon: Wallet, category: 'planning' },
  { name: 'Savings Goals', href: '/savings-goals', icon: Target, category: 'planning' },
  // Ledger
  { name: 'Income Log', href: '/income', icon: TrendingUp, category: 'ledger' },
  { name: 'Expense Log', href: '/expenses', icon: TrendingDown, category: 'ledger' },
  // Tools
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon, category: 'tools' },
  { name: 'Analytics', href: '/analytics', icon: Zap, category: 'tools' },
  { name: 'Reports Vault', href: '/reports', icon: FileSpreadsheet, category: 'tools' },
  { name: 'Document Vault', href: '/documents', icon: FileText, category: 'tools' },
  // User
  { name: 'Profile', href: '/profile', icon: User, category: 'user' },
  { name: 'Settings', href: '/settings', icon: Settings, category: 'user' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isMockMode } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      fetchCollection<Notification>('notifications', user.uid).then((data) => {
        setNotifications(data);
      });
    }
  }, [user]);

  if (!user) return null;

  const unreadNotifications = notifications.filter((n) => !n.read);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleMarkRead = async (notifId: string) => {
    // Update local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    // Persist
    const updated = notifications.find((n) => n.id === notifId);
    if (updated) {
      const dbModule = require('@/lib/db');
      await dbModule.saveDocumentItem('notifications', {
        ...updated,
        read: true,
      });
    }
  };

  const categories = [
    { key: 'core', label: 'Core Dashboard' },
    { key: 'planning', label: 'Debt & Savings Control' },
    { key: 'ledger', label: 'Cash flow Logs' },
    { key: 'tools', label: 'Vaults & Exports' },
    { key: 'user', label: 'Personalization' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans antialiased text-slate-800">
      {/* Search Modal Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center pt-24 px-4"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 h-fit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center px-4 py-3.5 border-b border-slate-100">
                <Search className="w-5 h-5 text-slate-400 mr-3" />
                <input
                  type="text"
                  placeholder="Global search (loans, providers, amounts)..."
                  className="w-full text-slate-800 placeholder-slate-400 focus:outline-none text-base"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setShowSearch(false);
                      router.push(`/loans?search=${encodeURIComponent(searchQuery)}`);
                    }
                  }}
                />
                <button
                  onClick={() => setShowSearch(false)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 bg-slate-50 text-xs text-slate-400 flex justify-between items-center">
                <span>Press Enter to search in Loans</span>
                <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px]">ESC to Close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 glass-card h-[calc(100vh-1.5rem)] my-3 ml-3 sticky top-3 shrink-0 p-4 z-40">
        {/* Brand Logo Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-4 px-2">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">DebtPilot</span>
              <span className="text-brand-500 font-extrabold text-sm ml-1 bg-brand-50 px-1.5 py-0.5 rounded-md border border-brand-100">PRO</span>
            </div>
          </Link>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 overflow-y-auto pr-1 space-y-5">
          {categories.map((cat) => (
            <div key={cat.key} className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-3 block">
                {cat.label}
              </span>
              {sidebarItems
                .filter((item) => item.category === cat.key)
                .map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        isActive
                          ? 'bg-brand-500 text-white font-medium shadow-md shadow-brand-500/10'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        <span>{item.name}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 opacity-0 ${isActive ? 'opacity-30' : ''}`} />
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* User Card Profile Footer */}
        <div className="border-t border-slate-100 pt-4 mt-2">
          {isMockMode && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span className="text-[11px] font-medium text-amber-700">Offline Mock Mode</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 px-2">
              <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border border-slate-100">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-50 text-brand-600 font-bold text-sm">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                  {user.displayName || 'Pilot'}
                </span>
                <span className="text-[10px] text-slate-400 line-clamp-1">{user.email}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/70 backdrop-blur sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg focus:outline-none"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            
            {/* Quick Search trigger */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400 hover:bg-slate-100 hover:border-slate-300 w-44 md:w-64 transition duration-200"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span className="text-left flex-1">Search everything...</span>
            </button>
          </div>

          <div className="flex items-center space-x-3.5">
            {/* Interactive AI Insights Pill */}
            <Link
              href="/ai-insights"
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg text-xs font-semibold text-indigo-700 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse-soft" />
              <span>AI Health Score: Active</span>
            </Link>

            {/* Notification alert bell dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2.5 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="font-bold text-xs text-slate-700">Recent Alerts</span>
                        <span className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded font-bold">
                          {unreadNotifications.length} Unread
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            No notifications available.
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-3 text-xs transition-colors hover:bg-slate-50 flex items-start space-x-2 ${
                                !notif.read ? 'bg-indigo-50/20' : ''
                              }`}
                            >
                              <div className="flex-1">
                                <p className={`text-slate-700 ${!notif.read ? 'font-medium' : ''}`}>
                                  {notif.message}
                                </p>
                                <span className="text-[9px] text-slate-400 block mt-1">
                                  {new Date(notif.date).toLocaleDateString()}
                                </span>
                              </div>
                              {!notif.read && (
                                <button
                                  onClick={() => handleMarkRead(notif.id)}
                                  className="text-[9px] text-brand-500 font-bold hover:underline shrink-0"
                                >
                                  Read
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      <div className="border-t border-slate-100 bg-slate-50 text-center py-1.5">
                        <Link
                          href="/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold block"
                        >
                          View all notifications
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <div className="w-px h-6 bg-slate-200 hidden md:block" />

            {/* Header User Profile details */}
            <Link href="/profile" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                ) : (
                  user.displayName?.charAt(0) || 'P'
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Drawer for Mobile */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0.15 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 p-4 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 px-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow">
                    <Compass className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="font-bold text-slate-900 tracking-tight text-base">DebtPilot</span>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto space-y-4 pr-1">
                {categories.map((cat) => (
                  <div key={cat.key} className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase px-2 block">
                      {cat.label}
                    </span>
                    {sidebarItems
                      .filter((item) => item.category === cat.key)
                      .map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm ${
                              isActive
                                ? 'bg-brand-500 text-white font-medium'
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                  </div>
                ))}
              </nav>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-700 text-xs">
                      {user.displayName?.charAt(0) || 'P'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-800 line-clamp-1">{user.displayName}</span>
                      <span className="text-[9px] text-slate-400 line-clamp-1">{user.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
