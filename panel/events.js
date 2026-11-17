/*
 * panel/events.js — Clicks, inputs and keyboard handling in the panel.
 */
/* ---------- events ---------- */
root.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  lastEmail = fd.get("email") || "";
  busy = true;
  msg = "";
  render();
  try {
    user = await call("login", { email: fd.get("email"), password: fd.get("password") });
    await boot();
  } catch (er) {
    msg = er.message;
  }
  busy = false;
  render();
});
root.addEventListener("click", async e => {
  const box = e.target.closest("[data-dd]");
  if (box && !e.target.closest("[data-unw],[data-und],[data-unh],[data-exun]")) {
    dd = dd === box.dataset.dd ? null : box.dataset.dd;
    return render();
  }
  // clicks in the open list or on its chips' × keep it open
  if (dd && !e.target.closest(".ms")?.querySelector(".mslist")) {
    dd = null;
    render();
  }
  const t = e.target.closest("button");
  if (!t) return;
  const d = t.dataset;
  if (d.act === "hide") {
    mini = true;
    store({ mini });
    return render();
  }
  if (d.act === "expand") {
    mini = false;
    store({ mini });
    return render();
  }
  if (d.act === "close") return toggle(false);
  if (d.act === "log") {
    const fresh = !(
      (INV() ? D.sPhase || D.s12Ms || D.s6Ms : D.dir || D.fase || D.concept || D.entry4h) || Object.keys(D.links).length
    );
    savedId = "";
    logging = true;
    store({ logging });
    msg = "";
    return startSteps(fresh);
  }
  // editing a trade opened from the journal's Replay link
  if (d.act === "canceledit") return cancelEdit();
  if (d.act === "askcancel") {
    askOpen = null;
    return render();
  }
  if (d.act === "askdiscard") return openEdit(askOpen);
  if (d.act === "asksave") {
    const t = askOpen;
    if (await save()) return openEdit(t); // a missing field keeps the question up, with what's missing
    return render();
  }
  if (d.act === "stoplog") {
    logging = false;
    store({ logging });
    msg = "";
    return render();
  }
  if (d.act === "discard") {
    const pj = D.project,
      ac = D.account,
      pr = D.pair;
    D = { ...blank(), project: pj, account: ac, pair: pr };
    step = 0;
    store({ step, draft: D });
    msg = "";
    return render();
  }
  if (d.act === "posshow") {
    showPos(curPos());
    return;
  }
  if (d.act === "posrefresh") {
    const p = await fromPos(["dir", "date", "closeDate", "planEntry", "slPips", "tpPips", "sEntry", "sStop"]);
    msg = p ? "" : posWhy;
    return render();
  }
  if (d.act === "fwd") {
    skipBack = "";
    fwd = { n: 0 };
    msg = "";
    render();
    window.postMessage({ __tj: "fwd", specs: onSigs(), max: 300 }, location.origin);
    return;
  }
  if ((d.act === "skip1d" || d.act === "skip1w" || d.act === "fwd") && trig.length && !onSigs().length) {
    msg = "All your styles are off. Turn at least one on.";
    return render();
  }
  if (d.act === "skip1d" || d.act === "skip1w") {
    const days = d.act === "skip1d" ? 1 : 7;
    fwd = { n: 0 };
    msg = "";
    render();
    window.postMessage(
      { __tj: "fwd", specs: onSigs(), max: 300, until: days === 1 ? "D" : "W", res: "240" },
      location.origin
    );
    return;
  }
  if (d.act === "fwdstop") {
    window.postMessage({ __tj: "fwdstop" }, location.origin);
    return;
  }
  if (d.act === "trigadd") {
    window.postMessage({ __tj: "sig" }, location.origin);
    return;
  }
  if (d.tmode) {
    tmode = d.tmode;
    store({ tmode });
    msg = "";
    return render();
  }
  if (d.mkt) {
    if (d.mkt !== mkt) {
      mkt = d.mkt;
      const ac = D.account,
        pr = D.project;
      D = { ...blank(), account: "", project: "" };
      step = 0;
      store({ mkt, step, draft: D });
    }
    msg = "";
    return render();
  }
  if (d.tgtrig != null) {
    const k = +d.tgtrig;
    if (trig[k]) {
      trig[k] = { ...trig[k], on: trig[k].on === false };
      saveSet({ trig });
    }
    return render();
  }
  if (d.rmtrig != null) {
    trig = trig.filter((_, i) => i !== +d.rmtrig);
    saveSet({ trig });
    return render();
  }
  if (d.settab) {
    setTab = d.settab;
    return render();
  }
  if (d.cl) {
    closes = { ...closes, [d.cl]: d.cl === "dur" ? +d.v : d.v };
    saveSet({ closes });
    return render();
  }
  if (d.act === "cltest") return showClose({ w: false, d: true, t: Math.floor(Date.now() / 1000) }, true);
  if (d.look) {
    if (look.match && jLook) look = { ...look, theme: jLook.theme, accent: jLook.accent };
    look.match = false;
    look[d.look] = d.v;
    saveSet({ look });
    applyLook();
    return render();
  }
  if (d.act === "settings") {
    settings = !settings;
    msg = "";
    return render();
  }
  if (d.act === "exadd") {
    const used = (D.sExits || []).flatMap(x => x.hows || []),
      nx = exPlan().find(([n]) => !used.includes(n)),
      soldPct = ((D.sExits || []).reduce((a, x) => a + exShares(x), 0) / (exSize() || 1)) * 100;
    const pct = nx ? nx[1] : Math.max(0, Math.round((100 - soldPct) * 100) / 100);
    D.sExits = [
      ...(D.sExits || []),
      {
        pct: LIVE() ? null : pct || null,
        shares: LIVE() && D.sShares ? Math.floor((+D.sShares * pct) / 100) || null : null,
        price: null,
        date: new Date().toISOString().slice(0, 10),
        hows: nx ? [nx[0]] : [],
      },
    ];
    keep();
    return render();
  }
  if (d.exdel != null) {
    D.sExits = (D.sExits || []).filter((_, i) => i !== +d.exdel);
    keep();
    return render();
  }
  if (d.exhow != null) {
    const x = (D.sExits || [])[+d.exi];
    if (x) {
      const h = x.hows || [];
      if (!h.includes(d.exhow)) x.hows = [...h, d.exhow];
      keep();
    }
    return render();
  }
  if (d.exun != null) {
    const x = (D.sExits || [])[+d.exi];
    if (x) {
      x.hows = (x.hows || []).filter(v => v !== d.exun);
      keep();
    }
    return render();
  }
  if (d.act === "next") return next();
  if (d.act === "back") return goStep(step - 1);
  if (d.act === "skip") {
    msg = "";
    return goStep(step + 1);
  }
  if (d.go) {
    const i = +d.go;
    if (i > step && curStep()[0] === "setup" && missSetup().length) {
      msg = "Still needed: " + missSetup().join(", ") + ".";
      return render();
    }
    return goStep(i);
  }
  if (d.act === "reload") {
    clearTimeout(saveT);
    await store({ draft: D });
    chrome.runtime.sendMessage({ type: "reload" });
    return;
  }
  if (d.act === "logout") {
    await call("logout");
    user = null;
    settings = false;
    msg = "";
    return render();
  }
  if (d.act === "save") return save();
  if (d.act === "clear") {
    const pj = D.project;
    D = { ...blank(), project: pj };
    msg = "";
    keep();
    return render();
  }
  if (d.act === "readdate" || d.act === "readclose") {
    const k = d.act === "readdate" ? "date" : "closeDate",
      p = await fromPos([k]);
    if (p && D[k] === day(k === "date" ? p.t0 : p.t1))
      msg = `From the ${p.dir === "long" ? "Long" : "Short"} position.`;
    else {
      const dt = await replayDate();
      if (dt) D[k] = dt;
      msg = dt ? "From the replay date. " + posWhy : "Couldn't read the date, so fill it in yourself.";
    }
    keep();
    return render();
  }
  if (d.act === "read") {
    await ask();
    if (info.symbol) D.pair = pairOf(info.symbol);
    const p = await fromPos(["dir", "date", "closeDate", "planEntry", "slPips", "tpPips", "sEntry", "sStop"]);
    if (!p) {
      const dt = dateOf(info.replay);
      if (dt) D.date = dt;
    }
    msg = p
      ? `Direction and dates from the ${p.dir === "long" ? "Long" : "Short"} position.`
      : D.date
        ? posWhy
        : "Couldn't read the replay date, so fill it in yourself.";
    keep();
    return render();
  }
  if (d.sec) {
    collapsed[d.sec] = !collapsed[d.sec];
    store({ collapsed });
    return render();
  }
  if (d.arm) return arm(d.arm);
  if (d.rm) {
    delete D.links[d.rm];
    keep();
    return render();
  }
  if (d.tog) {
    D[d.tog] = !D[d.tog];
    keep();
    return render();
  }
  if (d.addw) {
    D.w[d.addw] = d.side;
    keep();
    return render();
  }
  if (d.unw) {
    delete D.w[d.unw];
    keep();
    return render();
  }
  if (d.addd) {
    if (!D.dPros.includes(d.addd)) D.dPros = [...D.dPros, d.addd];
    keep();
    return render();
  }
  if (d.addh) {
    D[d.addh] = true;
    keep();
    return render();
  }
  if (d.unh) {
    D[d.unh] = false;
    keep();
    return render();
  }
  if (d.und) {
    D.dPros = D.dPros.filter(x => x !== d.und);
    keep();
    return render();
  }
  if (d.dp) {
    D.dPros = D.dPros.includes(d.dp) ? D.dPros.filter(x => x !== d.dp) : [...D.dPros, d.dp];
    keep();
    return render();
  }
  if (d.k) {
    D[d.k] = D[d.k] === d.v ? "" : d.v;
    // a daily pattern not used in the new phase is cleared; Weekly - 4H is the setup picked on the Trade step, so it stays
    if (
      d.k === "fase" &&
      D.concept &&
      D.concept !== "Weekly - 4H" &&
      !(P.plan.faseConcepts[D.fase] || []).includes(D.concept)
    ) {
      D.concept = "";
      D.sub = "";
    }
    if (d.k === "setup") {
      // Weekly - 4H is stored as the concept itself; Weekly - Daily - 4H waits for the daily pattern
      if (D.setup === "w4") D.concept = "Weekly - 4H";
      else if (D.concept === "Weekly - 4H" || !D.setup) D.concept = "";
      D.sub = "";
    }
    if (d.k === "outcome" && d.v === "be" && D.r === "") D.r = "0";
    keep();
    return render();
  }
});
root.addEventListener("change", async e => {
  if (e.target.dataset && e.target.dataset.trn != null) {
    const i = +e.target.dataset.trn;
    if (trig[i]) {
      trig[i] = { ...trig[i], label: e.target.value.trim() };
      saveSet({ trig });
    }
    return;
  }
  if (e.target.dataset && /^notify[DWSTP]$/.test(e.target.dataset.set || "")) {
    const k = { notifyD: "d", notifyW: "w", notifyS: "sound", notifyT: "tf", notifyP: "pause" }[e.target.dataset.set];
    closes = { ...closes, [k]: e.target.checked };
    saveSet({ closes });
    if (k === "d" || k === "w") render();
    return;
  }
  if (e.target.dataset && e.target.dataset.set === "autoMkt") {
    autoMkt = e.target.checked;
    saveSet({ autoMkt });
    return;
  }
  if (e.target.dataset && e.target.dataset.set === "autoFit") {
    autoFit = e.target.checked;
    saveSet({ autoFit });
    return;
  }
  if (e.target.dataset && e.target.dataset.set === "match") {
    look.match = e.target.checked;
    if (!look.match && jLook) look = { ...look, theme: jLook.theme, accent: jLook.accent };
    saveSet({ look });
    if (look.match) loadJLook();
    else applyLook();
    return render();
  }
  const k = e.target.dataset && e.target.dataset.k;
  if (!k) return;
  if (k === "posPick") {
    D.posPick = e.target.value;
    const p = await fromPos(["dir", "date", "closeDate", "planEntry", "slPips", "tpPips", "sEntry", "sStop"]);
    showPos(p);
    msg = p ? "" : posWhy;
    return render();
  }
  if (k === "entryc") {
    Object.assign(D, entrySplit(e.target.value));
    if (engImplied("engulf", D.entry4h)) D.engulf = false;
  } else D[k] = e.target.value;
  // typing fields: no re-render, so a click that caused the blur (e.g. Save) isn't lost
  if (e.target.tagName === "TEXTAREA" || e.target.type === "number" || e.target.type === "date" || k === "pair") {
    if (k === "pair") {
      D.pair = pairOf(D.pair);
      e.target.value = D.pair;
    }
    keep();
    return;
  }
  if (k === "wPat") D.wPatSub = "";
  if (k === "concept") D.sub = "";
  if (k === "pair") D.pair = pairOf(D.pair);
  if (k === "project") store({ lastProject: D.project });
  if (k === "account") store({ lastAccount: D.account });
  keep();
  render();
});
root.addEventListener("input", e => {
  if (e.target.dataset && e.target.dataset.exk) {
    const x = (D.sExits || [])[+e.target.dataset.exi];
    if (x) {
      const v = e.target.value;
      x[e.target.dataset.exk] = e.target.type === "number" ? (v === "" ? null : +v) : v;
      keep();
      const r = panel.querySelector("[data-exsum]");
      if (r) r.textContent = exSumText();
    }
    return;
  }
  const k = e.target.dataset && e.target.dataset.k;
  if (k && (e.target.tagName === "TEXTAREA" || e.target.type === "number")) {
    D[k] = e.target.value;
    keep();
    if (k === "slPips" || k === "tpPips") {
      const r = panel.querySelector("[data-rr]");
      if (r) r.textContent = rrText();
    }
    if (k === "sEntry" || k === "sStop" || k === "sShares") {
      const r = panel.querySelector("[data-exsum]");
      if (r) r.textContent = exSumText();
    }
  }
});
// reorder trigger styles by dragging the grip
let dragI = null;
root.addEventListener("dragstart", e => {
  const g = e.target.closest && e.target.closest("[data-grip]");
  if (!g) return;
  dragI = +g.dataset.grip;
  e.dataTransfer.effectAllowed = "move";
  try {
    e.dataTransfer.setData("text/plain", String(dragI));
    e.dataTransfer.setDragImage(g.closest(".tr"), 10, 10);
  } catch {}
  g.closest(".tr").classList.add("drag");
});
root.addEventListener("dragover", e => {
  if (dragI == null) return;
  const r = e.target.closest && e.target.closest("[data-tri]");
  if (!r) return;
  e.preventDefault();
  root.querySelectorAll(".tr.over-a,.tr.over-b").forEach(x => x.classList.remove("over-a", "over-b"));
  const b = r.getBoundingClientRect();
  r.classList.add(e.clientY < b.top + b.height / 2 ? "over-a" : "over-b");
});
root.addEventListener("drop", e => {
  if (dragI == null) return;
  const r = e.target.closest && e.target.closest("[data-tri]");
  e.preventDefault();
  if (!r) return;
  const b = r.getBoundingClientRect();
  let to = +r.dataset.tri + (e.clientY < b.top + b.height / 2 ? 0 : 1);
  const from = dragI;
  dragI = null;
  if (to > from) to--;
  if (to !== from) {
    const L = trig.slice(),
      [it] = L.splice(from, 1);
    L.splice(to, 0, it);
    trig = L;
    saveSet({ trig });
  }
  render();
});
root.addEventListener("dragend", () => {
  if (dragI != null) {
    dragI = null;
    render();
  }
});

// keep TradingView from reacting to keys typed in the panel
["keydown", "keyup", "keypress"].forEach(t => host.addEventListener(t, e => e.stopPropagation()));
