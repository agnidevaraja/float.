# Veritas AI 2026 — Complete Handoff Context

## Workspace
`D:\veritas ai\` — React + TypeScript + Vite + Tailwind CSS + Zustand + ECharts + Lucide Icons

---

## User Prompt (Full Caveman Skill Task)

ARGUMENTS: <role>
You are a Staff Frontend & Accessibility Engineer finalizing the "B2B Payment Survival & Cash-Flow Risk Engine" in Claude Code. Ensure the platform is 100% ready for live Google Colab / FastAPI / Rust API integration, WCAG AA accessible, keyboard-navigable, and completely free of visual or functional bugs.
</role>

<tasks>
1. EXPAND `Settings` INTO A 4-SECTION ENTERPRISE CONTROL CENTER:
   - **Section 01 — Live Google Colab / FastAPI / Rust Axum Model Bridge**:
     - Input for Endpoint URL, optional Authorization/API Key header, request timeout (`ms`), auto-fallback toggle, and **`[ TEST & VALIDATE SCHEMA ]`** button that sends a health/prediction probe and displays exact round-trip latency and schema compatibility status.
     - Interactive **Live Request / Response Schema Inspector** showing the exact JSON & Rust `Axum` struct contract (`InvoiceDecisionRequest` / `EnsembleDecisionResponse`) plus a 1-click copyable Python FastAPI/Colab server cell (`b2b_risk_engine_final.joblib`) so connecting Colab takes under 30 seconds.
   - **Section 02 — Small Business Treasury & Tax Defaults**:
     - Persist default Current Bank Balance (`₹`), Monthly Fixed Operating Burn (`₹`), Bank Overdraft (OD) Limit (`₹`), Default GST Registration status, Default GST Slab (`18%`), and Default Supply Type (`CGST+SGST` vs `IGST`) in `localStorage` so every new underwriting intake pre-populates the user's own business baseline cleanly.
   - **Section 03 — Accessibility & Readability Suite (`WCAG AA`)**:
     - **Reduced Motion Toggle** (disables chart and stepper animations immediately),
     - **High-Contrast Hairline Borders Toggle** (boosts border and muted text contrast ratios above `7:1` AAA),
     - **Interface Scale Selector** (`90% Compact`, `100% Standard`, `110% Large`),
     - **Tabular Chart Data Table Toggle** (renders an accessible keyboard-navigable HTML data table beneath every Apache ECharts visualization for screen readers and rapid number verification).
   - **Section 04 — Appearance & Typography Studio**:
     - Keep our 4 solid zero-gradient themes (`Obsidian Blueprint`, `Institutional Slate`, `Ledger Paper`, `Swiss Terminal`), custom solid accent hex picker, 3 non-generic font pairings (`Instrument Serif + Switzer + JetBrains Mono`, `Geist + General Sans + Geist Mono`, `Space Grotesk + Clash Grotesk + IBM Plex Mono`), and `container-lines` crosshair toggle.

2. HOMEPAGE & COMMAND PALETTE ALIGNMENT:
   - Ensure the Homepage (`/`) hero CTA routes directly into the clean **Deal Underwriting Intake** (`/workspace`), highlights the 4-source architecture (`360,646` real records), and contains zero fake preset clutter.
   - Update the `Cmd/Ctrl + K` Command Palette so users can jump to any of the 6 views (`Underwriting`, `AI Risk Copilot`, `Runway Lab`, `GST Shield`, `Ageing Matrix`, `Benchmarks`, `Settings`), toggle themes, or export their portfolio report from the keyboard.

3. FINAL BUILD & AUDIT:
   - Run `npm run build` and audit every view (`Homepage`, `Deal Underwriting`, `Executive Report + What-If Comparator`, `AI Risk Copilot`, `Runway Lab`, `GST Shield`, `Ageing Matrix`, `Benchmarks`, `Settings`) to confirm zero TypeScript errors, zero overlapping overlays, zero gradients, and zero pill shapes.
</tasks>

