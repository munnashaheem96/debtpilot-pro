export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  onboarded: boolean;
}

export type LoanCategory =
  | 'Personal'
  | 'Education'
  | 'Home'
  | 'Vehicle'
  | 'Gold'
  | 'Business'
  | 'Credit Card'
  | 'BNPL'
  | 'Friends & Family'
  | 'Other';

export type LoanStatus = 'Active' | 'Closed' | 'Archived';

export type LoanPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Loan {
  id: string;
  userId: string;
  loanName: string;
  loanProvider: string;
  loanCategory: LoanCategory;
  loanAmount: number;
  interestRate: number; // in % (e.g. 10.5 for 10.5%)
  processingFee: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  loanDuration: number; // in months
  emiAmount: number;
  dueDate: number; // Day of the month (e.g., 5 for 5th of every month)
  outstandingBalance: number;
  notes: string;
  status: LoanStatus;
  colorTag: string; // Hex color code or Tailwind color class prefix
  priority: LoanPriority;
  createdAt: string;
  updatedAt: string;
}

export type RepaymentStatus = 'Paid' | 'Overdue' | 'Partially Paid';

export interface Repayment {
  id: string;
  userId: string;
  loanId: string;
  loanName: string; // De-normalized for easy UI rendering
  date: string; // YYYY-MM-DD
  amount: number;
  method: string; // Cash, Bank Transfer, UPI, Credit Card, etc.
  notes: string;
  referenceNumber: string;
  status: RepaymentStatus;
  createdAt: string;
}

export type SavingsCategory = 'Emergency Fund' | 'Retirement' | 'House' | 'Car' | 'Travel' | 'Education' | 'Gadget' | 'Investment' | 'Other';

export interface SavingsGoal {
  id: string;
  userId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category: SavingsCategory;
  createdAt: string;
  updatedAt: string;
}

export type IncomeCategory = 'Salary' | 'Freelancing' | 'Business' | 'Investments' | 'Other';

export type RecurrenceType = 'None' | 'Weekly' | 'Monthly' | 'Yearly';

export interface Income {
  id: string;
  userId: string;
  source: string;
  category: IncomeCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
  lastGeneratedDate?: string; // Track when the last recurrence was created
  notes: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'Food'
  | 'Rent'
  | 'Fuel'
  | 'Shopping'
  | 'Bills'
  | 'Entertainment'
  | 'Medical'
  | 'Education'
  | 'Travel'
  | 'Other';

export interface Expense {
  id: string;
  userId: string;
  merchant: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
  lastGeneratedDate?: string; // Track when last recurrence was created
  notes: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: ExpenseCategory;
  limitAmount: number;
  spentAmount: number;
  month: string; // YYYY-MM
  createdAt: string;
}

export type NotificationType = 'EMI' | 'Overdue' | 'Savings' | 'Budget' | 'System';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: NotificationType;
  date: string; // ISO date string
  read: boolean;
  linkedId?: string; // ID of the related loan, budget, savings goal, etc.
  createdAt: string;
}

export interface DocumentFile {
  id: string;
  userId: string;
  title: string;
  category: 'Agreement' | 'Statement' | 'Bank' | 'Personal' | 'Other';
  fileUrl: string;
  fileName: string;
  fileSize: number; // in bytes
  uploadedAt: string;
}

export interface EmergencyFund {
  id: string;
  userId: string;
  currentAmount: number;
  targetAmount: number;
  monthlyExpensesRequired: number; // Target monthly expenses to cover
  monthsCovered: number; // currentAmount / monthlyExpensesRequired
  status: 'Safe' | 'Moderate' | 'Risky';
  updatedAt: string;
}

export interface NetWorthSnapshot {
  id: string;
  userId: string;
  date: string; // YYYY-MM
  assets: {
    cash: number;
    savings: number;
    investments: number;
    gold: number;
    property: number;
    other: number;
  };
  liabilities: {
    loans: number;
    creditCards: number;
    otherDebts: number;
  };
  netWorth: number; // assetsTotal - liabilitiesTotal
  createdAt: string;
}

export interface FinancialHealth {
  id: string;
  userId: string;
  score: number; // 0-100
  savingsRate: number; // % of income saved
  debtRatio: number; // % of income spent on debt repayment (DTI)
  emergencyFundStatus: 'Safe' | 'Moderate' | 'Risky';
  budgetDiscipline: number; // % of budget categories kept under limits
  recommendations: string[];
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT' | 'SETTLEMENT' | 'SYSTEM';
  entityType: 'LOAN' | 'REPAYMENT' | 'SAVINGS' | 'INCOME' | 'EXPENSE' | 'BUDGET' | 'DOCUMENT' | 'SYSTEM';
  message: string;
  details?: string;
  timestamp: string; // ISO String
}
