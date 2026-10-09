import {
  ExpenseHead,
  PaymentRail,
  SmsSourceRule,
  MerchantRule,
  FamilyMember,
} from '../types';

export interface ParsedSmsResult {
  amount: number;
  merchant: string;
  senderHeader: string;
  institutionName: string;
  accountMask: string;
  paymentRail: PaymentRail;
  referenceNo: string;
  category: ExpenseHead;
  classificationReason: string;
  isInternalTransfer: boolean;
  isIgnoredOtpOrPromo: boolean;
  ignoreReason?: string;
}

export function formatINR(amount: number): string {
  const rounded = Math.round(amount);
  return '₹' + rounded.toLocaleString('en-IN');
}

export function parseBankSms(
  rawSmsInput: string,
  senderOverride: string,
  smsSources: SmsSourceRule[],
  merchantRules: MerchantRule[],
  familyMembers: FamilyMember[]
): ParsedSmsResult {
  const raw = rawSmsInput.trim();

  // Check if message is an OTP or promotional message (Privacy Shield)
  const lower = raw.toLowerCase();
  if (
    /\b(otp|one time password|verification code|do not share|login code)\b/i.test(raw) &&
    !/\b(debited|spent|paid|sent|auto-debit|trf to)\b/i.test(raw)
  ) {
    return {
      amount: 0,
      merchant: 'Ignored Security OTP',
      senderHeader: senderOverride || 'AUTH-OTP',
      institutionName: 'On-Device Privacy Shield',
      accountMask: 'N/A',
      paymentRail: 'UPI',
      referenceNo: 'OTP-FILTERED',
      category: 'Groceries & Dining',
      classificationReason: 'Filtered on-device: Security OTP message',
      isInternalTransfer: false,
      isIgnoredOtpOrPromo: true,
      ignoreReason: 'Message contains an OTP / verification code and no debit instruction.',
    };
  }

  // 1. Extract Sender Header if prefixed like "VM-HDFCBK: ..."
  let detectedHeader = senderOverride.trim().toUpperCase();
  const headerMatch = raw.match(/^([A-Z]{2}-[A-Z0-9]{4,8}):\s*/i);
  const bodyWithoutPrefix = headerMatch ? raw.slice(headerMatch[0].length) : raw;
  if (headerMatch && !senderOverride) {
    detectedHeader = headerMatch[1].toUpperCase();
  }
  if (!detectedHeader) {
    detectedHeader = 'VM-HDFCBK';
  }

  const matchedSource = smsSources.find(
    (s) => s.senderHeader.toUpperCase() === detectedHeader
  );
  const institutionName = matchedSource ? matchedSource.institutionName : 'Bank SMS Alert';

  // 2. Extract Amount (supports Rs., INR, ₹ followed by numbers)
  let amount = 0;
  const amountRegex = /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
  const amountMatch = bodyWithoutPrefix.match(amountRegex);
  if (amountMatch && amountMatch[1]) {
    const cleanNum = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!isNaN(cleanNum)) {
      amount = Math.round(cleanNum);
    }
  } else {
    // Fallback: look for "debited by 1250" or similar
    const fallbackAmt = bodyWithoutPrefix.match(/(?:debited by|spent|paid|of)\s+([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (fallbackAmt && fallbackAmt[1]) {
      amount = Math.round(parseFloat(fallbackAmt[1].replace(/,/g, '')));
    }
  }

  // 3. Extract Account / Card Mask
  let accountMask = 'XX4821';
  const maskMatch =
    bodyWithoutPrefix.match(/(?:a\/c|acct|account|card(?:\s+no\.?)?)\s*(?:no\.?\s*)?(?:\*{1,4}|x{1,4}|XX)?([0-9]{3,4})/i) ||
    bodyWithoutPrefix.match(/(?:\*\*|XX|X)([0-9]{4})\b/i);
  if (maskMatch && maskMatch[1]) {
    accountMask = `XX${maskMatch[1].slice(-4)}`;
  }

  // 4. Detect Payment Rail
  let paymentRail: PaymentRail = 'UPI';
  if (/\b(auto-debit|nach|mandate|autopay|bill auto-debit)\b/i.test(bodyWithoutPrefix)) {
    paymentRail = 'Auto-Debit';
  } else if (/\b(credit card|card\s+xx|card\s+no)\b/i.test(bodyWithoutPrefix)) {
    paymentRail = 'Credit Card';
  } else if (/\b(neft|imps|rtgs|netbanking|inf\/|bil\*)\b/i.test(bodyWithoutPrefix)) {
    paymentRail = 'NetBanking';
  } else if (/\b(upi|vpa|gpay|google pay|phonepe|paytm)\b/i.test(bodyWithoutPrefix)) {
    paymentRail = 'UPI';
  } else if (/\b(pos|swipe)\b/i.test(bodyWithoutPrefix)) {
    paymentRail = 'POS Card';
  }

  // 5. Extract Reference Number
  let referenceNo = `REF/${Math.floor(100000000 + Math.random() * 900000000)}`;
  const refMatch =
    bodyWithoutPrefix.match(/(?:UPI Ref(?:\s*No\.?)?|Ref(?:\s*No\.?)?|Refno|Ref:?)\s*([A-Z0-9/]{6,18})/i);
  if (refMatch && refMatch[1]) {
    referenceNo = refMatch[1].replace(/\.$/, '');
  }

  // 6. Extract Merchant / Payee Name
  let merchant = 'Household Merchant';
  // Check parenthetical name after VPA first: e.g., to VPA abc@bank (BigBasket Supermarket)
  const parenMatch = bodyWithoutPrefix.match(/VPA\s+[a-zA-Z0-9._-]+@[a-zA-Z0-9]+\s*\(([^)]+)\)/i);
  if (parenMatch && parenMatch[1]) {
    merchant = parenMatch[1].trim();
  } else {
    // Check common patterns
    const patterns = [
      /\bInfo:\s*(?:BIL\*)?([^.]+?)(?:\.\s*Ref|$)/i,
      /\btowards\s+([A-Za-z0-9\s&'-]+?)(?:\s+processed|\s+completed|\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2}|\.|$)/i,
      /\btrf to\s+([A-Za-z0-9\s&'-]+?)(?:\s+Refno|\s+Ref|\.|$)/i,
      /\bat\s+([A-Za-z0-9\s&'-]+?)(?:\s+on\s+\d|\.\s*Avl|\.\s*Ref|\.|$)/i,
      /\bto\s+([A-Za-z0-9\s&'-]+?)(?:\s+using|\s+via|\s+on\s+\d|\.\s*UPI|\.|$)/i,
      /\bfor\s+([A-Za-z0-9\s&'-]+?)(?:\s+Account|\s+via|\.|$)/i,
    ];
    for (const pat of patterns) {
      const m = bodyWithoutPrefix.match(pat);
      if (m && m[1] && m[1].trim().length > 2) {
        merchant = m[1].trim();
        break;
      }
    }
  }

  // 7. Check if recipient is a registered family member (Internal Transfer Auto-Deduplication)
  let isInternalTransfer = false;
  for (const member of familyMembers) {
    const firstName = member.name.split(' ')[0].toLowerCase();
    const fullName = member.name.toLowerCase();
    if (
      merchant.toLowerCase().includes(fullName) ||
      lower.includes(fullName.replace(/\s+/g, '')) ||
      (merchant.toLowerCase().includes(firstName) && lower.includes('sharma'))
    ) {
      isInternalTransfer = true;
      break;
    }
  }

  // 8. Classify Expense Head
  let category: ExpenseHead = matchedSource?.defaultHead || 'Groceries & Dining';
  let classificationReason = matchedSource
    ? `Default head for ${matchedSource.senderHeader} (${matchedSource.institutionName})`
    : 'Default household category';

  // Priority A: User-configured Merchant Rules
  for (const rule of merchantRules) {
    if (
      merchant.toLowerCase().includes(rule.keyword.toLowerCase()) ||
      bodyWithoutPrefix.toLowerCase().includes(rule.keyword.toLowerCase())
    ) {
      category = rule.expenseHead;
      classificationReason = `Matched merchant rule "${rule.keyword}"`;
      break;
    }
  }

  // Priority B: Built-in keyword heuristics if no custom merchant rule matched
  if (classificationReason.startsWith('Default')) {
    if (/\b(grocery|supermarket|mart|basket|food|swiggy|zomato|blinkit|Zepto|cafe|restaurant|bakery|dairy)\b/i.test(bodyWithoutPrefix)) {
      category = 'Groceries & Dining';
      classificationReason = 'Heuristic match: Food & Grocery keywords';
    } else if (/\b(electricity|bescom|society|maintenance|water|gas|airtel|jio|broadband|fiber|rent|plumber|urban company)\b/i.test(bodyWithoutPrefix)) {
      category = 'Housing & Utilities';
      classificationReason = 'Heuristic match: Housing, Bill & Utility keywords';
    } else if (/\b(petrol|fuel|shell|indianoil|hpcl|bpcl|uber|ola|metro|fastag|toll|parking|service|garage)\b/i.test(bodyWithoutPrefix)) {
      category = 'Transport & Fuel';
      classificationReason = 'Heuristic match: Fuel & Transit keywords';
    } else if (/\b(pharmacy|apollo|hospital|clinic|doctor|dental|lab|diagnostic|1mg|medplus|health|gym|cultfit)\b/i.test(bodyWithoutPrefix)) {
      category = 'Healthcare & Wellness';
      classificationReason = 'Heuristic match: Medical & Pharmacy keywords';
    } else if (/\b(school|college|university|tuition|academy|allen|books|crossword|stationery|fee|course)\b/i.test(bodyWithoutPrefix)) {
      category = 'Education & Kids';
      classificationReason = 'Heuristic match: Education & Fee keywords';
    } else if (/\b(amazon|myntra|flipkart|uniqlo|zara|croma|reliance digital|mall|apparel|lifestyle|decathlon)\b/i.test(bodyWithoutPrefix)) {
      category = 'Shopping & Lifestyle';
      classificationReason = 'Heuristic match: Retail & Lifestyle keywords';
    }
  }

  return {
    amount: amount > 0 ? amount : 1250,
    merchant,
    senderHeader: detectedHeader,
    institutionName,
    accountMask,
    paymentRail,
    referenceNo,
    category,
    classificationReason,
    isInternalTransfer,
    isIgnoredOtpOrPromo: false,
  };
}
