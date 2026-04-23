/* Node runner: loads data + evaluator + scenarios via eval, runs all scenarios. */
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
  load("tests/scenarios.js"),
  "module.exports = { runAllScenarios, SCENARIOS };"
].join("\n");

const mod = { exports: {} };
new Function("module", code)(mod);
const { runAllScenarios } = mod.exports;

const results = runAllScenarios();
let passCount = 0;
for (const r of results) {
  const marker = r.pass ? "PASS" : "FAIL";
  console.log(`[${marker}] Scenario ${r.id}: ${r.name}`);
  if (!r.pass) {
    for (const f of r.failures) console.log("   ✗ " + f);
  }
  if (r.pass) passCount++;
}
console.log(`\n${passCount}/${results.length} scenarios passed.`);
process.exit(passCount === results.length ? 0 : 1);
