/* Evaluation logic. Pure functions, one per exemption. Source of truth
   is spec/06-evaluation-logic.md. Status values: "pass" | "fail" | "warn" | "skip". */

function _fmt(n) {
  if (n === null || n === undefined || n === "") return "0";
  const num = Number(n);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function _hceDutyLabel(value) {
  const map = {
    manages: "manages",
    admin_discretion: "admin_discretion",
    advanced_knowledge: "advanced_knowledge"
  };
  return map[value] || value;
}

function evaluateHCE(answers, empData, stateKey) {
  const title = "Highly Compensated Employee (HCE)";
  if (stateKey === "connecticut") {
    return {
      status: "skip",
      title,
      summary: "Not available in Connecticut. State law does not recognize the HCE exemption.",
      details: []
    };
  }
  if (answers.hce_start === "no") {
    const totalComp = empData.totalComp || empData.baseSalary || 0;
    return {
      status: "fail",
      title,
      summary: `Total compensation ($${_fmt(totalComp)}) is below the $107,432 threshold.`,
      details: ["Salary test: FAIL"]
    };
  }
  if (answers.hce_office === "no") {
    return {
      status: "fail",
      title,
      summary: "Employee does not perform office or non-manual work as primary duty.",
      details: ["Compensation test: PASS", "Office work test: FAIL"]
    };
  }
  if (answers.hce_one_duty === "none") {
    return {
      status: "fail",
      title,
      summary: "Employee does not customarily and regularly perform at least one exempt duty.",
      details: ["Compensation test: PASS", "Office work test: PASS", "Exempt duty test: FAIL"]
    };
  }
  if (
    answers.hce_start === "yes" &&
    answers.hce_office === "yes" &&
    answers.hce_one_duty &&
    answers.hce_one_duty !== "none"
  ) {
    return {
      status: "pass",
      title,
      summary: "Employee meets all HCE requirements.",
      details: [
        "Compensation test: PASS",
        "Office work test: PASS",
        `Exempt duty test: PASS (${_hceDutyLabel(answers.hce_one_duty)})`
      ]
    };
  }
  return { status: "skip", title, summary: "Not fully evaluated (skipped due to prior answers).", details: [] };
}

function evaluateComputer(answers, empData, threshold) {
  const title = "Computer Employee";
  const stateLabel = threshold.label;

  if (answers.comp_role === "no") {
    return {
      status: "skip",
      title,
      summary: "Role is not a computer-related position. Exemption not applicable.",
      details: []
    };
  }
  if (answers.comp_salary === "no") {
    return {
      status: "fail",
      title,
      summary: "Does not meet the federal compensation threshold.",
      details: ["Role type: Computer-related", "Compensation test: FAIL"]
    };
  }
  if (answers.comp_duties === "none") {
    return {
      status: "fail",
      title,
      summary: "Primary duties do not match the required computer employee functions.",
      details: ["Role type: Computer-related", "Compensation test: PASS", "Duties test: FAIL"]
    };
  }
  /* Ordering note from spec 06: "no" and "partial" independence paths
     must be checked BEFORE the "federal_only" salary path. */
  if (answers.comp_independent === "no") {
    return {
      status: "fail",
      title,
      summary: "Employee does not work independently with sufficient skill and expertise.",
      details: [
        "Role type: Computer-related",
        "Compensation test: PASS",
        "Duties test: PASS",
        "Independence/skill test: FAIL"
      ]
    };
  }
  if (answers.comp_independent === "partial") {
    return {
      status: "warn",
      title,
      summary: "BORDERLINE: Employee has developing skills but still requires significant supervision. Legal review recommended.",
      details: [
        "Role type: Computer-related",
        "Compensation test: PASS",
        "Duties test: PASS",
        "Independence/skill test: BORDERLINE"
      ]
    };
  }
  if (answers.comp_salary === "federal_only") {
    return {
      status: "warn",
      title,
      summary: `Meets federal threshold but NOT ${stateLabel} state threshold. Employee is exempt under federal law but may not be exempt under state law. Apply the more protective standard: classify as NON-EXEMPT for overtime purposes.`,
      details: [
        "Role type: Computer-related",
        "Federal compensation: PASS",
        `${stateLabel} compensation: FAIL`,
        "Duties test: PASS",
        "Independence test: PASS"
      ]
    };
  }
  if (
    answers.comp_role === "yes" &&
    answers.comp_salary === "yes" &&
    answers.comp_duties && answers.comp_duties !== "none" &&
    answers.comp_independent === "yes"
  ) {
    return {
      status: "pass",
      title,
      summary: "Employee meets all computer employee exemption requirements (federal and applicable state).",
      details: [
        "Role type: Computer-related",
        "Compensation test: PASS (federal + state)",
        "Duties test: PASS",
        "Independence/skill test: PASS"
      ]
    };
  }
  return { status: "skip", title, summary: "Not fully evaluated.", details: [] };
}

function evaluateAdmin(answers, empData, stateKey, threshold) {
  const title = "Administrative";
  const stateLabel = threshold.label;
  const inStrictState = STRICT_ADMIN_STATES.indexOf(stateKey) !== -1;

  if (answers.admin_salary === "no") {
    return {
      status: "fail",
      title,
      summary: "Does not meet the applicable salary threshold.",
      details: ["Salary test: FAIL"]
    };
  }
  if (answers.admin_biz_ops === "production") {
    return {
      status: "fail",
      title,
      summary: "Primary duty is production/delivery of the company's core product, not management or general business operations.",
      details: ["Salary test: PASS", "Business operations test: FAIL (production role)"]
    };
  }
  if (answers.admin_biz_ops === "customer_ops" && inStrictState) {
    return {
      status: "fail",
      title,
      summary: `Primary duty relates to customer operations. ${stateLabel} does not allow the administrative exemption for customer-facing duties.`,
      details: [
        "Salary test: PASS",
        `Business operations test: FAIL under ${stateLabel} law (customer-facing)`,
        "Note: Would pass under federal law but state law is more restrictive"
      ]
    };
  }
  if (answers.admin_discretion === "no") {
    return {
      status: "fail",
      title,
      summary: "Employee does not exercise discretion and independent judgment on matters of significance.",
      details: [
        "Salary test: PASS",
        "Business operations test: PASS",
        "Discretion & independent judgment: FAIL"
      ]
    };
  }
  if (answers.admin_discretion === "limited") {
    return {
      status: "warn",
      title,
      summary: "BORDERLINE: Employee exercises some judgment but most significant decisions require approval. Legal review recommended.",
      details: [
        "Salary test: PASS",
        "Business operations test: PASS",
        "Discretion & independent judgment: BORDERLINE"
      ]
    };
  }
  if (
    answers.admin_salary === "yes" &&
    (
      answers.admin_biz_ops === "yes" ||
      (answers.admin_biz_ops === "customer_ops" && !inStrictState)
    ) &&
    answers.admin_discretion === "yes"
  ) {
    const isCustomerOps = answers.admin_biz_ops === "customer_ops";
    const note = isCustomerOps ? " (via customer operations, federal standard)" : "";
    return {
      status: "pass",
      title,
      summary: `Employee meets all administrative exemption requirements.${note}`,
      details: [
        "Salary test: PASS",
        `Business operations test: PASS${note}`,
        "Discretion & independent judgment: PASS"
      ]
    };
  }
  return { status: "skip", title, summary: "Not fully evaluated.", details: [] };
}

function evaluateExecutive(answers) {
  const title = "Executive";

  if (answers.exec_salary === "no") {
    return {
      status: "fail",
      title,
      summary: "Does not meet the applicable salary threshold.",
      details: ["Salary test: FAIL"]
    };
  }
  if (answers.exec_manage === "no") {
    return {
      status: "fail",
      title,
      summary: "Primary duty is not management.",
      details: ["Salary test: PASS", "Management as primary duty: FAIL"]
    };
  }
  if (answers.exec_reports === "no") {
    return {
      status: "fail",
      title,
      summary: "Does not direct the work of 2+ FTE employees.",
      details: [
        "Salary test: PASS",
        "Management as primary duty: PASS",
        "2+ FTE direct reports: FAIL"
      ]
    };
  }
  if (answers.exec_hire_fire === "no") {
    return {
      status: "fail",
      title,
      summary: "Does not have hire/fire authority or recommendations that carry particular weight.",
      details: [
        "Salary test: PASS",
        "Management as primary duty: PASS",
        "2+ FTE direct reports: PASS",
        "Hire/fire authority: FAIL"
      ]
    };
  }
  /* Ordering note from spec 06: specific failures (Rules 3/4) checked
     BEFORE partial-management borderline (Rule 5). */
  if (answers.exec_manage === "partial") {
    return {
      status: "warn",
      title,
      summary: "BORDERLINE: Employee manages but also performs substantial non-management work (working manager). Need to determine if management is truly the \"primary\" duty.",
      details: [
        "Salary test: PASS",
        "Management as primary duty: BORDERLINE (working manager)",
        answers.exec_reports === "yes" ? "2+ FTE direct reports: PASS" : "2+ FTE direct reports: N/A",
        answers.exec_hire_fire === "yes" ? "Hire/fire authority: PASS" : "Hire/fire authority: N/A"
      ]
    };
  }
  if (
    answers.exec_salary === "yes" &&
    answers.exec_manage === "yes" &&
    answers.exec_reports === "yes" &&
    answers.exec_hire_fire === "yes"
  ) {
    return {
      status: "pass",
      title,
      summary: "Employee meets all executive exemption requirements.",
      details: [
        "Salary test: PASS",
        "Management as primary duty: PASS",
        "2+ FTE direct reports: PASS",
        "Hire/fire authority: PASS"
      ]
    };
  }
  return { status: "skip", title, summary: "Not fully evaluated.", details: [] };
}

function evaluateProfessional(answers) {
  const title = "Learned Professional";

  if (answers.prof_salary === "no") {
    return {
      status: "fail",
      title,
      summary: "Does not meet the applicable salary threshold.",
      details: ["Salary test: FAIL"]
    };
  }
  if (answers.prof_advanced === "no") {
    return {
      status: "fail",
      title,
      summary: "Role does not require advanced knowledge in a recognized learned profession.",
      details: ["Salary test: PASS", "Advanced knowledge requirement: FAIL"]
    };
  }
  if (answers.prof_advanced === "maybe") {
    return {
      status: "warn",
      title,
      summary: "BORDERLINE: Role requires a specific degree but the field may not be a traditional learned profession. Legal review recommended.",
      details: ["Salary test: PASS", "Advanced knowledge requirement: BORDERLINE"]
    };
  }
  if (answers.prof_salary === "yes" && answers.prof_advanced === "yes") {
    return {
      status: "pass",
      title,
      summary: "Employee meets learned professional exemption requirements.",
      details: ["Salary test: PASS", "Advanced knowledge requirement: PASS"]
    };
  }
  return { status: "skip", title, summary: "Not fully evaluated.", details: [] };
}

function evaluateSales(answers) {
  const title = "Outside Sales";

  if (answers.sales_check === "no") {
    return { status: "skip", title, summary: "Not a sales role. Exemption not applicable.", details: [] };
  }
  if (answers.sales_outside === "no") {
    return {
      status: "fail",
      title,
      summary: "Employee does not primarily make sales away from the employer's place of business.",
      details: ["Sales role: YES", "Outside sales primary duty: FAIL (inside sales/remote)"]
    };
  }
  if (answers.sales_outside === "yes") {
    return {
      status: "pass",
      title,
      summary: "Employee meets outside sales exemption requirements. No salary threshold applies.",
      details: ["Sales role: YES", "Outside sales primary duty: PASS"]
    };
  }
  return { status: "skip", title, summary: "Not evaluated.", details: [] };
}

function evaluateExemptions(answers, empData) {
  const stateKey = getStateKey(empData.workState);
  const threshold = getThreshold(empData.workState);
  return {
    hce: evaluateHCE(answers, empData, stateKey),
    computer: evaluateComputer(answers, empData, threshold),
    admin: evaluateAdmin(answers, empData, stateKey, threshold),
    executive: evaluateExecutive(answers),
    professional: evaluateProfessional(answers),
    sales: evaluateSales(answers)
  };
}

function classifyOverall(results, empData) {
  const order = ["hce", "computer", "admin", "executive", "professional", "sales"];
  const passing = [];
  const borderline = [];
  for (const key of order) {
    const r = results[key];
    if (!r) continue;
    if (r.status === "pass") passing.push(r.title);
    else if (r.status === "warn") borderline.push(r.title);
  }
  const stateKey = getStateKey(empData.workState);
  const threshold = getThreshold(empData.workState);
  const hasStateOverlay = stateKey !== "federal";
  const stateLabel = threshold.label;

  if (passing.length > 0) {
    const passingList = passing.join(" and ");
    const suffix = hasStateOverlay ? ` (federal and ${stateLabel} state)` : " (federal)";
    let rec = `RECOMMEND: Classify as EXEMPT under the ${passingList} exemption${passing.length > 1 ? "s" : ""}${suffix}.`;
    if (borderline.length > 0) {
      const borderlineList = borderline.length > 2
        ? borderline.slice(0, -1).join(", ") + ", and " + borderline[borderline.length - 1]
        : borderline.join(" and ");
      const isAre = borderline.length > 1 ? "are" : "is";
      rec += `\n\nNote: Additional exemptions are borderline (${borderlineList}). The qualifying exemption${passing.length > 1 ? "s" : ""} above ${passing.length > 1 ? "are" : "is"} sufficient, but borderline results are documented below.`;
    }
    return { outcome: "exempt", text: rec, passing, borderline };
  }
  if (borderline.length > 0) {
    const borderlineList = borderline.length > 2
      ? borderline.slice(0, -1).join(", ") + ", and " + borderline[borderline.length - 1]
      : borderline.join(" and ");
    const isAre = borderline.length > 1 ? "are" : "is";
    const rec = `RECOMMEND: LEGAL REVIEW REQUIRED. No exemption clearly passed, but ${borderlineList} exemption${borderline.length > 1 ? "s" : ""} ${isAre} borderline. Recommend consulting employment counsel before classifying.`;
    return { outcome: "review", text: rec, passing, borderline };
  }
  const stateClause = hasStateOverlay ? ` or ${stateLabel} state law` : "";
  const rec = `RECOMMEND: Classify as NON-EXEMPT. This role does not meet the requirements for any tested exemption under federal${stateClause}. The employee is entitled to overtime pay.`;
  return { outcome: "non-exempt", text: rec, passing, borderline };
}

function generateRiskFlags(answers, empData, results) {
  const flags = [];
  const stateKey = getStateKey(empData.workState);
  const threshold = getThreshold(empData.workState);
  const stateLabel = threshold.label;

  /* Flag 1: Borderline Exemptions */
  const order = ["hce", "computer", "admin", "executive", "professional", "sales"];
  for (const key of order) {
    const r = results[key];
    if (r && r.status === "warn") {
      flags.push(`The ${r.title} exemption is borderline. Document the specific duties analysis and consider legal review.`);
    }
  }

  /* Flag 2: Federal-Only Computer Threshold */
  if (answers.comp_salary === "federal_only") {
    flags.push(`Employee meets federal computer employee threshold but NOT ${stateLabel} state threshold. Apply the more protective state standard.`);
  }

  /* Flag 3: Customer Ops (when not in strict state) */
  if (answers.admin_biz_ops === "customer_ops" && STRICT_ADMIN_STATES.indexOf(stateKey) === -1) {
    flags.push("Administrative exemption based on customer operations work. This qualifies under federal law but would NOT qualify in states like New York or Oregon. If the employee relocates to those states, reclassification may be needed.");
  }

  /* Flag 4: Working Manager */
  if (answers.exec_manage === "partial") {
    flags.push("Working manager/player-coach role. If the non-management duties consume more than 50% of time, the \"primary duty\" test could fail under scrutiny.");
  }

  /* Flag 5: Below State EAP Threshold */
  if (empData.baseSalary < threshold.eapAnnual && threshold.eapAnnual > 35568) {
    flags.push(`Employee salary ($${_fmt(empData.baseSalary)}) is below the ${stateLabel} state EAP threshold ($${_fmt(threshold.eapAnnual)}). Even if duties tests pass, the state salary test fails.`);
  }

  /* Flag 6: Reclassification Review */
  if (empData.classType === "reclass") {
    flags.push("This is a reclassification review. If changing from exempt to non-exempt, plan a communication strategy to address employee concerns about the change (timekeeping requirements, perception of status change). Position it as a compliance benefit.");
  }

  return flags;
}

function generateOvertimeRules(empData) {
  const stateKey = getStateKey(empData.workState);
  const sections = [];
  sections.push({
    label: "Federal",
    text: "Overtime required for non-exempt employees working more than 40 hours in a workweek at 1.5x the regular rate of pay."
  });
  if (stateKey === "california") {
    sections.push({
      label: "California",
      text: "Overtime required for more than 8 hours in a day AND more than 40 hours in a week. Double time required for more than 12 hours in a day and more than 8 hours on the 7th consecutive day in a workweek."
    });
  }
  if (stateKey === "colorado") {
    sections.push({
      label: "Colorado",
      text: "Overtime required for more than 12 hours in a day OR more than 40 hours in a week (note: different from California's 8-hour daily trigger)."
    });
  }
  sections.push({
    label: "Regular Rate Reminder",
    text: "When calculating overtime, the \"regular rate\" must include all non-discretionary compensation (bonuses, commissions, shift differentials). Only truly discretionary bonuses may be excluded."
  });
  return sections;
}
