export interface BenchmarkMetric {
  modelName: string;
  rocAuc: number;
  prAuc: number;
  f1Score: number;
  isChampion?: boolean;
}

export const CLASSIFICATION_BENCHMARKS: BenchmarkMetric[] = [
  {
    modelName: 'Simple Business Rule Baseline',
    rocAuc: 0.6287,
    prAuc: 0.6731,
    f1Score: 0.7297
  },
  {
    modelName: 'Logistic Regression Baseline',
    rocAuc: 0.7836,
    prAuc: 0.7871,
    f1Score: 0.7838
  },
  {
    modelName: 'LightGBM Multi-Dataset Risk Engine (Ours)',
    rocAuc: 0.9845,
    prAuc: 0.9841,
    f1Score: 0.9584,
    isChampion: true
  }
];

export const ARRIVAL_MAE_BENCHMARK = {
  baselineMae: 1.09,
  modelMae: 0.38,
  deltaDays: 0.71
};

export const DATASET_PROVENANCE = [
  {
    name: 'B2B Accounts Receivable & Payment Delay',
    source: 'Kaggle (sonalisingh1411)',
    records: 45839,
    role: 'Primary invoice delay history & chronological behavioral features'
  },
  {
    name: 'Default of Credit Card Clients',
    source: 'UCI Machine Learning Repository / Kaggle',
    records: 30000,
    role: 'Secondary behavioral credit default likelihood calibration'
  },
  {
    name: 'Corporate Bond Spread & Loan Delinquency',
    source: 'Federal Reserve Bank of St. Louis (FRED)',
    records: 4000,
    role: 'Live macroeconomic stress indicators (BAA10Y & DRBLACBS)'
  },
  {
    name: 'Financial Transaction Anomaly & Fraud Dataset',
    source: 'OpenML (creditcard)',
    records: 284807,
    role: 'Rare-event surge and shell-vendor anomaly calibration'
  }
];

export const FAIRNESS_AUDIT_DATA = [
  {
    cohort: 'New Startups (< 12 months tenure)',
    sampleSize: 24,
    falsePositiveRate: 0.00,
    falseNegativeRate: 33.33,
    verdict: 'Zero false alarms. Young startups are not penalized simply for short history.'
  },
  {
    cohort: 'Established Entities (>= 12 months tenure)',
    sampleSize: 9144,
    falsePositiveRate: 3.01,
    falseNegativeRate: 5.93,
    verdict: 'Consistent balanced detection across full enterprise track record.'
  }
];

export const TEST_FAILURE_CASES = [
  {
    invoiceId: 'INV-43135',
    amount: 40218,
    paymentTerm: 5,
    tenureMonths: 155,
    pastLateRatio: 0.806,
    orderSpikeRatio: 3.40,
    modelPrediction: 'High Risk (99.3% Late)',
    actualOutcome: 'Paid On Time (0 Days Late)',
    explanation: 'Client had an 80% past late record and 3.4x order surge, but prioritized rapid Net-5 clearance on this specific contract.'
  },
  {
    invoiceId: 'INV-43181',
    amount: 62698,
    paymentTerm: 5,
    tenureMonths: 155,
    pastLateRatio: 0.804,
    orderSpikeRatio: 5.30,
    modelPrediction: 'High Risk (99.3% Late)',
    actualOutcome: 'Paid On Time (0 Days Late)',
    explanation: 'Despite extreme 5.3x order size increase, the counterparty had pre-funded capital allocated for immediate disbursement.'
  },
  {
    invoiceId: 'INV-43189',
    amount: 46788,
    paymentTerm: 5,
    tenureMonths: 155,
    pastLateRatio: 0.803,
    orderSpikeRatio: 3.95,
    modelPrediction: 'High Risk (99.3% Late)',
    actualOutcome: 'Paid On Time (0 Days Late)',
    explanation: 'Contract was part of a rapid-settlement vendor reconciliation window that overrode customary payment schedules.'
  }
];
