import { sanitizeCsvValue, parseInvoicesCsv } from './src/engine/security.ts';

console.log("=== RUNNING CONTINUOUS LOOP GATE 4: SECURITY SANITIZATION ===");

// 1. Test formula prefixes
const maliciousFormulas = [
  "=cmd|' /C calc'!A0",
  "+123456",
  "-555",
  "@SUM(1+1)",
  "|calc",
  "\tcmd"
];

for (const formula of maliciousFormulas) {
  const sanitized = sanitizeCsvValue(formula);
  if (!sanitized.startsWith("'")) {
    throw new Error(`Security failed for formula: ${formula}`);
  }
  console.log(`  Safe neutralization: "${formula}" -> "${sanitized}"`);
}

// 2. Test safe CSV parsing
const testCsv = `amount,payment_term,past_late
=100000,30,10
50000,15,0`;

const parsed = parseInvoicesCsv(testCsv);
console.log(`\nParsed ${parsed.length} rows safely. First row amount: ${parsed[0].invoiceAmount}`);

console.log("\nALL SECURITY SANITATION TESTS PASSED!");
