# 🧭 DebtPilot Pro

> **Track Loans. Master Debt. Grow Savings.**

DebtPilot Pro is a premium, production-grade fintech SaaS web application built with Next.js 15, TypeScript, Tailwind CSS, and Framer Motion. It acts as a comprehensive personal financial co-pilot—helping users track and optimize loans, compute dynamic EMI amortization schedules, plan prepayments, set savings milestones, and schedule budget alarms.

---

## 🌟 Key Features

### 1. Loan Coverage Engine (Smart Repayment System)
* **Daily/Weekly Savings Target Generator**: Computes the exact daily/weekly savings rate needed to cover upcoming EMIs before they are due (e.g. *"Need ₹145/day for next 12 days"*).
* **Shortfall Predictor**: Flags expected cash flow gaps early (*"Shortfall expected: ₹1,240"*).
* **Risk Categorization**: Tags loans dynamically as **Safe**, **Warning**, or **Critical** based on savings coverage thresholds.
* **Repayment Timeline**: Auto-generates a unified roadmap for all scheduled liabilities.

### 2. Multi-Loan Priority Dashboard
* **Dynamic Sorts**: Highlights loans due first, highest interest rates, and highest outstanding balances.
* **Priority Matrices**: Categorize debts as **Critical**, **High**, **Medium**, or **Low** to visualize where cash needs to go first.
* **Prepayment Settlement Planner**: Lets users simulate lump-sum payments to calculate exact interest savings and months shaved off their loan life.

### 3. Unified Financial Timeline
* A bank-statement style ledger showcasing chronological logs:
  * Repayments logged against active loans
  * Monthly/Weekly Recurring Income logs
  * Expenses categorized with merchant receipt tags
  * Savings deposits towards milestones
  * Automatic balance updates on outstanding debt items.

### 4. Interactive Financial Tools
* **AI Copilot Insights**: Evaluates a 0–100 **Financial Health Score** based on Debt-to-Income (DTI) ratios, budget adherence, and savings reserves, generating contextual financial recommendations.
* **Interactive Calendar**: Grid view showcasing due dates, payment markers, and savings deadlines with tooltip details.
* **Budget Planner**: Custom category budgeting limits with automated overspending warnings (flags triggers at 80% warning and 100% critical limits).
* **Reports Vault**: Custom client-side generators supporting downloads in **Excel (XLSX)**, **CSV**, and formatted **PDF** statements.
* **Document Vault**: Upload and link mortgage deeds, loan statements, and billing receipts.

---

## 🛠️ Technology Stack

* **Framework**: Next.js 15 (App Router with dynamic Client-Side rendering boundaries)
* **Language**: TypeScript (Production-grade type safety)
* **Styling**: Tailwind CSS (Clean fintech typography, HSL tailored palettes, glassmorphic cards)
* **Animations**: Framer Motion (Subtle micro-interactions, smooth sliding transitions)
* **Charts**: Recharts (Responsive area, bar, and pie charts with custom tooltips)
* **Authentication & Backend**:
  * **Firebase Authentication** & **Cloud Firestore**
  * **Zero-Config Offline Fallback**: If Firebase keys are not loaded, the application automatically falls back to an active client-side `localStorage` database, pre-populating a high-fidelity demonstration portfolio (featuring HDFC home loans, SBI education loans, and ICICI credit cards) for immediate evaluation.
* **File Exports**: `jspdf` + `jspdf-autotable` (PDF generator) and `xlsx` (Excel compiler)
* **Platform**: Progressive Web App (PWA) manifest support for mobile installability

---

## 📂 Project Directory Structure

```text
DebtPilotApp/
├── public/                 # Static assets, PWA manifest, and service workers
├── src/
│   ├── app/                # Next.js App Router Page modules (21 operational screens)
│   │   ├── ai-insights/    # Financial Health Analyzer (0-100 Scorecard)
│   │   ├── budget-planner/ # Category budgets with overspending alarms
│   │   ├── calendar/       # Interactive monthly financial obligations planner
│   │   ├── dashboard/      # Master KPIs dashboard (Net Worth, Debt Reduction %, Cash Flow)
│   │   ├── documents/      # Document vault for storing contract statements
│   │   ├── loan-coverage-planner/ # Repayment savings & shortfall simulator
│   │   ├── loans/          # Loans CRUD, amortization details, prepayments simulator
│   │   ├── repayments/     # Payments ledger (syncs with loan outstanding balances)
│   │   ├── reports/        # Export center (PDF, Excel, CSV formats)
│   │   ├── savings-goals/  # Savings goals tracker (daily/weekly target planners)
│   │   └── ...             # Authentication portal pages, profile logs, & settings
│   ├── components/
│   │   ├── layout/         # Shell layout (responsive sidebar navigation, notifications center)
│   │   └── ui/             # Reusable UX components (Cards, Buttons, Modals, Progress bars)
│   ├── context/            # Global contexts (AuthContext bridging Firebase & Demo bypass)
│   ├── lib/
│   │   ├── calculators.ts  # Finance math calculations (EMI, Prepayment, DTI, Health Score)
│   │   ├── db.ts           # Unified DB wrapper sync (Firestore + LocalStorage caching)
│   │   └── firebase.ts     # Safe Firebase client connector
│   └── types/
│       └── index.ts        # Shared TypeScript interface definitions for database schemas
```

---

## 🚀 Setup & Local Execution

### 1. Clone & Install Dependencies
Navigate into the workspace and pull npm packages:
```bash
npm install
```

### 2. Configure Environment Variables (Optional)
To run with live Firebase Cloud services, create a `.env.local` in the root directory:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```
*Note: If these variables are omitted, the app runs in **Offline Mock Mode** using localStorage, enabling fully functional local trials.*

### 3. Run Development Server
Start the Next.js local server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser. Click **Demo Mode** on the login screen to enter immediately.

### 4. Build Production Bundle
Build and optimize the application:
```bash
npm run build
npm run start
```
*Successfully optimizes routing paths, producing zero compile or build warnings.*

---

## 📈 Quality Metrics
* **Type-Safety Check**: Zero warnings with `npx tsc --noEmit` validation.
* **Next.js CSR Prerendering Safe**: Search query parameters inside route components are strictly wrapped with React Suspense boundaries to secure successful static page generation.
* **PWA Performance**: High-score Lighthouse indicators for speed index and accessibility.
