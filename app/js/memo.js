/* Memo generator. Produces HTML for display/print, plain text for copy,
   and a standalone HTML file for download. All user-facing copy is
   verbatim per spec/07-memo-output.md. */

const Memo = (function () {
  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtUSD(n) {
    if (n === null || n === undefined || n === "") return "0";
    const num = Number(n);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
  }

  function fmtDate(d) {
    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  /* Accepts either a plain Date or "YYYY-MM-DD" intake date string. */
  function fmtIntakeDate(s) {
    if (!s) return "";
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const [_, y, mo, d] = m;
      const months = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      return `${months[parseInt(mo, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
    }
    return s;
  }

  function _statusMeta(status) {
    switch (status) {
      case "pass": return { icon: "✓ PASS", cls: "pass" };
      case "fail": return { icon: "✗ FAIL", cls: "fail" };
      case "warn": return { icon: "⚠ BORDERLINE", cls: "warn" };
      case "skip": return { icon: "— SKIPPED", cls: "skip" };
      default: return { icon: "— N/A", cls: "skip" };
    }
  }

  function _classTypeLabel(classType) {
    return classType === "reclass" ? "Reclassification Review" : "New Hire Classification";
  }

  function _payBasisLabel(value) {
    if (!value) return "—";
    const opt = (typeof PAY_BASIS_OPTIONS !== "undefined")
      ? PAY_BASIS_OPTIONS.find(o => o.value === value)
      : null;
    return opt ? opt.label : value;
  }

  function _currentClassLabel(value) {
    if (value === "exempt") return "Exempt";
    if (value === "non_exempt") return "Non-exempt";
    return "—";
  }

  function _confidenceLabel(level) {
    if (level === "high") return "HIGH";
    if (level === "medium") return "MEDIUM";
    if (level === "low") return "LOW";
    return "—";
  }

  function _severityLabel(sev) {
    if (sev === "critical") return "CRITICAL";
    if (sev === "high") return "HIGH";
    if (sev === "medium") return "MEDIUM";
    if (sev === "low") return "LOW";
    return "—";
  }

  function _jurisdictionNote(emp) {
    const stateKey = getStateKey(emp.workState);
    if (stateKey === "federal") return "No additional state overlay (federal standards apply)";
    return `${getThreshold(emp.workState).label} state law`;
  }

  function _orgLine() {
    const org = (typeof ORG_NAME === "string" && ORG_NAME.trim())
      ? `${ORG_NAME.trim()}, People Operations`
      : "People Operations";
    return org;
  }

  function _disclaimerText() {
    const subject = (typeof ORG_NAME === "string" && ORG_NAME.trim()) ? ORG_NAME.trim() : "Organizations";
    /* Mirrors the in-app footer disclaimer so legal-protection language
       travels with any printed, copied, or downloaded memo artifact —
       not just the live web view. Spec/07 verbatim sentence is preserved
       as the second sentence; user-responsibility + no-liability language
       added per user requirement to limit liability. */
    return `This tool is provided for informational purposes only and does not constitute legal advice. It provides guidance based on encoded federal and state regulatory criteria current as of ${TOOL_VERSION_DATE}. Final classification decisions remain the user's responsibility. Consult qualified employment counsel for borderline cases, complex multi-state scenarios, when state-specific nuances require interpretation, or for any classification with material legal or financial implications. ${subject} should perform annual reviews of all exempt classifications, with particular attention to state threshold changes effective each January 1. The author and operator of this tool assume no liability for decisions made using its output, for the accuracy of underlying regulatory data, or for any damages arising from its use. Use of this tool, and reliance on its output, constitutes acceptance of these terms.`;
  }

  function _privacyText() {
    return "Privacy: Your data stays in your browser. Nothing you enter — names, salaries, classification answers — is transmitted, stored remotely, or logged. Closing the tab clears the session. The page does load Google Fonts from fonts.googleapis.com so Google can see when the page was opened, but no employee information is ever sent.";
  }

  /* ── Reclass helper ────────────────────────────────────────
     Only generated when classType=reclass AND we know the current
     classification AND it differs from the recommendation. Returns null
     when no helper is needed. */
  function _reclassHelper(emp, overall) {
    if (emp.classType !== "reclass") return null;
    if (emp.currentClass !== "exempt" && emp.currentClass !== "non_exempt") return null;
    /* Helper is only emitted when the recommendation is unambiguous AND
       it differs from the current classification. "review" outcomes
       trigger the dedicated reclass-uncertain risk flag instead, since
       the right next step is legal review, not the back-pay/timekeeping
       playbook this helper describes. */
    if (overall.outcome !== "exempt" && overall.outcome !== "non-exempt") return null;
    const recommendsExempt = overall.outcome === "exempt";
    const isExempt = emp.currentClass === "exempt";
    if (recommendsExempt === isExempt) return null;  /* No change needed. */

    if (isExempt && !recommendsExempt) {
      return {
        title: "Reclassification Considerations: Exempt → Non-Exempt",
        steps: [
          "Confirm the analysis above with employment counsel before acting.",
          "Calculate back-pay exposure: estimate overtime owed for the FLSA lookback window (typically 2 years; 3 years if the misclassification is found to be willful). Pull recent timekeeping or time-tracking estimates.",
          "Plan the timekeeping rollout: choose a tool, draft training, and set the effective conversion date.",
          "Communicate carefully: most employees experience reclassification to non-exempt as a status loss. Frame it as a compliance correction that protects their right to overtime pay, and explain how their take-home pay will be calculated going forward.",
          "Coordinate with payroll on the conversion date and any pro-rated salary-to-hourly recalculation.",
          "Document the duties analysis (this memo is a starting point, not the final record)."
        ]
      };
    }
    return {
      title: "Reclassification Considerations: Non-Exempt → Exempt",
      steps: [
        "Confirm the analysis above with employment counsel before acting.",
        "Audit the past 2-3 years of timekeeping for any unpaid overtime — if back-pay liability exists from the prior non-exempt period, address it before the conversion.",
        "Confirm salary level meets the applicable EAP/HCE threshold from the effective date forward, including any state-specific minimum.",
        "Document the duties basis carefully. Reclassifying TO exempt invites scrutiny if the role is later challenged.",
        "Communicate the change clearly: many employees will perceive the loss of overtime as a pay cut even if base salary increases. Be explicit about the trade-off.",
        "Update job description, comp band, and HRIS classification flag together."
      ]
    };
  }

  /* ── Shared section builders ───────────────────────────── */

  function _sections(emp, results, overall, riskFlags) {
    const genDate = fmtDate(new Date());
    const orgLine = _orgLine();
    const resultsOrder = ["hce", "computer", "admin", "executive", "professional", "sales"];

    const needsOvertime = overall.outcome === "non-exempt" || overall.outcome === "review";
    const overtime = needsOvertime ? generateOvertimeRules(emp) : [];

    return { genDate, orgLine, resultsOrder, needsOvertime, overtime };
  }

  /* ── Questionnaire response audit trail ─────────────────── */

  /* Convert a question + answer pair into a short human-readable line.
     Looks up the option label from the question definition, with
     graceful fallback to the raw value. The `source` field distinguishes
     answers the user picked from answers auto-detected from intake — an
     audit-trail reader needs to know which decisions a human actually
     made. */
  function _answerLine(q, value, source) {
    if (!q) return null;
    if (value === undefined || value === null) return null;
    const opt = q.options.find(o => o.value === value);
    const answerText = opt ? opt.label : String(value);
    return { question: q.label, answer: answerText, exemption: q.exemption, source: source };
  }

  function _questionnaireLines(emp, answers, autoApplied) {
    autoApplied = autoApplied || {};
    const questions = (typeof buildQuestions === "function")
      ? buildQuestions(emp, answers)
      : [];
    const groups = {};
    for (const q of questions) {
      const value = answers[q.id];
      if (value === undefined) continue;
      /* Skip if condition currently active — we don't want to show
         questions that the engine pruned from the flow. */
      if (q.skipIf && q.skipIf(answers)) continue;
      const source = autoApplied[q.id] ? "auto" : "user";
      const line = _answerLine(q, value, source);
      if (!line) continue;
      if (!groups[q.exemption]) groups[q.exemption] = [];
      groups[q.exemption].push(line);
    }
    return groups;
  }

  /* ── HTML for display (inside the app, styled by memo.css) ─ */

  function renderHTML(emp, results, overall, riskFlags, opts) {
    opts = opts || {};
    const confidence = opts.confidence || null;
    const memoId = opts.memoId || "";
    const answers = opts.answers || {};
    const autoApplied = opts.autoApplied || {};
    const { genDate, orgLine, resultsOrder, needsOvertime, overtime } = _sections(emp, results, overall, riskFlags);

    const infoRow = (label, value) =>
      `<div class="info-row"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`;

    const isReclass = emp.classType === "reclass";
    const infoRows = [
      infoRow("Classification Type:", _classTypeLabel(emp.classType)),
      isReclass ? infoRow("Current Classification:", _currentClassLabel(emp.currentClass)) : "",
      infoRow("Name / Role:", emp.empName || "—"),
      infoRow("Job Title:", emp.jobTitle || "—"),
      infoRow("Department:", emp.department || "—"),
      infoRow("Primary Work State:", emp.workState || "—"),
      infoRow("Annual Base Salary:", `$${fmtUSD(emp.baseSalary)}`),
      infoRow("Total Annual Compensation:", `$${fmtUSD(emp.totalComp)}`),
      emp.hourlyRate ? infoRow("Hourly Rate:", `$${fmtUSD(emp.hourlyRate)}`) : "",
      infoRow("Pay Basis:", _payBasisLabel(emp.payBasis)),
      infoRow("Applicable Jurisdiction:", `Federal FLSA + ${_jurisdictionNote(emp)}`),
      emp.reviewerName ? infoRow("Reviewed by:", emp.reviewerName) : "",
      emp.effectiveDate ? infoRow("Effective Date:", fmtIntakeDate(emp.effectiveDate)) : ""
    ].join("");

    const recBody = _formatRecommendation(overall);
    const confidenceHtml = confidence ? `
      <div class="confidence-row confidence-${escapeHtml(confidence.level)}">
        <span class="confidence-label">Confidence:</span>
        <span class="confidence-value">${escapeHtml(_confidenceLabel(confidence.level))}</span>
        <ul class="confidence-reasons">
          ${confidence.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join("")}
        </ul>
      </div>
    ` : "";

    const exemptionBlocks = resultsOrder.map(key => {
      const r = results[key];
      const meta = _statusMeta(r.status);
      const detailsHtml = (r.details && r.details.length)
        ? `<ul class="exemption-details">${r.details.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
        : "";
      return `<div class="exemption-block ${meta.cls}">
        <div class="exemption-header">${escapeHtml(meta.icon)} ${escapeHtml(r.title)}</div>
        <div class="exemption-summary">${escapeHtml(r.summary)}</div>
        ${detailsHtml}
      </div>`;
    }).join("");

    const overtimeHtml = needsOvertime ? `
      <div class="memo-section">
        <h2 class="memo-section-heading">APPLICABLE OVERTIME RULES</h2>
        ${overtime.map(s => `<p class="ot-section"><strong>${escapeHtml(s.label)}:</strong> ${escapeHtml(s.text)}</p>`).join("")}
      </div>
    ` : "";

    const flagsHtml = riskFlags && riskFlags.length ? `
      <div class="memo-section">
        <h2 class="memo-section-heading">RISK FLAGS &amp; CONSIDERATIONS</h2>
        ${riskFlags.map(f => {
          const sev = f.severity || "medium";
          return `<div class="risk-block sev-${escapeHtml(sev)}">
            <div class="risk-block-header">
              <span class="risk-severity sev-${escapeHtml(sev)}">${escapeHtml(_severityLabel(sev))}</span>
              <span class="risk-title">${escapeHtml(f.title || "")}</span>
            </div>
            <div class="risk-body">${escapeHtml(f.body || "")}</div>
          </div>`;
        }).join("")}
      </div>
    ` : "";

    const reclass = _reclassHelper(emp, overall);
    const reclassHtml = reclass ? `
      <div class="memo-section reclass-section">
        <h2 class="memo-section-heading">RECLASSIFICATION CONSIDERATIONS</h2>
        <div class="reclass-block">
          <div class="reclass-title">${escapeHtml(reclass.title)}</div>
          <ol class="reclass-steps">
            ${reclass.steps.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
          </ol>
        </div>
      </div>
    ` : "";

    const answerGroups = _questionnaireLines(emp, answers, autoApplied);
    const answerSections = Object.keys(answerGroups);
    const answerHtml = answerSections.length ? `
      <div class="memo-section">
        <h2 class="memo-section-heading">QUESTIONNAIRE RESPONSES</h2>
        <p class="answer-legend">Each line shows the question, the selected answer, and whether the answer was <strong>chosen by the user</strong> or <strong>auto-detected from intake</strong> (e.g., a salary above threshold auto-fills the salary test).</p>
        ${answerSections.map(group => `
          <div class="answer-group">
            <div class="answer-group-title">${escapeHtml(group)} Exemption</div>
            <ul class="answer-list">
              ${answerGroups[group].map(line => {
                const sourceLabel = line.source === "auto" ? "Auto-detected from intake" : "User selected";
                const sourceCls = line.source === "auto" ? "auto" : "user";
                return `<li>
                  <div class="answer-q">${escapeHtml(line.question)}</div>
                  <div class="answer-a">→ ${escapeHtml(line.answer)} <span class="answer-source ${sourceCls}">${escapeHtml(sourceLabel)}</span></div>
                </li>`;
              }).join("")}
            </ul>
          </div>
        `).join("")}
      </div>
    ` : "";

    const metaLine = `Generated: ${escapeHtml(genDate)} &nbsp;|&nbsp; Data last updated: ${escapeHtml(TOOL_VERSION_DATE)}${memoId ? ` &nbsp;|&nbsp; Memo ID: ${escapeHtml(memoId)}` : ""}`;

    return `
      <div class="memo">
        <div class="memo-header">
          <h1 class="memo-title">FLSA Exemption Classification Memo</h1>
          <div class="memo-subtitle">${escapeHtml(orgLine)}</div>
          <div class="memo-meta">${metaLine}</div>
        </div>

        <div class="memo-section">
          <h2 class="memo-section-heading">EMPLOYEE / ROLE INFORMATION</h2>
          ${infoRows}
        </div>

        <div class="memo-section">
          <div class="recommendation-box">
            <div class="recommendation-heading">Classification Recommendation</div>
            <div class="recommendation-body">${recBody}</div>
            ${confidenceHtml}
          </div>
        </div>

        <div class="memo-section">
          <h2 class="memo-section-heading">EXEMPTION ANALYSIS</h2>
          ${exemptionBlocks}
        </div>

        ${overtimeHtml}
        ${flagsHtml}
        ${reclassHtml}
        ${answerHtml}

        <p class="disclaimer">${escapeHtml(_disclaimerText())}</p>
        <p class="disclaimer privacy">${escapeHtml(_privacyText())}</p>
      </div>
    `;
  }

  /* Bold the verdict token in the recommendation body. */
  function _formatRecommendation(overall) {
    const tokens = ["EXEMPT", "NON-EXEMPT", "LEGAL REVIEW REQUIRED"];
    /* NON-EXEMPT must be matched before EXEMPT. */
    const ordered = ["LEGAL REVIEW REQUIRED", "NON-EXEMPT", "EXEMPT"];
    let out = escapeHtml(overall.text);
    for (const t of ordered) {
      const re = new RegExp(t.replace(/ /g, "\\s"), "g");
      out = out.replace(re, `<strong>${t}</strong>`);
    }
    return out;
  }

  /* ── Plain text (for copy-to-clipboard) ─────────────────── */

  function renderText(emp, results, overall, riskFlags, opts) {
    opts = opts || {};
    const confidence = opts.confidence || null;
    const memoId = opts.memoId || "";
    const answers = opts.answers || {};
    const autoApplied = opts.autoApplied || {};
    const { genDate, orgLine, resultsOrder, needsOvertime, overtime } = _sections(emp, results, overall, riskFlags);
    const lines = [];
    lines.push("FLSA Exemption Classification Memo");
    lines.push(orgLine);
    let metaLine = `Generated: ${genDate} | Data last updated: ${TOOL_VERSION_DATE}`;
    if (memoId) metaLine += ` | Memo ID: ${memoId}`;
    lines.push(metaLine);
    lines.push("");
    lines.push("EMPLOYEE / ROLE INFORMATION");
    lines.push(`Classification Type: ${_classTypeLabel(emp.classType)}`);
    if (emp.classType === "reclass") {
      lines.push(`Current Classification: ${_currentClassLabel(emp.currentClass)}`);
    }
    lines.push(`Name / Role: ${emp.empName || "—"}`);
    lines.push(`Job Title: ${emp.jobTitle || "—"}`);
    lines.push(`Department: ${emp.department || "—"}`);
    lines.push(`Primary Work State: ${emp.workState || "—"}`);
    lines.push(`Annual Base Salary: $${fmtUSD(emp.baseSalary)}`);
    lines.push(`Total Annual Compensation: $${fmtUSD(emp.totalComp)}`);
    if (emp.hourlyRate) lines.push(`Hourly Rate: $${fmtUSD(emp.hourlyRate)}`);
    lines.push(`Pay Basis: ${_payBasisLabel(emp.payBasis)}`);
    lines.push(`Applicable Jurisdiction: Federal FLSA + ${_jurisdictionNote(emp)}`);
    if (emp.reviewerName) lines.push(`Reviewed by: ${emp.reviewerName}`);
    if (emp.effectiveDate) lines.push(`Effective Date: ${fmtIntakeDate(emp.effectiveDate)}`);
    lines.push("");
    lines.push("Classification Recommendation");
    lines.push(overall.text);
    if (confidence) {
      lines.push("");
      lines.push(`Confidence: ${_confidenceLabel(confidence.level)}`);
      for (const r of confidence.reasons) lines.push(`  - ${r}`);
    }
    lines.push("");
    lines.push("EXEMPTION ANALYSIS");
    for (const key of resultsOrder) {
      const r = results[key];
      const meta = _statusMeta(r.status);
      lines.push(`${meta.icon} ${r.title}`);
      lines.push(`  ${r.summary}`);
      if (r.details && r.details.length) {
        for (const d of r.details) lines.push(`  • ${d}`);
      }
      lines.push("");
    }
    if (needsOvertime) {
      lines.push("APPLICABLE OVERTIME RULES");
      for (const s of overtime) {
        lines.push(`${s.label}: ${s.text}`);
        lines.push("");
      }
    }
    if (riskFlags && riskFlags.length) {
      lines.push("RISK FLAGS & CONSIDERATIONS");
      for (const f of riskFlags) {
        const sev = _severityLabel(f.severity || "medium");
        lines.push(`[${sev}] ${f.title || ""}`);
        if (f.body) lines.push(`  ${f.body}`);
      }
      lines.push("");
    }
    const reclass = _reclassHelper(emp, overall);
    if (reclass) {
      lines.push("RECLASSIFICATION CONSIDERATIONS");
      lines.push(reclass.title);
      reclass.steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
      lines.push("");
    }
    const answerGroups = _questionnaireLines(emp, answers, autoApplied);
    const answerSections = Object.keys(answerGroups);
    if (answerSections.length) {
      lines.push("QUESTIONNAIRE RESPONSES");
      lines.push("(Each line shows whether the answer was [user] selected or [auto] detected from intake.)");
      for (const group of answerSections) {
        lines.push(`${group} Exemption`);
        for (const line of answerGroups[group]) {
          const tag = line.source === "auto" ? "[auto]" : "[user]";
          lines.push(`  Q: ${line.question}`);
          lines.push(`  A ${tag}: ${line.answer}`);
        }
        lines.push("");
      }
    }
    lines.push(_disclaimerText());
    lines.push("");
    lines.push(_privacyText());
    return lines.join("\n");
  }

  /* ── Standalone HTML (for download — self-contained) ───── */

  function renderStandaloneHTML(emp, results, overall, riskFlags, opts) {
    const inner = renderHTML(emp, results, overall, riskFlags, opts);
    const css = `
      body { font-family: "Outfit", system-ui, sans-serif; background: #fff; color: #15181d; margin: 0; padding: 40px 30px; max-width: 800px; margin: 0 auto; }
      * { box-sizing: border-box; }
      h1, h2, h3 { margin: 0; font-weight: 600; }
      .memo { background: #fff; }
      .memo-header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e0e3e8; margin-bottom: 28px; }
      .memo-title { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
      .memo-subtitle { font-size: 14px; color: #5f6672; margin-bottom: 8px; }
      .memo-meta { font-size: 11px; color: #8b919d; font-family: "JetBrains Mono", monospace; }
      .memo-section { margin-bottom: 28px; }
      .memo-section-heading { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; color: #5f6672; padding-bottom: 8px; border-bottom: 1px solid #e0e3e8; margin-bottom: 14px; }
      .info-row { display: grid; grid-template-columns: 240px 1fr; gap: 16px; padding: 8px 0; border-bottom: 1px dashed #e0e3e8; font-size: 14px; }
      .info-row:last-child { border-bottom: none; }
      .info-row .label { font-weight: 500; color: #5f6672; }
      .recommendation-box { border: 2px solid #9b7b24; background: #f5ecd5; border-radius: 10px; padding: 20px 24px; }
      .recommendation-heading { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; color: #9b7b24; margin-bottom: 8px; }
      .recommendation-body { font-size: 15px; line-height: 1.55; white-space: pre-wrap; }
      .recommendation-body strong { font-weight: 700; }
      .confidence-row { margin-top: 14px; padding: 10px 12px; border-radius: 6px; font-size: 12px; line-height: 1.5; background: #fff; border: 1px solid #e0e3e8; }
      .confidence-row.confidence-high { background: #e6f5ee; border-color: #a7d9bf; }
      .confidence-row.confidence-medium { background: #fef5e0; border-color: #e6c97a; }
      .confidence-row.confidence-low { background: #fce8e8; border-color: #e6a5a5; }
      .confidence-label { font-weight: 600; color: #5f6672; margin-right: 6px; letter-spacing: 0.08em; text-transform: uppercase; font-size: 10px; }
      .confidence-value { font-weight: 700; }
      .confidence-reasons { margin: 6px 0 0 0; padding-left: 18px; font-size: 12px; color: #15181d; }
      .exemption-block { padding: 14px 16px; border-radius: 7px; border-left: 3px solid; margin-bottom: 10px; }
      .exemption-block.pass { background: #e6f5ee; border-left-color: #1a8c5b; }
      .exemption-block.fail { background: #fce8e8; border-left-color: #c73a3a; }
      .exemption-block.warn { background: #fef5e0; border-left-color: #b07c10; }
      .exemption-block.skip { background: #ece7db; border-left-color: #666056; }
      .exemption-header { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
      .exemption-block.pass .exemption-header { color: #1a8c5b; }
      .exemption-block.fail .exemption-header { color: #c73a3a; }
      .exemption-block.warn .exemption-header { color: #b07c10; }
      .exemption-block.skip .exemption-header { color: #666056; }
      .exemption-summary { font-size: 14px; line-height: 1.55; margin-bottom: 8px; }
      .exemption-details { padding-left: 18px; margin: 0; font-size: 13px; color: #5f6672; list-style: disc; }
      .ot-section { margin-bottom: 14px; font-size: 14px; line-height: 1.6; }
      .risk-block { padding: 12px 14px; border-radius: 6px; font-size: 13px; line-height: 1.55; color: #15181d; margin-bottom: 10px; border-left: 3px solid #b07c10; background: #fef5e0; }
      .risk-block.sev-critical { background: #fce8e8; border-left-color: #c73a3a; }
      .risk-block.sev-high { background: #fef5e0; border-left-color: #b07c10; }
      .risk-block.sev-medium { background: #fbf2dd; border-left-color: #b07c10; }
      .risk-block.sev-low { background: #f3eee0; border-left-color: #666056; }
      .risk-block-header { display: flex; gap: 10px; align-items: baseline; margin-bottom: 4px; flex-wrap: wrap; }
      .risk-severity { font-weight: 700; font-size: 10px; letter-spacing: 0.1em; padding: 2px 8px; border-radius: 4px; background: rgba(0,0,0,0.06); }
      .risk-severity.sev-critical { background: #c73a3a; color: #fff; }
      .risk-severity.sev-high { background: #b07c10; color: #fff; }
      .risk-severity.sev-medium { background: rgba(176,124,16,0.2); color: #6a4c08; }
      .risk-severity.sev-low { background: rgba(102,96,86,0.2); color: #4a4439; }
      .risk-title { font-weight: 700; font-size: 13px; }
      .risk-body { color: #5f6672; }
      .reclass-section .reclass-block { padding: 14px 18px; background: #f5ecd5; border-left: 3px solid #9b7b24; border-radius: 6px; }
      .reclass-title { font-weight: 700; margin-bottom: 8px; }
      .reclass-steps { margin: 0; padding-left: 22px; font-size: 13px; color: #15181d; line-height: 1.6; }
      .reclass-steps li { margin-bottom: 6px; }
      .answer-group { margin-bottom: 14px; }
      .answer-group-title { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #9b7b24; margin-bottom: 6px; }
      .answer-list { list-style: none; margin: 0; padding: 0; font-size: 13px; }
      .answer-list li { padding: 6px 0; border-bottom: 1px dashed #e0e3e8; }
      .answer-list li:last-child { border-bottom: none; }
      .answer-legend { font-size: 12px; color: #8b919d; margin: 0 0 12px; font-style: italic; line-height: 1.5; }
      .answer-legend strong { color: #5f6672; font-style: normal; font-weight: 600; }
      .answer-q { color: #5f6672; }
      .answer-a { color: #15181d; padding-left: 16px; }
      .answer-source { display: inline-block; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; padding: 1px 6px; border-radius: 3px; margin-left: 6px; vertical-align: 1px; }
      .answer-source.user { background: rgba(26,140,91,0.14); color: #1a8c5b; }
      .answer-source.auto { background: rgba(155,123,36,0.14); color: #9b7b24; }
      .disclaimer { padding-top: 20px; margin-top: 28px; border-top: 1px solid #e0e3e8; font-size: 12px; font-style: italic; color: #8b919d; line-height: 1.6; }
      .disclaimer.privacy { padding-top: 8px; margin-top: 6px; border-top: none; font-style: normal; }
    `;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>FLSA Classification Memo — ${escapeHtml(emp.jobTitle || emp.empName || "Classification")}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>${css}</style>
</head>
<body>${inner}</body>
</html>`;
  }

  return { renderHTML, renderText, renderStandaloneHTML };
})();
