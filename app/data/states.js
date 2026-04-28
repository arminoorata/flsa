/* All 50 states + DC, with NY split into two regions. Alphabetical. */

const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico",
  "New York (NYC/Nassau/Suffolk/Westchester)", "New York (rest of state)",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"
];

/* Maps state labels to THRESHOLDS keys. States not in this map use federal. */
const STATE_TO_THRESHOLD = {
  "California": "california",
  "Colorado": "colorado",
  "Connecticut": "connecticut",
  "Illinois": "illinois",
  "Maine": "maine",
  "Massachusetts": "massachusetts",
  "Minnesota": "minnesota",
  "New Jersey": "new_jersey",
  "New York (NYC/Nassau/Suffolk/Westchester)": "new_york_nyc",
  "New York (rest of state)": "new_york_other",
  "Pennsylvania": "pennsylvania",
  "Washington": "washington",
  "Oregon": "oregon"
};

function getStateKey(stateLabel) {
  return STATE_TO_THRESHOLD[stateLabel] || "federal";
}

function getThreshold(stateLabel) {
  return THRESHOLDS[getStateKey(stateLabel)];
}

/* For multi-state employees: given an array of state labels, return the
   state whose rules are most protective overall (i.e., produce the
   strictest analysis).

   Ranking is a composite restrictiveness score, not raw EAP threshold:
     base   = state EAP annual threshold
     +200000 if state rejects the federal HCE shortcut (CA/CO/WA/CT)
     +100000 if state has the strict admin duties test (NY/OR — admin
              cannot pass via customer-facing duties)
     +50000  if state has computer-employee-specific salary above
              federal (CA/CO)

   The bonuses are large enough to dominate close EAP ties and reflect
   the real protective weight of those state-specific rules. Without
   this, e.g., Oregon ($35,568 + strict admin) would lose to Illinois
   ($35,568, no extras) on alphabetical tiebreak — producing a less-
   protective result than analyzing under the user's actual primary.

   Returns the original state label, or the empty string for empty input. */
/* Restrictiveness score for general routing (EAP/admin/exec/prof/HCE).
   The HCE-rejection bonus applies to CA, CT, WA — Colorado is no longer
   on the list because CO recognizes HCE with a higher threshold ($130,014
   under COMPS Order #40). */
function _restrictivenessScore(stateLabel, payBasis) {
  const t = getThreshold(stateLabel);
  if (!t) return 0;
  let score = t.eapAnnual || 0;
  if (t.hceApplicable === false) score += 200000;
  const STRICT_ADMIN = ["new_york_nyc", "new_york_other", "oregon"];
  if (STRICT_ADMIN.indexOf(getStateKey(stateLabel)) !== -1) score += 100000;
  /* Computer-specific bonuses are deliberately EXCLUDED from this score
     so that non-computer salary roles aren't routed by the computer
     threshold. Computer routing uses _restrictivenessScoreForComputer
     below, called separately in evaluator.js. */
  if (payBasis === "hourly" && t.computerHourly && t.computerHourly > 27.63) {
    score += Math.round(t.computerHourly * 100);
  }
  return score;
}

/* Computer-exemption-specific score. Picks the state whose computer
   threshold (salary OR hourly, whichever is binding for the user's pay
   basis) is the most protective. Used to override threshold lookup in
   evaluateComputer for multi-state employees, so a $100K CA+WA computer
   employee on salary correctly routes to CA ($122K computerSalaryAnnual
   would block) instead of WA ($80K computerSalaryAnnual would pass). */
function _restrictivenessScoreForComputer(stateLabel, payBasis) {
  const t = getThreshold(stateLabel);
  if (!t) return 0;
  let score = 0;
  if (payBasis === "hourly") {
    score = (t.computerHourly && t.computerHourly > 27.63) ? Math.round(t.computerHourly * 100) : 2763;
  } else {
    /* Salary path: stricter state has higher computerSalaryAnnual.
       States with no salary-basis computer rule (e.g., NY-NYC currently)
       get a special HIGH score to indicate "no salary-basis path
       available" — but we don't currently model that, so fall back to
       the salary level itself. */
    score = (t.computerSalaryAnnual && t.computerSalaryAnnual > 35568) ? t.computerSalaryAnnual : (t.eapAnnual || 35568);
  }
  /* HCE-reject still matters because computer interacts with HCE. */
  if (t.hceApplicable === false) score += 50000;
  return score;
}

function getMostProtectiveState(stateLabels, payBasis) {
  if (!stateLabels || !stateLabels.length) return "";
  let best = stateLabels[0];
  let bestScore = _restrictivenessScore(best, payBasis);
  for (let i = 1; i < stateLabels.length; i++) {
    const score = _restrictivenessScore(stateLabels[i], payBasis);
    if (score > bestScore || (score === bestScore && stateLabels[i] < best)) {
      best = stateLabels[i];
      bestScore = score;
    }
  }
  return best;
}

function getMostProtectiveStateForComputer(stateLabels, payBasis) {
  if (!stateLabels || !stateLabels.length) return "";
  let best = stateLabels[0];
  let bestScore = _restrictivenessScoreForComputer(best, payBasis);
  for (let i = 1; i < stateLabels.length; i++) {
    const score = _restrictivenessScoreForComputer(stateLabels[i], payBasis);
    if (score > bestScore || (score === bestScore && stateLabels[i] < best)) {
      best = stateLabels[i];
      bestScore = score;
    }
  }
  return best;
}
