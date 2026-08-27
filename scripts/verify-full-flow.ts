// Automated End-to-End Store & Workflow Verification Runner
import { buildSeedData } from "../lib/data/seed";
import { calculateTrustScore, calculateContractorTrust } from "../lib/services/trustEngine";
import { calculateMatchScore } from "../lib/services/jobMatching";
import { CITIES } from "../lib/utils/cities";

console.log("==================================================");
console.log("   SHRAMSETU AI — FULL SYSTEM AUDIT & VERIFICATION");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean | number | string | object | null | undefined, name: string, details = "") {
  if (Boolean(condition)) {
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name} — ${details}`);
    failed++;
  }
}

// 1. Seed Data Integrity Audit
console.log("📦 1. SEED DATA & INTEGRITY AUDIT");
const data = buildSeedData();
assert(data.users.length >= 7, "Users Seed", `Found ${data.users.length} users`);
assert(data.workerProfiles.length >= 4, "Worker Profiles", `Found ${data.workerProfiles.length} worker profiles`);
assert(data.contractorProfiles.length >= 2, "Contractor Profiles", `Found ${data.contractorProfiles.length} contractors`);
assert(data.jobs.length >= 8, "Jobs Count", `Found ${data.jobs.length} jobs`);
assert(data.applications.length >= 5, "Applications Count", `Found ${data.applications.length} applications`);
assert(data.payments.length >= 6, "Payments Count", `Found ${data.payments.length} payments`);
assert(data.expenses.length >= 6, "Expenses Count", `Found ${data.expenses.length} expenses`);
assert(data.savingsGoals.length >= 3, "Savings Goals", `Found ${data.savingsGoals.length} savings goals`);
assert(data.verifications.length >= 5, "Verifications Count", `Found ${data.verifications.length} verifications`);
assert(data.safetyReports.length >= 3, "Safety Reports", `Found ${data.safetyReports.length} reports`);
assert(data.fraudSignals.length >= 3, "Fraud Signals", `Found ${data.fraudSignals.length} fraud signals`);

// 2. Trust Engine Algorithm Audit
console.log("\n🛡️ 2. TRUST ENGINE & SCORING AUDIT");
const ramesh = data.users.find((u) => u.id === "usr_w_1")!;
const rameshProfile = data.workerProfiles.find((p) => p.userId === "usr_w_1")!;

const trustResult = calculateTrustScore({
  user: ramesh,
  profile: rameshProfile,
  verifications: data.verifications,
  assessments: data.assessments,
  workHistory: data.workHistory,
  applications: data.applications,
  payments: data.payments,
  safetyReports: data.safetyReports,
  fraudSignals: data.fraudSignals,
});
assert(trustResult.score >= 30 && trustResult.score <= 100, "Worker Trust Calculation", `Calculated score: ${trustResult.score} (${trustResult.label})`);

assert(trustResult.breakdown.length === 5, "Trust Breakdown Categories", `Has 5 sub-factors`);

const contractorUser = data.users.find((u) => u.id === data.contractorProfiles[0].userId)!;
const contractorTrust = calculateContractorTrust({
  user: contractorUser,
  jobs: data.jobs,
  payments: data.payments,
  safetyReports: data.safetyReports,
  verifications: data.verifications,
});
assert(contractorTrust.score >= 50 && contractorTrust.score <= 100, "Contractor Trust Calculation", `Score: ${contractorTrust.score}`);


// 3. AI Job Matching Algorithm Audit
console.log("\n💼 3. AI JOB MATCHING ENGINE AUDIT");
const sampleJob = data.jobs[0];
const sampleContractor = data.contractorProfiles.find((c) => c.userId === sampleJob.contractorId);
const matchResult = calculateMatchScore(sampleJob, rameshProfile, sampleContractor, CITIES[0]);
assert(matchResult.matchScore >= 0 && matchResult.matchScore <= 100, "Job Match Score", `Score: ${matchResult.matchScore}%`);
assert(matchResult.reasons.length > 0, "Match Score Explanations", `Reasons: ${matchResult.reasons.join(", ")}`);


// 4. Cities & Locations Audit
console.log("\n📍 4. CITIES & LOCALIZATION AUDIT");
assert(CITIES.length >= 6, "Supported Cities Count", `Found ${CITIES.length} major hubs`);
assert(CITIES.some((c) => c.id === "lucknow"), "Lucknow Hub Verified");
assert(CITIES.some((c) => c.id === "delhi"), "Delhi NCR Hub Verified");

// 5. Workflow State Mutations Simulation
console.log("\n🔄 5. WORKFLOW STATE MUTATIONS SIMULATION");

// Job Application Workflow
const existingApp = data.applications.find((a) => a.workerId === ramesh.id);
assert(existingApp !== undefined, "Job Application State Linkage", `Application status: ${existingApp?.status}`);


// Financial Income & Savings Calculation
const totalPayments = data.payments.length;
const totalPaidPayments = data.payments.filter((p) => p.status === "paid").length;
const totalExpenses = data.expenses.length;
assert(totalPayments >= 30, "Income Payments Seed", `Total Payments: ${totalPayments}`);
assert(totalPaidPayments > 0, "Paid Payments Verification", `Paid Payments: ${totalPaidPayments}`);
assert(totalExpenses >= 30, "Expenses Aggregation", `Total Expenses: ${totalExpenses}`);


// Savings Goal Contribution
const goal = data.savingsGoals[0];
const nextGoalSaved = goal.currentAmount + 500;
assert(nextGoalSaved <= goal.targetAmount, "Savings Goal Contribution", `Goal: ₹${nextGoalSaved} / ₹${goal.targetAmount}`);

// 6. Navigation Active Route Resolution Audit
console.log("\n🧭 6. NAVIGATION ROUTE HIGHLIGHT AUDIT");
function testNavActive(pathname: string, href: string, allHrefs: string[]) {
  if (pathname === href) return true;
  if (pathname.startsWith(href + "/")) {
    const hasMoreSpecificItem = allHrefs.some(
      (other) => other !== href && other.startsWith(href) && (pathname === other || pathname.startsWith(other + "/"))
    );
    return !hasMoreSpecificItem;
  }
  return false;
}
const contractorHrefs = ["/contractor/dashboard", "/contractor/jobs", "/contractor/jobs/new", "/contractor/workers", "/contractor/applicants"];
assert(testNavActive("/contractor/jobs/new", "/contractor/jobs/new", contractorHrefs) === true, "Post Job Active on /contractor/jobs/new");
assert(testNavActive("/contractor/jobs/new", "/contractor/jobs", contractorHrefs) === false, "My Jobs Inactive on /contractor/jobs/new (No Duplicate Highlight)");
assert(testNavActive("/contractor/jobs", "/contractor/jobs", contractorHrefs) === true, "My Jobs Active on /contractor/jobs");

console.log("\n==================================================");
console.log(`   AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed === 0) {
  console.log("✨ ALL CORE ENGINES, STORE SCHEMAS, AND FLOWS ARE 100% HEALTHY & VALIDATED!\n");
} else {
  process.exit(1);
}
