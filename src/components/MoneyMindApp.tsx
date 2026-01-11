import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppModeProvider, useAppMode } from "@/hooks/useAppMode";
import { LanguageProvider } from "@/hooks/useLanguage";
import { useTransactions } from "@/hooks/useTransactions";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { Dashboard } from "./screens/Dashboard";
import { BusinessDashboard } from "./screens/BusinessDashboard";
import { AddTransaction } from "./screens/AddTransaction";
import { BusinessAddTransaction } from "./screens/BusinessAddTransaction";
import { BusinessTransactions } from "./screens/BusinessTransactions";
import { TransactionList } from "./screens/TransactionList";
import { Summary } from "./screens/Summary";
import { TransactionFilter } from "./screens/TransactionFilter";
import { Profile } from "./screens/Profile";
import { RecurringTransactions } from "./screens/RecurringTransactions";
import { Notifications } from "./screens/Notifications";
import { Settings } from "./screens/Settings";
import { CategoryManagement } from "./screens/CategoryManagement";
import { ProfileSettings } from "./screens/ProfileSettings";
import { Accounts } from "./screens/Accounts";
import { LiabilitiesManagement } from "./screens/LiabilitiesManagement";
import { BusinessReports } from "./screens/BusinessReports";
import { KeywordsManagement } from "./screens/KeywordsManagement";
import { AIExpenseAnalyzer } from "./screens/AIExpenseAnalyzer";
import { PinSettings } from "./screens/PinSettings";
import { FinancialInsights } from "./screens/FinancialInsights";
import { BottomNavigation } from "./ui/BottomNavigation";
import { Toaster } from "./ui/toaster";
import { AuthGuard } from "./AuthGuard";
import { GuestWarningBanner } from "./GuestWarningBanner";

export type TransactionType = "income" | "expense";
export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

// Legacy interfaces for backward compatibility
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
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

  // Convert new hook format to legacy format for backward compatibility
  const addTransaction = async (transaction: Omit<Transaction, "id">) => {
    if (!currentAccount) return;
    
    await createTransaction({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date,
      account_id: currentAccount.id,
    });
  };

  const addRecurringTransaction = async (transaction: Omit<RecurringTransaction, "id">) => {
    if (!currentAccount) return;
    
    await createRecurringTransaction({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      frequency: transaction.frequency,
      start_date: transaction.nextDate,
      next_execution: transaction.nextDate,
      is_active: transaction.isActive,
      account_id: currentAccount.id,
    });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <GuestWarningBanner />
        <Routes>
          <Route 
            path="/" 
            element={
              mode === "business" ? <BusinessDashboard /> : 
              <Dashboard 
                transactions={transactions.map(t => ({ 
                  id: t.id, 
                  type: t.type as TransactionType, 
                  amount: t.amount, 
                  category: t.category_id || '', 
                  description: t.description || '', 
                  date: t.date, 
                  priority: 3 as PriorityLevel, 
                  isRecurring: false 
                }))} 
                recurringTransactions={recurringTransactions.map(rt => ({ 
                  id: rt.id, 
                  type: rt.type as TransactionType, 
                  amount: rt.amount, 
                  category: rt.category_id || '', 
                  description: rt.description || '', 
                  priority: 3 as PriorityLevel, 
                  frequency: rt.frequency as "monthly" | "weekly" | "daily", 
                  nextDate: rt.next_execution || rt.start_date, 
                  isActive: rt.is_active ?? true 
                }))}>
              </Dashboard>
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
            element={<TransactionList 
              transactions={transactions.map(t => ({ 
                id: t.id, type: t.type as TransactionType, amount: t.amount, category: t.category_id || '', 
                description: t.description || '', date: t.date, priority: 3 as PriorityLevel, 
                isRecurring: false 
              }))}
              onDelete={deleteTransaction}
              onUpdate={updateTransaction}
            />}
          />
          <Route 
            path="/summary" 
            element={
              <Summary 
                transactions={transactions.map(t => ({ 
                  id: t.id, type: t.type as TransactionType, amount: t.amount, category: t.category_id || '', 
                  description: t.description || '', date: t.date, priority: 3 as PriorityLevel, 
                  isRecurring: false 
                }))} 
                recurringTransactions={recurringTransactions.map(rt => ({ 
                  id: rt.id, type: rt.type as TransactionType, amount: rt.amount, category: rt.category_id || '', 
                  description: rt.description || '', priority: 3 as PriorityLevel, 
                  frequency: rt.frequency as "monthly" | "weekly" | "daily", nextDate: rt.next_execution || rt.start_date, isActive: rt.is_active ?? true 
                }))}
              />
            } 
          />
          <Route 
            path="/recurring" 
            element={
              <RecurringTransactions 
                recurringTransactions={recurringTransactions.map(rt => ({ 
                  id: rt.id, type: rt.type as TransactionType, amount: rt.amount, category: rt.category_id || '', 
                  description: rt.description || '', priority: 3 as PriorityLevel, 
                  frequency: rt.frequency as "monthly" | "weekly" | "daily", nextDate: rt.next_execution || rt.start_date, isActive: rt.is_active ?? true 
                }))}
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
          <Route path="/transaction-filter" element={<TransactionFilter onBack={() => window.history.back()} />} />
          <Route path="/financial-insights" element={<FinancialInsights />} />
        </Routes>
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