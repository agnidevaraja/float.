# Implementation Plan 01: MCA MSME Form 1 & Section 16 Statutory Filing Generator

## Context & Motivation
Under Section 405 of the Companies Act 2013 and Section 15/16 of the MSMED Act 2006, all corporate buyers delaying payments to registered MSMEs beyond 45 days are legally required to file half-yearly return **MSME Form 1** with the Ministry of Corporate Affairs (MCA), disclosing the names of suppliers, overdue amounts, and reasons for delay. They must also pay compound interest with monthly rests at 3× the RBI bank rate (~20.25% p.a.).

Currently, MSME suppliers lack the leverage or legal apparatus to enforce this. Veritas already has an overdue invoice ledger in `View04AgeingMatrix.tsx` and statutory interest calculation in `statutoryEngine.ts`. This module formalizes that data into an audit-ready MCA Form 1 filing notice and an MSME Samadhaan conciliation package.

## Scope of Changes
- **Files Involved**:
  - `src/engine/statutoryEngine.ts`: Add `generateMcaMsmeForm1Notice()` and `generateSamadhaanDossier()`.
  - `src/components/modals/McaMsmeNoticeModal.tsx`: New modal displaying the formal statutory filing document with 1-click clipboard copy and PDF/Print export.
  - `src/components/views/View04AgeingMatrix.tsx`: Add "Generate MCA Form 1 Notice" button to invoices in the `>60d Critical` bracket.

## Step-by-Step Implementation Steps
1. **Extend Statutory Engine**:
   - In `src/engine/statutoryEngine.ts`, define `McaMsmeNoticePayload`:
     - `buyer_cin`: string
     - `buyer_name`: string
     - `supplier_msme_reg`: string
     - `invoice_no`: string
     - `invoice_date`: string
     - `overdue_days`: number
     - `principal_amount`: number
     - `accrued_penal_interest`: number
     - `total_claim`: number
   - Return formatted legal advisory citing Section 405 Companies Act and Section 16 MSMED Act.
2. **Build Modal Component**:
   - Implement `McaMsmeNoticeModal.tsx` following the obsidian dark palette (`#09090B`, `#111113`, hairline `#27272A` borders, monospace font).
   - Include direct copy button and print stylesheet.
3. **Wire Action in Ageing Matrix**:
   - In `View04AgeingMatrix.tsx`, attach modal trigger next to delinquent invoices with overdue days > 45.

## Verification Gates
- `npm run build` exits 0.
- `node test-engine.mjs` exits 0.
- Modal opens cleanly and copies formal text to clipboard without UI overflow.
