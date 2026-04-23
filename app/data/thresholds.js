/* Jurisdiction threshold data. Values current as of April 2026.
   Updated annually in Q4 for January 1 effective dates. See spec/09. */

const THRESHOLDS = {
  federal: {
    label: "Federal",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "$684/wk or $27.63/hr",
    computerSalaryAnnual: 35568,
    computerHourly: 27.63,
    hce: 107432,
    notes: "2019 rule (reinstated after Nov 2024 court ruling)"
  },
  california: {
    label: "California",
    eapWeekly: 1352,
    eapAnnual: 70304,
    computer: "$122,573.13/yr or $58.85/hr",
    computerSalaryAnnual: 122573.13,
    computerHourly: 58.85,
    hce: 107432,
    notes: "Daily OT (>8hrs/day). 50%+ time duties test."
  },
  colorado: {
    label: "Colorado",
    eapWeekly: 1111.23,
    eapAnnual: 57784,
    computer: "$1,111.23/wk or $34.85/hr",
    computerSalaryAnnual: 57784,
    computerHourly: 34.85,
    hce: 107432,
    notes: "OT after 12hrs/day OR 40hrs/week."
  },
  connecticut: {
    label: "Connecticut",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "N/A",
    computerSalaryAnnual: null,
    computerHourly: null,
    hce: null,
    notes: "Does NOT recognize HCE exemption."
  },
  maine: {
    label: "Maine",
    eapWeekly: 871.16,
    eapAnnual: 45300,
    computer: "N/A",
    computerSalaryAnnual: null,
    computerHourly: null,
    hce: 107432,
    notes: "Threshold exceeds federal."
  },
  new_york_nyc: {
    label: "New York (NYC/Nassau/Suffolk/Westchester)",
    eapWeekly: 1275,
    eapAnnual: 66300,
    computer: "N/A",
    computerSalaryAnnual: null,
    computerHourly: null,
    hce: 107432,
    notes: "Admin exemption: must relate to employer ops, not customer work."
  },
  new_york_other: {
    label: "New York (rest of state)",
    eapWeekly: 1199.10,
    eapAnnual: 62353,
    computer: "N/A",
    computerSalaryAnnual: null,
    computerHourly: null,
    hce: 107432,
    notes: "Same admin restriction as NYC."
  },
  washington: {
    label: "Washington",
    eapWeekly: 1541.70,
    eapAnnual: 80168,
    computer: "$59.96/hr",
    computerSalaryAnnual: null,
    computerHourly: 59.96,
    hce: 107432,
    notes: "Highest EAP threshold in the US."
  },
  oregon: {
    label: "Oregon",
    eapWeekly: 684,
    eapAnnual: 35568,
    computer: "N/A",
    computerSalaryAnnual: null,
    computerHourly: null,
    hce: 107432,
    notes: "Stricter admin duties test (no customer-facing)."
  }
};
