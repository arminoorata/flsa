# Changelog

All notable changes to the FLSA Classification Tool. Per spec/09-maintenance-and-extension.md §6.

## [Unreleased] — 2026-04-28

**Total Rewards / HR practitioner upgrade.** Ten improvements driven by an in-character TR-expert review of the live tool. Each item closes a real gap between "the tool gives an answer" and "the tool produces an audit-grade classification an HR generalist can defend without separately consulting counsel for routine cases."

- **Salary-basis test (Helix Energy v. Hewitt, 2023).** New required intake field for pay basis (salary / hourly / day rate / fee basis / other). High-paid day-rate workers now trigger a CRITICAL flag explaining why the salary-basis test fails even at $200K+ pay. Hourly workers get a contextual flag pointing to the Computer-employee hourly alternative. Fee-basis workers get a HIGH flag prompting the per-job calculation.
- **Auto-pre-selected salary tests.** When base salary is at or above the applicable EAP threshold and pay basis is salary, the admin / executive / professional salary tests are auto-answered "yes" (banner shows "Auto-detected — you can change"). Computer salary auto-applies "yes" / "federal_only" based on salary OR hourly thresholds. Saves 4-5 mechanical clicks per high-paid salaried role.
- **Risk flag for non-overlay states.** When the user picks a state without specific encoded rules (e.g., Florida, Texas, Illinois), a LOW flag now appears reminding them to verify any state minimum-wage law, paid-leave law, salary-history rule, or city/county wage law before finalizing.
- **Questionnaire responses captured in the memo.** New "QUESTIONNAIRE RESPONSES" section in the memo (HTML, copy-text, and standalone download) lists every question that influenced the result, grouped by exemption, with the user's selected answer. Restores the audit trail that was missing from v1.0.
- **Reviewer name + effective date in intake.** Two new optional intake fields. When provided, they appear in the EMPLOYEE / ROLE INFORMATION section of the memo.
- **Privacy assertion.** Banner on the intake screen and a footer line on every memo state that all data stays in the browser, nothing is sent to a server, and the session ends when the tab closes.
- **Confidence indicator.** Recommendation now includes a HIGH / MEDIUM / LOW confidence chip with bullet-point reasoning. High = clean pass, no warns, no high-or-above flags. Medium = high or medium flags but still actionable. Low = critical flag, borderline result, or "review" outcome.
- **Severity-tiered risk flags.** Flags upgraded from plain strings to {severity, title, body}. Sorted critical → low. Each tier gets its own color, severity badge, and label ("CRITICAL" / "HIGH" / "MEDIUM" / "LOW") in the memo.
- **Memo ID.** Each classification run generates a stable `FLSA-YYYYMMDD-XXXXXX` identifier shown in the memo header and used in the downloaded HTML filename. Lets HR systems and ticket tools reference a specific run.
- **Reclass helper.** Reclassification reviews now require the current classification (exempt / non-exempt). When the recommendation differs from the current classification, the memo shows a numbered "RECLASSIFICATION CONSIDERATIONS" section with concrete next steps (back-pay analysis, communication plan, payroll coordination, timekeeping rollout). Direction-specific flag (CRITICAL for exempt → non-exempt, HIGH for non-exempt → exempt).

**Codex review #1 fixes (legal accuracy + audit-trail correctness):**

- **Fee-basis flag rewritten.** The first draft said fee basis "does NOT satisfy Executive or HCE." Wrong about HCE — 29 CFR 541.601(b)(1) explicitly allows the weekly portion to be paid on salary or fee basis, and 541.605 covers Admin/Prof/Computer/HCE. Only Executive (541.100(a)(1)) requires strict salary basis. Fee-basis intake now produces (a) a CRITICAL flag if Executive is being claimed and (b) a HIGH flag for any other claimed EAP prompting the per-job equivalence calculation.
- **Day-rate flag now covers Computer.** Previously a high-paid day-rate Software Engineer could pass the Computer exemption and receive only a "no EAP claimed" message that contradicted the actual exempt outcome. Day-rate flag now covers all five EAP/HCE branches (including Computer) and explicitly cites the 29 CFR 541.604(b) exception (guaranteed weekly minimum + reasonable relationship to actual earnings — the Helix Energy escape hatch).
- **Helix copy nuance.** Removed the absolute "do not satisfy" framing and added the 541.604(b) exception so the user knows day/shift/hourly-rate compensation can still be exempt with the right structure.
- **Hourly flag covers Computer + non-Computer cases independently.** Hourly + Computer pass = LOW informational flag (Computer's hourly alternative is the canonical case). Hourly + any other EAP claimed = CRITICAL with the 541.604(b) escape hatch noted.
- **Stale auto-answer now cleared.** When intake changes (e.g., salary drops below threshold, or pay basis switches to day-rate), any auto-applied answer that no longer applies is cleared instead of carrying forward stale "yes" values that could produce a false exempt result.
- **Reclass directional flag suppressed for "review" outcomes.** Previously a borderline working-manager flagged as `Reclassification: Exempt → Non-Exempt`. Wrong — the recommendation was "needs legal review", not "convert to non-exempt and pay back wages." Now produces a HIGH "Reclassification status uncertain — legal review needed before any change" flag when current=exempt+outcome=review (and a MEDIUM equivalent for current=non-exempt+outcome=review). The directional helper section is also suppressed for review outcomes.
- **Auto vs. user answer source labeled in audit trail.** The QUESTIONNAIRE RESPONSES section now tags each answer "User selected" or "Auto-detected from intake" so the audit trail clearly shows which decisions a human made. `isAutoAnswered()` and a new `getAutoApplied()` accessor read the autoApplied tracking set directly instead of comparing values (which previously misclassified user re-selections of the same value as auto).
- **Privacy banner aligned with memo footer.** Intake banner now also discloses the Google Fonts request to `fonts.googleapis.com` so the user knows page-load metadata is visible to Google even though no employee data is sent.

**Codex review #2 fixes (Computer evaluator pay-basis gate):**

- **Computer auto-pre-select tightened.** Previously `_autoComputerSalary()` could return "yes" for an hourly-paid employee based on `baseSalary` alone (e.g., $20/hr × 50K nominal base auto-passed). Now branches by pay basis: salary checks the annual threshold; hourly REQUIRES `hourlyRate` and checks against $27.63 federal + state hourly minimum; day-rate / fee-basis / other never auto-pre-selects (must be explicit user judgment).
- **Computer evaluator gate.** Even when the user manually answered `comp_salary="yes"`, `evaluateComputer()` now re-validates against pay-basis mechanics. Hourly below federal $27.63/hr → FAIL. Hourly above federal but below state hourly minimum → WARN (more-protective state standard wins). Day-rate / fee-basis / other → WARN with summary citing the three escape paths (hourly equivalent / 541.604(b) / 541.605). Prevents a confidently wrong "exempt" recommendation from sitting under a critical risk flag.

**Codex review #3 fix (hourly state-threshold override):**

- Extended the Computer evaluator gate so hourly pay above federal $27.63 but below the applicable state hourly minimum (e.g., California $58.85, Washington $59.96) downgrades to WARN with the more-protective state standard noted in the details.

**Test coverage**: Scenarios expanded from 10 → 19. New scenarios: 11 Helix day-rate (HCE + Admin), 12 Florida non-overlay, 13 reclass exempt → non-exempt, 14 reclass + review outcome (uncertainty), 15 day-rate Software Engineer (Computer downgrades to warn + Helix flag, regression for codex r2 BLOCKER), 16 fee-basis HCE (must support HCE per 541.605, regression for codex r1 BLOCKER), 17 fee-basis Executive (CRITICAL exec-only flag), 18 hourly programmer at $20/hr (must FAIL Computer, regression for codex r2 BLOCKER), 19 California hourly programmer at $40/hr (above federal, below CA state — must downgrade to warn, regression for codex r3 finding). Boot test adds 26+ new assertions covering all new memo elements, intake validation, auto-apply / auto-clear behavior, isAutoAnswered semantics, hourly auto-pre-select boundary, and severity-tier flag shape.

**Codex verdict (after three review iterations): READY.**

## [Unreleased] — 2026-04-26

**Sibling-site visual alignment.** Top bar and bottom bar now match the
arminoorata.com / fair.arminoorata.com / signs.arminoorata.com pattern.

- Added the 9-dot expanding nav menu to the header (links back to Home, About, Frameworks, Tools, Connect on the main site). Mirrors the `NavMenu` component used on the sibling Next.js sites — same dot-grid trigger, same slide-in cluster on desktop, same drop-below stack on mobile, same Escape-to-close + click-outside-to-close behavior.
- Restyled the footer as a two-strip layout: long disclaimer on top (kept verbatim, still the scroll target for the "Full disclaimer" link in the top notice), then a horizontal bar with attribution + tool-version on the left and the `flsa.arminoorata.com` domain badge on the right (uppercase, wide letter-spacing — same treatment as fair / signs).
- Header brand is now a link to arminoorata.com and labeled "FLSA Toolkit" to match the "FAIR Toolkit" / "SIGNS Toolkit" naming on the siblings.
- Header / footer wrapper widened from 900px to 1152px (max-w-6xl) to match the chrome on the sibling sites; main content stays at 900px.

## [1.0.0] — 2026-04-22

Initial release, built from spec/ v1.0 (April 2026).

- Federal thresholds reflect the 2019 DOL rule (reinstated after the November 15, 2024 Texas court ruling that vacated the Biden 2024 rule).
- State overlay for California, Colorado, Connecticut, Maine, New York (NYC + rest-of-state), Oregon, Washington.
- 20 questions covering HCE, Computer Employee, Administrative, Executive, Learned Professional, and Outside Sales exemptions.
- 10 regression scenarios (5 canonical from spec + 5 proposed for state-edge-case, working-manager, CT-below-HCE, and reclassification-flag coverage).
- Dark theme by default; light theme toggle.
- Organization name parameterized via `ORG_NAME` constant (blank default).
- `TOOL_VERSION_DATE` = April 14, 2026.

**Build-time fixes (surfaced by Phase 3/4 independent review):**

- Fixed: `startQuestionnaire()` no longer wipes prior answers, preserving progress when a user navigates back to the Info screen and forward again (spec FR-3 / spec/05 "Going Forward and Back").
- Fixed: `hce_ct_block` is now skipped when `hce_start === "no"`, matching spec/05 flow diagram (Connecticut path only appears on the HCE-eligible branch).
- Tracking which answers came from auto-detection vs. user selection, so intake changes (e.g., edited salary) propagate to auto-answers without overriding explicit user picks.
