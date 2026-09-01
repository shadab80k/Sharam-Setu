/**
 * Profession-aware skill assessment questions.
 * The assessment API (complete-assessment) records skillName + score; the
 * client only submits the score it actually earned — trust math stays on the
 * server. Add a profession here and it is instantly available in the UI.
 */

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
}

export const QUIZ_BANK: Record<string, QuizQuestion[]> = {
  Mason: [
    { q: "What is the standard ratio of cement to sand for brick masonry mortar?", options: ["1:1", "1:4 to 1:6", "1:10", "1:15"], correct: 1 },
    { q: "Why is water curing necessary for newly built brick/concrete structures?", options: ["To clean dust", "To gain full strength and prevent cracks", "To cool the mason", "It is not necessary"], correct: 1 },
    { q: "What tool is used to check that a wall is perfectly vertical?", options: ["Measuring tape", "Spirit level / plumb bob", "Trowel", "Wheelbarrow"], correct: 1 },
  ],
  Painter: [
    { q: "What should you do before painting a new plastered wall?", options: ["Paint directly", "Apply primer and let plaster cure", "Wash with acid daily", "Nothing"], correct: 1 },
    { q: "Which defect appears as powdery white deposits on painted walls?", options: ["Efflorescence", "Crazing", "Blistering", "Chalking"], correct: 0 },
    { q: "What is the correct way to apply enamel paint for a smooth finish?", options: ["One thick coat", "Multiple thin coats with sanding in between", "Spray only", "Any way"], correct: 1 },
  ],
  Plumber: [
    { q: "Which pipe material is most common for underground water supply lines today?", options: ["Clay", "UPVC/CPVC", "Wooden", "Copper only"], correct: 1 },
    { q: "What does a P-trap under a sink prevent?", options: ["Water hammer", "Sewer gas entering the room", "High pressure", "Leakage at joints"], correct: 1 },
    { q: "Before fixing a leaking tap you should first…", options: ["Open it fully", "Shut off the water supply", "Heat the tap", "Call the owner"], correct: 1 },
  ],
  Electrician: [
    { q: "What is the standard domestic supply voltage in India for lighting circuits?", options: ["110V AC", "230V AC", "440V AC", "24V DC"], correct: 1 },
    { q: "Which wire colour is used for earthing as per Indian standards?", options: ["Red", "Black", "Green", "Blue"], correct: 2 },
    { q: "A miniature circuit breaker (MCB) protects a circuit mainly from…", options: ["High voltage", "Overload and short circuit", "Low frequency", "Dust"], correct: 1 },
  ],
  Carpenter: [
    { q: "Which joint is strongest for wooden frames?", options: ["Butt joint", "Mortise and tenon", "Nailed joint", "Taped joint"], correct: 1 },
    { q: "Moisture content of wood for interior work should ideally be…", options: ["0%", "8–12%", "25%", "50%+"], correct: 1 },
    { q: "Which tool is used to make smooth, flat wooden surfaces?", options: ["Hand saw", "Chisel and plane", "Hammer", "Pliers"], correct: 1 },
  ],
  "Tile Fitter": [
    { q: "What is the ideal tiling adhesive application method?", options: ["Spot application at corners", "Full bed with notched trowel", "Only water", "Cement on one tile"], correct: 1 },
    { q: "Why are tile spacers used during laying?", options: ["For colour", "To maintain uniform gaps for grouting", "To break tiles", "For weight"], correct: 1 },
    { q: "Where should tiling start in a room for best alignment?", options: ["From the door randomly", "From the centre point / level line", "From a corner", "Anywhere"], correct: 1 },
  ],
  Helper: [
    { q: "What is the safest way to carry heavy cement bags up a ramp?", options: ["Run fast", "Steady pace with correct posture, in pairs if needed", "Drag on the ground", "Stack on head"], correct: 1 },
    { q: "Why must you wear a helmet and safety shoes on a construction site?", options: ["Company dress code", "Protection from falling objects and injuries", "For photos", "Not required"], correct: 1 },
    { q: "What should you do with loose electric wires lying near water on site?", options: ["Ignore them", "Report immediately and keep distance", "Touch to check", "Cover with cloth"], correct: 1 },
  ],
  "Site Supervisor": [
    { q: "Before work starts each day, a supervisor should first…", options: ["Send workers home", "Conduct a safety brief and task allocation", "Start random work", "Collect money"], correct: 1 },
    { q: "What document tracks daily manpower, materials and progress on site?", options: ["Site diary / daily log", "Passport", "Payslip", "Bank statement"], correct: 0 },
    { q: "A worker is found working at height without a harness. You should…", options: ["Ignore", "Stop the work immediately and provide PPE", "Take a photo", "Wait for an accident"], correct: 1 },
  ],
};

/** Questions for a profession; falls back to Helper-level safety basics when unknown. */
export function quizFor(profession: string): QuizQuestion[] {
  const key = profession.trim();
  if (QUIZ_BANK[key]) return QUIZ_BANK[key];
  const byName = Object.entries(QUIZ_BANK).find(([name]) => name.toLowerCase() === key.toLowerCase());
  return byName ? byName[1] : QUIZ_BANK.Helper;
}
