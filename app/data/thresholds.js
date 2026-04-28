/* Jurisdiction threshold data. Values current as of April 2026.
   Updated annually in Q4 for January 1 effective dates. See spec/09.

   Per-state flags:
     hceApplicable: false  → state rejects the federal HCE shortcut
                              (its duties test is more protective)
     noStateProSalary: true → state has no minimum salary for the
                              learned-professional exemption (federal
                              $684/wk applies; state EAP threshold does
                              NOT apply to professionals) */

const THRESHOLDS = {
  federal: {
    label: "Federal",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "$684/wk or $27.63/hr",
    computerSalaryAnnual: 35568,
    computerHourly: 27.63,
    hce: 107432,
    hceApplicable: true,
    noStateProSalary: false,
    notes: "2019 rule (reinstated after Nov 2024 court ruling)"
  },
  california: {
    label: "California",
    eapWeekly: 1352,
    eapAnnual: 70304,
    computer: "$122,573.13/yr or $58.85/hr",
    computerSalaryAnnual: 122573.13,
    computerHourly: 58.85,
    hce: null,
    hceApplicable: false,
    noStateProSalary: false,
    notes: "Daily OT (>8hrs/day). 50%+ time duties test. NO HCE exemption equivalent — federal HCE shortcut does not apply because CA Labor Code §515 requires \"primarily engaged\" (50%+ time on exempt duties)."
  },
  colorado: {
    label: "Colorado",
    eapWeekly: 1111.23,
    eapAnnual: 57784,
    computer: "$1,111.23/wk or $34.85/hr",
    computerSalaryAnnual: 57784,
    computerHourly: 34.85,
    hce: 130014,
    hceApplicable: true,
    noStateProSalary: false,
    notes: "OT after 12hrs/day OR 40hrs/week. CO COMPS Order #40 recognizes a state HCE exemption at $130,014/yr (2.25 × $57,784 EAP threshold) — the more-protective standard wins, so a CO HCE classification requires meeting the CO threshold, not just the federal $107,432."
  },
  connecticut: {
    label: "Connecticut",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "N/A",
    computerSalaryAnnual: null,
    computerHourly: null,
    hce: null,
    hceApplicable: false,
    noStateProSalary: false,
    notes: "Does NOT recognize HCE exemption."
  },
  illinois: {
    label: "Illinois",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "$684/wk or $27.63/hr (same as federal)",
    computerSalaryAnnual: 35568,
    computerHourly: 27.63,
    hce: 107432,
    hceApplicable: true,
    noStateProSalary: false,
    notes: "IMWL mirrors federal salary level. Cook County / Chicago have local minimum wage ordinances that may affect non-exempt OT calculations but do NOT raise the EAP threshold."
  },
  maine: {
    label: "Maine",
    eapWeekly: 871.16,
    eapAnnual: 45300,
    computer: "N/A",
    computerSalaryAnnual: null,
    computerHourly: null,
    hce: 107432,
    hceApplicable: true,
    noStateProSalary: false,
    notes: "Threshold exceeds federal."
  },
  massachusetts: {
    label: "Massachusetts",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "$684/wk or $27.63/hr (same as federal)",
    computerSalaryAnnual: 35568,
    computerHourly: 27.63,
    hce: 107432,
    hceApplicable: true,
    noStateProSalary: false,
    notes: "Massachusetts Wage Act mirrors federal salary level. Sunday/holiday premium pay rules eliminated 2023. State-specific blue-law overtime applies separately."
  },
  minnesota: {
    label: "Minnesota",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "$684/wk or $27.63/hr (same as federal)",
    computerSalaryAnnual: 35568,
    computerHourly: 27.63,
    hce: 107432,
    hceApplicable: true,
    noStateProSalary: false,
    notes: "Minnesota Fair Labor Standards Act mirrors federal salary level. State-specific OT after 48 hrs/week for some employers under MFLSA, but EAP duties tests align with federal."
  },
  new_jersey: {
    label: "New Jersey",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "$684/wk or $27.63/hr (same as federal)",
    computerSalaryAnnual: 35568,
    computerHourly: 27.63,
    hce: 107432,
    hceApplicable: true,
    noStateProSalary: false,
    notes: "NJWHL mirrors federal salary level. NJ courts apply federal duties tests. Some industry-specific exclusions differ (no exemption for some hospital and food-service workers)."
  },
  new_york_nyc: {
    label: "New York (NYC/Nassau/Suffolk/Westchester)",
    eapWeekly: 1275,
    eapAnnual: 66300,
    computer: "N/A",
    computerSalaryAnnual: null,
    computerHourly: null,
    hce: 107432,
    hceApplicable: true,
    noStateProSalary: true,
    notes: "Admin exemption: must relate to employer ops, not customer work. Learned-Professional exemption has NO state salary minimum — federal $684/wk applies to professionals only."
  },
  new_york_other: {
    label: "New York (rest of state)",
    eapWeekly: 1199.10,
    eapAnnual: 62353,
    computer: "N/A",
    computerSalaryAnnual: null,
    computerHourly: null,
    hce: 107432,
    hceApplicable: true,
    noStateProSalary: true,
    notes: "Same admin restriction as NYC. Learned-Professional exemption has NO state salary minimum — federal $684/wk applies to professionals only."
  },
  pennsylvania: {
    label: "Pennsylvania",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "$684/wk or $27.63/hr (same as federal)",
    computerSalaryAnnual: 35568,
    computerHourly: 27.63,
    hce: 107432,
    hceApplicable: true,
    noStateProSalary: false,
    notes: "PMWA threshold reverted to federal level after 2021 increases were repealed. PMWA duties tests in some areas (e.g., fluctuating workweek) are stricter than federal — verify FWW arrangements separately."
  },
  washington: {
    label: "Washington",
    eapWeekly: 1541.70,
    eapAnnual: 80168,
    computer: "$1,541.70/wk ($80,168/yr) salary or $59.96/hr",
    computerSalaryAnnual: 80168,
    computerHourly: 59.96,
    hce: null,
    hceApplicable: false,
    noStateProSalary: false,
    notes: "Highest EAP threshold in the US. WA L&I (WAC 296-128-535) recognizes salary-basis computer professionals at the same salary level as other EAP exemptions; the hourly alternative is $59.96/hr. NO state HCE shortcut — WA L&I requires the full duties test for the EAP exemption regardless of total compensation."
  },
  oregon: {
    label: "Oregon",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "N/A",
    computerSalaryAnnual: null,
    computerHourly: null,
    hce: 107432,
    hceApplicable: true,
    noStateProSalary: false,
    notes: "Stricter admin duties test (no customer-facing)."
  }
};
