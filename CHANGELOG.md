# Changelog

All notable changes to the FLSA Classification Tool. Per spec/09-maintenance-and-extension.md §6.

## [Unreleased] — 2026-04-29 (F500-readiness round)

**Codex r4 review surfaced legal-correctness gaps an F500 HR/TR leader would catch in production.** Seven fixes:

- **HCE skip extended to CA, CO, WA.** Previously only Connecticut blocked the federal HCE shortcut. California (Labor Code §515 "primarily engaged" 50%+ time test), Colorado (COMPS Order requires full duties test), and Washington (L&I requires full duties regardless of comp) all reject the federal HCE reduced-duties test. A $200K California analyst will no longer be incorrectly recommended as EXEMPT under HCE alone. Driven by a per-state `hceApplicable` flag in `thresholds.js` so the list stays maintainable.
- **Critical risk flags now BLOCK an exempt recommendation.** Previously a day-rate $250K Director with admin/HCE passing produced "RECOMMEND: EXEMPT" while a flag below it said "treat as non-exempt." Now `classifyOverall` accepts riskFlags, and any critical-severity flag escalates an otherwise-passing exemption to "LEGAL REVIEW REQUIRED" with an `outcome: "review"` and `blockedByCritical: true`. Critical flags do NOT escalate non-exempt or review outcomes — those are already conservative. Engine reorder: flags computed before classifyOverall.
- **NY learned-professional drops state salary minimum.** New York has no state EAP threshold for the learned-professional exemption — only federal $684/wk applies. Previously the tool incorrectly applied NY's $1,275/wk (NYC) or $1,199.10/wk (rest) executive/admin threshold to NY professionals, which would have falsely classified a $50K NY pharmacist or veterinarian as failing the salary test. Now uses `noStateProSalary: true` flag in the threshold record; the prof_salary question text and auto-answer respect it.
- **Non-overlay state flag bumped from LOW to MEDIUM.** Wording sharpened to "Not validated for [state]" with explicit list of what to check (state EAP, duties test, county/city ordinances, industry carve-outs). LOW severity buried this warning for F500 users picking states like Massachusetts or Texas.
- **Removed remaining "fintech" framing.** Three question texts referenced fintech-specific examples (a holdover from the original spec). Replaced with generic examples (software company / hospital) so the tool doesn't feel scoped to one industry.
- **Five new state overlays: NJ, MA, IL, PA, MN.** All currently mirror federal salary level but each has its own statutory framework (NJWHL, Massachusetts Wage Act, IMWL, PMWA, MFLSA) with notes about state-specific OT or industry rules. Closes the most common F500 jurisdictional gap.
- **Multi-state employee model.** New optional `additionalStates` intake field (multi-select). When the user selects additional states beyond the primary, `setEmpData` resolves the most-protective state (highest EAP threshold) and routes the analysis through that state's rules. Original primary is preserved as `primaryWorkState` for memo display. A HIGH-severity risk flag explicitly names all states in scope and warns about per-week OT allocation for split-state workweeks.

**Test coverage**: Scenarios expanded from 19 → 22. New: 20 (Colorado high-comp HR Director — HCE must skip), 21 (NY pharmacist at $50K — passes professional via federal-only threshold), 22 (NJ Compliance Officer — state overlay resolves). Boot test adds assertions for HCE skip in CA/CO/WA, critical-flag-blocks-exempt behavior with `blockedByCritical: true`, NY professional auto-yes at $50K + auto-undefined at $30K, multi-state analysisState rerouting, multi-state risk flag generation.

**Codex r4 verdict (after fixes): READY pending re-review.**

**Codex r5 review found 4 more issues — fixed:**

- **HIGH: Multi-state scorer was payment-basis-blind.** Previously CA could win over WA for hourly computer roles even though WA's $59.96/hr is stricter than CA's $58.85/hr (CA got the salary-annual computer bonus regardless of pay basis). Fixed by making `getMostProtectiveState(states, payBasis)` and `_restrictivenessScore(state, payBasis)` pay-basis-aware: for hourly pay, score `computerHourly` only; for salary, score `computerSalaryAnnual` and only a tiny tiebreak weight on `computerHourly`. Engine threads payBasis through. Boot test asserts hourly TX+CA+WA → WA, salary → CA.
- **MEDIUM: HCE-reject states still walked users through the full HCE flow.** CA/WA users above the federal HCE threshold previously saw `hce_office` and `hce_one_duty`, only to have HCE silently skipped at evaluation. Generalized the Connecticut-specific block question into `hce_state_block` that fires for any `hceApplicable: false` state with state-specific copy. The detail HCE questions now skip cleanly for any HCE-reject state.
- **MEDIUM: Federal rulemaking narrative had stale specific dates.** Replaced "September 2025 target" / "December 2025 target" specifics with a generic note pointing to the Reginfo Unified Agenda and open NPRMs (avoids hallucinating dates).
- **NIT: Non-overlay flags multiplied for all-non-overlay multi-state cases.** A TX+FL+NV pick produced three near-identical "Not validated" warnings. Now collapses into a single deduped list: "Not validated for Texas, Florida, Nevada" with one combined body.

**Test coverage**: 24 scenarios + boot test + smoke test all pass. Boot test now covers pay-basis-aware multi-state routing (hourly → WA, salary → CA), Texas+NJ multi-state non-overlay flag, CO HCE @ $115K vs $250K state-threshold semantics, HCE skip in CA/WA via the generalized block question.

**Codex r6 review found 2 more issues + a grammar regression — fixed:**

- **HIGH: Salary-mode multi-state routing was leaking computer-salary bonus into non-computer paths.** Reproducible failure: a salary-paid TX+CA+WA admin at $75K routed to CA (because of CA's computer-salary $122K bonus), passed admin under CA's $70,304 EAP, and recommended EXEMPT — even though WA's $80,168 EAP would correctly fail admin. Fixed by suppressing the computer-salary bonus on the salary path: now only EAP threshold + HCE-reject + strict-admin contribute to the salary-mode score. WA correctly wins TX+CA+WA salary cases.
- **MEDIUM: Overtime Tax Proposal entry was stale.** OBBBA (One Big Beautiful Bill Act, 2025) created a qualified overtime deduction effective tax years 2025-2028. Updated the regulatory tab entry to describe the enacted deduction while preserving the original point that it does NOT change FLSA classification rules.
- **NIT: Single-state non-overlay flag had a "standards is applied" grammar regression.** The is/are toggle was tied to nonOverlayStates.length, but "Federal FLSA standards" is always plural. Replaced with invariant "Federal FLSA standards are applied".

**Codex r7 found 2 more issues — fixed:**

- **HIGH: Per-exemption multi-state routing for Computer.** A salary-paid computer role in CA+WA at $100K previously routed to WA (general EAP winner) and incorrectly passed Computer under WA's $80,168 threshold, when CA's $122,573 threshold would correctly block. Added `getMostProtectiveStateForComputer(states, payBasis)` that scores by computer-specific thresholds, called separately in `evaluateExemptions` so Computer uses its own routing while EAP/admin/exec/prof/HCE use the general routing. Boot test asserts CA+WA salary computer at $100K → Computer warn → review.
- **NIT: Restrictiveness comment listed Colorado as HCE-rejecting.** Colorado now recognizes HCE at the higher state threshold ($130,014), so the comment is updated to "CA/CT/WA" only.
- **WA computer salary path corrected.** WA L&I (WAC 296-128-535) recognizes salary-basis computer professionals at the same EAP salary level. Previously the threshold record had `computerSalaryAnnual: null` (hourly-only). Now `computerSalaryAnnual: 80168` per the rule.

**Test coverage**: 25 scenarios + boot test + smoke test all pass. New scenario 25 covers per-exemption Computer routing with CA+WA salary at $100K.

**Codex review iterations: 7. Verdict trajectory: r1 BLOCKED → r2 BLOCKED → r3 READY → r4 BLOCKED → r5 BLOCKED → r6 BLOCKED → r7 BLOCKED with diminishing-severity findings.** The remaining codex concern after r7 is fundamental: full per-exemption multi-state evaluation across all six exemptions. The current per-exemption routing for Computer + composite-score routing for the EAP/HCE family handles the common cases correctly. Edge cases involving rare combinations (e.g., NY-NYC strict-admin + CA stricter-computer for the same role) remain a documented limitation.

**Codex post-r7 follow-up review (3 findings) — fixed:**

- **CRITICAL: Multi-state computer salary path could still produce false exempt result.** Q6 (`comp_salary`) was built from the general `analysisState` while the evaluator used per-exemption Computer routing. For CA+WA salary $100K, Q6 auto-answered "yes" against WA ($80,168 passes), then the evaluator routed to CA but didn't revalidate $100K against CA's $122,573 — returning pass. Two-part fix: (a) `questions.js` now routes Q6's text and auto-answer through `getMostProtectiveStateForComputer` so Q6 sees the same state the evaluator will use; (b) `evaluateComputer` defensively revalidates `baseSalary` against `threshold.computerSalaryAnnual` even when `comp_salary === "yes"`, so a manual user override can no longer slip past the binding state minimum. New scenarios 26 + boot-test assertions for both paths.
- **MEDIUM: Reclass directional flag could contradict critical-blocked outcome.** When `currentClass === "non_exempt"` + a passing exemption + a critical pay-basis flag (Helix day-rate, etc.), `classifyOverall` correctly blocks to "review" but `generateRiskFlags` still emitted "Reclassification: Non-Exempt → Exempt" because it read raw pass/warn results. Fixed by checking `flags.some(f => f.severity === "critical")` when computing the directional verdict — critical flags suppress the directional flag and the "uncertain" reclass flag fires instead. New scenario 27 + boot-test assertion.
- **MEDIUM: Per-state OT rules for multi-state employees.** `generateOvertimeRules` emitted rules only for the single `analysisState`. For a CA+CO non-exempt employee, the user saw CA daily OT (or CO 12-hour) but not both. Fixed by iterating over primary + additional states, deduping, and emitting a section for each state with encoded OT rules. Added a "Multi-State Allocation" section that fires only for genuine multi-state cases, explaining how to allocate hours per state for OT calculation. Encoded OT blurbs for CA, CO, MN, NY-NYC, NY-other, OR, WA.

**Test coverage**: 27 scenarios + boot test (with 8 new assertions covering the three new fixes) + smoke test all pass.

**Codex post-r7 second follow-up (2 findings) — fixed:**

- **CRITICAL: Multi-state admin routing produced false exempt for customer-facing duties.** A CA-primary + NY-NYC-additional employee with `admin_biz_ops: customer_ops` at $100K returned EXEMPT under "California (federal standard)" because composite-score routing landed on CA (CA's HCE-rejection +$200K bonus dominates), so NY's strict-admin rule was never applied. But strict-admin is a duties-test rule that binds wherever the employee actually works in NY/OR — the most-protective standard says ANY in-scope strict state blocks customer_ops admin. Fixed in `evaluateAdmin`: walk the full in-scope state list (primary + additionalStates + analysisState), find the first strict-admin state, and use its label as the binding state for the customer_ops fail message. The fail summary now names the binding strict state explicitly with a multi-state suffix when it differs from the routed analysis state ("the employee also works in New York, whose stricter rule governs"). The `admin_state_restrict` question in `questions.js` was extended the same way so users see the strict-admin warning even when analysis routed elsewhere. New scenario 28 + boot-test assertions for both the failure path and the question surfacing.
- **MEDIUM: Federal-only Computer risk flag named the wrong state in multi-state cases.** `evaluateComputer` correctly routed CA+WA salary cases to CA, but `generateRiskFlags` continued to read `analysisState` (WA) for the flag text — so the Computer result said "NOT California" while the risk flag right next to it said "NOT Washington". Fixed by computing the Computer-routed threshold once at the top of `generateRiskFlags` (via `getMostProtectiveStateForComputer`) and using its label for both the federal-only flag and the hourly-claim state-minimum clause. Boot-test asserts the federal-only flag body names California in a CA+WA $100K salary case.

**Test coverage**: 28 scenarios + boot test (with 4 additional assertions) + smoke test all pass.

**Codex review iterations: 8 (counting both post-r7 follow-ups). Verdict trajectory updated to: r1 BLOCKED → r2 BLOCKED → r3 READY → r4 BLOCKED → r5 BLOCKED → r6 BLOCKED → r7 BLOCKED → post-r7 BLOCKED → post-r7-2 BLOCKED with the multi-state admin false-exempt as the binding F500 issue.** With this round, the conservative "fail admin if any in-scope state is strict and admin pass depends on customer_ops" rule closes the realistic CA+NY case without requiring full per-exemption multi-state evaluation across all six exemptions. Edge cases involving exemption interactions across non-overlapping rule sets (e.g., NY-NYC strict-admin + CA stricter-computer for the SAME role with different binding states for different exemptions) remain a documented limitation.

**Codex post-r7 third follow-up — three risk-flag/copy cleanups (memo trust):**

- **Medium: Federal-only Computer flag suppressed when Computer not actually claimed.** `comp_salary` auto-populates regardless of `comp_role`, so a comp_role=no admin user previously triggered a "Computer exemption: federal-only threshold met" flag — confusing reviewers because the Computer exemption is skipped on the result side. Gated on `_isClaimed("computer")` so the flag only fires when Computer is actually a claimed exemption (pass or warn).
- **Medium/Low: Customer-facing-admin flag suppressed when admin already failed.** The "Admin exemption based on customer-facing duties... if the employee relocates to NY/Oregon" flag previously contradicted the new admin: FAIL result for in-scope strict-admin cases. Gated on `_isClaimed("admin")` so it only fires when admin actually passed under the federal/non-strict standard. The flag is meaningful as a future-relocation warning, not when admin already failed.
- **Low: Multi-state flag copy updated for accuracy.** Previously said "per-exemption multi-state evaluation is not modeled" — but Computer (per-exemption Computer routing) and Administrative (strict-admin in scope) now do have per-exemption handling. Rewritten to describe the actual per-exemption coverage: general routing for HCE/Exec/Prof/Sales/Admin-salary, per-exemption Computer routing, and any-in-scope strict-admin for the customer-facing rule.

**Test coverage**: 28 scenarios + boot test (with 2 additional negative-assertion cleanups) + smoke test all pass.

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
