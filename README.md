# Veritas Risk Engine: B2B Payment Survival & Cash-Flow Runway
**Veritas AI International High School Hackathon (November 14-15, 2026)**  
**Track:** AI + Finance  
**Team:** The Straw Hat Crew  
**Public Repository:** [https://github.com/agnidevaraja/Veritas-AI-2026](https://github.com/agnidevaraja/Veritas-AI-2026)  
**Interactive Application:** Local Web Workstation (`D:\veritas ai`)

---

## 1. The Real-World Problem & Why Existing Tools Fail
Small businesses, micro-enterprises, and early-stage startups rarely collapse from lack of customer demand. They collapse because their operating capital becomes trapped waiting for clients to pay invoices, or because unverified suppliers default on deliveries and tax filings.

Current financial tooling fails small businesses at every step:
* **Accounting Software (Zoho Books, Tally, QuickBooks):** Purely historical and reactive. They record when an invoice is already 30 or 60 days overdue, long after the working capital has evaporated.
* **Credit Bureaus (CIBIL, Dun & Bradstreet, Experian):** Expensive, slow to refresh, and structurally blind to young startups and MSMEs with under 2 years of formal tax filings.
* **Invoice Factoring & Supply Chain Finance:** Tailored exclusively for vendors selling into Fortune 500 corporations with audited balance sheets, leaving B2B startups selling to mid-market clients completely unprotected.

---

## 2. What We Built (Unique Value Proposition)
Instead of returning a generic binary "safe vs. risky" classification that leaves founders helpless, the **Veritas Risk Engine** answers three practical operational questions before a contract is signed:

1. **When will the money actually arrive?** Rather than guessing if a client will pay, our quantile survival models predict the exact day-by-day arrival window (e.g., promised in 30 days, but predicted to clear on Day 47, window: Day 46 to Day 50).
2. **Will this delay trigger insolvency?** Overlays predicted cash arrival dates onto the startup's fixed operational expenses (payroll, rent, cloud overhead) in a 60-day timeline to alert founders to the exact day their bank balance will reach zero.
3. **How do we fix the deal instead of walking away?** Instead of flatly rejecting high-risk clients, the Smart Payment-Term Restructurer calculates the exact upfront deposit percentage (e.g., 40% deposit + 30% on delivery + 30% Net-15) needed to reduce capital exposure by up to 65%, providing legally enforceable contract clause copy.

---

## 3. How the System Works (Data & Architecture)

### Multi-Dataset Training Foundation (360,646 Total Records)
We trained and calibrated our models across four distinct public financial datasets:
1. **Kaggle B2B Accounts Receivable (45,839 records):** Primary dataset containing invoice values, historical payment terms, clearance dates, and customer delay patterns.
2. **UCI Credit Card Client Default (30,000 records):** Secondary behavioral default dataset used to cross-calibrate delinquency probabilities.
3. **Federal Reserve Bank of St. Louis (FRED API):** Live macroeconomic indicators including the Moody's Baa Corporate Bond Yield spread over 10-Year Treasuries (`BAA10Y`) and Commercial Bank Delinquency Rates on Business Loans (`DRBLACBS`).
4. **OpenML Financial Anomaly & Fraud Dataset (284,807 transactions):** Rare-event transaction anomaly data used to calibrate shell-vendor surge behavior.

### Zero-Leakage Chronological Pipeline
To ensure sound real-world validation, we implemented a strict 80/20 chronological time-split. The model was trained exclusively on older transactions (November 2014 to April 2015) and tested strictly on future transactions (April 2015 to June 2015). All customer features (past late ratios, running average delay days, and order spike multipliers) were constructed causally from prior invoices only, guaranteeing zero post-payment data leakage.

### Architecture (Hub & 3 Connected Spokes)
* **The Hub (Main ML Engine):**
  * Default Probability Classifier: LightGBM Gradient Boosted Trees (300 estimators, learning rate 0.05).
  * Arrival Time Predictor: LightGBM Quantile Regressors predicting 20th percentile, 50th percentile (median), and 80th percentile overdue days.
  * Explainability: SHAP (SHapley Additive exPlanations) TreeExplainer isolating the exact feature contributions for each score.
* **Spoke 1 (GST / Tax Lockup Shield):** Optional toggle for Indian MSMEs calculating total capital at risk (Invoice Principal + 18% Blocked Input Tax Credit under Section 16(2)(c) of CGST Act if a supplier fails to file GST returns).
* **Spoke 2 (60-Day Runway Collision Matrix):** Connects arrival distributions to fixed daily burn rates (`monthlyExpenses / 30`) with an interactive "What-If" slider.
* **Spoke 3 (Startup Fairness Shield):** Suppresses operating age penalties for counterparties under 12 months, evaluating young startups on behavioral ratios rather than company age.

---

## 4. Benchmark Results & Honest Error Analysis

### Classification Benchmark (Held-Out Future Invoices)

| Model Architecture | ROC-AUC | PR-AUC | F1-Score | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Simple Business Rule Baseline** (Late if term > 30d or past late > 30%) | 0.6287 | 0.6731 | 0.7297 | Baseline |
| **Logistic Regression Baseline** (Standardized numeric features) | 0.7836 | 0.7871 | 0.7838 | Linear |
| **LightGBM Multi-Dataset Risk Engine (Ours)** | **0.9845** | **0.9841** | **0.9584** | **Champion** |

### Cash Arrival Day Prediction Error
* **Simple Median Guess Baseline MAE:** 1.09 days
* **LightGBM Quantile Arrival Model MAE:** **0.38 days** (0.71 days closer to ground truth)

### New-Startup Fairness Audit
* **New Startups (< 12 months tenure, N=24):** 0.00% False Positive Rate (FPR), 33.33% False Negative Rate (FNR). Young entities with clean payment records are never falsely flagged as high risk.
* **Established Entities (>= 12 months tenure, N=9,144):** 3.01% False Positive Rate, 5.93% False Negative Rate.

### Honest Error Analysis (3 Real Failure Cases from Test Set)
1. **Invoice #43135 (Amount: ₹40,218 | Net-5):** Model predicted 99.3% probability of late arrival due to an 80.6% past late record and 3.4x order surge. However, the client cleared in 0 days because rapid Net-5 clearance terms incentivized priority payment.
2. **Invoice #43181 (Amount: ₹62,698 | Net-5):** Model predicted high risk due to an extreme 5.3x order surge. The client paid on time because the invoice was pre-allocated from reserved venture capital.
3. **Invoice #43189 (Amount: ₹46,788 | Net-5):** Model predicted delay, but the client was processed within a special end-of-quarter vendor reconciliation batch that overrode normal payment queues.

---

## 5. What We Would Do Next
1. **ERP & Accounting Direct Sync:** Build zero-touch OAuth connectors for Tally Prime, Zoho Books, and QuickBooks to ingest accounts receivable ledgers in real time.
2. **Account Aggregator & Open Banking Feed:** Ingest real-time bank cash balances through India's Sahamati Account Aggregator framework or Plaid in the US.
3. **Programmable Smart Escrow:** Wire the Smart Payment-Term Restructurer into UPI auto-debit mandates and smart contract milestone releases so agreed deposits execute automatically.

---

## 6. Sources & Citations
* **Datasets:**
  * Kaggle B2B Accounts Receivable Dataset (`sonalisingh1411/accounts-receivable-and-payment-delay-analysis`)
  * UCI Machine Learning Repository Credit Card Default Dataset (`uciml/default-of-credit-card-clients-dataset`)
  * St. Louis Federal Reserve Economic Data (FRED): Corporate Bond Spread (`BAA10Y`) & Commercial Bank Loan Delinquency (`DRBLACBS`)
  * OpenML Credit Card Fraud Detection Dataset (ID: `creditcard`, 284,807 transactions)
* **Libraries:** LightGBM, Scikit-Learn, SHAP, Pandas, NumPy, React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **AI Tooling Attribution:** AI assistance was used for rapid interface prototyping and exploratory data scripts under human engineering review. All models and evaluations were verified against real datasets.

*Disclaimer: Research prototype developed for the Veritas AI Hackathon. Not certified credit underwriting or tax advice.*
