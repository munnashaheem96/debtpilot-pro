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
import { SavingsGoal, SavingsCategory } from '@/types';
import { Plus, Target, Calendar, Sparkles, TrendingUp, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { differenceInDays, parseISO, format } from 'date-fns';

export default function SavingsGoalsPage() {
  const { user } = useAuth();
  
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentGoalId, setCurrentGoalId] = useState('');
  
  // Form State
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState<SavingsCategory>('Emergency Fund');

  useEffect(() => {
    if (user) {
      fetchCollection<SavingsGoal>('savingsGoals', user.uid).then((data) => {
        setGoals(data);
        setLoading(false);
      });
    }
  }, [user]);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setGoalName('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate(format(new Date(), 'yyyy-MM-dd'));
    setCategory('Emergency Fund');
    setIsOpen(true);
  };

  const handleOpenEdit = (g: SavingsGoal) => {
    setIsEdit(true);
    setCurrentGoalId(g.id);
    setGoalName(g.goalName);
    setTargetAmount(g.targetAmount.toString());
    setCurrentAmount(g.currentAmount.toString());
    setTargetDate(g.targetDate);
    setCategory(g.category);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !goalName || !targetAmount) return;

    const target = Number(targetAmount);
    const current = Number(currentAmount) || 0;

    const newGoal: SavingsGoal = {
      id: isEdit ? currentGoalId : `goal-${Date.now()}`,
      userId: user.uid,
      goalName,
      targetAmount: target,
      currentAmount: current,
      targetDate,
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveDocumentItem('savingsGoals', newGoal);
      
      if (isEdit) {
        setGoals((prev) => prev.map((g) => (g.id === currentGoalId ? newGoal : g)));
        await logActivity(user.uid, 'UPDATE', 'SAVINGS', `Updated savings goal: ${goalName}.`);
      } else {
        setGoals((prev) => [...prev, newGoal]);
        await logActivity(user.uid, 'CREATE', 'SAVINGS', `Added new savings goal: ${goalName}.`);
      }
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert('Error saving savings goal.');
    }
  };

  const handleDelete = async (goalId: string, name: string) => {
    if (!user) return;
    if (confirm(`Are you sure you want to delete the goal: ${name}?`)) {
      await deleteDocumentItem('savingsGoals', user.uid, goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      await logActivity(user.uid, 'DELETE', 'SAVINGS', `Deleted savings goal: ${name}.`);
    }
  };

  const categories: Array<{ value: SavingsCategory; label: string }> = [
    { value: 'Emergency Fund', label: 'Emergency Fund' },
    { value: 'Retirement', label: 'Retirement Portfolio' },
    { value: 'House', label: 'House / Property Downpayment' },
    { value: 'Car', label: 'Car / Vehicle Purchase' },
    { value: 'Travel', label: 'Travel & Vacations' },
    { value: 'Education', label: 'Future Education' },
    { value: 'Gadget', label: 'Electronics & Gadgets' },
    { value: 'Investment', label: 'Long-term Investments' },
    { value: 'Other', label: 'Other Goal' },
  ];

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Loading savings goals...</p>
        </div>
      </Shell>
    );
  }

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Savings Goals</h1>
            <p className="text-sm text-slate-500">Track and establish milestone targets to cover liabilities.</p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4.5 h-4.5 mr-1" /> Establish Goal
          </Button>
        </div>

        {/* Global Progress Header Card */}
        <Card className="glass-card shadow-premium p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold text-slate-400">Aggregated Progress</span>
              <h2 className="text-2xl font-extrabold text-slate-900">
                ₹{totalSaved.toLocaleString()} <span className="text-sm font-semibold text-slate-400">saved of ₹{totalTarget.toLocaleString()}</span>
              </h2>
            </div>
            <div className="w-full md:w-1/3 space-y-1 text-right text-xs font-semibold">
              <div className="flex justify-between md:justify-end md:space-x-3 mb-1">
                <span className="text-slate-400">Overall Target:</span>
                <span className="text-slate-800">{totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}% achieved</span>
              </div>
              <Progress value={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0} />
            </div>
          </div>
        </Card>

        {/* Goals Grid List */}
        {goals.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-100 flex flex-col items-center">
            <Target className="w-10 h-10 text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-800">No Savings Goals Establish</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Add goals to monitor how daily, weekly, and monthly rates stack up against targets.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((g) => {
              const today = new Date();
              const targetD = parseISO(g.targetDate);
              const daysRemaining = Math.max(1, differenceInDays(targetD, today));
              const remainingVal = Math.max(0, g.targetAmount - g.currentAmount);

              const dailyRequired = Math.round((remainingVal / daysRemaining) * 100) / 100;
              const weeklyRequired = Math.round((remainingVal / (daysRemaining / 7)) * 100) / 100;
              const monthlyRequired = Math.round((remainingVal / (daysRemaining / 30.4)) * 100) / 100;
              const percentage = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;

              return (
                <Card key={g.id} className="flex flex-col justify-between">
                  <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">{g.goalName}</CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold text-slate-400">
                        {g.category}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleOpenEdit(g)}
                        className="p-1 text-slate-400 hover:text-brand-500 rounded hover:bg-slate-50 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id, g.goalName)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="py-4 space-y-4 flex-1">
                    {/* Linear progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Saved: {percentage}%</span>
                        <span className="text-slate-800">
                          ₹{g.currentAmount.toLocaleString()} / ₹{g.targetAmount.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={percentage} indicatorColorClass="bg-brand-500" />
                    </div>

                    {/* Savings Rate engines predictions */}
                    {remainingVal > 0 ? (
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg text-center text-xs font-semibold">
                        <div className="border-r border-slate-200/50">
                          <span className="text-[9px] text-slate-400 block font-medium uppercase">Daily Target</span>
                          <span className="text-slate-800 text-sm font-bold">₹{Math.round(dailyRequired)}</span>
                        </div>
                        <div className="border-r border-slate-200/50">
                          <span className="text-[9px] text-slate-400 block font-medium uppercase">Weekly</span>
                          <span className="text-slate-800 text-sm font-bold">₹{Math.round(weeklyRequired)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-medium uppercase">Monthly</span>
                          <span className="text-slate-800 text-sm font-bold">₹{Math.round(monthlyRequired)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 px-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center space-x-2 text-xs font-semibold">
                        <TrendingUp className="w-4.5 h-4.5" />
                        <span>Goal completed! Target achieved ahead of schedule.</span>
                      </div>
                    )}
                  </CardContent>

                  <div className="p-3 bg-slate-50 rounded-b-xl border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1" /> Target: {g.targetDate}
                    </span>
                    <span>{daysRemaining} Days left</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit Dialog Modal */}
        <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title={isEdit ? 'Update Savings Goal' : 'Establish Savings Goal'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Goal Name *"
              placeholder="e.g. Emergency Reserve"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Target Amount (₹) *"
                type="number"
                placeholder="500000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
              <Input
                label="Current Savings (₹)"
                type="number"
                placeholder="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Target Milestone Date *"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
              />
              <Select
                label="Goal Category *"
                value={category}
                onChange={(e) => setCategory(e.target.value as SavingsCategory)}
                options={categories}
              />
            </div>

            <Button type="submit" className="w-full">
              {isEdit ? 'Save Changes' : 'Establish Target'}
            </Button>
          </form>
        </Dialog>
      </div>
    </Shell>
  );
}
