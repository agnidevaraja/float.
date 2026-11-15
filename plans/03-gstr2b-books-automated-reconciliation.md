# Implementation Plan 03: GSTR-2B vs. Purchase Books Automated ITC Mismatch Sentinel

## Context & Motivation
Under Section 16(2)(aa) of the CGST Act and Rule 36(4), buyers are legally prohibited from claiming Input Tax Credit (ITC) unless the invoice has been uploaded by the supplier in their GSTR-1 and correctly reflected in the buyer's auto-drafted GSTR-2B statement. Indian small businesses lose an estimated ₹5L–₹25L annually due to delinquent suppliers failing to upload invoices before the monthly 11th deadline.

Veritas currently has the GST Shield in `View03GstShield.tsx` that categorizes ITC into Eligible, Blocked, and At-Risk buckets. This plan adds an automated GSTR-2B JSON / CSV upload reconciler that matches invoice-by-invoice against the purchase ledger and drafts instant vendor payment-hold notices.

## Scope of Changes
- **Files Involved**:
  - `src/engine/gstReconciler.ts`: Core discrepancy matching algorithm (missing in 2B, tax rate mismatch, invoice number mismatch).
  - `src/components/views/View03GstShield.tsx`: Add "Upload GSTR-2B JSON" dropzone and reconciliation disparity table.
  - `src/components/modals/VendorPaymentHoldModal.tsx`: Generates Section 16(2) payment withholding notices ready to send via WhatsApp or Email.

## Step-by-Step Implementation Steps
1. **Reconciliation Engine**:
   - Compares arrays of `PurchaseBookInvoice` vs `Gstr2bInvoice` by normalized GSTIN + Invoice Number.
   - Classifies rows into:
     - `MATCHED`: Valid for immediate ITC claim.
     - `MISSING_IN_2B`: Supplier has not filed; flag for immediate payment withholding.
     - `TAX_AMOUNT_MISMATCH`: Supplier reported lower tax than billed.
2. **Visual & Notification Layer**:
   - Donut chart updates to show `Reconciled (Safe)` vs `Unreconciled (Withhold Payment)`.
   - 1-click WhatsApp/Email memo generator.

## Verification Gates
- `npm run build` exits 0.
- Handles duplicate invoice numbers and case-insensitive GSTIN parsing.
