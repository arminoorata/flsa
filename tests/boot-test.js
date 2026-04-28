/* Full boot test via jsdom. Builds a minimal DOM matching index.html,
   injects every script in load order, runs the intake → questions →
   results flow for scenario 3, and asserts memo rendering. */

const path = require("path");
const fs = require("fs");

function resolveJsdom() {
  const candidates = ["jsdom", "/tmp/benefitmath-browser-qa/node_modules/jsdom", "/srv/node_modules/jsdom"];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* continue */ }
  }
  throw new Error("jsdom not found");
}

const { JSDOM } = resolveJsdom();

const appDir = path.join(__dirname, "..", "app");
const fullHtml = fs.readFileSync(path.join(appDir, "index.html"), "utf8");
/* Strip the auto-loading <script src> and <link rel> tags; we'll inject scripts manually
   because jsdom would 404 on relative resource URLs. We keep the body DOM. */
const body = fullHtml.split("<body>")[1].split("</body>")[0];
const scaffold = `<!DOCTYPE html><html lang="en" data-theme="dark"><head></head><body>${body}</body></html>`;

const dom = new JSDOM(scaffold, {
  url: "http://localhost/",
  runScripts: "dangerously"
});
const { window } = dom;
const { document } = window;

/* Capture silent errors. */
const errors = [];
window.addEventListener("error", (e) => errors.push(`${e.filename || "inline"}: ${e.message}`));

/* Capture alert() calls (jsdom doesn't implement) so we can assert
   intake validation. */
const alerts = [];
window.alert = (msg) => alerts.push(String(msg));

function inject(relPath) {
  const code = fs.readFileSync(path.join(appDir, relPath), "utf8");
  const tag = document.createElement("script");
  tag.textContent = code;
  document.body.appendChild(tag);
}

inject("data/constants.js");
inject("data/thresholds.js");
inject("data/states.js");
inject("data/regulatory.js");
inject("data/questions.js");
inject("js/evaluator.js");
inject("js/memo.js");
inject("js/engine.js");
inject("js/ui.js");

/* Expose module globals so this test can probe them. */
const expose = document.createElement("script");
expose.textContent = "window.UI = UI; window.Engine = Engine; window.Memo = Memo; window.TOOL_VERSION_DATE = TOOL_VERSION_DATE; window.PAY_BASIS_OPTIONS = PAY_BASIS_OPTIONS;";
document.body.appendChild(expose);

if (!window.UI) {
  console.error("UI global not exposed after injection. Errors captured:", errors);
  process.exit(1);
}

/* Boot. */
window.UI.init();

let failures = [];
function assert(cond, msg) { if (!cond) failures.push(msg); }

assert(document.getElementById("version-label").textContent.includes("Data last updated:"), "version label missing or wrong text");
assert(document.getElementById("version-label").textContent.includes(window.TOOL_VERSION_DATE), "version label missing TOOL_VERSION_DATE");
assert(document.querySelector(".app-footer"), "footer missing");
assert(document.querySelector(".footer-disclaimer"), "footer disclaimer missing");
assert(document.querySelector(".footer-bar"), "footer bar (attribution + domain) missing");
assert(document.getElementById("nav-menu-toggle"), "nav menu button missing");
assert(document.getElementById("start-btn"), "start button missing on intake");
assert(document.querySelector(".privacy-banner"), "privacy banner missing on intake");
assert(document.getElementById("payBasis"), "payBasis field missing on intake");
assert(document.getElementById("reviewerName"), "reviewerName field missing on intake");
assert(document.getElementById("effectiveDate"), "effectiveDate field missing on intake");
assert(document.getElementById("currentClass"), "currentClass field missing on intake");

/* Validation: missing payBasis should alert and not advance. */
document.getElementById("classType").value = "new_hire";
document.getElementById("jobTitle").value = "Test";
document.getElementById("workState").value = "Texas";
document.getElementById("baseSalary").value = "100000";
document.getElementById("payBasis").value = "";
const alertCountBefore = alerts.length;
document.getElementById("start-btn").click();
assert(alerts.length > alertCountBefore, "missing payBasis should trigger validation alert");
assert(window.Engine.getStage() === "info", "missing payBasis should not advance the stage");

/* Fill intake for scenario 3 (CT Senior Director). */
document.getElementById("classType").value = "new_hire";
document.getElementById("jobTitle").value = "Director of Marketing";
document.getElementById("workState").value = "Connecticut";
document.getElementById("baseSalary").value = "220000";
document.getElementById("totalComp").value = "300000";
document.getElementById("payBasis").value = "salary";
document.getElementById("reviewerName").value = "Test Reviewer";
document.getElementById("effectiveDate").value = "2026-05-01";
document.getElementById("start-btn").click();

assert(window.Engine.getStage() === "questions", `expected stage=questions, got ${window.Engine.getStage()}`);

const s3Answers = {
  hce_start: "yes",
  hce_ct_block: "acknowledged",
  admin_salary: "yes",
  admin_biz_ops: "yes",
  admin_discretion: "yes",
  exec_salary: "yes",
  exec_manage: "yes",
  exec_reports: "yes",
  exec_hire_fire: "yes",
  prof_salary: "yes",
  prof_advanced: "no",
  comp_role: "no",
  sales_check: "no"
};

let steps = 0;
while (window.Engine.getStage() === "questions" && steps < 50) {
  const q = window.Engine.currentQuestion();
  if (!q) break;
  const val = s3Answers[q.id];
  if (val !== undefined) window.Engine.selectOption(q.id, val);
  window.Engine.nextQuestion();
  steps++;
}

assert(window.Engine.getStage() === "results", `expected results, got ${window.Engine.getStage()}`);

const { overall, riskFlags, confidence, memoId } = window.Engine.getResults();
assert(overall.outcome === "exempt", `expected exempt, got ${overall.outcome}`);
assert(overall.passing.indexOf("Administrative") !== -1, "Administrative should pass");
assert(overall.passing.indexOf("Executive") !== -1, "Executive should pass");

assert(confidence && confidence.level, "confidence should be computed");
assert(["high", "medium", "low"].indexOf(confidence.level) !== -1, `confidence level should be valid, got ${confidence && confidence.level}`);
assert(memoId && /^FLSA-\d{8}-[A-Z0-9]{6}$/.test(memoId), `memo ID should match FLSA-YYYYMMDD-XXXXXX, got ${memoId}`);

/* Risk flags should now be objects with severity. */
assert(Array.isArray(riskFlags), "riskFlags should be an array");
for (const f of riskFlags) {
  assert(typeof f === "object" && f.severity && f.title, `risk flag should be {severity,title,body}, got ${JSON.stringify(f)}`);
  assert(["critical", "high", "medium", "low"].indexOf(f.severity) !== -1, `severity should be valid, got ${f.severity}`);
}

window.UI.renderApp();
const memo = document.querySelector(".memo");
assert(memo !== null, "memo element not rendered");
assert(memo && memo.textContent.includes("Administrative"), "memo missing Administrative exemption");
assert(memo && memo.textContent.includes("EMPLOYEE / ROLE INFORMATION"), "memo missing Employee section heading");
assert(memo && memo.textContent.includes("EXEMPTION ANALYSIS"), "memo missing Exemption Analysis heading");
assert(memo && !memo.textContent.includes("Fireblocks"), "memo contains 'Fireblocks'!");
assert(memo && memo.textContent.includes("People Operations"), "memo missing 'People Operations' subtitle");
assert(memo && memo.textContent.includes("Pay Basis"), "memo missing Pay Basis row");
assert(memo && memo.textContent.includes("Reviewed by"), "memo missing Reviewed by row");
assert(memo && memo.textContent.includes("Effective Date"), "memo missing Effective Date row");
assert(memo && memo.textContent.includes("Memo ID"), "memo missing Memo ID");
assert(memo && memo.textContent.includes("Confidence"), "memo missing Confidence indicator");
assert(memo && memo.textContent.includes("QUESTIONNAIRE RESPONSES"), "memo missing Questionnaire Responses section");
assert(memo && (memo.textContent.includes("User selected") || memo.textContent.includes("Auto-detected")), "memo questionnaire responses must label answer source (user/auto)");
assert(memo && memo.textContent.includes("Your data stays in your browser"), "memo missing privacy assertion");
assert(document.querySelector(".confidence-row"), "confidence row should be rendered");

window.UI.renderRegulatory();
const regPanel = document.querySelector(".reg-panel");
assert(regPanel !== null, "reg panel not rendered");
assert(regPanel && regPanel.textContent.includes("Federal Regulatory Landscape"), "reg tab missing heading");

document.getElementById("theme-toggle").click();
assert(document.documentElement.getAttribute("data-theme") === "light", "theme toggle did not switch to light");
document.getElementById("theme-toggle").click();
assert(document.documentElement.getAttribute("data-theme") === "dark", "theme toggle did not switch back to dark");

/* Regression: back-to-Info → startQuestionnaire should NOT wipe prior answers. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Test", workState: "Texas", baseSalary: 150000, totalComp: 160000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "yes");
window.Engine.selectOption("hce_office", "yes");
window.Engine.selectOption("hce_one_duty", "manages");
window.Engine.prevQuestion(); /* back off hce_one_duty */
window.Engine.prevQuestion(); /* back off hce_office */
window.Engine.prevQuestion(); /* back off hce_start → should return to Info */
assert(window.Engine.getStage() === "info", `after back-to-info expected stage=info, got ${window.Engine.getStage()}`);
window.Engine.startQuestionnaire();
assert(window.Engine.getAllAnswers().hce_office === "yes", "answers wiped after back-to-info → forward (regression)");
assert(window.Engine.getAllAnswers().hce_one_duty === "manages", "answers wiped after back-to-info → forward (regression)");

/* Regression: CT + hce_start=no should skip hce_ct_block. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "HR Coord", workState: "Connecticut", baseSalary: 55000, totalComp: 55000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
/* Override the auto-answer: user confirms "no" explicitly. */
window.Engine.selectOption("hce_start", "no");
window.Engine.nextQuestion();
const nextQ = window.Engine.currentQuestion();
assert(nextQ && nextQ.id === "comp_role", `CT + hce_start=no should skip hce_ct_block and go to comp_role; got ${nextQ && nextQ.id}`);

/* New: salary auto-pre-select for high-comp employee. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Manager", workState: "Texas", baseSalary: 200000, totalComp: 220000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
const allAnswers = window.Engine.getAllAnswers();
assert(allAnswers.admin_salary === "yes", `admin_salary should auto-pre-select 'yes' for high-salary salaried employee, got ${allAnswers.admin_salary}`);
assert(allAnswers.exec_salary === "yes", `exec_salary should auto-pre-select 'yes' for high-salary salaried employee, got ${allAnswers.exec_salary}`);
assert(allAnswers.prof_salary === "yes", `prof_salary should auto-pre-select 'yes' for high-salary salaried employee, got ${allAnswers.prof_salary}`);

/* New: isAutoAnswered must read autoApplied directly, not equality. A
   user who deliberately re-selects the same value as the auto-answer
   should NOT be marked auto. Regression for codex finding. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Manager", workState: "Texas", baseSalary: 200000, totalComp: 200000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
assert(window.Engine.isAutoAnswered("admin_salary") === true, "admin_salary should be marked auto-answered after auto-apply");
window.Engine.selectOption("admin_salary", "yes"); /* user picks same value */
assert(window.Engine.isAutoAnswered("admin_salary") === false, "after deliberate user selectOption, isAutoAnswered should be false even if value matches autoAnswer");

/* New: getAutoApplied returns the set of auto-applied question IDs. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Manager", workState: "Texas", baseSalary: 200000, totalComp: 200000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
const autoSet = window.Engine.getAutoApplied();
assert(autoSet.admin_salary === true, "getAutoApplied should include admin_salary");
assert(autoSet.exec_salary === true, "getAutoApplied should include exec_salary");
assert(autoSet.prof_salary === true, "getAutoApplied should include prof_salary");

/* New: stale auto-answer must be CLEARED when intake change makes it
   inapplicable. Regression: previously a salary drop from $200K to $30K
   would leave admin_salary="yes" auto-applied, producing a false exempt
   result. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Manager", workState: "Texas", baseSalary: 200000, totalComp: 200000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
const beforeDrop = window.Engine.getAllAnswers();
assert(beforeDrop.admin_salary === "yes", `admin_salary should auto-apply at $200K, got ${beforeDrop.admin_salary}`);
window.Engine.setEmpData({ baseSalary: 30000, totalComp: 30000 });
window.Engine.startQuestionnaire();
const afterDrop = window.Engine.getAllAnswers();
assert(afterDrop.admin_salary === undefined, `admin_salary should be CLEARED after salary drop to $30K, got ${afterDrop.admin_salary}`);
assert(afterDrop.exec_salary === undefined, `exec_salary should be CLEARED after salary drop, got ${afterDrop.exec_salary}`);
assert(afterDrop.prof_salary === undefined, `prof_salary should be CLEARED after salary drop, got ${afterDrop.prof_salary}`);

/* New: stale auto-answer must be CLEARED when payBasis changes to one
   that disqualifies salary auto-pre-select (e.g., salary→day_rate). */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Manager", workState: "Texas", baseSalary: 200000, totalComp: 200000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
assert(window.Engine.getAllAnswers().admin_salary === "yes", "admin_salary should auto-apply for $200K salary");
window.Engine.setEmpData({ payBasis: "day_rate" });
window.Engine.startQuestionnaire();
assert(window.Engine.getAllAnswers().admin_salary === undefined, "admin_salary auto-answer should be cleared when payBasis becomes day_rate");

/* New: hourly pay with insufficient hourlyRate must NOT auto-pre-select
   comp_salary as "yes" via baseSalary back-channel. Regression for codex
   review #2 BLOCKER. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Programmer", workState: "Texas", baseSalary: 50000, totalComp: 50000, hourlyRate: 20.00, payBasis: "hourly" });
window.Engine.startQuestionnaire();
const lowHourly = window.Engine.getAllAnswers();
assert(lowHourly.comp_salary !== "yes", `comp_salary must NOT auto-yes for $20/hr (below $27.63 federal); got ${lowHourly.comp_salary}`);

/* New: hourly pay with sufficient hourlyRate SHOULD auto-pre-select
   comp_salary as "yes". */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Programmer", workState: "Texas", baseSalary: 80000, totalComp: 80000, hourlyRate: 40.00, payBasis: "hourly" });
window.Engine.startQuestionnaire();
const goodHourly = window.Engine.getAllAnswers();
assert(goodHourly.comp_salary === "yes", `comp_salary should auto-yes for $40/hr (above federal); got ${goodHourly.comp_salary}`);

/* New: day-rate pay should NOT auto-pre-select admin/exec/prof salary. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Field Tech", workState: "Texas", baseSalary: 250000, totalComp: 260000, hourlyRate: null, payBasis: "day_rate" });
window.Engine.startQuestionnaire();
const drAnswers = window.Engine.getAllAnswers();
assert(drAnswers.admin_salary === undefined, `admin_salary should NOT auto-apply for day-rate, got ${drAnswers.admin_salary}`);
assert(drAnswers.exec_salary === undefined, `exec_salary should NOT auto-apply for day-rate, got ${drAnswers.exec_salary}`);
assert(drAnswers.prof_salary === undefined, `prof_salary should NOT auto-apply for day-rate, got ${drAnswers.prof_salary}`);

/* New: day-rate + passing exemption should produce CRITICAL Helix flag. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Director", workState: "Texas", baseSalary: 250000, totalComp: 260000, hourlyRate: null, payBasis: "day_rate" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "yes");
window.Engine.selectOption("hce_office", "yes");
window.Engine.selectOption("hce_one_duty", "manages");
window.Engine.selectOption("comp_role", "no");
window.Engine.selectOption("admin_salary", "yes");
window.Engine.selectOption("admin_biz_ops", "yes");
window.Engine.selectOption("admin_discretion", "yes");
window.Engine.selectOption("exec_salary", "yes");
window.Engine.selectOption("exec_manage", "no");
window.Engine.selectOption("prof_salary", "yes");
window.Engine.selectOption("prof_advanced", "no");
window.Engine.selectOption("sales_check", "no");
/* Drive to results. */
let helixSteps = 0;
while (window.Engine.getStage() === "questions" && helixSteps < 50) {
  window.Engine.nextQuestion();
  helixSteps++;
}
const helixRes = window.Engine.getResults();
const helixFlag = helixRes.riskFlags.find(f => f.title.indexOf("Helix") !== -1);
assert(helixFlag, "day-rate + passing exemption should generate Helix flag");
assert(helixFlag && helixFlag.severity === "critical", `Helix flag should be critical, got ${helixFlag && helixFlag.severity}`);

/* New: non-overlay-state risk flag for a state with no encoded overlay. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Engineer", workState: "Florida", baseSalary: 90000, totalComp: 95000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "no");
window.Engine.selectOption("comp_role", "no");
window.Engine.selectOption("admin_salary", "yes");
window.Engine.selectOption("admin_biz_ops", "production");
window.Engine.selectOption("exec_salary", "yes");
window.Engine.selectOption("exec_manage", "no");
window.Engine.selectOption("prof_salary", "yes");
window.Engine.selectOption("prof_advanced", "no");
window.Engine.selectOption("sales_check", "no");
let nostateSteps = 0;
while (window.Engine.getStage() === "questions" && nostateSteps < 50) {
  window.Engine.nextQuestion();
  nostateSteps++;
}
const nostateRes = window.Engine.getResults();
const nostateFlag = nostateRes.riskFlags.find(f => f.title.indexOf("no state-specific overlay encoded") !== -1);
assert(nostateFlag, "non-overlay state should generate non-overlay flag");

/* New: reclass exempt → non-exempt should generate critical reclass flag and helper. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "reclass", currentClass: "exempt", jobTitle: "Coord", workState: "Texas", baseSalary: 50000, totalComp: 50000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "no");
window.Engine.selectOption("comp_role", "no");
window.Engine.selectOption("admin_salary", "yes");
window.Engine.selectOption("admin_biz_ops", "production");
window.Engine.selectOption("exec_salary", "yes");
window.Engine.selectOption("exec_manage", "no");
window.Engine.selectOption("prof_salary", "yes");
window.Engine.selectOption("prof_advanced", "no");
window.Engine.selectOption("sales_check", "no");
let reclassSteps = 0;
while (window.Engine.getStage() === "questions" && reclassSteps < 50) {
  window.Engine.nextQuestion();
  reclassSteps++;
}
const reclassRes = window.Engine.getResults();
assert(reclassRes.overall.outcome === "non-exempt", `reclass scenario should be non-exempt, got ${reclassRes.overall.outcome}`);
const reclassFlag = reclassRes.riskFlags.find(f => f.title.indexOf("Exempt → Non-Exempt") !== -1);
assert(reclassFlag, "reclass exempt → non-exempt should generate dedicated flag");
assert(reclassFlag && reclassFlag.severity === "critical", `reclass flag should be critical, got ${reclassFlag && reclassFlag.severity}`);

const reclassEmp = window.Engine.getEmpData();
const reclassMemoHtml = window.Memo.renderHTML(reclassEmp, reclassRes.results, reclassRes.overall, reclassRes.riskFlags, { confidence: reclassRes.confidence, memoId: reclassRes.memoId, answers: window.Engine.getAllAnswers() });
assert(reclassMemoHtml.indexOf("RECLASSIFICATION CONSIDERATIONS") !== -1, "memo should include reclass helper section");
assert(reclassMemoHtml.indexOf("back-pay") !== -1, "reclass helper should mention back-pay analysis");

if (errors.length > 0) {
  console.error("Runtime errors captured:");
  for (const e of errors) console.error("   " + e);
}

if (failures.length === 0 && errors.length === 0) {
  console.log("[OK] Full boot test passed. All assertions green.");
  process.exit(0);
}
console.error(`[FAIL] ${failures.length} assertion(s) + ${errors.length} runtime error(s):`);
for (const f of failures) console.error("   ✗ " + f);
process.exit(1);
