'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/Shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { fetchCollection, saveDocumentItem, logActivity } from '@/lib/db';
import { Loan, LoanCategory, LoanStatus, LoanPriority } from '@/types';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Archive,
  CheckCircle,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function LoansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Handle URL searches (from dashboard click)
  useEffect(() => {
    const query = searchParams.get('search');
    if (query) {
      setSearch(query);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      fetchCollection<Loan>('loans', user.uid).then((data) => {
        setLoans(data);
        setLoading(false);
      });
    }
  }, [user]);

  const handleArchive = async (loan: Loan) => {
    if (!user) return;
    const updated: Loan = { ...loan, status: 'Archived', updatedAt: new Date().toISOString() };
    await saveDocumentItem('loans', updated);
    setLoans((prev) => prev.map((l) => (l.id === loan.id ? updated : l)));
    await logActivity(user.uid, 'UPDATE', 'LOAN', `Archived loan ${loan.loanName}.`);
  };

  const handleClose = async (loan: Loan) => {
    if (!user) return;
    const updated: Loan = { ...loan, status: 'Closed', outstandingBalance: 0, updatedAt: new Date().toISOString() };
    await saveDocumentItem('loans', updated);
    setLoans((prev) => prev.map((l) => (l.id === loan.id ? updated : l)));
    await logActivity(user.uid, 'SETTLEMENT', 'LOAN', `Closed/Settled loan ${loan.loanName}.`);
  };

  // Filter Logic
  const filteredLoans = loans.filter((l) => {
    const matchesSearch =
      l.loanName.toLowerCase().includes(search.toLowerCase()) ||
      l.loanProvider.toLowerCase().includes(search.toLowerCase()) ||
      l.notes.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' || l.loanCategory === categoryFilter;
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || l.priority === priorityFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  const activeCount = loans.filter((l) => l.status === 'Active').length;
  const outstandingSum = loans.filter((l) => l.status === 'Active').reduce((sum, l) => sum + l.outstandingBalance, 0);

  const categoryOptions = [
    { value: 'All', label: 'All Categories' },
    { value: 'Personal', label: 'Personal' },
    { value: 'Education', label: 'Education' },
    { value: 'Home', label: 'Home' },
    { value: 'Vehicle', label: 'Vehicle' },
    { value: 'Gold', label: 'Gold' },
    { value: 'Business', label: 'Business' },
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'BNPL', label: 'BNPL' },
    { value: 'Friends & Family', label: 'Friends & Family' },
    { value: 'Other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Archived', label: 'Archived' },
  ];

  const priorityOptions = [
    { value: 'All', label: 'All Priorities' },
    { value: 'Critical', label: 'Critical' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-semibold text-sm animate-pulse">Loading loans vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Loans Portfolio</h1>
          <p className="text-sm text-slate-500">Track repayment progress, principal limits, and EMI details.</p>
        </div>
        <Button onClick={() => router.push('/loans/add')}>
          <Plus className="w-4 h-4 mr-2" /> Add Loan
        </Button>
      </div>

      {/* Quick Statistics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card shadow-sm p-4">
          <CardDescription className="uppercase font-bold text-[10px]">Active Debt Files</CardDescription>
          <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">{activeCount} Loans</CardTitle>
        </Card>
        <Card className="glass-card shadow-sm p-4">
          <CardDescription className="uppercase font-bold text-[10px]">Total Outstanding Balance</CardDescription>
          <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
            ₹{outstandingSum.toLocaleString()}
          </CardTitle>
        </Card>
        <Card className="glass-card shadow-sm p-4">
          <CardDescription className="uppercase font-bold text-[10px]">Average Loan APR</CardDescription>
          <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
            {activeCount > 0
              ? Math.round(
                  (loans
                    .filter((l) => l.status === 'Active')
                    .reduce((sum, l) => sum + l.interestRate, 0) /
                    activeCount) *
                    10
                ) / 10
              : 0}
            %
          </CardTitle>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card p-4 shadow-premium">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end">
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Search Loans
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Name, provider..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition"
              />
            </div>
          </div>

          <Select
            label="Category"
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />

          <Select
            label="Priority"
            options={priorityOptions}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          />

          <Select
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Loans Cards Grid */}
      {filteredLoans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-100 flex flex-col items-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-800">No Loans Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Adjust filters or add a new loan to start managing your personal amortization details.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLoans.map((l) => {
            const paidAmount = l.loanAmount - l.outstandingBalance;
            const progressPercentage = l.loanAmount > 0 ? Math.round((paidAmount / l.loanAmount) * 100) : 0;

            return (
              <Card
                key={l.id}
                hoverable
                className="flex flex-col justify-between"
                onClick={() => router.push(`/loans/${l.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {l.loanProvider}
                      </span>
                      <CardTitle className="text-base font-bold text-slate-900 group-hover:text-brand-500">
                        {l.loanName}
                      </CardTitle>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-brand-50 border border-brand-100 text-brand-700">
                      {l.loanCategory}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 flex-1">
                  {/* Metrics info */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg text-xs font-semibold">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Interest Rate</span>
                      <span className="text-slate-800 font-bold">{l.interestRate}% APR</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Monthly EMI</span>
                      <span className="text-slate-800 font-bold">₹{l.emiAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {l.status === 'Active' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Repaid: {progressPercentage}%</span>
                        <span className="text-slate-800">
                          ₹{l.outstandingBalance.toLocaleString()} Outstanding
                        </span>
                      </div>
                      <Progress value={progressPercentage} indicatorColorClass="bg-brand-500" />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Original: ₹{l.loanAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {l.status === 'Closed' && (
                    <div className="py-2.5 px-3 bg-emerald-50 rounded-lg flex items-center space-x-2 text-emerald-700 text-xs">
                      <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                      <span className="font-semibold">Fully settled & closed</span>
                    </div>
                  )}

                  {l.status === 'Archived' && (
                    <div className="py-2.5 px-3 bg-slate-100 rounded-lg flex items-center space-x-2 text-slate-600 text-xs">
                      <Archive className="w-4.5 h-4.5 shrink-0" />
                      <span className="font-semibold">Archived file</span>
                    </div>
                  )}
                </CardContent>

                <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-b-xl">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      l.priority === 'Critical'
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : l.priority === 'High'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {l.priority}
                  </span>
                  <button
                    className="text-xs text-brand-500 hover:text-brand-600 font-bold flex items-center space-x-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/loans/${l.id}`);
                    }}
                  >
                    <span>Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LoansPage() {
  return (
    <Shell>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Initializing search filters...</p>
        </div>
      }>
        <LoansContent />
      </Suspense>
    </Shell>
  );
}
