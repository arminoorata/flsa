# FLSA Exemption Classification Tool

A single-page web tool for People Operations to classify US employees as exempt or non-exempt under the Fair Labor Standards Act (FLSA) and applicable state law. Produces a documented recommendation memo suitable for audit records.

**Built from the spec in [`spec/`](./spec/).** Reproduces every question, threshold, and evaluation rule verbatim.

---

## Deployment

- **Primary URL:** https://flsa.arminoorata.com
- **Stack:** Vanilla HTML + CSS + JavaScript (no framework, no build step)
- **Hosting:** Serve the contents of [`app/`](./app/) as static files. Any static host works (Vercel, Netlify, GitHub Pages, Cloudflare Pages, S3 + CloudFront).

### Vercel deploy (recommended)

```bash
cd app/
vercel --prod
```

Point the `flsa.arminoorata.com` DNS CNAME at the Vercel deployment.

### Simplest local preview

```bash
cd app/
python3 -m http.server 8080
# open http://localhost:8080
```

---

## File structure

```
flsa-classification-tool/
├── spec/                       # Source specification (read-only reference)
├── app/                        # Deployable static tool
│   ├── index.html
│   ├── css/
│   │   ├── base.css            # Palette (dark default + light), typography, layout
│   │   ├── components.css      # Tabs, cards, buttons, progress, options, forms
│   │   └── memo.css            # Memo + regulatory tab + print overrides
│   ├── data/
│   │   ├── constants.js        # TOOL_VERSION_DATE, FEDERAL_HCE_THRESHOLD, STRICT_ADMIN_STATES, ORG_NAME, STAGES
│   │   ├── thresholds.js       # THRESHOLDS (federal + 8 states) — UPDATE ANNUALLY
│   │   ├── states.js           # STATES list + STATE_TO_THRESHOLD map
│   │   ├── questions.js        # buildQuestions(empData, answers) — 20 questions
│   │   └── regulatory.js       # Federal + state regulatory narrative panels
│   └── js/
│       ├── evaluator.js        # Pure evaluation functions (one per exemption)
│       ├── memo.js             # HTML/text/standalone-HTML memo generation
│       ├── engine.js           # State + navigation
│       ├── ui.js               # DOM rendering
│       └── app.js              # Entry point
├── tests/
│   ├── scenarios.js            # 8 canonical + proposed scenarios
│   ├── scenarios.html          # In-browser test harness
│   ├── run-node.js             # CLI runner (use in CI)
│   └── smoke-node.js           # Memo rendering smoke test
├── CHANGELOG.md
└── README.md
```

---

## Annual maintenance (every Q4, before January 1 effective dates)

Per [`spec/09-maintenance-and-extension.md`](spec/09-maintenance-and-extension.md).

1. **Gather new threshold data** from DOL, CA DIR, NY DOL, WA L&I, CO DLE, ME DOL, OR BOLI, CT DOL.
2. **Update** `app/data/thresholds.js` — each jurisdiction's `eapWeekly`, `eapAnnual`, `computer` display string, `computerSalaryAnnual`, `computerHourly`, and `notes` if rules changed.
3. **Update** `TOOL_VERSION_DATE` in `app/data/constants.js`.
4. **Review & update** `app/data/regulatory.js` for any rulemaking narrative that has gone stale.
5. **Run regression tests:**
   ```bash
   node tests/run-node.js    # CLI
   # or open tests/scenarios.html in a browser
   ```
   All 8 scenarios must pass. If any fail, investigate before shipping.
6. **Add a dated entry** to [`CHANGELOG.md`](CHANGELOG.md) describing what changed.
7. **Deploy** the updated `app/` directory.

Data files are separate from logic code by design. An annual update should NOT require any edits outside `data/`.

---

## Customization

**Organization branding.** Set `ORG_NAME` in `app/data/constants.js`:
- Blank (default): memo subtitle reads "People Operations" and disclaimer references "Organizations"
- Set to `"Acme Corp"`: memo subtitle reads "Acme Corp, People Operations" and disclaimer references "Acme Corp"

No other changes required to rebrand.

**Theme default.** Dark by default to match arminoorata.com. Users can toggle via the sun/moon button in the header; preference is persisted in `localStorage` under `flsa-theme`.

---

## Regression scenarios

`tests/scenarios.js` contains 10 scenarios — 5 directly from [`spec/06-evaluation-logic.md`](spec/06-evaluation-logic.md) plus 5 added to cover paths the canonical set missed:

| # | Scenario | Source |
|---|----------|--------|
| 1 | CA Software Engineer below state threshold | spec 06 |
| 2 | TX Senior Engineering Manager | spec 06 |
| 3 | CT Senior Director | spec 06 |
| 4 | Inside Sales Rep | spec 06 |
| 5 | NYC Compliance Officer serving clients | spec 06 |
| 6 | WA Senior Software Engineer (state hourly threshold) | proposed |
| 7 | OR Client-Facing Compliance Consultant (strict admin state) | proposed |
| 8 | Working-Manager Borderline (exec partial WARN path) | proposed |
| 9 | CT employee below HCE threshold (hce_ct_block skip guard) | proposed |
| 10 | Reclassification Review (risk Flag 6) | proposed |

Run in Node: `node tests/run-node.js`
Run in browser: open `tests/scenarios.html`

---

## License

Internal. Not a substitute for legal advice. See disclaimer in every generated memo.
