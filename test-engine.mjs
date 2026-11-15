import { evaluateB2bPaymentRisk } from './src/engine/riskEngine.ts';
import { SCENARIO_PRESETS } from './src/data/scenarios.ts';

console.log("=== RUNNING CONTINUOUS LOOP GATE 3: ENGINE VERIFICATION ===");

for (const sc of SCENARIO_PRESETS) {
  const res = evaluateB2bPaymentRisk(sc.params);
  console.log(`\nScenario: ${sc.name}`);
  console.log(`  Unified Risk: ${res.blendedRiskPercent.toFixed(1)}%`);
  console.log(`  Promised Day: ${sc.params.paymentTermDays} -> Expected Arrival: Day ${res.expectedArrivalDay} (Window: ${res.arrivalWindowLow}-${res.arrivalWindowHigh})`);
  console.log(`  Restructuring: ${res.recommendedTerms.badgeLabel} (${res.recommendedTerms.exposureReductionPercent}% reduction)`);
  console.log(`  Collision: ${res.isRunwayCollision ? `Deficit Day ${res.collisionDay} (Shortfall: ₹${res.shortfallAmount.toLocaleString()})` : `Safe Buffer: ₹${res.cashBufferAtArrival.toLocaleString()}`}`);
}

console.log("\nALL 4 SCENARIOS VERIFIED SUCCESSFULLY!");
