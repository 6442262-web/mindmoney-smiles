import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppModeProvider, useAppMode } from "@/hooks/useAppMode";
import { LanguageProvider } from "@/hooks/useLanguage";
import { useTransactions } from "@/hooks/useTransactions";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useInvestmentMode } from "@/hooks/useInvestmentMode";
import { BottomNavigation } from "./ui/BottomNavigation";
import { Toaster } from "./ui/toaster";
import { AuthGuard } from "./AuthGuard";
import { GuestWarningBanner } from "./GuestWarningBanner";
import { Skeleton } from "./ui/skeleton";

// Lazy load all screen components for better performance
const Dashboard = lazy(() => import("./screens/Dashboard").then(m => ({ default: m.Dashboard })));
const BusinessDashboard = lazy(() => import("./screens/BusinessDashboard").then(m => ({ default: m.BusinessDashboard })));
const AddTransaction = lazy(() => import("./screens/AddTransaction").then(m => ({ default: m.AddTransaction })));
const BusinessAddTransaction = lazy(() => import("./screens/BusinessAddTransaction").then(m => ({ default: m.BusinessAddTransaction })));
const BusinessTransactions = lazy(() => import("./screens/BusinessTransactions").then(m => ({ default: m.BusinessTransactions })));
const TransactionList = lazy(() => import("./screens/TransactionList").then(m => ({ default: m.TransactionList })));
const Summary = lazy(() => import("./screens/Summary").then(m => ({ default: m.Summary })));
const TransactionFilter = lazy(() => import("./screens/TransactionFilter").then(m => ({ default: m.TransactionFilter })));
const Profile = lazy(() => import("./screens/Profile").then(m => ({ default: m.Profile })));
const RecurringTransactions = lazy(() => import("./screens/RecurringTransactions").then(m => ({ default: m.RecurringTransactions })));
const Notifications = lazy(() => import("./screens/Notifications").then(m => ({ default: m.Notifications })));
const Settings = lazy(() => import("./screens/Settings").then(m => ({ default: m.Settings })));
const CategoryManagement = lazy(() => import("./screens/CategoryManagement").then(m => ({ default: m.CategoryManagement })));
const ProfileSettings = lazy(() => import("./screens/ProfileSettings").then(m => ({ default: m.ProfileSettings })));
const Accounts = lazy(() => import("./screens/Accounts").then(m => ({ default: m.Accounts })));
const LiabilitiesManagement = lazy(() => import("./screens/LiabilitiesManagement").then(m => ({ default: m.LiabilitiesManagement })));
const BusinessReports = lazy(() => import("./screens/BusinessReports").then(m => ({ default: m.BusinessReports })));
const KeywordsManagement = lazy(() => import("./screens/KeywordsManagement").then(m => ({ default: m.KeywordsManagement })));
const AIExpenseAnalyzer = lazy(() => import("./screens/AIExpenseAnalyzer").then(m => ({ default: m.AIExpenseAnalyzer })));
const PinSettings = lazy(() => import("./screens/PinSettings").then(m => ({ default: m.PinSettings })));
const FinancialInsights = lazy(() => import("./screens/FinancialInsights").then(m => ({ default: m.FinancialInsights })));
const AdminDashboard = lazy(() => import("./screens/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const Feedback = lazy(() => import("./screens/Feedback").then(m => ({ default: m.Feedback })));
const ChatTransaction = lazy(() => import("./screens/ChatTransaction").then(m => ({ default: m.ChatTransaction })));
const InvestmentDashboard = lazy(() => import("./screens/InvestmentDashboard").then(m => ({ default: m.InvestmentDashboard })));
const AddInvestmentTransaction = lazy(() => import("./screens/AddInvestmentTransaction").then(m => ({ default: m.AddInvestmentTransaction })));
const InvestmentTransactions = lazy(() => import("./screens/InvestmentTransactions").then(m => ({ default: m.InvestmentTransactions })));
const FinancialAnalysis = lazy(() => import("./screens/FinancialAnalysis").then(m => ({ default: m.FinancialAnalysis })));
const SavingsGoals = lazy(() => import("./screens/SavingsGoals").then(m => ({ default: m.SavingsGoals })));
const DebtAnalyzer = lazy(() => import("./screens/DebtAnalyzer").then(m => ({ default: m.DebtAnalyzer })));
const ExpenseForecast = lazy(() => import("./screens/ExpenseForecast").then(m => ({ default: m.ExpenseForecast })));
const ImportTransactions = lazy(() => import("./screens/ImportTransactions").then(m => ({ default: m.ImportTransactions })));

export type TransactionType = "income" | "expense";
export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  time?: string;
  priority?: PriorityLevel;
  isRecurring?: boolean;
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  priority: PriorityLevel;
  frequency: "monthly" | "weekly" | "daily";
  nextDate: string;
  isActive: boolean;
}

// Loading skeleton for lazy loaded components
function PageSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function AppContent() {
  const { mode } = useAppMode();
  const { 
    transactions, 
    createTransaction, 
    updateTransaction, 
    deleteTransaction 
  } = useTransactions();
  
  const { 
    recurringTransactions, 
    createRecurringTransaction, 
    updateRecurringTransaction, 
    deleteRecurringTransaction 
  } = useRecurringTransactions();

  const { currentAccount } = useAccounts();
  const { categories, findOrCreateCategory } = useCategories();
  const { investmentMode } = useInvestmentMode();

  const addTransaction = async (transaction: Omit<Transaction, "id">) => {
    if (!currentAccount) return;

    const category = transaction.category
      ? await findOrCreateCategory(transaction.category, transaction.type)
      : null;

    await createTransaction({
      type: transaction.type,
      amount: transaction.amount,
      category_id: category?.id || null,
      description: transaction.description,
      priority: transaction.priority ?? 3,
      date: transaction.date,
      time: transaction.time || null,
      account_id: currentAccount.id,
    });
  };

  const addRecurringTransaction = async (transaction: Omit<RecurringTransaction, "id">) => {
    if (!currentAccount) return;

    const category = transaction.category
      ? await findOrCreateCategory(transaction.category, transaction.type)
      : null;

    await createRecurringTransaction({
      type: transaction.type,
      amount: transaction.amount,
      category_id: category?.id || null,
      description: transaction.description,
      priority: transaction.priority ?? 3,
      frequency: transaction.frequency,
      start_date: transaction.nextDate,
      next_execution: transaction.nextDate,
      is_active: transaction.isActive,
      account_id: currentAccount.id,
    });
  };

  // แปลงข้อมูลแก้ไขจาก UI (category เป็นชื่อหมวด) เป็น DB shape (category_id)
  const updateLegacyTransaction = async (id: string, updates: Partial<Transaction>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time || null;
    if (updates.category !== undefined) {
      const category = updates.category
        ? await findOrCreateCategory(updates.category, updates.type || 'expense')
        : null;
      dbUpdates.category_id = category?.id || null;
    }
    await updateTransaction(id, dbUpdates);
  };

  // Transform transactions for legacy components
  const categoryNameById = new Map(categories.map(c => [c.id, c.name]));

  const legacyTransactions = transactions.map(t => ({
    id: t.id,
    type: t.type as TransactionType,
    amount: t.amount,
    category: (t.category_id && categoryNameById.get(t.category_id)) || '',
    description: t.description || '',
    date: t.date,
    time: t.time || undefined,
    priority: (t.priority ?? 3) as PriorityLevel,
    isRecurring: false
  }));

  const legacyRecurringTransactions = recurringTransactions.map(rt => ({
    id: rt.id,
    type: rt.type as TransactionType,
    amount: rt.amount,
    category: (rt.category_id && categoryNameById.get(rt.category_id)) || '',
    description: rt.description || '',
    priority: (rt.priority ?? 3) as PriorityLevel,
    frequency: rt.frequency as "monthly" | "weekly" | "daily",
    nextDate: rt.next_execution || rt.start_date,
    isActive: rt.is_active ?? true
  }));

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <GuestWarningBanner />
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route 
              path="/" 
              element={
                mode === "business" ? <BusinessDashboard /> : 
                <Dashboard 
                  transactions={legacyTransactions} 
                  recurringTransactions={legacyRecurringTransactions}
                />
              }
            />
            <Route 
              path="/add" 
              element={
                <AddTransaction 
                  onAddTransaction={addTransaction}
                  onAddRecurring={addRecurringTransaction}
                />
              } 
            />
            <Route 
              path="/transactions" 
              element={
                <TransactionList
                  transactions={legacyTransactions}
                  onDelete={deleteTransaction}
                  onUpdate={updateLegacyTransaction}
                />
              }
            />
            <Route 
              path="/summary" 
              element={
                <Summary 
                  transactions={legacyTransactions} 
                  recurringTransactions={legacyRecurringTransactions}
                />
              } 
            />
            <Route 
              path="/recurring" 
              element={
                <RecurringTransactions 
                  recurringTransactions={legacyRecurringTransactions}
                  onUpdate={(id, updates) => updateRecurringTransaction(id, { 
                    next_execution: updates.nextDate, 
                    is_active: updates.isActive 
                  })}
                  onDelete={deleteRecurringTransaction}
                />
              } 
            />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/category-management" element={<CategoryManagement />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/business" element={<BusinessDashboard />} />
            <Route path="/business/add-transaction" element={<BusinessAddTransaction />} />
            <Route path="/business/transactions" element={<BusinessTransactions />} />
            <Route path="/business/liabilities" element={<LiabilitiesManagement />} />
            <Route path="/business/reports" element={<BusinessReports />} />
            <Route path="/keywords" element={<KeywordsManagement />} />
            <Route path="/ai-expense-analyzer" element={<AIExpenseAnalyzer onBack={() => window.history.back()} />} />
            <Route path="/pin-settings" element={<PinSettings onBack={() => window.history.back()} />} />
            <Route path="/transaction-filter" element={<TransactionFilter onBack={() => window.history.back()} transactions={legacyTransactions} />} />
            <Route path="/financial-insights" element={<FinancialInsights />} />
            <Route path="/admin" element={<AdminDashboard onBack={() => window.history.back()} />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/chat-transaction" element={<ChatTransaction />} />
            {/* เข้าได้เฉพาะเมื่อเปิดโหมดการลงทุนใน Settings — ปิดอยู่จะพาไปหน้าตั้งค่าที่มีสวิตช์ */}
            <Route path="/investment" element={investmentMode ? <InvestmentDashboard /> : <Navigate to="/settings" replace />} />
            <Route path="/investment/add-transaction" element={investmentMode ? <AddInvestmentTransaction /> : <Navigate to="/settings" replace />} />
            <Route path="/investment/transactions" element={investmentMode ? <InvestmentTransactions /> : <Navigate to="/settings" replace />} />
            <Route path="/financial-analysis" element={<FinancialAnalysis />} />
            <Route path="/savings-goals" element={<SavingsGoals />} />
            <Route path="/debt-analyzer" element={<DebtAnalyzer />} />
            <Route path="/expense-forecast" element={<ExpenseForecast />} />
            <Route path="/import-csv" element={<ImportTransactions />} />
          </Routes>
        </Suspense>
        <BottomNavigation />
        <Toaster />
      </div>
    </AuthGuard>
  );
}

export function MoneyMindApp() {
  return (
    <LanguageProvider>
      <AppModeProvider>
        <AppContent />
      </AppModeProvider>
    </LanguageProvider>
  );
}