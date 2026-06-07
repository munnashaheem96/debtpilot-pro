import { db, isFirebaseConfigured } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  DocumentData,
} from 'firebase/firestore';
import {
  Loan,
  Repayment,
  SavingsGoal,
  Income,
  Expense,
  Budget,
  Notification,
  DocumentFile,
  EmergencyFund,
  NetWorthSnapshot,
  FinancialHealth,
  ActivityLog,
} from '@/types';

// Helper to check if we should use Firestore
const useFirestore = (): boolean => {
  return isFirebaseConfigured && db !== null;
};

// -------------------------------------------------------------
// IN-MEMORY / LOCAL STORAGE MOCK DATABASE PREPOPULATION
// -------------------------------------------------------------
const MOCK_STORAGE_KEY = 'debtpilot_mock_db';

interface MockDB {
  loans: Loan[];
  repayments: Repayment[];
  savingsGoals: SavingsGoal[];
  income: Income[];
  expenses: Expense[];
  budgets: Budget[];
  notifications: Notification[];
  documents: DocumentFile[];
  emergencyFunds: EmergencyFund[];
  netWorthSnapshots: NetWorthSnapshot[];
  financialHealth: FinancialHealth[];
  activityLogs: ActivityLog[];
}

const DEFAULT_MOCK_DB = (userId: string): MockDB => {
  const nowStr = new Date().toISOString();
  const todayStr = new Date().toISOString().split('T')[0];
  const lastMonthStr = addMonthsToDate(todayStr, -1);
  const nextMonthStr = addMonthsToDate(todayStr, 1);

  return {
    loans: [
      {
        id: 'loan-1',
        userId,
        loanName: 'HDFC Home Loan',
        loanProvider: 'HDFC Bank',
        loanCategory: 'Home',
        loanAmount: 4500000,
        interestRate: 8.5,
        processingFee: 10000,
        startDate: '2022-01-10',
        endDate: '2037-01-10',
        loanDuration: 180,
        emiAmount: 44312,
        dueDate: 5,
        outstandingBalance: 3850000,
        notes: 'Home mortgage for apartment.',
        status: 'Active',
        colorTag: 'indigo',
        priority: 'Critical',
        createdAt: nowStr,
        updatedAt: nowStr,
      },
      {
        id: 'loan-2',
        userId,
        loanName: 'SBI Education Loan',
        loanProvider: 'State Bank of India',
        loanCategory: 'Education',
        loanAmount: 800000,
        interestRate: 9.2,
        processingFee: 5000,
        startDate: '2023-07-01',
        endDate: '2030-07-01',
        loanDuration: 84,
        emiAmount: 13012,
        dueDate: 10,
        outstandingBalance: 550000,
        notes: 'MBA program tuition fee loan.',
        status: 'Active',
        colorTag: 'amber',
        priority: 'High',
        createdAt: nowStr,
        updatedAt: nowStr,
      },
      {
        id: 'loan-3',
        userId,
        loanName: 'ICICI Amazon Pay Card',
        loanProvider: 'ICICI Bank',
        loanCategory: 'Credit Card',
        loanAmount: 120000,
        interestRate: 36,
        processingFee: 0,
        startDate: '2026-03-01',
        endDate: '2026-09-01',
        loanDuration: 6,
        emiAmount: 22170,
        dueDate: 20,
        outstandingBalance: 65000,
        notes: 'Laptop purchase EMI scheme.',
        status: 'Active',
        colorTag: 'rose',
        priority: 'Critical',
        createdAt: nowStr,
        updatedAt: nowStr,
      },
    ],
    repayments: [
      {
        id: 'repay-1',
        userId,
        loanId: 'loan-3',
        loanName: 'ICICI Amazon Pay Card',
        date: todayStr,
        amount: 22170,
        method: 'UPI (GPay)',
        notes: 'June installment paid in full.',
        referenceNumber: 'UPI9834274982',
        status: 'Paid',
        createdAt: nowStr,
      },
      {
        id: 'repay-2',
        userId,
        loanId: 'loan-1',
        loanName: 'HDFC Home Loan',
        date: addDaysToDate(todayStr, -3),
        amount: 44312,
        method: 'Net Banking',
        notes: 'Auto-debited from salary account.',
        referenceNumber: 'TXN82374982',
        status: 'Paid',
        createdAt: nowStr,
      },
    ],
    savingsGoals: [
      {
        id: 'goal-1',
        userId,
        goalName: 'Emergency Reserve',
        targetAmount: 500000,
        currentAmount: 280000,
        targetDate: '2026-12-31',
        category: 'Emergency Fund',
        createdAt: nowStr,
        updatedAt: nowStr,
      },
      {
        id: 'goal-2',
        userId,
        goalName: 'Next Car Downpayment',
        targetAmount: 300000,
        currentAmount: 85000,
        targetDate: '2027-06-30',
        category: 'Car',
        createdAt: nowStr,
        updatedAt: nowStr,
      },
    ],
    income: [
      {
        id: 'income-1',
        userId,
        source: 'Acme Corp Salary',
        category: 'Salary',
        amount: 175000,
        date: '2026-06-01',
        recurrence: 'Monthly',
        notes: 'Primary monthly corporate job paycheck.',
        createdAt: nowStr,
      },
      {
        id: 'income-2',
        userId,
        source: 'Fintech Design Project',
        category: 'Freelancing',
        amount: 45000,
        date: '2026-06-05',
        recurrence: 'None',
        notes: 'Web application UX dashboard designs.',
        createdAt: nowStr,
      },
    ],
    expenses: [
      {
        id: 'exp-1',
        userId,
        merchant: 'Apartment Owner',
        category: 'Rent',
        amount: 32000,
        date: '2026-06-01',
        recurrence: 'Monthly',
        notes: 'Monthly residential flat rental.',
        createdAt: nowStr,
      },
      {
        id: 'exp-2',
        userId,
        merchant: 'Supermarket Store',
        category: 'Food',
        amount: 8500,
        date: '2026-06-03',
        recurrence: 'None',
        notes: 'Weekly pantry groceries refill.',
        createdAt: nowStr,
      },
      {
        id: 'exp-3',
        userId,
        merchant: 'HP Fuel Station',
        category: 'Fuel',
        amount: 3500,
        date: '2026-06-04',
        recurrence: 'None',
        notes: 'SUV fuel tank full.',
        createdAt: nowStr,
      },
      {
        id: 'exp-4',
        userId,
        merchant: 'ACT Fibernet',
        category: 'Bills',
        amount: 1199,
        date: '2026-06-05',
        recurrence: 'Monthly',
        notes: '1 Gbps broadband connection.',
        createdAt: nowStr,
      },
    ],
    budgets: [
      {
        id: 'budget-1',
        userId,
        category: 'Food',
        limitAmount: 20000,
        spentAmount: 8500,
        month: '2026-06',
        createdAt: nowStr,
      },
      {
        id: 'budget-2',
        userId,
        category: 'Fuel',
        limitAmount: 10000,
        spentAmount: 3500,
        month: '2026-06',
        createdAt: nowStr,
      },
      {
        id: 'budget-3',
        userId,
        category: 'Bills',
        limitAmount: 15000,
        spentAmount: 1199,
        month: '2026-06',
        createdAt: nowStr,
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        userId,
        message: 'Upcoming HDFC Home Loan EMI due in 5 days (₹44,312).',
        type: 'EMI',
        date: nowStr,
        read: false,
        linkedId: 'loan-1',
        createdAt: nowStr,
      },
      {
        id: 'notif-2',
        userId,
        message: 'Alert: Food budget is currently at 42.5% usage.',
        type: 'Budget',
        date: nowStr,
        read: true,
        linkedId: 'budget-1',
        createdAt: nowStr,
      },
    ],
    documents: [
      {
        id: 'doc-1',
        userId,
        title: 'HDFC Loan Agreement',
        category: 'Agreement',
        fileUrl: '#mock-agreement-url',
        fileName: 'hdfc_mortgage_signed.pdf',
        fileSize: 4210982,
        uploadedAt: nowStr,
      },
      {
        id: 'doc-2',
        userId,
        title: 'SBI Statement - May 2026',
        category: 'Statement',
        fileUrl: '#mock-statement-url',
        fileName: 'sbi_statement_may_2026.pdf',
        fileSize: 1120349,
        uploadedAt: nowStr,
      },
    ],
    emergencyFunds: [
      {
        id: 'em-fund',
        userId,
        currentAmount: 280000,
        targetAmount: 600000,
        monthlyExpensesRequired: 100000,
        monthsCovered: 2.8,
        status: 'Moderate',
        updatedAt: nowStr,
      },
    ],
    netWorthSnapshots: [
      {
        id: 'nw-1',
        userId,
        date: '2026-04',
        assets: { cash: 120000, savings: 200000, investments: 400000, gold: 150000, property: 5000000, other: 0 },
        liabilities: { loans: 4500000, creditCards: 45000, otherDebts: 0 },
        netWorth: 1325000,
        createdAt: nowStr,
      },
      {
        id: 'nw-2',
        userId,
        date: '2026-05',
        assets: { cash: 150000, savings: 240000, investments: 410000, gold: 155000, property: 5000000, other: 0 },
        liabilities: { loans: 4480000, creditCards: 55000, otherDebts: 0 },
        netWorth: 1420000,
        createdAt: nowStr,
      },
      {
        id: 'nw-3',
        userId,
        date: '2026-06',
        assets: { cash: 185000, savings: 280000, investments: 430000, gold: 160000, property: 5000000, other: 0 },
        liabilities: { loans: 4465000, creditCards: 65000, otherDebts: 0 },
        netWorth: 1530000,
        createdAt: nowStr,
      },
    ],
    financialHealth: [
      {
        id: 'health',
        userId,
        score: 72,
        savingsRate: 25,
        debtRatio: 45,
        emergencyFundStatus: 'Moderate',
        budgetDiscipline: 100,
        recommendations: [
          'Your Debt-to-Income (DTI) ratio is slightly high at 45% due to your home loan mortgage. Try to pay off your ICICI credit card balance fully to improve DTI.',
          'Consider boosting your Emergency Reserve to cover at least 6 months of expenses.',
        ],
        updatedAt: nowStr,
      },
    ],
    activityLogs: [
      {
        id: 'log-1',
        userId,
        actionType: 'CREATE',
        entityType: 'LOAN',
        message: 'Added HDFC Home Loan of ₹4,500,000.',
        timestamp: nowStr,
      },
      {
        id: 'log-2',
        userId,
        actionType: 'PAYMENT',
        entityType: 'REPAYMENT',
        message: 'Logged payment of ₹22,170 for ICICI Amazon Pay Card.',
        timestamp: nowStr,
      },
    ],
  };
};

function addMonthsToDate(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Read mock DB from localStorage
function getLocalDB(userId: string): MockDB {
  if (typeof window === 'undefined') return DEFAULT_MOCK_DB(userId);
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!data) {
    const db = DEFAULT_MOCK_DB(userId);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
    return db;
  }
  try {
    return JSON.parse(data);
  } catch {
    const db = DEFAULT_MOCK_DB(userId);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
    return db;
  }
}

// Write mock DB to localStorage
function saveLocalDB(db: MockDB) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
  }
}

// -------------------------------------------------------------
// DATABASE UTILITIES (FIRESTORE + LOCALSTORAGE FALLBACK)
// -------------------------------------------------------------

export async function fetchCollection<T>(collectionName: keyof MockDB, userId: string): Promise<T[]> {
  if (useFirestore()) {
    try {
      const q = query(
        collection(db!, collectionName),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const items: T[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      return items;
    } catch (error) {
      console.warn(`Firestore read failed for ${collectionName}, falling back to localStorage:`, error);
    }
  }

  // Fallback
  const ldb = getLocalDB(userId);
  return (ldb[collectionName] || []) as unknown as T[];
}

export async function saveDocumentItem<T extends { id: string; userId: string }>(
  collectionName: keyof MockDB,
  item: T
): Promise<void> {
  if (useFirestore()) {
    try {
      await setDoc(doc(db!, collectionName, item.id), item as DocumentData);
      return;
    } catch (error) {
      console.warn(`Firestore write failed for ${collectionName}, saving locally:`, error);
    }
  }

  // Fallback
  const ldb = getLocalDB(item.userId);
  const list = ldb[collectionName] as any[];
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.push(item);
  }
  saveLocalDB(ldb);
}

export async function deleteDocumentItem(
  collectionName: keyof MockDB,
  userId: string,
  itemId: string
): Promise<void> {
  if (useFirestore()) {
    try {
      await deleteDoc(doc(db!, collectionName, itemId));
      return;
    } catch (error) {
      console.warn(`Firestore delete failed for ${collectionName}, deleting locally:`, error);
    }
  }

  // Fallback
  const ldb = getLocalDB(userId);
  const list = ldb[collectionName] as any[];
  ldb[collectionName] = list.filter((x) => x.id !== itemId) as any;
  saveLocalDB(ldb);
}

// Helper to write an activity log
export async function logActivity(
  userId: string,
  actionType: ActivityLog['actionType'],
  entityType: ActivityLog['entityType'],
  message: string,
  details?: string
): Promise<void> {
  const log: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    actionType,
    entityType,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
  await saveDocumentItem('activityLogs', log);
}
