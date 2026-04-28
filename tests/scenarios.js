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
      hce: "skip",   /* CA does not recognize federal HCE shortcut */
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
      hce: "skip",   /* WA rejects federal HCE shortcut */
      computer: "pass",
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "exempt",
      passing_contains: ["Computer Employee"]
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
  },

  /* Scenario 11: Helix Energy v. Hewitt — high-paid day-rate worker
     with otherwise-passing exemption answers. The salary-basis test fails
     and the tool must produce a CRITICAL flag warning the user. */
  {
    id: 11,
    name: "High-Paid Day-Rate Worker (Helix Energy v. Hewitt)",
    source: "proposed (salary-basis test, day_rate path)",
    empData: {
      classType: "new_hire",
      jobTitle: "Field Director",
      workState: "Texas",
      baseSalary: 250000,
      totalComp: 260000,
      hourlyRate: null,
      payBasis: "day_rate"
    },
    answers: {
      hce_start: "yes",
      hce_office: "yes",
      hce_one_duty: "manages",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "yes",
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
      admin: "pass",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "review",  /* CRITICAL Helix flag blocks exempt recommendation */
      flags_contain: ["Helix Energy v. Hewitt"]
    }
  },

  /* Scenario 12: Non-overlay state (Florida) — federal-only analysis
     should still produce the "no state-specific overlay encoded" flag
     so users remember to check city/county wage laws locally. */
  {
    id: 12,
    name: "Florida Compliance Officer (non-overlay state flag)",
    source: "proposed (non-overlay state flag path)",
    empData: {
      classType: "new_hire",
      jobTitle: "Compliance Officer",
      workState: "Florida",
      baseSalary: 95000,
      totalComp: 100000,
      hourlyRate: null,
      payBasis: "salary"
    },
    answers: {
      hce_start: "no",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "yes",
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
      admin: "pass",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "exempt",
      flags_contain: ["Not validated for Florida"]
    }
  },

  /* Scenario 15: Day-rate Computer engineer — duties/skill tests pass
     but the salary-basis test is not satisfied by day-rate alone. The
     evaluator MUST downgrade Computer to "warn" so the overall outcome
     is "review" (not a confidently wrong "exempt"). The CRITICAL Helix
     flag must also fire and reference 541.604(b). Regression for codex
     review #2 BLOCKER. */
  {
    id: 15,
    name: "Day-Rate Software Engineer (Computer must downgrade + Helix flag)",
    source: "proposed (codex r2 BLOCKER: day-rate must downgrade Computer to warn)",
    empData: {
      classType: "new_hire",
      jobTitle: "Software Engineer",
      workState: "Texas",
      baseSalary: 150000,
      totalComp: 150000,
      hourlyRate: null,
      payBasis: "day_rate"
    },
    answers: {
      hce_start: "no",
      comp_role: "yes",
      comp_salary: "yes",
      comp_duties: "design_dev",
      comp_independent: "yes",
      admin_salary: "no",
      exec_salary: "no",
      prof_salary: "no",
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
      flags_contain: ["Day-rate pay — salary basis test likely fails", "541.604(b)"]
    }
  },

  /* Scenario 20: Colorado high-comp role — Colorado HAS its own HCE
     under COMPS Order #40 at $130,014 (2.25 × $57,784 EAP). This role
     at $250K total comp passes the CO HCE threshold. The tool must
     use the CO threshold (more protective than federal $107,432), not
     skip HCE entirely. Regression for codex r4 HIGH finding. */
  {
    id: 20,
    name: "Colorado High-Comp HR Director (HCE uses CO $130,014 threshold)",
    source: "proposed (codex r4 HIGH: CO HCE at $130,014, not federal $107,432)",
    empData: {
      classType: "new_hire",
      jobTitle: "HR Director",
      workState: "Colorado",
      baseSalary: 200000,
      totalComp: 250000,
      hourlyRate: null,
      payBasis: "salary"
    },
    answers: {
      hce_start: "yes",
      hce_office: "yes",
      hce_one_duty: "admin_discretion",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "yes",
      admin_discretion: "yes",
      exec_salary: "yes",
      exec_manage: "no",
      prof_salary: "yes",
      prof_advanced: "no",
      sales_check: "no"
    },
    expect: {
      hce: "pass",   /* CO HCE at $130,014; $250K comp meets it */
      computer: "skip",
      admin: "pass",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "exempt",
      passing_contains: ["Administrative", "Highly Compensated Employee (HCE)"]
    }
  },

  /* Scenario 20b: Colorado at federal HCE level but BELOW Colorado's
     state HCE — must NOT pass HCE because the state threshold
     ($130,014) is the more-protective standard. */
  {
    id: 24,
    name: "Colorado at $115K (above federal HCE, BELOW CO HCE)",
    source: "proposed (codex r4: CO HCE more-protective $130,014 must apply)",
    empData: {
      classType: "new_hire",
      jobTitle: "Senior Manager",
      workState: "Colorado",
      baseSalary: 100000,
      totalComp: 115000,
      hourlyRate: null,
      payBasis: "salary"
    },
    answers: {
      hce_start: "no",   /* auto-no because $115K < $130,014 CO threshold */
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "yes",
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
      admin: "pass",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "exempt"
    }
  },

  /* Scenario 21: NY Pharmacist at $50K — passes professional duties
     but salary is below NY's executive/admin EAP threshold ($66,300
     NYC). Tool must use the federal-only $35,568 threshold for the
     learned-professional exemption since NY has no state professional
     salary minimum. Regression for codex review #4 HIGH finding. */
  {
    id: 21,
    name: "NY Learned Professional below state EAP (no state pro min)",
    source: "proposed (codex r4 HIGH: NY professional has no state salary min)",
    empData: {
      classType: "new_hire",
      jobTitle: "Pharmacist",
      workState: "New York (rest of state)",
      baseSalary: 50000,
      totalComp: 50000,
      hourlyRate: null,
      payBasis: "salary"
    },
    answers: {
      hce_start: "no",
      comp_role: "no",
      admin_salary: "no",
      exec_salary: "no",
      prof_salary: "yes",  /* meets federal $35,568 */
      prof_advanced: "yes",
      sales_check: "no"
    },
    expect: {
      hce: "fail",
      computer: "skip",
      admin: "fail",
      executive: "fail",
      professional: "pass",  /* would have failed if state min were applied */
      sales: "skip",
      outcome: "exempt",
      passing_contains: ["Learned Professional"]
    }
  },

  /* Scenario 22: New Jersey overlay — verifies NJ resolves to its
     own threshold key (not federal). Regression for codex review #4
     state-coverage finding. */
  {
    id: 22,
    name: "New Jersey Compliance Officer (state overlay resolves)",
    source: "proposed (codex r4: NJ added as state overlay)",
    empData: {
      classType: "new_hire",
      jobTitle: "Compliance Officer",
      workState: "New Jersey",
      baseSalary: 95000,
      totalComp: 100000,
      hourlyRate: null,
      payBasis: "salary"
    },
    answers: {
      hce_start: "no",
      comp_role: "no",
      admin_salary: "yes",
      admin_biz_ops: "yes",
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
      admin: "pass",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "exempt"
    }
  },

  /* Scenario 25: Multi-state CA + WA salary computer at $100K. CA's
     computer-salary threshold is $122,573, WA's is $80,168. The most-
     protective state for a SALARY-paid computer employee at $100K is
     CA (would block; $100K < $122,573). Per-exemption routing must
     use CA's computer threshold even though WA wins the general
     EAP routing. Regression for codex r7 HIGH finding. */
  {
    id: 25,
    name: "Multi-state CA+WA Salary Computer @ $100K (per-exemption Computer routing)",
    source: "proposed (codex r7 HIGH: per-exemption Computer routing)",
    empData: {
      classType: "new_hire",
      jobTitle: "Software Engineer",
      workState: "California",
      additionalStates: ["Washington"],
      analysisState: "Washington",
      primaryWorkState: "California",
      baseSalary: 100000,
      totalComp: 100000,
      hourlyRate: null,
      payBasis: "salary"
    },
    answers: {
      hce_start: "no",
      comp_role: "yes",
      comp_salary: "federal_only",  /* meets fed but not CA $122,573 */
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
      hce: "skip",   /* CA/WA both reject HCE */
      computer: "warn",   /* federal_only path → warn under more-protective standard */
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "review"
    }
  },

  /* Scenario 23: Multi-state Oregon (strict admin) + Illinois (no extras)
     at the same EAP threshold. The most-protective state must be OREGON,
     not Illinois. Regression for codex r4 finding: previously
     getMostProtectiveState used alphabetical tiebreak on tied EAPs and
     would route to Illinois, losing OR's strict admin rule.
     Customer-facing admin must FAIL (because OR's strict admin rules
     apply). */
  {
    id: 23,
    name: "Multi-state OR primary + IL additional (OR strict admin must apply)",
    source: "proposed (codex r4 finding: tied-EAP tiebreak must prefer restrictiveness)",
    empData: {
      classType: "new_hire",
      jobTitle: "Customer Operations Consultant",
      workState: "Oregon",
      additionalStates: ["Illinois"],
      analysisState: "Oregon",
      primaryWorkState: "Oregon",
      baseSalary: 120000,
      totalComp: 120000,
      hourlyRate: null,
      payBasis: "salary"
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
      admin: "fail",  /* OR strict admin blocks customer_ops path */
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "non-exempt"
    }
  },

  /* Scenario 19: Hourly programmer above federal $27.63/hr but below
     California $58.85/hr state hourly minimum. The evaluator must
     downgrade Computer to "warn" so the more-protective state standard
     wins. Regression for codex review #3 finding. */
  {
    id: 19,
    name: "California Hourly Programmer (above federal, below CA state)",
    source: "proposed (codex r3 finding: hourly state-threshold gap)",
    empData: {
      classType: "new_hire",
      jobTitle: "Programmer",
      workState: "California",
      baseSalary: 90000,
      totalComp: 90000,
      hourlyRate: 40.00,
      payBasis: "hourly"
    },
    answers: {
      hce_start: "no",
      comp_role: "yes",
      comp_salary: "yes",  /* user manually said yes */
      comp_duties: "design_dev",
      comp_independent: "yes",
      admin_salary: "no",
      exec_salary: "no",
      prof_salary: "no",
      sales_check: "no"
    },
    expect: {
      hce: "skip",   /* CA rejects federal HCE shortcut */
      computer: "warn",
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "review"
    }
  },

  /* Scenario 18: Hourly programmer below the $27.63/hr federal minimum
     with a nominal annual base. The auto-pre-select must NOT fire
     "yes" from baseSalary alone; the evaluator must FAIL Computer.
     Regression for codex review #2 BLOCKER. */
  {
    id: 18,
    name: "Hourly Programmer Below $27.63/hr (must FAIL Computer)",
    source: "proposed (codex r2 BLOCKER: hourly Computer must check actual hourly rate)",
    empData: {
      classType: "new_hire",
      jobTitle: "Junior Developer",
      workState: "Texas",
      baseSalary: 50000,
      totalComp: 50000,
      hourlyRate: 20.00,
      payBasis: "hourly"
    },
    answers: {
      hce_start: "no",
      comp_role: "yes",
      comp_salary: "no",         /* below $27.63/hr federal */
      admin_salary: "no",
      exec_salary: "no",
      prof_salary: "no",
      sales_check: "no"
    },
    expect: {
      hce: "fail",
      computer: "fail",
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "non-exempt"
    }
  },

  /* Scenario 16: Fee-basis HCE — the fee-basis flag MUST say HCE is
     supported via 541.605/541.601(b)(1) per-job equivalence test, NOT
     that it disqualifies HCE. Regression for codex finding: previously
     the flag said fee basis "does NOT satisfy Executive or HCE" — wrong
     about HCE. */
  {
    id: 16,
    name: "Fee-Basis HCE (must say fee basis can support HCE per 541.605)",
    source: "proposed (codex BLOCKER fix: fee basis CAN satisfy HCE)",
    empData: {
      classType: "new_hire",
      jobTitle: "Independent Consultant",
      workState: "Texas",
      baseSalary: 150000,
      totalComp: 150000,
      hourlyRate: null,
      payBasis: "fee_basis"
    },
    answers: {
      hce_start: "yes",
      hce_office: "yes",
      hce_one_duty: "admin_discretion",
      comp_role: "no",
      admin_salary: "no",
      exec_salary: "no",
      prof_salary: "no",
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
      flags_contain: ["confirm 29 CFR 541.605 per-job equivalence", "Highly Compensated Employee (HCE)"]
    }
  },

  /* Scenario 17: Fee-basis Executive — fee basis MUST trigger the
     dedicated CRITICAL flag because Executive (29 CFR 541.100(a)(1))
     allows salary basis only, not fee. */
  {
    id: 17,
    name: "Fee-Basis Executive (must trigger CRITICAL exec-only flag)",
    source: "proposed (Executive only allows salary basis, not fee)",
    empData: {
      classType: "new_hire",
      jobTitle: "Department Head",
      workState: "Texas",
      baseSalary: 200000,
      totalComp: 200000,
      hourlyRate: null,
      payBasis: "fee_basis"
    },
    answers: {
      hce_start: "no",
      comp_role: "no",
      admin_salary: "no",
      exec_salary: "yes",
      exec_manage: "yes",
      exec_reports: "yes",
      exec_hire_fire: "yes",
      prof_salary: "no",
      sales_check: "no"
    },
    expect: {
      hce: "fail",
      computer: "skip",
      admin: "fail",
      executive: "pass",
      professional: "fail",
      sales: "skip",
      outcome: "review",  /* CRITICAL fee-basis-incompatible flag blocks exempt */
      flags_contain: ["Fee-basis pay incompatible with Executive exemption"]
    }
  },

  /* Scenario 14: Reclass currently-exempt with REVIEW outcome (a
     borderline working manager). The directional flag must NOT say
     "Exempt → Non-Exempt" because the recommendation is "needs legal
     review", not non-exempt. The "uncertain" flag should fire instead. */
  {
    id: 14,
    name: "Reclass Currently-Exempt with REVIEW outcome (uncertain flag)",
    source: "proposed (reclass + review outcome must NOT trigger directional)",
    empData: {
      classType: "reclass",
      currentClass: "exempt",
      jobTitle: "Tech Lead",
      workState: "Texas",
      baseSalary: 150000,
      totalComp: 180000,
      hourlyRate: null,
      payBasis: "salary"
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
      flags_contain: ["Reclassification status uncertain"]
    }
  },

  /* Scenario 26: Multi-state CA + WA salary computer @ $100K with the
     user manually answering comp_salary="yes" (e.g., they overrode the
     federal_only auto-answer, or entered the form before the auto-
     answer logic was wired). The evaluator MUST revalidate $100K base
     against CA's $122,573.13 computer-salary threshold (CA wins per-
     exemption Computer routing) and downgrade to "warn" instead of
     blindly returning "pass". Regression for codex post-r7 Critical:
     "evaluator does not revalidate salary against CA threshold". */
  {
    id: 26,
    name: "Multi-state CA+WA Salary Computer @ $100K with manual yes (evaluator revalidates)",
    source: "proposed (codex post-r7 Critical: evaluator must revalidate salary)",
    empData: {
      classType: "new_hire",
      jobTitle: "Software Engineer",
      workState: "California",
      additionalStates: ["Washington"],
      analysisState: "Washington",
      primaryWorkState: "California",
      baseSalary: 100000,
      totalComp: 100000,
      hourlyRate: null,
      payBasis: "salary"
    },
    answers: {
      hce_start: "no",
      comp_role: "yes",
      comp_salary: "yes",         /* user manually answered yes */
      comp_duties: "design_dev",
      comp_independent: "yes",
      admin_salary: "no",
      exec_salary: "no",
      prof_salary: "no",
      sales_check: "no"
    },
    expect: {
      hce: "skip",   /* CA/WA both reject HCE shortcut */
      computer: "warn",   /* evaluator downgrades — $100K < CA $122,573 */
      admin: "fail",
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "review"
    }
  },

  /* Scenario 27: Reclass currently-non-exempt with passing exemption
     BUT critical pay-basis flag (day-rate). classifyOverall blocks
     exempt → review (blockedByCritical=true), so the directional
     "Non-Exempt → Exempt" flag MUST NOT fire — the recommendation is
     ambiguous and the dedicated reclass-uncertain flag is correct.
     Regression for codex post-r7 Medium. */
  {
    id: 27,
    name: "Reclass Non-Exempt currently + day-rate critical (no directional flag)",
    source: "proposed (codex post-r7 Medium: reclass directional respects critical-block)",
    empData: {
      classType: "reclass",
      currentClass: "non_exempt",
      jobTitle: "Lead Technician",
      workState: "Texas",
      baseSalary: 250000,
      totalComp: 250000,
      hourlyRate: null,
      payBasis: "day_rate"
    },
    answers: {
      hce_start: "yes",
      hce_office: "yes",
      hce_one_duty: "manages",
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
      hce: "pass",
      computer: "skip",
      admin: "pass",
      executive: "pass",
      professional: "fail",
      sales: "skip",
      outcome: "review",   /* blocked by Helix day-rate critical */
      flags_contain: ["Day-rate pay"]
    }
  },

  /* Scenario 28: Multi-state CA primary + NY-NYC additional with
     customer_ops admin at $100K. Composite-score routing lands on CA
     (CA's HCE-rejection +$200K bonus dominates), but NY-NYC's strict-
     admin rule MUST still apply because NY is in scope and strict-
     admin is a duties-test rule that binds wherever the employee
     actually works in NY. Previously this returned EXEMPT under
     "California (federal standard)" — now must FAIL admin and
     produce a non-exempt outcome. Regression for codex post-r7
     follow-up Critical: multi-state admin false-exempt. */
  {
    id: 28,
    name: "Multi-state CA primary + NY-NYC additional, customer_ops admin (NY's strict rule binds)",
    source: "proposed (codex post-r7-followup Critical: multi-state admin must fail customer_ops)",
    empData: {
      classType: "new_hire",
      jobTitle: "Customer Success Manager",
      workState: "California",
      additionalStates: ["New York (NYC/Nassau/Suffolk/Westchester)"],
      analysisState: "California",
      primaryWorkState: "California",
      baseSalary: 100000,
      totalComp: 100000,
      hourlyRate: null,
      payBasis: "salary"
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
      hce: "skip",   /* CA rejects HCE shortcut */
      computer: "skip",
      admin: "fail",   /* NY's strict-admin rule blocks customer_ops */
      executive: "fail",
      professional: "fail",
      sales: "skip",
      outcome: "non-exempt"
    }
  },

  /* Scenario 13: Reclass exempt → non-exempt with currentClass=exempt.
     Should produce the dedicated CRITICAL reclass flag for the
     direction of change. */
  {
    id: 13,
    name: "Reclass Exempt → Non-Exempt (back-pay flag)",
    source: "proposed (reclass current→recommended differential)",
    empData: {
      classType: "reclass",
      currentClass: "exempt",
      jobTitle: "Junior Coordinator",
      workState: "Texas",
      baseSalary: 50000,
      totalComp: 50000,
      hourlyRate: null,
      payBasis: "salary"
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
      flags_contain: ["Exempt → Non-Exempt"]
    }
  }
];

/* Run one scenario. Returns { id, name, pass: bool, failures: [] }. */
function runScenario(s) {
  const results = evaluateExemptions(s.answers, s.empData);
  /* Flags must be computed BEFORE classifyOverall so critical flags
     can short-circuit an otherwise-passing exemption (mirrors the
     order in Engine._evaluate). */
  const flags = generateRiskFlags(s.answers, s.empData, results);
  const overall = classifyOverall(results, s.empData, flags);
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
      const haystack = (f) => typeof f === "string" ? f : `${f.title} ${f.body}`;
      if (!flags.some(f => haystack(f).indexOf(substr) !== -1)) {
        failures.push(`flags should contain "${substr}" but got ${JSON.stringify(flags)}`);
      }
    }
  }
  return { id: s.id, name: s.name, pass: failures.length === 0, failures, results, overall, flags };
}

function runAllScenarios() {
  return SCENARIOS.map(runScenario);
}
