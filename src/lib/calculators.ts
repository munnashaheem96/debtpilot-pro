import { Loan, Repayment, SavingsGoal, Income, Expense, Budget, EmergencyFund } from '@/types';
import { differenceInDays, parseISO, addMonths, format, isAfter, isBefore, startOfMonth } from 'date-fns';

/**
 * Calculates the monthly EMI for a loan using standard amortization formula.
 * EMI = [P x R x (1+R)^N]/[((1+R)^N)-1]
 */
export function calculateEMI(principal: number, annualRate: number, durationMonths: number): number {
  if (annualRate === 0) return principal / durationMonths;
  const r = annualRate / 12 / 100; // Monthly interest rate
  const n = durationMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return isNaN(emi) || !isFinite(emi) ? 0 : Math.round(emi * 100) / 100;
}

/**
 * Calculates total repayment amount (EMI * duration + processing fee)
 */
export function calculateTotalRepayment(emi: number, durationMonths: number, processingFee: number): number {
  return Math.round((emi * durationMonths + processingFee) * 100) / 100;
}

/**
 * Calculates total interest payable
 */
export function calculateTotalInterest(totalRepayment: number, principal: number, processingFee: number): number {
  return Math.round((totalRepayment - principal - processingFee) * 100) / 100;
}

/**
 * Calculates the next due date for a loan based on its due date (day of month)
 */
export function calculateNextDueDate(dueDay: number, startDateStr: string): string {
  const today = new Date();
  let targetYear = today.getFullYear();
  let targetMonth = today.getMonth(); // 0-indexed

  // Construct target due date for this month
  let dueDate = new Date(targetYear, targetMonth, dueDay);

  // If due date for this month has already passed, set it to next month
  if (isBefore(dueDate, today)) {
    dueDate = new Date(targetYear, targetMonth + 1, dueDay);
  }

  // Handle month overflows (e.g. 31st on a 30-day month)
  return format(dueDate, 'yyyy-MM-dd');
}

/**
 * Core Loan Coverage calculations
 */
export interface CoverageResult {
  loanId: string;
  loanName: string;
  emiAmount: number;
  nextDueDate: string;
  daysRemaining: number;
  paidAmountThisMonth: number;
  amountRequired: number; // EMI - paidAmountThisMonth
  dailySavingsRequired: number;
  weeklySavingsRequired: number;
  riskStatus: 'Safe' | 'Warning' | 'Critical';
  shortfallExpected: number;
  message: string;
}

export function calculateLoanCoverage(
  loan: Loan,
  repayments: Repayment[],
  currentCashAvailable: number
): CoverageResult {
  const nextDueDateStr = calculateNextDueDate(loan.dueDate, loan.startDate);
  const nextDueDate = parseISO(nextDueDateStr);
  const today = new Date();
  
  // Days remaining (minimum 1 day to avoid divide by zero)
  const daysRemaining = Math.max(1, differenceInDays(nextDueDate, today));
  const weeksRemaining = Math.max(0.1, daysRemaining / 7);

  // Calculate payments made for the current billing cycle (this month)
  const currentMonthStart = startOfMonth(nextDueDate);
  const paidThisCycle = repayments
    .filter(
      (r) =>
        r.loanId === loan.id &&
        (r.status === 'Paid' || r.status === 'Partially Paid') &&
        !isBefore(parseISO(r.date), currentMonthStart) &&
        !isAfter(parseISO(r.date), nextDueDate)
    )
    .reduce((sum, r) => sum + r.amount, 0);

  const amountRequired = Math.max(0, loan.emiAmount - paidThisCycle);
  const dailySavingsRequired = Math.round((amountRequired / daysRemaining) * 100) / 100;
  const weeklySavingsRequired = Math.round((amountRequired / weeksRemaining) * 100) / 100;

  // Determine risk and shortfall
  const shortfallExpected = Math.max(0, amountRequired - currentCashAvailable);
  
  let riskStatus: 'Safe' | 'Warning' | 'Critical' = 'Safe';
  if (shortfallExpected > 0) {
    riskStatus = 'Critical';
  } else if (daysRemaining <= 5 && amountRequired > 0) {
    riskStatus = 'Warning';
  }

  let message = '';
  if (amountRequired === 0) {
    message = 'Fully covered for this month';
  } else {
    message = `Need ₹${Math.round(dailySavingsRequired)}/day for next ${daysRemaining} days`;
  }

  return {
    loanId: loan.id,
    loanName: loan.loanName,
    emiAmount: loan.emiAmount,
    nextDueDate: nextDueDateStr,
    daysRemaining,
    paidAmountThisMonth: paidThisCycle,
    amountRequired,
    dailySavingsRequired,
    weeklySavingsRequired,
    riskStatus,
    shortfallExpected,
    message,
  };
}

/**
 * Prepayment Settlement Planner
 * Computes savings (interest + months saved) given an extra lump sum prepayment
 */
export interface PrepaymentResult {
  interestSaved: number;
  monthsReduced: number;
  newPayoffDate: string;
  originalPayoffDate: string;
  amortizationSchedule: Array<{
    month: number;
    payment: number;
    interest: number;
    principal: number;
    balance: number;
  }>;
}

export function calculatePrepayment(
  principal: number,
  annualRate: number,
  durationMonths: number,
  startDateStr: string,
  extraPayment: number
): PrepaymentResult {
  const r = annualRate / 12 / 100;
  const emi = calculateEMI(principal, annualRate, durationMonths);
  const startDate = parseISO(startDateStr);

  // 1. Original Schedule
  let balOriginal = principal;
  let totalInterestOriginal = 0;
  for (let i = 0; i < durationMonths; i++) {
    const interest = balOriginal * r;
    const principalPaid = Math.min(balOriginal, emi - interest);
    totalInterestOriginal += interest;
    balOriginal -= principalPaid;
    if (balOriginal <= 0) break;
  }

  // 2. Prepayment Schedule (apply prepayment at Month 1)
  let balNew = Math.max(0, principal - extraPayment);
  let totalInterestNew = 0;
  let monthsNew = 0;
  const amortizationSchedule = [];

  while (balNew > 0 && monthsNew < durationMonths * 2) {
    monthsNew++;
    const interest = balNew * r;
    const principalPaid = Math.min(balNew, emi - interest);
    totalInterestNew += interest;
    balNew -= principalPaid;
    
    amortizationSchedule.push({
      month: monthsNew,
      payment: Math.min(balNew + interest + principalPaid, emi),
      interest: Math.round(interest * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      balance: Math.round(Math.max(0, balNew) * 100) / 100,
    });

    if (balNew <= 0) break;
  }

  const interestSaved = Math.round(Math.max(0, totalInterestOriginal - totalInterestNew));
  const monthsReduced = Math.max(0, durationMonths - monthsNew);
  const originalPayoffDate = format(addMonths(startDate, durationMonths), 'yyyy-MM-dd');
  const newPayoffDate = format(addMonths(startDate, monthsNew), 'yyyy-MM-dd');

  return {
    interestSaved,
    monthsReduced,
    newPayoffDate,
    originalPayoffDate,
    amortizationSchedule,
  };
}

/**
 * Calculates Emergency Fund Months Covered and status
 */
export function calculateEmergencyFundDetails(
  current: number,
  target: number,
  monthlyExpense: number
): { monthsCovered: number; status: 'Safe' | 'Moderate' | 'Risky' } {
  if (monthlyExpense <= 0) {
    return { monthsCovered: 99, status: 'Safe' };
  }
  const monthsCovered = Math.round((current / monthlyExpense) * 10) / 10;
  let status: 'Safe' | 'Moderate' | 'Risky' = 'Risky';
  if (monthsCovered >= 6) {
    status = 'Safe';
  } else if (monthsCovered >= 3) {
    status = 'Moderate';
  }
  return { monthsCovered, status };
}

/**
 * Financial Health Score Calculator (0-100)
 */
export function calculateFinancialHealthScore(params: {
  monthlyIncome: number;
  monthlyExpense: number;
  totalDebtEMI: number;
  currentSavings: number;
  emergencyFundStatus: 'Safe' | 'Moderate' | 'Risky';
  budgets: Budget[];
}): { score: number; recommendations: string[] } {
  const { monthlyIncome, monthlyExpense, totalDebtEMI, currentSavings, emergencyFundStatus, budgets } = params;

  if (monthlyIncome <= 0) {
    return {
      score: 30,
      recommendations: ['Establish a regular monthly source of income to construct your financial foundation.'],
    };
  }

  // 1. Savings Rate Score (Max 25 pts)
  // Target: >= 20% of income saved
  const savingsRate = Math.max(0, (monthlyIncome - monthlyExpense - totalDebtEMI) / monthlyIncome);
  const savingsRateScore = Math.min(25, Math.round(savingsRate * 100 * 1.25));

  // 2. Debt-To-Income (DTI) Ratio Score (Max 25 pts)
  // Target: <= 30% of income spent on EMI
  const dti = totalDebtEMI / monthlyIncome;
  let debtScore = 0;
  if (dti <= 0.15) {
    debtScore = 25;
  } else if (dti <= 0.3) {
    debtScore = 20;
  } else if (dti <= 0.45) {
    debtScore = 12;
  } else if (dti <= 0.6) {
    debtScore = 5;
  } else {
    debtScore = 0;
  }

  // 3. Emergency Fund Score (Max 20 pts)
  let emergencyScore = 5;
  if (emergencyFundStatus === 'Safe') emergencyScore = 20;
  else if (emergencyFundStatus === 'Moderate') emergencyScore = 12;

  // 4. Budget Discipline Score (Max 15 pts)
  // Percentage of categories kept under target
  let budgetDisciplineScore = 15;
  if (budgets.length > 0) {
    const overspentCount = budgets.filter((b) => b.spentAmount > b.limitAmount).length;
    const withinBudgetRate = (budgets.length - overspentCount) / budgets.length;
    budgetDisciplineScore = Math.round(withinBudgetRate * 15);
  }

  // 5. Cash Reserves Score (Max 15 pts)
  // Target: positive monthly cash flow
  const netCashFlow = monthlyIncome - monthlyExpense - totalDebtEMI;
  const cashReservesScore = netCashFlow > 0 ? 15 : Math.max(0, 15 + Math.round((netCashFlow / monthlyIncome) * 15));

  const score = Math.max(0, Math.min(100, savingsRateScore + debtScore + emergencyScore + budgetDisciplineScore + cashReservesScore));

  // Generate Recommendations
  const recommendations: string[] = [];
  if (dti > 0.35) {
    recommendations.push(
      `Your Debt-to-Income ratio is high at ${Math.round(
        dti * 100
      )}%. Prioritize the Avalanche method (highest interest first) to pay down debt.`
    );
  }
  if (savingsRate < 0.1) {
    recommendations.push(
      'Your savings rate is below 10%. Try implementing the 50/30/20 rule: 50% needs, 30% wants, and 20% savings.'
    );
  }
  if (emergencyFundStatus === 'Risky') {
    recommendations.push(
      'Emergency fund is in the Risky zone. Target saving at least 3-6 months of basic living expenses.'
    );
  } else if (emergencyFundStatus === 'Moderate') {
    recommendations.push(
      'Your emergency fund is Moderate. Try saving a little more to build a full 6-month buffer.'
    );
  }
  if (budgets.some((b) => b.spentAmount > b.limitAmount)) {
    recommendations.push(
      'You have overspent in some budget categories this month. Set up real-time spending alerts.'
    );
  }
  if (netCashFlow < 0) {
    recommendations.push(
      'Your monthly cash flow is negative. Review and cut back on non-essential subscriptions and shopping.'
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('Outstanding job! Keep maintaining your current debt payoff schedule and saving rates.');
  }

  return { score, recommendations };
}
