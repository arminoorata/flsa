/* Engine: state management, navigation, question-tree rebuilding.
   Keeps everything in memory — no persistence (NFR-4). */

const Engine = (function () {
  function _emptyEmpData() {
    return {
      classType: "new_hire",
      empName: "",
      jobTitle: "",
      department: "",
      workState: "",
      baseSalary: 0,
      totalComp: 0,
      hourlyRate: null,
      payBasis: "",        /* Salary-basis test (Helix Energy v. Hewitt 2023). */
      currentClass: "",    /* "exempt" | "non_exempt" — only for reclass type. */
      reviewerName: "",    /* Optional: who performed the review. */
      effectiveDate: ""    /* Optional: target effective date (YYYY-MM-DD). */
    };
  }

  /* Generates a per-memo identifier for audit traceability. Format:
     FLSA-YYYYMMDD-XXXXXX (6-char base36 random). Not cryptographically
     unique — meant to be human-quotable in HR systems and conversation. */
  function _generateMemoId() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const rand = Math.floor(Math.random() * 36 ** 6).toString(36).toUpperCase().padStart(6, "0");
    return `FLSA-${y}${m}${day}-${rand}`;
  }

  const state = {
    currentTab: "classify",     // "classify" | "regulatory"
    stage: "info",              // "info" | "questions" | "results"
    empData: _emptyEmpData(),
    questions: [],
    currentQuestionIdx: 0,
    answers: {},
    /* Set of question IDs whose answer came from autoAnswer (not user).
       Lets us re-apply auto-answers when the underlying intake data changes. */
    autoApplied: {},
    results: null,
    overall: null,
    riskFlags: [],
    confidence: null,           /* { level: "high"|"medium"|"low", reasons: [...] } */
    memoId: null                /* Stable per classification run. */
  };

  function setTab(tab) {
    state.currentTab = tab;
  }

  function setEmpData(data) {
    state.empData = { ...state.empData, ...data };
    if (!state.empData.totalComp) {
      state.empData.totalComp = state.empData.baseSalary;
    }
  }

  function getEmpData() { return state.empData; }

  function getStage() { return state.stage; }

  function startQuestionnaire() {
    state.stage = "questions";
    /* Preserve existing answers so back-to-Info → forward does not wipe
       the user's progress (spec/05 "Going Forward and Back"). A fresh run
       should go through reset() instead. Auto-answers are re-applied in
       case the intake data changed (e.g., salary edited). */
    state.questions = buildQuestions(state.empData, state.answers);
    state.currentQuestionIdx = 0;
    _applyAutoAnswers();
    /* Generate a memo ID once per classification run. Persists across
       back-and-forth navigation; only resets via reset(). */
    if (!state.memoId) state.memoId = _generateMemoId();
  }

  function _applyAutoAnswers() {
    for (const q of state.questions) {
      if (q.autoAnswer !== undefined) {
        /* Apply if answer is missing, or if it was previously auto-applied
           (so that intake changes propagate forward). User manual selections
           are never overridden. */
        if (state.answers[q.id] === undefined || state.autoApplied[q.id]) {
          state.answers[q.id] = q.autoAnswer;
          state.autoApplied[q.id] = true;
        }
      } else if (state.autoApplied[q.id]) {
        /* Previously auto-applied, but the new intake data no longer
           supports an auto-answer (e.g., salary dropped below threshold,
           or pay basis changed to day-rate). Clear so the user must
           answer explicitly — otherwise a stale "yes" could carry forward
           and produce a false exempt result. */
        delete state.answers[q.id];
        delete state.autoApplied[q.id];
      }
    }
  }

  function _rebuildQuestions() {
    state.questions = buildQuestions(state.empData, state.answers);
    _applyAutoAnswers();
  }

  function currentQuestion() {
    _rebuildQuestions();
    while (
      state.currentQuestionIdx < state.questions.length &&
      _isSkipped(state.questions[state.currentQuestionIdx])
    ) {
      state.currentQuestionIdx++;
    }
    if (state.currentQuestionIdx >= state.questions.length) return null;
    return state.questions[state.currentQuestionIdx];
  }

  function _isSkipped(q) {
    if (!q.skipIf) return false;
    try { return q.skipIf(state.answers); }
    catch (e) { return false; }
  }

  function selectOption(qId, value) {
    state.answers[qId] = value;
    /* Any user selection clears the auto-applied flag so future intake
       changes don't silently overwrite what the user deliberately picked. */
    delete state.autoApplied[qId];
  }

  function getAnswer(qId) { return state.answers[qId]; }

  function getAllAnswers() { return { ...state.answers }; }

  /* True if the current answer originated from an autoAnswer (not a
     user pick). Reads the autoApplied set directly so that a user who
     deliberately re-selected the same value as the auto-answer is NOT
     treated as auto. */
  function isAutoAnswered(qId) {
    return !!state.autoApplied[qId];
  }

  /* For the memo audit trail: the full set of question IDs whose answer
     came from auto-detection. */
  function getAutoApplied() {
    return { ...state.autoApplied };
  }

  function nextQuestion() {
    state.currentQuestionIdx++;
    _rebuildQuestions();
    while (
      state.currentQuestionIdx < state.questions.length &&
      _isSkipped(state.questions[state.currentQuestionIdx])
    ) {
      state.currentQuestionIdx++;
    }
    if (state.currentQuestionIdx >= state.questions.length) {
      _evaluate();
      state.stage = "results";
    }
  }

  function prevQuestion() {
    state.currentQuestionIdx--;
    _rebuildQuestions();
    while (
      state.currentQuestionIdx >= 0 &&
      _isSkipped(state.questions[state.currentQuestionIdx])
    ) {
      state.currentQuestionIdx--;
    }
    if (state.currentQuestionIdx < 0) {
      state.stage = "info";
      state.currentQuestionIdx = 0;
    }
  }

  /* Jump to the first non-skipped question of a given stage. Used by the
     clickable progress bar so the user can navigate back to any visited
     section without losing prior answers. stageIdx 0 returns to Info,
     stageIdx 6 returns to Results (only if results have been computed). */
  function jumpToStage(stageIdx) {
    if (stageIdx === 0) { state.stage = "info"; return; }
    if (stageIdx === 6) {
      if (state.results) state.stage = "results";
      return;
    }
    state.stage = "questions";
    _rebuildQuestions();
    for (let i = 0; i < state.questions.length; i++) {
      const q = state.questions[i];
      if (q.stageIdx === stageIdx && !_isSkipped(q)) {
        state.currentQuestionIdx = i;
        return;
      }
    }
    /* Stage has no non-skipped questions — fall through to next stage. */
    for (let i = 0; i < state.questions.length; i++) {
      const q = state.questions[i];
      if (q.stageIdx >= stageIdx && !_isSkipped(q)) {
        state.currentQuestionIdx = i;
        return;
      }
    }
  }

  /* From results, go back to the last non-skipped question to edit. */
  function goBackToLastQuestion() {
    state.stage = "questions";
    _rebuildQuestions();
    for (let i = state.questions.length - 1; i >= 0; i--) {
      if (!_isSkipped(state.questions[i])) {
        state.currentQuestionIdx = i;
        return;
      }
    }
  }

  /* Stages the user can click back into — strictly stages STRICTLY
     BEFORE the current one. Mirrors the "done" set from getProgressState
     so we never count auto-applied answers (which the user has not
     actually navigated through) as "visited." On the intake screen this
     returns an empty set, so no progress step is clickable. */
  function getVisitedStages() {
    const { done } = getProgressState();
    return new Set(done);
  }

  function _evaluate() {
    state.results = evaluateExemptions(state.answers, state.empData);
    state.overall = classifyOverall(state.results, state.empData);
    state.riskFlags = generateRiskFlags(state.answers, state.empData, state.results);
    state.confidence = computeConfidence(state.results, state.overall, state.riskFlags, state.empData);
  }

  function getResults() {
    return {
      results: state.results,
      overall: state.overall,
      riskFlags: state.riskFlags,
      confidence: state.confidence,
      memoId: state.memoId
    };
  }

  function reset() {
    state.stage = "info";
    state.empData = _emptyEmpData();
    state.questions = [];
    state.currentQuestionIdx = 0;
    state.answers = {};
    state.autoApplied = {};
    state.results = null;
    state.overall = null;
    state.riskFlags = [];
    state.confidence = null;
    state.memoId = null;
  }

  /* Progress bar: determine which stages are done / active / future.
     Stages: 0 = Employee Info, 1 = HCE, 2 = Computer, 3 = Admin,
     4 = Executive, 5 = Professional, 6 = Results. */
  function getProgressState() {
    if (state.stage === "info") {
      return { active: 0, done: [] };
    }
    if (state.stage === "results") {
      return { active: 6, done: [0, 1, 2, 3, 4, 5] };
    }
    const q = state.questions[state.currentQuestionIdx];
    const activeStage = q ? q.stageIdx : 1;
    const done = [];
    for (let s = 0; s < activeStage; s++) done.push(s);
    return { active: activeStage, done };
  }

  return {
    state,
    setTab,
    setEmpData, getEmpData, getStage,
    startQuestionnaire,
    currentQuestion, selectOption, getAnswer, getAllAnswers, isAutoAnswered, getAutoApplied,
    nextQuestion, prevQuestion, jumpToStage, goBackToLastQuestion,
    getResults,
    reset,
    getProgressState, getVisitedStages
  };
})();
