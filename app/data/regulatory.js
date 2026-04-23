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
      title: "Trump DOL, Long-Term Rulemaking Planned",
      body: "The Trump DOL's Spring 2025 regulatory agenda listed overtime rulemaking as a \"long-term\" project with no specific proposed rule date. Historically, the Trump DOL has favored modest increases (the 2019 rule raised the threshold from $455/week to $684/week). Any new rule would go through notice-and-comment rulemaking, meaning 12+ months from proposal to implementation. Also on the agenda: proposed rules on independent contractor classification (September 2025 target) and joint employer standards (December 2025 target)."
    },
    {
      title: "Overtime Tax Proposal",
      body: "Trump proposed eliminating taxes on overtime pay during his 2024 campaign. No legislation has been enacted. If passed, this would not change classification rules but would affect take-home pay calculations for non-exempt employees."
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
      title: "States That Do NOT Recognize HCE Exemption",
      body: "Connecticut does not recognize the federal highly compensated employee exemption. Employees in CT must meet the full duties test regardless of compensation. Verify other states as laws evolve."
    },
    {
      title: "New York & Oregon, Stricter Administrative Exemption",
      body: "The administrative exemption in these states cannot be satisfied by customer-facing duties alone. The employee's primary duty must relate to the management or general business operations of the employer itself."
    }
  ]
};
