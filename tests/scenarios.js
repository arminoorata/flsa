/* Canonical scenarios from spec/06-evaluation-logic.md + 3 proposed extras.
   Each scenario specifies answer inputs and the expected status for each exemption.
   Run via tests/scenarios.html in a browser — or node via scenarios.node.js. */

const SCENARIOS = [
  /* ── Canonical scenarios from spec 06 ────────────────────────────── */

  {
    id: 1,
    name: "California Software Engineer, Below State Threshold",
    source: "spec 06",
    empData: {
      classType: "new_hire",
      jobTitle: "Software Engineer",
      workState: "California",
      baseSalary: 90000,
      totalComp: 100000,
      hourlyRate: null
    },
    answers: {
      hce_start: "no",
      hce_office: "yes",
      comp_role: "yes",
      comp_salary: "federal_only",
      comp_duties: "design_dev",
      comp_independent: "yes",
      admin_salary: "yes",
      admin_biz_ops: "production",
      exec_salary: "yes",
      exec_manage: "no",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "no"
    },
    expect: {
      hce: "fail",
      computer: "warn",
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "review",
      flags_contain: ["federal computer employee threshold"]
    }
  },

  {
    id: 2,
    name: "Texas Senior Engineering Manager",
    source: "spec 06",
    empData: {
      classType: "new_hire",
      jobTitle: "Engineering Manager",
      workState: "Texas",
      baseSalary: 180000,
      totalComp: 250000,
      hourlyRate: null
    },
    answers: {
      hce_start: "yes",
      hce_office: "yes",
      hce_one_duty: "manages",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "production",
      exec_salary: "yes",
      exec_manage: "yes",
      exec_reports: "yes",
      exec_hire_fire: "yes",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "no"
    },
    expect: {
      hce: "pass",
      computer: "skip",
      admin: "fail",
      executive: "pass",
      professional: "fail",
      sales: "skip",
      outcome: "exempt",
      passing_contains: ["Highly Compensated Employee (HCE)", "Executive"]
    }
  },

  {
    id: 3,
    name: "Connecticut Senior Director",
    source: "spec 06",
    empData: {
      classType: "new_hire",
      jobTitle: "Director of Marketing",
      workState: "Connecticut",
      baseSalary: 220000,
      totalComp: 300000,
      hourlyRate: null
    },
    answers: {
      hce_start: "yes",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "yes",
      admin_discretion: "yes",
      exec_salary: "yes",
      exec_manage: "yes",
      exec_reports: "yes",
      exec_hire_fire: "yes",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "no"
    },
    expect: {
      hce: "skip",
      computer: "skip",
      admin: "pass",
      executive: "pass",
      professional: "fail",
      sales: "skip",
      outcome: "exempt",
      passing_contains: ["Administrative", "Executive"]
    }
  },

  {
    id: 4,
    name: "Inside Sales Rep, Anywhere",
    source: "spec 06",
    empData: {
      classType: "new_hire",
      jobTitle: "SDR",
      workState: "Texas",
      baseSalary: 55000,
      totalComp: 85000,
      hourlyRate: null
    },
    answers: {
      hce_start: "no",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "production",
      exec_salary: "yes",
      exec_manage: "no",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "yes",
      sales_outside: "no"
    },
    expect: {
      hce: "fail",
      computer: "skip",
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "fail",
      outcome: "non-exempt"
    }
  },

  {
    id: 5,
    name: "NYC Compliance Officer Serving Clients",
    source: "spec 06",
    empData: {
      classType: "new_hire",
      jobTitle: "Compliance Consultant",
      workState: "New York (NYC/Nassau/Suffolk/Westchester)",
      baseSalary: 140000,
      totalComp: 160000,
      hourlyRate: null
    },
    answers: {
      hce_start: "yes",
      hce_office: "yes",
      hce_one_duty: "admin_discretion",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "customer_ops",
      admin_state_restrict: "acknowledged",
      admin_discretion: "yes",
      exec_salary: "yes",
      exec_manage: "no",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "no"
    },
    expect: {
      hce: "pass",
      computer: "skip",
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "exempt",
      passing_contains: ["Highly Compensated Employee (HCE)"]
    }
  },

  /* ── 3 proposed additional scenarios ─────────────────────────────── */

  {
    id: 6,
    name: "Washington Senior Software Engineer (state hourly threshold)",
    source: "proposed",
    empData: {
      classType: "new_hire",
      jobTitle: "Senior Software Engineer",
      workState: "Washington",
      baseSalary: 170000,
      totalComp: 190000,
      hourlyRate: null
    },
    answers: {
      hce_start: "yes",
      hce_office: "yes",
      hce_one_duty: "advanced_knowledge",
      comp_role: "yes",
      comp_salary: "yes",
      comp_duties: "design_dev",
      comp_independent: "yes",
      admin_salary: "yes",
      admin_biz_ops: "production",
      exec_salary: "yes",
      exec_manage: "no",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "no"
    },
    expect: {
      hce: "pass",
      computer: "pass",
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "exempt",
      passing_contains: ["Highly Compensated Employee (HCE)", "Computer Employee"]
    }
  },

  {
    id: 7,
    name: "Oregon Client-Facing Compliance Consultant",
    source: "proposed (covers strict admin state = OR, not NYC)",
    empData: {
      classType: "new_hire",
      jobTitle: "Compliance Consultant",
      workState: "Oregon",
      baseSalary: 95000,
      totalComp: 105000,
      hourlyRate: null
    },
    answers: {
      hce_start: "no",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "customer_ops",
      admin_state_restrict: "acknowledged",
      admin_discretion: "yes",
      exec_salary: "yes",
      exec_manage: "no",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "no"
    },
    expect: {
      hce: "fail",
      computer: "skip",
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "non-exempt"
    }
  },

  {
    id: 8,
    name: "Working Manager Borderline",
    source: "proposed (exercises exec_manage = partial WARN path)",
    empData: {
      classType: "new_hire",
      jobTitle: "Tech Lead / Player-Coach",
      workState: "Texas",
      baseSalary: 150000,
      totalComp: 180000,
      hourlyRate: null
    },
    answers: {
      hce_start: "yes",
      hce_office: "yes",
      hce_one_duty: "none",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "production",
      exec_salary: "yes",
      exec_manage: "partial",
      exec_reports: "yes",
      exec_hire_fire: "yes",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "no"
    },
    expect: {
      hce: "fail",
      computer: "skip",
      admin: "fail",
      executive: "warn",
      professional: "fail",
      sales: "skip",
      outcome: "review",
      flags_contain: ["Working manager"]
    }
  },

  /* Scenarios 9 and 10 cover evaluator-path gaps that the canonical 8 miss.
     NOTE: runScenario() only exercises evaluator + classifier + flags. It
     does NOT drive the Engine state machine or the question tree. The
     Engine-flow regressions (back-nav answer preservation, hce_ct_block
     skip when hce_start=no, auto-applied tracking) are covered by
     assertions in tests/boot-test.js, which drives the UI via jsdom. */

  {
    id: 9,
    name: "Connecticut below-HCE (evaluator path: HCE=skip for CT)",
    source: "proposed (HCE Rule 1 'CT exclusion' path, not covered by canonical 3)",
    empData: {
      classType: "new_hire",
      jobTitle: "HR Coordinator",
      workState: "Connecticut",
      baseSalary: 55000,
      totalComp: 55000,
      hourlyRate: null
    },
    answers: {
      hce_start: "no",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "yes",
      admin_discretion: "no",
      exec_salary: "yes",
      exec_manage: "no",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "no"
    },
    expect: {
      hce: "skip",
      computer: "skip",
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "non-exempt"
    }
  },

  {
    id: 10,
    name: "Reclassification Review (covers Flag 6)",
    source: "proposed (exercises classType='reclass' risk flag path)",
    empData: {
      classType: "reclass",
      jobTitle: "Support Specialist",
      workState: "Texas",
      baseSalary: 48000,
      totalComp: 52000,
      hourlyRate: null
    },
    answers: {
      hce_start: "no",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "production",
      exec_salary: "yes",
      exec_manage: "no",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "no"
    },
    expect: {
      hce: "fail",
      computer: "skip",
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "non-exempt",
      flags_contain: ["reclassification review"]
    }
  }
];

/* Run one scenario. Returns { id, name, pass: bool, failures: [] }. */
function runScenario(s) {
  const results = evaluateExemptions(s.answers, s.empData);
  const overall = classifyOverall(results, s.empData);
  const flags = generateRiskFlags(s.answers, s.empData, results);
  const failures = [];

  for (const key of ["hce", "computer", "admin", "executive", "professional", "sales"]) {
    if (s.expect[key] && results[key].status !== s.expect[key]) {
      failures.push(`${key}: expected ${s.expect[key]}, got ${results[key].status} — "${results[key].summary}"`);
    }
  }
  if (s.expect.outcome && overall.outcome !== s.expect.outcome) {
    failures.push(`outcome: expected ${s.expect.outcome}, got ${overall.outcome}`);
  }
  if (s.expect.passing_contains) {
    for (const title of s.expect.passing_contains) {
      if (overall.passing.indexOf(title) === -1) {
        failures.push(`passing should contain "${title}" but got [${overall.passing.join(", ")}]`);
      }
    }
  }
  if (s.expect.flags_contain) {
    for (const substr of s.expect.flags_contain) {
      if (!flags.some(f => f.indexOf(substr) !== -1)) {
        failures.push(`flags should contain "${substr}" but got ${JSON.stringify(flags)}`);
      }
    }
  }
  return { id: s.id, name: s.name, pass: failures.length === 0, failures, results, overall, flags };
}

function runAllScenarios() {
  return SCENARIOS.map(runScenario);
}
