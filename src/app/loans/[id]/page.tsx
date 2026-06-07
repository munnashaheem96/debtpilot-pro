'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { fetchCollection, saveDocumentItem, deleteDocumentItem, logActivity } from '@/lib/db';
import { Loan, Repayment } from '@/types';
import { calculateLoanCoverage, calculatePrepayment } from '@/lib/calculators';
import {
  ArrowLeft,
  Calendar,
  IndianRupee,
  TrendingUp,
  Percent,
  CheckCircle,
  AlertCircle,
  Trash2,
  Archive,
  Plus,
  ArrowRight,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Select } from '@/components/ui/select';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LoanDetailsPage({ params }: PageProps) {
  const router = useRouter();
  const { user, isMockMode } = useAuth();
  
  const [loanId, setLoanId] = useState<string | null>(null);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Repayment Modal state
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState('UPI');
  const [repayNotes, setRepayNotes] = useState('');
  const [repayRef, setRepayRef] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);

  // Prepayment Calculator state
  const [extraPayment, setExtraPayment] = useState<number>(0);
  const [prepayResults, setPrepayResults] = useState<any>(null);

  // Resolve Next.js 15 dynamic parameters
  useEffect(() => {
    params.then((resolved) => setLoanId(resolved.id));
  }, [params]);

  // Load Loan Data
  useEffect(() => {
    if (user && loanId) {
      const loadLoanDetails = async () => {
        try {
          const lData = await fetchCollection<Loan>('loans', user.uid);
          const matched = lData.find((x) => x.id === loanId);
          if (matched) {
            setLoan(matched);
            
            // Fetch repayments
            const rData = await fetchCollection<Repayment>('repayments', user.uid);
            const filteredRepay = rData.filter((r) => r.loanId === loanId);
            setRepayments(filteredRepay.sort((a, b) => b.date.localeCompare(a.date)));
          } else {
            setError('Loan file not found.');
          }
        } catch (err) {
          setError('Failed to load loan file.');
        } finally {
          setLoading(false);
        }
      };
      loadLoanDetails();
    }
  }, [user, loanId]);

  // Run Prepayment math when input changes
  useEffect(() => {
    if (loan) {
      const results = calculatePrepayment(
        loan.loanAmount,
        loan.interestRate,
        loan.loanDuration,
        loan.startDate,
        extraPayment
      );
      setPrepayResults(results);
    }
  }, [loan, extraPayment]);

  const handleDelete = async () => {
    if (!user || !loan) return;
    if (confirm('Are you sure you want to permanently delete this loan file? All linked historical logs will remain cached.')) {
      await deleteDocumentItem('loans', user.uid, loan.id);
      await logActivity(user.uid, 'DELETE', 'LOAN', `Deleted loan file: ${loan.loanName}.`);
      router.push('/loans');
    }
  };

  const handleArchive = async () => {
    if (!user || !loan) return;
    const updated: Loan = { ...loan, status: 'Archived', updatedAt: new Date().toISOString() };
    await saveDocumentItem('loans', updated);
    setLoan(updated);
    await logActivity(user.uid, 'UPDATE', 'LOAN', `Archived loan file: ${loan.loanName}.`);
  };

  const handleClose = async () => {
    if (!user || !loan) return;
    const updated: Loan = { ...loan, status: 'Closed', outstandingBalance: 0, updatedAt: new Date().toISOString() };
    await saveDocumentItem('loans', updated);
    setLoan(updated);
    await logActivity(user.uid, 'SETTLEMENT', 'LOAN', `Closed/Paid off loan: ${loan.loanName}.`);
  };

  const handleAddRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !loan || !repayAmount) return;

    const amount = Number(repayAmount);
    if (amount <= 0) {
      alert('Repayment amount must be positive.');
      return;
    }

    const newRepay: Repayment = {
      id: `repay-${Date.now()}`,
      userId: user.uid,
      loanId: loan.id,
      loanName: loan.loanName,
      date: repayDate,
      amount,
      method: repayMethod,
      notes: repayNotes,
      referenceNumber: repayRef,
      status: amount >= loan.emiAmount ? 'Paid' : 'Partially Paid',
      createdAt: new Date().toISOString(),
    };

    // Calculate new outstanding balance
    const newBalance = Math.max(0, loan.outstandingBalance - amount);
    const updatedLoan: Loan = {
      ...loan,
      outstandingBalance: newBalance,
      status: newBalance === 0 ? 'Closed' : 'Active',
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveDocumentItem('repayments', newRepay);
      await saveDocumentItem('loans', updatedLoan);
      
      setRepayments((prev) => [newRepay, ...prev]);
      setLoan(updatedLoan);
      setIsRepayOpen(false);

      // Reset Form fields
      setRepayAmount('');
      setRepayNotes('');
      setRepayRef('');
      
      await logActivity(
        user.uid,
        'PAYMENT',
        'REPAYMENT',
        `Logged repayment of ₹${amount.toLocaleString()} for loan ${loan.loanName}.`
      );

      // Write notification if budget or milestones are reached
      if (newBalance === 0) {
        const milestoneNotif = {
          id: `notif-${Date.now()}`,
          userId: user.uid,
          message: `Congratulations! You have fully repaid and closed your loan: ${loan.loanName}! 🎉`,
          type: 'System' as const,
          date: new Date().toISOString(),
          read: false,
          createdAt: new Date().toISOString(),
        };
        await saveDocumentItem('notifications', milestoneNotif);
      }
    } catch (error) {
      console.error('Failed to log repayment:', error);
      alert('Error adding repayment.');
    }
  };

  const handleDeleteRepayment = async (repay: Repayment) => {
    if (!user || !loan) return;
    if (confirm('Delete this repayment entry? This will reverse the outstanding balance.')) {
      const restoredBalance = loan.outstandingBalance + repay.amount;
      const updatedLoan: Loan = {
        ...loan,
        outstandingBalance: restoredBalance,
        status: 'Active',
        updatedAt: new Date().toISOString(),
      };

      await deleteDocumentItem('repayments', user.uid, repay.id);
      await saveDocumentItem('loans', updatedLoan);

      setRepayments((prev) => prev.filter((r) => r.id !== repay.id));
      setLoan(updatedLoan);

      await logActivity(
        user.uid,
        'DELETE',
        'REPAYMENT',
        `Deleted repayment of ₹${repay.amount.toLocaleString()} for loan ${loan.loanName}.`
      );
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Loading loan ledger files...</p>
        </div>
      </Shell>
    );
  }

  if (error || !loan) {
    return (
      <Shell>
        <div className="max-w-xl mx-auto p-8 text-center bg-white border border-slate-100 rounded-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800">Error</h3>
          <p className="text-xs text-slate-400 mt-1">{error || 'Unknown error occurred.'}</p>
          <Button variant="secondary" onClick={() => router.push('/loans')} className="mt-4">
            Back to Portfolio
          </Button>
        </div>
      </Shell>
    );
  }

  // Derived Coverage Calculations
  const paidAmount = loan.loanAmount - loan.outstandingBalance;
  const progressPercentage = loan.loanAmount > 0 ? Math.round((paidAmount / loan.loanAmount) * 100) : 0;
  
  // Calculate average daily rate
  const coverage = calculateLoanCoverage(loan, repayments, 50000); // simulation fallback cash

  return (
    <Shell>
      <div className="space-y-6">
        {/* Upper Header navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={() => router.push('/loans')} size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Loans Portfolio
            </Button>
            <div className="w-px h-5 bg-slate-200 hidden md:block" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{loan.loanName}</h1>
          </div>
          <div className="flex items-center space-x-2">
            {loan.status === 'Active' && (
              <>
                <Button variant="secondary" onClick={() => setIsRepayOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Repayment
                </Button>
                <Button variant="secondary" onClick={handleClose} size="sm">
                  Mark Fully Paid
                </Button>
                <Button variant="secondary" onClick={handleArchive} size="sm">
                  <Archive className="w-4 h-4 mr-1" /> Archive
                </Button>
              </>
            )}
            <Button variant="danger" onClick={handleDelete} size="sm">
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        </div>

        {/* Amortization Overview Card & Progress bar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card shadow-premium p-6">
              <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-sm uppercase tracking-wider font-bold text-slate-400">Amortization Progress</CardTitle>
                  <CardDescription>Visual tracker of remaining principal</CardDescription>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    loan.status === 'Active'
                      ? 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                      : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                  }`}
                >
                  {loan.status}
                </span>
              </CardHeader>
              <CardContent className="p-0 pt-6 space-y-6">
                {/* Progress Indicators */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-slate-500">Repayment Coverage ({progressPercentage}%)</span>
                    <span className="text-slate-900">₹{paidAmount.toLocaleString()} paid</span>
                  </div>
                  <Progress value={progressPercentage} indicatorColorClass="bg-brand-500" />
                  <div className="flex justify-between text-xs text-slate-400 font-semibold">
                    <span>Original Loan: ₹{loan.loanAmount.toLocaleString()}</span>
                    <span>Remaining Balance: ₹{loan.outstandingBalance.toLocaleString()}</span>
                  </div>
                </div>

                {/* Core Parameters list */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-50 font-semibold text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium uppercase">Interest Rate</span>
                    <span className="text-slate-800 text-sm font-bold">{loan.interestRate}% APR</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium uppercase">Monthly EMI</span>
                    <span className="text-slate-800 text-sm font-bold">₹{loan.emiAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium uppercase">Loan Duration</span>
                    <span className="text-slate-800 text-sm font-bold">{loan.loanDuration} Months</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium uppercase">Payoff Target</span>
                    <span className="text-slate-800 text-sm font-bold">{loan.endDate}</span>
                  </div>
                </div>

                {/* Notes box */}
                {loan.notes && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-600">
                    <span className="font-bold text-slate-700 block mb-1">Obligation Notes:</span>
                    {loan.notes}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Repayments log list */}
            <Card className="glass-card shadow-premium p-6">
              <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-sm uppercase tracking-wider font-bold text-slate-400">Repayment Records</CardTitle>
                  <CardDescription>Audit logs of past transaction installments</CardDescription>
                </div>
                {loan.status === 'Active' && (
                  <Button variant="secondary" onClick={() => setIsRepayOpen(true)} size="sm">
                    Log Payment
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0 pt-4">
                {repayments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    No payments logged for this loan file yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-semibold">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                          <th className="pb-2 pl-2">Transaction Date</th>
                          <th className="pb-2">Amount Paid</th>
                          <th className="pb-2">Method</th>
                          <th className="pb-2">Reference Ref</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 pr-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {repayments.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 pl-2 text-slate-600">{r.date}</td>
                            <td className="py-3 text-slate-900 font-extrabold">₹{r.amount.toLocaleString()}</td>
                            <td className="py-3 text-slate-600">{r.method}</td>
                            <td className="py-3 text-slate-500 font-mono">{r.referenceNumber || 'N/A'}</td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-50 text-emerald-700 font-bold">
                                {r.status}
                              </span>
                            </td>
                            <td className="py-3 pr-2 text-right">
                              <button
                                onClick={() => handleDeleteRepayment(r)}
                                className="text-rose-500 hover:text-rose-600 p-1 rounded-lg"
                                title="Reverse Repayment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Settlement Prepayment Calculator Panel */}
          <div className="space-y-6">
            {/* Daily Required Rate Card */}
            {loan.status === 'Active' && (
              <Card className="glass-card shadow-premium p-5 border border-indigo-100 bg-indigo-50/20">
                <CardHeader className="p-0 pb-3 border-b border-indigo-100">
                  <CardTitle className="text-xs uppercase font-bold text-indigo-800 tracking-wider flex items-center">
                    <AlertCircle className="w-4.5 h-4.5 text-indigo-500 mr-1.5" /> Coverage Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-4 space-y-3 font-semibold text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Days to Due:</span>
                    <span className="text-slate-800">{coverage.daysRemaining} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Required Daily:</span>
                    <span className="text-indigo-700 font-extrabold">₹{Math.round(coverage.dailySavingsRequired)}/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Required Weekly:</span>
                    <span className="text-slate-800 font-bold">₹{Math.round(coverage.weeklySavingsRequired)}/week</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-100 text-[10px] text-slate-500 leading-relaxed font-medium">
                    {coverage.message}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prepayment Calculator Card */}
            {loan.status === 'Active' && (
              <Card className="glass-card shadow-premium p-5">
                <CardHeader className="p-0 pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs uppercase font-bold text-slate-500 tracking-wider flex items-center">
                    <Sparkles className="w-4.5 h-4.5 text-brand-500 mr-1.5" /> Settlement Prepayment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 block">Extra Lump-Sum Prepayment (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={extraPayment || ''}
                      onChange={(e) => setExtraPayment(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition duration-200"
                    />
                  </div>

                  {prepayResults && extraPayment > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3 font-semibold text-xs text-slate-600 p-3.5 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Interest Saved:</span>
                        <span className="text-emerald-600 font-extrabold">₹{prepayResults.interestSaved.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Term Reduced:</span>
                        <span className="text-slate-800 font-extrabold">{prepayResults.monthsReduced} months shaved</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">New Payoff Date:</span>
                        <span className="text-slate-800 font-bold">{prepayResults.newPayoffDate}</span>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Add Repayment Dialog Modal */}
        <Dialog
          isOpen={isRepayOpen}
          onClose={() => setIsRepayOpen(false)}
          title={`Log Repayment for ${loan.loanName}`}
        >
          <form onSubmit={handleAddRepayment} className="space-y-4">
            <Input
              label="Repayment Amount (₹) *"
              type="number"
              placeholder={loan.emiAmount.toString()}
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Transaction Date *"
                type="date"
                value={repayDate}
                onChange={(e) => setRepayDate(e.target.value)}
                required
              />
              <Select
                label="Payment Method *"
                value={repayMethod}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRepayMethod(e.target.value)}
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
              placeholder="e.g. UPI8237489234"
              value={repayRef}
              onChange={(e) => setRepayRef(e.target.value)}
            />

            <Input
              label="Transaction Notes"
              placeholder="e.g. June partial EMI"
              value={repayNotes}
              onChange={(e) => setRepayNotes(e.target.value)}
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
