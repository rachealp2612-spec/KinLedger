import React, { useState } from 'react';
import {
  ExpenseHead,
  FamilyMember,
  SmsSourceRule,
  MerchantRule,
  SmsTransaction,
} from '../types';
import { EXPENSE_HEADS } from '../data/initialHouseholdData';
import { formatINR } from '../utils/smsParser';
import {
  UserPlus,
  Smartphone,
  ShieldCheck,
  Plus,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';

interface FamilyAndSourcesViewProps {
  familyMembers: FamilyMember[];
  onAddFamilyMember: (member: Omit<FamilyMember, 'id'>) => void;
  onRemoveFamilyMember: (id: string) => void;
  smsSources: SmsSourceRule[];
  onToggleSource: (id: string) => void;
  onAddSmsSource: (source: Omit<SmsSourceRule, 'id'>) => void;
  merchantRules: MerchantRule[];
  onAddMerchantRule: (keyword: string, expenseHead: ExpenseHead) => void;
  onRemoveMerchantRule: (id: string) => void;
  transactions: SmsTransaction[];
  selectedMonth: string;
}

const MEMBER_COLORS = [
  '#1B4D3E',
  '#2B5B84',
  '#D97706',
  '#0D9488',
  '#7E3AF2',
  '#BE123C',
];

export const FamilyAndSourcesView: React.FC<FamilyAndSourcesViewProps> = ({
  familyMembers,
  onAddFamilyMember,
  onRemoveFamilyMember,
  smsSources,
  onToggleSource,
  onAddSmsSource,
  merchantRules,
  onAddMerchantRule,
  onRemoveMerchantRule,
  transactions,
  selectedMonth,
}) => {
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Add Member Form State
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('Member · Daughter');
  const [memberPhone, setMemberPhone] = useState('+91 98209 ··· 72');
  const [memberDevice, setMemberDevice] = useState('Samsung Galaxy S23');
  const [memberPlatform, setMemberPlatform] = useState<
    'Android SMS Sync' | 'iOS SMS Shortcut'
  >('Android SMS Sync');
  const [memberAllowance, setMemberAllowance] = useState(18000);
  const [selectedSenders, setSelectedSenders] = useState<string[]>([
    'VM-HDFCBK',
    'JD-GPAY',
  ]);

  // Add SMS Source Rule State
  const [showAddSourceForm, setShowAddSourceForm] = useState(false);
  const [newSenderHeader, setNewSenderHeader] = useState('');
  const [newInstitution, setNewInstitution] = useState('');
  const [newSourceType, setNewSourceType] = useState<
    'Bank Account' | 'Credit Card' | 'UPI App' | 'Utility Biller'
  >('Bank Account');
  const [newDefaultHead, setNewDefaultHead] = useState<ExpenseHead>(
    'Groceries & Dining'
  );

  // Add Merchant Rule State
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordHead, setNewKeywordHead] = useState<ExpenseHead>(
    'Groceries & Dining'
  );

  const handleCopyPairingCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('FS-884-291').catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    const parts = memberName.trim().split(' ');
    const initials =
      parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : memberName.slice(0, 2).toUpperCase();

    onAddFamilyMember({
      name: memberName.trim(),
      role: memberRole.trim() || 'Family Member',
      phoneMask: memberPhone.trim() || '+91 98200 ··· 00',
      deviceModel: memberDevice.trim() || 'Android Device',
      osPlatform: memberPlatform,
      appVersion: 'v2.4.1',
      lastSyncText: 'Registered just now',
      monthlyAllowance: Number(memberAllowance) || 15000,
      initials,
      color: MEMBER_COLORS[familyMembers.length % MEMBER_COLORS.length],
      connectedSenders:
        selectedSenders.length > 0 ? selectedSenders : ['VM-HDFCBK'],
    });

    setMemberName('');
    setShowAddMemberForm(false);
  };

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSenderHeader.trim() || !newInstitution.trim()) return;

    onAddSmsSource({
      senderHeader: newSenderHeader.trim().toUpperCase(),
      institutionName: newInstitution.trim(),
      sourceType: newSourceType,
      defaultHead: newDefaultHead,
      enabled: true,
      samplePattern: `Rs. <AMT> debited via ${newInstitution.trim()} to <MERCHANT>`,
    });

    setNewSenderHeader('');
    setNewInstitution('');
    setShowAddSourceForm(false);
  };

  const handleCreateMerchantRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    onAddMerchantRule(newKeyword.trim(), newKeywordHead);
    setNewKeyword('');
  };

  const toggleSenderSelection = (header: string) => {
    setSelectedSenders((prev) =>
      prev.includes(header)
        ? prev.filter((h) => h !== header)
        : [...prev, header]
    );
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: FAMILY MEMBER DEVICES & APP REGISTRATION */}
      <div className="bg-white border border-[#E5E3DC] rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E5E3DC]">
          <div>
            <h2 className="text-lg font-semibold text-[#141815] tracking-tight">
              Registered Family Members & Companion Devices
            </h2>
            <p className="text-xs text-[#525854] mt-0.5">
              Each family member installs the FamSpend companion app on their phone to collate bank and UPI SMS into the shared household ledger
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddMemberForm((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B30] transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>
              {showAddMemberForm
                ? 'Close Registration Form'
                : 'Register Family Member'}
            </span>
          </button>
        </div>

        {/* Household Companion App Onboarding & Pairing Banner */}
        <div className="mt-5 p-4 bg-[#F9F8F5] border border-[#E5E3DC] rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-[#141815]">
              How Family SMS Onboarding Works
            </div>
            <p className="text-xs text-[#525854] max-w-3xl leading-relaxed">
              01. Family member downloads the FamSpend mobile reader app · 02. Enters the Household Pairing Code below · 03. Grants local SMS filter permission for configured bank & UPI sender headers. Personal chats and 2FA OTPs never leave their phone.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 bg-white border border-[#E5E3DC] rounded-lg">
              <div className="text-[10px] text-[#525854]">
                Household Pairing Code
              </div>
              <div className="text-sm font-mono font-semibold text-[#141815] tracking-wider">
                FS-884-291
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyPairingCode}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium bg-white border border-[#E5E3DC] rounded-lg text-[#141815] hover:bg-[#F2EFE9] transition-colors whitespace-nowrap shrink-0"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#1B4D3E]" />
                  <span>Copied Code</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#525854]" />
                  <span>Copy Invite Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expandable New Family Member Registration Form */}
        {showAddMemberForm && (
          <form
            onSubmit={handleCreateMember}
            className="mt-5 p-5 bg-[#F9F8F5] border border-[#E5E3DC] rounded-lg space-y-4"
          >
            <div className="text-sm font-semibold text-[#141815]">
              Register New Family Member Device
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#525854] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Sharma"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525854] mb-1">
                  Household Role
                </label>
                <input
                  type="text"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525854] mb-1">
                  Phone Number Mask
                </label>
                <input
                  type="text"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525854] mb-1">
                  Phone Model
                </label>
                <input
                  type="text"
                  value={memberDevice}
                  onChange={(e) => setMemberDevice(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525854] mb-1">
                  SMS Ingestion Mode
                </label>
                <select
                  value={memberPlatform}
                  onChange={(e) =>
                    setMemberPlatform(
                      e.target.value as
                        | 'Android SMS Sync'
                        | 'iOS SMS Shortcut'
                    )
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                >
                  <option value="Android SMS Sync">
                    Android Broadcast SMS Reader
                  </option>
                  <option value="iOS SMS Shortcut">
                    iOS Automation SMS Forwarder
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525854] mb-1">
                  Monthly Target Allowance (₹)
                </label>
                <input
                  type="number"
                  step={1000}
                  min={2000}
                  value={memberAllowance}
                  onChange={(e) => setMemberAllowance(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#525854] mb-1.5">
                Bank & Payment SMS Senders to Monitor on This Phone
              </label>
              <div className="flex flex-wrap gap-2">
                {smsSources.map((src) => {
                  const active = selectedSenders.includes(src.senderHeader);
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => toggleSenderSelection(src.senderHeader)}
                      className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                          : 'bg-white text-[#525854] border-[#E5E3DC] hover:text-[#141815]'
                      }`}
                    >
                      {src.senderHeader} ({src.institutionName})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMemberForm(false)}
                className="px-4 py-2 text-xs font-medium text-[#525854] hover:text-[#141815]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B30]"
              >
                Complete Device Registration
              </button>
            </div>
          </form>
        )}

        {/* Member Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {familyMembers.map((member) => {
            const memberTx = transactions.filter(
              (t) =>
                t.memberId === member.id &&
                !t.isInternalTransfer &&
                (selectedMonth === 'ALL' || t.monthKey === selectedMonth)
            );
            const memberSpend = memberTx.reduce((sum, t) => sum + t.amount, 0);
            const capPeriod =
              selectedMonth === 'ALL'
                ? member.monthlyAllowance * 6
                : member.monthlyAllowance;
            const utilPct =
              capPeriod > 0 ? Math.round((memberSpend / capPeriod) * 100) : 0;

            return (
              <div
                key={member.id}
                className="p-5 border border-[#E5E3DC] rounded-lg flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.initials}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#141815]">
                          {member.name}
                        </h3>
                        {/* Zero-pill metadata */}
                        <div className="text-xs text-[#525854] mt-0.5">
                          <span>{member.role}</span>
                          <span className="mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-mono">{member.phoneMask}</span>
                        </div>
                      </div>
                    </div>

                    {familyMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveFamilyMember(member.id)}
                        title="Remove member device"
                        className="p-1.5 text-[#848A86] hover:text-[#B91C1C] rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Device & SMS Reader Metadata */}
                  <div className="mt-4 pt-3 border-t border-[#F2EFE9] flex flex-wrap items-center gap-y-1 text-xs text-[#525854]">
                    <Smartphone className="w-3.5 h-3.5 mr-1.5 text-[#525854]" />
                    <span>{member.deviceModel}</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span>{member.osPlatform}</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono">{member.appVersion}</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[#1B4D3E] font-medium">
                      {member.lastSyncText}
                    </span>
                  </div>

                  <div className="mt-2.5 text-xs text-[#525854]">
                    <span className="text-[#848A86]">Monitored SMS Headers: </span>
                    <span className="font-mono text-[#141815]">
                      {member.connectedSenders.join(' · ')}
                    </span>
                  </div>
                </div>

                {/* Member Spend & Allowance Utilization */}
                <div className="pt-3 border-t border-[#F2EFE9]">
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="text-[#525854]">
                      Collated Spend ({memberTx.length} SMS)
                    </span>
                    <span className="font-mono font-semibold text-[#141815] tabular-nums">
                      {formatINR(memberSpend)}{' '}
                      <span className="font-normal text-[#525854]">
                        / {formatINR(capPeriod)} ({utilPct}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F2EFE9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(utilPct, 100)}%`,
                        backgroundColor:
                          utilPct > 100 ? '#B91C1C' : member.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: CONFIGURED BANK, UPI & UTILITY SMS SOURCES */}
      <div className="bg-white border border-[#E5E3DC] rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E5E3DC]">
          <div>
            <h2 className="text-lg font-semibold text-[#141815] tracking-tight">
              Configured Bank, Payment App & Biller SMS Sources
            </h2>
            <p className="text-xs text-[#525854] mt-0.5">
              Define which sender IDs are read by family devices and their fallback expense head
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddSourceForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E5E3DC] text-[#141815] hover:bg-[#F2EFE9] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {showAddSourceForm ? 'Cancel' : 'Add SMS Sender Rule'}
            </span>
          </button>
        </div>

        {showAddSourceForm && (
          <form
            onSubmit={handleCreateSource}
            className="mt-5 p-4 bg-[#F9F8F5] border border-[#E5E3DC] rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-[#525854] mb-1">
                SMS Sender Header
              </label>
              <input
                type="text"
                required
                placeholder="e.g. JK-KOTAKB"
                value={newSenderHeader}
                onChange={(e) => setNewSenderHeader(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-[#E5E3DC] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525854] mb-1">
                Bank / Payment App Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kotak Mahindra Bank"
                value={newInstitution}
                onChange={(e) => setNewInstitution(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E3DC] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525854] mb-1">
                Source Type
              </label>
              <select
                value={newSourceType}
                onChange={(e) =>
                  setNewSourceType(
                    e.target.value as SmsSourceRule['sourceType']
                  )
                }
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E3DC] rounded-lg"
              >
                <option value="Bank Account">Bank Account</option>
                <option value="Credit Card">Credit Card</option>
                <option value="UPI App">UPI App</option>
                <option value="Utility Biller">Utility Biller</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525854] mb-1">
                Default Expense Head
              </label>
              <select
                value={newDefaultHead}
                onChange={(e) =>
                  setNewDefaultHead(e.target.value as ExpenseHead)
                }
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E3DC] rounded-lg"
              >
                {EXPENSE_HEADS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B30] whitespace-nowrap"
            >
              Save Rule
            </button>
          </form>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E3DC] text-[11px] font-semibold text-[#525854]">
                <th className="py-2.5 pr-4">Sender ID</th>
                <th className="py-2.5 px-4">Institution / App</th>
                <th className="py-2.5 px-4">Channel Type</th>
                <th className="py-2.5 px-4">Default Expense Head</th>
                <th className="py-2.5 px-4 text-right">Collated SMS</th>
                <th className="py-2.5 pl-4 text-right">Listener State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFE9] text-xs">
              {smsSources.map((src) => {
                const count = transactions.filter(
                  (t) => t.senderHeader === src.senderHeader
                ).length;

                return (
                  <tr key={src.id} className="hover:bg-[#F9F8F5]">
                    <td className="py-3 pr-4 font-mono font-semibold text-[#141815]">
                      {src.senderHeader}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#141815]">
                        {src.institutionName}
                      </div>
                      <div className="text-[11px] font-mono text-[#848A86] truncate max-w-xs">
                        {src.samplePattern}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#525854]">
                      {src.sourceType}
                    </td>
                    <td className="py-3 px-4 text-[#141815]">
                      {src.defaultHead}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#141815]">
                      {count}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleSource(src.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                          src.enabled
                            ? 'bg-[#EAF1EE] text-[#1B4D3E] border-[#1B4D3E]/30'
                            : 'bg-[#F2EFE9] text-[#525854] border-[#E5E3DC]'
                        }`}
                      >
                        {src.enabled ? 'Listening' : 'Paused'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: MERCHANT AUTO-CATEGORIZATION RULES & PRIVACY SHIELD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E5E3DC] rounded-xl p-6">
          <h3 className="text-base font-semibold text-[#141815]">
            Merchant Keyword → Expense Head Rules
          </h3>
          <p className="text-xs text-[#525854] mt-0.5">
            Whenever an incoming bank or UPI SMS contains these merchant keywords, FamSpend assigns the corresponding Expense Head automatically
          </p>

          <form
            onSubmit={handleCreateMerchantRule}
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              placeholder="Merchant keyword (e.g. Zepto, FirstCry, HPCL)"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 text-xs bg-[#F9F8F5] border border-[#E5E3DC] rounded-lg text-[#141815] focus:outline-none focus:border-[#1B4D3E]"
            />
            <select
              value={newKeywordHead}
              onChange={(e) => setNewKeywordHead(e.target.value as ExpenseHead)}
              className="px-3 py-2 text-xs bg-[#F9F8F5] border border-[#E5E3DC] rounded-lg text-[#141815]"
            >
              {EXPENSE_HEADS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B30] whitespace-nowrap shrink-0"
            >
              Add Keyword Rule
            </button>
          </form>

          <div className="mt-4 max-h-60 overflow-y-auto divide-y divide-[#F2EFE9] border-t border-[#E5E3DC]">
            {merchantRules.map((rule) => (
              <div
                key={rule.id}
                className="py-2 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-medium text-[#141815]">
                    "{rule.keyword}"
                  </span>
                  <span className="mx-2 text-[#848A86]">→</span>
                  <span className="text-[#525854]">{rule.expenseHead}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveMerchantRule(rule.id)}
                  className="text-[#848A86] hover:text-[#B91C1C] p-1"
                  title="Delete keyword rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* On-Device Privacy & Deduplication Architecture */}
        <div className="bg-white border border-[#E5E3DC] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#1B4D3E] font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>On-Device SMS Privacy Filter</span>
            </div>
            <p className="text-xs text-[#525854] mt-2 leading-relaxed">
              Family members retain full privacy over personal text messages. The companion app applies three local guardrails before syncing any entry:
            </p>
            <ul className="mt-3 space-y-2.5 text-xs text-[#525854]">
              <li className="pb-2 border-b border-[#F2EFE9]">
                <strong className="text-[#141815]">01. Sender Whitelist Only:</strong>{' '}
                Only commercial 6-character DLT headers (e.g. VM-HDFCBK, JD-GPAY) are inspected. Personal mobile numbers are ignored.
              </li>
              <li className="pb-2 border-b border-[#F2EFE9]">
                <strong className="text-[#141815]">02. OTP & Balance Redaction:</strong>{' '}
                2FA login OTPs and promotional loan offers are discarded locally on the phone.
              </li>
              <li>
                <strong className="text-[#141815]">03. Family Transfer Deduplication:</strong>{' '}
                UPI transfers between two registered family members are automatically flagged so household spending is never double-counted.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
