'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { fetchCollection, saveDocumentItem, deleteDocumentItem, logActivity } from '@/lib/db';
import { Budget, Expense, ExpenseCategory } from '@/types';
import { Plus, Wallet, AlertTriangle, CheckCircle, ShieldCheck, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

export default function BudgetPlannerPage() {
  const { user } = useAuth();
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentBudgetId, setCurrentBudgetId] = useState('');
  
  // Fields State
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [limitAmount, setLimitAmount] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (user) {
      const loadBudgetData = async () => {
        try {
          const bData = await fetchCollection<Budget>('budgets', user.uid);
          const eData = await fetchCollection<Expense>('expenses', user.uid);
          
          setExpenses(eData);
          setBudgets(bData);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      loadBudgetData();
    }
  }, [user]);

  // Re-calculate Spent Amounts dynamically based on expenses for the selected budget's month/category
  const enrichedBudgets = budgets.map((b) => {
    const matchedExpenses = expenses.filter(
      (e) => e.category === b.category && e.date.startsWith(b.month)
    );
    const spentAmount = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      ...b,
      spentAmount,
    };
  });

  const handleOpenAdd = () => {
    setIsEdit(false);
    setLimitAmount('');
    setCategory('Food');
    setMonth(format(new Date(), 'yyyy-MM'));
    setIsOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setIsEdit(true);
    setCurrentBudgetId(b.id);
    setCategory(b.category);
    setLimitAmount(b.limitAmount.toString());
    setMonth(b.month);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !limitAmount) return;

    const limitVal = Number(limitAmount);
    
    // Check if budget already exists for this category/month
    const existing = budgets.find((b) => b.category === category && b.month === month && b.id !== currentBudgetId);
    if (existing) {
      alert(`A budget plan already exists for ${category} in ${month}. Please edit the existing one.`);
      return;
    }

    const matchedExpenses = expenses.filter(
      (e) => e.category === category && e.date.startsWith(month)
    );
    const spentAmount = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);

    const newBudget: Budget = {
      id: isEdit ? currentBudgetId : `budget-${Date.now()}`,
      userId: user.uid,
      category,
      limitAmount: limitVal,
      spentAmount,
      month,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveDocumentItem('budgets', newBudget);
      if (isEdit) {
        setBudgets((prev) => prev.map((b) => (b.id === currentBudgetId ? newBudget : b)));
        await logActivity(user.uid, 'UPDATE', 'BUDGET', `Updated budget limit for ${category} (${month}).`);
      } else {
        setBudgets((prev) => [...prev, newBudget]);
        await logActivity(user.uid, 'CREATE', 'BUDGET', `Created new budget limit for ${category} (${month}).`);
      }
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert('Error saving budget configurations.');
    }
  };

  const handleDelete = async (budgetId: string, name: string) => {
    if (!user) return;
    if (confirm(`Delete the budget allocation for ${name}?`)) {
      await deleteDocumentItem('budgets', user.uid, budgetId);
      setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
      await logActivity(user.uid, 'DELETE', 'BUDGET', `Deleted budget for ${name}.`);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Loading budget thresholds...</p>
        </div>
      </Shell>
    );
  }

  const overallSpent = enrichedBudgets.reduce((sum, b) => sum + b.spentAmount, 0);
  const overallLimit = enrichedBudgets.reduce((sum, b) => sum + b.limitAmount, 0);
  const overallUsage = overallLimit > 0 ? Math.round((overallSpent / overallLimit) * 100) : 0;

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Budget Planner</h1>
            <p className="text-sm text-slate-500">Design monthly category parameters and visual overspending targets.</p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4.5 h-4.5 mr-1" /> Add Category Budget
          </Button>
        </div>

        {/* Global Progress Header Card */}
        <Card className="glass-card shadow-premium p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold text-slate-400">Total Monthly Budgets Limits</span>
              <h2 className="text-2xl font-extrabold text-slate-900">
                ₹{overallSpent.toLocaleString()} <span className="text-sm font-semibold text-slate-400">spent of ₹{overallLimit.toLocaleString()}</span>
              </h2>
            </div>
            <div className="w-full md:w-1/3 space-y-1 text-right text-xs font-semibold">
              <div className="flex justify-between md:justify-end md:space-x-3 mb-1">
                <span className="text-slate-400">Overall Budgets Used:</span>
                <span className={overallUsage >= 100 ? 'text-rose-600 font-bold' : overallUsage >= 80 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                  {overallUsage}% spent
                </span>
              </div>
              <Progress value={overallUsage} indicatorColorClass={overallUsage >= 100 ? 'bg-rose-500' : overallUsage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'} />
            </div>
          </div>
        </Card>

        {/* Categories budget cards grid */}
        {enrichedBudgets.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-100 flex flex-col items-center">
            <Wallet className="w-10 h-10 text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-800">No Category Budgets Establish</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Create category budgets to establish visual flags and spending caps.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrichedBudgets.map((b) => {
              const usage = b.limitAmount > 0 ? Math.round((b.spentAmount / b.limitAmount) * 100) : 0;
              const remaining = Math.max(0, b.limitAmount - b.spentAmount);

              let statusColor = 'bg-emerald-500';
              let statusLabel = 'Safe';
              let borderClass = 'border-slate-100';
              let badgeColor = 'bg-emerald-50 border-emerald-100 text-emerald-700';

              if (usage >= 100) {
                statusColor = 'bg-rose-500';
                statusLabel = 'Budget Exceeded';
                borderClass = 'border-rose-200 shadow-rose-500/5';
                badgeColor = 'bg-rose-50 border-rose-100 text-rose-700';
              } else if (usage >= 80) {
                statusColor = 'bg-amber-500';
                statusLabel = 'Warning - Near Limit';
                borderClass = 'border-amber-200 shadow-amber-500/5';
                badgeColor = 'bg-amber-50 border-amber-100 text-amber-700';
              }

              return (
                <Card key={b.id} className={`flex flex-col justify-between border ${borderClass}`}>
                  <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">{b.category}</CardTitle>
                      <CardDescription className="text-[10px] font-bold text-slate-400">
                        Target Month: {b.month}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-1 text-slate-400 hover:text-brand-500 rounded hover:bg-slate-50 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id, b.category)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="py-4 space-y-4 flex-1">
                    {/* Progress details */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Used: {usage}%</span>
                        <span className="text-slate-800">
                          ₹{b.spentAmount.toLocaleString()} / ₹{b.limitAmount.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={usage} indicatorColorClass={statusColor} />
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold pt-1">
                      <span className="text-slate-400 font-medium">Remaining Buffer:</span>
                      <span className={remaining === 0 ? 'text-rose-600 font-bold' : 'text-slate-800 font-bold'}>
                        ₹{remaining.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>

                  <div className="p-3 bg-slate-50 rounded-b-xl border-t border-slate-100 flex justify-between items-center">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${badgeColor}`}
                    >
                      {usage >= 80 && <AlertTriangle className="w-3 h-3 mr-0.5 shrink-0" />}
                      {usage < 80 && <CheckCircle className="w-3 h-3 mr-0.5 shrink-0" />}
                      {statusLabel}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog Form budget add/edit */}
        <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title={isEdit ? 'Update Budget Threshold' : 'Establish Budget Threshold'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Budget Category *"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              options={[
                { value: 'Food', label: 'Food' },
                { value: 'Rent', label: 'Rent' },
                { value: 'Fuel', label: 'Fuel' },
                { value: 'Shopping', label: 'Shopping' },
                { value: 'Bills', label: 'Bills' },
                { value: 'Entertainment', label: 'Entertainment' },
                { value: 'Medical', label: 'Medical' },
                { value: 'Education', label: 'Education' },
                { value: 'Travel', label: 'Travel' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <Input
              label="Limit Cap Amount (₹) *"
              type="number"
              placeholder="e.g. 15000"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              required
            />

            <Input
              label="Budget Target Month (YYYY-MM) *"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />

            <Button type="submit" className="w-full">
              {isEdit ? 'Save Budget Changes' : 'Record Budget Allocation'}
            </Button>
          </form>
        </Dialog>
      </div>
    </Shell>
  );
}
