'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchCollection } from '@/lib/db';
import { Loan, Repayment } from '@/types';
import { calculateLoanCoverage, calculateNextDueDate } from '@/lib/calculators';
import { Compass, AlertTriangle, ShieldCheck, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { differenceInDays, parseISO, format, addMonths } from 'date-fns';

export default function LoanCoveragePlanner() {
  const { user } = useAuth();
  
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom inputs for sliders
  const [cashAvailable, setCashAvailable] = useState<number>(50000);

  useEffect(() => {
    if (user) {
      const loadCoverageData = async () => {
        try {
          const lData = await fetchCollection<Loan>('loans', user.uid);
          const rData = await fetchCollection<Repayment>('repayments', user.uid);
          
          setLoans(lData);
          setRepayments(rData);

          // Get default cash available from savings total
          const sData = await fetchCollection<any>('savingsGoals', user.uid);
          const totalSaved = sData.reduce((sum: number, s: any) => sum + s.currentAmount, 0);
          setCashAvailable(totalSaved + 45000); // simulated default cash
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      loadCoverageData();
    }
  }, [user]);

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Running coverage planner engine...</p>
        </div>
      </Shell>
    );
  }

  const activeLoans = loans.filter((l) => l.status === 'Active');

  // Compute coverage details per loan
  const coverages = activeLoans.map((l) => {
    return calculateLoanCoverage(l, repayments, cashAvailable);
  });

  // Timeline coverage checker (Simulating cascading cash depletion)
  // Sort coverages by nearest due date
  const sortedCoverages = [...coverages].sort((a, b) => a.daysRemaining - b.daysRemaining);
  
  let runningCash = cashAvailable;
  const timelineLogs = sortedCoverages.map((cov) => {
    const loanMatched = activeLoans.find((l) => l.id === cov.loanId)!;
    const amountToCover = cov.amountRequired;
    const isCovered = runningCash >= amountToCover;
    const shortfall = isCovered ? 0 : amountToCover - runningCash;
    
    // Deplete cash
    runningCash = Math.max(0, runningCash - amountToCover);

    return {
      id: cov.loanId,
      loanName: cov.loanName,
      dueDate: cov.nextDueDate,
      emiAmount: cov.emiAmount,
      amountToCover,
      daysRemaining: cov.daysRemaining,
      isCovered,
      shortfall,
    };
  });

  // Calculate required savings sum
  const totalDailySavingsRequired = coverages.reduce((sum, cov) => sum + (cov.amountRequired > 0 ? cov.dailySavingsRequired : 0), 0);
  const totalWeeklySavingsRequired = coverages.reduce((sum, cov) => sum + (cov.amountRequired > 0 ? cov.weeklySavingsRequired : 0), 0);
  const totalShortfall = timelineLogs.reduce((sum, log) => sum + log.shortfall, 0);

  // Payoff projections dataset (Declining Outstanding Balance projections for the next 24 months)
  const projectionData = [];
  const startD = new Date();
  let currentBalance = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  let monthlyEMICollected = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
  
  // Simple amortization payoff projection
  for (let i = 0; i <= 24; i++) {
    const projDateStr = format(addMonths(startD, i), 'MMM yyyy');
    projectionData.push({
      month: projDateStr,
      'Debt Outstanding': Math.round(currentBalance),
    });

    // Pay down balance
    // Assume average interest rate of 10%
    const monthlyInterest = (currentBalance * 0.1) / 12;
    const principalPaid = Math.max(0, monthlyEMICollected - monthlyInterest);
    currentBalance = Math.max(0, currentBalance - principalPaid);
    
    if (currentBalance <= 0) {
      // Add final month and break
      projectionData.push({
        month: format(addMonths(startD, i + 1), 'MMM yyyy'),
        'Debt Outstanding': 0,
      });
      break;
    }
  }

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Loan Coverage Planner</h1>
            <p className="text-sm text-slate-500">
              Unique savings calculator that maps cash reserves against upcoming loan EMIs.
            </p>
          </div>
        </div>

        {/* Dynamic Simulation Slider */}
        <Card className="glass-card shadow-premium p-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100">
            <CardTitle className="text-sm uppercase tracking-wider font-bold text-slate-400">Simulation Variables</CardTitle>
            <CardDescription>Adjust current liquid reserves to run shortfall scenarios</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-semibold">
                <label className="text-slate-600 font-medium">Liquid Cash Available (Simulated):</label>
                <span className="text-brand-500 font-extrabold text-lg">₹{cashAvailable.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(100000, cashAvailable * 2)}
                step="1000"
                value={cashAvailable}
                onChange={(e) => setCashAvailable(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <div className="grid grid-cols-3 gap-4 text-center text-xs font-semibold pt-2">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[9px] uppercase font-medium">Daily Savings Needed</span>
                  <span className="text-slate-800 text-sm font-extrabold">₹{Math.round(totalDailySavingsRequired)}/day</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[9px] uppercase font-medium">Weekly Savings Needed</span>
                  <span className="text-slate-800 text-sm font-extrabold">₹{Math.round(totalWeeklySavingsRequired)}/week</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[9px] uppercase font-medium">Expected Shortfall</span>
                  <span className={`text-sm font-extrabold ${totalShortfall > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    ₹{totalShortfall.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Repayment timelines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="glass-card shadow-premium p-6">
              <CardHeader className="p-0 pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900">EMI Cascading Timeline</CardTitle>
                <CardDescription>Order in which cash is depleted to cover nearest EMIs</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <div className="relative border-l border-slate-100 ml-4 pl-6 space-y-6">
                  {timelineLogs.map((log) => (
                    <div key={log.id} className="relative">
                      {/* Timeline dot status indicator */}
                      <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                        log.isCovered
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-rose-50 border-rose-200 text-rose-600'
                      }`}>
                        {log.isCovered ? '✓' : '!'}
                      </span>
                      <div className="flex flex-col md:flex-row justify-between md:items-center space-y-1 md:space-y-0">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">{log.dueDate}</span>
                          <span className="text-sm font-bold text-slate-800">{log.loanName}</span>
                        </div>
                        <div className="text-right text-xs font-semibold">
                          <span className="text-slate-400 font-medium">Required: ₹{log.amountToCover.toLocaleString()}</span>
                          {log.isCovered ? (
                            <span className="text-emerald-600 block text-[10px] font-bold">Safe - Cash covers installment</span>
                          ) : (
                            <span className="text-rose-500 block text-[10px] font-bold">
                              Shortfall Expected: ₹{log.shortfall.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {timelineLogs.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                      No active loans available for timeline generation.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Risk Summary side panel */}
          <div className="space-y-4">
            <Card className="glass-card shadow-premium p-5 border border-indigo-100 bg-indigo-50/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full filter blur-xl" />
              <CardHeader className="p-0 pb-3 border-b border-indigo-100/50 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center">
                  <Sparkles className="w-4 h-4 text-indigo-500 mr-1.5 animate-pulse" /> Coverage Advisor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-4 space-y-3.5 text-xs text-slate-600 font-semibold">
                {totalShortfall > 0 ? (
                  <div className="p-3 bg-white rounded-lg border border-rose-100 flex items-start space-x-2 text-rose-700">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-500" />
                    <div className="space-y-1">
                      <p className="font-bold">Shortfall Flagged</p>
                      <p className="text-[11px] leading-relaxed text-rose-600 font-medium">
                        Your liquid cash of ₹{cashAvailable.toLocaleString()} is insufficient to cover all active EMIs due in the next 30 days. You need an extra ₹{totalShortfall.toLocaleString()} to clear all payments.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-emerald-100 flex items-start space-x-2 text-emerald-700">
                    <ShieldCheck className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-500" />
                    <div className="space-y-1">
                      <p className="font-bold">Safe Buffer Zone</p>
                      <p className="text-[11px] leading-relaxed text-emerald-600 font-medium">
                        Excellent. Your current reserves fully cover upcoming loan schedules. Maintain this buffer to avoid late fees.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wide">
                    Prepayment Action Item
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                    To reduce long term exposure, use the Settlement Planner inside individual loan pages. Shaving off even 1-2 EMIs reduces monthly cascading risks significantly.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Debt Payoff projections line chart */}
        <Card className="glass-card shadow-premium p-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-900">Amortization Payoff Projections</CardTitle>
            <CardDescription>Decline trajectory of outstanding debt balance over the next 2 years</CardDescription>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="Debt Outstanding" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
