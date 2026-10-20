/* My progress: reads every "eil313lp:<set>" record in localStorage. */
(function () {
  "use strict";
  var PFX = "eil313lp:";
  var NAMES = { main_idea: "Main idea", detail: "Detail", inference: "Inference", relationship: "Relationship" };
  function all() {
    var out = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PFX) === 0) { try { out[k] = JSON.parse(localStorage.getItem(k)); } catch (e) {} }
    }
    return out;
  }
  function render() {
    var data = all(), tot = {};
    document.querySelectorAll("tr[data-set]").forEach(function (tr) {
      var s = data[PFX + tr.dataset.set], at = (s && s.attempts) || [];
      tr.querySelector('[data-c="n"]').textContent = at.length;
      tr.querySelector('[data-c="last"]').textContent = at.length ? at[at.length - 1].score + "/12" : "–";
      tr.querySelector('[data-c="best"]').textContent = at.length ? Math.max.apply(null, at.map(function (a) { return a.score; })) + "/12" : "–";
      if (at.length) Object.keys(at[0].byType || {}).forEach(function (t) {
        var v = at[0].byType[t], x = tot[t] || (tot[t] = [0, 0]); x[0] += v[0]; x[1] += v[1];
      });
    });
    var box = document.getElementById("p-skills");
    if (!Object.keys(tot).length) { box.innerHTML = '<p class="muted">No tests yet. <a href="index.html">Choose a practice test</a> to start.</p>'; return; }
    box.innerHTML = Object.keys(NAMES).map(function (t) {
      var v = tot[t] || [0, 0], p = v[1] ? Math.round(100 * v[0] / v[1]) : 0;
      return '<div class="skill"><span>' + NAMES[t] + '</span><span class="track" aria-hidden="true"><i class="' + (p === 100 ? "full" : p < 67 ? "low" : "") + '" style="width:' + p + '%"></i></span><span>' + p + "%</span></div>";
    }).join("");
  }
  document.getElementById("p-dl").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(all(), null, 1)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "eil313-listening-practice-scores.json";
    document.body.appendChild(a); a.click(); a.remove();
  });
  document.getElementById("p-up").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var d = JSON.parse(t);
      Object.keys(d).forEach(function (k) { if (k.indexOf(PFX) === 0) localStorage.setItem(k, JSON.stringify(d[k])); });
      render();
    }).catch(function () { alert("That file could not be read."); });
  });
  document.getElementById("p-reset").addEventListener("click", function () {
    if (!confirm("Delete all your saved scores on this computer?")) return;
    Object.keys(all()).forEach(function (k) { localStorage.removeItem(k); });
    render();
  });
  render();
})();
