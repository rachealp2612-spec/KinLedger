export type ExpenseHead =
  | 'Groceries & Dining'
  | 'Housing & Utilities'
  | 'Transport & Fuel'
  | 'Shopping & Lifestyle'
  | 'Healthcare & Wellness'
  | 'Education & Kids';

export type PaymentRail =
  | 'UPI'
  | 'Credit Card'
  | 'NetBanking'
  | 'Auto-Debit'
  | 'POS Card';

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  phoneMask: string;
  deviceModel: string;
  osPlatform: 'Android SMS Sync' | 'iOS SMS Shortcut';
  appVersion: string;
  lastSyncText: string;
  monthlyAllowance: number;
  initials: string;
  color: string;
  connectedSenders: string[];
}

export interface SmsSourceRule {
  id: string;
  senderHeader: string;
  institutionName: string;
  sourceType: 'Bank Account' | 'Credit Card' | 'UPI App' | 'Utility Biller';
  defaultHead: ExpenseHead;
  enabled: boolean;
  samplePattern: string;
}

export interface MerchantRule {
  id: string;
  keyword: string;
  expenseHead: ExpenseHead;
}

export interface SmsTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  monthKey: string; // YYYY-MM
  merchant: string;
  amount: number;
  category: ExpenseHead;
  memberId: string;
  senderHeader: string;
  institutionName: string;
  accountMask: string;
  paymentRail: PaymentRail;
  referenceNo: string;
  rawSms: string;
  isInternalTransfer?: boolean;
}

export interface SmsPresetTemplate {
  id: string;
  label: string;
  senderHeader: string;
  memberId: string;
  rawSms: string;
  description: string;
}

export type CategoryBudgetMap = Record<ExpenseHead, number>;
