// scratch/test-admin-auth.mjs
// Test script to verify canonical Indian mobile normalization and Admin authorization

function normalizeIndianMobile(raw) {
  const digits = (raw ?? '').replace(/[^\d]/g, '');
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  return null;
}

const DEFAULT_ADMIN_PHONES = ['9963509329'];

function getAuthorizedAdminMobiles(envPhones = '') {
  const rawList = [
    ...DEFAULT_ADMIN_PHONES,
    ...envPhones.split(',').map((p) => p.trim()).filter(Boolean),
  ];
  const normalizedSet = new Set();
  for (const raw of rawList) {
    const normalized = normalizeIndianMobile(raw);
    if (normalized) normalizedSet.add(normalized);
  }
  return normalizedSet;
}

function isAuthorizedAdmin(phone, envPhones = '') {
  const normalized = normalizeIndianMobile(phone);
  if (!normalized) return false;
  const authorizedSet = getAuthorizedAdminMobiles(envPhones);
  return authorizedSet.has(normalized);
}

const testCases = [
  { input: '9963509329', expected: true, desc: 'Developer bare 10 digits' },
  { input: '+919963509329', expected: true, desc: 'Developer +91 format' },
  { input: '919963509329', expected: true, desc: 'Developer 91 format' },
  { input: '+91 99635 09329', expected: true, desc: 'Developer formatted with spaces' },
  { input: '9876543210', expected: false, desc: 'Random customer phone' },
  { input: '+919876543210', expected: false, desc: 'Random customer phone with +91' },
  { input: '9123456789', expected: false, desc: 'Random customer phone' },
  { input: '', expected: false, desc: 'Empty input' },
  { input: '12345', expected: false, desc: 'Invalid digits' },
];

console.log('--- Testing Default Authorized Admin Phones ---');
let passed = 0;
for (const tc of testCases) {
  const res = isAuthorizedAdmin(tc.input);
  const ok = res === tc.expected;
  if (ok) passed++;
  console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: [${tc.input}] -> ${res} (expected ${tc.expected}) - ${tc.desc}`);
}

console.log('\n--- Testing Manager Phone added via Environment Variable ---');
const envPhones = '9876543210';
const managerCheck = isAuthorizedAdmin('9876543210', envPhones);
const devCheck = isAuthorizedAdmin('9963509329', envPhones);
const otherCheck = isAuthorizedAdmin('9111111111', envPhones);

console.log(`${managerCheck ? '✓ PASS' : '✗ FAIL'}: Manager in env var (9876543210) authorized = ${managerCheck}`);
console.log(`${devCheck ? '✓ PASS' : '✗ FAIL'}: Developer (9963509329) still authorized = ${devCheck}`);
console.log(`${!otherCheck ? '✓ PASS' : '✗ FAIL'}: Unauthorized (9111111111) authorized = ${otherCheck}`);

if (passed === testCases.length && managerCheck && devCheck && !otherCheck) {
  console.log('\nAll tests passed successfully!');
  process.exit(0);
} else {
  console.error('\nSome tests failed!');
  process.exit(1);
}
