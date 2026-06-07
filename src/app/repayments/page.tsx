'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { fetchCollection, saveDocumentItem, deleteDocumentItem, logActivity } from '@/lib/db';
import { Loan, Repayment, RepaymentStatus } from '@/types';
import { Plus, Search, Calendar, CreditCard, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function RepaymentsPage() {
  const { user } = useAuth();
  
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [loanFilter, setLoanFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [refNum, setRefNum] = useState('');

  useEffect(() => {
    if (user) {
      const loadRepaymentsData = async () => {
        try {
          const rData = await fetchCollection<Repayment>('repayments', user.uid);
          const lData = await fetchCollection<Loan>('loans', user.uid);
          
          setRepayments(rData.sort((a, b) => b.date.localeCompare(a.date)));
          setLoans(lData);
          if (lData.filter(l => l.status === 'Active').length > 0) {
            setSelectedLoanId(lData.filter(l => l.status === 'Active')[0].id);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      loadRepaymentsData();
    }
  }, [user]);

  const handleLogRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLoanId || !amount) return;

    const value = Number(amount);
    const loanMatched = loans.find((l) => l.id === selectedLoanId);
    if (!loanMatched) return;

    const newRepay: Repayment = {
      id: `repay-${Date.now()}`,
      userId: user.uid,
      loanId: selectedLoanId,
      loanName: loanMatched.loanName,
      date,
      amount: value,
      method,
      notes,
      referenceNumber: refNum,
      status: value >= loanMatched.emiAmount ? 'Paid' : 'Partially Paid',
      createdAt: new Date().toISOString(),
    };

    // Calculate new outstanding balance
    const newBalance = Math.max(0, loanMatched.outstandingBalance - value);
    const updatedLoan: Loan = {
      ...loanMatched,
      outstandingBalance: newBalance,
      status: newBalance === 0 ? 'Closed' : 'Active',
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveDocumentItem('repayments', newRepay);
      await saveDocumentItem('loans', updatedLoan);

      setRepayments((prev) => [newRepay, ...prev]);
      setLoans((prev) => prev.map((l) => (l.id === selectedLoanId ? updatedLoan : l)));
      setIsOpen(false);

      // Reset
      setAmount('');
      setNotes('');
      setRefNum('');
      
      await logActivity(
        user.uid,
        'PAYMENT',
        'REPAYMENT',
        `Logged repayment of ₹${value.toLocaleString()} for loan ${loanMatched.loanName}.`
      );
    } catch (error) {
      console.error(error);
      alert('Error saving repayment record.');
    }
  };

  const handleDeleteRepayment = async (repay: Repayment) => {
    if (!user) return;
    if (confirm('Are you sure you want to reverse this repayment? Outstanding balance will be updated.')) {
      const matchedLoan = loans.find((l) => l.id === repay.loanId);
      if (matchedLoan) {
        const restoredBalance = matchedLoan.outstandingBalance + repay.amount;
        const updatedLoan: Loan = {
          ...matchedLoan,
          outstandingBalance: restoredBalance,
          status: 'Active',
          updatedAt: new Date().toISOString(),
        };

        await deleteDocumentItem('repayments', user.uid, repay.id);
        await saveDocumentItem('loans', updatedLoan);

        setLoans((prev) => prev.map((l) => (l.id === repay.loanId ? updatedLoan : l)));
      } else {
        await deleteDocumentItem('repayments', user.uid, repay.id);
      }

      setRepayments((prev) => prev.filter((r) => r.id !== repay.id));
      await logActivity(
        user.uid,
        'DELETE',
        'REPAYMENT',
        `Deleted repayment record of ₹${repay.amount} for loan ${repay.loanName}.`
      );
    }
  };

  // Filter Repayments
  const filteredRepayments = repayments.filter((r) => {
    const matchesSearch =
      r.loanName.toLowerCase().includes(search.toLowerCase()) ||
      r.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.notes.toLowerCase().includes(search.toLowerCase());

    const matchesLoan = loanFilter === 'All' || r.loanId === loanFilter;
    const matchesMethod = methodFilter === 'All' || r.method === methodFilter;

    return matchesSearch && matchesLoan && matchesMethod;
  });

  const thisMonthRepayTotal = repayments
    .filter((r) => r.date.startsWith(new Date().toISOString().substring(0, 7)))
    .reduce((sum, r) => sum + r.amount, 0);

  const loanOptions = [{ value: 'All', label: 'All Loans' }].concat(
    loans.map((l) => ({ value: l.id, label: l.loanName }))
  );

  const methodOptions = [
    { value: 'All', label: 'All Methods' },
    { value: 'UPI', label: 'UPI' },
    { value: 'Net Banking', label: 'Net Banking' },
    { value: 'Debit Card', label: 'Debit Card' },
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'Cash', label: 'Cash' },
  ];

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Loading repayments database...</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Repayments Audit Ledger</h1>
            <p className="text-sm text-slate-500">View and log repayments applied to outstanding loans.</p>
          </div>
          {loans.filter((l) => l.status === 'Active').length > 0 && (
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="w-4.5 h-4.5 mr-1" /> Record Repayment
            </Button>
          )}
        </div>

        {/* Stats banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-card p-4 shadow-sm">
            <CardDescription className="uppercase font-bold text-[10px]">Repayments Made This Month</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
              ₹{thisMonthRepayTotal.toLocaleString()}
            </CardTitle>
          </Card>
          <Card className="glass-card p-4 shadow-sm">
            <CardDescription className="uppercase font-bold text-[10px]">Total Repayments Logged</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
              {repayments.length} Transactions
            </CardTitle>
          </Card>
        </div>

        {/* Filters Panel */}
        <Card className="glass-card p-4 shadow-premium">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Search Transactions
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Notes, references..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition"
                />
              </div>
            </div>

            <Select
              label="Associated Loan"
              options={loanOptions}
              value={loanFilter}
              onChange={(e) => setLoanFilter(e.target.value)}
            />

            <Select
              label="Payment Channel"
              options={methodOptions}
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            />
          </div>
        </Card>

        {/* Table list of repayments */}
        <Card className="glass-card shadow-premium p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="pb-3 pl-2">Payment Date</th>
                  <th className="pb-3">Loan Obligation</th>
                  <th className="pb-3">Amount Repaid</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Reference Ref</th>
                  <th className="pb-3">Transaction notes</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold">
                {filteredRepayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                      No repayments logged matching the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRepayments.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 pl-2 text-slate-600">{r.date}</td>
                      <td className="py-3.5 text-slate-900 font-bold">{r.loanName}</td>
                      <td className="py-3.5 text-slate-900 font-extrabold text-sm">₹{r.amount.toLocaleString()}</td>
                      <td className="py-3.5 text-slate-600">{r.method}</td>
                      <td className="py-3.5 text-slate-500 font-mono">{r.referenceNumber || 'N/A'}</td>
                      <td className="py-3.5 text-slate-500 font-medium italic">{r.notes || '-'}</td>
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => handleDeleteRepayment(r)}
                          className="text-rose-500 hover:text-rose-600 p-1 rounded-lg"
                          title="Reverse Repayment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Global Add Repayment Dialog Modal */}
        <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Record Repayment Entry">
          <form onSubmit={handleLogRepayment} className="space-y-4">
            <Select
              label="Select Target Loan *"
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              options={loans.filter((l) => l.status === 'Active').map((l) => ({ value: l.id, label: l.loanName }))}
            />

            <Input
              label="Repayment Amount (₹) *"
              type="number"
              placeholder="e.g. 15000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Transaction Date *"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Select
                label="Payment Method *"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                options={[
                  { value: 'UPI', label: 'UPI (GPay / PhonePe)' },
                  { value: 'Net Banking', label: 'Net Banking' },
                  { value: 'Debit Card', label: 'Debit Card' },
                  { value: 'Credit Card', label: 'Credit Card' },
                  { value: 'Cash', label: 'Cash' },
                ]}
              />
            </div>

            <Input
              label="Reference / Transaction Number"
              placeholder="e.g. UPI782367489"
              value={refNum}
              onChange={(e) => setRefNum(e.target.value)}
            />

            <Input
              label="Notes"
              placeholder="Prepayment, partial emi, monthly adjustment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button type="submit" className="w-full">
              Log Transaction
            </Button>
          </form>
        </Dialog>
      </div>
    </Shell>
  );
}
