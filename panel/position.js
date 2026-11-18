/*
 * panel/position.js — Reads the Long/Short Position drawing (entry, stop, target, dates) and the
 * "skip to drawing" bar-replay feature.
 */
/* ---------- long / short position tool ---------- */
// hook.js reads the selected Long/Short Position drawing, otherwise the one with the latest entry.
let posWhy = "",
  posList = [],
  shownId = "";
const getPos = () =>
  new Promise(done => {
    const f = e => {
      if (e.source === window && e.data && e.data.__tj === "posinfo") {
        removeEventListener("message", f);
        posList = e.data.list || [];
        const userSel = e.data.selId && e.data.selId !== shownId,
          chosen = !userSel && D.posPick && posList.find(x => x.id === D.posPick);
        if (chosen) e.data.pos = chosen;
        if (userSel) {
          D.posPick = "";
          shownId = "";
        }
        posWhy = e.data.pos
          ? ""
          : !e.data.api
            ? "Couldn't read the drawings on this chart."
            : "No Long/Short position on the chart yet.";
        done(e.data.pos || null);
      }
    };
    addEventListener("message", f);
    window.postMessage({ __tj: "pos" }, location.origin);
    setTimeout(() => {
      removeEventListener("message", f);
      posWhy = "Couldn't read the drawings on this chart.";
      done(null);
    }, 800);
  });
const day = t => (t ? new Date(t * 1000).toISOString().slice(0, 10) : "");
const posLab = p => {
  const d = t =>
    t
      ? new Date(t * 1000).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "2-digit",
          timeZone: "UTC",
        })
      : "?";
  return `${p.dir === "long" ? "↑ Long" : "↓ Short"} · ${d(p.t0)}${p.t1 ? " → " + d(p.t1) : ""}`;
};
const showPos = (p, scroll = true) => {
  if (p) shownId = p.id;
  if (p) window.postMessage({ __tj: "posshow", id: p.id, t0: p.t0, t1: p.t1, scroll }, location.origin);
};
const curPos = () => posList.find(x => x.id === D.posId);
const posLine = () => {
  const p = curPos();
  return p
    ? `<div class="posl"><span>Position</span><b>${esc(posLab(p))}</b><button type="button" class="lnk inl" data-act="posshow" title="Highlight it on the chart">Show</button></div>`
    : "";
};
const posSel = () =>
  posList.length
    ? f(
        `Position <button type="button" class="lnk inl" data-act="${editDoc ? "poslist" : "posrefresh"}" title="${editDoc ? "List the positions on the chart (fills nothing)" : "Look for positions on the chart again"}">${editDoc ? "⟳ Find again" : "⟳"}</button>`,
        `<select data-k="posPick">${editDoc && !D.posId ? '<option value="">Choose a position…</option>' : ""}${posList.map(p => `<option value="${esc(p.id)}" ${p.id === D.posId ? "selected" : ""}>${esc(posLab(p))}</option>`).join("")}</select>`
      )
    : "";
// editing a saved trade: pick a Long/Short position on the 4H and Result steps to fill direction, dates, entry, stop and
// target from it. Nothing is read when the edit opens: ⟳ only lists the positions, picking one fills
const editPos = () =>
  !editDoc
    ? ""
    : posList.length
      ? posSel()
      : f(
          "Position",
          `<div class="fb"><button type="button" class="btn" data-act="poslist" title="Fills nothing; pick a position from the list afterwards">Find positions on the chart</button></div><p class="hint">${esc(posWhy || "Draw a Long/Short position on the chart first, then press the button.")}</p>`
        );
// fills empty fields only, unless "force" lists the fields to overwrite
async function fromPos(force = []) {
  const p = await getPos();
  if (!p) return null;
  D.posId = p.id;
  showPos(p, false);
  const set = (k, v) => {
    if (v && (force.includes(k) || !D[k])) D[k] = v;
  };
  set("dir", p.dir);
  set("date", day(p.t0));
  set("closeDate", day(p.t1));
  posEdge = edgesOf(p);
  if (INV()) {
    if (p.entry) set("sEntry", String(p.entry));
    if (p.sl) set("sStop", String(+p.sl.toFixed(4)));
    keep();
    return p;
  }
  // planned entry, stop and target in pips (0.0001; JPY 0.01; gold 0.1)
  if (p.entry) {
    const pr = pairOf(D.pair),
      pip = /JPY/.test(pr) ? 0.01 : /XAU/.test(pr) ? 0.1 : /XAG/.test(pr) ? 0.01 : 0.0001,
      r1 = x => String(Math.round(x * 10) / 10);
    const dec = String(p.entry).split(".")[1];
    set("planEntry", String(+p.entry.toFixed(Math.min(6, Math.max(2, dec ? dec.length : 5)))));
    if (p.sl) set("slPips", r1(Math.abs(p.entry - p.sl) / pip));
    if (p.tp) set("tpPips", r1(Math.abs(p.tp - p.entry) / pip));
  }
  keep();
  return p;
}
// From the step that sets the dates (4H / LTF, or Execution) onwards, re-dragging the position's edges moves the
// dates with them: left edge -> date, right edge -> close date. Checked when a drag on the chart ends (mouse or arrow key released)
// and when the mouse comes back to the panel, so no timer runs; a date you type yourself stays until its edge moves.
let posEdge = { date: "", closeDate: "" }, // each edge's day when we last read the position
  edgeBusy = false;
const edgesOf = p => ({ date: day(p.t0), closeDate: day(p.t1) });
async function edgeCheck() {
  const S = steps(),
    on = step >= S.findIndex(x => x[0] === dateStep());
  // "logging" = a trade is being logged (you're in the steps), so it must be on here
  if (edgeBusy || !on || panel.hidden || !user || view !== "steps" || !logging || settings || !D.posId) return;
  edgeBusy = true;
  try {
    await getPos();
    const p = curPos();
    if (!p) return;
    const now = edgesOf(p);
    let moved = false;
    for (const k of ["date", "closeDate"])
      if (now[k] && now[k] !== posEdge[k] && now[k] !== D[k]) {
        D[k] = now[k];
        moved = true;
      }
    posEdge = { date: now.date || posEdge.date, closeDate: now.closeDate || posEdge.closeDate };
    if (moved) {
      keep();
      render();
    }
  } finally {
    edgeBusy = false;
  }
}
panel.addEventListener("pointerenter", edgeCheck);
// capture phase on window, so the chart can't swallow it; a short wait lets TradingView store the new edge first
addEventListener("pointerup", () => setTimeout(edgeCheck, 250), true);
// arrow keys nudge a selected drawing too
addEventListener("keyup", e => e.key.startsWith("Arrow") && setTimeout(edgeCheck, 250), true);
const replayDate = async () => {
  await ask();
  return dateOf(info.replay);
};

/* ---------- forward to drawing ---------- */
addEventListener("message", e => {
  if (e.source !== window || !e.data) return;
  if (e.data.__tj === "fwdst") {
    if (e.data.done) {
      fwd = null;
      msg = e.data.why || "";
      const tl = e.data.hit && e.data.ti != null && e.data.ti >= 0 && (trig[e.data.ti] || {}).label;
      if (tl) msg = msg.replace(/the (rectangle|line)/, tl);
      if (e.data.back && !e.data.hit) setTf(e.data.back);
    } else fwd = { n: e.data.n };
    render();
  }
  if (e.data.__tj === "sigok") {
    if (e.data.err) msg = e.data.err;
    else if (trig.some(t => t.sig === e.data.sig)) msg = "That style is already in the list.";
    else {
      trig = [
        ...trig,
        {
          sig: e.data.sig,
          name: e.data.name,
          color: e.data.color,
          label: e.data.text || "",
          text: e.data.text || "",
        },
      ];
      saveSet({ trig });
      msg = "";
    }
    render();
  }
});
const onSigs = () =>
  trig
    .map((t, i) => ({ sig: t.sig, text: t.text != null ? t.text : t.label || "", i, on: t.on !== false }))
    .filter(t => t.on);
const fwdBtn = () =>
  fwd
    ? `<div class="fwd"><span>${FF}Forwarding… ${fwd.n || 0} candle${fwd.n === 1 ? "" : "s"}</span><button type="button" class="btn sm" data-act="fwdstop">■ Stop</button></div>`
    : `<button type="button" class="btn sm fwdgo" data-act="fwd">${FF}Forward to drawing</button>`;
