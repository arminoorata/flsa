# 04 — Data Model

This document defines all data structures, threshold values, and constants used by the tool. All values are current as of April 2026.

---

## Threshold Data

### Federal Thresholds

These values have been in effect since the November 15, 2024 Texas court ruling that vacated the Biden 2024 DOL rule. They revert to the Trump 2019 rule values.

| Threshold | Weekly | Annual | Source |
|-----------|--------|--------|--------|
| EAP salary minimum | $684 | $35,568 | 29 C.F.R. § 541.600 |
| HCE total compensation | N/A | $107,432 | 29 C.F.R. § 541.601 |
| Computer employee hourly alternative | N/A | N/A | $27.63/hour per 29 C.F.R. § 541.400(b) |

**Notes on calculations:**
- Weekly × 52 ≈ Annual (minor rounding)
- HCE must include at least $684/week on salary/fee basis; remainder can be nondiscretionary bonuses, commissions
- Computer employees can meet the salary OR hourly test (either is sufficient)

### State Thresholds (2026)

The following states have thresholds higher than federal or have special rules. These values are effective January 1, 2026.

#### California

| Rule | Value | Source |
|------|-------|--------|
| EAP weekly minimum | $1,352 | 2x minimum wage ($16.90/hr) × 40 hrs |
| EAP annual minimum | $70,304 | Weekly × 52 |
| Computer software employee annual | $122,573.13 | CA Labor Code § 515.5(a)(4); DIR annual adjustment |
| Computer software employee monthly | $10,214.44 | Annual ÷ 12 |
| Computer software employee hourly | $58.85 | CA Labor Code § 515.5(a)(1) |
| Physician/surgeon hourly | $107.17 | CA Labor Code § 515.6 |

**California-specific rules:**
- **Daily OT:** Overtime required for hours >8 in a day AND >40 in a week (Cal. Labor Code § 510)
- **Double time:** Required for >12 hours in a day, and >8 hours on 7th consecutive day
- **50%+ time duties test:** Unlike federal "primary duty" qualitative test, CA requires employees to spend MORE THAN HALF their time on exempt duties (8 CCR §§ 11010-11170)
- **No HCE exemption equivalent:** CA requires full duties test regardless of comp

#### Colorado

| Rule | Value | Source |
|------|-------|--------|
| EAP weekly minimum | $1,111.23 | COMPS Order #38 |
| EAP annual minimum | $57,784 | Weekly × 52 |
| Computer employee weekly salary | $1,111.23 | Same as EAP |
| Computer employee hourly | $34.85 | COMPS Order |

**Colorado-specific rules:**
- **Daily OT:** Overtime required for >12 hours in a day OR >40 hours in a week (different from CA's 8-hour trigger)
- **Computer exemption:** Additional duties requirements beyond federal

#### New York

New York has regional salary threshold variation:

**New York City, Nassau County, Suffolk County, Westchester County:**

| Rule | Value | Source |
|------|-------|--------|
| EAP weekly minimum | $1,275.00 | 12 NYCRR 142-2.14 |
| EAP annual minimum | $66,300 | Weekly × 52 |

**Rest of New York State:**

| Rule | Value | Source |
|------|-------|--------|
| EAP weekly minimum | $1,199.10 | 12 NYCRR 142-2.14 |
| EAP annual minimum | $62,353 | Weekly × 52 |

**New York rules:**
- **No state computer employee exemption:** Falls back to federal rules for computer workers
- **Strict administrative test:** Admin exemption cannot be satisfied by customer-facing work; primary duty must relate to EMPLOYER'S own management/operations
- **Professional exemption:** Has duties tests but NO separate state salary minimum (falls back to federal $684/week)

#### Washington

| Rule | Value | Source |
|------|-------|--------|
| EAP weekly minimum | $1,541.70 | WAC 296-128-532 |
| EAP annual minimum | $80,168 | Weekly × 52 |
| Computer professional hourly | $59.96 | WAC 296-128-535 |

Washington has the highest EAP threshold in the US.

#### Connecticut

| Rule | Value | Source |
|------|-------|--------|
| EAP weekly minimum | $684 (federal) | CT follows federal on salary |
| HCE exemption | NOT RECOGNIZED | Conn. Gen. Stat. § 31-60 |

Connecticut's key quirk: **does not recognize the HCE exemption.** CT employees must meet a full duties test regardless of compensation.

#### Maine

| Rule | Value | Source |
|------|-------|--------|
| EAP weekly minimum | $871.16 | 26 M.R.S. § 664 |
| EAP annual minimum | $45,300 | Weekly × 52 |

Maine's threshold adjusts with minimum wage increases.

#### Oregon

| Rule | Value | Source |
|------|-------|--------|
| EAP weekly minimum | $684 (federal) | ORS 653.020 |

Oregon does not set a separate salary threshold but has the same strict administrative duties test as New York: customer-facing work cannot satisfy the admin exemption.

### States Using Federal Standards

All other states default to federal standards. If an employee works in a state not listed above, the tool should apply federal thresholds but include a risk flag: "Verify whether the state has its own requirements."

---

## Data Structure Specification

### Threshold Object Schema

Each jurisdiction's threshold data must be stored as a structured object with the following fields:

```
{
  label: string,                    // Human-readable name, e.g., "California"
  eapWeekly: number,                // Weekly EAP salary threshold
  eapAnnual: number,                // Annual EAP salary threshold
  computer: string,                 // Human-readable computer employee threshold, e.g., "$122,573.13/yr or $58.85/hr"
  computerSalaryAnnual: number|null, // Numeric annual value, null if no state-specific
  computerHourly: number|null,      // Numeric hourly value, null if no state-specific
  hce: number|null,                 // Annual HCE threshold, null if not recognized
  notes: string                     // Brief notes about state-specific rules
}
```

The `notes` field is displayed in the Regulatory Landscape reference table. It should be 1-2 short sentences highlighting the most important state-specific rule.

### Threshold Data: Complete JSON Reference

```json
{
  "federal": {
    "label": "Federal",
    "eapWeekly": 684,
    "eapAnnual": 35568,
    "computer": "$684/wk or $27.63/hr",
    "computerSalaryAnnual": 35568,
    "computerHourly": 27.63,
    "hce": 107432,
    "notes": "2019 rule (reinstated after Nov 2024 court ruling)"
  },
  "california": {
    "label": "California",
    "eapWeekly": 1352,
    "eapAnnual": 70304,
    "computer": "$122,573.13/yr or $58.85/hr",
    "computerSalaryAnnual": 122573.13,
    "computerHourly": 58.85,
    "hce": 107432,
    "notes": "Daily OT (>8hrs/day). 50%+ time duties test."
  },
  "colorado": {
    "label": "Colorado",
    "eapWeekly": 1111.23,
    "eapAnnual": 57784,
    "computer": "$1,111.23/wk or $34.85/hr",
    "computerSalaryAnnual": 57784,
    "computerHourly": 34.85,
    "hce": 107432,
    "notes": "OT after 12hrs/day OR 40hrs/week."
  },
  "connecticut": {
    "label": "Connecticut",
    "eapWeekly": 684,
    "eapAnnual": 35568,
    "computer": "N/A",
    "computerSalaryAnnual": null,
    "computerHourly": null,
    "hce": null,
    "notes": "Does NOT recognize HCE exemption."
  },
  "maine": {
    "label": "Maine",
    "eapWeekly": 871.16,
    "eapAnnual": 45300,
    "computer": "N/A",
    "computerSalaryAnnual": null,
    "computerHourly": null,
    "hce": 107432,
    "notes": "Threshold exceeds federal."
  },
  "new_york_nyc": {
    "label": "New York (NYC/Nassau/Suffolk/Westchester)",
    "eapWeekly": 1275,
    "eapAnnual": 66300,
    "computer": "N/A",
    "computerSalaryAnnual": null,
    "computerHourly": null,
    "hce": 107432,
    "notes": "Admin exemption: must relate to employer ops, not customer work."
  },
  "new_york_other": {
    "label": "New York (rest of state)",
    "eapWeekly": 1199.10,
    "eapAnnual": 62353,
    "computer": "N/A",
    "computerSalaryAnnual": null,
    "computerHourly": null,
    "hce": 107432,
    "notes": "Same admin restriction as NYC."
  },
  "washington": {
    "label": "Washington",
    "eapWeekly": 1541.70,
    "eapAnnual": 80168,
    "computer": "$59.96/hr",
    "computerSalaryAnnual": null,
    "computerHourly": 59.96,
    "hce": 107432,
    "notes": "Highest EAP threshold in the US."
  },
  "oregon": {
    "label": "Oregon",
    "eapWeekly": 684,
    "eapAnnual": 35568,
    "computer": "N/A",
    "computerSalaryAnnual": null,
    "computerHourly": null,
    "hce": 107432,
    "notes": "Stricter admin duties test (no customer-facing)."
  }
}
```

### States List

The state dropdown must include all 50 US states, DC, and New York split into two entries. Here is the complete list in alphabetical order:

```
[
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico",
  "New York (NYC/Nassau/Suffolk/Westchester)", "New York (rest of state)",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"
]
```

### State-to-Threshold Mapping

When the user selects a state from the dropdown, the tool must look up the corresponding threshold key. States not in this mapping use `federal`:

```json
{
  "California": "california",
  "Colorado": "colorado",
  "Connecticut": "connecticut",
  "Maine": "maine",
  "New York (NYC/Nassau/Suffolk/Westchester)": "new_york_nyc",
  "New York (rest of state)": "new_york_other",
  "Washington": "washington",
  "Oregon": "oregon"
}
```

---

## Constants

### FEDERAL_HCE_THRESHOLD

```
FEDERAL_HCE_THRESHOLD = 107432
```

Used throughout the tool for HCE salary comparisons. Defined as a constant to ensure consistency.

### STRICT_ADMIN_STATES

States where the administrative exemption cannot be satisfied by customer-facing work:

```
STRICT_ADMIN_STATES = ["new_york_nyc", "new_york_other", "oregon"]
```

### TOOL_VERSION_DATE

```
TOOL_VERSION_DATE = "April 14, 2026"
```

Displayed in the header and memo. Must be updated whenever the tool content is revised.

### Stages

Progress bar stage labels:

```
STAGES = [
  "Employee Info",
  "HCE",
  "Computer Employee",
  "Administrative",
  "Executive",
  "Professional",
  "Results"
]
```

Note: Outside Sales questions are part of the Professional stage in the UI, though they test a separate exemption.

---

## Employee Data Structure

During a classification session, the tool tracks employee data in this structure:

```
{
  classType: string,        // "new_hire" or "reclass"
  empName: string,          // Optional
  jobTitle: string,
  department: string,       // Optional
  workState: string,        // State name as in dropdown
  baseSalary: number,
  totalComp: number,        // Defaults to baseSalary if blank
  hourlyRate: number|null   // Null if salaried
}
```

## Answer Data Structure

As the user progresses through questions, answers are stored in a flat object keyed by question ID:

```
{
  hce_start: "yes",
  hce_office: "yes",
  hce_one_duty: "manages",
  comp_role: "yes",
  comp_salary: "yes",
  // ... etc
}
```

Question IDs are defined in `05-decision-tree.md`. Values are strings matching the `value` field of the selected option.

## Evaluation Result Structure

After all answers are collected, the tool produces a results object with one entry per exemption:

```
{
  hce: {
    status: "pass"|"fail"|"warn"|"skip",
    title: string,        // e.g., "Highly Compensated Employee (HCE)"
    summary: string,      // Human-readable summary
    details: string[]     // Array of test outcomes, e.g., ["Salary test: PASS", "Duties test: FAIL"]
  },
  computer: { ... },
  admin: { ... },
  executive: { ... },
  professional: { ... },
  sales: { ... }
}
```

Status meanings:
- **pass:** Employee meets all requirements for this exemption
- **fail:** Employee does not meet one or more requirements
- **warn:** Employee has uncertain/borderline status
- **skip:** Exemption not applicable to this role (e.g., Computer for a non-technical employee)

---

## Regulatory Content Data

Content for the Regulatory Landscape tab, structured as two arrays:

```
{
  federal: [
    { title: string, body: string },
    ...
  ],
  state: [
    { title: string, body: string },
    ...
  ]
}
```

Complete verbatim content for this is in `07-memo-output.md` (section: "Regulatory Landscape Tab Content").

---

## Data File Organization

All data should be stored in separate files (or modules, depending on stack) organized by concern:

1. **thresholds data:** Jurisdiction threshold objects (updated annually)
2. **states data:** States list and state-to-threshold mapping
3. **questions data:** Decision tree questions (updated when laws change)
4. **regulatory content:** Regulatory landscape narrative (updated when regs change)
5. **constants:** Tool-wide constants (TOOL_VERSION_DATE, FEDERAL_HCE_THRESHOLD, etc.)

Rationale: Each of these changes at a different cadence and by different stakeholders. Thresholds change annually (Q4 update for January 1 effective). Regulatory narrative changes when major court decisions or rule proposals happen. Questions change rarely (only when law substantively changes). Keeping them separate enables targeted updates without touching logic.

Continue to `05-decision-tree.md`.
