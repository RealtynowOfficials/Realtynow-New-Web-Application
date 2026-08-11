// Quick test runner for partner-validation.ts validators
// Run with: node --input-type=module < test-partner-validation.mjs

// Inline the validators since we can't import TS directly from node
function validatePartnerType(value) {
  const PARTNER_TYPES = [
    'Individual Partner','Real Estate Consultant','Property Consultant','Broker',
    'Channel Partner','Referral Partner','Corporate Partner','Builder / Developer Partner',
    'Financial Partner','Interior / Home Services Partner','Legal / Documentation Partner','Other',
  ];
  if (!value || !value.trim()) return 'Partner Type is required.';
  if (!PARTNER_TYPES.includes(value)) return 'Please select a valid partner type.';
  return null;
}

function validateFullName(raw) {
  const value = raw.trim();
  if (!value) return 'Please enter your full name.';
  if (value.length < 2) return 'Please enter a valid full name.';
  if (value.length > 100) return 'Full name must be 100 characters or fewer.';
  if (!/^[\p{L}\s'.\-]+$/u.test(value)) return 'Please enter a valid full name.';
  if (!/[\p{L}]/u.test(value)) return 'Please enter a valid full name.';
  return null;
}

function validateMobileNumber(raw) {
  if (!raw || !raw.trim()) return 'Mobile number is required.';
  const stripped = raw.trim().replace(/^\+91/, '').replace(/^91/, '');
  if (/\D/.test(stripped)) return 'Please enter a valid 10-digit mobile number.';
  if (stripped.length !== 10) return 'Please enter a valid 10-digit mobile number.';
  if (!/^[6-9]\d{9}$/.test(stripped)) return 'Please enter a valid 10-digit mobile number.';
  return null;
}

function validateEmail(raw, required = false) {
  const value = raw.trim();
  if (!value) return required ? 'Email address is required.' : null;
  if (value.length > 254) return 'Please enter a valid email address.';
  const emailRe = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (!emailRe.test(value)) return 'Please enter a valid email address.';
  return null;
}

function validateGSTIN(raw, required = false) {
  const value = raw.trim().toUpperCase();
  if (!value) return required ? 'GST Number is required for this Partner Type.' : null;
  if (value.length !== 15) return 'Please enter a valid GST Number.';
  const gstinRe = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  if (!gstinRe.test(value)) return 'Please enter a valid GST Number.';
  const STATE_CODES = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','97','99'];
  const stateCode = value.substring(0, 2);
  if (!STATE_CODES.includes(stateCode)) return 'Please enter a valid GST Number.';
  if (/^(.)\1+$/.test(value)) return 'Please enter a valid GST Number.';
  return null;
}

function validatePAN(raw, required = false) {
  const value = raw.trim().toUpperCase();
  if (!value) return required ? 'PAN Number is required for this Partner Type.' : null;
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)) return 'Please enter a valid PAN Number (e.g. ABCDE1234F).';
  return null;
}

function validateWebsiteUrl(raw) {
  const value = raw.trim();
  if (!value) return null;
  const OBVIOUSLY_INVALID = ['http', 'https', 'http:', 'https:', 'http://', 'https://', 'www', 'ftp'];
  if (OBVIOUSLY_INVALID.includes(value.toLowerCase())) return 'Please enter a valid website URL, e.g. https://example.com';
  let parsed;
  try { parsed = new URL(value); } catch { return 'Please enter a valid website URL, e.g. https://example.com'; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'Please enter a valid website URL, e.g. https://example.com';
  const host = parsed.hostname;
  if (!host || !host.includes('.')) return 'Please enter a valid website URL, e.g. https://example.com';
  if (host.startsWith('.') || host.endsWith('.')) return 'Please enter a valid website URL, e.g. https://example.com';
  const parts = host.split('.');
  const tld = parts[parts.length - 1];
  if (!tld || tld.length < 2) return 'Please enter a valid website URL, e.g. https://example.com';
  return null;
}

function validateYearsOfExperience(raw) {
  const value = raw.trim();
  if (!value) return null;
  if (/[a-zA-Z]/.test(value)) return 'Please enter a valid number of years.';
  if (/[^0-9]/.test(value)) return 'Please enter a valid number of years.';
  const num = parseInt(value, 10);
  if (isNaN(num)) return 'Please enter a valid number of years.';
  if (num < 0) return 'Please enter a valid number of years.';
  if (num > 60) return 'Years of experience must be 60 or fewer.';
  return null;
}

// ─── Test cases from spec §28 ─────────────────────────────────────────────────
const cases = [
  // Full Name
  { name: 'fullName empty ""', fn: () => validateFullName(''), expectValid: false },
  { name: 'fullName " " (spaces)', fn: () => validateFullName(' '), expectValid: false },
  { name: 'fullName "12345"', fn: () => validateFullName('12345'), expectValid: false },
  { name: 'fullName "@#$%"', fn: () => validateFullName('@#$%'), expectValid: false },
  { name: 'fullName "Sai Kumar"', fn: () => validateFullName('Sai Kumar'), expectValid: true },
  { name: 'fullName single char "A"', fn: () => validateFullName('A'), expectValid: false },
  { name: 'fullName "Asilu Rebba"', fn: () => validateFullName('Asilu Rebba'), expectValid: true },
  { name: 'fullName "Ravi Kumar Reddy"', fn: () => validateFullName('Ravi Kumar Reddy'), expectValid: true },
  // Mobile
  { name: 'mobile empty ""', fn: () => validateMobileNumber(''), expectValid: false },
  { name: 'mobile "123456789" (9 digits)', fn: () => validateMobileNumber('123456789'), expectValid: false },
  { name: 'mobile "12345678901" (11 digits)', fn: () => validateMobileNumber('12345678901'), expectValid: false },
  { name: 'mobile "abcdefghij"', fn: () => validateMobileNumber('abcdefghij'), expectValid: false },
  { name: 'mobile "9963509329" (valid)', fn: () => validateMobileNumber('9963509329'), expectValid: true },
  { name: 'mobile "0000000000" (invalid prefix)', fn: () => validateMobileNumber('0000000000'), expectValid: false },
  { name: 'mobile "1234567890" (invalid prefix)', fn: () => validateMobileNumber('1234567890'), expectValid: false },
  { name: 'mobile "+91 9963509329" (space inside)', fn: () => validateMobileNumber('+91 9963509329'), expectValid: false },
  // Email
  { name: 'email "" (optional)', fn: () => validateEmail('', false), expectValid: true },
  { name: 'email "becozr"', fn: () => validateEmail('becozr'), expectValid: false },
  { name: 'email "abc@"', fn: () => validateEmail('abc@'), expectValid: false },
  { name: 'email "@gmail.com"', fn: () => validateEmail('@gmail.com'), expectValid: false },
  { name: 'email "abc@gmail.com" (valid)', fn: () => validateEmail('abc@gmail.com'), expectValid: true },
  { name: 'email "becozr@gmail.com" (valid)', fn: () => validateEmail('becozr@gmail.com'), expectValid: true },
  { name: 'email "becozr @gmail.com" (space)', fn: () => validateEmail('becozr @gmail.com'), expectValid: false },
  { name: 'email "becozr@gmail." (trailing dot)', fn: () => validateEmail('becozr@gmail.'), expectValid: false },
  // GST
  { name: 'gstin "" (optional)', fn: () => validateGSTIN('', false), expectValid: true },
  { name: 'gstin "123456789012345" (all digits)', fn: () => validateGSTIN('123456789012345'), expectValid: false },
  { name: 'gstin "ABCDEFGHIJKLMNO" (all alpha)', fn: () => validateGSTIN('ABCDEFGHIJKLMNO'), expectValid: false },
  { name: 'gstin "12345" (short)', fn: () => validateGSTIN('12345'), expectValid: false },
  { name: 'gstin "22AAAA" (partial)', fn: () => validateGSTIN('22AAAA'), expectValid: false },
  { name: 'gstin "36AABCU9603R1ZM" (valid Telangana)', fn: () => validateGSTIN('36AABCU9603R1ZM'), expectValid: true },
  // PAN
  { name: 'pan "" (optional)', fn: () => validatePAN('', false), expectValid: true },
  { name: 'pan "ABC123"', fn: () => validatePAN('ABC123'), expectValid: false },
  { name: 'pan "1234567890"', fn: () => validatePAN('1234567890'), expectValid: false },
  { name: 'pan "ABCDE1234F" (valid)', fn: () => validatePAN('ABCDE1234F'), expectValid: true },
  { name: 'pan "abcde1234f" (lowercase → normalized)', fn: () => validatePAN('abcde1234f'), expectValid: true },
  { name: 'pan "ABCDE12345" (wrong last char)', fn: () => validatePAN('ABCDE12345'), expectValid: false },
  { name: 'pan "ABCDE1234" (9 chars)', fn: () => validatePAN('ABCDE1234'), expectValid: false },
  // Website
  { name: 'website "" (optional)', fn: () => validateWebsiteUrl(''), expectValid: true },
  { name: 'website "https"', fn: () => validateWebsiteUrl('https'), expectValid: false },
  { name: 'website "http"', fn: () => validateWebsiteUrl('http'), expectValid: false },
  { name: 'website "example"', fn: () => validateWebsiteUrl('example'), expectValid: false },
  { name: 'website "www.example"', fn: () => validateWebsiteUrl('www.example'), expectValid: false },
  { name: 'website "https://"', fn: () => validateWebsiteUrl('https://'), expectValid: false },
  { name: 'website "https://."', fn: () => validateWebsiteUrl('https://.'), expectValid: false },
  { name: 'website "https://example.com" (valid)', fn: () => validateWebsiteUrl('https://example.com'), expectValid: true },
  { name: 'website "http://example.com" (valid)', fn: () => validateWebsiteUrl('http://example.com'), expectValid: true },
  { name: 'website "https://www.example.com" (valid)', fn: () => validateWebsiteUrl('https://www.example.com'), expectValid: true },
  { name: 'website "https://company.co.in" (valid)', fn: () => validateWebsiteUrl('https://company.co.in'), expectValid: true },
  // Years
  { name: 'years "" (optional)', fn: () => validateYearsOfExperience(''), expectValid: true },
  { name: 'years "-2"', fn: () => validateYearsOfExperience('-2'), expectValid: false },
  { name: 'years "3.5"', fn: () => validateYearsOfExperience('3.5'), expectValid: false },
  { name: 'years "abc"', fn: () => validateYearsOfExperience('abc'), expectValid: false },
  { name: 'years "3" (valid)', fn: () => validateYearsOfExperience('3'), expectValid: true },
  { name: 'years "10 years"', fn: () => validateYearsOfExperience('10 years'), expectValid: false },
  { name: 'years "@@"', fn: () => validateYearsOfExperience('@@'), expectValid: false },
];

let passed = 0, failed = 0;
const failures = [];

for (const { name, fn, expectValid } of cases) {
  const result = fn();
  const actual = result === null;
  const pass = actual === expectValid;
  if (pass) { passed++; } 
  else { 
    failed++; 
    failures.push({ name, expected: expectValid ? 'VALID' : 'INVALID', actual: actual ? 'VALID (no error)' : `INVALID: "${result}"` });
  }
}

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║    PARTNER VALIDATION — SPEC §28 TEST SUITE RESULTS     ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');
console.log(`  Total: ${cases.length}  |  ✅ Passed: ${passed}  |  ❌ Failed: ${failed}`);
console.log('');

if (failures.length > 0) {
  console.log('FAILURES:');
  for (const f of failures) {
    console.log(`  ❌ ${f.name}`);
    console.log(`     Expected: ${f.expected}`);
    console.log(`     Got:      ${f.actual}`);
  }
} else {
  console.log('  ✅ All test cases passed!');
}
console.log('');
