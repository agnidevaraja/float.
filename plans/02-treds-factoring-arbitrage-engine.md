# Implementation Plan 02: TReDS Factoring vs. Bank Overdraft Cost-of-Capital Arbitrage

## Context & Motivation
When an MSME faces a 60-day cash crunch, they typically have three capital avenues:
1. Drawing down on an existing bank cash credit / overdraft line (16%–18.5% p.a.).
2. Offering dynamic discounting to the buyer (0.5%–2.5% flat discount for 5-day settlement, which corresponds to 12%–30% annualized APR).
3. Factoring accepted trade receivables on RBI-regulated TReDS platforms (RXIL, Invoicemart, M1xchange) where institutional lenders bid competitive discount rates (8.5%–11.5% p.a.).

This plan extends `View02RunwayLab.tsx` by providing a 3-way cost arbitrage matrix so founders can instantly select the option that protects maximum operating margin.

## Scope of Changes
- **Files Involved**:
  - `src/types/engineContract.ts`: Add `TredsArbitrageAnalysis` interface.
  - `src/engine/statutoryEngine.ts`: Add `calculateCostOfCapitalArbitrage()` solving for breakeven interest rates and net margin retention across all three channels.
  - `src/components/views/View02RunwayLab.tsx`: Add a dedicated "Financing Arbitrage" toggle tab in the Dynamic Discounting panel.

## Step-by-Step Implementation Steps
1. **Mathematical Engine Specification**:
   - Inputs: `invoice_amount`, `days_to_maturity`, `bank_od_rate_pct`, `treds_discount_rate_pct`, `dynamic_discount_pct`.
   - Output:
     - `bank_od_cost`: `amount * (bank_od_rate / 100) * (days / 365)`
     - `treds_factoring_cost`: `amount * (treds_rate / 100) * (days / 365) + treds_platform_fee`
     - `dynamic_discount_cost`: `amount * (dynamic_pct / 100)`
     - `recommended_channel`: Highest net cash retained.
2. **UI Implementation**:
   - Side-by-side comparative cards with tabular metrics.
   - Highlights net margin difference (e.g. "TReDS saves ₹34,200 vs Bank OD on this ₹28L receivable").

## Verification Gates
- `npm run build` exits 0.
- All monetary formatting conforms to `formatINR` Lakhs & Crores.
