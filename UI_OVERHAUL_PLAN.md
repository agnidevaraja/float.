# UI_OVERHAUL_PLAN.md — `float.` UI Overhaul

> Paths relative to `src/`. Line numbers reflect the current tree. **All 4 phases have been executed and verified.**
> Stack: Vite + React + Tailwind v4 (`@theme` in `index.css`, legacy `tailwind.config.js`), ECharts via `components/charts/EChartBox.tsx`, themes in `store/themeStore.ts` (`obsidian` | `slate` | `ledger` | `terminal`, CSS vars `--bg-*`, `--text-*`, `--accent-*`).

---

## Phase 1 — Branding, Metric Consistency & Design System

### 1A. Branding → `float.` + subtitle `TREASURY & RECEIVABLES OS`
Create a shared `components/primitives/Wordmark.tsx` (bold geometric sans, lowercase `float` + accent `.`) and use it everywhere below.

- [x] `components/layout/Homepage.tsx:31` — "VERITAS AI 2026" badge → wordmark + subtitle; also h1 (`:50`) and hero copy (`:55`)
- [x] `components/layout/CollapsibleSidebar.tsx:63` — "Veritas" label → wordmark (collapsed state: `f.`)
- [x] `components/layout/TopTelemetryBar.tsx` — add/confirm wordmark + subtitle (route titles map at `:29`)
- [x] `components/Header.tsx:32` — "VERITAS RISK ENGINE"
- [x] `components/Sidebar.tsx:119` — "Veritas AI Blind Audit"
- [x] `components/JudgeAuditModal.tsx:37, 194, 202` — Veritas AI Blind Round / Hackathon notice / repo link
- [x] `components/modals/CreditMemoModal.tsx:49, 137, 281, 311` — memo headers/footers
- [x] `components/views/AiCopilotView.tsx:88` (greeting), `:510` (provenance reply), `:763` (chart title fallback)
- [x] `components/views/View03GstShield.tsx:368`
- [x] `components/views/View04AgeingMatrix.tsx:713` (dunning pack header); download filenames `:654, :698, :741`
- [x] `components/views/View05Benchmarks.tsx:140, 186` ("Veritas 6-Source Global Ensemble") → `float. 6-Source Global Ensemble (AUC 0.9845)`
- [x] `components/views/View06Settings.tsx:91-94, 686, 933` (Colab snippet text; leave `veritas_colab_kernel.py` filename/URL untouched)
- [x] `engine/statutoryEngine.ts:497, 515, 798, 806` — RTGS advice / notice text
- [x] Download filenames: `charts/EChartBox.tsx:324`, `views/View02RunwayLab.tsx:366, 683`, `CommandPalette.tsx:67` → `float_…`
- [x] Console prefixes (optional): `View01DealWorkbench.tsx:119`
- [x] Storage keys `inferenceBridge.ts:22-23` (`veritas-*`) — **left as-is** to preserve existing state
- [x] Root: `index.html:10` `<title>`

### 1B. Unify metrics
Canonical: **6 Data Sources · 374,284 Records · 59 Features · ROC-AUC 0.9845 · PR-AUC 0.9896 · F1-Score 0.9120**.
Create `src/data/metrics.ts` exporting `FLOAT_METRICS` (and formatted strings) as the single source of truth; import everywhere.

- [x] `data/benchmarks.ts:25-26` — champion `prAuc` 0.9841 → **0.9896**, `f1Score` 0.9584 → **0.9120**; `:41-59` dataset records updated to all **6** sources totaling **374,284** records and **59** features
- [x] `components/layout/Homepage.tsx` — 374,284 Verified Records, StatCards (Data Sources=6, Records=374,284, Features=59, ROC-AUC=0.9845, PR-AUC=0.9896, F1-Score=0.9120), 6-Source Ensemble Architecture list, system notice
- [x] `components/layout/TopTelemetryBar.tsx` — added compact metrics strip (`6 Sources • 374,284 Recs • 59 Feat • AUC 0.9845 • PR 0.9896 • F1 0.9120`) sourced from `FLOAT_METRICS`
- [x] `components/layout/CollapsibleSidebar.tsx:107` and `components/Sidebar.tsx:122` — updated to `6 Sources • 374,284 Records • 59 Features • ROC-AUC 0.9845`
- [x] `components/views/AiCopilotView.tsx:94` (greeting), `:510` (provenance reply: dataset volume/features/metrics)
- [x] `components/views/View05Benchmarks.tsx` — chart legend/series names, provenance strip, and KPI cards wired to unified constants
- [x] `components/views/View01DealWorkbench.tsx:244` (374,284 Training Records • 6 Data Sources • 59 Features)
- [x] `components/JudgeAuditModal.tsx` — updated to 374,284 records across 6 sources and 59 features
- [x] `components/RiskArrivalCenter.tsx:64` — updated to 374,284 records across 6 sources
- [x] `services/inferenceBridge.ts:607` (`audited_roc_auc: 0.9845`) — verified
- [x] Final check: zero stale metric strings (`360,646`, `4 datasets`, `4-Source`, `0.9841`, `0.9584`) remain in `src/`
- [x] Verified ROC curve arrays `View05Benchmarks.tsx:128-130` remain consistent with AUC 0.9845

### 1C. Soften the 0px look
- [x] `index.css` — global tokens: added `--radius-card: 0.75rem`, `--radius-control: 0.5rem`; updated range track/thumbs, selects, inputs, buttons, and `.field-input` to `rounded-lg`, plus `:where()` fallback rules for cards (`rounded-xl`) and badges (`rounded-full`)
- [x] `index.css:58-60` — `button` transition → `transition-all duration-150`, `active:scale-[0.98]`
- [x] `index.css` — `.tabular-nums` kept for numbers/metrics; geometric sans-serif headings (`--font-display` / `--font-sans`)
- [x] `App.css` — audited
- [x] Primitives: `primitives/ContainerLines.tsx`, `KpiCell.tsx`, `SectionHeader.tsx`, `StatusLed.tsx` (`rounded-full`), `TelemetryStepper.tsx` → `rounded-xl` cards
- [x] Sweep across views, modals, and layout components for `rounded-xl` cards/panels, `rounded-lg` inputs/buttons, and `rounded-full` badges/segmented pills
- [x] Mono discipline: geometric sans-serif for headings/prose while keeping monospace strictly for numbers, GSTINs, and metrics

### 1D. Theme-aware charts (no black boxes in light themes)
`charts/EChartBox.tsx`:
- [x] Read live CSS vars via `getComputedStyle(document.documentElement)` and observe theme changes via `MutationObserver` on `document.documentElement` (`style`, `class`, `data-theme`)
- [x] Replaced hard-coded dark hex colors (`#111113`, `#18181B`, `#27272A`, `#09090B`, `#FAFAFA`, `#A1A1AA`) in `EChartBox.tsx` and chart options with theme-aware CSS variables
- [x] Replaced `style={{ borderRadius: 0 }}` with `rounded-xl overflow-hidden`
- [x] Re-renders chart options cleanly on theme change (`OBSIDIAN`, `SLATE`, `LEDGER`, `TERMINAL`)
- [x] Fixed currency formatting (`₹`) in `View07BusinessPlanner.tsx`

---

## Phase 2 — Segmented Sub-Tabs

Created `components/primitives/SegmentedTabs.tsx` (full-width, `rounded-full` pill track, active pill uses `--accent-primary`, `transition-all duration-150 active:scale-[0.98]`, `role="tablist"`).

### 2A. Business & Planning — `views/View07BusinessPlanner.tsx`
- [x] Added `activeSubTab` state (`'adapter' | 'planner'`)
- [x] Inserted full-width segmented pill toggle at top: `[ 1. Custom Ledger & Model Adapter ]` and `[ 2. 6M Working-Capital & Expansion Planner ]`
- [x] Replaced cramped 50/50 side-by-side Panel A / Panel B layout with full-width conditional panels
- [x] Expanded inner grids and gave Panel B's chart full container width (`height={400}`)
- [x] Fixed overlapping `Fixed Operating Outflows` / `₹21.0L` legend collision (`grid.top: 68`, scroll legend with `itemGap: 28`, wider bar spacing)

### 2B. Cash Flow & Runway — `views/View02RunwayLab.tsx`
- [x] Added `activeSubTab: 'trajectory' | 'discount' | 'dispatch'` state with 3-pill `SegmentedTabs` below header:
  - `[ 1. Trajectory & Collision Lab ]`
  - `[ 2. Early-Settlement Discount Solver ]`
  - `[ 3. AP Vendor Dispatch & Commitments ]`
- [x] Fixed `Zero Solvency Threshold` / `22 Nov` label overlap (`position: 'insideEndTop'`, `distance: 6`, `yAxis.min` breathing room below `0`, `xAxis.axisLabel.margin: 12` & `hideOverlap: true`)
- [x] Fixed strikethrough artifact on `Min ₹1,06,267` and replaced hard-coded dark stat/slider boxes with theme-aware `rounded-xl` cards

---

## Phase 3 — Navigation & Deal Underwriting Ergonomics

### 3A. Sidebar grouping — `components/layout/CollapsibleSidebar.tsx`
- [x] Grouped sidebar navigation into two clear sections (`CORE WORKFLOW` and `CALIBRATION & SYSTEM`) with section headers (and divider when collapsed)
- [x] Applied clean `rounded-full` active pill highlights with `transition-all duration-150 active:scale-[0.98]`

### 3B. Deal Underwriting — `views/View01DealWorkbench.tsx`
- [x] Kept the 5 Benchmark Deal Presets at the top as interactive `rounded-xl` cards with hover/active transitions and active ring highlight
- [x] Organized Deal Underwriting inputs into clean, balanced `rounded-xl` cards (`Section 01` full-width on top, `Section 02` and `Section 03` balanced side-by-side below) with `rounded-lg` inputs/buttons and `rounded-full` badges

### 3C. GST badge — `views/View03GstShield.tsx`
- [x] Fixed `PAYMENT HELD` / `HOLD PAYMENT` badge wrapping in **GST Compliance & ITC** so it renders as a single-line pill (`rounded-full whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 py-1 shrink-0`) inside a `whitespace-nowrap` table cell

---

## Phase 4 — Build & Verification
- [x] `npm run build` → zero TypeScript (`tsc -b`) and Vite bundling errors
- [x] Verified zero stale branding or metric strings in `src/` while preserving all `localStorage` keys, TypeScript mirror calculations, and FastAPI endpoint payloads
