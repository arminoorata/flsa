# Changelog

All notable changes to the FLSA Classification Tool. Per spec/09-maintenance-and-extension.md §6.

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
