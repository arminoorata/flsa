/* UI rendering: intake form, question cards, progress bar, regulatory tab.
   Works via innerHTML + event delegation on the #content container. */

const UI = (function () {
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

  function renderProgress() {
    const bar = document.getElementById("progress-bar");
    if (!bar) return;
    const { active, done } = Engine.getProgressState();
    const visited = Engine.getVisitedStages();
    const parts = [];
    for (let i = 0; i < STAGES.length; i++) {
      const isDone = done.indexOf(i) !== -1;
      const isActive = i === active;
      const isClickable = visited.has(i) && !isActive;
      const cls = isDone ? "done" : isActive ? "active" : "future";
      const marker = isDone ? "✓" : String(i + 1);
      const tagOpen = isClickable
        ? `<button type="button" class="progress-step ${cls} clickable" data-stage="${i}" title="Jump back to ${escapeHtml(STAGES[i])}">`
        : `<div class="progress-step ${cls}">`;
      const tagClose = isClickable ? "</button>" : "</div>";
      parts.push(`${tagOpen}<span class="progress-dot">${marker}</span><span class="progress-label">${escapeHtml(STAGES[i])}</span>${tagClose}`);
      if (i < STAGES.length - 1) {
        const connDone = done.indexOf(i) !== -1 && (done.indexOf(i + 1) !== -1 || i + 1 === active);
        parts.push(`<div class="progress-connector ${connDone ? "done" : ""}"></div>`);
      }
    }
    bar.innerHTML = parts.join("");
    bar.querySelectorAll(".progress-step.clickable").forEach(btn => {
      btn.addEventListener("click", () => {
        const stage = parseInt(btn.dataset.stage, 10);
        Engine.jumpToStage(stage);
        renderApp();
      });
    });
  }

  /* ── Intake form ───────────────────────────────────────── */

  function renderIntake() {
    const emp = Engine.getEmpData();
    const stateOptions = STATES.map(s => `<option value="${escapeHtml(s)}"${s === emp.workState ? " selected" : ""}>${escapeHtml(s)}</option>`).join("");
    const payBasisOptions = PAY_BASIS_OPTIONS.map(o =>
      `<option value="${escapeHtml(o.value)}"${o.value === emp.payBasis ? " selected" : ""}>${escapeHtml(o.label)}</option>`
    ).join("");
    const isReclass = emp.classType === "reclass";

    const content = document.getElementById("content");
    content.innerHTML = `
      <div class="card privacy-banner no-print" role="note" aria-label="Privacy notice">
        <span class="privacy-icon" aria-hidden="true">🔒</span>
        <div class="privacy-text">
          <strong>Your data stays in your browser.</strong> Nothing you enter — names, salaries, answers — is transmitted, stored remotely, or logged. Closing the tab clears the session. Save or print the memo locally if you need a record. (The page does load Google Fonts from <code>fonts.googleapis.com</code>, so Google can see when the page was opened, but no employee information is ever sent.)
        </div>
      </div>

      <div class="card">
        <p class="intake-intro">Answer the intake questions below, then walk through six exemption categories. The tool will generate a <strong>classification recommendation memo</strong> you can print or save.</p>

        <div class="field-row">
          <div class="field">
            <label for="classType">Classification Type<span class="req">*</span></label>
            <select id="classType">
              <option value="new_hire"${emp.classType === "new_hire" ? " selected" : ""}>New Hire Classification</option>
              <option value="reclass"${emp.classType === "reclass" ? " selected" : ""}>Reclassification Review</option>
            </select>
          </div>
          <div class="field" id="currentClass-field"${isReclass ? "" : " style=\"display:none\""}>
            <label for="currentClass">Current Classification${isReclass ? "<span class=\"req\">*</span>" : ""}</label>
            <select id="currentClass">
              <option value=""${!emp.currentClass ? " selected" : ""}>— Select —</option>
              <option value="exempt"${emp.currentClass === "exempt" ? " selected" : ""}>Exempt</option>
              <option value="non_exempt"${emp.currentClass === "non_exempt" ? " selected" : ""}>Non-exempt</option>
            </select>
            <div class="hint">Used to flag whether the recommendation differs from the existing classification.</div>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="empName">Employee Name or Role Title</label>
            <input type="text" id="empName" value="${escapeHtml(emp.empName || "")}" placeholder="Optional" />
          </div>
          <div class="field">
            <label for="jobTitle">Job Title<span class="req">*</span></label>
            <input type="text" id="jobTitle" value="${escapeHtml(emp.jobTitle || "")}" placeholder="e.g., Senior Software Engineer" />
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="department">Department</label>
            <input type="text" id="department" value="${escapeHtml(emp.department || "")}" placeholder="Optional" />
          </div>
          <div class="field">
            <label for="workState">Primary Work State<span class="req">*</span></label>
            <select id="workState">
              <option value="">— Select state —</option>
              ${stateOptions}
            </select>
          </div>
        </div>

        <div class="field-row single">
          <div class="field">
            <label for="additionalStates">Additional Work States (multi-state employees)</label>
            <select id="additionalStates" multiple size="4">
              ${STATES.map(s => {
                const sel = (Array.isArray(emp.additionalStates) && emp.additionalStates.indexOf(s) !== -1) ? " selected" : "";
                return `<option value="${escapeHtml(s)}"${sel}>${escapeHtml(s)}</option>`;
              }).join("")}
            </select>
            <div class="hint">Hold Ctrl / Cmd to select multiple. The analysis will use the most-protective state's rules; a HIGH risk flag will note all states in scope.</div>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="baseSalary">Annual Base Salary<span class="req">*</span></label>
            <input type="number" id="baseSalary" value="${emp.baseSalary || ""}" min="0" step="1" placeholder="e.g., 120000" />
            <div class="hint">USD, pre-tax</div>
          </div>
          <div class="field">
            <label for="totalComp">Total Annual Compensation</label>
            <input type="number" id="totalComp" value="${emp.totalComp || ""}" min="0" step="1" placeholder="Defaults to base salary if blank" />
            <div class="hint">Salary + nondiscretionary bonuses + commissions</div>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="hourlyRate">Hourly Rate (optional)</label>
            <input type="number" id="hourlyRate" value="${emp.hourlyRate || ""}" min="0" step="0.01" placeholder="For hourly workers only" />
            <div class="hint">Only needed if paid hourly; used for computer employee hourly-alternative test</div>
          </div>
          <div class="field">
            <label for="payBasis">Pay Basis<span class="req">*</span></label>
            <select id="payBasis">
              <option value="">— Select pay basis —</option>
              ${payBasisOptions}
            </select>
            <div class="hint">Required for the salary-basis test (Helix Energy v. Hewitt, 2023). Day-rate or fee-basis pay can disqualify exemptions even at high comp.</div>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="reviewerName">Reviewer Name</label>
            <input type="text" id="reviewerName" value="${escapeHtml(emp.reviewerName || "")}" placeholder="Optional — your name" />
            <div class="hint">Appears on the memo for audit traceability.</div>
          </div>
          <div class="field">
            <label for="effectiveDate">Effective Date</label>
            <input type="date" id="effectiveDate" value="${escapeHtml(emp.effectiveDate || "")}" />
            <div class="hint">When the classification takes effect.</div>
          </div>
        </div>

        <div class="btn-row">
          <span></span>
          <button class="btn btn-primary" id="start-btn">Begin Classification →</button>
        </div>
      </div>
    `;
    document.getElementById("start-btn").addEventListener("click", onStartClick);
    document.getElementById("classType").addEventListener("change", (e) => {
      const wrap = document.getElementById("currentClass-field");
      if (!wrap) return;
      wrap.style.display = e.target.value === "reclass" ? "" : "none";
    });
  }

  function onStartClick() {
    const classType = document.getElementById("classType").value;
    const currentClass = document.getElementById("currentClass").value;
    const empName = document.getElementById("empName").value.trim();
    const jobTitle = document.getElementById("jobTitle").value.trim();
    const department = document.getElementById("department").value.trim();
    const workState = document.getElementById("workState").value;
    const addlEl = document.getElementById("additionalStates");
    const additionalStates = addlEl
      ? Array.from(addlEl.selectedOptions).map(o => o.value).filter(Boolean)
      : [];
    const baseSalary = parseFloat(document.getElementById("baseSalary").value) || 0;
    const totalCompRaw = document.getElementById("totalComp").value;
    const totalComp = totalCompRaw ? parseFloat(totalCompRaw) : baseSalary;
    const hourlyRateRaw = document.getElementById("hourlyRate").value;
    const hourlyRate = hourlyRateRaw ? parseFloat(hourlyRateRaw) : null;
    const payBasis = document.getElementById("payBasis").value;
    const reviewerName = document.getElementById("reviewerName").value.trim();
    const effectiveDate = document.getElementById("effectiveDate").value;

    if (!jobTitle) { alert("Job Title is required."); return; }
    if (!workState) { alert("Primary Work State is required."); return; }
    if (!baseSalary || baseSalary <= 0) { alert("Annual Base Salary is required."); return; }
    if (!payBasis) { alert("Pay Basis is required."); return; }
    if (classType === "reclass" && !currentClass) {
      alert("Current Classification is required for a reclassification review.");
      return;
    }

    Engine.setEmpData({
      classType, currentClass, empName, jobTitle, department, workState,
      additionalStates,
      baseSalary, totalComp, hourlyRate, payBasis, reviewerName, effectiveDate
    });
    Engine.startQuestionnaire();
    renderApp();
  }

  /* ── Question rendering ────────────────────────────────── */

  function renderQuestion() {
    const q = Engine.currentQuestion();
    if (!q) {
      /* End-of-questions → show results */
      renderResults();
      return;
    }
    const currentValue = Engine.getAnswer(q.id);
    const isAuto = Engine.isAutoAnswered(q.id);

    const optionsHtml = q.options.map((opt, i) => {
      const selected = currentValue === opt.value;
      return `<button class="option-btn${selected ? " selected" : ""}" data-value="${escapeHtml(opt.value)}">
        <span class="radio"></span>
        <span class="option-label">${escapeHtml(opt.label)}</span>
        <span class="shortcut">${i + 1}</span>
      </button>`;
    }).join("");

    const helpHtml = q.help ? `<div class="q-help">${escapeHtml(q.help)}</div>` : "";
    const whyHtml = q.why ? `
      <div class="q-why">
        <button class="q-why-toggle" aria-expanded="false" id="why-toggle">
          <span class="arrow">▸</span> Why are we asking this?
        </button>
        <div class="q-why-body hidden" id="why-body">${escapeHtml(q.why)}</div>
      </div>
    ` : "";
    const autoHtml = isAuto ? `<div class="auto-banner">Auto-detected based on data entered. You can change the answer.</div>` : "";

    const content = document.getElementById("content");
    content.innerHTML = `
      <div class="card question-card">
        <span class="q-badge">${escapeHtml(q.exemption)} Exemption</span>
        <div class="q-label">${escapeHtml(q.label)}</div>
        <div class="q-text">${escapeHtml(q.text)}</div>
        ${helpHtml}
        ${whyHtml}
        ${autoHtml}
        <div class="options">${optionsHtml}</div>
        <div class="btn-row">
          <button class="btn" id="back-btn">← Back</button>
          <button class="btn btn-primary" id="next-btn"${currentValue ? "" : " disabled"}>Next →</button>
        </div>
      </div>
    `;

    const optionNodes = content.querySelectorAll(".option-btn");
    optionNodes.forEach(btn => btn.addEventListener("click", () => {
      Engine.selectOption(q.id, btn.dataset.value);
      renderQuestion();
    }));

    document.getElementById("back-btn").addEventListener("click", () => {
      Engine.prevQuestion();
      renderApp();
    });
    document.getElementById("next-btn").addEventListener("click", () => {
      if (!Engine.getAnswer(q.id)) return;
      Engine.nextQuestion();
      renderApp();
    });

    const whyToggle = document.getElementById("why-toggle");
    if (whyToggle) {
      whyToggle.addEventListener("click", () => {
        const body = document.getElementById("why-body");
        const expanded = whyToggle.getAttribute("aria-expanded") === "true";
        whyToggle.setAttribute("aria-expanded", String(!expanded));
        body.classList.toggle("hidden");
      });
    }
  }

  /* ── Keyboard shortcuts for question screen ────────────── */

  function installKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      const stage = Engine.getStage();
      if (stage !== "questions") return;
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA")) return;

      const q = Engine.currentQuestion();
      if (!q) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (Engine.getAnswer(q.id)) {
          Engine.nextQuestion();
          renderApp();
        }
      } else if (e.key === "Backspace" && !e.target.closest("input, textarea")) {
        /* no-op: we don't want backspace to navigate back */
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (q.options[idx]) {
          Engine.selectOption(q.id, q.options[idx].value);
          renderQuestion();
        }
      }
    });
  }

  /* ── Results / memo rendering ──────────────────────────── */

  function renderResults() {
    const { results, overall, riskFlags, confidence, memoId } = Engine.getResults();
    const emp = Engine.getEmpData();
    const answers = Engine.getAllAnswers();
    const autoApplied = Engine.getAutoApplied();
    const memoOpts = { confidence, memoId, answers, autoApplied };

    const content = document.getElementById("content");
    content.innerHTML = `
      <div class="btn-row no-print" id="memo-actions">
        <div class="btn-row-left">
          <button class="btn" id="back-to-questions-btn">← Back to questions</button>
          <button class="btn" id="new-btn">Start new classification</button>
        </div>
        <div class="btn-row-right">
          <button class="btn" id="copy-btn">Copy Memo</button>
          <button class="btn" id="download-btn">Download HTML</button>
          <button class="btn btn-primary" id="print-btn">Print / Save PDF</button>
        </div>
      </div>
      ${Memo.renderHTML(emp, results, overall, riskFlags, memoOpts)}
    `;

    document.getElementById("back-to-questions-btn").addEventListener("click", () => {
      Engine.goBackToLastQuestion();
      renderApp();
    });

    document.getElementById("new-btn").addEventListener("click", () => {
      if (!confirm("Start a new classification? This will clear all current answers.")) return;
      Engine.reset();
      renderApp();
    });

    document.getElementById("print-btn").addEventListener("click", () => {
      window.print();
    });

    document.getElementById("copy-btn").addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const text = Memo.renderText(emp, results, overall, riskFlags, memoOpts);
      const flash = (msg) => {
        const original = btn.textContent;
        btn.textContent = msg;
        setTimeout(() => { btn.textContent = original; }, 2000);
      };
      const fallback = () => {
        /* Older browsers + non-secure contexts: temp textarea + execCommand. */
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        flash(ok ? "Copied!" : "Copy failed — use Print");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => flash("Copied!")).catch(fallback);
      } else {
        fallback();
      }
    });

    document.getElementById("download-btn").addEventListener("click", () => {
      const html = Memo.renderStandaloneHTML(emp, results, overall, riskFlags, memoOpts);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name = (emp.empName || emp.jobTitle || "classification").replace(/[^a-zA-Z0-9]+/g, "_");
      a.href = url;
      const id = memoId ? `_${memoId}` : "";
      a.download = `FLSA_${name}_${new Date().toISOString().slice(0, 10)}${id}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  /* ── Regulatory tab ────────────────────────────────────── */

  function renderRegulatory() {
    const container = document.getElementById("regulatory-content");
    const federalItems = REGULATORY_CONTENT.federal.map(item => `
      <div class="reg-item">
        <div class="reg-item-title">${escapeHtml(item.title)}</div>
        <div class="reg-item-body">${escapeHtml(item.body)}</div>
      </div>
    `).join("");
    const stateItems = REGULATORY_CONTENT.state.map(item => `
      <div class="reg-item">
        <div class="reg-item-title">${escapeHtml(item.title)}</div>
        <div class="reg-item-body">${escapeHtml(item.body)}</div>
      </div>
    `).join("");

    const orderedKeys = ["federal", "california", "colorado", "connecticut", "illinois", "maine", "massachusetts", "minnesota", "new_jersey", "new_york_nyc", "new_york_other", "oregon", "pennsylvania", "washington"];
    const thresholdRows = orderedKeys.map(k => {
      const t = THRESHOLDS[k];
      const eapWeekly = t.eapWeekly ? `$${fmtUSD(t.eapWeekly)}` : "—";
      const eapAnnual = t.eapAnnual ? `$${fmtUSD(t.eapAnnual)}` : "—";
      const computer = t.computer || "—";
      return `<tr>
        <td>${escapeHtml(t.label)}</td>
        <td class="mono">${eapWeekly}</td>
        <td class="mono">${eapAnnual}</td>
        <td class="mono">${escapeHtml(computer)}</td>
        <td class="notes">${escapeHtml(t.notes || "")}</td>
      </tr>`;
    }).join("");

    container.innerHTML = `
      <div class="reg-panel">
        <h2 class="reg-panel-heading">Federal Regulatory Landscape, ${escapeHtml(TOOL_VERSION_DATE)}</h2>
        ${federalItems}
      </div>
      <div class="reg-panel">
        <h2 class="reg-panel-heading">State-Level Changes to Watch</h2>
        ${stateItems}
      </div>
      <div class="reg-panel">
        <h2 class="reg-panel-heading">Current Salary Thresholds Reference</h2>
        <table class="threshold-table">
          <thead>
            <tr>
              <th>Jurisdiction</th>
              <th>EAP Weekly</th>
              <th>EAP Annual</th>
              <th>Computer Emp.</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>${thresholdRows}</tbody>
        </table>
      </div>
    `;
  }

  /* ── Tabs & theme toggle ───────────────────────────────── */

  function installTabs() {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => {
          const isActive = t.dataset.tab === target;
          t.classList.toggle("active", isActive);
          t.setAttribute("aria-selected", String(isActive));
        });
        document.getElementById("tab-classify").classList.toggle("hidden", target !== "classify");
        document.getElementById("tab-regulatory").classList.toggle("hidden", target !== "regulatory");
        Engine.setTab(target);
        if (target === "regulatory") renderRegulatory();
      });
    });
  }

  function installThemeToggle() {
    const btn = document.getElementById("theme-toggle");
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("flsa-theme", next); } catch (e) {}
    });
  }

  /* 9-dot nav menu — same open/close behavior as arminoorata.com,
     fair.arminoorata.com, signs.arminoorata.com. Click outside or
     press Escape to close. */
  function installNavMenu() {
    const cluster = document.getElementById("nav-menu");
    const toggle = document.getElementById("nav-menu-toggle");
    if (!cluster || !toggle) return;

    let open = false;
    const setOpen = (next) => {
      open = next;
      cluster.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    };

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!open);
    });

    document.addEventListener("mousedown", (e) => {
      if (!open) return;
      if (!cluster.contains(e.target)) setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (open && e.key === "Escape") {
        setOpen(false);
        toggle.focus();
      }
    });

    cluster.querySelectorAll(".menu-links a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
  }

  /* ── Main render dispatch ──────────────────────────────── */

  function renderApp() {
    const stage = Engine.getStage();
    renderProgress();
    if (stage === "info") renderIntake();
    else if (stage === "questions") renderQuestion();
    else if (stage === "results") renderResults();
  }

  function init() {
    document.getElementById("version-label").textContent = `Data last updated: ${TOOL_VERSION_DATE}`;
    installTabs();
    installThemeToggle();
    installNavMenu();
    installKeyboardShortcuts();
    renderApp();
  }

  return { init, renderApp, renderRegulatory };
})();
