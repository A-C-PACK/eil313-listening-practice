/* EIL313 Listening Practice: one set page.
   Flow: Get ready -> Test (2 listens, no seeking, no transcript) -> Results ->
   Review mistakes (trap, why, replay the exact clip) -> Transcript player -> Retry missed.
   State lives in localStorage under "eil313lp:<set id>". */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("set-data").textContent);
  var KEY = "eil313lp:" + D.id;
  var LETTERS = "ABCD";
  var TYPE_NAME = { main_idea: "Main idea", detail: "Detail", inference: "Inference", relationship: "Relationship" };
  var TRAP = {
    heard_word: ["Heard the word", "This option uses a word you heard, but the meaning is different.", "Don't choose an option just because you heard one of its words. Ask: does the whole option match what the speaker meant?"],
    not_stated: ["Not said", "This sounds true, but nobody in the recording said it.", "Choose only what the speakers actually said or clearly meant, not what is true in general or what you think."],
    too_narrow: ["Too small", "This is only one detail, not the main idea.", "For main-idea questions, choose the option that covers the whole conversation or the whole section, not one example."],
    too_broad: ["Too big", "This goes further than what the speakers said.", "Watch for options that are bigger or stronger than what was said (always, everyone, all over the world)."],
    wrong_speaker: ["Wrong speaker", "Someone said this, but not the person in the question.", "Keep track of who says what. In your notes, write a letter for each speaker (M = Mei, S = Sofia…)."],
    opposite: ["Opposite", "This is the opposite of what was said.", "Listen carefully after but, actually, not and however. These words often turn the meaning around."],
    changed_detail: ["Changed detail", "Almost right, but a number, time or detail is different.", "Write numbers and names in your notes as soon as you hear them, and listen for corrections (\"No, wait, it was…\")."],
    wrong_relationship: ["Misread the speakers", "This misreads how the speakers feel about each other's ideas.", "Notice reactions: Exactly! (agree), Hmm, I'm not sure (doubt), Okay, you're right (changing their mind)."],
    no_answer: ["No answer", "You didn't choose an answer.", "Always choose an answer, even if you are not sure. There is no penalty for guessing."]
  };
  var TIPS = {
    main_idea: ["S2", "Listen for the main idea", "On the first listen, don't stop for every word. Ask: what is the problem or question, and how does it end?"],
    detail: [D.type === "graph" ? "S13" : "S4", D.type === "graph" ? "Listen for numbers and comparisons" : "Listen for examples and supporting details", "Before you listen, underline the key words in each question. The answer often comes right after a signpost like the main reason is or for example."],
    inference: ["S11", "Separate fact from opinion", "Listen to HOW people speak: hesitation (Well… I guess), surprise (Really?), and softeners (maybe, kind of) tell you what they really think."],
    relationship: ["S3", "Recognize signpost language", "Track each speaker's opinion at the start and at the end. Notice who agrees (Exactly!), pushes back (But…), or changes their mind (Okay, you have a point)."]
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(t) { t = Math.max(0, t || 0); return Math.floor(t / 60) + ":" + ("0" + Math.floor(t % 60)).slice(-2); }

  var S = load();
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  S.attempts = S.attempts || [];
  S.cur = S.cur || { answers: {}, listens: 0, submitted: false };

  var lineIdx = {};
  D.lines.forEach(function (l, i) { lineIdx[l.id] = i; });
  var T = {};
  D.timing.forEach(function (t) { T[t.id] = t; });

  /* ---------------- steps ---------------- */
  var steps = $$("section.step");
  var stepBtns = $$("#steps button");
  var maxStep = S.cur.submitted ? 5 : 1;
  function go(n, focus) {
    if (n > maxStep) return;
    steps.forEach(function (s) { s.hidden = +s.dataset.step !== n; });
    stepBtns.forEach(function (b) {
      var k = +b.dataset.step;
      b.disabled = k > maxStep;
      if (k === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      b.classList.toggle("done", k < n && k <= maxStep);
    });
    if (n !== 1 && testAudio && !testAudio.paused) { /* leaving the test never pauses it: a real test keeps playing */ }
    if (n !== 4 && n !== 3 && ra && !ra.paused) ra.pause();
    if (focus !== false) {
      var h = $("#h-s" + n);
      window.scrollTo({ top: 0 });
      if (h) h.focus({ preventScroll: true });
    }
    S.step = n; save();
  }
  stepBtns.forEach(function (b) { b.addEventListener("click", function () { go(+b.dataset.step); }); });
  $$("[data-go]").forEach(function (b) { b.addEventListener("click", function () { go(+b.dataset.go); }); });

  /* ---------------- test ---------------- */
  var form = $("#test-form");
  var testAudio = new Audio(D.audio);
  testAudio.preload = "metadata";
  var playBtn = $("#test-play"), status = $("#test-status"), bar = $("#test-bar"), ttime = $("#test-time");
  var dots = $$("#tplay .listens span");

  function renderListens(playing) {
    dots.forEach(function (d, i) { d.classList.toggle("used", i < S.cur.listens); });
    if (S.cur.submitted) {
      playBtn.disabled = true; status.textContent = "Test finished"; return;
    }
    if (playing) {
      playBtn.disabled = true;
      status.textContent = "Listen " + S.cur.listens + " of 2: playing…";
    } else if (S.cur.listens >= 2) {
      playBtn.disabled = true;
      status.textContent = "You have used both listens. Finish your answers and submit.";
    } else {
      playBtn.disabled = false;
      status.textContent = S.cur.listens === 0 ? "Listen 1 of 2: press play when you're ready" : "Listen 2 of 2: press play to listen again";
    }
  }
  playBtn.addEventListener("click", function () {
    if (S.cur.listens >= 2 || S.cur.submitted) return;
    S.cur.listens += 1; save();
    testAudio.currentTime = 0;
    var p = testAudio.play();
    if (p && p.catch) p.catch(function () { S.cur.listens -= 1; save(); renderListens(false); status.textContent = "The audio could not play. Check your connection and try again."; });
    renderListens(true);
  });
  testAudio.addEventListener("timeupdate", function () {
    var d = testAudio.duration || D.duration;
    bar.style.width = (100 * testAudio.currentTime / d) + "%";
    ttime.textContent = fmt(testAudio.currentTime) + " / " + fmt(d);
  });
  testAudio.addEventListener("ended", function () { bar.style.width = "100%"; renderListens(false); });
  // No seeking in the test, even from media keys.
  testAudio.addEventListener("seeking", function () {
    if (!testAudio._allow && testAudio.currentTime > 0.5 && Math.abs(testAudio.currentTime - (testAudio._last || 0)) > 1.5) testAudio.currentTime = testAudio._last || 0;
  });
  testAudio.addEventListener("timeupdate", function () { testAudio._last = testAudio.currentTime; });
  testAudio.addEventListener("pause", function () {
    if (!testAudio.ended && !S.cur.submitted && testAudio.currentTime > 0 && !testAudio._stop) testAudio.play().catch(function () {});
  });

  function countAnswered() {
    var n = Object.keys(S.cur.answers).length;
    $("#answered").textContent = n + " of " + D.questions.length + " answered";
    return n;
  }
  $$("input[type=radio]", form).forEach(function (r) {
    if (S.cur.answers[r.name] === +r.value) r.checked = true;
    r.addEventListener("change", function () { S.cur.answers[r.name] = +r.value; save(); countAnswered(); });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (S.cur.submitted) { go(2); return; }
    var n = countAnswered();
    if (n < D.questions.length && !window.confirm("You answered " + n + " of " + D.questions.length + " questions. Submit anyway?")) return;
    if (S.cur.listens < 2 && !testAudio.ended && testAudio.currentTime > 0 && !window.confirm("The recording is still playing. Submit now?")) return;
    submit();
  });

  function grade(answers, qs) {
    var r = { score: 0, byType: {}, traps: {}, wrong: [] };
    qs.forEach(function (q) {
      var t = r.byType[q.type] || (r.byType[q.type] = [0, 0]);
      t[1] += 1;
      var a = answers[q.id];
      if (a === q.answer) { r.score += 1; t[0] += 1; }
      else {
        r.wrong.push(q.id);
        var trap = a === undefined ? "no_answer" : (q.traps[a] || "not_stated");
        r.traps[trap] = (r.traps[trap] || 0) + 1;
      }
    });
    return r;
  }
  function submit() {
    testAudio._stop = true; testAudio.pause();
    var g = grade(S.cur.answers, D.questions);
    S.cur.submitted = true;
    S.attempts.push({ date: new Date().toISOString(), answers: S.cur.answers, score: g.score, byType: g.byType, traps: g.traps, listens: S.cur.listens });
    S.retry = null;
    save();
    lockForm();
    maxStep = 5;
    renderAfter();
    go(2);
  }
  function lockForm() {
    $$("input", form).forEach(function (i) { i.disabled = true; });
    $("#submit").textContent = "See my results";
    renderListens(false);
  }

  /* ---------------- results ---------------- */
  function last() { return S.attempts[S.attempts.length - 1]; }
  function renderResults() {
    var a = last(), g = grade(a.answers, D.questions);
    var pct = Math.round(100 * g.score / D.questions.length);
    var msg = g.score === 12 ? "Perfect score! Excellent listening." :
      g.score >= 10 ? "Great work. Review the few you missed to see the trap." :
      g.score >= 7 ? "Good effort. The review will show you exactly where the answers were." :
      "This was a hard one. Go through the review slowly: each mistake shows you a trap to avoid next time.";
    var skills = Object.keys(TYPE_NAME).map(function (t) {
      var v = g.byType[t] || [0, 0], p = v[1] ? 100 * v[0] / v[1] : 0;
      return '<div class="skill"><span>' + TYPE_NAME[t] + '</span><span class="track" aria-hidden="true"><i class="' + (p === 100 ? "full" : p < 67 ? "low" : "") + '" style="width:' + p + '%"></i></span><span>' + v[0] + "/" + v[1] + "</span></div>";
    }).join("");
    var trapHtml = "";
    var keys = Object.keys(g.traps).sort(function (x, y) { return g.traps[y] - g.traps[x]; });
    if (keys.length) {
      var k = keys[0], tr = TRAP[k];
      trapHtml = '<div class="callout trap-box"><p><b>Your most common trap: ' + esc(tr[0]) + "</b> (" + g.traps[k] + "×). " + esc(tr[1]) + "</p><p><b>Next time:</b> " + esc(tr[2]) + "</p></div>";
    }
    var prev = S.attempts.length > 1 ? '<p class="muted small">Attempt ' + S.attempts.length + ". Your best score: " + Math.max.apply(null, S.attempts.map(function (x) { return x.score; })) + "/12.</p>" : "";
    $("#results").innerHTML =
      '<div class="card"><div class="score"><div class="ring" style="--p:' + pct + '" role="img" aria-label="' + g.score + ' out of 12 correct"><div><span><b>' + g.score + '</b><small>out of 12</small></span></div></div>' +
      '<div style="flex:1;min-width:240px"><p style="font-weight:600;margin-bottom:6px">' + esc(msg) + "</p>" + prev +
      '<div class="skills" aria-label="Score by question type">' + skills + "</div></div></div>" + trapHtml + "</div>";
  }

  /* ---------------- review ---------------- */
  function marked(l) {
    var t = esc(l.text);
    (l.signposts || []).slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (s) {
      var e = esc(s), i = t.indexOf(e);
      if (i >= 0 && t.slice(0, i).lastIndexOf("<mark") <= t.slice(0, i).lastIndexOf("</mark>")) t = t.slice(0, i) + '<mark class="sp">' + e + "</mark>" + t.slice(i + e.length);
    });
    return t;
  }
  function who(name) { return '<span class="who" style="--c:' + D.colors[name] + '">' + esc(name) + "</span>"; }
  function snippet(q) {
    // Only the evidence lines (plus the line just before the first one, for context);
    // skipped stretches show as "…" so the excerpt stays short.
    var idx = q.evidence.map(function (e) { return lineIdx[e]; }).sort(function (x, y) { return x - y; });
    var show = {};
    if (idx[0] > 0) show[idx[0] - 1] = "ctx";
    idx.forEach(function (i) { show[i] = "ev"; });
    var keys = Object.keys(show).map(Number).sort(function (x, y) { return x - y; });
    var html = "", prev = null;
    keys.forEach(function (i) {
      if (prev !== null && i > prev + 1) html += '<p class="muted" aria-hidden="true">…</p>';
      var l = D.lines[i];
      html += "<p>" + who(l.speaker) + ": " + (show[i] === "ev" ? '<span class="ev">' + marked(l) + "</span>" : marked(l)) + "</p>";
      prev = i;
    });
    return '<div class="snip" aria-label="From the transcript">' + html + "</div>";
  }
  function ansRow(q, k, cls, label) {
    var trap = cls === "yours" && q.traps[k] ? '<span class="trap">' + esc(TRAP[q.traps[k]][0]) + "</span>" : "";
    return '<div class="ans ' + cls + '"><span class="L" aria-hidden="true">' + LETTERS[k] + '</span><span class="o"><span class="visually-hidden">' + label + ": " + LETTERS[k] + ". </span>" + esc(q.options[k]) + trap + '</span><span class="why">' + esc(q.feedback[k]) + "</span></div>";
  }
  function replayBtn(q) {
    return '<button type="button" class="btn secondary small replay" data-replay="' + q.id + '"><svg class="i" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg> Replay this part</button>';
  }
  function renderReview() {
    var a = last(), wrong = [], right = [];
    D.questions.forEach(function (q, i) { (a.answers[q.id] === q.answer ? right : wrong).push([q, i]); });
    var html = "";
    if (!wrong.length) html += '<div class="callout jade"><p><b>No mistakes!</b> Read why each answer is right below. It helps you do it again next time.</p></div>';
    else html += '<p class="muted">You missed ' + wrong.length + " question" + (wrong.length > 1 ? "s" : "") + ". Work through them one by one.</p>";
    wrong.forEach(function (p) {
      var q = p[0], i = p[1], yours = a.answers[q.id];
      var others = [0, 1, 2, 3].filter(function (k) { return k !== q.answer && k !== yours; });
      html += '<article class="rv" id="rv-' + q.id + '"><h3><span class="qnum" aria-hidden="true">' + (i + 1) + '</span><span><span class="qtype">' + TYPE_NAME[q.type] + "</span>Question " + (i + 1) + ". " + esc(q.stem) + "</span></h3>" +
        (yours === undefined ? '<div class="ans yours"><span class="L" aria-hidden="true">–</span><span class="o">No answer<span class="trap">No answer</span></span><span class="why">' + esc(TRAP.no_answer[2]) + "</span></div>" : ansRow(q, yours, "yours", "Your answer")) +
        ansRow(q, q.answer, "correct", "Correct answer") +
        '<div class="clue"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 10a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0"/></svg><span><b>Listen for:</b> ' + esc(q.clue) + "</span></div>" +
        snippet(q) + replayBtn(q) +
        '<details class="more"><summary>Why not the other options?</summary>' + others.map(function (k) { return ansRow(q, k, "other", "Option"); }).join("") + "</details></article>";
    });
    if (right.length) {
      html += '<details class="card"><summary><b>Questions you got right (' + right.length + ")</b></summary>" + right.map(function (p) {
        var q = p[0], i = p[1];
        return '<article class="rv right" style="margin-top:var(--s4)"><h3><span class="qnum" aria-hidden="true">' + (i + 1) + '</span><span><span class="qtype">' + TYPE_NAME[q.type] + "</span>" + esc(q.stem) + "</span></h3>" + ansRow(q, q.answer, "correct", "Correct answer") + '<div class="clue"><span><b>Clue:</b> ' + esc(q.clue) + "</span></div>" + replayBtn(q) + "</article>";
      }).join("") + "</details>";
    }
    $("#review").innerHTML = html;
  }

  /* ---------------- review audio + transcript player ---------------- */
  var ra = new Audio(D.audio);
  ra.preload = "none";
  var rPlay = $("#r-play"), rSeek = $("#r-seek"), rTime = $("#r-time"), clipEnd = null, clipBtn = null;
  var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span class="visually-hidden">Play</span>';
  var PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg><span class="visually-hidden">Pause</span>';
  function setPlayIcon() { rPlay.innerHTML = ra.paused ? PLAY : PAUSE; }
  ra.addEventListener("play", setPlayIcon);
  ra.addEventListener("pause", function () {
    setPlayIcon();
    if (clipBtn) { clipBtn.setAttribute("aria-pressed", "false"); clipBtn.lastChild.textContent = " Replay this part"; clipBtn = null; }
  });
  rPlay.addEventListener("click", function () { clipEnd = null; if (ra.paused) ra.play(); else ra.pause(); });
  $("#r-back").addEventListener("click", function () { ra.currentTime = Math.max(0, ra.currentTime - 5); });
  rSeek.addEventListener("input", function () { ra.currentTime = +rSeek.value; clipEnd = null; });
  $$(".seg button").forEach(function (b) {
    b.addEventListener("click", function () {
      ra.playbackRate = +b.dataset.rate;
      $$(".seg button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    });
  });
  var cap = $("#r-cap"), tr = $("#transcript");
  cap.addEventListener("change", function () { tr.hidden = !cap.checked; S.captions = cap.checked; save(); });
  if (S.captions === false) { cap.checked = false; tr.hidden = true; }
  var current = -1;
  ra.addEventListener("timeupdate", function () {
    var t = ra.currentTime;
    rSeek.value = t; rTime.textContent = fmt(t) + " / " + fmt(ra.duration || D.duration);
    if (clipEnd !== null && t >= clipEnd) { clipEnd = null; ra.pause(); }
    var idx = -1;
    for (var i = 0; i < D.timing.length; i++) if (t >= D.timing[i].start - 0.05) idx = i;
    if (idx !== current) {
      var old = tr.querySelector(".tline.now"); if (old) old.classList.remove("now");
      current = idx;
      var el = idx >= 0 ? tr.children[idx] : null;
      if (el) {
        el.classList.add("now");
        if (!steps[4].hidden && !tr.hidden) {
          var r = el.getBoundingClientRect();
          if (r.top < 150 || r.bottom > window.innerHeight - 20) el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }
    }
  });
  function playClip(qid, btn) {
    var q = D.questions.filter(function (x) { return x.id === qid; })[0];
    var ts = q.evidence.map(function (e) { return T[e]; }).filter(Boolean);
    if (!ts.length) return;
    var a = Math.min.apply(null, ts.map(function (x) { return x.start; })), b = Math.max.apply(null, ts.map(function (x) { return x.end; }));
    if (clipBtn === btn && !ra.paused) { ra.pause(); return; }
    ra.pause();
    ra.currentTime = Math.max(0, a - 0.4);
    clipEnd = b + 0.3;
    ra.play();
    clipBtn = btn; btn.setAttribute("aria-pressed", "true"); btn.lastChild.textContent = " Stop";
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-replay]");
    if (b) playClip(b.dataset.replay, b);
  });
  function renderTranscript() {
    var a = last(), evq = {};
    if (a) D.questions.forEach(function (q, i) { if (a.answers[q.id] !== q.answer) q.evidence.forEach(function (e) { (evq[e] = evq[e] || []).push(i + 1); }); });
    tr.innerHTML = D.lines.map(function (l, i) {
      var tag = evq[l.id] ? ' <span class="badge" title="Answer to a question you missed">Q' + evq[l.id].join(", Q") + "</span>" : "";
      return '<div class="tline' + (evq[l.id] ? " ev" : "") + '" data-i="' + i + '" role="button" tabindex="0" aria-label="Play from: ' + esc(l.speaker) + ", " + esc(l.text.slice(0, 60)) + '">' + who(l.speaker) + "<span>" + marked(l) + tag + "</span></div>";
    }).join("");
    $$(".tline", tr).forEach(function (el) {
      function seek() { var t = D.timing[+el.dataset.i]; if (!t) return; clipEnd = null; ra.currentTime = Math.max(0, t.start - 0.1); ra.play(); }
      el.addEventListener("click", seek);
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); seek(); } });
    });
  }

  /* ---------------- retry + tips ---------------- */
  function renderRetry() {
    var a = last(), missed = D.questions.filter(function (q) { return a.answers[q.id] !== q.answer; });
    var box = $("#retry");
    if (!missed.length) { box.innerHTML = '<div class="callout jade"><p><b>You got every question right.</b> Try another set, or take this test again in a few days.</p></div>'; return; }
    var done = S.retry && S.retry.attempt === S.attempts.length;
    var html = '<div class="card"><h3>Try the questions you missed</h3><p class="muted small">Use the transcript player in step 5 if you want. Then check your answers.</p><form id="retry-form">';
    missed.forEach(function (q) {
      var i = D.questions.indexOf(q);
      html += '<div class="q"><fieldset><legend><span class="qnum" aria-hidden="true">' + (i + 1) + "</span><span>" + esc(q.stem) + "</span></legend>" +
        q.options.map(function (o, k) {
          return '<label class="opt"><input type="radio" name="r-' + q.id + '" value="' + k + '"' + (done && S.retry.answers[q.id] === k ? " checked" : "") + (done ? " disabled" : "") + '><span class="L" aria-hidden="true">' + LETTERS[k] + "</span><span>" + esc(o) + "</span></label>";
        }).join("") + '<div class="rfb" data-q="' + q.id + '"></div></fieldset></div>';
    });
    html += '<div class="btn-row"><button class="btn" type="submit"' + (done ? " disabled" : "") + '>Check my answers</button><span id="retry-score" aria-live="polite" style="font-weight:700"></span></div></form></div>';
    box.innerHTML = html;
    function show() {
      var ok = 0;
      missed.forEach(function (q) {
        var k = S.retry.answers[q.id], el = box.querySelector('.rfb[data-q="' + q.id + '"]');
        if (k === q.answer) ok++;
        el.innerHTML = k === undefined ? '<p class="muted small">No answer.</p>' : (k === q.answer ? ansRow(q, k, "correct", "Your answer") : ansRow(q, k, "yours", "Your answer") + ansRow(q, q.answer, "correct", "Correct answer"));
      });
      $("#retry-score").textContent = "Retry: " + ok + " of " + missed.length + " correct. Test score: " + a.score + "/12.";
    }
    if (done) show();
    $("#retry-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var ans = {};
      missed.forEach(function (q) { var c = box.querySelector('input[name="r-' + q.id + '"]:checked'); if (c) ans[q.id] = +c.value; });
      S.retry = { attempt: S.attempts.length, answers: ans }; save();
      $$("input", box).forEach(function (i) { i.disabled = true; });
      e.submitter && (e.submitter.disabled = true);
      show();
    });
  }
  function renderTips() {
    var a = last(), g = grade(a.answers, D.questions), out = [];
    Object.keys(TIPS).forEach(function (t) {
      var v = g.byType[t];
      if (v && v[0] < v[1]) {
        var tip = TIPS[t];
        out.push('<div class="tip"><span class="s-id">' + tip[0] + '</span><div><p><b>' + TYPE_NAME[t] + " (" + v[0] + "/" + v[1] + ")</b></p><p>" + esc(tip[2]) + '</p><a class="small" href="' + D.lab + "strategies.html#" + tip[0] + '" target="_blank" rel="noopener">Practise: ' + tip[0] + " " + esc(tip[1]) + ' (Listening Lab)<span class="visually-hidden">, opens in a new tab</span></a></div></div>');
      }
    });
    if (!out.length) out.push('<div class="tip"><span class="s-id">' + D.strategy + '</span><div><p><b>All question types correct.</b></p><p>Challenge yourself: next time, take notes and answer only after the first listen.</p></div></div>');
    $("#tips").innerHTML = out.join("");
  }

  function renderAfter() {
    if (!S.attempts.length) return;
    renderResults(); renderReview(); renderTranscript(); renderRetry(); renderTips();
  }

  $("#restart").addEventListener("click", function () {
    if (!window.confirm("Start this test again? Your old scores stay saved.")) return;
    S.cur = { answers: {}, listens: 0, submitted: false }; S.retry = null; save();
    location.reload();
  });

  /* ---------------- init ---------------- */
  countAnswered();
  if (S.cur.submitted) { lockForm(); renderAfter(); }
  renderListens(false);
  go(Math.min(S.step || 0, maxStep), false);
})();
