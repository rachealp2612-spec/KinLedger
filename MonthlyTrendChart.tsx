import React, { useState } from 'react';
import {
  ExpenseHead,
  FamilyMember,
  SmsTransaction,
} from '../types';
import {
  EXPENSE_HEADS,
  EXPENSE_HEAD_META,
  MONTH_OPTIONS,
} from '../data/initialHouseholdData';
import { formatINR } from '../utils/smsParser';

interface MonthlyTrendChartProps {
  transactions: SmsTransaction[];
  familyMembers: FamilyMember[];
  selectedMonth: string; // 'ALL' or '2026-10', etc.
  onSelectMonth: (monthKey: string) => void;
  totalMonthlyBudget: number;
  selectedMemberId: string;
  excludeInternalTransfers: boolean;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  transactions,
  familyMembers,
  selectedMonth,
  onSelectMonth,
  totalMonthlyBudget,
  selectedMemberId,
  excludeInternalTransfers,
}) => {
  const [stackMode, setStackMode] = useState<'category' | 'member'>('category');
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);

  // Order months chronologically from May 2026 to Oct 2026
  const chronologicalMonths = [...MONTH_OPTIONS].reverse();

  // Filter transactions by member & internal transfer setting (across all months for trend line)
  const relevantTx = transactions.filter((tx) => {
    if (excludeInternalTransfers && tx.isInternalTransfer) return false;
    if (selectedMemberId !== 'ALL' && tx.memberId !== selectedMemberId) return false;
    return true;
  });

  // Compute monthly totals & stacked segments
  const monthlyData = chronologicalMonths.map((m) => {
    const monthTx = relevantTx.filter((t) => t.monthKey === m.key);
    const total = monthTx.reduce((sum, t) => sum + t.amount, 0);

    const byCategory: Record<ExpenseHead, number> = {
      'Groceries & Dining': 0,
      'Housing & Utilities': 0,
      'Transport & Fuel': 0,
      'Shopping & Lifestyle': 0,
      'Healthcare & Wellness': 0,
      'Education & Kids': 0,
    };
    const byMember: Record<string, number> = {};
    familyMembers.forEach((fm) => {
      byMember[fm.id] = 0;
    });

    monthTx.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      byMember[t.memberId] = (byMember[t.memberId] || 0) + t.amount;
    });

    return {
      ...m,
      total,
      txCount: monthTx.length,
      byCategory,
      byMember,
    };
  });

  const maxMonthTotal = Math.max(
    ...monthlyData.map((d) => d.total),
    selectedMemberId === 'ALL' ? totalMonthlyBudget * 1.1 : 45000,
    10000
  );

  const yAxisMax = Math.ceil(maxMonthTotal / 25000) * 25000;

  const activeInspectMonthKey =
    hoveredMonthKey || (selectedMonth !== 'ALL' ? selectedMonth : '2026-10');
  const activeInspectData =
    monthlyData.find((d) => d.key === activeInspectMonthKey) ||
    monthlyData[monthlyData.length - 1];

  // SVG dimensions
  const svgWidth = 680;
  const svgHeight = 270;
  const padLeft = 64;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 38;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    Math.round(yAxisMax * ratio)
  );

  const budgetLineY =
    padTop + plotHeight - (totalMonthlyBudget / yAxisMax) * plotHeight;

  return (
    <div className="bg-white border border-[#E5E3DC] rounded-xl p-6 flex flex-col justify-between">
      {/* Header & Stack Mode Switcher */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E5E3DC]">
          <div>
            <h2 className="text-lg font-semibold text-[#141815] tracking-tight">
              Monthly Household Spending Trend
            </h2>
            <p className="text-xs text-[#525854] mt-0.5">
              6-month collated SMS outflow (May – Oct 2026) · Click any month bar to filter ledger
            </p>
          </div>

          {/* Functional Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-lg">
            <button
              type="button"
              onClick={() => setStackMode('category')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                stackMode === 'category'
                  ? 'bg-white text-[#141815] shadow-xs'
                  : 'text-[#525854] hover:text-[#141815]'
              }`}
            >
              By Expense Head
            </button>
            <button
              type="button"
              onClick={() => setStackMode('member')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                stackMode === 'member'
                  ? 'bg-white text-[#141815] shadow-xs'
                  : 'text-[#525854] hover:text-[#141815]'
              }`}
            >
              By Family Member
            </button>
          </div>
        </div>

        {/* SVG Chart Viewport */}
        <div className="mt-5 relative">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
            role="img"
            aria-label="6-month household spending stacked bar chart"
          >
            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {yTicks.map((tickVal) => {
              const y = padTop + plotHeight - (tickVal / yAxisMax) * plotHeight;
              return (
                <g key={tickVal}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#ECEAE4"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-[#848A86] text-[11px] font-mono tabular-nums"
                  >
                    {tickVal === 0 ? '₹0' : `₹${Math.round(tickVal / 1000)}k`}
                  </text>
                </g>
              );
            })}

            {/* Budget Threshold Line (when viewing Whole Household) */}
            {selectedMemberId === 'ALL' &&
              budgetLineY >= padTop &&
              budgetLineY <= padTop + plotHeight && (
                <g>
                  <line
                    x1={padLeft}
                    y1={budgetLineY}
                    x2={svgWidth - padRight}
                    y2={budgetLineY}
                    stroke="#B45309"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                  />
                  <text
                    x={svgWidth - padRight}
                    y={budgetLineY - 6}
                    textAnchor="end"
                    className="fill-[#B45309] text-[10px] font-mono font-medium"
                  >
                    Monthly Budget Cap ({formatINR(totalMonthlyBudget)})
                  </text>
                </g>
              )}

            {/* Month Stacked Bars */}
            {monthlyData.map((m, idx) => {
              const colWidth = plotWidth / monthlyData.length;
              const barWidth = 44;
              const xCenter = padLeft + idx * colWidth + colWidth / 2;
              const barX = xCenter - barWidth / 2;
              const isSelected = selectedMonth === m.key;
              const isHovered = hoveredMonthKey === m.key;

              // Build segments bottom-up
              const segments: { key: string; label: string; value: number; color: string }[] =
                stackMode === 'category'
                  ? EXPENSE_HEADS.map((head) => ({
                      key: head,
                      label: head,
                      value: m.byCategory[head] || 0,
                      color: EXPENSE_HEAD_META[head].color,
                    }))
                  : familyMembers.map((fm) => ({
                      key: fm.id,
                      label: fm.name,
                      value: m.byMember[fm.id] || 0,
                      color: fm.color,
                    }));

              let cumulativeHeight = 0;

              return (
                <g
                  key={m.key}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredMonthKey(m.key)}
                  onMouseLeave={() => setHoveredMonthKey(null)}
                  onClick={() =>
                    onSelectMonth(selectedMonth === m.key ? 'ALL' : m.key)
                  }
                >
                  {/* Interactive Hover/Active Column Backdrop */}
                  <rect
                    x={xCenter - colWidth / 2 + 4}
                    y={padTop}
                    width={colWidth - 8}
                    height={plotHeight}
                    rx={6}
                    fill={
                      isSelected
                        ? '#1B4D3E'
                        : isHovered
                        ? '#F2EFE9'
                        : 'transparent'
                    }
                    fillOpacity={isSelected ? 0.06 : isHovered ? 0.8 : 0}
                  />

                  {/* Stacked Segments */}
                  {segments.map((seg) => {
                    if (seg.value <= 0) return null;
                    const segHeight = Math.max(
                      (seg.value / yAxisMax) * plotHeight,
                      2
                    );
                    const y =
                      padTop + plotHeight - cumulativeHeight - segHeight;
                    cumulativeHeight += segHeight;

                    return (
                      <rect
                        key={seg.key}
                        x={barX}
                        y={y}
                        width={barWidth}
                        height={Math.max(segHeight - 1, 1.5)}
                        fill={seg.color}
                        rx={2}
                        opacity={
                          selectedMonth === 'ALL' || isSelected || isHovered
                            ? 1
                            : 0.48
                        }
                      />
                    );
                  })}

                  {/* Total Label Above Bar */}
                  <text
                    x={xCenter}
                    y={padTop + plotHeight - cumulativeHeight - 7}
                    textAnchor="middle"
                    className={`text-[11px] font-mono tabular-nums ${
                      isSelected
                        ? 'fill-[#141815] font-semibold'
                        : 'fill-[#525854]'
                    }`}
                  >
                    ₹{Math.round(m.total / 1000)}k
                  </text>

                  {/* Month X-Axis Label */}
                  <text
                    x={xCenter}
                    y={padTop + plotHeight + 22}
                    textAnchor="middle"
                    className={`text-xs ${
                      isSelected
                        ? 'fill-[#1B4D3E] font-semibold'
                        : 'fill-[#525854] font-medium'
                    }`}
                  >
                    {m.shortLabel} ’26
                  </text>

                  {/* Active Selection Underline Indicator */}
                  {isSelected && (
                    <rect
                      x={xCenter - 16}
                      y={padTop + plotHeight + 28}
                      width={32}
                      height={2.5}
                      rx={1.25}
                      fill="#1B4D3E"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Bottom Legend & Inspected Month Summary Strip */}
      <div className="pt-4 mt-3 border-t border-[#E5E3DC]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="text-xs text-[#525854]">
            Inspecting{' '}
            <span className="font-semibold text-[#141815]">
              {activeInspectData.label}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="font-mono font-semibold text-[#141815] tabular-nums">
              {formatINR(activeInspectData.total)}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>{activeInspectData.txCount} SMS entries</span>
            {activeInspectData.key === '2026-10' && (
              <>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span className="text-[#1B4D3E] font-medium">
                  Month-to-date (Oct 1–8)
                </span>
              </>
            )}
          </div>

          {selectedMonth !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectMonth('ALL')}
              className="text-xs font-medium text-[#1B4D3E] hover:underline whitespace-nowrap shrink-0"
            >
              Show All 6 Months
            </button>
          )}
        </div>

        {/* Breakdown Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2">
          {stackMode === 'category'
            ? EXPENSE_HEADS.map((head) => {
                const val = activeInspectData.byCategory[head] || 0;
                const pct =
                  activeInspectData.total > 0
                    ? Math.round((val / activeInspectData.total) * 100)
                    : 0;
                return (
                  <div
                    key={head}
                    className="flex items-center justify-between text-xs py-1 border-b border-[#F2EFE9]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: EXPENSE_HEAD_META[head].color }}
                      />
                      <span className="text-[#525854] truncate">{head}</span>
                    </div>
                    <span className="font-mono text-[#141815] font-medium tabular-nums ml-2 shrink-0">
                      {formatINR(val)} ({pct}%)
                    </span>
                  </div>
                );
              })
            : familyMembers.map((fm) => {
                const val = activeInspectData.byMember[fm.id] || 0;
                const pct =
                  activeInspectData.total > 0
                    ? Math.round((val / activeInspectData.total) * 100)
                    : 0;
                return (
                  <div
                    key={fm.id}
                    className="flex items-center justify-between text-xs py-1 border-b border-[#F2EFE9]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: fm.color }}
                      />
                      <span className="text-[#525854] truncate">{fm.name}</span>
                    </div>
                    <span className="font-mono text-[#141815] font-medium tabular-nums ml-2 shrink-0">
                      {formatINR(val)} ({pct}%)
                    </span>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
};
