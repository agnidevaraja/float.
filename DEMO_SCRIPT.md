# Veritas Risk Engine: 2-Minute Demo Video Script
**Format:** Up to 2 Minutes (120 Seconds Max)  
**Structure:** 15s Problem | 60s Live Demo | 30s Methodology & Baselines | 15s Limitations & Next Steps  

---

### [0:00 - 0:15] The Real-World Problem (15 Seconds)
* **Visual:** Close-up of unpaid invoice and bank balance dropping towards zero.
* **Speaker:**
  "Small businesses and startups rarely fail because they lack customers. They fail because they run out of cash waiting to get paid. Accounting tools like QuickBooks and Zoho only tell you after money is already 60 days late, while credit bureaus are slow, expensive, and blind to young startups. We built the Veritas Risk Engine to give founders predictive underwriting before they sign any B2B deal."

---

### [0:15 - 1:15] Live Product Walkthrough (60 Seconds)
* **Visual:** Browser showing `http://127.0.0.1:5173/` running the live Veritas Risk Engine.
* **Speaker:**
  *(0:15 - 0:30) Scenario 1 vs Scenario 3:*  
  "Here is our live operator workstation. On the left rail, we have four pre-calibrated test scenarios. If we select a Safe Repeat Client, our model confirms a low 14% default risk, predicting on-time cash arrival on Day 30. But watch what happens when we switch to a High-Risk Late Client with a 75% delinquency rate and a 3.2x order spike: our risk index surges to 85.5%."

  *(0:30 - 0:45) Arrival Timeline & Runway Collision:*  
  "Instead of just saying 'High Risk', the engine calculates the exact quantile cash arrival window: Promised on Day 45, but predicted to arrive on Day 47. Crucially, our 60-Day Runway Matrix flags a catastrophic Cash Collision on Day 33, warning that payroll and rent will drain the bank dry 14 days before client funds clear."

  *(0:45 - 1:00) Smart Restructuring & SOW Clause:*  
  "Rather than walking away from the deal, our Smart Payment-Term Restructurer automatically calculates an insulated deal structure: 40% upfront deposit, 30% on milestone delivery, and 30% Net-15. This cuts capital exposure by 65%, and founders can copy the exact legal SOW contract clause in one click."

  *(1:00 - 1:15) GST Shield & Batch CSV Ingestion:*  
  "For Indian MSMEs, flipping the GST Shield instantly calculates blocked Input Tax Credit under Section 16(2)(c). And with our Batch CSV Ingestion, teams can drag and drop an entire ledger, with built-in formula injection sanitization."

---

### [1:15 - 1:45] ML Methodology & Baseline Results (30 Seconds)
* **Visual:** Opening the Veritas AI Blind Round 1 Technical Audit Drawer.
* **Speaker:**
  "Under the hood, we trained our models across 360,646 real financial records from Kaggle B2B invoices, UCI credit defaults, St. Louis Fed FRED macroeconomic spreads, and OpenML fraud data. Using a strict chronological 80/20 train/test split with zero post-payment leakage, our LightGBM engine achieved an ROC-AUC of 0.9845 and PR-AUC of 0.9841, dramatically outperforming simple business rules at 0.6287. On cash arrival timing, our quantile model achieves a Mean Absolute Error of just 0.38 days. Furthermore, our startup fairness audit proves a 0.00% false alarm rate on companies under 12 months."

---

### [1:45 - 2:00] Limitations & What We Would Do Next (15 Seconds)
* **Visual:** Highlighting failure cases and future API roadmap.
* **Speaker:**
  "We also maintain transparent error analysis: in 3 test cases where high-delinquency clients paid on time, special vendor settlement windows overrode normal behavior. Next, we will build direct ERP webhooks for Tally and QuickBooks and automate escrow disbursements via UPI and FedNow. Thank you."
