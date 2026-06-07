'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { fetchCollection, saveDocumentItem, deleteDocumentItem, logActivity } from '@/lib/db';
import { Income, IncomeCategory, RecurrenceType } from '@/types';
import { Plus, Search, TrendingUp, Calendar, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { addDays, addMonths, parseISO, format, isBefore } from 'date-fns';

export default function IncomePage() {
  const { user } = useAuth();
  
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<IncomeCategory>('Salary');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('None');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) {
      const loadIncomeData = async () => {
        try {
          const data = await fetchCollection<Income>('income', user.uid);
          
          // Recurring Transaction Generation Check
          const today = new Date();
          const updatedList = [...data];
          let updatedDb = false;

          for (const item of data) {
            if (item.recurrence !== 'None') {
              let lastDate = parseISO(item.lastGeneratedDate || item.date);
              let nextTriggerDate = item.recurrence === 'Weekly' ? addDays(lastDate, 7) : addMonths(lastDate, 1);
              
              while (isBefore(nextTriggerDate, today)) {
                updatedDb = true;
                const newRecurId = `income-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                const triggerStr = format(nextTriggerDate, 'yyyy-MM-dd');
                
                const newRecurItem: Income = {
                  ...item,
                  id: newRecurId,
                  date: triggerStr,
                  lastGeneratedDate: triggerStr,
                  createdAt: new Date().toISOString(),
                };
                
                await saveDocumentItem('income', newRecurItem);
                updatedList.push(newRecurItem);

                // Update original transaction's lastGeneratedDate to prevent duplicates
                item.lastGeneratedDate = triggerStr;
                await saveDocumentItem('income', item);

                // Increment trigger date
                lastDate = nextTriggerDate;
                nextTriggerDate = item.recurrence === 'Weekly' ? addDays(lastDate, 7) : addMonths(lastDate, 1);
              }
            }
          }

          if (updatedDb) {
            await logActivity(user.uid, 'SYSTEM', 'INCOME', 'Auto-generated recurring income schedules.');
          }

          setIncomes(updatedList.sort((a, b) => b.date.localeCompare(a.date)));
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      loadIncomeData();
    }
  }, [user]);

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !source || !amount) return;

    const value = Number(amount);
    const newIncome: Income = {
      id: `income-${Date.now()}`,
      userId: user.uid,
      source,
      category,
      amount: value,
      date,
      recurrence,
      lastGeneratedDate: recurrence !== 'None' ? date : undefined,
      notes,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveDocumentItem('income', newIncome);
      setIncomes((prev) => [newIncome, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setIsOpen(false);
      
      // Reset
      setSource('');
      setAmount('');
      setNotes('');
      setRecurrence('None');

      await logActivity(user.uid, 'CREATE', 'INCOME', `Logged income: ${source} (₹${value.toLocaleString()}).`);
    } catch (error) {
      console.error(error);
      alert('Error saving income entry.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!user) return;
    if (confirm(`Delete the income entry: ${name}?`)) {
      await deleteDocumentItem('income', user.uid, id);
      setIncomes((prev) => prev.filter((i) => i.id !== id));
      await logActivity(user.uid, 'DELETE', 'INCOME', `Deleted income record: ${name}.`);
    }
  };

  const filteredIncomes = incomes.filter((i) => {
    const matchesSearch =
      i.source.toLowerCase().includes(search.toLowerCase()) ||
      i.notes.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || i.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categoriesOptions = [
    { value: 'All', label: 'All Categories' },
    { value: 'Salary', label: 'Salary' },
    { value: 'Freelancing', label: 'Freelancing' },
    { value: 'Business', label: 'Business Influx' },
    { value: 'Investments', label: 'Investments Divs' },
    { value: 'Other', label: 'Other Inflow' },
  ];

  const totalMonthlyIncome = incomes
    .filter((i) => i.date.startsWith(new Date().toISOString().substring(0, 7)))
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Income Ledger</h1>
            <p className="text-sm text-slate-500">Track recurring salaries, business gains, and freelancing invoices.</p>
          </div>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="w-4.5 h-4.5 mr-1" /> Log Income
          </Button>
        </div>

        {/* Stats banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-card p-4 shadow-sm">
            <CardDescription className="uppercase font-bold text-[10px]">Income Registered (This Month)</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
              ₹{totalMonthlyIncome.toLocaleString()}
            </CardTitle>
          </Card>
          <Card className="glass-card p-4 shadow-sm">
            <CardDescription className="uppercase font-bold text-[10px]">Total Transactions Inflow</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
              {incomes.length} Entries
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
                  placeholder="Notes, sources..."
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

        {/* List of Income */}
        <Card className="glass-card shadow-premium p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="pb-3 pl-2">Inflow Date</th>
                  <th className="pb-3">Source Name</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Recurrence</th>
                  <th className="pb-3">Amount Received</th>
                  <th className="pb-3">Notes</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold">
                {filteredIncomes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                      No income records matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredIncomes.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 pl-2 text-slate-600">{i.date}</td>
                      <td className="py-3.5 text-slate-900 font-bold">{i.source}</td>
                      <td className="py-3.5">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {i.category}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-600">
                        {i.recurrence === 'None' ? (
                          <span className="text-slate-400">One-time</span>
                        ) : (
                          <span className="text-brand-600 font-bold">{i.recurrence}</span>
                        )}
                      </td>
                      <td className="py-3.5 text-slate-900 font-extrabold text-sm">₹{i.amount.toLocaleString()}</td>
                      <td className="py-3.5 text-slate-500 font-medium italic">{i.notes || '-'}</td>
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => handleDelete(i.id, i.source)}
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
        <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Record Income Influx">
          <form onSubmit={handleAddIncome} className="space-y-4">
            <Input
              label="Source Name *"
              placeholder="e.g. Salary, Freelance project"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount (₹) *"
                type="number"
                placeholder="e.g. 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <Select
                label="Category *"
                value={category}
                onChange={(e) => setCategory(e.target.value as IncomeCategory)}
                options={[
                  { value: 'Salary', label: 'Salary' },
                  { value: 'Freelancing', label: 'Freelancing' },
                  { value: 'Business', label: 'Business' },
                  { value: 'Investments', label: 'Investments' },
                  { value: 'Other', label: 'Other Influx' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Receive Date *"
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
              label="Inflow Notes"
              placeholder="Additional comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button type="submit" className="w-full">
              Log Income Inflow
            </Button>
          </form>
        </Dialog>
      </div>
    </Shell>
  );
}
