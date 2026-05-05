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
expose.textContent = "window.UI = UI; window.Engine = Engine; window.Memo = Memo; window.TOOL_VERSION_DATE = TOOL_VERSION_DATE; window.PAY_BASIS_OPTIONS = PAY_BASIS_OPTIONS; window.generateOvertimeRules = generateOvertimeRules;";
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
assert(document.getElementById("additionalStates"), "additionalStates field missing on intake");
assert(document.getElementById("additionalStates-clear"), "additionalStates Clear-all button missing on intake");

/* Regression for Lisa's UX feedback: clicking the Clear-all button must
   actually deselect every option in additionalStates (native <select
   multiple> requires Cmd-click, which trips up users). */
{
  const sel = document.getElementById("additionalStates");
  /* Pre-select two options to simulate accidental picks. */
  for (const opt of sel.options) {
    if (opt.value === "California" || opt.value === "Washington") opt.selected = true;
  }
  const beforeCount = Array.from(sel.selectedOptions).length;
  assert(beforeCount === 2, `pre-condition: 2 options should be selected, got ${beforeCount}`);
  document.getElementById("additionalStates-clear").click();
  const afterCount = Array.from(sel.selectedOptions).length;
  assert(afterCount === 0, `Clear-all button should deselect all options, got ${afterCount} still selected`);
}

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
  hce_state_block: "acknowledged",
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

/* Regression: CT + hce_start=no should skip hce_state_block (was
   hce_ct_block before generalization). */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "HR Coord", workState: "Connecticut", baseSalary: 55000, totalComp: 55000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
/* Override the auto-answer: user confirms "no" explicitly. */
window.Engine.selectOption("hce_start", "no");
window.Engine.nextQuestion();
const nextQ = window.Engine.currentQuestion();
assert(nextQ && nextQ.id === "comp_role", `CT + hce_start=no should skip hce_state_block and go to comp_role; got ${nextQ && nextQ.id}`);

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
const nostateFlag = nostateRes.riskFlags.find(f => f.title.indexOf("Not validated for") !== -1);
assert(nostateFlag, "non-overlay state should generate non-overlay flag");
assert(nostateFlag && nostateFlag.severity === "medium", `non-overlay flag severity should be medium, got ${nostateFlag && nostateFlag.severity}`);

/* New: multi-state Texas (no overlay) + New Jersey (overlay) — analysis
   routes to NJ but Texas must STILL trigger a non-overlay warning,
   because Texas is in scope. Regression for codex r4 HIGH finding. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Compliance", workState: "Texas", additionalStates: ["New Jersey"], baseSalary: 90000, totalComp: 95000, hourlyRate: null, payBasis: "salary" });
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
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const txnjRes = window.Engine.getResults();
const txFlag = txnjRes.riskFlags.find(f => f.title === "Not validated for Texas");
assert(txFlag, "multi-state TX+NJ must still emit 'Not validated for Texas' flag (TX is in scope)");

/* New: Colorado HCE uses CO state threshold $130,014, not federal
   $107,432. $115K must NOT pass HCE; $250K must pass. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Director", workState: "Colorado", baseSalary: 100000, totalComp: 115000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
const co115 = window.Engine.getAllAnswers();
assert(co115.hce_start === "no", `CO at $115K total comp must auto-no on HCE ($130,014 state threshold), got ${co115.hce_start}`);

window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Director", workState: "Colorado", baseSalary: 200000, totalComp: 250000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
const co250 = window.Engine.getAllAnswers();
assert(co250.hce_start === "yes", `CO at $250K total comp must auto-yes on HCE ($130,014 state threshold), got ${co250.hce_start}`);

/* New: HCE must SKIP in CA/CO/WA (not just CT). Regression for codex r4.
   NOTE: CO is now hceApplicable, so this only checks CA + WA. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Director", workState: "California", baseSalary: 250000, totalComp: 300000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "yes");
window.Engine.selectOption("comp_role", "no");
window.Engine.selectOption("admin_salary", "yes");
window.Engine.selectOption("admin_biz_ops", "production");
window.Engine.selectOption("exec_salary", "yes");
window.Engine.selectOption("exec_manage", "no");
window.Engine.selectOption("prof_salary", "yes");
window.Engine.selectOption("prof_advanced", "no");
window.Engine.selectOption("sales_check", "no");
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const caRes = window.Engine.getResults();
assert(caRes.results.hce.status === "skip", `CA HCE should be skip (state rejects), got ${caRes.results.hce.status}`);

/* New: critical flag must BLOCK an otherwise-exempt recommendation. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Field Director", workState: "Texas", baseSalary: 250000, totalComp: 260000, hourlyRate: null, payBasis: "day_rate" });
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
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const blockRes = window.Engine.getResults();
assert(blockRes.overall.outcome === "review", `day-rate + passing HCE/Admin must block to review, got ${blockRes.overall.outcome}`);
assert(blockRes.overall.blockedByCritical === true, `blockedByCritical flag must be true when critical blocks an exempt outcome`);
assert(blockRes.overall.text.indexOf("CRITICAL") !== -1, `recommendation must mention CRITICAL when blocked`);

/* New: NY learned professional uses federal-only $35,568 threshold (no
   state professional minimum). $50K passes; $30K fails. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Pharmacist", workState: "New York (rest of state)", baseSalary: 50000, totalComp: 50000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
const nyAns50 = window.Engine.getAllAnswers();
assert(nyAns50.prof_salary === "yes", `NY prof at $50K should auto-yes (above federal $35,568); got ${nyAns50.prof_salary}`);

window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Pharmacist", workState: "New York (rest of state)", baseSalary: 30000, totalComp: 30000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
const nyAns30 = window.Engine.getAllAnswers();
assert(nyAns30.prof_salary === undefined, `NY prof at $30K should NOT auto-yes (below federal); got ${nyAns30.prof_salary}`);

/* New: multi-state employee — analysisState rerouted to most-protective. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Remote PM", workState: "Texas", additionalStates: ["California", "Washington"], baseSalary: 90000, totalComp: 95000, hourlyRate: null, payBasis: "salary" });
const msEmp = window.Engine.getEmpData();
assert(msEmp.workState === "Texas", `workState must NOT mutate — should preserve user's primary pick "Texas", got ${msEmp.workState}`);
assert(msEmp.primaryWorkState === "Texas", `primaryWorkState should equal user's primary, got ${msEmp.primaryWorkState}`);
/* For SALARY pay basis, Washington wins: WA's EAP $80,168 + 200K HCE-reject
   = $280,168, vs CA's $70,304 + 200K = $270,304. (We don't apply a
   computer-salary bonus on the salary path because it would falsely
   route non-computer salary roles to CA over WA — see codex r6 HIGH.) */
assert(msEmp.analysisState === "Washington", `salary multi-state must route to WA (higher EAP $80,168), got ${msEmp.analysisState}`);

/* Re-calling setEmpData (e.g., user edits salary after picking states)
   must not corrupt primaryWorkState or analysisState. Regression for
   codex r4 finding. */
window.Engine.setEmpData({ baseSalary: 100000 });
const msEmp2 = window.Engine.getEmpData();
assert(msEmp2.workState === "Texas", `re-setEmpData must keep workState as user's primary, got ${msEmp2.workState}`);
assert(msEmp2.primaryWorkState === "Texas", `re-setEmpData must keep primaryWorkState as user's primary, got ${msEmp2.primaryWorkState}`);
assert(msEmp2.analysisState === "Washington", `re-setEmpData must keep analysisState rerouted, got ${msEmp2.analysisState}`);

/* Pay-basis-aware multi-state routing: TX + CA + WA on HOURLY pay must
   route to Washington (stricter $59.96/hr threshold), not California
   ($58.85/hr). Regression for codex r5 HIGH finding. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Hourly Programmer", workState: "Texas", additionalStates: ["California", "Washington"], baseSalary: 0, totalComp: 0, hourlyRate: 60, payBasis: "hourly" });
const hourlyMS = window.Engine.getEmpData();
assert(hourlyMS.analysisState === "Washington", `hourly multi-state TX+CA+WA must route to WA (stricter $59.96/hr); got ${hourlyMS.analysisState}`);

/* Pay-basis-aware multi-state routing: same states on SALARY pay must
   route to Washington (highest EAP $80,168 + HCE-reject), since the
   computer-salary bonus is suppressed on the salary path to prevent
   false routing of non-computer roles to CA. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Salary PM", workState: "Texas", additionalStates: ["California", "Washington"], baseSalary: 90000, totalComp: 95000, hourlyRate: null, payBasis: "salary" });
const salaryMS = window.Engine.getEmpData();
assert(salaryMS.analysisState === "Washington", `salary multi-state TX+CA+WA must route to WA; got ${salaryMS.analysisState}`);

/* Regression for codex r6 HIGH: salary-paid non-computer admin in
   TX+CA+WA at $75K must NOT recommend exempt. WA's $80,168 EAP fails;
   CA's $70,304 passes. Routing must pick WA so admin fails. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "HR Manager", workState: "Texas", additionalStates: ["California", "Washington"], baseSalary: 75000, totalComp: 75000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "no");
window.Engine.selectOption("comp_role", "no");
window.Engine.selectOption("admin_salary", "no");  /* $75K < WA $80,168 */
window.Engine.selectOption("exec_salary", "no");
window.Engine.selectOption("prof_salary", "no");
window.Engine.selectOption("sales_check", "no");
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const txcawaAdmin = window.Engine.getResults();
assert(txcawaAdmin.overall.outcome === "non-exempt", `salary $75K admin in TX+CA+WA must be non-exempt under WA's $80,168 EAP, got ${txcawaAdmin.overall.outcome}`);

window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "no");
window.Engine.selectOption("comp_role", "no");
window.Engine.selectOption("admin_salary", "no");
window.Engine.selectOption("exec_salary", "no");
window.Engine.selectOption("prof_salary", "no");
window.Engine.selectOption("sales_check", "no");
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const msRes = window.Engine.getResults();
const msFlag = msRes.riskFlags.find(f => f.title.indexOf("Multi-state employee") !== -1);
assert(msFlag, "multi-state must produce 'Multi-state employee' risk flag");
assert(msFlag && msFlag.severity === "high", `multi-state flag severity should be high, got ${msFlag && msFlag.severity}`);

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

/* Regression for codex post-r7 Critical: multi-state CA + WA salary
   computer at $100K. The UI must auto-answer comp_salary against the
   per-exemption Computer-routed state (CA — stricter $122,573), NOT
   the general analysisState (WA $80,168). And even if the user manually
   overrides to "yes", the evaluator must revalidate $100K base against
   CA's $122,573 and downgrade to "warn". */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Software Engineer", workState: "California", additionalStates: ["Washington"], baseSalary: 100000, totalComp: 100000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
const compAuto = window.Engine.getAllAnswers();
assert(compAuto.comp_salary === "federal_only", `multi-state CA+WA salary $100K must auto-pre-select comp_salary=federal_only (meets fed but not CA $122,573); got ${compAuto.comp_salary}`);

/* Now simulate the user manually saying "yes" anyway — evaluator
   must downgrade to "warn" via salary-basis revalidation. */
window.Engine.selectOption("hce_start", "no");
window.Engine.selectOption("comp_role", "yes");
window.Engine.selectOption("comp_salary", "yes");
window.Engine.selectOption("comp_duties", "design_dev");
window.Engine.selectOption("comp_independent", "yes");
window.Engine.selectOption("admin_salary", "no");
window.Engine.selectOption("exec_salary", "no");
window.Engine.selectOption("prof_salary", "no");
window.Engine.selectOption("sales_check", "no");
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const compRevalidate = window.Engine.getResults();
assert(compRevalidate.results.computer.status === "warn", `evaluator must revalidate salary against routed state — $100K < CA $122,573 → warn; got ${compRevalidate.results.computer.status}`);
assert(compRevalidate.overall.outcome === "review", `multi-state CA+WA $100K computer with manual yes must end at review, got ${compRevalidate.overall.outcome}`);

/* Regression for codex post-r7 Medium: reclass directional flag must
   NOT fire when classifyOverall blocks the exempt outcome via critical
   flag. Currently non-exempt + day-rate + would-otherwise-pass =
   blocked to review, so directional "Non-Exempt → Exempt" must not
   appear. The "uncertain" reclass flag fires instead. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "reclass", currentClass: "non_exempt", jobTitle: "Lead Tech", workState: "Texas", baseSalary: 250000, totalComp: 250000, hourlyRate: null, payBasis: "day_rate" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "yes");
window.Engine.selectOption("hce_office", "yes");
window.Engine.selectOption("hce_one_duty", "manages");
window.Engine.selectOption("comp_role", "no");
window.Engine.selectOption("admin_salary", "yes");
window.Engine.selectOption("admin_biz_ops", "yes");
window.Engine.selectOption("admin_discretion", "yes");
window.Engine.selectOption("exec_salary", "yes");
window.Engine.selectOption("exec_manage", "yes");
window.Engine.selectOption("exec_reports", "yes");
window.Engine.selectOption("exec_hire_fire", "yes");
window.Engine.selectOption("prof_salary", "yes");
window.Engine.selectOption("prof_advanced", "no");
window.Engine.selectOption("sales_check", "no");
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const reclassBlocked = window.Engine.getResults();
assert(reclassBlocked.overall.outcome === "review", `reclass non-exempt + day-rate critical must end at review, got ${reclassBlocked.overall.outcome}`);
const directionalFlag = reclassBlocked.riskFlags.find(f => f.title.indexOf("Non-Exempt → Exempt") !== -1);
assert(!directionalFlag, `reclass directional 'Non-Exempt → Exempt' MUST NOT fire when critical blocks the recommendation — got ${directionalFlag && directionalFlag.title}`);
const uncertainFlag = reclassBlocked.riskFlags.find(f => f.title.indexOf("uncertain") !== -1);
assert(uncertainFlag, `reclass-uncertain flag should fire instead of directional when critical blocks; got flags: ${reclassBlocked.riskFlags.map(f=>f.title).join("; ")}`);

/* Regression for codex post-r7 Medium: per-state OT rules for multi-
   state employees. CA + CO non-exempt employee should see BOTH CA
   daily-OT rule and CO 12-hour rule, not just one. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Field Coord", workState: "California", additionalStates: ["Colorado"], baseSalary: 60000, totalComp: 60000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "no");
window.Engine.selectOption("comp_role", "no");
window.Engine.selectOption("admin_salary", "no");
window.Engine.selectOption("exec_salary", "no");
window.Engine.selectOption("prof_salary", "no");
window.Engine.selectOption("sales_check", "no");
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const otRes = window.Engine.getResults();
const otEmp = window.Engine.getEmpData();
const otSections = window.generateOvertimeRules(otEmp);
const otLabels = otSections.map(s => s.label);
assert(otLabels.indexOf("California") !== -1, `multi-state CA+CO must include California OT section, got [${otLabels.join(", ")}]`);
assert(otLabels.indexOf("Colorado") !== -1, `multi-state CA+CO must include Colorado OT section, got [${otLabels.join(", ")}]`);
assert(otLabels.indexOf("Multi-State Allocation") !== -1, `multi-state must include allocation reminder, got [${otLabels.join(", ")}]`);

/* Regression for codex post-r7-followup Critical: multi-state CA
   primary + NY-NYC additional with customer_ops admin at $100K.
   Composite-score routing picks CA (HCE-reject bonus dominates), but
   NY's strict-admin DUTIES rule must still apply because NY is in
   scope. Previously returned EXEMPT under "California (federal
   standard)"; now must FAIL admin → non-exempt. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Customer Success Mgr", workState: "California", additionalStates: ["New York (NYC/Nassau/Suffolk/Westchester)"], baseSalary: 100000, totalComp: 100000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "no");
window.Engine.selectOption("comp_role", "no");
window.Engine.selectOption("admin_salary", "yes");
window.Engine.selectOption("admin_biz_ops", "customer_ops");
window.Engine.selectOption("admin_state_restrict", "acknowledged");
window.Engine.selectOption("admin_discretion", "yes");
window.Engine.selectOption("exec_salary", "yes");
window.Engine.selectOption("exec_manage", "no");
window.Engine.selectOption("prof_salary", "yes");
window.Engine.selectOption("prof_advanced", "no");
window.Engine.selectOption("sales_check", "no");
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const canyAdmin = window.Engine.getResults();
assert(canyAdmin.results.admin.status === "fail", `CA primary + NY-NYC additional with customer_ops MUST fail admin (NY strict-admin in scope), got ${canyAdmin.results.admin.status}: ${canyAdmin.results.admin.summary}`);
assert(canyAdmin.overall.outcome === "non-exempt", `CA+NY customer_ops admin must end non-exempt, got ${canyAdmin.overall.outcome}`);
/* The fail summary must name New York, not California, since NY is the binding strict state. */
assert(canyAdmin.results.admin.summary.indexOf("New York") !== -1, `admin fail summary must name the binding strict state (New York), got: ${canyAdmin.results.admin.summary}`);

/* Regression: admin_state_restrict question must fire when ANY in-
   scope state is strict-admin, not just when the analysis state is. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Consultant", workState: "California", additionalStates: ["Oregon"], baseSalary: 100000, totalComp: 100000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
const canyQuestions = (function() {
  /* Drive the engine to surface the admin_state_restrict question. */
  window.Engine.selectOption("hce_start", "no");
  window.Engine.selectOption("comp_role", "no");
  window.Engine.selectOption("admin_salary", "yes");
  window.Engine.selectOption("admin_biz_ops", "customer_ops");
  /* Walk forward and capture the next question id. */
  const seen = [];
  for (let i=0; i<20; i++) {
    const q = window.Engine.currentQuestion();
    if (!q) break;
    seen.push(q.id);
    if (q.id === "admin_state_restrict") return seen;
    window.Engine.nextQuestion();
  }
  return seen;
})();
assert(canyQuestions.indexOf("admin_state_restrict") !== -1, `CA+OR (Oregon strict) must surface admin_state_restrict question even though analysis routes to CA, got sequence ${canyQuestions.join(", ")}`);

/* Regression for codex post-r7-followup Medium: federal-only Computer
   risk flag must name the Computer-routed state (CA), not the general
   analysisState (WA). */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Software Engineer", workState: "California", additionalStates: ["Washington"], baseSalary: 100000, totalComp: 100000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "no");
window.Engine.selectOption("comp_role", "yes");
/* comp_salary auto-answer should be federal_only (meets fed, not CA). */
window.Engine.selectOption("comp_duties", "design_dev");
window.Engine.selectOption("comp_independent", "yes");
window.Engine.selectOption("admin_salary", "no");
window.Engine.selectOption("exec_salary", "no");
window.Engine.selectOption("prof_salary", "no");
window.Engine.selectOption("sales_check", "no");
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const cawaFlags = window.Engine.getResults().riskFlags;
const fedOnlyFlag = cawaFlags.find(f => f.title.indexOf("federal-only threshold") !== -1);
assert(fedOnlyFlag, "federal-only Computer flag should fire for CA+WA $100K computer salary");
assert(fedOnlyFlag && fedOnlyFlag.body.indexOf("California") !== -1, `federal-only flag must name California (Computer-routed state), got: ${fedOnlyFlag && fedOnlyFlag.body}`);

/* Regression for codex post-r7-followup-2 Medium: federal-only
   Computer flag must NOT fire when comp_role=no (Computer not
   claimed). The auto-answer for comp_salary populates regardless of
   comp_role, which previously emitted a misleading "Computer
   exemption: federal-only threshold met" flag for non-computer
   roles. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Customer Success Mgr", workState: "California", additionalStates: ["New York (NYC/Nassau/Suffolk/Westchester)"], baseSalary: 100000, totalComp: 100000, hourlyRate: null, payBasis: "salary" });
window.Engine.startQuestionnaire();
window.Engine.selectOption("hce_start", "no");
window.Engine.selectOption("comp_role", "no");
window.Engine.selectOption("admin_salary", "yes");
window.Engine.selectOption("admin_biz_ops", "customer_ops");
window.Engine.selectOption("admin_state_restrict", "acknowledged");
window.Engine.selectOption("admin_discretion", "yes");
window.Engine.selectOption("exec_salary", "yes");
window.Engine.selectOption("exec_manage", "no");
window.Engine.selectOption("prof_salary", "yes");
window.Engine.selectOption("prof_advanced", "no");
window.Engine.selectOption("sales_check", "no");
{ let s=0; while (window.Engine.getStage()==="questions" && s++<50) window.Engine.nextQuestion(); }
const noCompFlags = window.Engine.getResults().riskFlags;
const phantomCompFlag = noCompFlags.find(f => f.title.indexOf("Computer exemption: federal-only") !== -1);
assert(!phantomCompFlag, `federal-only Computer flag MUST NOT fire when comp_role=no (Computer not claimed); got ${phantomCompFlag && phantomCompFlag.title}`);
/* And the customer-facing-admin flag must NOT fire either, because
   admin already failed under the new strict-admin-in-scope rule. */
const phantomAdminCustFlag = noCompFlags.find(f => f.title.indexOf("Admin exemption based on customer-facing duties") !== -1);
assert(!phantomAdminCustFlag, `customer-facing-admin flag MUST NOT fire when admin already failed under strict-admin rule; got ${phantomAdminCustFlag && phantomAdminCustFlag.title}`);

/* Regression: single-state employee should NOT see the multi-state
   allocation reminder. */
window.Engine.reset();
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Coord", workState: "California", baseSalary: 60000, totalComp: 60000, hourlyRate: null, payBasis: "salary" });
const singleEmp = window.Engine.getEmpData();
const singleOt = window.generateOvertimeRules(singleEmp);
const singleLabels = singleOt.map(s => s.label);
assert(singleLabels.indexOf("Multi-State Allocation") === -1, `single-state CA must NOT include multi-state allocation, got [${singleLabels.join(", ")}]`);
assert(singleLabels.indexOf("California") !== -1, `single-state CA must include California OT, got [${singleLabels.join(", ")}]`);

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
