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
  const payBasis = (empData && empData.payBasis) || "";
  const hourlyRate = (empData && empData.hourlyRate) || 0;

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
    /* Compensation-mechanism gate: 29 CFR 541.400(b)(2) requires either
       salary basis ≥ $684/wk OR hourly ≥ $27.63/hr. The user already
       answered comp_salary="yes" but we re-validate against the actual
       pay-basis mechanics so the recommendation can never contradict
       the inputs. Day/fee/other can only pass via 541.604(b) (guaranteed
       weekly minimum) or 541.605 (per-job equivalence) — neither is
       modeled, so we downgrade to "warn".

       Hourly pay must clear the FEDERAL hourly minimum AND any state
       hourly minimum. State-only fail downgrades to "warn" (federal_only
       semantics) so the more-protective standard wins. */
    if (payBasis === "hourly") {
      if (hourlyRate < FEDERAL_COMPUTER_HOURLY) {
        return {
          status: "fail",
          title,
          summary: `Hourly rate ($${_fmt(hourlyRate)}/hr) is below the federal computer-employee minimum of $${_fmt(FEDERAL_COMPUTER_HOURLY)}/hr. Salary basis is not available because pay is hourly.`,
          details: [
            "Role type: Computer-related",
            "Compensation test: FAIL (hourly below federal threshold)",
            "Duties test: PASS",
            "Independence/skill test: PASS"
          ]
        };
      }
      if (threshold.computerHourly && hourlyRate < threshold.computerHourly) {
        return {
          status: "warn",
          title,
          summary: `Hourly rate ($${_fmt(hourlyRate)}/hr) meets the federal $${_fmt(FEDERAL_COMPUTER_HOURLY)}/hr minimum but NOT the ${stateLabel} state minimum of $${_fmt(threshold.computerHourly)}/hr. Apply the more protective standard: classify as NON-EXEMPT for overtime purposes.`,
          details: [
            "Role type: Computer-related",
            "Federal hourly: PASS",
            `${stateLabel} hourly: FAIL`,
            "Duties test: PASS",
            "Independence/skill test: PASS"
          ]
        };
      }
    }
    if (payBasis === "day_rate" || payBasis === "fee_basis" || payBasis === "other") {
      return {
        status: "warn",
        title,
        summary: `Duties and skill tests pass, but pay basis is "${payBasis.replace("_", " ")}". The salary-basis test is not satisfied by this arrangement on its own. The exemption can still apply if (a) the employee actually receives ≥ $27.63/hour federal (and any applicable state) hourly equivalent, OR (b) a 29 CFR 541.604(b) guaranteed weekly minimum + reasonable-relationship arrangement is documented (for day/shift), OR (c) a 29 CFR 541.605 per-job equivalence is documented (for fee basis). Confirm with employment counsel before classifying as exempt.`,
        details: [
          "Role type: Computer-related",
          `Pay basis: ${payBasis} (does not satisfy salary basis on its own)`,
          "Duties test: PASS",
          "Independence/skill test: PASS"
        ]
      };
    }
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

/* ── Risk flag generation ────────────────────────────────────────────
   Each flag is { severity, title, body } where severity is one of
   "critical" | "high" | "medium" | "low". Critical flags should block
   acting on the recommendation without legal review. */

function _flag(severity, title, body) {
  return { severity, title, body };
}

function generateRiskFlags(answers, empData, results) {
  const flags = [];
  const stateKey = getStateKey(empData.workState);
  const threshold = getThreshold(empData.workState);
  const stateLabel = threshold.label;
  const payBasis = empData.payBasis || "";
  const totalComp = empData.totalComp || empData.baseSalary || 0;

  /* Pay-basis interactions with each exemption (29 CFR 541.600 et seq.):
       - Salary basis (541.602): satisfies all EAP + HCE.
       - Fee basis (541.605): satisfies Admin, Prof, Computer, HCE if the
         fee divided by the hours actually required to complete it equals
         ≥ $684/wk. Does NOT satisfy Executive (541.100(a)(1) requires
         salary basis only).
       - Hourly: satisfies only Computer (541.400(b)(2), $27.63/hr min).
         All other EAP + HCE require salary or fee basis.
       - Day/shift/hourly with guaranteed weekly minimum + reasonable
         relationship between guaranteed amount and amount actually
         earned (541.604(b)) — the Helix Energy v. Hewitt (2023) escape
         hatch — can also satisfy salary basis for any EAP exemption.
         The tool does not currently model this case explicitly, so we
         flag it for the user to verify.
     Names in the result map: hce, computer, admin, executive, professional. */

  function _statusOf(key) {
    return (results[key] && results[key].status) || "skip";
  }
  function _isClaimed(key) {
    const s = _statusOf(key);
    return s === "pass" || s === "warn";
  }

  if (payBasis === "day_rate") {
    /* Day-rate identifies any case where the salary-basis test fails
       UNLESS 541.604(b) is documented. The 541.604(b) path requires a
       guaranteed weekly minimum equal to the salary level AND a
       reasonable relationship to the amount actually earned. We
       recommend the user document that explicitly or convert to true
       salary. The flag fires for ANY claimed exemption (including
       Computer — Helix Energy itself involved a high-paid technical
       role). */
    const claimed = ["hce", "admin", "executive", "professional", "computer"]
      .filter(_isClaimed)
      .map(k => results[k].title);
    if (claimed.length) {
      flags.push(_flag(
        "critical",
        "Day-rate pay — salary basis test likely fails (Helix Energy v. Hewitt, 2023)",
        `Employee is paid on a day rate. Under the Supreme Court's 2023 Helix Energy v. Hewitt decision, day-rate workers generally do not satisfy the salary-basis requirement for EAP/HCE exemptions, even at high pay levels (the Helix worker earned $200K+ and was still non-exempt). The narrow exception is 29 CFR 541.604(b): a day/shift/hourly arrangement may satisfy salary basis if the employee receives a GUARANTEED WEEKLY MINIMUM equal to the salary level AND there is a reasonable relationship between the guarantee and actual earnings. Currently passing/borderline: ${claimed.join(", ")}. Either (a) convert to a true weekly salary, (b) document the 541.604(b) guarantee explicitly, or (c) treat as non-exempt. Computer Employee may also be supported by a true hourly rate ≥ $27.63/hour (federal); see 541.400(b)(2).`
      ));
    } else {
      flags.push(_flag(
        "medium",
        "Day-rate pay confirmed (no EAP exemption claimed)",
        "Day rate alone does not satisfy the salary-basis requirement for white-collar exemptions (Helix Energy, 2023). The narrow 29 CFR 541.604(b) guarantee/reasonable-relationship exception exists but is not modeled here. Outcome on this analysis is non-exempt, which is consistent with that rule."
      ));
    }
  } else if (payBasis === "fee_basis") {
    /* Fee basis is OK for Admin, Prof, Computer, HCE per 29 CFR 541.605
       (and HCE per 541.601(b)(1) which allows the weekly portion on
       salary or fee basis). It is NOT OK for Executive — 541.100 requires
       salary basis only. */
    const execClaimed = _isClaimed("executive");
    const otherEligibleClaimed = ["hce", "admin", "professional", "computer"]
      .filter(_isClaimed)
      .map(k => results[k].title);
    if (execClaimed) {
      flags.push(_flag(
        "critical",
        "Fee-basis pay incompatible with Executive exemption",
        "Employee is paid on a fee basis. The Executive exemption (29 CFR 541.100(a)(1)) requires salary basis only; fee basis does NOT satisfy it. Either convert to salary or rely on a different exemption (Admin/Professional/Computer/HCE all permit fee basis under 541.605, subject to the per-job equivalence test below)."
      ));
    }
    if (otherEligibleClaimed.length) {
      flags.push(_flag(
        "high",
        "Fee-basis pay — confirm 29 CFR 541.605 per-job equivalence",
        `Fee basis can support the Administrative, Learned Professional, Computer, and HCE exemptions (29 CFR 541.605; 541.601(b)(1)) ONLY if the fee for a single job, divided by the hours required to complete it, yields at least $684/week. Document the per-job calculation explicitly for: ${otherEligibleClaimed.join(", ")}.`
      ));
    }
    if (!execClaimed && !otherEligibleClaimed.length) {
      flags.push(_flag(
        "medium",
        "Fee-basis pay confirmed (no exemption claimed)",
        "Fee basis can satisfy Admin, Prof, Computer, and HCE under 29 CFR 541.605 with per-job equivalence. It does NOT satisfy Executive. No exemption is currently being claimed, so this is informational."
      ));
    }
  } else if (payBasis === "hourly") {
    /* Computer-on-hourly is the canonical exception (541.400(b)(2)).
       Any other claimed EAP under hourly pay needs salary basis or a
       541.604(b) guarantee. */
    if (_isClaimed("computer")) {
      const stateClause = (stateKey !== "federal" && threshold.computerHourly)
        ? ` (and ${stateLabel} state minimum: $${_fmt(threshold.computerHourly)}/hour)`
        : "";
      flags.push(_flag(
        "low",
        "Hourly pay — Computer exemption uses hourly alternative",
        `Hourly rate ≥ $27.63/hour federal${stateClause} satisfies the Computer Employee compensation test (29 CFR 541.400(b)(2)). Other EAP/HCE exemptions require salary basis or a 541.604(b) guaranteed weekly minimum.`
      ));
    }
    const nonComputerClaimed = ["hce", "admin", "executive", "professional"]
      .filter(_isClaimed)
      .map(k => results[k].title);
    if (nonComputerClaimed.length) {
      flags.push(_flag(
        "critical",
        "Hourly pay incompatible with non-Computer EAP exemption",
        `Administrative, Executive, Professional, and HCE exemptions require salary basis (or, for Admin/Prof/HCE, fee basis under 541.605). Pure hourly pay generally disqualifies these. The narrow exception is 29 CFR 541.604(b): a guaranteed weekly minimum equal to the salary level plus a reasonable relationship to actual earnings can satisfy salary basis. Currently claimed: ${nonComputerClaimed.join(", ")}. Either (a) convert to a true salary basis, (b) document the 541.604(b) guarantee, or (c) treat as non-exempt for overtime.`
      ));
    }
  } else if (payBasis === "other") {
    const claimed = ["hce", "admin", "executive", "professional", "computer"]
      .filter(_isClaimed)
      .map(k => results[k].title);
    if (claimed.length) {
      flags.push(_flag(
        "high",
        "Non-standard pay arrangement — verify salary basis",
        `Pay basis is commission, draw, piecework, or other non-standard arrangement. Confirm with employment counsel that the salary-basis test (or, where applicable, fee basis under 541.605, hourly under 541.400(b)(2), or the 541.604(b) guarantee) is met before relying on these exemptions: ${claimed.join(", ")}.`
      ));
    }
  }

  /* Flag: Borderline Exemptions */
  const order = ["hce", "computer", "admin", "executive", "professional", "sales"];
  for (const key of order) {
    const r = results[key];
    if (r && r.status === "warn") {
      flags.push(_flag(
        "high",
        `Borderline: ${r.title}`,
        `The ${r.title} exemption is borderline. Document the specific duties analysis and consider legal review.`
      ));
    }
  }

  /* Flag: Federal-Only Computer Threshold (paid above federal min, below state) */
  if (answers.comp_salary === "federal_only") {
    flags.push(_flag(
      "high",
      "Computer exemption: federal-only threshold met",
      `Employee meets federal computer employee threshold but NOT ${stateLabel} state threshold. Apply the more protective state standard.`
    ));
  }

  /* Flag: Customer Ops admin (passes federal, fails strict states) */
  if (answers.admin_biz_ops === "customer_ops" && STRICT_ADMIN_STATES.indexOf(stateKey) === -1) {
    flags.push(_flag(
      "medium",
      "Admin exemption based on customer-facing duties",
      "Administrative exemption based on customer operations work. This qualifies under federal law but would NOT qualify in states like New York or Oregon. If the employee relocates to those states, reclassification may be needed."
    ));
  }

  /* Flag: Working Manager */
  if (answers.exec_manage === "partial") {
    flags.push(_flag(
      "high",
      "Working manager / player-coach role",
      "Working manager/player-coach role. If the non-management duties consume more than 50% of time, the \"primary duty\" test could fail under scrutiny."
    ));
  }

  /* Flag: Below State EAP Threshold */
  if (empData.baseSalary < threshold.eapAnnual && threshold.eapAnnual > 35568) {
    flags.push(_flag(
      "high",
      `Salary below ${stateLabel} state EAP threshold`,
      `Employee salary ($${_fmt(empData.baseSalary)}) is below the ${stateLabel} state EAP threshold ($${_fmt(threshold.eapAnnual)}). Even if duties tests pass, the state salary test fails.`
    ));
  }

  /* Flag: Non-overlay state (no encoded state-specific rules) */
  const isFederalOnly = stateKey === "federal";
  const stateProvided = empData.workState && empData.workState.length > 0;
  if (isFederalOnly && stateProvided) {
    flags.push(_flag(
      "low",
      `${empData.workState} has no state-specific overlay encoded`,
      `This tool does not encode state-specific EAP rules for ${empData.workState} (federal standards apply by default). Verify locally that no state minimum-wage law, paid-leave law, salary-history rule, predictive-scheduling ordinance, or city/county wage law affects this classification before finalizing.`
    ));
  }

  /* Flag: Reclassification — see also reclass helper in memo. */
  if (empData.classType === "reclass") {
    const currentClass = empData.currentClass || "";
    const overallOutcome = (results._overallOutcome) || null; /* not used; see below */
    flags.push(_flag(
      "medium",
      "This is a reclassification review",
      "If changing from exempt to non-exempt, plan a communication strategy to address employee concerns (timekeeping, perception of status change). Position it as a compliance benefit. If the recommendation differs from the current classification, see the Reclassification Considerations section below for next steps."
    ));

    if (currentClass === "exempt" || currentClass === "non_exempt") {
      /* Determine the recommended outcome from the evaluator results.
         Mirrors classifyOverall(): exempt = at least one passing exemption,
         non-exempt = nothing passes AND nothing borderline, review =
         no pass but at least one borderline. The directional flag must
         only fire when the recommendation is unambiguous; "review" must
         NOT be reframed as non-exempt because the suggested action is
         "wait for legal review", not "convert and pay back wages". */
      const passing = order.filter(k => results[k] && results[k].status === "pass");
      const borderline = order.filter(k => results[k] && results[k].status === "warn");
      const recommendsExempt = passing.length > 0;
      const recommendsNonExempt = passing.length === 0 && borderline.length === 0;
      const recommendsReview = passing.length === 0 && borderline.length > 0;

      if (currentClass === "exempt" && recommendsNonExempt) {
        flags.push(_flag(
          "critical",
          "Reclassification: Exempt → Non-Exempt",
          "Currently classified as exempt; recommended classification is non-exempt. Plan back-pay analysis (overtime owed for the lookback period — typically 2-3 years under FLSA), communication, and timekeeping rollout. Consider running this past employment counsel before action."
        ));
      } else if (currentClass === "non_exempt" && recommendsExempt) {
        flags.push(_flag(
          "high",
          "Reclassification: Non-Exempt → Exempt",
          "Currently classified as non-exempt; recommended classification is exempt. Confirm salary level meets the applicable threshold from the effective date forward, audit recent timekeeping for unpaid overtime liability, and document the duties basis carefully."
        ));
      } else if (currentClass === "exempt" && recommendsReview) {
        flags.push(_flag(
          "high",
          "Reclassification status uncertain — legal review needed before any change",
          "Currently classified as exempt; the tool could not produce a clear recommendation (one or more exemptions are borderline). Do NOT convert to non-exempt or initiate back-pay analysis on the basis of this memo alone. Consult employment counsel to resolve the borderline calls before changing classification."
        ));
      } else if (currentClass === "non_exempt" && recommendsReview) {
        flags.push(_flag(
          "medium",
          "Reclassification status uncertain — legal review needed before any change",
          "Currently classified as non-exempt; the tool could not produce a clear recommendation (one or more exemptions are borderline). Continue treating as non-exempt for now and consult counsel to resolve the borderline calls before reclassifying as exempt."
        ));
      }
    }
  }

  /* Stable severity-then-original-order sort. */
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return flags
    .map((f, i) => ({ ...f, _i: i }))
    .sort((a, b) => (rank[a.severity] - rank[b.severity]) || (a._i - b._i))
    .map(({ _i, ...rest }) => rest);
}

/* Confidence: a single judgment for the deploying HR generalist about
   how much weight to put on the recommendation without independent
   legal review. Returns { level, reasons }.
   - low:    any borderline result OR critical-severity flag
   - medium: high-severity flag, or no clear pass + only fails (non-exempt)
             with non-overlay state (some judgment still required)
   - high:   clean pass with no warns and no high-severity-or-above flags */
function computeConfidence(results, overall, riskFlags, empData) {
  const reasons = [];
  let level = "high";

  const order = ["hce", "computer", "admin", "executive", "professional", "sales"];
  const hasWarn = order.some(k => results[k] && results[k].status === "warn");
  const passing = order.filter(k => results[k] && results[k].status === "pass");

  const sevs = riskFlags.map(f => f.severity);
  const hasCritical = sevs.indexOf("critical") !== -1;
  const hasHigh = sevs.indexOf("high") !== -1;
  const hasMedium = sevs.indexOf("medium") !== -1;

  if (hasCritical) {
    level = "low";
    reasons.push("One or more CRITICAL risk flags require resolution before relying on this recommendation.");
  }
  if (hasWarn) {
    if (level === "high") level = "low";
    reasons.push("At least one exemption is borderline (judgment call required).");
  }
  if (overall.outcome === "review") {
    if (level === "high") level = "low";
    reasons.push("No exemption clearly passed; legal review is recommended.");
  }
  if (hasHigh && level === "high") {
    level = "medium";
    reasons.push("One or more HIGH-severity risk flags warrant attention.");
  }
  if (hasMedium && level === "high") {
    level = "medium";
    reasons.push("One or more MEDIUM-severity risk flags should be reviewed.");
  }
  if (overall.outcome === "exempt" && passing.length === 1 && level === "high") {
    /* Single passing exemption is fine; no downgrade.
       But if the only passing exemption has any borderline detail, we already
       caught it above. */
  }
  if (level === "high") {
    reasons.push("Outcome is unambiguous: salary, duties, and any state-overlay tests align.");
  }
  return { level, reasons };
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
