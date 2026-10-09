import React, { useState, useEffect, useMemo } from 'react';
import {
  ExpenseHead,
  FamilyMember,
  SmsSourceRule,
  MerchantRule,
  SmsTransaction,
  CategoryBudgetMap,
} from './types';
import {
  INITIAL_BUDGETS,
  INITIAL_FAMILY_MEMBERS,
  INITIAL_SMS_SOURCES,
  INITIAL_MERCHANT_RULES,
  INITIAL_TRANSACTIONS,
  MONTH_OPTIONS,
} from './data/initialHouseholdData';
import { formatINR } from './utils/smsParser';
import { MonthlyTrendChart } from './components/MonthlyTrendChart';
import { ExpenseHeadBreakdown } from './components/ExpenseHeadBreakdown';
import { TransactionLedger } from './components/TransactionLedger';
import { FamilyAndSourcesView } from './components/FamilyAndSourcesView';
import { SmsParserStudio } from './components/SmsParserStudio';
import { X, RotateCcw } from 'lucide-react';

type ActiveTab = 'overview' | 'transactions' | 'family' | 'parser';

const STORAGE_KEYS = {
  tx: 'famspend_tx_v1',
  members: 'famspend_members_v1',
  sources: 'famspend_sources_v1',
  rules: 'famspend_rules_v1',
  budgets: 'famspend_budgets_v1',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');
  const [selectedHeadFilter, setSelectedHeadFilter] = useState<
    ExpenseHead | 'ALL'
  >('ALL');
  const [excludeInternalTransfers, setExcludeInternalTransfers] =
    useState<boolean>(true);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState<boolean>(false);

  // Persistent Household State
  const [transactions, setTransactions] = useState<SmsTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.tx);
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.members);
      return saved ? JSON.parse(saved) : INITIAL_FAMILY_MEMBERS;
    } catch {
      return INITIAL_FAMILY_MEMBERS;
    }
  });

  const [smsSources, setSmsSources] = useState<SmsSourceRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.sources);
      return saved ? JSON.parse(saved) : INITIAL_SMS_SOURCES;
    } catch {
      return INITIAL_SMS_SOURCES;
    }
  });

  const [merchantRules, setMerchantRules] = useState<MerchantRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.rules);
      return saved ? JSON.parse(saved) : INITIAL_MERCHANT_RULES;
    } catch {
      return INITIAL_MERCHANT_RULES;
    }
  });

  const [budgets, setBudgets] = useState<CategoryBudgetMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.budgets);
      return saved ? JSON.parse(saved) : INITIAL_BUDGETS;
    } catch {
      return INITIAL_BUDGETS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.tx, JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(familyMembers));
    } catch {}
  }, [familyMembers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.sources, JSON.stringify(smsSources));
    } catch {}
  }, [smsSources]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.rules, JSON.stringify(merchantRules));
    } catch {}
  }, [merchantRules]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets));
    } catch {}
  }, [budgets]);

  // Filtered transactions for the currently selected period & member
  const periodTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (excludeInternalTransfers && tx.isInternalTransfer) return false;
      if (selectedMonth !== 'ALL' && tx.monthKey !== selectedMonth) return false;
      if (selectedMemberId !== 'ALL' && tx.memberId !== selectedMemberId)
        return false;
      return true;
    });
  }, [
    transactions,
    selectedMonth,
    selectedMemberId,
    excludeInternalTransfers,
  ]);

  const internalTransferCount = useMemo(() => {
    return transactions.filter(
      (tx) =>
        tx.isInternalTransfer &&
        (selectedMonth === 'ALL' || tx.monthKey === selectedMonth)
    ).length;
  }, [transactions, selectedMonth]);

  const totalMonthlyBudget = useMemo(() => {
    return (Object.values(budgets) as number[]).reduce((sum, b) => sum + b, 0);
  }, [budgets]);

  const effectivePeriodBudget =
    selectedMonth === 'ALL' ? totalMonthlyBudget * 6 : totalMonthlyBudget;

  const totalPeriodSpend = useMemo(() => {
    return periodTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [periodTransactions]);

  const budgetRemaining = effectivePeriodBudget - totalPeriodSpend;
  const budgetUtilPct =
    effectivePeriodBudget > 0
      ? Math.round((totalPeriodSpend / effectivePeriodBudget) * 100)
      : 0;

  // Compute Top Expense Head for KPI card
  const topExpenseHead = useMemo(() => {
    const map = new Map<ExpenseHead, number>();
    periodTransactions.forEach((tx) => {
      map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
    });
    let bestHead: ExpenseHead = 'Housing & Utilities';
    let bestAmt = 0;
    map.forEach((amt, head) => {
      if (amt > bestAmt) {
        bestAmt = amt;
        bestHead = head;
      }
    });
    const share =
      totalPeriodSpend > 0 ? Math.round((bestAmt / totalPeriodSpend) * 100) : 0;
    return { head: bestHead, amount: bestAmt, share };
  }, [periodTransactions, totalPeriodSpend]);

  const currentPeriodLabel = useMemo(() => {
    if (selectedMonth === 'ALL') return 'All 6 Months (May – Oct 2026)';
    return (
      MONTH_OPTIONS.find((m) => m.key === selectedMonth)?.label || selectedMonth
    );
  }, [selectedMonth]);

  // Handlers
  const handleUpdateBudget = (head: ExpenseHead, newLimit: number) => {
    setBudgets((prev) => ({ ...prev, [head]: newLimit }));
  };

  const handleIngestTransaction = (newTx: Omit<SmsTransaction, 'id'>) => {
    const created: SmsTransaction = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setTransactions((prev) => [created, ...prev]);
    setSelectedMonth(created.monthKey);
  };

  const handleIngestBatch = (txList: Omit<SmsTransaction, 'id'>[]) => {
    const createdList: SmsTransaction[] = txList.map((item, idx) => ({
      ...item,
      id: `tx-batch-${Date.now()}-${idx}`,
    }));
    setTransactions((prev) => [...createdList, ...prev]);
    if (createdList[0]) {
      setSelectedMonth(createdList[0].monthKey);
    }
  };

  const handleChangeTransactionCategory = (
    txId: string,
    newHead: ExpenseHead
  ) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, category: newHead } : tx))
    );
  };

  const handleDeleteTransaction = (txId: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== txId));
  };

  const handleAddFamilyMember = (member: Omit<FamilyMember, 'id'>) => {
    const created: FamilyMember = {
      ...member,
      id: `mem-${Date.now()}`,
    };
    setFamilyMembers((prev) => [...prev, created]);
  };

  const handleRemoveFamilyMember = (id: string) => {
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
    if (selectedMemberId === id) {
      setSelectedMemberId('ALL');
    }
  };

  const handleToggleSource = (id: string) => {
    setSmsSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleAddSmsSource = (source: Omit<SmsSourceRule, 'id'>) => {
    setSmsSources((prev) => [
      ...prev,
      { ...source, id: `src-${Date.now()}` },
    ]);
  };

  const handleAddMerchantRule = (keyword: string, expenseHead: ExpenseHead) => {
    setMerchantRules((prev) => [
      { id: `mr-${Date.now()}`, keyword, expenseHead },
      ...prev,
    ]);
  };

  const handleRemoveMerchantRule = (id: string) => {
    setMerchantRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResetDemoData = () => {
    setTransactions(INITIAL_TRANSACTIONS);
    setFamilyMembers(INITIAL_FAMILY_MEMBERS);
    setSmsSources(INITIAL_SMS_SOURCES);
    setMerchantRules(INITIAL_MERCHANT_RULES);
    setBudgets(INITIAL_BUDGETS);
    setSelectedMonth('2026-09');
    setSelectedMemberId('ALL');
    setSelectedHeadFilter('ALL');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F5] text-[#141815]">
      {/* 3-ZONE TOP BAR CONTRACT */}
      <header className="bg-white border-b border-[#E5E3DC] sticky top-0 z-30">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="font-display text-xl font-bold tracking-tight text-[#141815] whitespace-nowrap shrink-0"
          >
            FamSpend
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="flex items-center gap-6 text-sm font-medium text-[#525854] overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'overview'
                  ? 'border-[#1B4D3E] text-[#141815] font-semibold'
                  : 'border-transparent hover:text-[#141815]'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'transactions'
                  ? 'border-[#1B4D3E] text-[#141815] font-semibold'
                  : 'border-transparent hover:text-[#141815]'
              }`}
            >
              Transactions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('family')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'family'
                  ? 'border-[#1B4D3E] text-[#141815] font-semibold'
                  : 'border-transparent hover:text-[#141815]'
              }`}
            >
              Family & Sources
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('parser')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'parser'
                  ? 'border-[#1B4D3E] text-[#141815] font-semibold'
                  : 'border-transparent hover:text-[#141815]'
              }`}
            >
              SMS Parser
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsSmsModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B30] transition-colors whitespace-nowrap shrink-0"
            >
              Ingest Bank SMS
            </button>
          </div>
        </div>
      </header>

      {/* WORKSPACE CONTEXT & FILTER TOOLBAR (BELOW HEADER) */}
      <div className="bg-[#F2EFE9]/70 border-b border-[#E5E3DC]">
        <div className="max-w-[1360px] mx-auto px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Month Period Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-medium text-[#525854] whitespace-nowrap shrink-0 mr-1">
              Statement Period:
            </span>
            <div className="flex items-center gap-1 p-1 bg-white border border-[#E5E3DC] rounded-lg">
              {MONTH_OPTIONS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMonth(m.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedMonth === m.key
                      ? 'bg-[#1B4D3E] text-white'
                      : 'text-[#525854] hover:text-[#141815]'
                  }`}
                >
                  {m.shortLabel} ’26
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedMonth('ALL')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedMonth === 'ALL'
                    ? 'bg-[#1B4D3E] text-white'
                    : 'text-[#525854] hover:text-[#141815]'
                }`}
              >
                All 6 Months
              </button>
            </div>
          </div>

          {/* Right: Household Member Filter + Internal Transfer Deduplication Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-white border border-[#E5E3DC] rounded-lg overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedMemberId('ALL')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedMemberId === 'ALL'
                    ? 'bg-[#141815] text-white'
                    : 'text-[#525854] hover:text-[#141815]'
                }`}
              >
                Whole Household ({familyMembers.length})
              </button>
              {familyMembers.map((fm) => (
                <button
                  key={fm.id}
                  type="button"
                  onClick={() =>
                    setSelectedMemberId(
                      selectedMemberId === fm.id ? 'ALL' : fm.id
                    )
                  }
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedMemberId === fm.id
                      ? 'bg-[#141815] text-white'
                      : 'text-[#525854] hover:text-[#141815]'
                  }`}
                >
                  {fm.name.split(' ')[0]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setExcludeInternalTransfers((prev) => !prev)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                excludeInternalTransfers
                  ? 'bg-white text-[#1B4D3E] border-[#1B4D3E]/40'
                  : 'bg-white text-[#525854] border-[#E5E3DC]'
              }`}
              title="Automatically exclude UPI transfers between registered family members so household spend is not double-counted"
            >
              {excludeInternalTransfers
                ? 'Dedup Transfers: On'
                : 'Dedup Transfers: Off'}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE CONTENT */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-7 space-y-7">
        {/* 4-COLUMN HOUSEHOLD KPI STRIP */}
        <section
          aria-label="Household Financial Summary"
          className="bg-white border border-[#E5E3DC] rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E3DC]"
        >
          {/* KPI 1: Total Household Spend */}
          <div className="p-5">
            <div className="text-xs text-[#525854]">
              Collated Household Spend · {currentPeriodLabel}
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-[#141815] tabular-nums">
              {formatINR(totalPeriodSpend)}
            </div>
            <div className="mt-1.5 text-xs text-[#525854]">
              <span>{periodTransactions.length} SMS transactions</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>
                {selectedMemberId === 'ALL'
                  ? `Across ${familyMembers.length} phones`
                  : familyMembers.find((m) => m.id === selectedMemberId)?.name}
              </span>
            </div>
          </div>

          {/* KPI 2: Budget Utilization & Remaining */}
          <div className="p-5">
            <div className="text-xs text-[#525854]">
              Household Budget Status
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-[#141815] tabular-nums">
              {budgetRemaining >= 0
                ? `${formatINR(budgetRemaining)} left`
                : `${formatINR(Math.abs(budgetRemaining))} over`}
            </div>
            <div className="mt-1.5 text-xs text-[#525854] font-mono tabular-nums">
              <span>{budgetUtilPct}% of {formatINR(effectivePeriodBudget)} cap</span>
            </div>
          </div>

          {/* KPI 3: Top Expense Head */}
          <div className="p-5">
            <div className="text-xs text-[#525854]">Primary Expense Head</div>
            <div className="mt-2 text-lg font-semibold text-[#141815] truncate">
              {topExpenseHead.amount > 0 ? topExpenseHead.head : 'No Spend Yet'}
            </div>
            <div className="mt-1.5 text-xs text-[#525854] font-mono tabular-nums">
              <span>{formatINR(topExpenseHead.amount)}</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>{topExpenseHead.share}% of household outflow</span>
            </div>
          </div>

          {/* KPI 4: Active SMS Sources & Deduplication */}
          <div className="p-5">
            <div className="text-xs text-[#525854]">
              SMS Source Collation Coverage
            </div>
            <div className="mt-2 text-lg font-semibold text-[#141815] tabular-nums">
              {smsSources.filter((s) => s.enabled).length} of {smsSources.length}{' '}
              Bank/UPI Senders
            </div>
            <div className="mt-1.5 text-xs text-[#525854]">
              <span>
                {internalTransferCount} internal family transfer
                {internalTransferCount === 1 ? '' : 's'}{' '}
                {excludeInternalTransfers ? 'excluded' : 'included'}
              </span>
            </div>
          </div>
        </section>

        {/* VIEW 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-7">
            {/* Primary 2-Column Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 flex flex-col">
                <MonthlyTrendChart
                  transactions={transactions}
                  familyMembers={familyMembers}
                  selectedMonth={selectedMonth}
                  onSelectMonth={setSelectedMonth}
                  totalMonthlyBudget={totalMonthlyBudget}
                  selectedMemberId={selectedMemberId}
                  excludeInternalTransfers={excludeInternalTransfers}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col">
                <ExpenseHeadBreakdown
                  transactions={periodTransactions}
                  budgets={budgets}
                  onUpdateBudget={handleUpdateBudget}
                  selectedHeadFilter={selectedHeadFilter}
                  onSelectHeadFilter={setSelectedHeadFilter}
                  periodLabel={currentPeriodLabel}
                  isMultiMonthView={selectedMonth === 'ALL'}
                />
              </div>
            </div>

            {/* Family Member Contribution Strip */}
            <section className="bg-white border border-[#E5E3DC] rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
                <div>
                  <h2 className="text-base font-semibold text-[#141815]">
                    Family Member Spend Attribution ({currentPeriodLabel})
                  </h2>
                  <p className="text-xs text-[#525854] mt-0.5">
                    Collated automatically from each family member’s registered phone SMS inbox · Click a member to isolate their expenses
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('family')}
                  className="text-xs font-medium text-[#1B4D3E] hover:underline whitespace-nowrap shrink-0"
                >
                  Manage Family Phones & SMS Senders →
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {familyMembers.map((fm) => {
                  const memberTx = transactions.filter(
                    (t) =>
                      t.memberId === fm.id &&
                      (!excludeInternalTransfers || !t.isInternalTransfer) &&
                      (selectedMonth === 'ALL' || t.monthKey === selectedMonth)
                  );
                  const memberSpend = memberTx.reduce(
                    (sum, t) => sum + t.amount,
                    0
                  );
                  const householdShare =
                    totalPeriodSpend > 0
                      ? Math.round((memberSpend / totalPeriodSpend) * 100)
                      : 0;
                  const isSelected = selectedMemberId === fm.id;

                  return (
                    <button
                      key={fm.id}
                      type="button"
                      onClick={() =>
                        setSelectedMemberId(isSelected ? 'ALL' : fm.id)
                      }
                      className={`text-left p-4 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-[#F2EFE9] border-[#1B4D3E]'
                          : 'bg-[#F9F8F5] border-[#E5E3DC] hover:bg-[#F2EFE9]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-7 h-7 rounded text-xs font-semibold text-white flex items-center justify-center shrink-0"
                            style={{ backgroundColor: fm.color }}
                          >
                            {fm.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#141815] truncate">
                              {fm.name}
                            </div>
                            <div className="text-[11px] text-[#525854] truncate">
                              {fm.deviceModel} · {fm.lastSyncText}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-sm font-mono font-bold text-[#141815] tabular-nums">
                          {formatINR(memberSpend)}
                        </span>
                        <span className="text-xs font-mono text-[#525854] tabular-nums">
                          {householdShare}% · {memberTx.length} SMS
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-[#E5E3DC] rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(householdShare, 100)}%`,
                            backgroundColor: fm.color,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Recent Collated SMS Ledger Preview */}
            <TransactionLedger
              transactions={periodTransactions}
              familyMembers={familyMembers}
              selectedHeadFilter={selectedHeadFilter}
              onSelectHeadFilter={setSelectedHeadFilter}
              onChangeTransactionCategory={handleChangeTransactionCategory}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenSmsModal={() => setIsSmsModalOpen(true)}
              compactLimit={10}
              onViewAllTransactions={() => setActiveTab('transactions')}
            />
          </div>
        )}

        {/* VIEW 2: FULL TRANSACTIONS LEDGER */}
        {activeTab === 'transactions' && (
          <TransactionLedger
            transactions={periodTransactions}
            familyMembers={familyMembers}
            selectedHeadFilter={selectedHeadFilter}
            onSelectHeadFilter={setSelectedHeadFilter}
            onChangeTransactionCategory={handleChangeTransactionCategory}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenSmsModal={() => setIsSmsModalOpen(true)}
          />
        )}

        {/* VIEW 3: FAMILY MEMBERS & BANK SMS SOURCES */}
        {activeTab === 'family' && (
          <FamilyAndSourcesView
            familyMembers={familyMembers}
            onAddFamilyMember={handleAddFamilyMember}
            onRemoveFamilyMember={handleRemoveFamilyMember}
            smsSources={smsSources}
            onToggleSource={handleToggleSource}
            onAddSmsSource={handleAddSmsSource}
            merchantRules={merchantRules}
            onAddMerchantRule={handleAddMerchantRule}
            onRemoveMerchantRule={handleRemoveMerchantRule}
            transactions={transactions}
            selectedMonth={selectedMonth}
          />
        )}

        {/* VIEW 4: INTERACTIVE SMS PARSER STUDIO */}
        {activeTab === 'parser' && (
          <SmsParserStudio
            familyMembers={familyMembers}
            smsSources={smsSources}
            merchantRules={merchantRules}
            onIngestTransaction={handleIngestTransaction}
            onIngestBatch={handleIngestBatch}
          />
        )}
      </main>

      {/* MODAL FOR QUICK SMS INGESTION FROM TOP BAR CTA */}
      {isSmsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsSmsModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E5E3DC] rounded-xl max-w-4xl w-full p-6 shadow-xl relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsSmsModalOpen(false)}
              aria-label="Close SMS Parser Modal"
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#525854] hover:text-[#141815] hover:bg-[#F2EFE9] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <SmsParserStudio
              familyMembers={familyMembers}
              smsSources={smsSources}
              merchantRules={merchantRules}
              onIngestTransaction={handleIngestTransaction}
              onIngestBatch={handleIngestBatch}
              isModal={true}
              onCloseModal={() => setIsSmsModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* QUIET EDITORIAL FOOTER */}
      <footer className="bg-white border-t border-[#E5E3DC] mt-12">
        <div className="max-w-[1360px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[#525854]">
          <div>
            <span className="font-semibold text-[#141815]">FamSpend</span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span>
              Family SMS Expense Aggregator & Monthly Spending Trends
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleResetDemoData}
              className="inline-flex items-center gap-1.5 text-xs text-[#525854] hover:text-[#141815] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Household Demo Data</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
