import React, { useState } from 'react';
import {
  ExpenseHead,
  PaymentRail,
  FamilyMember,
  SmsTransaction,
} from '../types';
import {
  EXPENSE_HEADS,
  EXPENSE_HEAD_META,
} from '../data/initialHouseholdData';
import { formatINR } from '../utils/smsParser';
import {
  Search,
  MessageSquareText,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TransactionLedgerProps {
  transactions: SmsTransaction[];
  familyMembers: FamilyMember[];
  selectedHeadFilter: ExpenseHead | 'ALL';
  onSelectHeadFilter: (head: ExpenseHead | 'ALL') => void;
  onChangeTransactionCategory: (txId: string, newHead: ExpenseHead) => void;
  onDeleteTransaction: (txId: string) => void;
  onOpenSmsModal: () => void;
  compactLimit?: number;
  onViewAllTransactions?: () => void;
}

const PAYMENT_RAILS: ('ALL' | PaymentRail)[] = [
  'ALL',
  'UPI',
  'Credit Card',
  'Auto-Debit',
  'NetBanking',
  'POS Card',
];

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  transactions,
  familyMembers,
  selectedHeadFilter,
  onSelectHeadFilter,
  onChangeTransactionCategory,
  onDeleteTransaction,
  onOpenSmsModal,
  compactLimit,
  onViewAllTransactions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRail, setSelectedRail] = useState<'ALL' | PaymentRail>('ALL');
  const [expandedSmsId, setExpandedSmsId] = useState<string | null>(null);

  const memberMap = new Map<string, FamilyMember>();
  familyMembers.forEach((m) => memberMap.set(m.id, m));

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    if (selectedHeadFilter !== 'ALL' && tx.category !== selectedHeadFilter) {
      return false;
    }
    if (selectedRail !== 'ALL' && tx.paymentRail !== selectedRail) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const memberName = memberMap.get(tx.memberId)?.name.toLowerCase() || '';
      return (
        tx.merchant.toLowerCase().includes(q) ||
        tx.rawSms.toLowerCase().includes(q) ||
        tx.senderHeader.toLowerCase().includes(q) ||
        tx.referenceNo.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        memberName.includes(q)
      );
    }
    return true;
  });

  // Sort by date + time descending
  const sorted = [...filtered].sort((a, b) => {
    const dtA = `${a.date} ${a.time}`;
    const dtB = `${b.date} ${b.time}`;
    return dtB.localeCompare(dtA);
  });

  const displayedRows = compactLimit ? sorted.slice(0, compactLimit) : sorted;
  const totalFilteredAmount = filtered.reduce((sum, t) => sum + t.amount, 0);

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Time',
      'Merchant',
      'Expense Head',
      'Amount (INR)',
      'Family Member',
      'SMS Sender',
      'Institution',
      'Payment Rail',
      'Account Mask',
      'Reference No',
      'Raw SMS',
    ];
    const rows = sorted.map((t) => [
      t.date,
      t.time,
      `"${t.merchant.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.amount,
      `"${memberMap.get(t.memberId)?.name || 'Household'}"`,
      t.senderHeader,
      `"${t.institutionName}"`,
      t.paymentRail,
      t.accountMask,
      t.referenceNo,
      `"${t.rawSms.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `famspend_household_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-[#E5E3DC] rounded-xl p-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E5E3DC]">
        <div>
          <h2 className="text-lg font-semibold text-[#141815] tracking-tight">
            {compactLimit
              ? 'Recent Collated SMS Transactions'
              : 'Household SMS Expense Ledger'}
          </h2>
          <p className="text-xs text-[#525854] mt-0.5">
            <span>{filtered.length} collated SMS entries</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="font-mono font-semibold text-[#141815] tabular-nums">
              {formatINR(totalFilteredAmount)}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>Click "SMS" on any row to inspect verbatim bank message</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E3DC] text-[#141815] hover:bg-[#F2EFE9] transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#525854]" />
            <span>Export CSV</span>
          </button>

          {compactLimit && onViewAllTransactions && (
            <button
              type="button"
              onClick={onViewAllTransactions}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#F2EFE9] text-[#141815] hover:bg-[#E5E3DC] transition-colors whitespace-nowrap shrink-0"
            >
              View Full Ledger ({filtered.length})
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#848A86] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchant, SMS text, sender header (VM-HDFCBK), or ref..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F9F8F5] border border-[#E5E3DC] rounded-lg text-[#141815] placeholder-[#848A86] focus:outline-none focus:border-[#1B4D3E]"
          />
        </div>

        {/* Expense Head & Rail Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedHeadFilter}
            onChange={(e) =>
              onSelectHeadFilter(e.target.value as ExpenseHead | 'ALL')
            }
            aria-label="Filter by Expense Head"
            className="px-3 py-1.5 text-xs font-medium bg-[#F9F8F5] border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
          >
            <option value="ALL">All Expense Heads</option>
            {EXPENSE_HEADS.map((head) => (
              <option key={head} value={head}>
                {head}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-lg overflow-x-auto">
            {PAYMENT_RAILS.map((rail) => (
              <button
                key={rail}
                type="button"
                onClick={() => setSelectedRail(rail)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedRail === rail
                    ? 'bg-white text-[#141815] shadow-xs'
                    : 'text-[#525854] hover:text-[#141815]'
                }`}
              >
                {rail === 'ALL' ? 'All Rails' : rail}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Data Grid */}
      {displayedRows.length === 0 ? (
        <div className="py-12 text-center border-t border-[#F2EFE9] mt-4">
          <p className="text-sm font-medium text-[#141815]">
            No SMS transactions match your current filter
          </p>
          <p className="text-xs text-[#525854] mt-1">
            Try clearing the search query or ingesting a new bank SMS alert.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedRail('ALL');
                onSelectHeadFilter('ALL');
              }}
              className="px-3.5 py-1.5 text-xs font-medium border border-[#E5E3DC] rounded-lg text-[#141815] hover:bg-[#F2EFE9]"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={onOpenSmsModal}
              className="px-3.5 py-1.5 text-xs font-medium bg-[#1B4D3E] text-white rounded-lg hover:bg-[#143B30]"
            >
              Ingest Bank SMS
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E3DC] text-[11px] font-semibold text-[#525854]">
                <th className="py-2.5 pr-4">Date & Time</th>
                <th className="py-2.5 px-4">Merchant & Source Metadata</th>
                <th className="py-2.5 px-4">Family Member</th>
                <th className="py-2.5 px-4">Expense Head</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 pl-4 text-right">Raw SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFE9] text-xs">
              {displayedRows.map((tx) => {
                const member = memberMap.get(tx.memberId);
                const headMeta = EXPENSE_HEAD_META[tx.category];
                const isExpanded = expandedSmsId === tx.id;

                return (
                  <React.Fragment key={tx.id}>
                    <tr className="hover:bg-[#F9F8F5] transition-colors">
                      {/* Date & Time */}
                      <td className="py-3 pr-4 font-mono tabular-nums text-[#525854] whitespace-nowrap">
                        <div className="text-[#141815] font-medium">
                          {tx.date}
                        </div>
                        <div className="text-[11px] text-[#848A86]">
                          {tx.time}
                        </div>
                      </td>

                      {/* Merchant & Unboxed Source Metadata */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#141815]">
                          {tx.merchant}
                          {tx.isInternalTransfer && (
                            <span className="ml-2 text-[11px] font-normal text-[#B45309]">
                              · Internal Family Transfer
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#525854] mt-0.5 flex flex-wrap items-center gap-1">
                          <span className="font-mono text-[#141815]">
                            {tx.senderHeader}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{tx.institutionName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{tx.paymentRail}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{tx.accountMask}</span>
                        </div>
                      </td>

                      {/* Family Member */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {member ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded text-[10px] font-semibold text-white flex items-center justify-center shrink-0"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.initials}
                            </span>
                            <div>
                              <div className="font-medium text-[#141815]">
                                {member.name}
                              </div>
                              <div className="text-[11px] text-[#848A86]">
                                {member.deviceModel}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#525854]">Household</span>
                        )}
                      </td>

                      {/* Inline Re-categorize Expense Head Dropdown */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-xs shrink-0"
                            style={{ backgroundColor: headMeta.color }}
                          />
                          <select
                            value={tx.category}
                            onChange={(e) =>
                              onChangeTransactionCategory(
                                tx.id,
                                e.target.value as ExpenseHead
                              )
                            }
                            aria-label={`Change expense head for ${tx.merchant}`}
                            className="bg-transparent text-xs font-medium text-[#141815] hover:underline focus:outline-none cursor-pointer pr-1"
                          >
                            {EXPENSE_HEADS.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#141815] tabular-nums whitespace-nowrap">
                        {formatINR(tx.amount)}
                      </td>

                      {/* Actions: Inspect Raw SMS & Delete */}
                      <td className="py-3 pl-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSmsId(isExpanded ? null : tx.id)
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                              isExpanded
                                ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                                : 'bg-[#F9F8F5] text-[#525854] border-[#E5E3DC] hover:text-[#141815]'
                            }`}
                          >
                            <MessageSquareText className="w-3 h-3" />
                            <span>SMS</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            title="Delete transaction"
                            className="p-1 text-[#848A86] hover:text-[#B91C1C] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Verbatim SMS Inspector Row */}
                    {isExpanded && (
                      <tr className="bg-[#F9F8F5]">
                        <td colSpan={6} className="px-4 py-3.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="text-[11px] text-[#525854]">
                                <span className="font-semibold text-[#141815]">
                                  Verbatim Collated SMS Payload
                                </span>
                                <span className="mx-1.5" aria-hidden="true">
                                  ·
                                </span>
                                <span>
                                  Read on {member?.name || 'Member'}’s{' '}
                                  {member?.deviceModel || 'Phone'}
                                </span>
                                <span className="mx-1.5" aria-hidden="true">
                                  ·
                                </span>
                                <span className="font-mono">
                                  Ref: {tx.referenceNo}
                                </span>
                              </div>
                              <p className="font-mono text-xs text-[#141815] bg-white px-3 py-2 rounded border border-[#E5E3DC]">
                                {tx.rawSms}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
