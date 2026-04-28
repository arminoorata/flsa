/* Decision tree. All question text, option labels, help, and "why"
   content reproduced verbatim from spec/05-decision-tree.md.

   buildQuestions(empData, answers) returns the filtered question array
   for the given employee + current answers. Called on every navigation
   to re-evaluate state-specific branches and skip conditions. */

function fmtUSD(n) {
  if (n === null || n === undefined || n === "") return "0";
  const num = Number(n);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
}

/* Auto-answer helpers for the EAP salary tests. The user can always
   override; the auto-applied flag in the engine ensures we only
   propagate intake-derived answers, never user picks. */
function _autoAdminProfExecSalary(baseSalary, threshold, payBasis) {
  if (!baseSalary || baseSalary <= 0) return undefined;
  const fedThresh = FEDERAL_EAP_ANNUAL;
  const stateThresh = threshold.eapAnnual || fedThresh;
  const higher = Math.max(stateThresh, fedThresh);
  const meetsLevel = baseSalary >= higher;
  /* Salary-basis precondition: only auto-pre-select "yes" when we are
     reasonably confident the salary basis test passes. Hourly/day-rate/
     fee-basis pay schemes need user confirmation. Admin/Prof can use
     fee basis under federal regs but we leave that to user judgment. */
  const validBasis = (payBasis === "salary" || payBasis === "" || payBasis === undefined);
  if (meetsLevel && validBasis) return "yes";
  return undefined;
}

function _autoComputerSalary(baseSalary, hourlyRate, threshold, payBasis) {
  if (!baseSalary && !hourlyRate) return undefined;
  const fedAnnual = FEDERAL_EAP_ANNUAL;
  const fedHourly = FEDERAL_COMPUTER_HOURLY;
  const stateAnnual = threshold.computerSalaryAnnual;
  const stateHourly = threshold.computerHourly;
  const baseSal = baseSalary || 0;
  const hr = hourlyRate || 0;
  const hasState = (stateAnnual !== null && stateAnnual !== undefined) ||
                   (stateHourly !== null && stateHourly !== undefined);

  /* Branch by pay basis so we never claim the salary path is met when
     the employee is paid hourly (or vice versa). 29 CFR 541.400(b)(2)
     allows EITHER salary basis ≥ $684/wk OR hourly ≥ $27.63/hr — not
     both interchangeably. Day-rate / fee-basis / other never auto-pass:
     they require explicit user judgment about 541.604(b) or 541.605. */

  if (payBasis === "salary" || payBasis === "" || payBasis === undefined) {
    const meetsFed = baseSal >= fedAnnual;
    let meetsState = true;
    if (hasState) {
      const stateSalaryOk = (stateAnnual === null || stateAnnual === undefined) ? false : baseSal >= stateAnnual;
      meetsState = stateSalaryOk;
    }
    if (meetsFed && meetsState) return "yes";
    if (meetsFed && !meetsState) return "federal_only";
    return undefined;
  }

  if (payBasis === "hourly") {
    /* Hourly-pay employees must qualify via the hourly alternative.
       Falling back to baseSalary would let a $20/hr role with a
       nominal $50k annual base auto-pass, which is wrong. */
    if (!hr) return undefined;  /* User must enter hourly rate. */
    const meetsFed = hr >= fedHourly;
    let meetsState = true;
    if (hasState) {
      const stateHourlyOk = (stateHourly === null || stateHourly === undefined) ? false : hr >= stateHourly;
      meetsState = stateHourlyOk;
    }
    if (meetsFed && meetsState) return "yes";
    if (meetsFed && !meetsState) return "federal_only";
    return undefined;
  }

  /* day_rate / fee_basis / other: never auto-pre-select. The salary-
     basis flag explains why these need explicit human judgment about
     541.604(b) (day/shift) or 541.605 (fee). */
  return undefined;
}

function buildQuestions(empData, answers) {
  const stateKey = getStateKey(empData.workState);
  const threshold = getThreshold(empData.workState);
  const fedThresh = FEDERAL_EAP_ANNUAL;
  const stateThresh = threshold.eapAnnual;
  const higher = Math.max(stateThresh, fedThresh);
  const totalComp = empData.totalComp || empData.baseSalary || 0;
  const baseSalary = empData.baseSalary || 0;
  const hourlyRate = empData.hourlyRate;
  const payBasis = empData.payBasis || "";

  const compSalaryText = (() => {
    let parts = ["Federal: salary ≥ $684/week ($35,568/year) OR hourly rate ≥ $27.63/hour."];
    if (stateKey === "california") {
      parts.push("California (applies here): salary ≥ $122,573.13/year OR hourly rate ≥ $58.85/hour.");
    } else if (stateKey === "colorado") {
      parts.push("Colorado (applies here): salary ≥ $57,784/year OR hourly rate ≥ $34.85/hour.");
    } else if (stateKey === "washington") {
      parts.push("Washington (applies here): hourly rate ≥ $59.96/hour.");
    }
    let entered = `Entered salary: $${fmtUSD(baseSalary)}/year`;
    if (hourlyRate) entered += `, $${fmtUSD(hourlyRate)}/hour`;
    parts.push(entered);
    return parts.join(" ");
  })();

  const adminSalaryText = (() => {
    let parts = ["Federal minimum: $684/week ($35,568/year)."];
    if (stateThresh > fedThresh) {
      parts.push(`${threshold.label} minimum: $${fmtUSD(threshold.eapWeekly)}/week ($${fmtUSD(stateThresh)}/year). The state threshold is higher and applies.`);
    }
    parts.push(`Applicable threshold: $${fmtUSD(higher)}/year. Entered salary: $${fmtUSD(baseSalary)}/year.`);
    return parts.join(" ");
  })();

  const eapSalaryText = `Applicable threshold: $${fmtUSD(higher)}/year. Entered salary: $${fmtUSD(baseSalary)}/year.`;

  const questions = [];

  /* Q1: hce_start */
  questions.push({
    id: "hce_start",
    exemption: "HCE",
    stageIdx: 1,
    label: "Highly Compensated Employee (HCE) Exemption",
    text: `Does this employee earn total annual compensation of $107,432 or more? (Current total comp entered: $${fmtUSD(totalComp)})`,
    help: "Total comp includes salary, nondiscretionary bonuses, commissions, and other nondiscretionary compensation. Equity/stock value at grant is generally not included unless it vests and is paid annually.",
    why: "The HCE exemption uses a reduced duties test. If the employee earns above this threshold, they only need to perform one exempt duty (executive, administrative, or professional) on a customary and regular basis.",
    options: [
      { value: "yes", label: "Yes, total comp is ≥ $107,432/year" },
      { value: "no", label: "No, total comp is below $107,432/year" }
    ],
    autoAnswer: totalComp >= FEDERAL_HCE_THRESHOLD ? "yes" : "no"
  });

  /* Q2: hce_ct_block — conditional: only if Connecticut AND employee
     is on the HCE-eligible branch (hce_start = yes). Per spec/05 flow
     diagram: H1=No goes direct to C1 (comp_role); CT block sits on the
     HCE-eligible branch. */
  if (stateKey === "connecticut") {
    questions.push({
      id: "hce_ct_block",
      exemption: "HCE",
      stageIdx: 1,
      label: "Connecticut does not recognize the HCE exemption",
      text: "This employee works in Connecticut, which does not recognize the federal HCE exemption. The employee must qualify under one of the standard exemptions (Administrative, Executive, Professional, or Computer Employee) regardless of compensation level.",
      why: "Connecticut state law requires employees to meet the full duties test for a specific exemption. High compensation alone is not sufficient.",
      options: [
        { value: "acknowledged", label: "Understood, continue to next exemption" }
      ],
      skipIf: (a) => a.hce_start === "no"
    });
  }

  /* Q3: hce_office */
  questions.push({
    id: "hce_office",
    exemption: "HCE",
    stageIdx: 1,
    label: "Does this employee perform office or non-manual work as their primary duty?",
    text: "The HCE exemption does not apply to manual laborers, production workers, maintenance staff, construction workers, or similar \"blue collar\" roles, regardless of pay.",
    help: "Office/non-manual work includes desk-based roles like management, analysis, programming, administration, consulting, and professional services.",
    why: "Even highly paid employees who primarily do physical/manual work cannot be exempt under HCE.",
    options: [
      { value: "yes", label: "Yes, primarily office or non-manual work" },
      { value: "no", label: "No, primarily manual or physical work" }
    ],
    skipIf: (a) => a.hce_start === "no" || stateKey === "connecticut"
  });

  /* Q4: hce_one_duty */
  questions.push({
    id: "hce_one_duty",
    exemption: "HCE",
    stageIdx: 1,
    label: "Does this employee customarily and regularly perform at least ONE of the following exempt duties?",
    text: "Select the one that best applies. Under HCE, the employee only needs to meet one duty from any exempt category on a regular basis (not just occasionally).",
    why: "The HCE exemption uses a relaxed duties test. Instead of meeting ALL requirements of an exemption, the employee only needs to customarily and regularly perform at least one exempt duty.",
    options: [
      { value: "manages", label: "Manages the enterprise or a department, OR directs the work of 2+ employees" },
      { value: "admin_discretion", label: "Performs work directly related to management/business operations AND exercises discretion and independent judgment on significant matters" },
      { value: "advanced_knowledge", label: "Performs work requiring advanced knowledge in a field of science/learning acquired through specialized education" },
      { value: "none", label: "None of the above apply on a customary and regular basis" }
    ],
    skipIf: (a) => a.hce_start === "no" || a.hce_office === "no" || stateKey === "connecticut"
  });

  /* Q5: comp_role */
  questions.push({
    id: "comp_role",
    exemption: "Computer",
    stageIdx: 2,
    label: "Is this employee in a computer-related role?",
    text: "The computer employee exemption applies to systems analysts, programmers, software engineers, and similar roles. It does NOT apply to employees who simply use computers as tools (e.g., data entry, using spreadsheets, CAD operators, writers).",
    help: "Common qualifying titles at a fintech company: Software Engineer, DevOps Engineer, SRE, Blockchain Developer, Protocol Engineer, Platform Engineer, QA Automation Engineer (if primarily writing test code). Common NON-qualifying roles: IT Help Desk, Hardware Technician, Data Entry, roles that just use software.",
    why: "This is the threshold question for the computer employee exemption. If the role is not fundamentally a computer science/engineering role, we skip this exemption entirely.",
    options: [
      { value: "yes", label: "Yes, this is a software/systems/programming role" },
      { value: "no", label: "No, this employee uses computers but is not in a computer science/engineering role" }
    ]
  });

  /* Q6: comp_salary */
  questions.push({
    id: "comp_salary",
    exemption: "Computer",
    stageIdx: 2,
    label: "Does this employee meet the computer employee compensation threshold?",
    text: compSalaryText,
    help: "Apply the MORE protective (higher) threshold between federal and state.",
    why: "Both salary/fee basis and hourly rate alternatives exist for the computer employee exemption. The employee must meet at least one.",
    options: [
      { value: "yes", label: "Yes, meets both federal AND applicable state threshold" },
      { value: "federal_only", label: "Meets federal threshold but NOT state threshold" },
      { value: "no", label: "Does not meet the federal threshold" }
    ],
    skipIf: (a) => a.comp_role === "no",
    autoAnswer: _autoComputerSalary(baseSalary, hourlyRate, threshold, payBasis)
  });

  /* Q7: comp_duties */
  questions.push({
    id: "comp_duties",
    exemption: "Computer",
    stageIdx: 2,
    label: "What is this employee's PRIMARY duty? Select the best match.",
    text: "The computer employee exemption requires the primary duty to consist of one or more of these specific functions. \"Primary duty\" means the principal, main, or most important duty performed.",
    why: "Job titles do not determine exemption status. The actual work performed must match one of these specific categories defined in the FLSA regulations.",
    options: [
      { value: "systems_analysis", label: "Applying systems analysis techniques and procedures (consulting with users to determine hardware/software/system functional specifications)" },
      { value: "design_dev", label: "Designing, developing, documenting, analyzing, creating, testing, or modifying computer systems or programs, including prototypes, based on user or system design specifications" },
      { value: "os_programs", label: "Designing, documenting, testing, creating, or modifying computer programs related to machine operating systems" },
      { value: "combination", label: "A combination of the above duties, requiring the same level of skills" },
      { value: "none", label: "None of the above accurately describe this employee's primary duties (e.g., hardware repair, help desk support, QA manual testing, using software as a tool)" }
    ],
    skipIf: (a) => a.comp_role === "no" || a.comp_salary === "no"
  });

  /* Q8: comp_independent */
  questions.push({
    id: "comp_independent",
    exemption: "Computer",
    stageIdx: 2,
    label: "Does this employee work independently, without close supervision, using a high level of skill and expertise?",
    text: "The exemption does not apply to entry-level employees who have not yet attained the skill level needed to work independently. Consider: does this person make independent technical decisions, or do they primarily follow detailed instructions from a senior engineer?",
    help: "Junior/entry-level developers who work under close supervision and primarily implement detailed specifications written by others may not qualify.",
    why: "Both federal and state (especially California) exemptions require the employee to be highly skilled and capable of independent work. This is where many junior roles fail the test.",
    options: [
      { value: "yes", label: "Yes, works independently with high-level skills and expertise" },
      { value: "partial", label: "Somewhat, has developing skills but still requires significant supervision on major decisions" },
      { value: "no", label: "No, this is an entry-level or closely supervised role" }
    ],
    skipIf: (a) => a.comp_role === "no" || a.comp_salary === "no" || a.comp_duties === "none"
  });

  /* Q9: admin_salary */
  questions.push({
    id: "admin_salary",
    exemption: "Administrative",
    stageIdx: 3,
    label: "Does this employee meet the salary threshold for the administrative exemption?",
    text: adminSalaryText,
    help: "The employee must be paid on a salary basis (predetermined, fixed amount not subject to reduction for quality/quantity of work).",
    why: "This is the first of three tests for the administrative exemption: salary basis, salary level, and duties.",
    options: [
      { value: "yes", label: "Yes, meets the applicable salary threshold" },
      { value: "no", label: "No, does not meet the threshold" }
    ],
    autoAnswer: _autoAdminProfExecSalary(baseSalary, threshold, payBasis)
  });

  /* Q10: admin_biz_ops */
  questions.push({
    id: "admin_biz_ops",
    exemption: "Administrative",
    stageIdx: 3,
    label: "Is this employee's primary duty the performance of office or non-manual work directly related to the MANAGEMENT or GENERAL BUSINESS OPERATIONS of the employer (or its customers)?",
    text: "This is the critical distinction: \"business operations\" means work that supports RUNNING the business (HR, finance, legal, compliance, marketing, IT administration, risk management, government relations), NOT work that IS the business's core product or service.\n\nFor a fintech company: building blockchain infrastructure and crypto products IS the core product. People who build the product are generally on the \"production\" side. People who run the business around the product (HR, legal, finance, ops, compliance) are on the \"admin\" side.",
    help: "Examples that typically qualify: HR Business Partner, Finance Manager, Compliance Officer, Marketing Director, Office Manager, Legal Counsel, Procurement Lead.\n\nExamples that typically do NOT qualify: Software Engineer (production), Customer Support Agent (production), QA Tester (production), Sales Development Rep (production).",
    why: "Courts and the DOL draw a sharp line between \"running the business\" and \"making the product.\" This distinction is where most administrative exemption misclassifications happen.",
    options: [
      { value: "yes", label: "Yes, primary duty relates to management/general business operations (e.g., HR, finance, legal, compliance, marketing, operations)" },
      { value: "customer_ops", label: "Primary duty relates to customers' management/business operations (e.g., consulting, advisory role serving client business needs)" },
      { value: "production", label: "No, primary duty is producing, selling, or directly delivering the company's core products/services" }
    ],
    skipIf: (a) => a.admin_salary === "no"
  });

  /* Q11: admin_state_restrict — conditional: only if strict admin state */
  if (STRICT_ADMIN_STATES.indexOf(stateKey) !== -1) {
    questions.push({
      id: "admin_state_restrict",
      exemption: "Administrative",
      stageIdx: 3,
      label: `${threshold.label}: Stricter Administrative Duties Test`,
      text: `In ${threshold.label}, the administrative exemption CANNOT be satisfied by duties that primarily relate to your customers. The primary duty must relate to the management or general business operations of THE EMPLOYER ITSELF. If you selected "customer operations" in the previous question, this employee likely does not qualify for the administrative exemption under state law.`,
      why: `${threshold.label} has a narrower interpretation of the administrative exemption than the federal standard. Under federal law, work related to a customer's management operations can qualify. Under ${threshold.label} law, it generally cannot.`,
      options: [
        { value: "acknowledged", label: "Understood, continue" }
      ],
      skipIf: (a) => a.admin_salary === "no" || a.admin_biz_ops === "production"
    });
  }

  /* Q12: admin_discretion */
  questions.push({
    id: "admin_discretion",
    exemption: "Administrative",
    stageIdx: 3,
    label: "Does this employee exercise discretion and independent judgment with respect to matters of significance?",
    text: "This means the employee has authority to make independent choices, free from immediate direction, on matters that are consequential to the business. Consider these specific indicators:",
    help: "✅ Signs the employee exercises D&IJ:\n• Can commit the company to significant financial expenditures\n• Has authority to negotiate and bind the company\n• Formulates or interprets company policies\n• Makes decisions that deviate from established patterns without prior approval\n• Carries out major assignments with only general instructions\n\n❌ Signs they do NOT:\n• Applies well-established techniques or procedures\n• Records or tabulates data\n• Performs mechanical or routine work\n• Simply follows detailed scripts or playbooks\n• Decisions are reviewed and overridden by supervisor before taking effect",
    why: "This is the second prong of the administrative duties test. Both the \"business operations\" prong AND this \"discretion and independent judgment\" prong must be met.",
    options: [
      { value: "yes", label: "Yes, this employee makes independent decisions on matters of significance without requiring approval" },
      { value: "limited", label: "Somewhat, exercises some judgment but most significant decisions require supervisor approval" },
      { value: "no", label: "No, this employee primarily follows established procedures, scripts, or direct instructions" }
    ],
    skipIf: (a) => a.admin_salary === "no" || a.admin_biz_ops === "production"
  });

  /* Q13: exec_salary */
  questions.push({
    id: "exec_salary",
    exemption: "Executive",
    stageIdx: 4,
    label: "Does this employee meet the salary threshold for the executive exemption?",
    text: eapSalaryText,
    why: "Same salary threshold as the administrative exemption.",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" }
    ],
    autoAnswer: _autoAdminProfExecSalary(baseSalary, threshold, payBasis)
  });

  /* Q14: exec_manage */
  questions.push({
    id: "exec_manage",
    exemption: "Executive",
    stageIdx: 4,
    label: "Is this employee's primary duty the management of the enterprise, or a customarily recognized department or subdivision?",
    text: "Management includes activities such as: interviewing, selecting, and training employees; setting and adjusting pay rates and hours; directing work; maintaining production records; appraising employees' productivity; handling complaints and grievances; disciplining employees; planning work; determining techniques to be used; apportioning work; monitoring legal compliance; controlling budgets.",
    help: "A \"customarily recognized department\" means a permanent unit with a recognized status in the organization, not just a temporary project team.",
    why: "The executive exemption is specifically for people in management roles. The \"primary duty\" must be management, not occasionally managing while primarily doing other work.",
    options: [
      { value: "yes", label: "Yes, management is the primary duty" },
      { value: "partial", label: "Employee manages but also performs substantial non-management work (working manager/player-coach)" },
      { value: "no", label: "No, this is not a management role" }
    ],
    skipIf: (a) => a.exec_salary === "no"
  });

  /* Q15: exec_reports */
  questions.push({
    id: "exec_reports",
    exemption: "Executive",
    stageIdx: 4,
    label: "Does this employee customarily and regularly direct the work of TWO or more full-time employees (or their equivalent)?",
    text: "Two full-time employees, or their equivalent (e.g., four half-time employees, one full-time + two half-time). The direction must be a regular part of the job, not just occasional supervision.",
    help: "Count actual direct reports whose work this person directs. Dotted-line reports may count if the employee exercises genuine supervisory authority.",
    why: "This is a hard numerical requirement. Without 2+ FTE direct reports, the executive exemption cannot apply.",
    options: [
      { value: "yes", label: "Yes, directs 2+ FTE direct reports" },
      { value: "no", label: "No, fewer than 2 FTE direct reports" }
    ],
    skipIf: (a) => a.exec_salary === "no" || a.exec_manage === "no"
  });

  /* Q16: exec_hire_fire */
  questions.push({
    id: "exec_hire_fire",
    exemption: "Executive",
    stageIdx: 4,
    label: "Does this employee have authority to hire or fire other employees, or are their recommendations on hiring, firing, advancement, or promotion given particular weight?",
    text: "\"Particular weight\" means the recommendations are part of the process and are considered seriously, even if not always followed. Factors include: whether making such recommendations is part of the job duties, the frequency of such recommendations, and whether the recommendations are usually followed.",
    why: "This is the third prong of the executive exemption duties test. All three prongs (management as primary duty, 2+ FTE reports, and hire/fire authority) must be met.",
    options: [
      { value: "yes", label: "Yes, has hire/fire authority OR recommendations carry particular weight" },
      { value: "no", label: "No, has no meaningful input into personnel decisions" }
    ],
    skipIf: (a) => a.exec_salary === "no" || a.exec_manage === "no" || a.exec_reports === "no"
  });

  /* Q17: prof_salary */
  questions.push({
    id: "prof_salary",
    exemption: "Professional",
    stageIdx: 5,
    label: "Does this employee meet the salary threshold for the learned professional exemption?",
    text: eapSalaryText,
    why: "Same salary threshold as other EAP exemptions.",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" }
    ],
    autoAnswer: _autoAdminProfExecSalary(baseSalary, threshold, payBasis)
  });

  /* Q18: prof_advanced */
  questions.push({
    id: "prof_advanced",
    exemption: "Professional",
    stageIdx: 5,
    label: "Does this employee's primary duty require advanced knowledge in a field of science or learning?",
    text: "\"Advanced knowledge\" means work that is predominantly intellectual in character, requiring consistent exercise of discretion and judgment, in a field where specialized academic training is a standard prerequisite for entry.\n\nTypical qualifying fields: law, medicine, accounting (CPA), actuarial science, engineering (licensed PE), architecture, certain credentialed compliance/risk roles.",
    help: "The knowledge must be customarily acquired through a prolonged course of specialized intellectual instruction, typically a 4-year degree or advanced degree in the specific field. General business degrees typically do not qualify unless the role specifically requires that specialized knowledge.",
    why: "This exemption is narrower than people expect. Having a college degree is not enough. The degree must be in a specific specialized field, and that specific knowledge must be essential to performing the job.",
    options: [
      { value: "yes", label: "Yes, requires specialized academic training (JD, CPA, licensed engineer, MD, etc.)" },
      { value: "maybe", label: "Requires a degree in a specific field but the field is not traditionally a \"learned profession\"" },
      { value: "no", label: "No, role does not require specialized academic credentials" }
    ],
    skipIf: (a) => a.prof_salary === "no"
  });

  /* Q19: sales_check */
  questions.push({
    id: "sales_check",
    exemption: "Sales",
    stageIdx: 5,
    label: "Does this role involve sales or business development?",
    text: "The outside sales exemption has NO salary requirement but has strict duties requirements. It only applies if the employee's primary duty is making sales or obtaining orders/contracts AWAY from the employer's place of business.",
    help: "This exemption is rare in a fintech company but could apply to field sales roles. Inside sales (phone/email/remote selling from an office) does NOT qualify.",
    why: "We ask this to determine if the outside sales exemption should be evaluated.",
    options: [
      { value: "yes", label: "Yes, this is a sales or BD role" },
      { value: "no", label: "No" }
    ]
  });

  /* Q20: sales_outside */
  questions.push({
    id: "sales_outside",
    exemption: "Sales",
    stageIdx: 5,
    label: "Is this employee's primary duty making sales or obtaining orders/contracts AWAY from the employer's place(s) of business?",
    text: "\"Away from the employer's place of business\" means in the field, at customer locations, traveling to meet clients. Work done from home or an office, including remote selling by phone or video, does NOT count as \"away from the employer's place of business.\"",
    why: "This is the critical test. Inside sales reps, SDRs, account managers who work from an office, and remote sellers do not qualify regardless of how much revenue they generate.",
    options: [
      { value: "yes", label: "Yes, primarily selling in the field at customer locations" },
      { value: "no", label: "No, primarily sells from office, home, or via phone/video" }
    ],
    skipIf: (a) => a.sales_check === "no"
  });

  return questions;
}
