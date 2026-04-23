# 09 — Maintenance and Extension

This document specifies how the tool is maintained over time and how it can be extended without breaking the core logic. Labor law changes constantly, so maintainability is a first-class concern.

---

## Why This Matters

The tool encodes legal rules that change. A tool that works perfectly in April 2026 will be giving wrong answers by April 2027 if it is not maintained. The design must make annual maintenance cheap and low-risk.

Specifically:

- **State salary thresholds change every January 1** in auto-adjusting states (CA, CO, NY, WA, ME). Failing to update means the tool gives false "PASS" results to employees who are actually below the new threshold.
- **Federal thresholds change** when DOL issues new rules or when court rulings alter them (as happened in November 2024).
- **Duties tests change** when courts interpret regulations or when states pass new laws (e.g., California SB 642).
- **New jurisdictions add overlay rules** (e.g., Colorado added new computer exemption rules in recent COMPS Orders).

A tool that hardcodes these values into logic files is a maintenance disaster. A tool that separates data from logic can be updated by a non-engineer.

---

## Annual Update Checklist

Perform this checklist every year in Q4 (October or November) to prepare for January 1 effective dates.

### Step 1: Gather New Threshold Data

Sources:

- **Federal:** DOL Wage and Hour Division website (dol.gov/agencies/whd/overtime). Check for any final rules issued in the prior year.
- **California:** California Department of Industrial Relations (dir.ca.gov). Check the annual minimum wage announcement and the computer software employee exemption adjustment. Also check CA Labor Code § 515.6 updates for licensed physician rates.
- **Colorado:** Colorado Department of Labor and Employment (cdle.colorado.gov). Check the new COMPS Order for the coming year.
- **New York:** New York Department of Labor (dol.ny.gov). Check both the NYC/downstate region and the rest-of-state thresholds.
- **Washington:** Washington Department of Labor and Industries (lni.wa.gov). Check both the EAP threshold and the computer professional hourly rate.
- **Maine:** Maine Department of Labor (maine.gov/labor). Maine adjusts based on CPI.
- **Oregon:** Oregon Bureau of Labor and Industries (oregon.gov/boli). Check whether OR adopted its own salary threshold (historically follows federal).
- **Connecticut:** Connecticut Department of Labor (ctdol.state.ct.us). Verify HCE exemption status has not changed.

Alternative sources (updated and aggregated):

- Ogletree Deakins annual "State Minimum Wage/Overtime" chart
- Jackson Lewis annual wage-hour updates
- Fisher Phillips "Wage Hour Watch" blog
- SHRM state-by-state compliance resources

### Step 2: Update the Threshold Data File

Open the file containing threshold objects (see `04-data-model.md` for structure). For each state with a change, update:

- `eapWeekly`
- `eapAnnual`
- `computer` (display string)
- `computerSalaryAnnual`
- `computerHourly`
- `hce` (rarely changes)
- `notes` (only if the state's key rules changed)

**Do not touch** the logic files. If the update requires code changes beyond data updates, something is wrong with the architecture.

### Step 3: Update the Tool Version Date

Edit the `TOOL_VERSION_DATE` constant (see `04-data-model.md`) to the date of the update. This constant flows through to:

- The header display
- The generated memo
- The Regulatory Landscape tab heading

This is the single most important maintenance indicator: if the date is stale, users know the tool may be out of date.

### Step 4: Review Regulatory Content

Read through the regulatory content file (see `04-data-model.md` and `07-memo-output.md`) and update:

- Any reference to "current" rules that are no longer current
- The Biden 2024 rule narrative once it becomes more distant history
- Trump DOL rulemaking status (whether any new rule has been proposed or finalized)
- Any state law changes of note (e.g., new SB number, new effective date)

### Step 5: Test with Regression Scenarios

Run through the test scenarios in `06-evaluation-logic.md` ("Test Scenarios" section). Each should still produce the expected outcome. If any scenario produces a different result after the update, investigate why.

Additionally, run these post-update smoke tests:

- **A CA software engineer at exactly last year's threshold** should now FAIL the state threshold (because the threshold went up)
- **A NY employee at the new NYC threshold** should PASS (verifying new number is in the data)
- **A federal-only scenario** should still produce a federal_only warning for CA/CO/WA

### Step 6: Update the "What Changed" Note

Add a changelog entry in `00-README.md` or a dedicated `CHANGELOG.md`:

```
## 2027 Annual Update (November 2026)

- CA EAP threshold: $X,XXX/week → $Y,YYY/week (effective Jan 1, 2027)
- CO computer hourly: $XX.XX → $YY.YY
- WA EAP: $X,XXX.XX → $Y,YYY.YY
- NY NYC: $X,XXX → $Y,YYY
- Notes reviewed and updated for [states].
- TOOL_VERSION_DATE bumped to November DD, 2026.
```

### Step 7: Deploy

Replace the deployed files. If using a single-file HTML distribution, update the distribution.

---

## Mid-Year Updates

Some events require immediate updates, not waiting for the annual cycle:

### Event 1: A Federal Court Vacates a DOL Rule

Example: The November 2024 ruling in *Texas v. DOL* that vacated the Biden rule.

**Actions:**

1. Update federal threshold values in the data file to reflect the reverted rule
2. Update the Regulatory Landscape content to explain what happened
3. Bump the `TOOL_VERSION_DATE`
4. Notify users via email or Slack that the tool has been updated

### Event 2: A Federal Rule is Finalized

Example: If Trump DOL issues a new overtime rule with a future effective date.

**Actions:**

1. Before the effective date: update the Regulatory Landscape content to announce the upcoming change
2. On the effective date: update the federal threshold in the data file
3. Bump the `TOOL_VERSION_DATE`
4. Notify users

### Event 3: A State Passes a New Law

Example: California SB 642 (effective 2026) expanded pay transparency.

**Actions:**

1. Determine whether the new law changes exemption rules (most pay transparency laws do not; they affect job postings)
2. If yes: update the relevant state's data entry and potentially add a new question
3. If no: note the change in the Regulatory Landscape content but do not alter logic
4. Bump the `TOOL_VERSION_DATE`

### Event 4: Supreme Court Decision on an Exemption Issue

Example: *Helix Energy Solutions v. Hewitt* (2023) on the salary-basis test.

**Actions:**

1. Evaluate whether the decision alters the tool's tests
2. If the decision creates a new nuance, add a risk flag or additional question
3. Document the decision in the Regulatory Landscape content
4. Bump the `TOOL_VERSION_DATE`

---

## Extension Patterns

This section describes how to extend the tool without breaking its core. Each pattern should be implemented as an additive change, not a rewrite.

### Extension 1: Add a New State

**Scenario:** A state not currently covered passes a higher salary threshold or stricter duties test, and needs its own overlay.

**Steps:**

1. **Add a threshold entry** in the threshold data file. Follow the schema from `04-data-model.md`. Example:

   ```json
   "illinois": {
     "label": "Illinois",
     "eapWeekly": 770,
     "eapAnnual": 40040,
     "computer": "N/A",
     "computerSalaryAnnual": null,
     "computerHourly": null,
     "hce": 107432,
     "notes": "Higher threshold; additional meal/rest break rules."
   }
   ```

2. **Add a state-to-threshold mapping** entry:

   ```json
   "Illinois": "illinois"
   ```

3. **If the state has special rules (strict admin, no HCE, etc.)**, add it to the relevant constants in `04-data-model.md`:

   ```
   STRICT_ADMIN_STATES = ["new_york_nyc", "new_york_other", "oregon", "illinois"]
   ```

4. **If the state needs a special question** (e.g., like the CT HCE block), add a new question to the decision tree file following the existing pattern.

5. **Test:** Run a classification for an employee in the new state. Verify thresholds apply and any special flags fire.

**Do not:** Add state-specific hardcoded checks in the evaluation logic. Use the data structures and the `STRICT_ADMIN_STATES` style constants.

### Extension 2: Add a New Exemption Category

**Scenario:** The tool currently covers 6 exemptions. To add, for example, Creative Professional as a separate category:

**Steps:**

1. **Add a new stage** to the `STAGES` constant, or fold the new exemption into an existing stage

2. **Add questions** to the question data file following the existing schema

3. **Add evaluation rules** in the evaluation logic file, creating a new evaluate function (e.g., `evaluateCreative()`)

4. **Add the result** to the results object and display logic

5. **Add memo output handling** for the new exemption (iconography, block rendering)

**Do not:** Modify existing exemption evaluations to "also consider" the new category. Keep each exemption's logic isolated.

### Extension 3: Add Multi-State Employee Handling

**Scenario:** An employee works in multiple states (e.g., remote employee traveling, hybrid with multiple worksites).

**Current behavior:** The tool asks for a single "primary work state."

**Extension:**

1. Add a "secondary work state" field to the intake, marked optional

2. Add a risk flag when a secondary state is entered: "Multi-state work arrangement. The 'primary' state's rules apply, but additional state rules may apply during work in other states. Consult counsel for complex arrangements."

3. Do NOT attempt to evaluate multiple state rules automatically. This is a legal judgment call that requires human review.

### Extension 4: Add HRIS Integration

**Scenario:** Pull employee data from HiBob, Workday, or similar instead of manual entry.

**Steps:**

1. This is a major architectural change. Requires a backend or API proxy (the original tool is entirely client-side).

2. Add an "Import from HRIS" button on the employee info screen.

3. Implement OAuth or API key authentication for the chosen system.

4. Map HRIS fields to tool fields (job title, work state, salary, total comp).

5. Pre-populate the form; user confirms or edits before proceeding.

6. **Do not** eliminate manual entry. Users should still be able to classify employees not yet in the HRIS, or run hypothetical scenarios.

### Extension 5: Add a Classification Log

**Scenario:** Track all classifications performed, for audit purposes.

**Steps:**

1. Add a save mechanism (localStorage for single-user, backend for multi-user).

2. On memo generation, offer "Save this classification" as an action.

3. Add a "History" tab listing past classifications with search/filter.

4. Each entry should preserve: employee info, date, outcome, full memo text.

5. **Consider:** Privacy and data retention implications. Classification records contain PII and compensation data. Follow your organization's data retention policy.

### Extension 6: Add Batch/Bulk Processing

**Scenario:** Classify many employees at once from a CSV upload.

**Steps:**

1. Add a "Batch Mode" tab or button.

2. Accept CSV input with columns matching the intake fields.

3. For each row, run the evaluation logic automatically using the same pure functions.

4. **Limitation:** Batch mode cannot ask duties questions conditionally. It must assume duties answers from additional CSV columns or apply default assumptions (which is legally risky).

5. **Recommendation:** Batch mode should be used only for preliminary screening (identifying employees who clearly fail on salary tests) and for regenerating memos after a threshold change. Full classifications should still go through the interactive tool.

### Extension 7: Add Multi-Language Support

**Scenario:** Support Spanish or other languages for non-English-speaking HR teams.

**Steps:**

1. Move all user-facing strings into a translation data file, keyed by ID.

2. Add a language selector in the header.

3. Translate all questions, options, help text, why text, memo content, and regulatory content.

4. **Important:** Legal terms must be translated carefully. Keep original English terms in parentheses where helpful (e.g., "primary duty (tarea principal)").

5. **Do not translate:** Citation references (they are in English by convention), or the tool's versioning metadata.

---

## What NOT to Change Without Care

Certain parts of the tool are more sensitive than others. Changes here require more testing and review.

### DO NOT change without legal review:

- Question text (wording affects legal interpretation)
- Option labels (changing a "yes/no" to "maybe" alters the test)
- Evaluation rule logic (the rules encode regulatory interpretation)
- Memo recommendation language
- Disclaimer text

### DO NOT change without careful testing:

- Skip logic (changing when a question is skipped may break downstream evaluation)
- Auto-answer logic (may cause incorrect pre-selections)
- The more-protective-standard implementation (central to multi-jurisdiction correctness)

### SAFE to change as needed:

- Visual styling (colors, fonts, spacing)
- Help text (expanded guidance)
- Why-this-matters toggles (legal rationale explanation)
- Regulatory Landscape content (educational)
- Tool version date (must be updated whenever content changes)

---

## Testing After Changes

After any change, run at minimum:

1. **The test scenarios** in `06-evaluation-logic.md`
2. **A manual walkthrough** of one employee per state covered
3. **A print preview** to verify memo formatting

For significant changes, add new test scenarios that specifically exercise the changed code path.

---

## Known Issues and Limitations

The following are explicit known limitations. A rebuilder should not "fix" these without understanding the design rationale.

### 1. No Independent Contractor Test

The tool does not attempt to classify independent contractors. The IC test is a separate legal framework (DOL's 6-factor economic realities test, state ABC tests, etc.) with different inputs and outputs. Combining the two in one tool would create confusion and miscategorization.

### 2. No Multi-State Rule Engine

The tool applies one state's rules at a time. Genuine multi-state scenarios require legal judgment about which state's law governs. An engineered solution would create false confidence.

### 3. No Dynamic Threshold Fetch

The tool's thresholds are static data in a file, not fetched from an API. Rationale: (a) no stable, free, machine-readable API for state labor thresholds exists; (b) the tool must work offline; (c) annual updates via data file are simple.

### 4. No Employee Self-Service

The tool is an HR tool, not an employee-facing tool. Employees should not use it to guess their classification status, because duties assessments require manager input and legal judgment.

### 5. No Historical "Was This Correct Last Year?" Function

The tool reflects CURRENT thresholds. It does not let users evaluate past classifications using past thresholds. Rationale: retroactive evaluations are rare and require careful attention to effective dates (which may vary within a year).

### 6. English Only

As discussed in Extension 7, multi-language is not built in.

### 7. No Audit Trail of Answers

Once the user finishes a classification and closes the browser, the specific answers chosen are lost. Only the memo remains (if saved). If the user needs to review answer-by-answer reasoning later, they must re-run the classification.

---

## Support Channels

A rebuilder deploying this tool internally should establish:

1. **A designated owner** (one HR/People Ops staff member) responsible for the annual update
2. **A legal review partner** (employment counsel) to consult for borderline cases
3. **A feedback mechanism** (email, Slack, form) for users to report issues or suggest improvements
4. **A change log** showing what was updated when and why

---

## Final Builder Notes

The original tool was built in a single day by an HR executive working with an AI assistant. It works, it's maintained, and it solves the intended problem. A rebuilder should aim for the same: a functional tool that addresses a real compliance need, rather than a theoretical perfect system.

If in doubt between features and simplicity, choose simplicity. The tool's value lies in ACTUALLY BEING USED by real HR teams, not in having every possible feature.

And finally: the tool is advisory. No matter how well-designed or comprehensive, it is an input to a human decision, not a substitute for one. Keep the disclaimers prominent and the legal review flags unambiguous.

---

End of specification. Total documents: 10 (00-README through 09-maintenance-and-extension).
