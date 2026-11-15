# Veritas AI 2026 - Product Plan

## 0. Current State Audit

### What Works
- Design language: solid themes, container-lines, spacing
- Architecture: React + TS + Vite + Zustand + ECharts
- Model contract: DealInput to RiskEvaluationResult types defined

### What Is Broken
- Graphs look like stairways - need area charts with bands, crosshairs
- No zoom, crosshair, drill-down on charts
- Parameters crammed in 380px rail - need dedicated parameter page
- No real model link - inferenceBridge.ts runs JS mock, not actual model
- Chatbot is generic widget - no context awareness
- Settings is theme switcher only
- Hard-coded demo data everywhere
- No batch/portfolio workflow
- No what-if scenario modeling
- No data provenance

## 1. Competitor Analysis

### HighRadius Credit Risk Workbench
- Credit worklist prioritization: ranked list of customers by risk
- Automated credit limit counter-offers
- Blocked order release thresholds
- Real-time credit report integration
- We need: Portfolio-level risk queue, smart payment-term counter-offers

### Stripe Radar
- Risk gauge 0-100 with diverging factor bars (positive/negative SHAP)
- Rules engine + ML hybrid
- We need: Same gauge + factor attribution bars, explainability for every score

### Mercury Dashboard
- Balance hierarchy: total cash to per-account to transaction
- Cash-flow graph with zoom into specific days
- We need: Same balance hierarchy, zoomable cash trajectory

### TallyPrime / Zoho Books
- Bill-by-bill aging buckets (0-15d, 16-30d, 31-60d, >60d)
- Bank OD liquidity floor as red line on cash projection
- GST ITC lockup exposure tracking
- We need: Aging matrix with OD floor line, commitment calendar, GST lockup tracker

### Apple HIG + Vercel Design
- Clarity: information without cognitive overload
- Deference: content first, chrome minimal
- Depth: layers reveal on interaction
- We need: Same restraint. Every pixel must earn its place.

## 2. Core Model Integration Strategy

### The Dilemma
Right now the engine runs a JS simulation. The actual LightGBM model + joblib files are not connected.

### Solution: Three-Tier Architecture

Tier 1 - LOCAL CALIBRATED MIRROR (default):
JS/TS replica of LightGBM ensemble. Runs in-browser, zero API needed.
Used for: all UI development, demos, offline mode.

Tier 2 - COLAB / FASTAPI BRIDGE:
HTTP to running Colab notebook. Loads b2b_risk_engine_final.joblib.
Auto-fallback to Tier 1 if unreachable. Used for production accuracy.

Tier 3 - RUST AXUM (future):
Compiled model served as binary service. Sub-millisecond latency.
Used for: high-throughput batch scoring.

### Model as Core - Not an Afterthought

1. Every view shows model provenance: "Predicted by LightGBM Ensemble v2.1 | ROC-AUC 0.9845 | Trained on 360,646 records"
2. Settings to Model Bridge is where you connect the real model. Until then, Tier 1 runs silently.
3. No "simulation" label anywhere. The app always says "predicting" or "scoring".
4. Model health indicator in top bar: green dot (local mirror) / yellow dot (Colab bridge) / red dot (offline).

## 3. Feature Plan

### 3.1 Main Module: Pre-Deal Risk and Arrival Engine

User Story: I have a new invoice from a client. Before I accept the deal, I want to know if they will pay on time, when cash will hit my account, and what terms I should negotiate.

Current: Sliders in sidebar, graph updates automatically.
Target: Full-page form. Enter details ONCE, click SCORE INVOICE, engine runs 4-stage pipeline, results appear with animation.

Features:
- Deal Intake Form: Full-page form at /workspace/deal/new. Form groups: Counterparty, Deal Terms, Your Business.
- Risk Scorecard: Large score (0-100), color-coded. P20/P50/P80 arrival days. Confidence band.
- SHAP Factor Attribution: Horizontal bar - red (risk-increasing) left, green (risk-decreasing) right.
- Anomaly Audit Panel: Isolation Forest flags. Expandable details.
- Smart Payment-Term Fixer: Suggests counter-offer term that drops risk below threshold.
- Deal Decision Actions: Approve / Reject / Counter-Offer. Action logged to portfolio.

### 3.2 Module 2: 60-Day Runway and Cash-Flow Collision Lab

User Story: I want to see if I will run out of cash before this invoice pays. What if it arrives 10 days late?

Features:
- Area Chart with Commitment Floor: Balance as filled area. Zero line in red. Commitments as step-line markers.
- AI Predicted Band (P20-P80): Shaded uncertainty band between P20 and P80.
- Collision Day Marker: Red vertical line where balance hits zero.
- Commitment Calendar: Fixed obligations with due dates. Hover highlights on chart.
- Scenario Compare: Toggle between Promised, AI Predicted, Best Case, Worst Case.
- OD Limit Line: Overdraft limit as dashed line. Danger zone shaded.
- Daily Drill-Down: Click any day to see opening balance, commitments, closing balance.

### 3.3 Module 3: GST and Vendor Anomaly Shield

Features:
- ITC Lockup Tracker: Running tally of locked ITC. Color-coded urgency per invoice.
- GST Compliance Calendar: Upcoming filing deadlines. Missed deadline warnings.
- Vendor Anomaly Radar: Bubble chart - tenure (X) vs avg delay (Y). Current vendor highlighted.
- Bust-Out Detector: Flags tenure < 3 months AND order_size_vs_avg > 3.0x.
- ITC Reversal Simulator: Penalty exposure calculator.

### 3.4 Module 4: Ageing Matrix and Batch Ledger

Features:
- 5-Bucket Aging Strip: Current / 1-15d / 16-30d / 31-60d / >60d. Clickable filters.
- Scored Invoice Table: Sortable columns. TanStack Table virtualized for 1000+ rows.
- Per-Row Actions: Inspect, Re-Score, Navigate, Export.
- Batch Scoring: Select multiple invoices, parallel inference, progress indicator.
- Portfolio Risk Summary: Total exposure, average risk, overdue count, overdue amount.
- CSV Export: Blob download of scored table.

### 3.5 Module 5: Benchmarks and Honesty Audit

Features:
- Model Performance Dashboard: ROC-AUC, PR-AUC, F1. Confusion matrix heatmap.
- Startup Fairness Report: FPR/FNR comparison <12m vs >=12m.
- Failure Case Explorer: 3 documented cases with full feature breakdown.
- Feature Importance Chart: SHAP summary sorted by mean absolute value.
- Data Provenance Ledger: Datasets used, sizes, split dates, preprocessing steps.

### 3.6 Module 6: AI Risk Assistant + Settings

AI Risk Assistant is NOT a generic chatbot. Context-aware risk advisor:
- Context-Aware: Knows current deal params, risk score, current view.
- Quick Actions: Pre-built prompts - Explain risk score, Suggest better terms, What if cash arrives late.
- Answer with Evidence: Cites specific features, SHAP values, model outputs.
- Scoped Responses: Tells user when to use modules for detailed analysis.
- Conversation History: Per-session, persisted in localStorage.

Layout: Full panel sliding from right (480px), or full-width when chat is active view.

Settings - 4-Section Control Center:
- Section 01: Model Bridge (endpoint, API key, timeout, test connection, schema inspector)
- Section 02: Business Defaults (bank balance, burn, OD limit, GST defaults)
- Section 03: Accessibility (reduced motion, high-contrast, scale, tabular data)
- Section 04: Appearance (themes, accent picker, fonts, container-lines toggle)

## 4. Data Flow Architecture

Deal Intake Form -> DealInput object -> evaluateB2bPaymentRisk() -> 4-stage stepper animates
  Stage 1: Isolation Forest -> anomalyFlags[]
  Stage 2: LightGBM Ensemble -> blendedRiskPercent
  Stage 3: Quantile Regressor -> P20/P50/P80 days
  Stage 4: SHAP Explainer -> shapTopFactors[]
  Result -> Risk Scorecard, Arrival Predictor, Payment-Term Fixer

Batch scoring: CSV Upload -> Parse rows -> Queue evaluateB2bPaymentRisk() per row -> Parallel execution -> Results mapped to rows -> Table updates

Colab bridge: Frontend fetch() -> Colab /predict endpoint -> LightGBM predicts -> Returns JSON -> Schema validated -> Falls back to Tier 1 if error

## 5. Library Stack

| Purpose | Library | Why |
|---------|---------|-----|
| Charts | Apache ECharts | Zoom, pan, crosshair, dataZoom, markLine, effectScatter |
| Tables | TanStack Table v8 | Headless, virtualized, sortable, filterable, accessible |
| Sparklines | react-sparklines | Inline trend lines in table cells and KPI cards |
| Icons | Lucide React | Consistent, accessible, tree-shakeable |
| State | Zustand | Lightweight, no boilerplate |
| Routing | React Router v6 | Standard |
| Animations | Framer Motion | Layout animations, spring physics, respects prefers-reduced-motion |
| Math/Stats | simple-statistics | Median, percentile, standard deviation |
| CSV | Papa Parse | Robust CSV parsing for batch upload |
| Notifications | Sonner | Minimal toast library, accessible |
| Keyboard | kbar | Command palette (Cmd+K) |

## 6. Page Architecture

/ -> Homepage
/workspace/deal/new -> New deal intake form (FULL PAGE - not sidebar rail)
/workspace/deal/{id} -> Existing deal detail
/workspace/runway -> 60-Day Runway Lab
/workspace/gst-shield -> GST and Anomaly Shield
/workspace/ageing -> Ageing Matrix and Batch Ledger
/workspace/benchmarks -> Benchmarks and Honesty Audit
/workspace/chat -> AI Risk Assistant (full page)
/workspace/settings -> 4-Section Control Center
/executive-report -> Executive summary + What-If
/ai-risk-copilot -> Same as /chat (alias)

Key change: Parameters are on their own full page. No more inline parameter rail.

## 7. Graph Standards

Every chart must have:
1. Crosshair on hover (ECharts axisPointer.type: cross)
2. DataZoom - scroll wheel zoom + slider
3. Tooltip with exact values - formatted INR, day numbers, percentages
4. Click drill-down - clicking data point opens detail panel
5. Legend toggle - show/hide any series
6. Export PNG - button to download chart
7. Accessible table - beneath chart when tabular data toggle is on

Chart types per view:
- View 01: Horizontal bar (SHAP), Gauge (risk score), Timeline (4-stage stepper)
- View 02: Area chart (balance trajectory), MarkLine (collision), Band (P20-P80)
- View 03: Bubble chart (vendor radar), Bar (ITC lockup)
- View 04: Bar chart (aging buckets), Table (invoice list), Sparklines (risk trend)
- View 05: Heatmap (confusion matrix), Horizontal bar (feature importance)

## 8. Design Language

Principles:
1. Content over chrome: Every border, label, and spacer must justify its existence
2. Data density with breathing room: Dense tables, generous section spacing
3. Flat, solid, architectural: No gradients. No glow. No rounded pills.
4. Monospace for numbers: tabular-nums always. No proportional numerals in financial data.
5. Color as signal, not decoration: Red = danger. Green = safe. Amber = warning. Blue = primary action.
6. One primary action per screen: SCORE INVOICE / RUN BATCH / TEST CONNECTION

Spacing:
- Standard cell padding: 20px (configurable to 16/24px in settings)
- Section gap: 24px
- Element gap within groups: 8px
- Hairline borders: 1px solid var(--border-hairline)

Typography:
- Headings: Instrument Serif (or Geist / Space Grotesk per font system)
- Body: Switzer (or General Sans / Clash Grotesk per font system)
- Numbers: JetBrains Mono (or Geist Mono / IBM Plex Mono per font system)
- Sizes: 9px (labels), 11px (body), 13px (emphasis), 15px (section titles), 20px+ (display)

## 9. Implementation Sequence

Phase 1 - Core Model Hookup (highest priority):
1. Fix inferenceBridge.ts: wire actual joblib model loading or Tier 2 Colab bridge
2. Replace all hard-coded demo data with engine outputs
3. Remove preset buttons - replace with blank form + SCORE action
4. Ensure every chart reads from real model output, not random data

Phase 2 - Page Architecture:
1. Create /workspace/deal/new full-page intake form
2. Rebuild View01 as result page (not inline sidebar)
3. Rebuild View02 charts (area chart, P20-P80 band, collision marker)
4. Rebuild View03 charts (bubble chart, ITC tracker)
5. Rebuild View04 (TanStack Table, batch scoring, portfolio summary)

Phase 3 - Chat Assistant:
1. Build context-aware AI assistant (not generic chatbot)
2. Wire to workspaceStore for context
3. Add quick action chips
4. Conversation history in localStorage

Phase 4 - Settings:
1. Build 4-section control center
2. Model bridge tester with schema inspector
3. Treasury defaults persistence
4. Accessibility suite
5. Appearance studio

Phase 5 - Polish:
1. Install + configure kbar command palette
2. Install Sonner toasts
3. Accessibility: reduced motion, high-contrast, scale, tabular toggle
4. Final build audit

## 10. Success Criteria

The platform is ready for live API entry when:
1. User opens /workspace/deal/new, fills in real invoice data, clicks SCORE, and gets a real risk prediction
2. Graphs zoom, pan, crosshair, and drill-down - no stairway lines
3. Chat assistant answers questions using actual engine output
4. CSV upload scores 100 invoices in batch with real predictions
5. Settings to Model Bridge connects to Colab and scores via remote model
6. Zero hard-coded values in any view
7. Every page has a clear what do I do here action
8. Build passes: npm run build with zero errors
