/* Regulatory Landscape content. Verbatim from spec/07-memo-output.md.
   Update the Trump DOL narrative when new rulemaking is proposed or
   finalized. Update the Biden 2024 rule narrative when it becomes more
   distant history. Bump TOOL_VERSION_DATE in constants.js after any edit. */

const REGULATORY_CONTENT = {
  federal: [
    {
      title: "Current Federal Thresholds (2019 Rule, Reinstated)",
      body: "EAP salary minimum: $684/week ($35,568/year). HCE total compensation: $107,432/year. Computer employee hourly alternative: $27.63/hour. These have been in effect since the Biden DOL's 2024 overtime rule was vacated in its entirety by a federal court in Texas on November 15, 2024."
    },
    {
      title: "Biden 2024 Overtime Rule, Struck Down",
      body: "The April 2024 final rule would have raised EAP thresholds to $1,128/week ($58,656/year) and HCE to $151,164/year by January 1, 2025. A federal judge in the Eastern District of Texas found the DOL exceeded its authority by displacing the duties-based test with a predominantly salary-based test. The ruling reversed both the July 2024 increase ($844/week) and the planned January 2025 increase, reverting everything to 2019 levels."
    },
    {
      title: "Federal Rulemaking, Active Pipeline",
      body: "The DOL's active rulemaking pipeline at this tool's last legal review included proposed rules on overtime salary thresholds, independent contractor classification, and joint employer standards. Specific proposed/final rule dates change frequently; verify the current Reginfo Unified Agenda and any open NPRM comment periods before relying on \"current\" rules. Historically, the Trump DOL has favored modest threshold increases (the 2019 rule raised the EAP threshold from $455/week to $684/week). Any new rule goes through notice-and-comment rulemaking — typically 12+ months from proposal to implementation."
    },
    {
      title: "Qualified Overtime Deduction (One Big Beautiful Bill Act, 2025)",
      body: "The 2025 OBBBA created a federal qualified overtime deduction that allows non-exempt employees to deduct a portion of overtime premium pay for tax years 2025-2028 (the temporary window). Verify the current IRS guidance on caps, phaseouts, and substantiation. This is a TAX rule, not a wage-and-hour rule — it does NOT change FLSA classification, the salary-basis test, or the duties tests. It does affect take-home pay calculations for non-exempt employees and may interact with payroll system reporting (W-2 Box 14 / equivalent). Confirm payroll provider has implemented the deduction before relying on this in employee-facing communications."
    }
  ],
  state: [
    {
      title: "Auto-Adjusting State Thresholds (Check Annually in Q4)",
      body: "California, Colorado, New York, Washington, and Maine all tie their salary thresholds to minimum wage increases. These adjust on January 1 each year. Always verify Q4 announcements for the following year's rates."
    },
    {
      title: "California SB 642, Expanded Pay Transparency (Effective 2026)",
      body: "Broadens the definition of \"wages\" and \"wage rates\" for pay transparency purposes to include salary, overtime pay, bonuses, stock options, profit sharing, life insurance, vacation/holiday pay, and benefits. Job postings for exempt roles must include all forms of compensation, not just base salary. The limitations period for claims expanded from 2 to 3 years."
    },
    {
      title: "States That Do NOT Recognize the Federal HCE Shortcut",
      body: "California, Connecticut, and Washington reject the federal HCE reduced-duties test. Employees in those states must meet the full duties test regardless of compensation. CA's stricter \"primarily engaged\" rule (Labor Code §515) and WA's L&I duties test override the federal HCE pathway. Connecticut does not recognize HCE at all."
    },
    {
      title: "Colorado HCE Has Its Own Higher Threshold",
      body: "Colorado COMPS Order #40 recognizes the HCE exemption but at $130,014/year (2.25 × the CO EAP threshold of $57,784) — substantially higher than the federal $107,432. The more-protective standard wins, so a CO HCE classification requires meeting the CO threshold."
    },
    {
      title: "New York Learned Professional, No State Salary Minimum",
      body: "New York's executive and administrative exemptions require the state EAP threshold ($1,275/week NYC; $1,199.10/week rest-of-state). The learned professional exemption has NO state salary minimum — only the federal $684/week applies. A $50K NY pharmacist still meets the salary test even though they fall below NY's exec/admin threshold."
    },
    {
      title: "New York & Oregon, Stricter Administrative Exemption",
      body: "The administrative exemption in these states cannot be satisfied by customer-facing duties alone. The employee's primary duty must relate to the management or general business operations of the employer itself."
    },
    {
      title: "Newly-Encoded State Overlays (NJ, MA, IL, PA, MN)",
      body: "These states mirror the federal salary level but each has its own statutory framework: New Jersey (NJWHL), Massachusetts (Wage Act), Illinois (IMWL — note Cook County / Chicago wage ordinances apply locally), Pennsylvania (PMWA — stricter fluctuating-workweek rules), and Minnesota (MFLSA — OT after 48 hrs/week for some employers). The tool applies federal-default rules; consult counsel for industry-specific carve-outs."
    }
  ]
};
