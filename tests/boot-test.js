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
expose.textContent = "window.UI = UI; window.Engine = Engine; window.Memo = Memo;";
document.body.appendChild(expose);

if (!window.UI) {
  console.error("UI global not exposed after injection. Errors captured:", errors);
  process.exit(1);
}

/* Boot. */
window.UI.init();

let failures = [];
function assert(cond, msg) { if (!cond) failures.push(msg); }

assert(document.getElementById("version-label").textContent.includes("April 14, 2026"), "version label missing");
assert(document.getElementById("start-btn"), "start button missing on intake");

/* Fill intake for scenario 3 (CT Senior Director). */
document.getElementById("classType").value = "new_hire";
document.getElementById("jobTitle").value = "Director of Marketing";
document.getElementById("workState").value = "Connecticut";
document.getElementById("baseSalary").value = "220000";
document.getElementById("totalComp").value = "300000";
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

const { overall } = window.Engine.getResults();
assert(overall.outcome === "exempt", `expected exempt, got ${overall.outcome}`);
assert(overall.passing.indexOf("Administrative") !== -1, "Administrative should pass");
assert(overall.passing.indexOf("Executive") !== -1, "Executive should pass");

window.UI.renderApp();
const memo = document.querySelector(".memo");
assert(memo !== null, "memo element not rendered");
assert(memo && memo.textContent.includes("Administrative"), "memo missing Administrative exemption");
assert(memo && memo.textContent.includes("EMPLOYEE / ROLE INFORMATION"), "memo missing Employee section heading");
assert(memo && memo.textContent.includes("EXEMPTION ANALYSIS"), "memo missing Exemption Analysis heading");
assert(memo && !memo.textContent.includes("Fireblocks"), "memo contains 'Fireblocks'!");
assert(memo && memo.textContent.includes("People Operations"), "memo missing 'People Operations' subtitle");

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
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "Test", workState: "Texas", baseSalary: 150000, totalComp: 160000, hourlyRate: null });
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
window.Engine.setEmpData({ classType: "new_hire", jobTitle: "HR Coord", workState: "Connecticut", baseSalary: 55000, totalComp: 55000, hourlyRate: null });
window.Engine.startQuestionnaire();
/* Override the auto-answer: user confirms "no" explicitly. */
window.Engine.selectOption("hce_start", "no");
window.Engine.nextQuestion();
const nextQ = window.Engine.currentQuestion();
assert(nextQ && nextQ.id === "comp_role", `CT + hce_start=no should skip hce_ct_block and go to comp_role; got ${nextQ && nextQ.id}`);

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
