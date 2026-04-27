# FLSA Toolkit (flsa.arminoorata.com)

A single-page web tool for People Operations to classify US employees as
exempt or non-exempt under FLSA + applicable state law. Vanilla
HTML/CSS/JS — no build step.

> **Visual / chrome consistency:** This is a sibling subdomain of
> `arminoorata.com`. Header, footer, palette, and typography must match
> the pattern documented in
> [/srv/projects/SIBLING_TOOL_PATTERN.md](../SIBLING_TOOL_PATTERN.md).
> Read that file first before changing any chrome.

## Reference

- Spec: [`spec/`](./spec/) — read `spec/00-README.md` first.
- App code: [`app/`](./app/)
- Tests: [`tests/`](./tests/) — `node tests/run-node.js` runs the 10 regression scenarios; `node tests/boot-test.js` runs the jsdom UI test.
- Annual maintenance checklist: [`README.md`](./README.md) + [`CHANGELOG.md`](./CHANGELOG.md).

## Constraints

- No build step, no framework, no package manager. Vanilla HTML/CSS/JS so a non-engineer can update threshold data each January.
- Verbatim fidelity to spec for question wording, threshold values, and evaluation logic. Visual styling is the safe-to-change layer.
- Update `TOOL_VERSION_DATE` in `app/data/constants.js` whenever you review or revise legal data.
