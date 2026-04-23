# 07 — Memo Output

This document specifies the structure, content, and formatting of the recommendation memo. It also specifies verbatim content for the Regulatory Landscape tab.

---

## Memo Structure

The memo is a printable document with these sections in order:

1. Header
2. Employee / Role Information
3. Classification Recommendation
4. Exemption Analysis
5. Applicable Overtime Rules (only if non-exempt or borderline)
6. Risk Flags & Considerations (only if flags exist)
7. Disclaimer

---

## Section 1: Header

**Content:**

```
FLSA Exemption Classification Memo
Fireblocks, People Operations
Generated: [GENERATION_DATE] | Tool Version: [TOOL_VERSION_DATE]
```

Where:
- `[GENERATION_DATE]` is the current date in "Month DD, YYYY" format (e.g., "April 14, 2026")
- `[TOOL_VERSION_DATE]` is the tool's version constant

**Formatting:**
- Title centered, bold, ~20px
- Subtitle "Fireblocks, People Operations" centered, smaller, regular weight
- Generation and version line in monospace font, smaller (~11px)
- Border-bottom under header section

**Note:** "Fireblocks" is the original deployment. A rebuilder for a different organization should parameterize this or change it to the appropriate organization name.

---

## Section 2: Employee / Role Information

**Content (all rows displayed):**

| Label | Value |
|-------|-------|
| Classification Type: | "New Hire Classification" or "Reclassification Review" |
| Name / Role: | `[empName]` or "—" if blank |
| Job Title: | `[jobTitle]` |
| Department: | `[department]` or "—" if blank |
| Primary Work State: | `[workState]` |
| Annual Base Salary: | $`[baseSalary]` (comma-formatted) |
| Total Annual Compensation: | $`[totalComp]` (comma-formatted) |
| Hourly Rate: | $`[hourlyRate]` (only if entered) |
| Applicable Jurisdiction: | "Federal FLSA + [JURISDICTION_NOTE]" |

Where `[JURISDICTION_NOTE]` is:
- "No additional state overlay (federal standards apply)" — if stateKey is "federal"
- `[STATE_LABEL]` + " state law" — otherwise

**Section heading:** "EMPLOYEE / ROLE INFORMATION" in uppercase with letter-spacing, smaller font, border-bottom

---

## Section 3: Classification Recommendation

This is a visually emphasized box (accent-colored border, light accent-colored background).

**Content (heading):**
```
Classification Recommendation
```

**Content (body):** One of three recommendations from `06-evaluation-logic.md`:

### Option A: Exempt

```
RECOMMEND: Classify as EXEMPT under the [PASSING_EXEMPTIONS] exemption[s] (federal[ and [STATE_LABEL] state]).
```

If borderline exemptions also exist, append:

```
Note: Additional exemptions are borderline ([BORDERLINE_LIST]). The qualifying exemption[s] above [is/are] sufficient, but borderline results are documented below.
```

### Option B: Legal Review Required

```
RECOMMEND: LEGAL REVIEW REQUIRED. No exemption clearly passed, but [BORDERLINE_LIST] exemption[s] [is/are] borderline. Recommend consulting employment counsel before classifying.
```

### Option C: Non-Exempt

```
RECOMMEND: Classify as NON-EXEMPT. This role does not meet the requirements for any tested exemption under federal or [STATE_LABEL] state law. The employee is entitled to overtime pay.
```

**Formatting:**
- The word EXEMPT, LEGAL REVIEW REQUIRED, or NON-EXEMPT should be bold
- Recommendation box has accent-colored border (2px) and light accent background
- Larger text than body (~15px)

---

## Section 4: Exemption Analysis

Displays every tested exemption with its status.

**Section heading:** "EXEMPTION ANALYSIS" in uppercase

**For each exemption result, display a colored block:**

- **PASS:** Green background, green left border (3px), icon "✓ PASS"
- **FAIL:** Red background, red left border, icon "✗ FAIL"
- **BORDERLINE (warn):** Amber background, amber left border, icon "⚠ BORDERLINE"
- **SKIPPED:** Gray background, gray left border, icon "— SKIPPED"

**Block content:**

```
[ICON] [TITLE]
[SUMMARY]
• [DETAIL_1]
• [DETAIL_2]
• ...
```

The icon and title are on one line, bold. The summary is on the next line. Details are bulleted below if any exist.

**Order:** HCE, Computer Employee, Administrative, Executive, Learned Professional, Outside Sales.

---

## Section 5: Applicable Overtime Rules

**Included only if:** the recommendation is NON-EXEMPT (or if borderline when no exemption passes).

**Section heading:** "APPLICABLE OVERTIME RULES"

**Content:**

```
Federal: Overtime required for non-exempt employees working more than 40 hours in a workweek at 1.5x the regular rate of pay.
```

If California:
```
California: Overtime required for more than 8 hours in a day AND more than 40 hours in a week. Double time required for more than 12 hours in a day and more than 8 hours on the 7th consecutive day in a workweek.
```

If Colorado:
```
Colorado: Overtime required for more than 12 hours in a day OR more than 40 hours in a week (note: different from California's 8-hour daily trigger).
```

Always at end:
```
Regular Rate Reminder: When calculating overtime, the "regular rate" must include all non-discretionary compensation (bonuses, commissions, shift differentials). Only truly discretionary bonuses may be excluded.
```

**Formatting:**
- Section labels in bold ("Federal:", "California:", etc.)
- Double line break between rule sections

---

## Section 6: Risk Flags & Considerations

**Included only if:** at least one flag was generated.

**Section heading:** "RISK FLAGS & CONSIDERATIONS"

**Content:** Each flag is a separate amber-colored block.

**Flag block formatting:**
- Amber background, amber left border (3px)
- Font size slightly smaller than body (~13px)
- Line-height 1.5 for readability

---

## Section 7: Disclaimer

**Always included at the bottom.**

**Content (verbatim):**

```
This tool provides guidance based on encoded federal and state regulatory criteria current as of [TOOL_VERSION_DATE]. It is not a substitute for legal advice. Consult employment counsel for borderline cases, complex multi-state scenarios, or when state-specific nuances require interpretation. Fireblocks should perform annual reviews of all exempt classifications, with particular attention to state threshold changes effective each January 1.
```

**Note:** A rebuilder for a different organization should replace "Fireblocks" with the appropriate organization name.

**Formatting:**
- Italic
- Smaller text (~12px)
- Muted color
- Border-top separator
- Adequate top padding

---

## Memo Action Buttons

Above the memo content, three action buttons (hidden when printing):

1. **← Start New Classification** (secondary style): Resets the tool to the initial employee info screen
2. **Copy Memo** (secondary style): Copies the memo text (plain text version) to clipboard; changes text briefly to "Copied!" for 2 seconds
3. **Print / Save PDF** (primary style): Invokes `window.print()` which lets the browser generate a PDF or print

**Layout:** Start New on left; Copy and Print on right; with space between.

---

## Print Behavior

When the user prints:

- **Hidden elements:** App header, tab bar, progress bar, all action buttons, anything with class `.no-print`
- **Visible elements:** Memo content only
- **Background:** White
- **Borders/shadows:** Removed or minimized for print
- **Layout:** Full width (no max-width constraint)

The memo must fit on standard letter paper (8.5" x 11") with reasonable margins. Pagination should be browser-default.

---

## Regulatory Landscape Tab Content

The Regulatory Landscape tab has three panels.

### Panel 1: Federal Regulatory Landscape

**Heading:** "Federal Regulatory Landscape, [TOOL_VERSION_DATE]"

**Items (each has a title and body):**

#### Item 1.1

**Title:** `Current Federal Thresholds (2019 Rule, Reinstated)`

**Body:**
```
EAP salary minimum: $684/week ($35,568/year). HCE total compensation: $107,432/year. Computer employee hourly alternative: $27.63/hour. These have been in effect since the Biden DOL's 2024 overtime rule was vacated in its entirety by a federal court in Texas on November 15, 2024.
```

#### Item 1.2

**Title:** `Biden 2024 Overtime Rule, Struck Down`

**Body:**
```
The April 2024 final rule would have raised EAP thresholds to $1,128/week ($58,656/year) and HCE to $151,164/year by January 1, 2025. A federal judge in the Eastern District of Texas found the DOL exceeded its authority by displacing the duties-based test with a predominantly salary-based test. The ruling reversed both the July 2024 increase ($844/week) and the planned January 2025 increase, reverting everything to 2019 levels.
```

#### Item 1.3

**Title:** `Trump DOL, Long-Term Rulemaking Planned`

**Body:**
```
The Trump DOL's Spring 2025 regulatory agenda listed overtime rulemaking as a "long-term" project with no specific proposed rule date. Historically, the Trump DOL has favored modest increases (the 2019 rule raised the threshold from $455/week to $684/week). Any new rule would go through notice-and-comment rulemaking, meaning 12+ months from proposal to implementation. Also on the agenda: proposed rules on independent contractor classification (September 2025 target) and joint employer standards (December 2025 target).
```

#### Item 1.4

**Title:** `Overtime Tax Proposal`

**Body:**
```
Trump proposed eliminating taxes on overtime pay during his 2024 campaign. No legislation has been enacted. If passed, this would not change classification rules but would affect take-home pay calculations for non-exempt employees.
```

### Panel 2: State-Level Changes to Watch

**Heading:** "State-Level Changes to Watch"

**Items:**

#### Item 2.1

**Title:** `Auto-Adjusting State Thresholds (Check Annually in Q4)`

**Body:**
```
California, Colorado, New York, Washington, and Maine all tie their salary thresholds to minimum wage increases. These adjust on January 1 each year. Always verify Q4 announcements for the following year's rates.
```

#### Item 2.2

**Title:** `California SB 642, Expanded Pay Transparency (Effective 2026)`

**Body:**
```
Broadens the definition of "wages" and "wage rates" for pay transparency purposes to include salary, overtime pay, bonuses, stock options, profit sharing, life insurance, vacation/holiday pay, and benefits. Job postings for exempt roles must include all forms of compensation, not just base salary. The limitations period for claims expanded from 2 to 3 years.
```

#### Item 2.3

**Title:** `States That Do NOT Recognize HCE Exemption`

**Body:**
```
Connecticut does not recognize the federal highly compensated employee exemption. Employees in CT must meet the full duties test regardless of compensation. Verify other states as laws evolve.
```

#### Item 2.4

**Title:** `New York & Oregon, Stricter Administrative Exemption`

**Body:**
```
The administrative exemption in these states cannot be satisfied by customer-facing duties alone. The employee's primary duty must relate to the management or general business operations of the employer itself.
```

### Panel 3: Current Salary Thresholds Reference Table

**Heading:** "Current Salary Thresholds Reference"

**Table columns:**
1. Jurisdiction
2. EAP Weekly
3. EAP Annual
4. Computer Emp.
5. Notes

**Rows:** One row per entry in the THRESHOLDS data object, displayed in definition order:
- Federal
- California
- Colorado
- Connecticut
- Maine
- New York (NYC/Nassau/Suffolk/Westchester)
- New York (rest of state)
- Washington
- Oregon

**Formatting:**
- Numeric cells in monospace font
- Dollar amounts with commas
- Notes column in smaller, muted text

---

## Panel Formatting (Regulatory Tab)

Each panel:
- White background, light border, subtle shadow
- Panel heading: larger, bold, with 16px bottom margin
- Items separated by bottom border
- Item title: bold, smaller font (~13px)
- Item body: regular weight, muted color, ~13px

Multiple panels stacked vertically with 16px spacing between them.

---

## Copy to Clipboard Behavior

When "Copy Memo" is clicked:

1. Extract the plain text content of the memo (strip HTML, preserve line breaks)
2. Use `navigator.clipboard.writeText()` to copy
3. Change the button text to "Copied!" for 2 seconds
4. Revert to "Copy Memo"

The copied text should be readable in any plain-text environment (email, Slack, Notion, etc.). Formatting elements (bold, colors) are lost but the structure and content are preserved.

---

## Verbatim Content Summary

For easy reference, here is every piece of user-facing text in the memo system that must be reproduced verbatim:

**Memo header:**
- `FLSA Exemption Classification Memo`
- `Fireblocks, People Operations`

**Section headers (all caps, in order):**
- `EMPLOYEE / ROLE INFORMATION`
- `EXEMPTION ANALYSIS`
- `APPLICABLE OVERTIME RULES`
- `RISK FLAGS & CONSIDERATIONS`

**Classification recommendation heading:**
- `Classification Recommendation`

**Status icons in exemption analysis:**
- `✓ PASS`
- `✗ FAIL`
- `⚠ BORDERLINE`
- `— SKIPPED`

**Disclaimer text** — see Section 7 above, verbatim.

**Regulatory Landscape panel headings:**
- `Federal Regulatory Landscape, [TOOL_VERSION_DATE]`
- `State-Level Changes to Watch`
- `Current Salary Thresholds Reference`

**All regulatory item titles and bodies** — see Panel 1, 2, 3 above, verbatim.

Continue to `08-ui-and-architecture.md`.
