'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { fetchCollection } from '@/lib/db';
import {
  Loan,
  Repayment,
  SavingsGoal,
  Income,
  Expense,
  Budget,
  NetWorthSnapshot,
} from '@/types';
import {
  calculateEMI,
  calculateNextDueDate,
  calculateLoanCoverage,
  calculateEmergencyFundDetails,
  calculateFinancialHealthScore,
} from '@/lib/calculators';
import {
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Percent,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { differenceInDays, parseISO } from 'date-fns';

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#a855f7', '#06b6d4', '#ec4899'];

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Data State
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [nwSnapshots, setNwSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        try {
          const lData = await fetchCollection<Loan>('loans', user.uid);
          const rData = await fetchCollection<Repayment>('repayments', user.uid);
          const sData = await fetchCollection<SavingsGoal>('savingsGoals', user.uid);
          const iData = await fetchCollection<Income>('income', user.uid);
          const eData = await fetchCollection<Expense>('expenses', user.uid);
          const bData = await fetchCollection<Budget>('budgets', user.uid);
          const nwData = await fetchCollection<NetWorthSnapshot>('netWorthSnapshots', user.uid);
          
          setLoans(lData);
          setRepayments(rData);
          setSavings(sData);
          setIncomes(iData);
          setExpenses(eData);
          setBudgets(bData);
          setNwSnapshots(nwData.sort((a, b) => a.date.localeCompare(b.date)));
        } catch (error) {
          console.error('Failed to load dashboard data:', error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [user]);

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Assembling financial dashboard...</p>
        </div>
      </Shell>
    );
  }

  // 1. Core metric aggregate calculations
  const activeLoans = loans.filter((l) => l.status === 'Active');
  const totalOriginalDebt = activeLoans.reduce((sum, l) => sum + l.loanAmount, 0);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const totalEMI = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
  const totalSavings = savings.reduce((sum, s) => sum + s.currentAmount, 0);
  
  // Cash available calculation: latest snapshot cash + savings or fallback
  const latestSnapshot = nwSnapshots[nwSnapshots.length - 1];
  const cashAvailable = latestSnapshot
    ? latestSnapshot.assets.cash + latestSnapshot.assets.savings
    : totalSavings + 45000; // default simulation fallback

  const monthlyIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const monthlyExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Debt reduction percentage
  const debtReduction = totalOriginalDebt > 0 
    ? Math.round(((totalOriginalDebt - totalOutstanding) / totalOriginalDebt) * 100)
    : 0;

  // Upcoming 30-day commitments (EMIs + Fixed rent/utilities)
  const recurringExpenses = expenses
    .filter((e) => e.recurrence === 'Monthly')
    .reduce((sum, e) => sum + e.amount, 0);
  const upcomingCommitments = totalEMI + recurringExpenses;

  // Savings coverage ratio (months covered for EMIs)
  const savingsCoverageRatio = upcomingCommitments > 0
    ? Math.round((totalSavings / upcomingCommitments) * 10) / 10
    : 99;

  // Net worth calculation
  const netWorth = latestSnapshot ? latestSnapshot.netWorth : (cashAvailable + totalSavings + 500000) - totalOutstanding;

  // Next Loan Due details
  let nextLoanDue: Loan | null = null;
  let nextDueDateStr = 'N/A';
  let daysLeft = 999;

  if (activeLoans.length > 0) {
    const loanCoverages = activeLoans.map((l) => {
      const dueDateStr = calculateNextDueDate(l.dueDate, l.startDate);
      const days = differenceInDays(parseISO(dueDateStr), new Date());
      return { loan: l, dueDateStr, days };
    });
    
    // Sort by nearest days remaining
    loanCoverages.sort((a, b) => a.days - b.days);
    nextLoanDue = loanCoverages[0].loan;
    nextDueDateStr = loanCoverages[0].dueDateStr;
    daysLeft = Math.max(0, loanCoverages[0].days);
  }

  // Today's required daily savings (from coverage planner calculations)
  const dailyRequiredSavingsTotal = activeLoans.reduce((sum, l) => {
    const coverage = calculateLoanCoverage(l, repayments, cashAvailable);
    return sum + (coverage.amountRequired > 0 ? coverage.dailySavingsRequired : 0);
  }, 0);

  // Financial Health Score evaluation
  const emergencyDetails = calculateEmergencyFundDetails(totalSavings, 600000, monthlyExpense);
  const { score: healthScore, recommendations } = calculateFinancialHealthScore({
    monthlyIncome,
    monthlyExpense,
    totalDebtEMI: totalEMI,
    currentSavings: totalSavings,
    emergencyFundStatus: emergencyDetails.status,
    budgets,
  });

  // 2. Charts Data prep
  // Loan Distribution Pie Chart
  const loanPieData = activeLoans.map((l) => ({
    name: l.loanName,
    value: l.outstandingBalance,
  }));

  // Expense analysis by Category
  const expenseCatMap: Record<string, number> = {};
  expenses.forEach((e) => {
    expenseCatMap[e.category] = (expenseCatMap[e.category] || 0) + e.amount;
  });
  const expenseBarData = Object.keys(expenseCatMap).map((cat) => ({
    category: cat,
    amount: expenseCatMap[cat],
  }));

  // Monthly Net Worth Snapshots trend
  const netWorthTrendData = nwSnapshots.map((sn) => ({
    month: sn.date,
    'Net Worth': sn.netWorth,
    Assets: Object.values(sn.assets).reduce((s, a) => s + a, 0),
    Liabilities: Object.values(sn.liabilities).reduce((s, l) => s + l, 0),
  }));

  // Income vs Expenses
  const incomeVsExpenseData = [
    {
      name: 'Cash Flow',
      Income: monthlyIncome,
      Expense: monthlyExpense + totalEMI,
    },
  ];

  return (
    <Shell>
      <div className="space-y-6">
        {/* Upper Header Welcome / Tagline */}
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Command Center</h1>
            <p className="text-sm text-slate-500">Real-time indicators, debt coverage, and savings monitors.</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" onClick={() => router.push('/reports')} size="sm">
              Export Statement
            </Button>
            <Button onClick={() => router.push('/loans/add')} size="sm">
              Add New Loan
            </Button>
          </div>
        </div>

        {/* Premium Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Required Savings */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="glass-card shadow-premium relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-1 bg-brand-500 h-full" />
              <CardHeader className="pb-2">
                <CardDescription className="uppercase tracking-wider font-bold">Daily Coverage Needed</CardDescription>
                <CardTitle className="text-3xl font-extrabold text-slate-900 flex items-baseline">
                  ₹{Math.round(dailyRequiredSavingsTotal)}
                  <span className="text-xs text-slate-400 font-semibold ml-1">/ day</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500 mt-1">
                  Required daily savings rate across active loans to cover the next due EMIs safely.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Next Loan Due */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card shadow-premium relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-1 bg-amber-500 h-full" />
              <CardHeader className="pb-2">
                <CardDescription className="uppercase tracking-wider font-bold">Next EMI Due</CardDescription>
                <CardTitle className="text-xl font-bold text-slate-900 line-clamp-1">
                  {nextLoanDue ? nextLoanDue.loanName : 'None Active'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {nextLoanDue ? (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">EMI Amount:</span>
                      <span className="font-bold text-slate-800">₹{nextLoanDue.emiAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Due Date:</span>
                      <span className="font-semibold text-slate-800">{nextDueDateStr}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">All loans closed or archived.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Countdown Clock Widget */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="glass-card shadow-premium relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-1 bg-rose-500 h-full" />
              <CardHeader className="pb-2">
                <CardDescription className="uppercase tracking-wider font-bold">EMI Countdown</CardDescription>
                <CardTitle className="text-3xl font-extrabold text-slate-900 flex items-baseline">
                  {nextLoanDue ? daysLeft : 0}
                  <span className="text-xs text-slate-400 font-semibold ml-1">days remaining</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${daysLeft <= 5 ? 'bg-rose-500' : 'bg-brand-500'}`}
                    style={{ width: `${Math.max(5, Math.min(100, (daysLeft / 30) * 100))}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Health Score Widget */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card shadow-premium relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-1 bg-emerald-500 h-full" />
              <CardHeader className="pb-2">
                <CardDescription className="uppercase tracking-wider font-bold">Financial Health Score</CardDescription>
                <CardTitle className="text-3xl font-extrabold text-slate-900 flex items-baseline">
                  {healthScore}
                  <span className="text-xs text-slate-400 font-semibold ml-1">/ 100</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span className={`font-bold ${healthScore >= 80 ? 'text-emerald-600' : healthScore >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Needs Work'}
                  </span>
                </div>
                <Progress value={healthScore} indicatorColorClass={healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Dashboard 10 KPI Tiles Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Worth</span>
            <span className="text-base font-bold text-slate-900 mt-2">₹{netWorth.toLocaleString()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Cash</span>
            <span className="text-base font-bold text-slate-900 mt-2">₹{cashAvailable.toLocaleString()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Debt</span>
            <span className="text-base font-bold text-slate-900 mt-2">₹{totalOutstanding.toLocaleString()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Debt Reduction</span>
            <span className="text-base font-bold text-emerald-600 mt-2">{debtReduction}% Saved</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Savings Reserves</span>
            <span className="text-base font-bold text-slate-900 mt-2">₹{totalSavings.toLocaleString()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Income (Monthly)</span>
            <span className="text-base font-bold text-slate-900 mt-2">₹{monthlyIncome.toLocaleString()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses (Log)</span>
            <span className="text-base font-bold text-rose-500 mt-2">₹{monthlyExpense.toLocaleString()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly EMI Due</span>
            <span className="text-base font-bold text-slate-900 mt-2">₹{totalEMI.toLocaleString()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">30-Day Commit</span>
            <span className="text-base font-bold text-slate-900 mt-2">₹{upcomingCommitments.toLocaleString()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Savings Coverage</span>
            <span className="text-base font-bold text-slate-900 mt-2">{savingsCoverageRatio}x covered</span>
          </div>
        </div>

        {/* AI Assistant Insight Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start space-x-3"
        >
          <div className="p-2 bg-indigo-500 rounded-lg text-white mt-0.5 shadow-sm shadow-indigo-500/10">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-800 tracking-wide uppercase">Dashboard AI Copilot Insights</span>
            <div className="space-y-1">
              {recommendations.slice(0, 2).map((rec, i) => (
                <p key={i} className="text-xs text-indigo-700 leading-relaxed">
                  ✦ {rec}
                </p>
              ))}
              {activeLoans.length > 0 && dailyRequiredSavingsTotal > 0 && (
                <p className="text-xs text-indigo-700 leading-relaxed">
                  ✦ You require <span className="font-bold">₹{Math.round(dailyRequiredSavingsTotal)}/day</span> to cover the upcoming due EMI for your loans.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Recharts Charts Layout Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Net Worth & Assets Growth Area Chart */}
          <Card className="glass-card shadow-premium p-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Net Worth & Asset Balance Trends</CardTitle>
              <CardDescription>Visualized assets vs liabilities over the last quarters</CardDescription>
            </CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netWorthTrendData}>
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="Net Worth" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNetWorth)" />
                  <Area type="monotone" dataKey="Assets" stroke="#10b981" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="Liabilities" stroke="#ef4444" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Income vs Expenses Cash Flow */}
          <Card className="glass-card shadow-premium p-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Cash Flow Allocation Analysis</CardTitle>
              <CardDescription>Monthly income vs total outgoing commits (expenses + EMIs)</CardDescription>
            </CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeVsExpenseData} barGap={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Expense Category Log Breakdown */}
          <Card className="glass-card shadow-premium p-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Expense Structure Breakdown</CardTitle>
              <CardDescription>Itemized ledger categories and relative spending magnitudes</CardDescription>
            </CardHeader>
            <div className="h-64">
              {expenseBarData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No expense records logged this month.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                    <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Loan Outstanding Distribution */}
          <Card className="glass-card shadow-premium p-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Active Debt Distribution</CardTitle>
              <CardDescription>Outstanding loan balances split across profiles</CardDescription>
            </CardHeader>
            <div className="h-64 flex flex-col md:flex-row items-center justify-center">
              {loanPieData.length === 0 ? (
                <div className="text-xs text-slate-400">No active debt items found.</div>
              ) : (
                <>
                  <div className="w-full md:w-3/5 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={loanPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {loanPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-2/5 flex flex-col space-y-2 mt-4 md:mt-0 text-xs">
                    {loanPieData.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-slate-600 truncate">{entry.name}</span>
                        <span className="font-bold text-slate-800 ml-auto">
                          {Math.round((entry.value / totalOutstanding) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Bottom Multi-Loan Priority Widget list */}
        <Card className="glass-card shadow-premium p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Multi-Loan Priority & Due Alerts</CardTitle>
              <CardDescription>Loans sorted by urgency (Critical status and Due Date)</CardDescription>
            </div>
            <Button variant="secondary" onClick={() => router.push('/loans')} size="sm">
              Manage All Loans
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="pb-3 pl-2">Loan Details</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Interest</th>
                  <th className="pb-3">EMI Amount</th>
                  <th className="pb-3">Remaining Balance</th>
                  <th className="pb-3 pr-2 text-right">Risk Warning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {activeLoans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      No active loans logged in system.
                    </td>
                  </tr>
                ) : (
                  [...activeLoans]
                    .sort((a, b) => {
                      // Sort by priority (Critical > High > Medium > Low)
                      const priorities = { Critical: 4, High: 3, Medium: 2, Low: 1 };
                      return priorities[b.priority] - priorities[a.priority];
                    })
                    .map((l) => {
                      const coverage = calculateLoanCoverage(l, repayments, cashAvailable);
                      return (
                        <tr key={l.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5 pl-2">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{l.loanName}</span>
                              <span className="text-[10px] text-slate-400">{l.loanProvider}</span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                l.priority === 'Critical'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : l.priority === 'High'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}
                            >
                              {l.priority}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-600">{l.interestRate}% APR</td>
                          <td className="py-3.5 text-slate-900">₹{l.emiAmount.toLocaleString()}</td>
                          <td className="py-3.5 text-slate-900">₹{l.outstandingBalance.toLocaleString()}</td>
                          <td className="py-3.5 pr-2 text-right">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                coverage.riskStatus === 'Critical'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : coverage.riskStatus === 'Warning'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}
                            >
                              {coverage.riskStatus === 'Critical' && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                              {coverage.riskStatus === 'Safe' && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                              <span>{coverage.message}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
