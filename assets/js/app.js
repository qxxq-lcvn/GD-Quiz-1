/*
 * Unity Quiz — game flow.
 *
 * Class picker → join (name + class code) → question → result → … → summary.
 *
 * Each class runs as one attempt: every question of that class once, in a shuffled order,
 * then a summary screen with the score and statistics. The attempt is saved in
 * localStorage, so a reload continues where the student left off.
 *
 * Class codes are checked, and finished results stored, by the Google Apps Script in
 * server/Code.gs. The teacher downloads all results as CSV from the Teacher screen.
 */
(() => {
  "use strict";

  const { PALETTE, CLASSES, Sound, CONFIG } = window.QUIZ;
  const API_URL = (CONFIG && CONFIG.API_URL) || "";
  const API_TIMEOUT_MS = 20000;

  const MCQ_KEYS = ["A", "B", "C", "D"];
  const TF_KEYS = ["T", "F"];
  const IMAGE_DIR = "assets/img/questions/";
  const MUSIC_VOLUME = 0.25;
  const QUESTION_SECONDS = 15;
  const WARN_SECONDS = 5;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- storage (falls back to memory when localStorage is blocked) ---------- */

  const store = (() => {
    const memory = new Map();
    const prefix = "unity-quiz:";
    return {
      get(key, fallback) {
        try {
          const raw = localStorage.getItem(prefix + key);
          if (raw !== null) return JSON.parse(raw);
        } catch (_) {
          /* storage unavailable */
        }
        return memory.has(key) ? memory.get(key) : fallback;
      },
      set(key, value) {
        memory.set(key, value);
        try {
          localStorage.setItem(prefix + key, JSON.stringify(value));
        } catch (_) {
          /* storage unavailable */
        }
      }
    };
  })();

  /* ---------- helpers ---------- */

  const $ = (selector) => document.querySelector(selector);

  function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value == null) continue;
      if (key === "class") node.className = value;
      else node.setAttribute(key, value === true ? "" : value);
    }
    node.append(...children.filter((c) => c != null));
    return node;
  }

  function icon(id, className = "icon") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + id);
    svg.append(use);
    return svg;
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const findClass = (id) => CLASSES.find((c) => c.id === id) || null;

  function randomId() {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  /* ---------- backend (Google Apps Script) ---------- */

  const API_ERRORS = {
    not_configured: "The quiz isn’t connected yet. Teacher: set API_URL in assets/js/config.js.",
    network: "Can’t reach the server. Check your internet connection and try again.",
    bad_code: "That class code isn’t right. Check it with your teacher.",
    bad_admin: "That admin code isn’t right.",
    bad_name: "Please enter your name (at least 2 letters).",
    server_error: "The server had a problem. Try again in a moment."
  };
  const apiMessage = (error) => API_ERRORS[error] || API_ERRORS.server_error;

  // Sent as text/plain so the browser skips the CORS preflight Apps Script can't answer.
  async function api(action, payload = {}) {
    if (!API_URL) return { ok: false, error: "not_configured" };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal
      });
      if (!res.ok) return { ok: false, error: "server_error" };
      return await res.json();
    } catch (_) {
      return { ok: false, error: "network" };
    } finally {
      clearTimeout(timer);
    }
  }
  const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

  function formatDuration(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m ? `${m} min ${s} s` : `${s} s`;
  }

  /* ---------- elements & state ---------- */

  const els = {
    card: $("#card"),
    views: {
      class: $("#view-class"),
      question: $("#view-question"),
      result: $("#view-result"),
      summary: $("#view-summary"),
      join: $("#view-join"),
      admin: $("#view-admin")
    },
    joinClass: $("#join-class"),
    joinTitle: $("#join-title"),
    joinForm: $("#join-form"),
    joinName: $("#join-name"),
    joinCode: $("#join-code"),
    joinMsg: $("#join-msg"),
    joinBtn: $("#join-btn"),
    joinBack: $("#join-back"),
    sSave: $("#s-save"),
    sSaveText: $("#s-save-text"),
    sSaveRetry: $("#s-save-retry"),
    teacherBtn: $("#teacher-btn"),
    adminTitle: $("#admin-title"),
    adminForm: $("#admin-form"),
    adminCode: $("#admin-code"),
    adminMsg: $("#admin-msg"),
    adminBtn: $("#admin-btn"),
    adminPanel: $("#admin-panel"),
    adminStats: $("#admin-stats"),
    adminDownloads: $("#admin-downloads"),
    adminRefresh: $("#admin-refresh"),
    adminBack: $("#admin-back"),
    classTitle: $("#class-title"),
    classGrid: $("#class-grid"),
    changeClassBtn: $("#change-class-btn"),
    classLabel: $("#class-label"),
    footClass: $("#foot-class"),
    progress: $("#progress"),
    progressFill: $("#progress-fill"),
    progressText: $("#progress-text"),
    form: $("#quiz-form"),
    qTopic: $("#q-topic"),
    qKind: $("#q-kind"),
    qText: $("#q-text"),
    qShot: $("#q-shot"),
    qLegend: $("#q-legend"),
    qHint: $("#q-hint"),
    options: $("#options"),
    submitBtn: $("#submit-btn"),
    rIcon: $("#r-icon use"),
    rTitle: $("#r-title"),
    rGreeting: $("#r-greeting"),
    rShot: $("#r-shot"),
    rQuestion: $("#r-question"),
    rOptions: $("#r-options"),
    rExplain: $("#r-explain"),
    nextBtn: $("#next-btn"),
    nextLabel: $("#next-btn .btn__label"),
    sTitle: $("#s-title"),
    sGreeting: $("#s-greeting"),
    sScore: $("#s-score"),
    sStats: $("#s-stats"),
    sTopics: $("#s-topics"),
    sReview: $("#s-review"),
    retryBtn: $("#retry-btn"),
    sClassBtn: $("#s-class-btn"),
    soundBtn: $("#sound-btn"),
    soundIcon: $("#sound-btn use"),
    music: $("#bgm"),
    musicBtn: $("#music-btn"),
    musicIcon: $("#music-btn use"),
    timer: $("#timer"),
    timerFill: $("#timer-fill"),
    timerNum: $("#timer-num"),
    announcer: $("#announcer"),
    themeMeta: $('meta[name="theme-color"]')
  };

  const state = {
    view: "class",
    classId: null,
    attempt: null, // { id, name, code, order: [ids], answers: [records], startedAt, finishedAt, saved }
    joinClassId: null,
    viewBeforeAdmin: "class",
    adminCode: "", // kept in memory only
    adminRows: [],
    saving: false,
    paletteIndex: 0,
    current: null,
    selected: null,
    shownAt: 0,
    musicOn: true,
    timerFrame: 0,
    musicReady: false
  };

  /* ---------- palette ---------- */

  function applyPalette(index) {
    const p = PALETTE[index];
    const root = document.documentElement.style;
    root.setProperty("--brand", p.btnColor);
    root.setProperty("--brand-head", p.headerBg);
    root.setProperty("--brand-on", p.onColor);
    root.setProperty("--brand-accent-bg", p.accentBg);
    root.setProperty("--brand-ink", p.accentText);
    root.setProperty("--brand-border", p.borderColor);
    if (els.themeMeta) els.themeMeta.setAttribute("content", p.headerBg);
    state.paletteIndex = index;
  }

  function pickPalette() {
    if (PALETTE.length < 2) return 0;
    let i;
    do i = Math.floor(Math.random() * PALETTE.length);
    while (i === state.paletteIndex);
    return i;
  }

  /* ---------- attempt (one per class, saved across reloads) ---------- */

  function loadAttempt(cls) {
    const saved = store.get(`attempt:${cls.id}`, null);
    const ids = cls.questions.map((q) => q.id);
    // drop a saved attempt from an older version, or whose questions no longer match the class pool
    if (!saved || !saved.name || !saved.id) return null;
    if (saved.order.length !== ids.length || !saved.order.every((id) => ids.includes(id))) return null;
    return saved;
  }

  function newAttempt(cls, { name, code }) {
    const attempt = {
      id: randomId(),
      name,
      code,
      order: shuffle(cls.questions.map((q) => q.id)),
      answers: [],
      startedAt: Date.now(),
      finishedAt: null,
      saved: false
    };
    store.set(`attempt:${cls.id}`, attempt);
    return attempt;
  }

  function saveAttempt() {
    store.set(`attempt:${state.classId}`, state.attempt);
  }

  const isFinished = (attempt) => attempt.answers.length >= attempt.order.length;

  function questionById(id) {
    return findClass(state.classId).questions.find((q) => q.id === id);
  }

  function prepareQuestion() {
    const question = questionById(state.attempt.order[state.attempt.answers.length]);
    const choices = question.options.map((text, i) => ({ text, correct: i === question.correctIndex }));
    // True / False keeps its natural order; multiple choice is shuffled every time
    return { ...question, choices: question.type === "tf" ? choices : shuffle(choices) };
  }

  /* ---------- class ---------- */

  function tileStatus(cls) {
    const attempt = loadAttempt(cls);
    if (!attempt) return `${cls.questions.length} questions`;
    if (isFinished(attempt)) {
      const score = attempt.answers.filter((a) => a.correct).length;
      return `${attempt.name} · Score ${score} / ${attempt.order.length}`;
    }
    return `${attempt.name} · ${attempt.answers.length} / ${attempt.order.length} done`;
  }

  function renderClassPicker() {
    els.classGrid.replaceChildren(
      ...CLASSES.map((cls) =>
        h(
          "button",
          { class: "class-tile", type: "button", "data-class": cls.id, "aria-pressed": String(cls.id === state.classId) },
          h("span", { class: "class-tile__letter", "aria-hidden": "true" }, cls.id),
          h("span", { class: "class-tile__name" }, cls.name),
          h("span", { class: "class-tile__status" }, tileStatus(cls))
        )
      )
    );
  }

  function chooseClass(id, { silent = false } = {}) {
    const cls = findClass(id);
    if (!cls) return;
    if (!silent) Sound.unlock();
    state.classId = cls.id;
    store.set("class", cls.id);
    els.classLabel.textContent = `${cls.name} · Change`;
    els.changeClassBtn.setAttribute("aria-label", `${cls.name}. Change class`);
    els.changeClassBtn.hidden = false;
    els.footClass.textContent = cls.name;

    state.attempt = loadAttempt(cls);
    if (!state.attempt) showJoin(cls);
    else if (isFinished(state.attempt)) showSummary();
    else startTurn();
  }

  /* ---------- join (name + class code) ---------- */

  function showJoin(cls) {
    state.joinClassId = cls.id;
    els.joinClass.textContent = cls.name;
    els.joinTitle.textContent = `Enter the ${cls.name} code`;
    els.joinName.value = store.get("name", "");
    els.joinCode.value = "";
    setFormMessage(els.joinMsg, API_URL ? "" : apiMessage("not_configured"));
    showView("join");
    (els.joinName.value ? els.joinCode : els.joinName).focus({ preventScroll: true });
  }

  function setFormMessage(target, message) {
    target.textContent = message;
    target.hidden = !message;
  }

  function setBusy(button, busy, label) {
    button.disabled = busy;
    if (busy) button.setAttribute("aria-busy", "true");
    else button.removeAttribute("aria-busy");
    if (label) button.querySelector(".btn__label").textContent = label;
  }

  async function onJoinSubmit(event) {
    event.preventDefault();
    const cls = findClass(state.joinClassId);
    const name = els.joinName.value.replace(/\s+/g, " ").trim();
    const code = els.joinCode.value.trim();
    if (name.length < 2) {
      setFormMessage(els.joinMsg, apiMessage("bad_name"));
      els.joinName.focus();
      return;
    }
    if (!code) {
      setFormMessage(els.joinMsg, "Please enter the class code.");
      els.joinCode.focus();
      return;
    }
    setFormMessage(els.joinMsg, "");
    setBusy(els.joinBtn, true, "Checking…");
    const res = await api("verify", { classId: cls.id, code });
    setBusy(els.joinBtn, false, "Start quiz");
    if (state.view !== "join" || state.joinClassId !== cls.id) return;
    if (!res.ok) {
      setFormMessage(els.joinMsg, apiMessage(res.error));
      Sound.fail();
      (res.error === "bad_code" ? els.joinCode : els.joinBtn).focus();
      return;
    }
    Sound.unlock();
    store.set("name", name);
    state.attempt = newAttempt(cls, { name, code });
    startTurn();
  }

  function openClassPicker() {
    stopTimer();
    delete els.card.dataset.result;
    renderClassPicker();
    showView("class");
    els.classTitle.focus({ preventScroll: true });
  }

  /* ---------- views ---------- */

  function showView(name) {
    for (const [key, view] of Object.entries(els.views)) {
      view.hidden = key !== name;
    }
    state.view = name;
    document.body.dataset.view = name;
    // no switching class to dodge a question that is already on screen
    els.changeClassBtn.disabled = name === "question";
    els.progress.hidden = !(name === "question" || name === "result");
    els.teacherBtn.hidden = name === "question" || name === "admin";
    // views differ in height; bring the top of the card back into view if it scrolled away
    if (els.card.getBoundingClientRect().top < 0) {
      window.scrollTo({
        top: window.scrollY + els.card.getBoundingClientRect().top - 16,
        behavior: reducedMotion.matches ? "auto" : "smooth"
      });
    }
  }

  function announce(message) {
    els.announcer.textContent = "";
    // new text on the next frame so screen readers re-announce identical messages
    requestAnimationFrame(() => (els.announcer.textContent = message));
  }

  function updateProgress() {
    const done = state.attempt.answers.length;
    const total = state.attempt.order.length;
    // on the question screen, count the question being answered
    const at = state.view === "question" ? done + 1 : done;
    els.progressText.textContent = `Question ${Math.min(at, total)} of ${total}`;
    els.progressFill.style.width = `${pct(done, total)}%`;
    els.progress.setAttribute("aria-valuenow", String(done));
    els.progress.setAttribute("aria-valuemax", String(total));
  }

  /* ---------- turn ---------- */

  function startTurn() {
    if (!state.classId || state.view === "question") return;
    if (isFinished(state.attempt)) {
      showSummary({ fresh: true });
      return;
    }
    stopTimer();
    delete els.card.dataset.result;
    applyPalette(pickPalette());
    state.current = prepareQuestion();
    state.selected = null;
    renderQuestion();
    showView("question");
    updateProgress();
    els.qText.focus({ preventScroll: true });
    announce(`${els.progressText.textContent}. ${state.current.question}`);
    state.shownAt = performance.now();
    startTimer();
  }

  /* ---------- screenshots ---------- */

  // Screenshots live in assets/img/questions/. A missing file shows a neutral placeholder
  // (never the image note, which would give the answer away).
  function renderShot(target, q) {
    if (!q.image) {
      target.replaceChildren();
      target.hidden = true;
      return;
    }
    target.hidden = false;
    const src = IMAGE_DIR + q.image;
    const img = h("img", { class: "shot", src, alt: q.alt || "Screenshot for this question", decoding: "async" });
    img.addEventListener(
      "error",
      () => {
        console.warn(`[quiz] missing screenshot ${src} (${q.imageNote})`);
        img.replaceWith(
          h(
            "div",
            { class: "shot shot--missing", role: "img", "aria-label": "Screenshot not added yet" },
            icon("i-image"),
            h("span", {}, "Screenshot not added yet"),
            h("code", {}, src)
          )
        );
      },
      { once: true }
    );
    target.replaceChildren(img);
  }

  /* ---------- question ---------- */

  function renderQuestion() {
    const q = state.current;
    const isTf = q.type === "tf";
    const keys = isTf ? TF_KEYS : MCQ_KEYS;
    els.qTopic.textContent = q.topic;
    els.qKind.textContent = isTf ? "True or false?" : "";
    els.qKind.hidden = !isTf;
    els.qText.textContent = q.question;
    els.qLegend.textContent = isTf ? "Is this statement true or false?" : "Choose one answer";
    els.qHint.replaceChildren(
      "Keys ",
      ...(isTf
        ? [h("kbd", {}, "T"), " / ", h("kbd", {}, "F")]
        : [h("kbd", {}, "1"), "–", h("kbd", {}, "4")]),
      " pick an answer · ",
      h("kbd", {}, "Enter"),
      " submits"
    );
    renderShot(els.qShot, q);
    els.options.classList.toggle("options--tf", isTf);
    els.options.replaceChildren(
      ...q.choices.map((choice, i) =>
        h(
          "label",
          { class: "option" },
          h("input", { type: "radio", name: "answer", value: String(i), class: "sr-only" }),
          h("span", { class: "option__key", "aria-hidden": "true" }, keys[i]),
          h("span", { class: "option__text" }, choice.text)
        )
      )
    );
    els.submitBtn.disabled = true;
  }

  function selectOption(index) {
    const input = els.options.querySelectorAll('input[name="answer"]')[index];
    if (!input) return;
    input.checked = true;
    input.focus({ preventScroll: true });
    onAnswerChange(index);
  }

  function onAnswerChange(index) {
    state.selected = index;
    els.submitBtn.disabled = false;
    Sound.tick(index);
  }

  /* ---------- timer ---------- */

  function startTimer() {
    stopTimer();
    const total = QUESTION_SECONDS * 1000;
    const deadline = performance.now() + total;
    let shown = null;
    els.timer.classList.remove("is-low");

    const tick = (now) => {
      const remaining = Math.max(0, deadline - now);
      els.timerFill.style.strokeDashoffset = String(100 - (remaining / total) * 100);
      const seconds = Math.ceil(remaining / 1000);
      if (seconds !== shown) {
        shown = seconds;
        els.timerNum.textContent = String(seconds);
        els.timer.setAttribute("aria-label", seconds === 1 ? "1 second left" : `${seconds} seconds left`);
        if (seconds <= WARN_SECONDS && seconds > 0) {
          els.timer.classList.add("is-low");
          Sound.countdown();
          if (seconds === WARN_SECONDS) announce(`${WARN_SECONDS} seconds left.`);
        }
      }
      if (remaining <= 0) {
        state.timerFrame = 0;
        timeUp();
      } else {
        state.timerFrame = requestAnimationFrame(tick);
      }
    };
    state.timerFrame = requestAnimationFrame(tick);
  }

  function stopTimer() {
    if (state.timerFrame) cancelAnimationFrame(state.timerFrame);
    state.timerFrame = 0;
  }

  // An answer that is picked but not submitted still counts when time runs out.
  function timeUp() {
    if (state.view !== "question") return;
    submitAnswer({ timedOut: state.selected == null });
  }

  /* ---------- result ---------- */

  function submitAnswer({ timedOut = false } = {}) {
    if (state.view !== "question" || (state.selected == null && !timedOut)) return;
    stopTimer();
    const q = state.current;
    const correct = !timedOut && q.choices[state.selected].correct;

    state.attempt.answers.push({
      id: q.id,
      answer: timedOut ? null : q.choices[state.selected].text,
      correct,
      timedOut,
      ms: Math.min(QUESTION_SECONDS * 1000, Math.round(performance.now() - state.shownAt))
    });
    if (isFinished(state.attempt)) state.attempt.finishedAt = Date.now();
    saveAttempt();

    renderResult(correct, timedOut);
    showView("result");
    updateProgress();
    els.rTitle.focus({ preventScroll: true });

    if (correct) {
      Sound.success();
      celebrate();
    } else {
      Sound.fail();
    }
    const answer = q.choices.find((c) => c.correct).text;
    if (correct) announce(`Correct! ${answer}. ${q.explanation}`);
    else if (timedOut) announce(`Time's up. The correct answer is: ${answer}. ${q.explanation}`);
    else announce(`Not quite. The correct answer is: ${answer}. ${q.explanation}`);
  }

  function renderResult(correct, timedOut = false) {
    const q = state.current;
    const keys = q.type === "tf" ? TF_KEYS : MCQ_KEYS;
    if (timedOut) {
      els.card.dataset.result = "timeout";
      els.rIcon.setAttribute("href", "#i-clock");
      els.rTitle.textContent = "Time's up!";
      els.rGreeting.textContent = `No answer in ${QUESTION_SECONDS} seconds. Here’s the right answer.`;
    } else {
      els.card.dataset.result = correct ? "correct" : "incorrect";
      els.rIcon.setAttribute("href", correct ? "#i-check" : "#i-x");
      els.rTitle.textContent = correct ? "Correct!" : "Not quite";
      els.rGreeting.textContent = correct ? "Well done!" : "Good try. Here’s the right answer.";
    }
    renderShot(els.rShot, q);
    els.rQuestion.textContent = q.question;
    els.rExplain.textContent = q.explanation;
    els.nextLabel.textContent = isFinished(state.attempt) ? "See my results" : "Next question";

    els.rOptions.classList.toggle("options--tf", q.type === "tf");
    els.rOptions.replaceChildren(
      ...q.choices.map((choice, i) => {
        const isChosen = i === state.selected;
        let status = "is-muted";
        let tag = null;
        if (choice.correct) {
          status = "is-correct";
          tag = h("span", { class: "tag" }, isChosen ? "Your answer" : "Correct answer");
        } else if (isChosen) {
          status = "is-wrong";
          tag = h("span", { class: "tag" }, "Your answer");
        }
        const key = choice.correct || isChosen
          ? h("span", { class: "option__key" }, icon(choice.correct ? "i-check" : "i-x", "icon icon--sm"))
          : h("span", { class: "option__key", "aria-hidden": "true" }, keys[i]);
        return h(
          "li",
          { class: `option option--static ${status}` },
          key,
          h("span", { class: "option__text" }, choice.text, tag)
        );
      })
    );
  }

  function celebrate() {
    if (reducedMotion.matches || typeof window.confetti !== "function") return;
    const colors = PALETTE.map((p) => p.headerBg);
    let shapes = ["circle", "square"];
    try {
      // little cube confetti
      const cube = window.confetti.shapeFromPath({ path: "M6 0L12 3.5V10.5L6 14L0 10.5V3.5Z" });
      shapes = [cube, cube, "square"];
    } catch (_) {
      /* older confetti build: keep default shapes */
    }
    const base = { colors, shapes, scalar: 1.1, ticks: 220, disableForReducedMotion: true };
    window.confetti({ ...base, particleCount: 110, spread: 85, startVelocity: 42, origin: { y: 0.35 } });
    setTimeout(() => {
      window.confetti({ ...base, particleCount: 45, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
      window.confetti({ ...base, particleCount: 45, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
    }, 220);
  }

  /* ---------- summary ---------- */

  function computeStats(attempt) {
    const cls = findClass(state.classId);
    const rows = attempt.answers.map((a) => ({ ...a, q: cls.questions.find((q) => q.id === a.id) }));
    const total = attempt.order.length;
    const correct = rows.filter((r) => r.correct).length;
    const timedOut = rows.filter((r) => r.timedOut).length;
    const answered = rows.filter((r) => !r.timedOut);
    const avgMs = answered.length ? answered.reduce((sum, r) => sum + r.ms, 0) / answered.length : 0;

    // per-topic, in the order topics first appear in the class
    const topics = new Map();
    for (const q of cls.questions) {
      if (!topics.has(q.topic)) topics.set(q.topic, { topic: q.topic, correct: 0, total: 0 });
    }
    for (const r of rows) {
      const t = topics.get(r.q.topic);
      t.total += 1;
      if (r.correct) t.correct += 1;
    }
    const byType = (type) => {
      const list = rows.filter((r) => r.q.type === type);
      return { correct: list.filter((r) => r.correct).length, total: list.length };
    };

    return {
      rows,
      total,
      correct,
      wrong: rows.length - correct - timedOut,
      timedOut,
      avgMs,
      duration: (attempt.finishedAt || Date.now()) - attempt.startedAt,
      topics: [...topics.values()].filter((t) => t.total > 0),
      mcq: byType("mcq"),
      tf: byType("tf")
    };
  }

  function verdict(percent) {
    if (percent >= 90) return ["Outstanding!", "You really know your Unity basics."];
    if (percent >= 75) return ["Great job!", "Solid work. Check the few you missed below."];
    if (percent >= 50) return ["Good effort!", "You’re getting there. Review the topics with low scores."];
    return ["Keep practising!", "Go over the review below and try again."];
  }

  function statTile(label, value, modifier) {
    return h("div", { class: `stat${modifier ? ` stat--${modifier}` : ""}` },
      h("span", { class: "stat__value" }, value),
      h("span", { class: "stat__label" }, label)
    );
  }

  function showSummary({ fresh = false } = {}) {
    stopTimer();
    delete els.card.dataset.result;
    const cls = findClass(state.classId);
    const s = computeStats(state.attempt);
    const percent = pct(s.correct, s.total);
    const [title, line] = verdict(percent);

    renderSaveStatus();
    if (!state.attempt.saved) submitResult(state.attempt);

    applyPalette(percent >= 75 ? 2 : percent >= 50 ? 0 : 3);
    els.card.dataset.summary = percent >= 75 ? "high" : percent >= 50 ? "mid" : "low";
    els.sTitle.textContent = title;
    els.sGreeting.textContent = `${state.attempt.name} · ${cls.name} · ${line}`;

    els.sScore.replaceChildren(
      h("div", { class: "score-ring", style: `--p:${percent}`, role: "img", "aria-label": `Score ${s.correct} out of ${s.total}, ${percent} percent` },
        h("span", { class: "score-ring__num", "aria-hidden": "true" }, String(s.correct), h("small", {}, ` / ${s.total}`)),
        h("span", { class: "score-ring__pct", "aria-hidden": "true" }, `${percent}%`)
      )
    );

    els.sStats.replaceChildren(
      statTile("Correct", String(s.correct), "ok"),
      statTile("Wrong", String(s.wrong), "bad"),
      statTile("Time’s up", String(s.timedOut), "warn"),
      statTile("Avg. answer time", s.avgMs ? `${(s.avgMs / 1000).toFixed(1)} s` : "–"),
      statTile("Multiple choice", `${s.mcq.correct} / ${s.mcq.total}`),
      statTile("True / False", `${s.tf.correct} / ${s.tf.total}`),
      statTile("Total time", formatDuration(s.duration))
    );

    els.sTopics.replaceChildren(
      ...s.topics.map((t) => {
        const p = pct(t.correct, t.total);
        return h("li", { class: "topic" },
          h("span", { class: "topic__name" }, t.topic),
          h("span", { class: "topic__score" }, `${t.correct} / ${t.total}`),
          h("span", { class: "topic__bar", role: "img", "aria-label": `${p} percent` },
            h("span", { class: `topic__fill${p >= 75 ? " is-high" : p >= 50 ? "" : " is-low"}`, style: `width:${p}%` })
          )
        );
      })
    );

    els.sReview.replaceChildren(
      ...s.rows.map((r, i) => {
        const right = r.q.options[r.q.correctIndex];
        const status = r.correct ? "ok" : r.timedOut ? "warn" : "bad";
        return h("li", { class: `review review--${status}` },
          h("span", { class: "review__icon" }, icon(r.correct ? "i-check" : r.timedOut ? "i-clock" : "i-x", "icon icon--sm")),
          h("div", { class: "review__body" },
            h("p", { class: "review__q" }, h("span", { class: "review__num" }, `${i + 1}.`), ` ${r.q.question}`),
            h("p", { class: "review__a" },
              r.correct
                ? `Your answer: ${r.answer}`
                : `${r.timedOut ? "No answer" : `Your answer: ${r.answer}`} · Correct: ${right}`
            )
          )
        );
      })
    );

    showView("summary");
    els.sTitle.focus({ preventScroll: true });
    if (fresh && percent >= 75) celebrate();
    if (fresh && percent >= 50) Sound.success();
    announce(`Quiz finished. You scored ${s.correct} out of ${s.total}, ${percent} percent.`);
  }

  // A new attempt keeps the same student and code; the server checks the code again on upload.
  function retry() {
    const cls = findClass(state.classId);
    delete els.card.dataset.summary;
    state.attempt = newAttempt(cls, { name: state.attempt.name, code: state.attempt.code });
    startTurn();
  }

  /* ---------- saving results ---------- */

  function resultPayload(attempt, classId) {
    const rows = attempt.answers;
    const correct = rows.filter((a) => a.correct).length;
    const timedOut = rows.filter((a) => a.timedOut).length;
    const answered = rows.filter((a) => !a.timedOut);
    const avgMs = answered.length ? answered.reduce((sum, a) => sum + a.ms, 0) / answered.length : 0;
    return {
      attemptId: attempt.id,
      classId,
      name: attempt.name,
      score: correct,
      total: attempt.order.length,
      percent: pct(correct, attempt.order.length),
      correct,
      wrong: rows.length - correct - timedOut,
      timedOut,
      avgSeconds: Math.round(avgMs / 100) / 10,
      totalSeconds: Math.round(((attempt.finishedAt || Date.now()) - attempt.startedAt) / 1000),
      startedAt: new Date(attempt.startedAt).toISOString(),
      finishedAt: new Date(attempt.finishedAt || Date.now()).toISOString(),
      answers: rows.map((a) => ({ id: a.id, correct: a.correct, timedOut: a.timedOut }))
    };
  }

  function renderSaveStatus(error) {
    const a = state.attempt;
    let text;
    let status;
    if (a.saved) {
      text = `Result saved for ${a.name}.`;
      status = "ok";
    } else if (state.saving) {
      text = "Saving your result…";
      status = "busy";
    } else {
      text = `Your result isn’t saved yet. ${apiMessage(error || "network")}`;
      status = "bad";
    }
    els.sSave.dataset.status = status;
    els.sSaveText.textContent = text;
    els.sSaveRetry.hidden = status !== "bad";
    // a new attempt would replace this one on the device, so save it first
    els.retryBtn.disabled = !a.saved;
  }

  async function submitResult(attempt, classId = state.classId) {
    const current = attempt === state.attempt;
    if (attempt.saved || (current && state.saving)) return;
    const onScreen = () => state.view === "summary" && state.attempt === attempt;
    if (current) state.saving = true;
    if (onScreen()) renderSaveStatus();
    const res = await api("submit", { code: attempt.code, result: resultPayload(attempt, classId) });
    if (current) state.saving = false;
    if (res.ok) {
      attempt.saved = true;
      // only mark the stored copy if it is still this attempt
      const stored = store.get(`attempt:${classId}`, null);
      if (stored && stored.id === attempt.id) store.set(`attempt:${classId}`, { ...stored, saved: true });
    }
    if (onScreen()) {
      renderSaveStatus(res.error);
      if (res.ok) announce(`Result saved for ${attempt.name}.`);
    }
  }

  // Finished attempts that couldn't be uploaded (e.g. offline) are retried on the next visit.
  function flushUnsaved() {
    for (const cls of CLASSES) {
      const attempt = loadAttempt(cls);
      if (attempt && isFinished(attempt) && !attempt.saved) submitResult(attempt, cls.id);
    }
  }

  /* ---------- teacher: download results ---------- */

  function openAdmin() {
    if (state.view === "question") return;
    state.viewBeforeAdmin = state.view;
    stopTimer();
    const unlocked = Boolean(state.adminCode);
    els.adminForm.hidden = unlocked;
    els.adminPanel.hidden = !unlocked;
    setFormMessage(els.adminMsg, API_URL ? "" : apiMessage("not_configured"));
    showView("admin");
    if (unlocked) els.adminTitle.focus({ preventScroll: true });
    else els.adminCode.focus({ preventScroll: true });
  }

  function closeAdmin() {
    const back = state.viewBeforeAdmin;
    if (back === "summary" && state.attempt) showSummary();
    else if (back === "result" && state.attempt) startTurn();
    else if (back === "join" && state.joinClassId) showJoin(findClass(state.joinClassId));
    else openClassPicker();
  }

  async function loadResults(code) {
    const res = await api("export", { adminCode: code });
    if (!res.ok) return res;
    state.adminCode = code;
    state.adminRows = Array.isArray(res.rows) ? res.rows : [];
    renderAdminPanel();
    return res;
  }

  async function onAdminSubmit(event) {
    event.preventDefault();
    const code = els.adminCode.value.trim();
    if (!code) {
      setFormMessage(els.adminMsg, "Please enter the admin code.");
      return;
    }
    setBusy(els.adminBtn, true, "Checking…");
    const res = await loadResults(code);
    setBusy(els.adminBtn, false, "Unlock");
    if (!res.ok) {
      setFormMessage(els.adminMsg, apiMessage(res.error));
      return;
    }
    els.adminCode.value = "";
    els.adminForm.hidden = true;
    els.adminPanel.hidden = false;
    els.adminTitle.focus({ preventScroll: true });
  }

  async function refreshResults() {
    els.adminRefresh.disabled = true;
    els.adminRefresh.textContent = "Refreshing…";
    const res = await loadResults(state.adminCode);
    els.adminRefresh.disabled = false;
    els.adminRefresh.textContent = res.ok ? "Refresh" : `Refresh failed. ${apiMessage(res.error)}`;
  }

  function renderAdminPanel() {
    const rows = state.adminRows;
    const students = new Set(rows.map((r) => `${r.Class}|${String(r["Student Name"]).toLowerCase()}`));
    const avg = rows.length ? Math.round(rows.reduce((sum, r) => sum + Number(r.Percent || 0), 0) / rows.length) : 0;
    els.adminStats.replaceChildren(
      statTile("Results", String(rows.length)),
      statTile("Students", String(students.size)),
      ...CLASSES.map((cls) => statTile(cls.name, String(rows.filter((r) => r.Class === cls.id).length))),
      statTile("Average score", rows.length ? `${avg}%` : "–")
    );
    const button = (label, classId) => {
      const btn = h("button", { class: "btn btn--primary", type: "button" }, icon("i-download"), h("span", { class: "btn__label" }, label));
      btn.disabled = rows.length === 0;
      btn.addEventListener("click", () => downloadCsv(classId));
      return btn;
    };
    els.adminDownloads.replaceChildren(
      button("All classes (CSV)", null),
      ...CLASSES.map((cls) => button(`${cls.name} (CSV)`, cls.id))
    );
  }

  // A leading =, +, - or @ would make Excel run the cell as a formula.
  function csvCell(value) {
    let text = value == null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function localTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const p2 = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }

  function downloadCsv(classId) {
    const cls = classId ? findClass(classId) : null;
    const rows = state.adminRows.filter((r) => !cls || r.Class === cls.id);
    const header = [
      "Submitted At", "Class", "Student Name", "Attempt", "Score", "Total", "Percent",
      "Correct", "Wrong", "Timed Out", "Avg Answer Time (s)", "Total Time (s)", "Started At", "Finished At"
    ];
    // one class: a column per question (1 correct, 0 wrong or time's up); all classes: compact list
    const questionIds = cls ? cls.questions.map((q) => q.id) : [];
    const lines = [header.concat(cls ? questionIds : ["Answers"])];

    for (const r of rows) {
      // the sheet stores text with a leading ' so it isn't read as a formula
      const name = String(r["Student Name"] ?? "").replace(/^'/, "");
      const answers = String(r.Answers ?? "").replace(/^'/, "");
      const base = [
        localTime(r["Submitted At"]), r.Class, name, r.Attempt, r.Score, r.Total, r.Percent,
        r.Correct, r.Wrong, r["Timed Out"], r["Avg Answer Time (s)"], r["Total Time (s)"],
        localTime(r["Started At"]), localTime(r["Finished At"])
      ];
      if (cls) {
        const marks = Object.fromEntries(answers.split(" ").filter(Boolean).map((pair) => pair.split("=")));
        lines.push(base.concat(questionIds.map((id) => (id in marks ? (marks[id] === "1" ? 1 : 0) : ""))));
      } else {
        lines.push(base.concat([answers]));
      }
    }

    // BOM so Excel opens UTF-8 names (e.g. Khmer) correctly
    const csv = "\ufeff" + lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const today = new Date().toISOString().slice(0, 10);
    const link = h("a", { href: url, download: `unity-quiz-${cls ? `class-${cls.id.toLowerCase()}` : "all"}-${today}.csv` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- sound toggle ---------- */

  function setMuted(muted) {
    Sound.setMuted(muted);
    store.set("muted", muted);
    els.soundBtn.setAttribute("aria-pressed", String(!muted));
    els.soundBtn.setAttribute("aria-label", muted ? "Sound off. Turn sound on" : "Sound on. Turn sound off");
    els.soundIcon.setAttribute("href", muted ? "#i-sound-off" : "#i-sound-on");
  }

  /* ---------- background music ---------- */

  // The track loops from assets/audio/bgm.mp3. The music button stays hidden until the
  // file loads, so the game works unchanged when no track is present.
  function prepareMusic() {
    const audio = els.music;
    audio.volume = MUSIC_VOLUME;
    audio.addEventListener(
      "loadedmetadata",
      () => {
        state.musicReady = true;
        els.musicBtn.hidden = false;
      },
      { once: true }
    );
    audio.preload = "metadata";
    audio.load();
  }

  function playMusic() {
    if (!state.musicOn || !state.musicReady || !els.music.paused) return;
    // browsers block audio until the first click or key press; retried on the next one
    els.music.play().catch(() => {});
  }

  function setMusicOn(on) {
    state.musicOn = on;
    store.set("music", on);
    els.musicBtn.setAttribute("aria-pressed", String(on));
    els.musicBtn.setAttribute("aria-label", on ? "Music on. Turn music off" : "Music off. Turn music on");
    els.musicIcon.setAttribute("href", on ? "#i-music-on" : "#i-music-off");
    if (on) playMusic();
    else els.music.pause();
  }

  /* ---------- events ---------- */

  function isTyping(target) {
    return target instanceof HTMLElement && (target.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && target.type !== "radio"));
  }

  function onKeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
    const onControl = event.target instanceof HTMLElement && event.target.closest("button, a, summary");
    const activate = event.key === "Enter" || event.key === " ";
    const key = event.key.toUpperCase();

    if (state.view === "class" && findClass(key)) {
      event.preventDefault();
      chooseClass(key);
    } else if (state.view === "question") {
      const isTf = state.current.type === "tf";
      const index = isTf ? TF_KEYS.indexOf(key) : -1;
      if (index >= 0) {
        event.preventDefault();
        selectOption(index);
      } else if (/^[1-4]$/.test(event.key) && Number(event.key) <= state.current.choices.length) {
        event.preventDefault();
        selectOption(Number(event.key) - 1);
      }
    } else if (state.view === "result" && activate && !onControl) {
      event.preventDefault();
      startTurn();
    }
  }

  // ?class=A (or B) in the URL opens straight into that class, e.g. for a shared class link.
  function initialClass() {
    const fromUrl = new URLSearchParams(location.search).get("class");
    if (fromUrl && findClass(fromUrl.toUpperCase())) return fromUrl.toUpperCase();
    return null;
  }

  function init() {
    setMuted(store.get("muted", false));
    prepareMusic();
    setMusicOn(store.get("music", true));
    applyPalette(state.paletteIndex);
    state.classId = findClass(store.get("class", null)) ? store.get("class", null) : null;

    const preset = initialClass();
    if (preset) chooseClass(preset, { silent: true });
    else openClassPicker();

    els.classGrid.addEventListener("click", (e) => {
      const tile = e.target instanceof Element && e.target.closest(".class-tile");
      if (tile) chooseClass(tile.dataset.class);
    });
    els.changeClassBtn.addEventListener("click", openClassPicker);
    els.sClassBtn.addEventListener("click", openClassPicker);
    els.retryBtn.addEventListener("click", retry);
    els.joinForm.addEventListener("submit", onJoinSubmit);
    els.joinBack.addEventListener("click", openClassPicker);
    els.sSaveRetry.addEventListener("click", () => submitResult(state.attempt));
    els.teacherBtn.addEventListener("click", openAdmin);
    els.adminForm.addEventListener("submit", onAdminSubmit);
    els.adminRefresh.addEventListener("click", refreshResults);
    els.adminBack.addEventListener("click", closeAdmin);
    els.form.addEventListener("change", (e) => {
      if (e.target.name === "answer") onAnswerChange(Number(e.target.value));
    });
    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitAnswer();
    });
    els.nextBtn.addEventListener("click", startTurn);
    els.soundBtn.addEventListener("click", () => {
      setMuted(!Sound.isMuted());
      Sound.unlock();
      if (!Sound.isMuted()) Sound.tick(2);
    });
    els.musicBtn.addEventListener("click", () => setMusicOn(!state.musicOn));
    document.addEventListener("pointerdown", playMusic);
    document.addEventListener("keydown", playMusic);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) els.music.pause();
      else playMusic();
    });
    document.addEventListener("keydown", onKeydown);
    flushUnsaved();
    document.documentElement.classList.add("js-ready");
  }

  init();
})();
