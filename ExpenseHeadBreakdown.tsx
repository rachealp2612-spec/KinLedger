import React, { useState } from 'react';
import {
  ExpenseHead,
  SmsTransaction,
  CategoryBudgetMap,
} from '../types';
import {
  EXPENSE_HEADS,
  EXPENSE_HEAD_META,
} from '../data/initialHouseholdData';
import { formatINR } from '../utils/smsParser';
import { SlidersHorizontal, Check } from 'lucide-react';

interface ExpenseHeadBreakdownProps {
  transactions: SmsTransaction[];
  budgets: CategoryBudgetMap;
  onUpdateBudget: (head: ExpenseHead, newLimit: number) => void;
  selectedHeadFilter: ExpenseHead | 'ALL';
  onSelectHeadFilter: (head: ExpenseHead | 'ALL') => void;
  periodLabel: string;
  isMultiMonthView: boolean;
}

export const ExpenseHeadBreakdown: React.FC<ExpenseHeadBreakdownProps> = ({
  transactions,
  budgets,
  onUpdateBudget,
  selectedHeadFilter,
  onSelectHeadFilter,
  periodLabel,
  isMultiMonthView,
}) => {
  const [isEditingBudgets, setIsEditingBudgets] = useState(false);

  const totalSpend = transactions.reduce((sum, t) => sum + t.amount, 0);
  const monthMultiplier = isMultiMonthView ? 6 : 1;

  // Compute breakdown per Expense Head
  const headStats = EXPENSE_HEADS.map((head) => {
    const headTx = transactions.filter((t) => t.category === head);
    const amount = headTx.reduce((sum, t) => sum + t.amount, 0);
    const sharePct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
    const periodBudget = (budgets[head] || 15000) * monthMultiplier;
    const budgetUtilization =
      periodBudget > 0 ? Math.round((amount / periodBudget) * 100) : 0;

    return {
      head,
      amount,
      txCount: headTx.length,
      sharePct,
      periodBudget,
      monthlyBudget: budgets[head] || 15000,
      budgetUtilization,
      color: EXPENSE_HEAD_META[head].color,
      description: EXPENSE_HEAD_META[head].description,
    };
  }).sort((a, b) => b.amount - a.amount);

  // SVG Donut Ring Math
  const size = 156;
  const strokeWidth = 20;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-white border border-[#E5E3DC] rounded-xl p-6 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#E5E3DC]">
          <div>
            <h2 className="text-lg font-semibold text-[#141815] tracking-tight">
              Expense Head Analysis
            </h2>
            <p className="text-xs text-[#525854] mt-0.5">
              {periodLabel} · Click any expense head to filter transactions
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingBudgets((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E3DC] text-[#141815] hover:bg-[#F2EFE9] transition-colors whitespace-nowrap shrink-0"
          >
            {isEditingBudgets ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#1B4D3E]" />
                <span>Done</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#525854]" />
                <span>Edit Budgets</span>
              </>
            )}
          </button>
        </div>

        {/* Proportional Donut + Summary Header */}
        <div className="flex items-center gap-5 py-4 border-b border-[#F2EFE9]">
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="#F2EFE9"
                strokeWidth={strokeWidth}
              />
              {headStats.map((stat) => {
                if (stat.amount <= 0 || totalSpend <= 0) return null;
                const pct = stat.amount / totalSpend;
                const strokeDasharray = `${pct * circumference} ${circumference}`;
                const strokeDashoffset = -accumulatedPercent * circumference;
                accumulatedPercent += pct;
                const isSelected =
                  selectedHeadFilter === 'ALL' ||
                  selectedHeadFilter === stat.head;

                return (
                  <circle
                    key={stat.head}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={stat.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(-90 ${center} ${center})`}
                    className="cursor-pointer transition-opacity duration-150"
                    style={{ opacity: isSelected ? 1 : 0.3 }}
                    onClick={() =>
                      onSelectHeadFilter(
                        selectedHeadFilter === stat.head ? 'ALL' : stat.head
                      )
                    }
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
              <span className="text-[11px] text-[#525854]">Total Outflow</span>
              <span className="text-sm font-mono font-semibold text-[#141815] tabular-nums mt-0.5">
                {formatINR(totalSpend)}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-xs text-[#525854]">
              Highest Expense Head
            </div>
            {headStats[0] && (
              <div>
                <div className="text-sm font-semibold text-[#141815] truncate">
                  {headStats[0].head}
                </div>
                <div className="text-xs text-[#525854] mt-0.5 font-mono tabular-nums">
                  {formatINR(headStats[0].amount)} ·{' '}
                  {Math.round(headStats[0].sharePct)}% of spend
                </div>
              </div>
            )}
            {selectedHeadFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => onSelectHeadFilter('ALL')}
                className="text-xs font-medium text-[#1B4D3E] hover:underline whitespace-nowrap"
              >
                Clear "{selectedHeadFilter}" filter
              </button>
            )}
          </div>
        </div>

        {/* Ranked Expense Head List */}
        <div className="divide-y divide-[#F2EFE9] mt-1">
          {headStats.map((stat) => {
            const isSelected = selectedHeadFilter === stat.head;
            const isOverBudget = stat.amount > stat.periodBudget;
            const isNearBudget =
              !isOverBudget && stat.budgetUtilization >= 85;

            return (
              <div
                key={stat.head}
                onClick={() => {
                  if (!isEditingBudgets) {
                    onSelectHeadFilter(
                      selectedHeadFilter === stat.head ? 'ALL' : stat.head
                    );
                  }
                }}
                className={`py-3 px-2 -mx-2 rounded-lg transition-colors ${
                  !isEditingBudgets ? 'cursor-pointer hover:bg-[#F9F8F5]' : ''
                } ${isSelected ? 'bg-[#F2EFE9]/80' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: stat.color }}
                    />
                    <span className="text-sm font-medium text-[#141815] truncate">
                      {stat.head}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-mono font-semibold text-[#141815] tabular-nums">
                      {formatINR(stat.amount)}
                    </span>
                    <span className="text-xs text-[#525854] font-mono tabular-nums ml-2">
                      ({Math.round(stat.sharePct)}%)
                    </span>
                  </div>
                </div>

                {/* Unboxed metadata + Budget control */}
                <div className="flex items-center justify-between gap-2 mt-1.5 text-xs text-[#525854]">
                  <div>
                    <span>{stat.txCount} SMS</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className={
                        isOverBudget
                          ? 'text-[#B91C1C] font-medium'
                          : isNearBudget
                          ? 'text-[#B45309] font-medium'
                          : 'text-[#525854]'
                      }
                    >
                      {stat.budgetUtilization}% of {formatINR(stat.periodBudget)} cap
                      {isOverBudget ? ' (Exceeded)' : ''}
                    </span>
                  </div>

                  {isEditingBudgets && (
                    <div
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="text-[11px] text-[#525854]">
                        Monthly ₹:
                      </label>
                      <input
                        type="number"
                        step={1000}
                        min={1000}
                        value={stat.monthlyBudget}
                        onChange={(e) =>
                          onUpdateBudget(
                            stat.head,
                            Math.max(1000, Number(e.target.value) || 1000)
                          )
                        }
                        className="w-24 px-2 py-0.5 text-xs font-mono text-right bg-[#F9F8F5] border border-[#E5E3DC] rounded text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                      />
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-[#F2EFE9] rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-transform duration-150 origin-left"
                    style={{
                      width: `${Math.min(stat.budgetUtilization, 100)}%`,
                      backgroundColor: isOverBudget
                        ? '#B91C1C'
                        : isNearBudget
                        ? '#B45309'
                        : stat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
