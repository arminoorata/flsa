# FLSA Exemption Classification Tool — Complete Rebuild Specification

**Version:** 1.0
**Date:** April 2026
**Target Audience:** AI coding assistants (Claude Code, Cursor, Copilot) or developers rebuilding this tool from scratch.

---

## Purpose of This Specification

This document set is a complete, exhaustive specification for rebuilding the FLSA Exemption Classification Tool from scratch. It is designed to be:

- **Stack-agnostic:** The core requirements, logic, and data do not prescribe a particular framework. An appendix describes the original vanilla JavaScript implementation.
- **Verbatim-faithful:** All question text, option labels, and memo copy are provided word-for-word.
- **Legally grounded:** All regulatory claims cite the underlying FLSA sections, CFR references, or state labor codes.
- **Context-rich:** Regulatory history and rationale are included so the builder understands WHY rules exist, not just WHAT they are.

A developer or AI coding assistant with this spec and no access to the original code should be able to produce a functionally equivalent tool.

---

## How to Use This Specification

### If you are an AI coding assistant (Claude Code, etc.):

1. Read `01-overview.md` first for mission and scope
2. Read `02-regulatory-context.md` for the legal background (essential, the tool encodes legal rules)
3. Read `03-requirements.md` for functional and non-functional requirements
4. Read `04-data-model.md` for thresholds, states, and data structures
5. Read `05-decision-tree.md` for the complete question flow with verbatim text
6. Read `06-evaluation-logic.md` for how answers become pass/fail results
7. Read `07-memo-output.md` for the recommendation memo specification
8. Read `08-ui-and-architecture.md` for the user interface and implementation notes
9. Read `09-maintenance-and-extension.md` for update cadence and extension points

### If you are a human developer:

Same reading order. The total length is roughly 40-50 pages. Plan to read it in one sitting before building, not piece by piece while coding.

---

## File Index

| File | Purpose |
|------|---------|
| `00-README.md` | This file |
| `01-overview.md` | Mission, scope, success criteria, audience |
| `02-regulatory-context.md` | FLSA history, 2024 DOL rule, Trump DOL outlook, state law overview |
| `03-requirements.md` | Functional and non-functional requirements |
| `04-data-model.md` | Thresholds, states, data structures, constants |
| `05-decision-tree.md` | All questions verbatim with flow logic |
| `06-evaluation-logic.md` | How answers produce exemption pass/fail/borderline results |
| `07-memo-output.md` | Recommendation memo specification, verbatim copy |
| `08-ui-and-architecture.md` | UI layout, styling, architecture, original stack appendix |
| `09-maintenance-and-extension.md` | Annual update checklist, extension patterns |

---

## Critical Warnings for the Builder

### 1. This tool encodes legal rules that change

Federal and state labor law evolves. The thresholds and rules in this spec are current as of April 2026. A rebuilder must:
- Preserve the explicit "Last Updated" date display
- Keep threshold data separate from logic so annual updates don't require code changes
- Include the regulatory context tab so users understand the current landscape

### 2. This tool is not a substitute for legal advice

Every version of this tool, in every code file and in the UI itself, must include a disclaimer that the tool provides guidance based on encoded regulatory criteria and is not a substitute for legal advice. Borderline cases must be flagged for legal review.

### 3. The "duties test" is where misclassification happens

The salary test is mathematical. The duties test is judgment-based. A rebuilder must NOT shortcut the duties test or treat the salary test as sufficient. Every exemption path in this tool tests duties separately and explicitly.

### 4. More protective standard wins

When federal and state law conflict, the standard more protective of the employee applies. The tool must implement this rule consistently. Never classify someone as exempt based on federal standards alone when state standards are stricter.

### 5. Production vs. administrative is the key fintech distinction

For a fintech/crypto company like Fireblocks, the employees who BUILD the product (software engineers, protocol developers) are generally NOT administrative exempt employees, even if they exercise discretion. The administrative exemption is for employees who run the business AROUND the product. Getting this distinction wrong is the single most common misclassification error.

---

## About the Original Tool

The original tool was built for **Fireblocks**, a crypto infrastructure company with approximately 99% exempt employees in the US, preparing for IPO. The tool was built for use by the Senior Director of Total Rewards and People Operations and her team (People Ops associates and People Business Partners).

The context matters for tone, examples, and fintech-specific guidance baked into the questions. A rebuilder should preserve the fintech-oriented examples but can adapt tone for other industries.

---

## What This Spec Does Not Cover

- Specific database or backend requirements (the original is client-side only with no persistence)
- Authentication or access controls (the original is a single-user tool)
- Multi-language support (the original is English only)
- Bulk/batch processing (the original handles one classification at a time)
- Integration with HRIS systems (the original is standalone)

If a rebuilder needs any of these, they are extensions beyond this spec.

---

Continue to `01-overview.md`.
