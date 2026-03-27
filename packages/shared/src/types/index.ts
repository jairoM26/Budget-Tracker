export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

export enum RecurringFrequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  type: TransactionType | null;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  type: TransactionType;
  description: string;
  notes: string | null;
  date: Date;
  recurringRuleId: string | null;
}

export interface Budget {
  id: string;
  userId: string;
  year: number;
  month: number;
  totalLimit: string;
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  categoryId: string;
  limitAmount: string;
}

export interface RecurringRule {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  type: TransactionType;
  description: string;
  frequency: RecurringFrequency;
  nextDue: Date;
  endDate: Date | null;
  active: boolean;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

// --- Milestone 8: Email ingestion & AI features ---

export enum PendingTransactionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum EmailProvider {
  IMAP = "IMAP",
  GMAIL = "GMAIL",
}

export interface EmailConnection {
  id: string;
  userId: string;
  provider: EmailProvider;
  email: string;
  active: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
}

export interface ScanRule {
  id: string;
  emailConnectionId: string;
  subjectFilter: string;
  active: boolean;
  createdAt: Date;
}

export interface EmailLog {
  id: string;
  userId: string;
  scanRuleId: string | null;
  fromAddress: string;
  subject: string | null;
  processedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface PendingTransaction {
  id: string;
  userId: string;
  emailLogId: string | null;
  amount: string | null;
  type: TransactionType | null;
  description: string | null;
  merchant: string | null;
  date: Date | null;
  categoryId: string | null;
  status: PendingTransactionStatus;
  confidence: string;
  aiRawResponse: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface CategorySuggestion {
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  source: "history" | "ai";
}
