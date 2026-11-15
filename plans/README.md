# Veritas Risk Engine — Architecture & Product Improvement Plans

This directory contains prioritized, self-contained implementation plans generated per senior advisory guidelines (`shadcn/improve`, `pbakaus/impeccable`, and `openai/skills`). Each plan is fully specified for autonomous executor agents to implement without requiring session context.

## Recommended Execution Order & Status

| Priority | Plan ID | Title | Domain Area | Target Files | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **01** | `01-mca-msme-form-1-generator` | MCA MSME Form 1 & Section 16 Statutory Notice Generator | Statutory Credit Enforcement | `statutoryEngine.ts`, `View04AgeingMatrix.tsx` | Ready for Execution |
| **02** | `02-treds-factoring-arbitrage-engine` | TReDS Factoring vs. Bank Overdraft Cost Arbitrage Matrix | Working Capital Treasury | `engineContract.ts`, `View02RunwayLab.tsx` | Ready for Execution |
| **03** | `03-gstr2b-books-automated-reconciliation` | GSTR-2B vs. Books Automated ITC Mismatch Sentinel | Tax Compliance & ITC Shield | `View03GstShield.tsx`, `gstReconciler.ts` | Ready for Execution |

---

## Shared Architectural Conventions for Executors
1. **Design System & Palette**: Strictly preserve dark obsidian surfaces (`#09090B` canvas, `#111113` surface, `#27272A` hairline borders, 0px–2px corners, ZERO gradients, ZERO rounded-full pill buttons, monospace numbers with `tabular-nums`).
2. **Formatting Standard**: All monetary values must use `formatINR` or `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
3. **Security Constraints**:
   - Zero hardcoded secrets or tokens.
   - All external user text sanitized with `sanitizeCsvValue()`.
   - All generated identifiers use `generateSecureId()`.
   - Production errors must never disclose file paths or stack traces.
4. **Verification Gates**:
   - `npm run build` must complete with 0 TypeScript and bundling errors.
   - `node test-engine.mjs` and `node test-security.mjs` must pass.
