/* Smoke test: loads every JS file, exercises Memo.renderHTML / renderText
   against scenarios 1, 2, 3, 5, 7 to catch render-time bugs.
   Does NOT load engine.js / ui.js / app.js (those require a DOM). */
const fs = require("fs");
const path = require("path");

function load(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

const code = [
  load("app/data/constants.js"),
  load("app/data/thresholds.js"),
  load("app/data/states.js"),
  load("app/data/regulatory.js"),
  load("app/data/questions.js"),
  load("app/js/evaluator.js"),
  load("app/js/memo.js"),
  load("tests/scenarios.js"),
  "module.exports = { Memo, SCENARIOS, evaluateExemptions, classifyOverall, generateRiskFlags };"
].join("\n");

const mod = { exports: {} };
new Function("module", code)(mod);
const { Memo, SCENARIOS, evaluateExemptions, classifyOverall, generateRiskFlags } = mod.exports;

const probe = [1, 2, 3, 5, 7];
let errors = 0;

for (const id of probe) {
  const s = SCENARIOS.find(x => x.id === id);
  if (!s) { console.error("Missing scenario", id); errors++; continue; }
  try {
    const results = evaluateExemptions(s.answers, s.empData);
    /* Flags must be computed before classifyOverall so any critical
       flag can short-circuit a passing exemption to "review". */
    const flags = generateRiskFlags(s.answers, s.empData, results);
    const overall = classifyOverall(results, s.empData, flags);
    const html = Memo.renderHTML(s.empData, results, overall, flags);
    const text = Memo.renderText(s.empData, results, overall, flags);
    const standalone = Memo.renderStandaloneHTML(s.empData, results, overall, flags);
    if (!html.includes("FLSA Exemption Classification Memo")) { console.error(`[${id}] HTML missing title`); errors++; }
    if (!text.includes("FLSA Exemption Classification Memo")) { console.error(`[${id}] Text missing title`); errors++; }
    if (!standalone.includes("<!DOCTYPE html>")) { console.error(`[${id}] Standalone missing doctype`); errors++; }
    if (text.includes("Fireblocks")) { console.error(`[${id}] Text contains "Fireblocks"!`); errors++; }
    if (html.includes("Fireblocks")) { console.error(`[${id}] HTML contains "Fireblocks"!`); errors++; }
    console.log(`[OK] Scenario ${id}: memo renders (${html.length} chars html, ${text.length} chars text)`);
  } catch (e) {
    console.error(`[FAIL] Scenario ${id}: ${e.message}`);
    console.error(e.stack);
    errors++;
  }
}

console.log(errors === 0 ? "\nAll smoke checks passed." : `\n${errors} smoke check failures.`);
process.exit(errors === 0 ? 0 : 1);
