import type {
  User,
  WorkerProfile,
  ContractorProfile,
  Job,
  Application,
  Payment,
  Expense,
  SavingsGoal,
  Review,
  Verification,
  TrustScoreEvent,
  Notification,
  SafetyReport,
  FraudSignal,
  Assessment,
  Skill,
  WorkHistory,
} from "@/lib/types";
import { CITIES } from "@/lib/utils/cities";

const PROFESSIONS = [
  { name: "Mason", skills: ["Masonry", "Brickwork", "Plastering"] },
  { name: "Painter", skills: ["Painting", "Wall Prep", "Polish"] },
  { name: "Plumber", skills: ["Plumbing", "Pipe Fitting", "Drainage"] },
  { name: "Electrician", skills: ["Wiring", "Lighting", "Repair"] },
  { name: "Carpenter", skills: ["Carpentry", "Furniture", "Doors"] },
  { name: "Tile Fitter", skills: ["Tiling", "Grouting", "Tile Cutting"] },
  { name: "Helper", skills: ["Material Handling", "Site Cleaning"] },
];

const FIRST_NAMES = [
  "Ramesh", "Suresh", "Lata", "Amit", "Priya", "Vikram", "Anita", "Manoj",
  "Geeta", "Rajesh", "Sunita", "Deepak", "Kavita", "Arjun", "Meena", "Sanjay",
  "Asha", "Rakesh", "Pooja", "Kiran", "Vinod", "Neha", "Mahesh", "Rekha",
  "Ganesh",
];
const LAST_NAMES = [
  "Kumar", "Yadav", "Devi", "Sharma", "Singh", "Verma", "Patel", "Gupta",
  "Khan", "Tiwari", "Mishra", "Pandey", "Joshi", "Chauhan", "Rawat",
];

const CONTRACTOR_COMPANIES = [
  "Raj BuildWorks", "Sharma Constructions", "Verma Infra", "Patel Builders",
  "Modern Homes Pvt Ltd", "Singh Contractors", "Gupta Projects",
  "Anita Civil Works", "Bharat BuildCon", "Noida Construction Co",
];

const SKILL_LIBRARY: Skill[] = [
  { id: "sk_masonry", name: "Masonry", category: "Construction" },
  { id: "sk_brickwork", name: "Brickwork", category: "Construction" },
  { id: "sk_plastering", name: "Plastering", category: "Construction" },
  { id: "sk_painting", name: "Painting", category: "Finishing" },
  { id: "sk_plumbing", name: "Plumbing", category: "MEP" },
  { id: "sk_wiring", name: "Wiring", category: "MEP" },
  { id: "sk_carpentry", name: "Carpentry", category: "Finishing" },
  { id: "sk_tiling", name: "Tiling", category: "Finishing" },
  { id: "sk_helper", name: "Site Helper", category: "General" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function dateAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function dateAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const NAMES: string[] = [];
const CONTRACTOR_NAMES: string[] = [];

// Pre-generate so we can reference by name
FIRST_NAMES.forEach((f) => LAST_NAMES.forEach((l) => NAMES.push(`${f} ${l}`)));

function genUsers(): User[] {
  const users: User[] = [];
  // Workers
  for (let i = 0; i < 25; i++) {
    const city = pick(CITIES);
    const name = NAMES[i];
    users.push({
      id: `usr_w_${i + 1}`,
      role: "worker",
      name,
      email: i === 0 ? "worker@shramsetu.local" : `worker${i + 1}@shramsetu.local`,
      phone: `+91 9${rand(100000000, 999999999)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(" ", "")}`,
      location: city.id,
      createdAt: dateAgo(rand(30, 400)),
      status: "active",
    });
  }
  // Contractors
  for (let i = 0; i < 10; i++) {
    const city = pick(CITIES);
    const name = CONTRACTOR_COMPANIES[i];
    CONTRACTOR_NAMES.push(name);
    users.push({
      id: `usr_c_${i + 1}`,
      role: "contractor",
      name,
      email: i === 0 ? "contractor@shramsetu.local" : `contractor${i + 1}@shramsetu.local`,
      phone: `+91 9${rand(100000000, 999999999)}`,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name.replace(/\s/g, "")}`,
      location: city.id,
      createdAt: dateAgo(rand(60, 500)),
      status: "active",
    });
  }
  // Admin
  users.push({
    id: "usr_a_1",
    role: "admin",
    name: "ShramSetu Admin",
    email: "admin@shramsetu.local",
    phone: "+91 9000000000",
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=SA`,
    location: "delhi",
    createdAt: dateAgo(500),
    status: "active",
  });
  return users;
}

function genWorkerProfiles(users: User[]): WorkerProfile[] {
  return users
    .filter((u) => u.role === "worker")
    .map((u, i) => {
      const prof = pick(PROFESSIONS);
      const city = CITIES.find((c) => c.id === u.location) || CITIES[0];
      const trustScore = i === 0 ? 87 : rand(45, 92);
      const completedJobs = rand(2, 80);
      return {
        userId: u.id,
        profession: prof.name,
        experienceYears: rand(1, 15),
        expectedDailyWage: city.wageBase + rand(-100, 200),
        availability: pick(["available", "available", "working", "unavailable"]) as
          | "available"
          | "working"
          | "unavailable",
        bio: `Experienced ${prof.name} with hands-on construction expertise. Reliable and skilled.`,
        profileCompletion: rand(60, 98),
        preferredRadiusKm: rand(3, 15),
        languages: pickN(["Hindi", "English", "Bhojpuri", "Punjabi", "Marwari"], rand(1, 2)),
        skills: pickN(prof.skills, Math.min(prof.skills.length, rand(1, 3))),
        trustScore,
        trustLabel:
          trustScore >= 90
            ? "Excellent Trust"
            : trustScore >= 75
            ? "High Trust"
            : trustScore >= 60
            ? "Trusted"
            : trustScore >= 40
            ? "Building Trust"
            : "Low Trust",
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        completedJobs,
        certifications: pickN(
          ["Safety Training", "Skill Certification", "First Aid", "Equipment Operation"],
          rand(0, 3)
        ),
      };
    });
}

function genContractorProfiles(users: User[]): ContractorProfile[] {
  return users
    .filter((u) => u.role === "contractor")
    .map((u) => {
      const trustScore = rand(60, 95);
      return {
        userId: u.id,
        companyName: u.name,
        businessType: pick(["Residential", "Commercial", "Infrastructure", "Renovation"]),
        location: u.location,
        trustScore,
        trustLabel:
          trustScore >= 90
            ? "Excellent Trust"
            : trustScore >= 75
            ? "High Trust"
            : trustScore >= 60
            ? "Trusted"
            : "Building Trust",
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        paymentReliability: rand(70, 99),
        completedJobs: rand(10, 200),
        responseRate: rand(70, 99),
        complaintCount: rand(0, 5),
      };
    });
}

function genJobs(contractors: User[]): Job[] {
  const jobs: Job[] = [];
  const TITLES = [
    "Masonry Work",
    "Residential Painting",
    "Bathroom Plumbing",
    "House Wiring",
    "Door & Window Carpentry",
    "Kitchen Tiling",
    "Construction Helper",
    "Exterior Painting",
    "Plastering Work",
    "Floor Tiling",
  ];
  for (let i = 0; i < 30; i++) {
    const contractor = pick(contractors);
    const city = CITIES.find((c) => c.id === contractor.location) || CITIES[0];
    const profession = pick(PROFESSIONS);
    const wage = city.wageBase + rand(-100, 200);
    const status = pick(["active", "active", "active", "completed", "draft", "closed"]) as
      | "active"
      | "completed"
      | "draft"
      | "closed";
    jobs.push({
      id: `job_${i + 1}`,
      contractorId: contractor.id,
      title: pick(TITLES),
      category: profession.name,
      description: `Looking for a reliable ${profession.name} for ${pick([
        "residential",
        "commercial",
      ])} project. ${rand(7, 30)}-day assignment with fair compensation.`,
      location: city.name,
      latitude: city.latitude + (Math.random() - 0.5) * 0.05,
      longitude: city.longitude + (Math.random() - 0.5) * 0.05,
      wagePerDay: wage,
      startDate: dateAhead(rand(1, 14)),
      endDate: dateAhead(rand(20, 60)),
      workersNeeded: rand(1, 6),
      workersHired: status === "active" ? rand(0, 3) : rand(1, 5),
      status,
      requiredSkills: pickN(profession.skills, rand(1, profession.skills.length)),
      paymentFrequency: pick(["daily", "weekly", "on-completion"]) as
        | "daily"
        | "weekly"
        | "on-completion",
      safetyNotes:
        "Hard hat and safety boots required. Site induction on day 1. Emergency contact on site.",
      createdAt: dateAgo(rand(1, 30)),
    });
  }
  return jobs;
}

function genApplications(workers: User[], jobs: Job[]): Application[] {
  const apps: Application[] = [];
  for (let i = 0; i < 60; i++) {
    const worker = pick(workers);
    const job = pick(jobs);
    const status = pick([
      "applied",
      "viewed",
      "shortlisted",
      "selected",
      "rejected",
      "completed",
    ]) as Application["status"];
    apps.push({
      id: `app_${i + 1}`,
      jobId: job.id,
      workerId: worker.id,
      matchScore: rand(55, 98),
      status,
      appliedAt: dateAgo(rand(1, 25)),
      matchReasons: pickN(
        [
          "Skill match",
          "Within preferred radius",
          "Above expected wage",
          "High contractor trust",
          "Availability aligned",
        ],
        rand(2, 4)
      ),
    });
  }
  return apps;
}

function genPayments(workers: User[], contractors: User[], jobs: Job[]): Payment[] {
  const payments: Payment[] = [];
  for (let i = 0; i < 40; i++) {
    const worker = pick(workers);
    const job = pick(jobs);
    const status = pick(["paid", "paid", "pending", "due", "overdue"]) as Payment["status"];
    payments.push({
      id: `pay_${i + 1}`,
      jobId: job.id,
      workerId: worker.id,
      contractorId: job.contractorId,
      amount: job.wagePerDay * rand(1, 7),
      dueDate: dateAgo(rand(-3, 14)),
      paidDate: status === "paid" ? dateAgo(rand(0, 10)) : undefined,
      status,
      method: pick(["UPI", "Bank Transfer", "Cash", "Cheque"]),
      notes: status === "overdue" ? "Payment delayed" : undefined,
    });
  }
  return payments;
}

function genExpenses(workers: User[]): Expense[] {
  const expenses: Expense[] = [];
  const CATS: Array<Expense["category"]> = [
    "food",
    "transport",
    "rent",
    "family",
    "tools",
    "medical",
    "other",
  ];
  for (let i = 0; i < 50; i++) {
    const worker = pick(workers);
    expenses.push({
      id: `exp_${i + 1}`,
      workerId: worker.id,
      category: pick(CATS),
      amount: rand(30, 1500),
      date: dateAgo(rand(0, 30)),
      note: Math.random() > 0.5 ? "Routine" : undefined,
    });
  }
  return expenses;
}

function genSavingsGoals(workers: User[]): SavingsGoal[] {
  const goals: SavingsGoal[] = [];
  const names = [
    "Emergency Fund",
    "Daughter's School",
    "Festival Savings",
    "Tool Upgrade",
    "House Repair",
  ];
  for (let i = 0; i < 10; i++) {
    const worker = pick(workers);
    const target = rand(5000, 25000);
    goals.push({
      id: `sav_${i + 1}`,
      workerId: worker.id,
      name: pick(names),
      targetAmount: target,
      currentAmount: rand(1000, target - 500),
      targetDate: dateAhead(rand(30, 180)),
    });
  }
  return goals;
}

function genReviews(): Review[] {
  const reviews: Review[] = [];
  for (let i = 0; i < 40; i++) {
    reviews.push({
      id: `rev_${i + 1}`,
      reviewerId: `usr_c_${rand(1, 10)}`,
      revieweeId: `usr_w_${rand(1, 25)}`,
      jobId: `job_${rand(1, 30)}`,
      rating: rand(3, 5),
      comment: pick([
        "Reliable and skilled worker.",
        "Good work ethic, on time.",
        "Quality work, would hire again.",
        "Professional attitude.",
        "Excellent craftsmanship.",
      ]),
      reliability: rand(3, 5),
      skill: rand(3, 5),
      safety: rand(3, 5),
      createdAt: dateAgo(rand(1, 90)),
    });
  }
  return reviews;
}

function genVerifications(users: User[]): Verification[] {
  const verifs: Verification[] = [];
  let id = 1;
  users.forEach((u) => {
    if (u.role === "admin") return;
    const types: Array<Verification["type"]> = [
      "phone",
      "email",
      "identity",
      "skill",
      "work-history",
      "address",
    ];
    types.forEach((t) => {
      const status = pick([
        "verified",
        "verified",
        "verified",
        "pending",
        "not-started",
      ]) as Verification["status"];
      verifs.push({
        id: `ver_${id++}`,
        userId: u.id,
        type: t,
        status,
        score: status === "verified" ? rand(70, 100) : 0,
        verifiedAt: status === "verified" ? dateAgo(rand(10, 200)) : undefined,
      });
    });
  });
  return verifs;
}

function genTrustEvents(users: User[]): TrustScoreEvent[] {
  const events: TrustScoreEvent[] = [];
  let id = 1;
  users
    .filter((u) => u.role === "worker")
    .forEach((u) => {
      for (let i = 0; i < 5; i++) {
        events.push({
          id: `evt_${id++}`,
          userId: u.id,
          category: pick([
            "Skills",
            "Reputation",
            "Reliability",
            "Work History",
            "Identity",
          ]),
          points: rand(1, 8),
          reason: pick([
            "Completed verified job",
            "Positive review received",
            "Skill assessment passed",
            "Phone verified",
            "Work history verified",
          ]),
          createdAt: dateAgo(rand(1, 90)),
        });
      }
    });
  return events;
}

function genNotifications(users: User[]): Notification[] {
  const notifs: Notification[] = [];
  let id = 1;
  users.forEach((u) => {
    for (let i = 0; i < 6; i++) {
      const type = pick([
        "job",
        "payment",
        "trust",
        "verification",
        "application",
        "ai",
        "system",
      ]) as Notification["type"];
      notifs.push({
        id: `not_${id++}`,
        userId: u.id,
        type,
        title: pick([
          "Payment received",
          "Application shortlisted",
          "Trust score increased",
          "New job match",
          "Verification complete",
          "AI suggestion ready",
        ]),
        message: pick([
          "₹1,200 received from Raj BuildWorks",
          "Your application was shortlisted",
          "Your trust score moved up by 5 points",
          "A new Mason job matches your profile",
          "Phone verification complete",
          "A new career opportunity is available",
        ]),
        read: Math.random() > 0.5,
        createdAt: dateAgo(rand(0, 7)),
      });
    }
  });
  return notifs;
}

function genSafetyReports(): SafetyReport[] {
  const reports: SafetyReport[] = [];
  for (let i = 0; i < 8; i++) {
    reports.push({
      id: `rep_${i + 1}`,
      reporterId: `usr_w_${rand(1, 25)}`,
      targetUserId: `usr_c_${rand(1, 10)}`,
      jobId: `job_${rand(1, 30)}`,
      category: pick([
        "unsafe-workplace",
        "payment-dispute",
        "harassment",
        "fraud",
      ]) as SafetyReport["category"],
      severity: pick(["low", "medium", "high", "critical"]) as SafetyReport["severity"],
      description: "Report filed by user, requires admin review.",
      status: pick(["open", "investigating", "resolved"]) as SafetyReport["status"],
      createdAt: dateAgo(rand(1, 30)),
    });
  }
  return reports;
}

function genFraudSignals(): FraudSignal[] {
  const signals: FraudSignal[] = [];
  for (let i = 0; i < 6; i++) {
    signals.push({
      id: `frd_${i + 1}`,
      userId: `usr_w_${rand(1, 25)}`,
      type: pick([
        "Multiple failed verifications",
        "Suspicious payment pattern",
        "Duplicate profile",
      ]),
      severity: pick(["medium", "high", "critical"]) as FraudSignal["severity"],
      description: "Automated system flagged this account for review.",
      createdAt: dateAgo(rand(1, 20)),
      resolved: Math.random() > 0.6,
    });
  }
  return signals;
}

function genAssessments(): Assessment[] {
  return [
    {
      id: "asm_1",
      workerId: "usr_w_1",
      skillName: "Masonry",
      score: 82,
      level: "Advanced",
      completedAt: dateAgo(20),
    },
  ];
}

function genWorkHistory(): WorkHistory[] {
  return [
    {
      id: "wh_1",
      workerId: "usr_w_1",
      contractorId: "usr_c_1",
      jobId: "job_1",
      role: "Mason",
      startDate: dateAgo(120),
      endDate: dateAgo(90),
      verified: true,
      rating: 5,
    },
    {
      id: "wh_2",
      workerId: "usr_w_1",
      contractorId: "usr_c_2",
      jobId: "job_2",
      role: "Mason",
      startDate: dateAgo(60),
      endDate: dateAgo(40),
      verified: true,
      rating: 4,
    },
  ];
}

export interface SeedData {
  users: User[];
  workerProfiles: WorkerProfile[];
  contractorProfiles: ContractorProfile[];
  skills: Skill[];
  jobs: Job[];
  applications: Application[];
  payments: Payment[];
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  reviews: Review[];
  verifications: Verification[];
  trustEvents: TrustScoreEvent[];
  notifications: Notification[];
  safetyReports: SafetyReport[];
  fraudSignals: FraudSignal[];
  assessments: Assessment[];
  workHistory: WorkHistory[];
}

export function buildSeedData(): SeedData {
  const users = genUsers();
  const workerProfiles = genWorkerProfiles(users);
  const contractorProfiles = genContractorProfiles(users);
  const skills = SKILL_LIBRARY;
  const contractors = users.filter((u) => u.role === "contractor");
  const workers = users.filter((u) => u.role === "worker");
  const jobs = genJobs(contractors);
  const applications = genApplications(workers, jobs);
  const payments = genPayments(workers, contractors, jobs);
  const expenses = genExpenses(workers);
  const savingsGoals = genSavingsGoals(workers);
  const reviews = genReviews();
  const verifications = genVerifications(users);
  const trustEvents = genTrustEvents(users);
  const notifications = genNotifications(users);
  const safetyReports = genSafetyReports();
  const fraudSignals = genFraudSignals();
  const assessments = genAssessments();
  const workHistory = genWorkHistory();

  return {
    users,
    workerProfiles,
    contractorProfiles,
    skills,
    jobs,
    applications,
    payments,
    expenses,
    savingsGoals,
    reviews,
    verifications,
    trustEvents,
    notifications,
    safetyReports,
    fraudSignals,
    assessments,
    workHistory,
  };
}
