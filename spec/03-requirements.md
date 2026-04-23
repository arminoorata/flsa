# 03 — Requirements

This document specifies WHAT the tool must do, not how to build it. Implementation details are in `08-ui-and-architecture.md`.

---

## Functional Requirements

### FR-1: Two-Tab Interface

The tool must provide exactly two top-level views, selectable via tabs:

1. **Classification Questionnaire tab** (default view)
2. **Regulatory Landscape tab**

Tabs must persist the user's position when switched (i.e., switching to Regulatory and back does not reset the questionnaire).

### FR-2: Employee Information Intake

Before beginning the questionnaire, the tool must collect the following employee information:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Classification Type | Dropdown | Yes | "New Hire Classification" or "Reclassification Review" |
| Employee Name or Role Title | Text | No | Displayed in memo |
| Job Title | Text | Yes | Displayed in memo |
| Department | Text | No | Displayed in memo |
| Primary Work State | Dropdown | Yes | All 50 US states + DC; NY split into NYC region vs. rest |
| Annual Base Salary | Number (USD) | Yes | Used for threshold comparisons |
| Total Annual Compensation | Number (USD) | No | Used for HCE test; if blank, defaults to base salary |
| Hourly Rate | Number (USD) | No | For hourly workers; computer exemption can use hourly threshold |

**Minimum required fields** to proceed: Classification Type, Job Title, Primary Work State, Annual Base Salary.

If Total Annual Compensation is blank, the tool must treat it as equal to Base Salary for HCE purposes.

### FR-3: Decision Tree Questionnaire

The tool must present a sequential questionnaire testing six exemption categories in this order:

1. Highly Compensated Employee (HCE)
2. Computer Employee
3. Administrative
4. Executive
5. Learned Professional
6. Outside Sales

For each exemption, the tool must:

- Present a series of yes/no or multiple-choice questions
- Skip subsequent questions within an exemption when an early gate fails (e.g., if salary fails, don't ask about duties)
- Still evaluate and record the result (FAIL) for the skipped exemption
- Allow the user to go back and change previous answers
- Show a progress indicator

Complete question text, options, and skip logic are in `05-decision-tree.md`.

### FR-4: Auto-Detection of Threshold Answers

When the tool can mechanically determine an answer from previously-entered data, it must pre-select the answer while allowing the user to override. Specifically:

- **HCE salary test:** If Total Annual Compensation ≥ $107,432, pre-select "Yes"; otherwise pre-select "No"
- **EAP salary tests:** The tool shows the applicable threshold in the question text; the user confirms

Auto-detection must be visually distinct (e.g., a banner stating "Auto-detected based on data entered"). The user must be able to change the answer.

### FR-5: State-Specific Question Branching

Based on the work state entered, the tool must dynamically include or modify questions:

- **Connecticut:** Add a question informing the user that CT does not recognize HCE exemption
- **New York, Oregon:** Add a question noting the strict administrative exemption (no customer-facing work)
- **California, Colorado, Washington:** Modify the computer employee salary test to include the applicable state threshold

See `05-decision-tree.md` for exact text.

### FR-6: Inline Explanatory Content

Every question must include:

- **Main question text** (the question itself, verbatim as specified)
- **Detailed explanation** (2-5 sentences clarifying what's being asked)
- **Optional "Help" content** (extended guidance with examples, displayed below the main text)
- **Optional "Why are we asking this?" toggle** (collapsible explanation of legal rationale)

The "Why" toggle must be collapsible (hidden by default, expanded on click) so users can get explanation when needed without cluttering the UI.

### FR-7: Evaluation Engine

After all applicable questions are answered, the tool must evaluate each exemption according to the rules in `06-evaluation-logic.md` and produce one of four outcomes per exemption:

- **PASS:** Employee meets all requirements for this exemption
- **FAIL:** Employee does not meet one or more requirements
- **BORDERLINE (WARN):** Employee has uncertain status; legal review recommended
- **SKIP:** Exemption not applicable (e.g., Computer exemption for a non-technical role)

The evaluation must be deterministic: same answers always produce the same results.

### FR-8: Recommendation Memo Generation

The tool must generate a classification recommendation memo with the following sections, in this order:

1. **Memo Header:** Title, organization name, generation date, tool version date
2. **Employee/Role Information:** All data collected in the intake
3. **Classification Recommendation:** One of three outcomes:
   - EXEMPT under [specific exemption(s)]
   - NON-EXEMPT
   - LEGAL REVIEW REQUIRED (when only borderline exemptions qualified)
4. **Exemption Analysis:** Every tested exemption with pass/fail/borderline/skip status and reasoning
5. **Applicable Overtime Rules** (only if non-exempt): Federal + applicable state OT rules
6. **Risk Flags & Considerations:** State-specific concerns, borderline warnings, reclassification notes
7. **Standard Disclaimer:** Tool is not legal advice; counsel should be consulted for borderline cases

Complete verbatim copy for the memo is in `07-memo-output.md`.

### FR-9: Memo Actions

After generating the memo, the user must be able to:

- **Print / Save as PDF:** Using the browser's native print dialog
- **Copy to Clipboard:** Plain text version of the memo
- **Start New Classification:** Reset the tool for another employee

### FR-10: Regulatory Landscape Tab Content

The Regulatory Landscape tab must display:

1. **Federal Regulatory Landscape panel:**
   - Current federal thresholds (2019 rule values)
   - Summary of the 2024 Biden DOL rule and its invalidation
   - Trump DOL outlook
   - Overtime tax proposal status

2. **State-Level Changes to Watch panel:**
   - Auto-adjusting state thresholds (CA, CO, NY, WA, ME)
   - California SB 642 pay transparency changes
   - States that don't recognize HCE exemption (CT)
   - New York and Oregon stricter administrative exemption

3. **Current Salary Thresholds Reference Table:**
   - Every jurisdiction with its own threshold
   - Columns: Jurisdiction, EAP Weekly, EAP Annual, Computer Employee, Notes

Complete verbatim content is in `04-data-model.md` (for threshold data) and `07-memo-output.md` (for regulatory narrative content).

### FR-11: "Last Updated" Date Display

The header must prominently display a "Last Updated" date (e.g., "Last Updated: April 14, 2026"). This date must be stored as a constant that can be updated by editing a single location. The same date must appear in the generated memo.

### FR-12: Progress Indicator

During the questionnaire, a progress bar must show the current stage:

1. Employee Info
2. HCE
3. Computer Employee
4. Administrative
5. Executive
6. Professional (includes Outside Sales)
7. Results

Completed stages should show a checkmark; the current stage should be highlighted; future stages should be muted.

---

## Non-Functional Requirements

### NFR-1: Platform

The tool must run in a standard web browser (Chrome, Firefox, Safari, Edge, current versions). No native app is required.

### NFR-2: No Backend Dependency

The tool must function entirely client-side. No server, database, or API calls (except optional font loading from CDN).

### NFR-3: No Authentication

The tool does not require login. It is a single-user tool intended to run locally or on an intranet.

### NFR-4: No Data Persistence

Each session starts fresh. The tool does not store completed classifications. (An extension could add localStorage, but the base tool must not.)

### NFR-5: Accessibility

The tool should follow basic accessibility practices:

- Semantic HTML
- Sufficient color contrast (WCAG AA minimum)
- Keyboard navigation for all interactive elements
- Screen-reader-compatible form labels

Full WCAG AAA compliance is not required but should not be actively violated.

### NFR-6: Print-Friendliness

The memo output must print cleanly:

- Header, navigation, and control buttons must be hidden when printing
- Content must fit standard letter paper (8.5" x 11") with reasonable margins
- Color-coded status indicators (PASS/FAIL/BORDERLINE/SKIP) must still be distinguishable in grayscale

### NFR-7: Response Time

User interactions should feel immediate. Question rendering, navigation, and memo generation should complete in under 500ms.

### NFR-8: Data Separation

Threshold values, state lists, question text, and regulatory content MUST be stored separately from logic code. A builder must be able to update any of these without touching the evaluation or rendering logic.

### NFR-9: Annual Maintainability

A single HR professional with no coding experience should be able to update salary thresholds each January by editing one data file. The structure and format of that file must be intuitive.

### NFR-10: Visual Professionalism

The tool must look like an internal HR compliance product, not a marketing page. Specifically:

- Clean, neutral color palette (grays, whites, one accent color)
- No excessive animations, gradients, or decorative elements
- Legible typography at normal screen sizes
- Consistent spacing and alignment

### NFR-11: No External Dependencies (Minimal)

The tool should require minimal external libraries. Google Fonts via CDN is acceptable. No framework, build system, or package manager is required for the base implementation.

### NFR-12: Single-File Extractable

Even when the code is split across multiple files (for maintainability), a builder should be able to combine them into a single HTML file for easy distribution if needed. No build step should be required.

---

## Business Rules (Cross-Cutting)

These rules apply throughout the tool and must be enforced consistently.

### BR-1: More Protective Standard Wins

When federal and state thresholds differ, the HIGHER threshold applies. When federal and state duties tests differ, the STRICTER test applies. This is applied automatically based on work state.

### BR-2: Job Titles Are Irrelevant

The tool must test ACTUAL DUTIES, not job titles. Questions must probe what the employee does, not what they're called. Legal basis: 29 C.F.R. § 541.2.

### BR-3: Primary Duty Standard

Most exemptions use a "primary duty" standard, meaning the principal, main, major, or most important duty. The FLSA defines this qualitatively (character of the job), not quantitatively (percentage of time), with some exceptions (California uses a 50%+ time test).

Legal basis: 29 C.F.R. § 541.700.

### BR-4: All Prongs Must Be Met

An exemption applies only if ALL its prongs pass. Failing any single prong fails the whole exemption. The tool must evaluate each prong explicitly and not allow partial credit.

### BR-5: Multiple Exemptions Can Apply

An employee may qualify under more than one exemption. The tool must test all applicable exemptions and report all passing ones. If any exemption passes, the employee is exempt.

### BR-6: Borderline = Legal Review, Not Default-Exempt

When duties-test answers indicate ambiguity (e.g., "somewhat exercises discretion"), the tool must mark the exemption as BORDERLINE and recommend legal review. It must NOT default to exempt to be helpful.

### BR-7: The Tool Is Advisory

The tool produces a recommendation, not a decision. Final classification is the user's responsibility. This must be stated clearly in the memo disclaimer.

### BR-8: Documented Reasoning

Every exemption result (PASS/FAIL/BORDERLINE/SKIP) must be accompanied by specific reasoning that appears in the memo. Black-box outputs are not acceptable.

---

## Out-of-Scope Requirements (Explicit Non-Requirements)

The following are explicitly NOT required. A rebuilder should NOT implement these without explicit instruction to do so:

- **Multi-user collaboration** (comments, sharing, approvals)
- **Data export/import** beyond print and copy-to-clipboard
- **Integration with HRIS** (Workday, BambooHR, Gusto, etc.)
- **Audit log** (who classified when)
- **Role-based access control**
- **Historical tracking** of classification changes
- **Bulk/CSV processing** of multiple employees
- **Real-time regulatory updates** (the tool uses static data that requires manual updates)
- **Automated legal counsel routing**
- **Industry-specific customization** beyond the fintech-oriented examples in questions

---

## Requirement Priority

All functional requirements (FR-1 through FR-12) are MUST-HAVE for initial release. All non-functional requirements are MUST-HAVE except:

- NFR-5 (Accessibility): SHOULD-HAVE; basic accessibility required, full WCAG compliance not
- NFR-6 (Print-friendliness): MUST-HAVE for memo, NICE-TO-HAVE for other screens

Continue to `04-data-model.md`.
