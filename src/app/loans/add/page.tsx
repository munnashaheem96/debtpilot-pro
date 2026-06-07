'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { calculateEMI, calculateTotalRepayment, calculateTotalInterest } from '@/lib/calculators';
import { saveDocumentItem, logActivity } from '@/lib/db';
import { Loan, LoanCategory, LoanPriority, LoanStatus } from '@/types';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { addMonths, format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

export default function AddLoanPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Form Fields
  const [loanName, setLoanName] = useState('');
  const [loanProvider, setLoanProvider] = useState('');
  const [loanCategory, setLoanCategory] = useState<LoanCategory>('Personal');
  const [loanAmount, setLoanAmount] = useState<number>(100000);
  const [interestRate, setInterestRate] = useState<number>(10);
  const [processingFee, setProcessingFee] = useState<number>(1000);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loanDuration, setLoanDuration] = useState<number>(12); // months
  const [dueDate, setDueDate] = useState<number>(5); // Day of month
  const [priority, setPriority] = useState<LoanPriority>('Medium');
  const [colorTag, setColorTag] = useState('indigo');
  const [notes, setNotes] = useState('');
  
  // Outstanding balance (customizable override)
  const [outstandingBalance, setOutstandingBalance] = useState<number>(100000);
  const [useCustomOutstanding, setUseCustomOutstanding] = useState(false);

  // Auto-calculated states
  const [emi, setEmi] = useState(0);
  const [totalRepay, setTotalRepay] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [endDate, setEndDate] = useState('');

  // Re-calculate values when inputs modify
  useEffect(() => {
    const calculatedEmi = calculateEMI(loanAmount, interestRate, loanDuration);
    const repay = calculateTotalRepayment(calculatedEmi, loanDuration, processingFee);
    const interest = calculateTotalInterest(repay, loanAmount, processingFee);
    
    setEmi(calculatedEmi);
    setTotalRepay(repay);
    setTotalInterest(interest);

    // Compute end date based on start date and duration
    try {
      const parsedStart = parseISO(startDate);
      const computedEnd = addMonths(parsedStart, loanDuration);
      setEndDate(format(computedEnd, 'yyyy-MM-dd'));
    } catch {
      setEndDate('');
    }

    if (!useCustomOutstanding) {
      setOutstandingBalance(loanAmount);
    }
  }, [loanAmount, interestRate, loanDuration, processingFee, startDate, useCustomOutstanding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!loanName || !loanProvider || !startDate) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      userId: user.uid,
      loanName,
      loanProvider,
      loanCategory,
      loanAmount,
      interestRate,
      processingFee,
      startDate,
      endDate,
      loanDuration,
      emiAmount: emi,
      dueDate,
      outstandingBalance,
      notes,
      status: 'Active',
      colorTag,
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveDocumentItem('loans', newLoan);
      await logActivity(user.uid, 'CREATE', 'LOAN', `Added new ${loanCategory} loan file: ${loanName}.`);
      router.push('/loans');
    } catch (error) {
      console.error('Failed to save loan:', error);
      alert('Error saving loan details.');
    }
  };

  const categories: Array<{ value: LoanCategory; label: string }> = [
    { value: 'Personal', label: 'Personal Loan' },
    { value: 'Education', label: 'Education Loan' },
    { value: 'Home', label: 'Home Loan' },
    { value: 'Vehicle', label: 'Vehicle Loan' },
    { value: 'Gold', label: 'Gold Loan' },
    { value: 'Business', label: 'Business Loan' },
    { value: 'Credit Card', label: 'Credit Card Loan' },
    { value: 'BNPL', label: 'BNPL / Buy Now Pay Later' },
    { value: 'Friends & Family', label: 'Friends & Family' },
    { value: 'Other', label: 'Other Debt' },
  ];

  const priorities: Array<{ value: LoanPriority; label: string }> = [
    { value: 'Critical', label: 'Critical (High Risk/High Interest)' },
    { value: 'High', label: 'High Priority' },
    { value: 'Medium', label: 'Medium Priority' },
    { value: 'Low', label: 'Low Priority' },
  ];

  const colorTags = [
    { value: 'indigo', label: 'Royal Indigo' },
    { value: 'rose', label: 'Sunset Crimson' },
    { value: 'amber', label: 'Amber Gold' },
    { value: 'emerald', label: 'Mint Emerald' },
  ];

  return (
    <Shell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={() => router.push('/loans')} size="sm">
            <ArrowLeft className="w-4.5 h-4.5 mr-1" /> Portfolio
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Onboard New Loan</h1>
            <p className="text-sm text-slate-500">Record a new active debt obligation for tracking.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Form Fields */}
          <div className="lg:col-span-2">
            <Card className="glass-card p-6 shadow-premium">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Loan Nickname *"
                    placeholder="e.g. SBI Education Loan"
                    value={loanName}
                    onChange={(e) => setLoanName(e.target.value)}
                    required
                  />
                  <Input
                    label="Loan Provider / Lender *"
                    placeholder="e.g. State Bank of India"
                    value={loanProvider}
                    onChange={(e) => setLoanProvider(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Loan Category *"
                    options={categories}
                    value={loanCategory}
                    onChange={(e) => setLoanCategory(e.target.value as LoanCategory)}
                  />
                  <Select
                    label="Urgency Priority *"
                    options={priorities}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as LoanPriority)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Loan Principal (₹) *"
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    required
                  />
                  <Input
                    label="Annual Interest (%) *"
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    required
                  />
                  <Input
                    label="Duration (Months) *"
                    type="number"
                    value={loanDuration}
                    onChange={(e) => setLoanDuration(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Processing Fees (₹)"
                    type="number"
                    value={processingFee}
                    onChange={(e) => setProcessingFee(Number(e.target.value))}
                  />
                  <Input
                    label="Start Date *"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                  <Input
                    label="Monthly Due Day *"
                    type="number"
                    min="1"
                    max="31"
                    value={dueDate}
                    onChange={(e) => setDueDate(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="customOutstanding"
                      checked={useCustomOutstanding}
                      onChange={(e) => setUseCustomOutstanding(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <label htmlFor="customOutstanding" className="text-xs font-semibold text-slate-500">
                      Specify custom outstanding balance (if loan is already partially repaid)
                    </label>
                  </div>

                  {useCustomOutstanding && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="overflow-hidden"
                    >
                      <Input
                        label="Current Outstanding Balance (₹) *"
                        type="number"
                        value={outstandingBalance}
                        onChange={(e) => setOutstandingBalance(Number(e.target.value))}
                        required
                      />
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Theme Color Tag"
                    options={colorTags}
                    value={colorTag}
                    onChange={(e) => setColorTag(e.target.value)}
                  />
                  <Input
                    label="Notes & Terms"
                    placeholder="Rate type, prepayment options, collateral details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full mt-4">
                  <Save className="w-4 h-4 mr-2" /> Log Loan Obligation
                </Button>
              </form>
            </Card>
          </div>

          {/* Real-time Calculation Amortization Preview */}
          <div className="space-y-4">
            <Card className="glass-card p-5 border border-indigo-100 bg-indigo-50/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full filter blur-xl" />
              <CardHeader className="p-0 pb-3 border-b border-indigo-100/50 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center">
                  <Sparkles className="w-4 h-4 text-indigo-500 mr-1.5 animate-pulse" /> Live Calculations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-4 space-y-4 text-xs font-semibold text-slate-600">
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100">
                  <span className="font-medium text-slate-500">Calculated EMI:</span>
                  <span className="text-base font-extrabold text-indigo-700">₹{Math.round(emi).toLocaleString()}</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-500">Total Interest Payable:</span>
                    <span className="text-slate-800 font-bold">₹{Math.round(totalInterest).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-500">Total Repayment Amount:</span>
                    <span className="text-slate-800 font-bold">₹{Math.round(totalRepay).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-500">Predicted Payoff Date:</span>
                    <span className="text-slate-800 font-bold">{endDate || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-[10px] text-slate-400 font-medium leading-relaxed">
                  Calculations derived dynamically using standard compound interest amortization formulas.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
