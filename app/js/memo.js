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
    return `This tool provides guidance based on encoded federal and state regulatory criteria current as of ${TOOL_VERSION_DATE}. It is not a substitute for legal advice. Consult employment counsel for borderline cases, complex multi-state scenarios, or when state-specific nuances require interpretation. ${subject} should perform annual reviews of all exempt classifications, with particular attention to state threshold changes effective each January 1.`;
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

  /* ── HTML for display (inside the app, styled by memo.css) ─ */

  function renderHTML(emp, results, overall, riskFlags) {
    const { genDate, orgLine, resultsOrder, needsOvertime, overtime } = _sections(emp, results, overall, riskFlags);

    const infoRow = (label, value) =>
      `<div class="info-row"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`;

    const infoRows = [
      infoRow("Classification Type:", _classTypeLabel(emp.classType)),
      infoRow("Name / Role:", emp.empName || "—"),
      infoRow("Job Title:", emp.jobTitle || "—"),
      infoRow("Department:", emp.department || "—"),
      infoRow("Primary Work State:", emp.workState || "—"),
      infoRow("Annual Base Salary:", `$${fmtUSD(emp.baseSalary)}`),
      infoRow("Total Annual Compensation:", `$${fmtUSD(emp.totalComp)}`),
      emp.hourlyRate ? infoRow("Hourly Rate:", `$${fmtUSD(emp.hourlyRate)}`) : "",
      infoRow("Applicable Jurisdiction:", `Federal FLSA + ${_jurisdictionNote(emp)}`)
    ].join("");

    const recBody = _formatRecommendation(overall);

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
        ${riskFlags.map(f => `<div class="risk-block">${escapeHtml(f)}</div>`).join("")}
      </div>
    ` : "";

    return `
      <div class="memo">
        <div class="memo-header">
          <h1 class="memo-title">FLSA Exemption Classification Memo</h1>
          <div class="memo-subtitle">${escapeHtml(orgLine)}</div>
          <div class="memo-meta">Generated: ${escapeHtml(genDate)} &nbsp;|&nbsp; Tool Version: ${escapeHtml(TOOL_VERSION_DATE)}</div>
        </div>

        <div class="memo-section">
          <h2 class="memo-section-heading">EMPLOYEE / ROLE INFORMATION</h2>
          ${infoRows}
        </div>

        <div class="memo-section">
          <div class="recommendation-box">
            <div class="recommendation-heading">Classification Recommendation</div>
            <div class="recommendation-body">${recBody}</div>
          </div>
        </div>

        <div class="memo-section">
          <h2 class="memo-section-heading">EXEMPTION ANALYSIS</h2>
          ${exemptionBlocks}
        </div>

        ${overtimeHtml}
        ${flagsHtml}

        <p class="disclaimer">${escapeHtml(_disclaimerText())}</p>
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

  function renderText(emp, results, overall, riskFlags) {
    const { genDate, orgLine, resultsOrder, needsOvertime, overtime } = _sections(emp, results, overall, riskFlags);
    const lines = [];
    lines.push("FLSA Exemption Classification Memo");
    lines.push(orgLine);
    lines.push(`Generated: ${genDate} | Tool Version: ${TOOL_VERSION_DATE}`);
    lines.push("");
    lines.push("EMPLOYEE / ROLE INFORMATION");
    lines.push(`Classification Type: ${_classTypeLabel(emp.classType)}`);
    lines.push(`Name / Role: ${emp.empName || "—"}`);
    lines.push(`Job Title: ${emp.jobTitle || "—"}`);
    lines.push(`Department: ${emp.department || "—"}`);
    lines.push(`Primary Work State: ${emp.workState || "—"}`);
    lines.push(`Annual Base Salary: $${fmtUSD(emp.baseSalary)}`);
    lines.push(`Total Annual Compensation: $${fmtUSD(emp.totalComp)}`);
    if (emp.hourlyRate) lines.push(`Hourly Rate: $${fmtUSD(emp.hourlyRate)}`);
    lines.push(`Applicable Jurisdiction: Federal FLSA + ${_jurisdictionNote(emp)}`);
    lines.push("");
    lines.push("Classification Recommendation");
    lines.push(overall.text);
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
        lines.push(`• ${f}`);
      }
      lines.push("");
    }
    lines.push(_disclaimerText());
    return lines.join("\n");
  }

  /* ── Standalone HTML (for download — self-contained) ───── */

  function renderStandaloneHTML(emp, results, overall, riskFlags) {
    const inner = renderHTML(emp, results, overall, riskFlags);
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
      .risk-block { padding: 12px 14px; background: #fef5e0; border-left: 3px solid #b07c10; border-radius: 6px; font-size: 13px; line-height: 1.55; color: #5f6672; margin-bottom: 8px; }
      .disclaimer { padding-top: 20px; margin-top: 28px; border-top: 1px solid #e0e3e8; font-size: 12px; font-style: italic; color: #8b919d; line-height: 1.6; }
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
