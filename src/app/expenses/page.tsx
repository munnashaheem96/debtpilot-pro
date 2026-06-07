'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { fetchCollection, saveDocumentItem, deleteDocumentItem, logActivity } from '@/lib/db';
import { Expense, ExpenseCategory, RecurrenceType, Budget } from '@/types';
import { Plus, Search, TrendingDown, Calendar, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { addDays, addMonths, parseISO, format, isBefore } from 'date-fns';

export default function ExpensesPage() {
  const { user } = useAuth();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('None');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) {
      const loadExpenseData = async () => {
        try {
          const eData = await fetchCollection<Expense>('expenses', user.uid);
          const bData = await fetchCollection<Budget>('budgets', user.uid);
          
          setBudgets(bData);

          // Recurring Transaction Generation Check
          const today = new Date();
          const updatedList = [...eData];
          let updatedDb = false;

          for (const item of eData) {
            if (item.recurrence !== 'None') {
              let lastDate = parseISO(item.lastGeneratedDate || item.date);
              let nextTriggerDate = item.recurrence === 'Weekly' ? addDays(lastDate, 7) : addMonths(lastDate, 1);
              
              while (isBefore(nextTriggerDate, today)) {
                updatedDb = true;
                const newRecurId = `expense-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                const triggerStr = format(nextTriggerDate, 'yyyy-MM-dd');
                
                const newRecurItem: Expense = {
                  ...item,
                  id: newRecurId,
                  date: triggerStr,
                  lastGeneratedDate: triggerStr,
                  createdAt: new Date().toISOString(),
                };
                
                await saveDocumentItem('expenses', newRecurItem);
                updatedList.push(newRecurItem);

                // Update original transaction's lastGeneratedDate
                item.lastGeneratedDate = triggerStr;
                await saveDocumentItem('expenses', item);

                // Increment trigger date
                lastDate = nextTriggerDate;
                nextTriggerDate = item.recurrence === 'Weekly' ? addDays(lastDate, 7) : addMonths(lastDate, 1);
              }
            }
          }

          if (updatedDb) {
            await logActivity(user.uid, 'SYSTEM', 'EXPENSE', 'Auto-generated recurring expense schedules.');
          }

          setExpenses(updatedList.sort((a, b) => b.date.localeCompare(a.date)));
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      loadExpenseData();
    }
  }, [user]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !merchant || !amount) return;

    const value = Number(amount);
    const newExpense: Expense = {
      id: `expense-${Date.now()}`,
      userId: user.uid,
      merchant,
      category,
      amount: value,
      date,
      recurrence,
      lastGeneratedDate: recurrence !== 'None' ? date : undefined,
      notes,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveDocumentItem('expenses', newExpense);
      setExpenses((prev) => [newExpense, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setIsOpen(false);

      // Check against budgets
      const matchedBudget = budgets.find(
        (b) => b.category === category && b.month === date.substring(0, 7)
      );
      if (matchedBudget) {
        const newSpent = matchedBudget.spentAmount + value;
        const updatedBudget: Budget = {
          ...matchedBudget,
          spentAmount: newSpent,
        };
        await saveDocumentItem('budgets', updatedBudget);
        setBudgets((prev) => prev.map((b) => (b.id === matchedBudget.id ? updatedBudget : b)));

        // Raise notification if limit crossed
        if (newSpent >= matchedBudget.limitAmount) {
          const limitNotif = {
            id: `notif-${Date.now()}`,
            userId: user.uid,
            message: `Alert: Budget limit exceeded for ${category}! (Limit: ₹${matchedBudget.limitAmount}, Spent: ₹${newSpent})`,
            type: 'Budget' as const,
            date: new Date().toISOString(),
            read: false,
            createdAt: new Date().toISOString(),
          };
          await saveDocumentItem('notifications', limitNotif);
        } else if (newSpent >= matchedBudget.limitAmount * 0.8) {
          const warningNotif = {
            id: `notif-${Date.now()}`,
            userId: user.uid,
            message: `Warning: You have used 80%+ of your monthly budget for ${category}. (Limit: ₹${matchedBudget.limitAmount})`,
            type: 'Budget' as const,
            date: new Date().toISOString(),
            read: false,
            createdAt: new Date().toISOString(),
          };
          await saveDocumentItem('notifications', warningNotif);
        }
      }
      
      // Reset
      setMerchant('');
      setAmount('');
      setNotes('');
      setRecurrence('None');

      await logActivity(user.uid, 'CREATE', 'EXPENSE', `Logged expense: ${merchant} (₹${value.toLocaleString()}).`);
    } catch (error) {
      console.error(error);
      alert('Error saving expense entry.');
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!user) return;
    if (confirm(`Delete the expense entry: ${expense.merchant}?`)) {
      await deleteDocumentItem('expenses', user.uid, expense.id);
      
      // Reverse from budget if applies
      const matchedBudget = budgets.find(
        (b) => b.category === expense.category && b.month === expense.date.substring(0, 7)
      );
      if (matchedBudget) {
        const updatedBudget: Budget = {
          ...matchedBudget,
          spentAmount: Math.max(0, matchedBudget.spentAmount - expense.amount),
        };
        await saveDocumentItem('budgets', updatedBudget);
        setBudgets((prev) => prev.map((b) => (b.id === matchedBudget.id ? updatedBudget : b)));
      }

      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
      await logActivity(user.uid, 'DELETE', 'EXPENSE', `Deleted expense record: ${expense.merchant}.`);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.merchant.toLowerCase().includes(search.toLowerCase()) ||
      e.notes.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categoriesOptions = [
    { value: 'All', label: 'All Categories' },
    { value: 'Food', label: 'Food' },
    { value: 'Rent', label: 'Rent' },
    { value: 'Fuel', label: 'Fuel' },
    { value: 'Shopping', label: 'Shopping' },
    { value: 'Bills', label: 'Bills' },
    { value: 'Entertainment', label: 'Entertainment' },
    { value: 'Medical', label: 'Medical' },
    { value: 'Education', label: 'Education' },
    { value: 'Travel', label: 'Travel' },
    { value: 'Other', label: 'Other Outflow' },
  ];

  const totalMonthlyExpense = expenses
    .filter((e) => e.date.startsWith(new Date().toISOString().substring(0, 7)))
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expense Ledger</h1>
            <p className="text-sm text-slate-500">Log shopping receipts, residential rents, and regular bills.</p>
          </div>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="w-4.5 h-4.5 mr-1" /> Log Expense
          </Button>
        </div>

        {/* Stats banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-card p-4 shadow-sm">
            <CardDescription className="uppercase font-bold text-[10px]">Expenses Recorded (This Month)</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-rose-500 mt-1">
              ₹{totalMonthlyExpense.toLocaleString()}
            </CardTitle>
          </Card>
          <Card className="glass-card p-4 shadow-sm">
            <CardDescription className="uppercase font-bold text-[10px]">Total Transactions Outflow</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
              {expenses.length} Entries
            </CardTitle>
          </Card>
        </div>

        {/* Filter Card */}
        <Card className="glass-card p-4 shadow-premium">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Search Entries
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Merchant, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition"
                />
              </div>
            </div>

            <Select
              label="Source Category"
              options={categoriesOptions}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>
        </Card>

        {/* List of Expenses */}
        <Card className="glass-card shadow-premium p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="pb-3 pl-2">Outflow Date</th>
                  <th className="pb-3">Merchant / Outlet</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Recurrence</th>
                  <th className="pb-3">Amount Charged</th>
                  <th className="pb-3">Notes</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                      No expense records matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 pl-2 text-slate-600">{e.date}</td>
                      <td className="py-3.5 text-slate-900 font-bold">{e.merchant}</td>
                      <td className="py-3.5">
                        <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-600">
                        {e.recurrence === 'None' ? (
                          <span className="text-slate-400">One-time</span>
                        ) : (
                          <span className="text-brand-600 font-bold">{e.recurrence}</span>
                        )}
                      </td>
                      <td className="py-3.5 text-rose-500 font-extrabold text-sm">₹{e.amount.toLocaleString()}</td>
                      <td className="py-3.5 text-slate-500 font-medium italic">{e.notes || '-'}</td>
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => handleDelete(e)}
                          className="text-rose-500 hover:text-rose-600 p-1 rounded-lg"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Dialog Modal Add */}
        <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Record Expense Outflow">
          <form onSubmit={handleAddExpense} className="space-y-4">
            <Input
              label="Merchant / Bill Issuer *"
              placeholder="e.g. Amazon, ACT Fibernet"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount (₹) *"
                type="number"
                placeholder="e.g. 1200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <Select
                label="Category *"
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
                  { value: 'Other', label: 'Other Outflow' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Transaction Date *"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Select
                label="Schedule Recurrence *"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                options={[
                  { value: 'None', label: 'One-time Transaction' },
                  { value: 'Weekly', label: 'Weekly Schedule' },
                  { value: 'Monthly', label: 'Monthly Schedule' },
                ]}
              />
            </div>

            <Input
              label="Outflow Notes"
              placeholder="Additional comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button type="submit" className="w-full">
              Log Expense Outflow
            </Button>
          </form>
        </Dialog>
      </div>
    </Shell>
  );
}
