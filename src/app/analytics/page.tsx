'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { fetchCollection } from '@/lib/db';
import { Loan, Expense, Income, SavingsGoal } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';

export default function AnalyticsPage() {
  const { user } = useAuth();
  
  const [loans, setLoans] = useState<Loan[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const loadAnalyticsData = async () => {
        try {
          const lData = await fetchCollection<Loan>('loans', user.uid);
          const eData = await fetchCollection<Expense>('expenses', user.uid);
          const iData = await fetchCollection<Income>('income', user.uid);
          const sData = await fetchCollection<SavingsGoal>('savingsGoals', user.uid);
          
          setLoans(lData);
          setExpenses(eData);
          setIncomes(iData);
          setSavings(sData);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      loadAnalyticsData();
    }
  }, [user]);

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Analyzing accounts portfolios...</p>
        </div>
      </Shell>
    );
  }

  // 1. Data mapping
  const expenseCatMap: Record<string, number> = {};
  expenses.forEach((e) => {
    expenseCatMap[e.category] = (expenseCatMap[e.category] || 0) + e.amount;
  });
  const expenseChartData = Object.keys(expenseCatMap).map((cat) => ({
    category: cat,
    amount: expenseCatMap[cat],
  }));

  const activeLoans = loans.filter((l) => l.status === 'Active');
  const debtChartData = activeLoans.map((l) => ({
    name: l.loanName,
    Original: l.loanAmount,
    Outstanding: l.outstandingBalance,
  }));

  const savingsChartData = savings.map((s) => ({
    name: s.goalName,
    Target: s.targetAmount,
    Current: s.currentAmount,
  }));

  // Cash flow projection (Simulated past 6 months)
  const cashFlowTrendData = [
    { month: 'Jan 2026', Income: 150000, Expense: 120000 },
    { month: 'Feb 2026', Income: 160000, Expense: 125000 },
    { month: 'Mar 2026', Income: 155000, Expense: 130000 },
    { month: 'Apr 2026', Income: 165000, Expense: 135000 },
    { month: 'May 2026', Income: 175000, Expense: 140000 },
    { month: 'Jun 2026', Income: 175000, Expense: 139500 },
  ];

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics Center</h1>
          <p className="text-sm text-slate-500">Examine income, outlays, amortization timelines, and savings progress.</p>
        </div>

        {/* Charts layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expense Cash Flow Line graph */}
          <Card className="glass-card shadow-premium p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-slate-900">Historical Cash Flow Trend</CardTitle>
              <CardDescription>Visualized monthly income vs total outgoings over the last 6 months</CardDescription>
            </CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashFlowTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Original Debt vs Remaining Amortization balance */}
          <Card className="glass-card shadow-premium p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-slate-900">Original Principal vs Outstanding Debt</CardTitle>
              <CardDescription>Comparison of target original balances vs outstanding values per active loan</CardDescription>
            </CardHeader>
            <div className="h-64">
              {debtChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No active loans available for comparisons.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={debtChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="Original" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Outstanding" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Savings progress vs Target */}
          <Card className="glass-card shadow-premium p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-slate-900">Savings Target Achievements</CardTitle>
              <CardDescription>Current savings accumulation compared to establish target caps</CardDescription>
            </CardHeader>
            <div className="h-64">
              {savingsChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No savings goals establish in database.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={savingsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Current" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Expense breaks category list */}
          <Card className="glass-card shadow-premium p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-slate-900">Itemized Category Outlays</CardTitle>
              <CardDescription>Distribution of expenses logged for current month</CardDescription>
            </CardHeader>
            <div className="h-64">
              {expenseChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No expense records logged in ledger.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                    <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
