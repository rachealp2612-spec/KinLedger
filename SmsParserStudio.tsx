import React, { useState, useMemo } from 'react';
import {
  ExpenseHead,
  FamilyMember,
  SmsSourceRule,
  MerchantRule,
  SmsTransaction,
} from '../types';
import {
  EXPENSE_HEADS,
  EXPENSE_HEAD_META,
  SMS_PRESET_TEMPLATES,
} from '../data/initialHouseholdData';
import { parseBankSms, formatINR } from '../utils/smsParser';
import { Smartphone, ArrowRight, CheckCircle2, Layers } from 'lucide-react';

interface SmsParserStudioProps {
  familyMembers: FamilyMember[];
  smsSources: SmsSourceRule[];
  merchantRules: MerchantRule[];
  onIngestTransaction: (tx: Omit<SmsTransaction, 'id'>) => void;
  onIngestBatch: (txList: Omit<SmsTransaction, 'id'>[]) => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const SmsParserStudio: React.FC<SmsParserStudioProps> = ({
  familyMembers,
  smsSources,
  merchantRules,
  onIngestTransaction,
  onIngestBatch,
  isModal = false,
  onCloseModal,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    SMS_PRESET_TEMPLATES[0].id
  );
  const [rawSmsText, setRawSmsText] = useState<string>(
    SMS_PRESET_TEMPLATES[0].rawSms
  );
  const [senderHeader, setSenderHeader] = useState<string>(
    SMS_PRESET_TEMPLATES[0].senderHeader
  );
  const [memberId, setMemberId] = useState<string>(
    SMS_PRESET_TEMPLATES[0].memberId
  );
  const [txDate, setTxDate] = useState<string>('2026-10-08');
  const [customCategoryOverride, setCustomCategoryOverride] =
    useState<ExpenseHead | null>(null);
  const [lastIngestedNotice, setLastIngestedNotice] = useState<string | null>(
    null
  );

  // Live deterministic parse result
  const parsed = useMemo(() => {
    return parseBankSms(
      rawSmsText,
      senderHeader,
      smsSources,
      merchantRules,
      familyMembers
    );
  }, [rawSmsText, senderHeader, smsSources, merchantRules, familyMembers]);

  const effectiveCategory = customCategoryOverride || parsed.category;

  const handleSelectPreset = (presetId: string) => {
    const found = SMS_PRESET_TEMPLATES.find((p) => p.id === presetId);
    if (!found) return;
    setSelectedPresetId(presetId);
    setRawSmsText(found.rawSms);
    setSenderHeader(found.senderHeader);
    const memberExists = familyMembers.some((m) => m.id === found.memberId);
    setMemberId(memberExists ? found.memberId : familyMembers[0]?.id || 'mem-arjun');
    setCustomCategoryOverride(null);
    setLastIngestedNotice(null);
  };

  const handleIngestSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed.isIgnoredOtpOrPromo) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const monthKey = txDate.slice(0, 7);

    onIngestTransaction({
      date: txDate,
      time: timeStr,
      monthKey,
      merchant: parsed.merchant,
      amount: parsed.amount,
      category: effectiveCategory,
      memberId,
      senderHeader: parsed.senderHeader,
      institutionName: parsed.institutionName,
      accountMask: parsed.accountMask,
      paymentRail: parsed.paymentRail,
      referenceNo: parsed.referenceNo,
      rawSms: rawSmsText.trim(),
      isInternalTransfer: parsed.isInternalTransfer,
    });

    const targetMember =
      familyMembers.find((m) => m.id === memberId)?.name || 'Family Member';
    setLastIngestedNotice(
      `Collated ${formatINR(parsed.amount)} at ${parsed.merchant} (${effectiveCategory}) from ${targetMember}’s phone.`
    );

    if (isModal && onCloseModal) {
      setTimeout(() => {
        onCloseModal();
      }, 700);
    }
  };

  const handleSimulateBatchSync = () => {
    const batchTemplates = SMS_PRESET_TEMPLATES.slice(0, 4);
    const items: Omit<SmsTransaction, 'id'>[] = batchTemplates.map((tpl, i) => {
      const p = parseBankSms(
        tpl.rawSms,
        tpl.senderHeader,
        smsSources,
        merchantRules,
        familyMembers
      );
      return {
        date: '2026-10-08',
        time: `20:1${i}`,
        monthKey: '2026-10',
        merchant: p.merchant,
        amount: p.amount,
        category: p.category,
        memberId: familyMembers.some((m) => m.id === tpl.memberId)
          ? tpl.memberId
          : familyMembers[0].id,
        senderHeader: p.senderHeader,
        institutionName: p.institutionName,
        accountMask: p.accountMask,
        paymentRail: p.paymentRail,
        referenceNo: p.referenceNo,
        rawSms: tpl.rawSms,
        isInternalTransfer: p.isInternalTransfer,
      };
    });

    onIngestBatch(items);
    const totalBatch = items.reduce((s, x) => s + x.amount, 0);
    setLastIngestedNotice(
      `Batch collated 4 SMS alerts totaling ${formatINR(totalBatch)} across family devices into Oct 2026 ledger.`
    );
    if (isModal && onCloseModal) {
      setTimeout(() => {
        onCloseModal();
      }, 800);
    }
  };

  return (
    <div
      className={
        isModal
          ? 'bg-white rounded-xl'
          : 'bg-white border border-[#E5E3DC] rounded-xl p-6'
      }
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E5E3DC]">
        <div>
          <h2 className="text-lg font-semibold text-[#141815] tracking-tight">
            Real-Time Bank & Payment SMS Parser Engine
          </h2>
          <p className="text-xs text-[#525854] mt-0.5">
            Simulate incoming SMS messages from any registered family member’s phone or test custom bank/UPI strings
          </p>
        </div>

        <button
          type="button"
          onClick={handleSimulateBatchSync}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#F2EFE9] text-[#141815] rounded-lg hover:bg-[#E5E3DC] transition-colors whitespace-nowrap shrink-0"
        >
          <Layers className="w-3.5 h-3.5 text-[#1B4D3E]" />
          <span>Sync 4 Queued Family SMS</span>
        </button>
      </div>

      {/* Preset Selector Buttons */}
      <div className="mt-5">
        <div className="text-xs font-medium text-[#525854] mb-2">
          Sample Bank, UPI & Utility SMS Presets
        </div>
        <div className="flex flex-wrap gap-2">
          {SMS_PRESET_TEMPLATES.map((preset) => {
            const active = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                    : 'bg-[#F9F8F5] text-[#525854] border-[#E5E3DC] hover:text-[#141815]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setSelectedPresetId('custom-otp');
              setSenderHeader('VM-HDFCBK');
              setRawSmsText(
                'VM-HDFCBK: 849201 is your SECRET One Time Password (OTP) for NetBanking Login. Do not share this code with anyone.'
              );
              setCustomCategoryOverride(null);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              selectedPresetId === 'custom-otp'
                ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                : 'bg-[#F9F8F5] text-[#525854] border-[#E5E3DC] hover:text-[#141815]'
            }`}
          >
            Test OTP Privacy Filter
          </button>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <form
        onSubmit={handleIngestSingle}
        className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        {/* Left Column (7 cols): Device Origin & Raw SMS Payload */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4 bg-[#F9F8F5] border border-[#E5E3DC] rounded-lg p-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#525854] mb-1">
                  Receiving Family Member Phone
                </label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                >
                  {familyMembers.map((fm) => (
                    <option key={fm.id} value={fm.id}>
                      {fm.name} ({fm.deviceModel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525854] mb-1">
                  SMS Sender Header
                </label>
                <input
                  type="text"
                  value={senderHeader}
                  onChange={(e) => setSenderHeader(e.target.value.toUpperCase())}
                  placeholder="VM-HDFCBK"
                  className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525854] mb-1">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#525854] mb-1.5">
                Raw Incoming Bank / Payment App SMS Text (Editable)
              </label>
              <textarea
                rows={4}
                value={rawSmsText}
                onChange={(e) => {
                  setRawSmsText(e.target.value);
                  setSelectedPresetId('custom');
                }}
                placeholder="Paste or type any bank debit, credit card swipe, or UPI SMS alert..."
                className="w-full p-3.5 text-xs font-mono leading-relaxed bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E3DC] flex items-center justify-between text-xs text-[#525854]">
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#1B4D3E]" />
              <span>
                On-device regex parser extracts amount, payee, rail & expense head
              </span>
            </div>
            <span className="font-mono">{rawSmsText.length} chars</span>
          </div>
        </div>

        {/* Right Column (5 cols): Live Extracted Ledger Entry Preview */}
        <div className="lg:col-span-5 bg-[#F9F8F5] border border-[#E5E3DC] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#141815] pb-3 border-b border-[#E5E3DC] flex items-center justify-between">
              <span>Live Extracted Ledger Fields</span>
              <span className="font-mono text-[11px] text-[#1B4D3E]">
                {parsed.isIgnoredOtpOrPromo
                  ? 'BLOCKED BY OTP SHIELD'
                  : 'READY TO COLLATE'}
              </span>
            </div>

            {parsed.isIgnoredOtpOrPromo ? (
              <div className="py-8 text-center space-y-2">
                <div className="text-sm font-semibold text-[#B45309]">
                  Privacy Shield: Security OTP Ignored
                </div>
                <p className="text-xs text-[#525854] max-w-xs mx-auto leading-relaxed">
                  {parsed.ignoreReason} This SMS stays strictly on the family member’s phone and is never uploaded to the household ledger.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-baseline justify-between py-1.5 border-b border-[#E5E3DC]">
                  <span className="text-[#525854]">Extracted Amount</span>
                  <span className="text-lg font-mono font-bold text-[#141815] tabular-nums">
                    {formatINR(parsed.amount)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between py-1.5 border-b border-[#E5E3DC]">
                  <span className="text-[#525854]">Merchant / Payee</span>
                  <span className="font-semibold text-[#141815] text-right">
                    {parsed.merchant}
                  </span>
                </div>

                <div className="flex items-baseline justify-between py-1.5 border-b border-[#E5E3DC]">
                  <span className="text-[#525854]">Source & Rail</span>
                  <span className="font-mono text-[#141815]">
                    {parsed.senderHeader} · {parsed.paymentRail} ·{' '}
                    {parsed.accountMask}
                  </span>
                </div>

                <div className="flex items-baseline justify-between py-1.5 border-b border-[#E5E3DC]">
                  <span className="text-[#525854]">Reference ID</span>
                  <span className="font-mono text-[#525854]">
                    {parsed.referenceNo}
                  </span>
                </div>

                <div className="py-1.5 border-b border-[#E5E3DC]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[#525854]">Assigned Expense Head</span>
                    <span
                      className="w-2.5 h-2.5 rounded-xs"
                      style={{
                        backgroundColor:
                          EXPENSE_HEAD_META[effectiveCategory].color,
                      }}
                    />
                  </div>
                  <select
                    value={effectiveCategory}
                    onChange={(e) =>
                      setCustomCategoryOverride(e.target.value as ExpenseHead)
                    }
                    className="w-full px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                  >
                    {EXPENSE_HEADS.map((head) => (
                      <option key={head} value={head}>
                        {head}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-[#525854] mt-1">
                    {customCategoryOverride
                      ? 'Manual Expense Head override selected'
                      : parsed.classificationReason}
                  </div>
                </div>

                {parsed.isInternalTransfer && (
                  <div className="p-2.5 bg-[#FEF3C7] border border-[#D97706]/30 rounded-lg text-[11px] text-[#92400E]">
                    <strong>Internal Family Transfer Detected:</strong> Payee matches a registered family member. This entry will be tagged so it can be excluded from household expense totals.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-[#E5E3DC]">
            {lastIngestedNotice && (
              <div className="mb-3 flex items-center gap-2 text-xs text-[#1B4D3E] font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{lastIngestedNotice}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={parsed.isIgnoredOtpOrPromo}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                parsed.isIgnoredOtpOrPromo
                  ? 'bg-[#E5E3DC] text-[#848A86] cursor-not-allowed'
                  : 'bg-[#1B4D3E] text-white hover:bg-[#143B30]'
              }`}
            >
              <span>Ingest & Collate into Household Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
