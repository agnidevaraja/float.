# Veritas AI 2026 - Design Specification
## B2B Payment Survival & Cash-Flow Risk Engine

---

## 1. Visual Architecture: container-lines

The entire interface is bound by **1px structural container lines**. Every panel, card, chart, and text label lives strictly within its grid cell. Content never bleeds across structural boundaries.

### Boundary Rules
- Structural containers use `border-x border-y border-[var(--border-hairline)]`
- Adjacent panels share collapsed borders via `divide-x divide-y divide-[var(--border-hairline)]`
- Internal padding is always `p-5` (structural cells) or `p-6` (outer canvas)
- **No element may ever cross, bleed over, or clip outside a structural container line**
- `5px x 5px` crosshair ticks (`+`) render at primary grid intersections when `--show-crosshairs` is enabled

### Grid Density (switchable)
- **Compact**: cell padding `16px` (`p-4`)
- **Standard** (default): cell padding `20px` (`p-5`)
- **Spacious**: cell padding `24px` (`p-6`)

---

## 2. Color Token System

All colors are solid fills only. Zero gradients, zero neon, zero purple/indigo/violet anywhere.

### Theme 01: Obsidian Blueprint (Default Dark)
```
--bg-canvas:     #09090B
--bg-surface:    #111113
--bg-elevated:   #18181B
--border-hairline: #27272A
--border-subtle:   #3F3F46
--text-primary:  #FAFAFA
--text-muted:    #A1A1AA
--text-tertiary: #71717A
--accent-primary: #2563EB      (International Cobalt Blue)
--accent-safe:   #10B981      (Emerald)
--accent-warn:   #F59E0B      (Amber)
--accent-danger: #EF4444      (Rose)
--accent-info:   #38BDF8      (Sky)
```

### Theme 02: Institutional Slate (Crisp Daylight)
```
--bg-canvas:     #F8FAFC
--bg-surface:    #FFFFFF
--bg-elevated:   #F1F5F9
--border-hairline: #E2E8F0
--border-subtle:   #94A3B8
--text-primary:  #0F172A
--text-muted:    #64748B
--text-tertiary: #94A3B8
--accent-primary: #0D9488      (Deep Institutional Teal)
--accent-safe:   #059669
--accent-warn:   #D97706
--accent-danger: #DC2626
--accent-info:   #0284C7
```

### Theme 03: Ledger Paper (Warm Accounting Daylight)
```
--bg-canvas:     #F6F5F0
--bg-surface:    #FDFDFB
--bg-elevated:   #EFECE6
--border-hairline: #DCD8CE
--border-subtle:   #A8A29E
--text-primary:  #18181B
--text-muted:    #57534E
--text-tertiary: #78716C
--accent-primary: #D97706      (Ledger Amber Ochre)
--accent-safe:   #059669
--accent-warn:   #EA580C
--accent-danger: #DC2626
--accent-info:   #2563EB
```

### Theme 04: Swiss Terminal Monochrome
```
--bg-canvas:     #050505
--bg-surface:    #0C0C0C
--bg-elevated:   #141414
--border-hairline: #292929
--border-subtle:   #525252
--text-primary:  #EDEDED
--text-muted:    #888888
--text-tertiary: #666666
--accent-primary: #EA580C      (International Signal Orange)
--accent-safe:   #10B981
--accent-warn:   #F59E0B
--accent-danger:  #EF4444
--accent-info:   #38BDF8
```

---

## 3. Typography System

### Font Pairing 01: Precision Engineering (Default)
- **Display/Headings**: `Geist` — weight 500/600, tracking `-0.03em`
- **UI/Body**: `Plus Jakarta Sans` — weight 400/500/600
- **Telemetry/Numbers**: `JetBrains Mono` — `font-variant-numeric: tabular-nums`, tracking `-0.02em`

### Font Pairing 02: Editorial Ledger
- **Display/Headings**: `Instrument Serif` — weight 400
- **UI/Body**: `DM Sans` — weight 400/500/600
- **Telemetry/Numbers**: `IBM Plex Mono` — `font-variant-numeric: tabular-nums`

### Font Pairing 03: Industrial Terminal
- **Display/Headings**: `Space Grotesk` — tracking-tight, weight 500/600
- **UI/Body**: `Syne` — weight 400/600
- **Telemetry/Numbers**: `Fira Code` — `font-variant-numeric: tabular-nums`

### Typographic Scale
```
Section Header:    11px, uppercase, tracking-widest, font-mono, text-muted
Card Title:        12px, font-semibold, uppercase, tracking-wider, text-primary
Sub-label:         10px, font-mono, text-tertiary
Body:              13px/14px, font-normal, text-muted → text-primary
Primary Metric:    28px-32px, font-mono, font-bold, tabular-nums, text-primary
Secondary Metric:  18px-22px, font-mono, font-semibold, tabular-nums
```

---

## 4. Spacing & Density Protocol

| Element | Value |
|---------|-------|
| Outer canvas padding | `24px` (`p-6`) |
| Structural cell padding | `20px` (`p-5`) |
| Inner control row gap | `12px` (`gap-3`) |
| Label-to-input gap | `6px` (`gap-1.5`) |
| Chart container gap | `16px` (`gap-4`) |
| Minimum section spacing | `16px` |
| Header height | `56px` (`h-14`) |
| Top telemetry bar | `48px` (`h-12`) |
| Sidebar expanded | `240px` |
| Sidebar collapsed | `60px` |
| Left parameter rail | `360px` |
| Card border radius | `0px` (`rounded-none`) or `2px` (`rounded-[2px]`) max |
| Button border radius | `0px` or `2px` |
| Input border radius | `2px` |
| Status indicator | `6px x 6px` square LED inside rectangular `1px`-bordered frame |

**Hard Ban**: `rounded-full` is forbidden everywhere.

---

## 5. Component Specifications

### Status Tags & Badges
- Rectangular frame with `1px solid` border
- Internal `6px x 6px` square LED indicator (colored, no glow)
- Uppercase `font-mono` label text
- No rounded corners (0px-2px max)

### Buttons
- Sharp corners: `rounded-none` or `rounded-[2px]`
- `1px solid` border, solid flat background
- Active state: `scale(0.97)` with 160ms spring curve
- Focus visible: `ring-1 ring-accent-primary`

### Sliders
- Custom track: `h-1.5 bg-canvas-card rounded`
- Thumb: `accent-{color}` using CSS accent-color
- No gradient fills on tracks

### Tables
- `border-collapse` with `divide-y divide-border-hairline`
- Header: `bg-canvas-elevated text-tertiary text-[10px] uppercase tracking-wider`
- Rows: `hover:bg-canvas-card/50`
- Monospace numbers with `tabular-nums`

### Charts (Recharts)
- Solid stroke colors, no area gradient fills (use flat semi-transparent fills)
- Grid lines: `1px solid var(--border-hairline)` at low opacity
- Axis text: `font-mono text-[10px] fill-text-muted`
- No decorative shadows or glowing dots on data points

---

## 6. Anti-Slop Quality Gates

| Banned | Required |
|--------|----------|
| `rounded-full` (pill shapes) | `rounded-none` or `rounded-[2px]` |
| Purple/indigo/violet gradients | Solid flat fills only |
| `shadow-lg`, `shadow-xl`, `shadow-2xl` | Surface luminance contrast via background colors |
| `Inter`, `Roboto`, `Arial`, `Open Sans` | Geist, Instrument Serif, Space Grotesk, Cabinet Grotesk, Plus Jakarta Sans, DM Sans |
| Generic floating card grids | `container-lines` structural grid with `divide-x`/`divide-y` |
| Glowing orbs/blobs | Crisp 1px structural borders |
| Glassmorphic blur cards | Opaque solid surfaces |

---

## 7. Accessibility

- All interactive elements have `aria-label` or semantic HTML
- Keyboard shortcuts documented:
  - `Cmd/Ctrl + B`: Toggle sidebar
  - `Cmd/Ctrl + K`: Command palette
  - `Escape`: Close modals/drawers
- Focus rings: `focus-visible:ring-1 focus-visible:ring-accent`
- WCAG AA contrast: minimum `4.5:1` across all themes
- `font-variant-numeric: tabular-nums` on every number

---

## 8. File Architecture

```
src/
  types/
    engineContract.ts       # Rust Axum / Python FastAPI type contracts
    index.ts                # Barrel export
  engine/
    riskEngine.ts           # Local calibrated 4-source inference mirror
    inferenceBridge.ts      # External API bridge with fallback
  store/
    themeStore.ts           # Theme, font, density state + localStorage
  data/
    scenarios.ts            # 4 preset scenario definitions
    benchmarks.ts           # Colab metrics, fairness data, failure cases
  components/
    primitives/
      ContainerLines.tsx     # Structural grid wrapper with crosshairs
      StatusLed.tsx          # 6px LED + rectangular label
      SectionHeader.tsx      # Standard section label
      KpiCell.tsx            # Single KPI metric in hairline box
      TelemetryStepper.tsx   # 4-stage processing indicator
      Divider.tsx            # Hairline crosshair divider
    layout/
      Homepage.tsx           # Marketing homepage with hero
      WorkspaceLayout.tsx    # Sidebar + header + view shell
      CollapsibleSidebar.tsx # Unlumen-inspired sidebar
      TopTelemetryBar.tsx    # Macro ticker + API status + presets
    views/
      View01DealWorkbench.tsx    # Pre-deal risk + arrival + term fixer
      View02RunwayLab.tsx        # 60-day cash-flow collision chart
      View03GstShield.tsx        # ITC lockup + anomaly scatter
      View04AgeingMatrix.tsx     # Batch ledger + CSV engine
      View05Benchmarks.tsx       # Model metrics + fairness + failures
      View06Settings.tsx         # Colab bridge + theme studio
    Header.tsx             # Top utility header
    JudgeAuditModal.tsx    # Slide-over audit drawer
    BatchCsvModal.tsx      # CSV ingestion modal
  App.tsx                  # Router + shell
  App.css                  # Global animations + utilities
  main.tsx                 # Entry point
  index.css                # Tailwind + CSS variables + fonts
```

---

## 9. Engine Contract (Option B Architecture)

### InvoiceDecisionRequest (Rust Axum / Python FastAPI)
```typescript
{
  invoice_amount: number;
  payment_term_days: number;
  customer_tenure_months: number;
  past_late_percent: number;
  order_size_vs_avg: number;
  past_avg_delay_days: number;
  due_weekday: string;          // "Mon"|"Tue"|...|"Sun"
  macro_stress_multiplier: number;
  gst_registered: boolean;
  current_bank_balance: number;
  monthly_fixed_expenses: number;
}
```

### EnsembleDecisionResponse
```typescript
{
  blended_risk_percent: number;
  b2b_macro_risk_percent: number;
  credit_default_risk_percent: number;
  fraud_spike_risk_percent: number;
  expected_arrival_day: number;
  arrival_window_low: number;
  arrival_window_high: number;
  is_runway_collision: boolean;
  collision_day: number | null;
  cash_buffer_at_arrival: number;
  shortfall_amount: number;
  gst_itc_locked: number;
  total_at_risk: number;
  thin_file_mode: boolean;
  integrity_warnings: Array<{code, title, description, severity}>;
  top_shap_factors: Array<{factor, impact_score, direction, explanation}>;
  recommended_terms: {tier, badge_label, upfront_percent, on_delivery_percent, net_term_days, exposure_reduction_percent, contract_clause, rationale};
  live_spread: number;
  live_delinquency: number;
}
```

---

## 10. Calibrated Engine Preset Targets

| Scenario | Risk % | Arrival | Window | Collision |
|----------|--------|---------|--------|-----------|
| Safe Repeat Client | ~11.8% | Day 30 | 30-31 | None |
| Moderate Risk | ~41.2% | Day 36 | 33-41 | None |
| High-Risk Late | ~78.4% | Day 63 | 56-74 | Day 33 |
| Recession 1.6x | ~91.2% | Day 75+ | 66-95 | Day 22 |
