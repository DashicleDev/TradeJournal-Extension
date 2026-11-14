/*
 * panel/steps.js — The logging flow: steps per timeframe (forex W/D/4H, invest 12M…Weekly), switching the
 * chart timeframe, the trade document, invest exits and saving to the journal.
 */
/* ---------- step by step ---------- */
// ask the page to switch the chart's timeframe (hook.js does it through TradingView's own API)
const setTf = res =>
  new Promise(done => {
    const f = e => {
      if (e.source === window && e.data && e.data.__tj === "tfok") {
        removeEventListener("message", f);
        tfPrev = e.data.prev || "";
        done(e.data.ok ? (e.data.same ? "same" : true) : false);
      }
    };
    addEventListener("message", f);
    window.postMessage({ __tj: "tf", res, fit: autoFit }, location.origin);
    setTimeout(() => {
      removeEventListener("message", f);
      done(false);
    }, 1500);
  });
const steps = () =>
  INV()
    ? [
        ["setup", "Trade"],
        ["m12", "12M", "12M"],
        ["m6", "6M", "6M"],
        ["m3", "3M", "3M"],
        ["mo", "Monthly", "1M"],
        ["wk", "Weekly", "1W"],
        ["exec", "Execution"],
      ]
    : [
        ["setup", "Trade"],
        ["weekly", "Weekly", "1W"],
        ["daily", "Daily", "1D"],
        ["h4", "4H", "240"],
        ...(D.entry4h === "Engulfing Candle"
          ? [["ltf", D.ecTf === "1h" ? "1H" : "2H", D.ecTf === "1h" ? "60" : "120"]]
          : []),
        ["result", "Result"],
      ];
const dateStep = () =>
  INV()
    ? "exec"
    : steps()
        .filter(x => x[2])
        .pop()[0];
const missSetup = () =>
  INV() ? [!D.pair && "ticker"].filter(Boolean) : [!D.pair && "pair", !D.dir && "direction"].filter(Boolean);
const curStep = () => {
  const L = steps();
  if (step >= L.length) step = L.length - 1;
  return L[step];
};
const snapFor = slot =>
  new Promise(done => {
    snapWait = { slot, done };
    armed = slot;
    clearTimeout(armTimer);
    trySnapshot();
    setTimeout(() => {
      if (snapWait && snapWait.slot === slot) {
        snapWait = null;
        armed = null;
        done(false);
      }
    }, 6000);
  });
async function goStep(i) {
  step = Math.max(0, Math.min(steps().length - 1, i));
  store({ step });
  dd = null;
  const s = curStep();
  // invest: the Trade step shows the 6M chart, where you decide phase A or B (no snapshot here)
  if (INV() && s[0] === "setup") {
    msg = "";
    render();
    const ok = await setTf("6M");
    msg = ok ? "" : "Switch the chart to 6M yourself to judge the phase.";
  }
  if (s[2]) {
    msg = "";
    render();
    const ok = await setTf(s[2]);
    msg = ok ? "" : `Switch the chart to ${s[1]} yourself.`;
    if (s[0] === dateStep() && !D.date && !editDoc) {
      await fromPos();
      if (!D.date) {
        const dt = await replayDate();
        if (dt) {
          D.date = dt;
          keep();
        } else if (LIVE()) {
          D.date = new Date().toISOString().slice(0, 10);
          keep();
        }
      }
    }
  }
  // the close date always follows the position's right edge when you reach the result
  // (not while editing a saved trade: the replayed chart's drawings must not overwrite its dates)
  if ((s[0] === "result" || s[0] === "exec") && !editDoc) await fromPos(["closeDate"]);
  render();
}
async function startSteps(fresh) {
  await ask();
  if (info.symbol && (fresh || !D.pair)) D.pair = pairOf(info.symbol);
  const p = await fromPos();
  keep();
  await goStep(0);
  if (step === 0 && !D.dir) {
    msg = p ? "" : posWhy;
    render();
  }
}
async function next() {
  const s = curStep();
  if (s[0] === "setup") {
    const miss = missSetup();
    if (miss.length) {
      msg = "Still needed: " + miss.join(", ") + ".";
      return render();
    }
    return goStep(step + 1);
  }
  if (s[0] === "result" || s[0] === "exec") return save();
  if (editDoc && D.links[s[0]]) return goStep(step + 1); // editing: keep the chart it already has (× to retake)
  busy = true;
  msg = `Grabbing the ${s[1]} chart…`;
  render();
  const ok = await snapFor(s[0]);
  busy = false;
  if (!ok) {
    msg = `The ${s[1]} snapshot didn't come through. Press Alt+S on the chart, or continue without it.`;
    s.failed = true;
    return render();
  }
  return goStep(step + 1);
}

/* ---------- doc ---------- */
function toDoc() {
  if (INV()) {
    const num = v => (v === "" || v == null || isNaN(+v) ? null : +v),
      tk = pairOf(D.pair);
    return {
      id: uid(),
      market: "stocks",
      mode: LIVE() ? "live" : "backtest",
      dir: "long",
      project: LIVE() ? null : D.project || null,
      ticker: tk,
      pair: tk,
      date: D.date,
      closeDate: "",
      status: D.missed ? "missed" : D.keep || "taken",
      account: LIVE() ? D.account || "" : "",
      btDate: LIVE() ? null : new Date().toISOString().slice(0, 10),
      sPhase: D.sPhase || "",
      s6bm: D.sPhase === "A" ? D.s6bm || "" : "",
      s6ret: D.sPhase === "B" ? D.s6ret || "" : "",
      swPat: D.swPat || "",
      s3bm: !!D.s3bm,
      s3cc: !!D.s3cc,
      s1bm: !!D.s1bm,
      s1cc: !!D.s1cc,
      s12Ms: D.s12Ms || "",
      s12bm: D.s12Ms === "for" ? D.s12bm || "" : "",
      s12ret: D.s12Ms === "against" ? D.s12ret || "" : "",
      s6Ms: D.s6Ms || "",
      s3Ms: D.s3Ms || "",
      s1Ms: D.s1Ms || "",
      swMs: D.swMs || "",
      sEntry: num(D.sEntry),
      sStop: num(D.sStop),
      notes: (D.notes || "").trim(),
      sCur: LIVE() || simProj() ? D.sCur || "USD" : "USD",
      sFx: null,
      sShares: LIVE() ? num(D.sShares) : 1,
      // backtest: a notional position of 1, so the journal can work out R and % (exits are % of it)
      sExits: (D.sExits || [])
        .filter(x => exShares(x) || num(x.price) || (x.hows || []).length)
        .map(x => ({
          shares: exShares(x) || null,
          price: num(x.price),
          date: x.date || "",
          hows: x.hows || [],
          how: (x.hows || []).join(" + "),
        })),
      shotLinks: Object.fromEntries(["m12", "m6", "m3", "mo", "wk"].filter(k => D.links[k]).map(k => [k, D.links[k]])),
      ...(() => {
        const c = exSum();
        if (c && c.xs.length && c.left <= 0)
          return {
            r: c.r != null ? +c.r.toFixed(2) : null,
            pnl: LIVE() ? +c.pnl.toFixed(2) : null,
            retPct: +c.ret.toFixed(2),
            outcome: c.pnl > 0 ? "win" : c.pnl < 0 ? "loss" : "be",
            closeDate:
              c.xs
                .map(x => x.date)
                .filter(Boolean)
                .sort()
                .pop() || "",
          };
        return { r: null, pnl: LIVE() && c && c.xs.length ? +c.pnl.toFixed(2) : null, retPct: null, outcome: "" };
      })(),
      created: Date.now(),
      source: "tradingview-extension",
    };
  }
  const weekly = { ...D.w };
  if (D.ms) weekly.ms = D.ms;
  // Bullish / Bearish -> with / against your direction (a draft from before 1.4.14 already has with / against)
  const tr = ["for", "against"].includes(D.trend)
    ? D.trend
    : (D.trend === "bull" || D.trend === "bear") && D.dir
      ? (D.trend === "bull") === (D.dir === "long") ? "for" : "against"
      : "";
  if (tr) weekly.trend = tr;
  if (D.wPat) weekly.pattern = "for";
  const st = hasStruct(D.entry4h) ? D.struct : "",
    bos = st === "bos",
    som = st === "som",
    num = v => (v === "" || v == null || isNaN(+v) ? null : +v);
  let r = num(D.r);
  if (r != null && D.outcome === "loss" && r > 0) r = -r;
  if (r != null && D.outcome === "win" && r < 0) r = -r;
  if (D.outcome === "be" && r == null) r = 0;
  return {
    id: uid(),
    mode: LIVE() ? "live" : "backtest",
    market: "fx",
    project: LIVE() ? null : D.project || null,
    status: D.missed ? "missed" : D.keep || "taken",
    account: LIVE() ? D.account || "" : "",
    btDate: LIVE() ? null : new Date().toISOString().slice(0, 10),
    date: D.date,
    closeDate: D.closeDate,
    concept: D.concept,
    fase: D.fase ? +D.fase : null,
    wStruct: D.wStruct,
    wPat: D.wPat,
    wPatSub: D.wPat ? D.wPatSub : "",
    wRange: D.trend === "range" || (!!D.wRange && !D.trend),
    scaleIn: !!D.scaleIn,
    channel: !!D.channel,
    engulf: !!D.engulf,
    dMs: D.dMs,
    hMs: D.hMs,
    weekly,
    sub: D.concept === "Weekly - 4H" ? "" : D.sub,
    dPros: D.dPros.slice(),
    dailyFib: D.dPros.includes("fc") ? "ja" : "nee",
    outcome: D.outcome,
    r,
    maxR: num(D.maxR),
    notes: D.notes.trim(),
    evaluation: D.evaluation,
    onPlan: D.evaluation ? D.evaluation === "plan" : null,
    exitReason: D.exit,
    entry4h: D.entry4h,
    planEntry: num(D.planEntry),
    slPips: num(D.slPips),
    tpPips: num(D.tpPips),
    struct: st,
    bos: bos ? "ja" : som ? "nee" : "",
    dfs: "",
    som: som && D.entry4h === "Reversal" ? "ja" : "",
    ecTf: D.entry4h === "Engulfing Candle" ? D.ecTf : "",
    shots: {},
    shotLinks: { ...D.links },
    pair: pairOf(D.pair),
    dir: D.dir,
    created: Date.now(),
    source: "tradingview-extension",
  };
}
const rrText = () => {
  const sl = +D.slPips,
    tp = +D.tpPips;
  return sl > 0 && tp > 0 ? "1 : " + Math.round((tp / sl) * 100) / 100 : "—";
};
const LIVE = () => tmode === "live",
  INV = () => mkt === "stocks";
const ctxSel = () =>
  LIVE()
    ? f(
        "Account",
        `<select data-k="account"><option value="">No account</option>${accounts
          .filter(a => (a.market || "fx") === mkt)
          .map(
            a =>
              `<option value="${esc(a.name)}" ${a.name === D.account ? "selected" : ""}>${esc(a.name)}${(a.status || (a.archived ? "closed" : "active")) !== "active" ? " (" + esc(a.status || "closed") + ")" : ""}</option>`
          )
          .join(
            ""
          )}${D.account && !accounts.some(a => a.name === D.account && (a.market || "fx") === mkt) ? `<option selected value="${esc(D.account)}">${esc(D.account)}</option>` : ""}</select>`
      )
    : f(
        "Project",
        `<select data-k="project"><option value="">No project</option>${projects
          .filter(p => (p.market || "fx") === mkt)
          .map(
            p =>
              `<option value="${esc(p.id)}" ${p.id === D.project ? "selected" : ""}>${esc(p.name)}${p.status === "closed" ? " (closed)" : ""}</option>`
          )
          .join("")}</select>`
      );
// invest exits (the journal's exit plan per phase)
const EXITS0 = {
    A: [
      ["6M BOC", 40],
      ["3M BOC", 30],
      ["6M −27 FC", 15],
      ["Weekly TS", 15],
    ],
    B: [
      ["3M FS", 60],
      ["6M BOC", 40],
    ],
  },
  EXOTHER0 = ["3M FS", "Weekly TS", "BE", "Stop loss", "Manual"];
const simProj = () => {
  const p = projects.find(x => x.id === D.project);
  return p && p.simAccount && p.simMax > 0 ? p : null;
};
const exPlan = () => (P.exits || EXITS0)[D.sPhase] || [];
const exOpts = () => [
  ...new Set([...exPlan().map(x => x[0]), ...(P.exother || EXOTHER0), ...(D.sExits || []).flatMap(x => x.hows || [])]),
];
// position size: live = shares bought; backtest = a notional 1 (exits are % of it)
const exSize = () => (LIVE() ? +D.sShares || 0 : 1);
const exShares = x => (LIVE() ? +x.shares || 0 : (+x.pct || 0) / 100);
const exSum = () => {
  const sh = exSize(),
    en = +D.sEntry,
    sl = +D.sStop;
  if (!sh || !en) return null;
  const xs = (D.sExits || []).filter(x => exShares(x) > 0 && +x.price > 0),
    sold = xs.reduce((a, x) => a + exShares(x), 0),
    pnl = xs.reduce((a, x) => a + exShares(x) * (+x.price - en), 0);
  const left = Math.abs(sh - sold) < 0.0005 ? 0 : sh - sold,
    risk = en > sl && sl ? sh * (en - sl) : 0;
  return { xs, sold, left, pnl, r: risk ? pnl / risk : null, ret: (pnl / (sh * en)) * 100 };
};
const exSumText = () => {
  const c = exSum();
  if (!c || !c.xs.length)
    return (D.sExits || []).length
      ? LIVE()
        ? "Fill in shares bought and entry to see the result."
        : "Fill in the entry to see the result."
      : "No exits yet: the trade stays open.";
  const sg = v => (v > 0 ? "+" : "") + v.toFixed(2),
    done = c.left <= 0;
  return (
    (LIVE() ? `Sold ${+c.sold.toFixed(4)} / ${exSize()}` : `Closed ${+(c.sold * 100).toFixed(1)}%`) +
    (done ? "" : ` · still open ${LIVE() ? +c.left.toFixed(4) : +(c.left * 100).toFixed(1) + "%"}`) +
    (c.r != null ? ` · ${sg(c.r)}R` : "") +
    ` · ${sg(c.ret)}%`
  );
};
const missing = () =>
  INV()
    ? [!D.pair && "ticker", !D.date && "date"].filter(Boolean)
    : [!D.pair && "pair", !D.date && "date", !D.dir && "direction"].filter(Boolean);
async function save() {
  const miss = missing();
  if (miss.length) {
    msg =
      "Still needed: " +
      miss.join(", ") +
      (view === "steps" && !D.date ? ` (on the ${steps().find(x => x[0] === dateStep())[1]} step)` : "") +
      ".";
    return render();
  }
  busy = true;
  render();
  try {
    const o = editDoc,
      // editing: keep what only the journal has (stored screenshots, reviews, …): the save replaces the whole trade
      doc = o
        ? { ...o, ...toDoc(), id: o.id, created: o.created, btDate: o.btDate ?? null, shots: o.shots || {}, source: o.source }
        : toDoc();
    await call("save", { doc });
    savedId = doc.id;
    editDoc = null;
    store({ edit: null });
    const pj = D.project,
      ac = D.account,
      pr = D.pair;
    D = { ...blank(), project: pj, account: ac, pair: pr };
    store({ draft: D, lastProject: pj, lastAccount: ac });
    msg = `${o ? "Updated" : "Saved"} ${doc.pair}${INV() ? "" : " " + doc.dir}${doc.status === "missed" ? " (missed)" : ""} to ${LIVE() ? ac || "Live" : (projects.find(p => p.id === pj) || {}).name || "Backtest"}.`;
    // the Replay window from the journal (a trade opened for editing) closes once it's saved
    if (o && typeof sessionStorage !== "undefined" && sessionStorage.getItem("tjReplayWin")) setTimeout(() => window.close(), 700);
    if (view === "steps") {
      step = 0;
      logging = false;
      store({ step, logging });
    }
  } catch (e) {
    msg = "Couldn't save: " + e.message;
    busy = false;
    render();
    return false;
  }
  busy = false;
  render();
  return true;
}

/* ---------- edit a saved trade (opened from the journal's Replay link) ---------- */
// the panel draft of a saved forex trade: the reverse of the forex half of toDoc()
function fromDoc(t) {
  const w = { ...(t.weekly || {}) },
    s = v => (v == null ? "" : String(v));
  const ms = w.ms || "",
    rel = w.trend;
  delete w.ms;
  delete w.trend;
  delete w.pattern;
  return {
    ...blank(),
    project: t.project || "",
    account: t.account || "",
    pair: t.pair || "",
    date: t.date || "",
    closeDate: t.closeDate || "",
    dir: t.dir || "",
    fase: s(t.fase),
    wStruct: t.wStruct || "",
    // with / against the trade back to the Bullish / Bearish you see on the chart
    trend:
      t.wRange || rel === "range"
        ? "range"
        : (rel === "for" || rel === "against") && t.dir
          ? (rel === "for") === (t.dir === "long") ? "bull" : "bear"
          : rel || "",
    ms,
    wRange: !!t.wRange,
    wPat: t.wPat || "",
    wPatSub: t.wPatSub || "",
    w,
    concept: t.concept || "",
    setup: t.concept === "Weekly - 4H" ? "w4" : t.concept ? "wd4" : "",
    sub: t.sub || "",
    dMs: t.dMs || "",
    dPros: Array.isArray(t.dPros) ? t.dPros.slice() : [],
    entry4h: t.entry4h || "",
    hMs: t.hMs || "",
    struct: t.struct || (t.bos === "ja" ? "bos" : t.bos === "nee" ? "som" : ""),
    scaleIn: !!t.scaleIn,
    channel: !!t.channel,
    engulf: !!t.engulf,
    ecTf: t.ecTf || "",
    links: { ...(t.shotLinks || {}) },
    outcome: t.outcome || "",
    r: s(t.r),
    maxR: s(t.maxR),
    exit: t.exitReason || "",
    evaluation: t.evaluation || "",
    notes: t.notes || "",
    planEntry: s(t.planEntry),
    slPips: s(t.slPips),
    tpPips: s(t.tpPips),
    missed: t.status === "missed",
    keep: t.status === "pending" || t.status === "expired" ? t.status : "", // set in the journal; the panel only keeps it
  };
}
// an unsaved new trade is in the panel (the same test the start screen uses)
const hasDraft = () =>
  logging &&
  !editDoc &&
  !!((INV() ? D.sPhase || D.s12Ms || D.s6Ms : D.dir || D.fase || D.concept || D.entry4h) || Object.keys(D.links).length);
// open a saved trade for editing; with an unsaved new trade in the panel, ask first (askOpen)
async function requestOpen(t) {
  if (!t || t.kind || t.market === "stocks") return;
  if (hasDraft()) {
    askOpen = t;
    if (!open) toggle(true);
    return render();
  }
  await openEdit(t);
}
async function openEdit(t) {
  askOpen = null;
  editDoc = t;
  mkt = "fx";
  tmode = t.mode === "live" ? "live" : "backtest";
  D = fromDoc(t);
  logging = true;
  view = "steps";
  settings = false;
  msg = "";
  store({ edit: t, draft: D, mkt, tmode, logging });
  if (!open) toggle(true);
  await goStep(steps().findIndex(x => x[0] === "weekly"));
}
function cancelEdit() {
  editDoc = null;
  D = { ...blank(), project: D.project, account: D.account };
  step = 0;
  logging = false;
  msg = "";
  store({ edit: null, draft: D, step, logging });
  render();
}
