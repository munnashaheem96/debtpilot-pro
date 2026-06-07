'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchCollection, logActivity } from '@/lib/db';
import { Loan, Repayment, SavingsGoal, Income, Expense } from '@/types';
import { FileSpreadsheet, Download, FileText, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const { user } = useAuth();
  
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [exportLoans, setExportLoans] = useState(true);
  const [exportRepayments, setExportRepayments] = useState(true);
  const [exportSavings, setExportSavings] = useState(true);
  const [exportLedger, setExportLedger] = useState(true);

  useEffect(() => {
    if (user) {
      const loadReportsData = async () => {
        try {
          const lData = await fetchCollection<Loan>('loans', user.uid);
          const rData = await fetchCollection<Repayment>('repayments', user.uid);
          const sData = await fetchCollection<SavingsGoal>('savingsGoals', user.uid);
          const iData = await fetchCollection<Income>('income', user.uid);
          const eData = await fetchCollection<Expense>('expenses', user.uid);
          
          setLoans(lData);
          setRepayments(rData);
          setSavings(sData);
          setIncomes(iData);
          setExpenses(eData);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      loadReportsData();
    }
  }, [user]);

  // CSV Exporter
  const handleExportCSV = () => {
    if (!user) return;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (exportLoans && loans.length > 0) {
      csvContent += '--- LOANS PORTFOLIO ---\n';
      csvContent += 'Name,Provider,Category,Original Amount,Outstanding,EMI,Interest,Priority,Status\n';
      loans.forEach((l) => {
        csvContent += `"${l.loanName}","${l.loanProvider}","${l.loanCategory}",${l.loanAmount},${l.outstandingBalance},${l.emiAmount},${l.interestRate},"${l.priority}","${l.status}"\n`;
      });
      csvContent += '\n';
    }

    if (exportRepayments && repayments.length > 0) {
      csvContent += '--- REPAYMENTS LEDGER ---\n';
      csvContent += 'Date,Loan,Amount,Method,Reference,Notes\n';
      repayments.forEach((r) => {
        csvContent += `"${r.date}","${r.loanName}",${r.amount},"${r.method}","${r.referenceNumber}","${r.notes}"\n`;
      });
      csvContent += '\n';
    }

    if (exportSavings && savings.length > 0) {
      csvContent += '--- SAVINGS GOALS ---\n';
      csvContent += 'Goal,Target,Current,Target Date,Category\n';
      savings.forEach((s) => {
        csvContent += `"${s.goalName}",${s.targetAmount},${s.currentAmount},"${s.targetDate}","${s.category}"\n`;
      });
      csvContent += '\n';
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `debtpilot_statement_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logActivity(user.uid, 'SYSTEM', 'DOCUMENT', 'Exported financial data to CSV.');
  };

  // Excel Exporter
  const handleExportExcel = () => {
    if (!user) return;
    const wb = XLSX.utils.book_new();

    if (exportLoans && loans.length > 0) {
      const wsData = loans.map((l) => ({
        'Loan Name': l.loanName,
        Lender: l.loanProvider,
        Category: l.loanCategory,
        'Original Amount (₹)': l.loanAmount,
        'Outstanding Balance (₹)': l.outstandingBalance,
        'Monthly EMI (₹)': l.emiAmount,
        'Interest Rate (%)': l.interestRate,
        Priority: l.priority,
        Status: l.status,
      }));
      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    }

    if (exportRepayments && repayments.length > 0) {
      const wsData = repayments.map((r) => ({
        Date: r.date,
        'Loan Reference': r.loanName,
        'Amount Paid (₹)': r.amount,
        Method: r.method,
        'Reference Number': r.referenceNumber,
        Notes: r.notes,
      }));
      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Repayments');
    }

    if (exportSavings && savings.length > 0) {
      const wsData = savings.map((s) => ({
        'Goal Name': s.goalName,
        'Target Amount (₹)': s.targetAmount,
        'Current Amount (₹)': s.currentAmount,
        'Target Date': s.targetDate,
        Category: s.category,
      }));
      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Savings');
    }

    XLSX.writeFile(wb, `debtpilot_statement_${Date.now()}.xlsx`);
    logActivity(user.uid, 'SYSTEM', 'DOCUMENT', 'Exported financial data to Excel.');
  };

  // PDF Exporter
  const handleExportPDF = () => {
    if (!user) return;
    const doc = new jsPDF() as any;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // indigo
    doc.text('DebtPilot Pro', 14, 20);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Premium Financial Statement', 14, 26);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 31);
    doc.text(`Account Profile: ${user.displayName} (${user.email})`, 14, 36);

    let startY = 45;

    // 1. Loans Table
    if (exportLoans && loans.length > 0) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Active Loans Portfolio', 14, startY);
      
      const loanHeaders = [['Loan Name', 'Lender', 'APR', 'EMI', 'Outstanding']];
      const loanRows = loans.map((l) => [
        l.loanName,
        l.loanProvider,
        `${l.interestRate}%`,
        `Rs. ${l.emiAmount.toLocaleString()}`,
        `Rs. ${l.outstandingBalance.toLocaleString()}`,
      ]);

      doc.autoTable({
        startY: startY + 4,
        head: loanHeaders,
        body: loanRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9, cellPadding: 2.5 },
      });

      startY = doc.lastAutoTable.finalY + 12;
    }

    // 2. Repayments Table
    if (exportRepayments && repayments.length > 0) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Repayments Log History', 14, startY);

      const repayHeaders = [['Date', 'Loan', 'Amount', 'Method', 'Reference']];
      const repayRows = repayments.map((r) => [
        r.date,
        r.loanName,
        `Rs. ${r.amount.toLocaleString()}`,
        r.method,
        r.referenceNumber || 'N/A',
      ]);

      doc.autoTable({
        startY: startY + 4,
        head: repayHeaders,
        body: repayRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9, cellPadding: 2.5 },
      });

      startY = doc.lastAutoTable.finalY + 12;
    }

    // 3. Savings Goals
    if (exportSavings && savings.length > 0) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Savings Goals Milestones', 14, startY);

      const savingsHeaders = [['Goal Name', 'Category', 'Target', 'Saved', 'Target Date']];
      const savingsRows = savings.map((s) => [
        s.goalName,
        s.category,
        `Rs. ${s.targetAmount.toLocaleString()}`,
        `Rs. ${s.currentAmount.toLocaleString()}`,
        s.targetDate,
      ]);

      doc.autoTable({
        startY: startY + 4,
        head: savingsHeaders,
        body: savingsRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9, cellPadding: 2.5 },
      });
    }

    doc.save(`debtpilot_statement_${Date.now()}.pdf`);
    logActivity(user.uid, 'SYSTEM', 'DOCUMENT', 'Exported financial statement to PDF.');
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Initializing reports configurations...</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Statements</h1>
          <p className="text-sm text-slate-500">Compile and export transaction ledgers or loan amortization files.</p>
        </div>

        <Card className="glass-card shadow-premium p-6 space-y-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Configure Export Dataset</CardTitle>
            <CardDescription>Select which collections you want to compile in the statement</CardDescription>
          </CardHeader>
          
          <CardContent className="p-0 space-y-4 pt-4">
            {/* Selection Checkboxes */}
            <div className="space-y-3">
              <button
                onClick={() => setExportLoans(!exportLoans)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-left text-xs font-semibold text-slate-800 transition"
              >
                {exportLoans ? (
                  <CheckSquare className="w-5 h-5 text-brand-500 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300 shrink-0" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold">Include Loans Portfolio</p>
                  <p className="text-[10px] text-slate-400 font-medium">Export original amount, outstanding balances, and APR values</p>
                </div>
              </button>

              <button
                onClick={() => setExportRepayments(!exportRepayments)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-left text-xs font-semibold text-slate-800 transition"
              >
                {exportRepayments ? (
                  <CheckSquare className="w-5 h-5 text-brand-500 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300 shrink-0" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold">Include Repayments History</p>
                  <p className="text-[10px] text-slate-400 font-medium">Export all transaction records, methods, and reference keys</p>
                </div>
              </button>

              <button
                onClick={() => setExportSavings(!exportSavings)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-left text-xs font-semibold text-slate-800 transition"
              >
                {exportSavings ? (
                  <CheckSquare className="w-5 h-5 text-brand-500 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300 shrink-0" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold">Include Savings Milestones</p>
                  <p className="text-[10px] text-slate-400 font-medium">Export savings goals targets, current amounts, and dates</p>
                </div>
              </button>
            </div>

            {/* Export format buttons */}
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase block">Select Export Channel</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button variant="secondary" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" /> Download CSV
                </Button>
                <Button variant="secondary" onClick={handleExportExcel}>
                  <FileSpreadsheet className="w-4.5 h-4.5 mr-2 text-emerald-600" /> Download Excel
                </Button>
                <Button onClick={handleExportPDF}>
                  <FileText className="w-4.5 h-4.5 mr-2" /> Export PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
