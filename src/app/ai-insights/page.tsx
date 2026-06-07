'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { fetchCollection } from '@/lib/db';
import { Loan, Expense, Income, Budget } from '@/types';
import { calculateFinancialHealthScore, calculateEmergencyFundDetails } from '@/lib/calculators';
import { Sparkles, HelpCircle, ArrowRight, ShieldCheck, AlertTriangle, Lightbulb } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

export default function AIInsightsPage() {
  const { user } = useAuth();
  
  const [loans, setLoans] = useState<Loan[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const loadAIData = async () => {
        try {
          const lData = await fetchCollection<Loan>('loans', user.uid);
          const eData = await fetchCollection<Expense>('expenses', user.uid);
          const iData = await fetchCollection<Income>('income', user.uid);
          const bData = await fetchCollection<Budget>('budgets', user.uid);
          
          setLoans(lData);
          setExpenses(eData);
          setIncomes(iData);
          setBudgets(bData);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      loadAIData();
    }
  }, [user]);

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Running AI heuristic scanners...</p>
        </div>
      </Shell>
    );
  }

  const activeLoans = loans.filter((l) => l.status === 'Active');
  const totalEMI = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  const monthlyIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const monthlyExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const savingsGoalsTotal = 280000; // Simulated fallback savings

  // Calculations
  const emergencyDetails = calculateEmergencyFundDetails(savingsGoalsTotal, 600000, monthlyExpense);
  const { score: healthScore, recommendations } = calculateFinancialHealthScore({
    monthlyIncome,
    monthlyExpense,
    totalDebtEMI: totalEMI,
    currentSavings: savingsGoalsTotal,
    emergencyFundStatus: emergencyDetails.status,
    budgets,
  });

  // Calculate parameters for UI progress bars
  const savingsRateVal = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpense - totalEMI) / monthlyIncome) * 100) : 0;
  const dtiVal = monthlyIncome > 0 ? Math.round((totalEMI / monthlyIncome) * 100) : 0;
  const budgetDisciplineVal = budgets.length > 0 
    ? Math.round(((budgets.length - budgets.filter(b => b.spentAmount > b.limitAmount).length) / budgets.length) * 100)
    : 100;

  // AI predictions: Cash flow & pay-offs
  // Avalanche strategy advice
  let avalancheRecommendation = '';
  if (activeLoans.length > 1) {
    const highestInterestLoan = [...activeLoans].sort((a, b) => b.interestRate - a.interestRate)[0];
    avalancheRecommendation = `Pay off ${highestInterestLoan.loanName} (highest interest rate: ${highestInterestLoan.interestRate}%) first to save on long term compounding interest.`;
  }

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Insights & Health Desk</h1>
        </div>

        {/* Global Health Score Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className="glass-card shadow-premium p-6 lg:col-span-1 text-center flex flex-col items-center relative overflow-hidden bg-brand-500 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full filter blur-2xl" />
            <Sparkles className="w-8 h-8 text-indigo-100 animate-pulse mb-3" />
            <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest block">Financial Health Score</span>
            <div className="text-6xl font-black mt-2 tracking-tight flex items-baseline">
              {healthScore}
              <span className="text-xs text-indigo-100 font-semibold ml-1">/ 100</span>
            </div>
            <div className="mt-4 w-full">
              <Progress value={healthScore} indicatorColorClass="bg-white" className="bg-white/20" />
            </div>
            <p className="text-xs font-semibold text-indigo-50 mt-4 leading-relaxed max-w-xs">
              This score aggregates savings rates, debt ratios (DTI), budget caps, and emergency buffers to measure solvency.
            </p>
          </Card>

          {/* Health Variables Grid list */}
          <Card className="glass-card shadow-premium p-6 lg:col-span-2">
            <CardHeader className="p-0 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Score Metrics breakdown</CardTitle>
              <CardDescription>Individual components comprising the financial health score</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-6 space-y-4">
              {/* Savings Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500 font-medium">Monthly Savings Rate (Target &gt;= 20%)</span>
                  <span className="text-slate-800">{savingsRateVal}% saved</span>
                </div>
                <Progress value={savingsRateVal * 5} indicatorColorClass="bg-brand-500" />
              </div>

              {/* Debt Ratio */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500 font-medium">Debt-to-Income Ratio (Target &lt;= 35%)</span>
                  <span className={dtiVal > 35 ? 'text-rose-500' : 'text-slate-800'}>{dtiVal}% DTI</span>
                </div>
                <Progress value={dtiVal} indicatorColorClass={dtiVal > 35 ? 'bg-rose-500' : 'bg-brand-500'} />
              </div>

              {/* Emergency buffer */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500 font-medium">Emergency Reserve Months Covered (Target &gt;= 6m)</span>
                  <span className="text-slate-800">{emergencyDetails.monthsCovered} months</span>
                </div>
                <Progress value={(emergencyDetails.monthsCovered / 6) * 100} indicatorColorClass="bg-brand-500" />
              </div>

              {/* Budget compliance */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500 font-medium">Budget Discipline Compliance</span>
                  <span className="text-slate-800">{budgetDisciplineVal}% under limit</span>
                </div>
                <Progress value={budgetDisciplineVal} indicatorColorClass="bg-brand-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI copilot advisor notes */}
        <Card className="glass-card shadow-premium p-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-900">AI Copilot Strategic Actions</CardTitle>
            <CardDescription>Dynamic heuristic action recommendations to optimize payoff speed</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-indigo-100/50 bg-indigo-50/20 text-xs font-semibold text-indigo-900 flex items-start space-x-3.5"
              >
                <div className="p-1.5 bg-indigo-500 text-white rounded-lg shadow-sm">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-indigo-950">Recommendation #{i + 1}</p>
                  <p className="leading-relaxed font-medium text-indigo-800">{rec}</p>
                </div>
              </div>
            ))}

            {avalancheRecommendation && (
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 text-xs font-semibold text-emerald-900 flex items-start space-x-3.5">
                <div className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-sm">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">Avalanche Debt Payoff Plan</p>
                  <p className="leading-relaxed font-medium text-emerald-800">{avalancheRecommendation}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
