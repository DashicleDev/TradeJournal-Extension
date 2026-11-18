/*
 * panel/shell.js — The panel itself: the TJ button, the shadow-root panel, dragging, plus reading the chart
 * (symbol, timeframe, replay date) and taking chart snapshots.
 */
/* ---------- shell ---------- */
const host = document.createElement("div");
host.id = "tj-panel-host";
host.style.cssText = "position:fixed;z-index:2147483000;top:72px;right:16px;";
const root = host.attachShadow({ mode: "open" });
root.innerHTML = `<style>${CSS()}</style><button class="pill" title="Trade Journal (drag to move)"><img src="${chrome.runtime.getURL("icons/icon-128.png")}" alt="Trade Journal" draggable="false"></button><section class="panel" hidden></section><div class="toast" role="status" aria-live="polite" hidden></div>`;
const panel = root.querySelector(".panel"),
  pill = root.querySelector(".pill"),
  toast = root.querySelector(".toast");
document.documentElement.appendChild(host);
// the journal's font (Archivo), shipped with the extension, so the page's rules can't block it
fetch(chrome.runtime.getURL("fonts/archivo.woff2"))
  .then(r => r.arrayBuffer())
  .then(buf => {
    const ff = new FontFace("TJ Archivo", buf, { weight: "100 900", stretch: "62% 125%" });
    return ff.load().then(() => document.fonts.add(ff));
  })
  .catch(() => {});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applyLook());

// the logo button: click opens the panel, drag moves it (position is remembered)
let pd = null;
pill.addEventListener("pointerdown", e => {
  const r = pill.getBoundingClientRect();
  pd = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
  pill.setPointerCapture(e.pointerId);
  e.preventDefault();
});
pill.addEventListener("pointermove", e => {
  if (!pd) return;
  if (Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 4) pd.moved = true;
  if (!pd.moved) return;
  const x = Math.max(4, Math.min(innerWidth - 48, e.clientX - pd.dx)),
    y = Math.max(4, Math.min(innerHeight - 48, e.clientY - pd.dy));
  Object.assign(pill.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" });
});
pill.addEventListener("pointerup", () => {
  if (!pd) return;
  const m = pd.moved;
  pd = null;
  if (m) store({ pillPos: { left: pill.style.left, top: pill.style.top } });
  else toggle(true);
});
chrome.storage.local.get("pillPos").then(o => {
  if (o.pillPos && o.pillPos.left)
    Object.assign(pill.style, { left: o.pillPos.left, top: o.pillPos.top, right: "auto", bottom: "auto" });
});
chrome.runtime.onMessage.addListener(m => {
  if (m && m.type === "toggle") toggle(!open);
});
// the journal's "Load in extension": open that trade here for editing, on the layout you have open (an unsaved new trade asks first)
chrome.runtime.onMessage.addListener((m, s, reply) => {
  if (!m || m.type !== "loadTrade") return false;
  if (user) call("openTrade", { id: m.id }).then(t => t && requestOpen(t, "h4")).catch(() => {});
  reply(!!user);
  return false;
});
function toggle(v) {
  open = v;
  store({ open });
  panel.hidden = !open;
  pill.hidden = open;
  if (open) render();
}

// drag by header
let drag = null;
root.addEventListener("pointerdown", e => {
  const h = e.target.closest(".head");
  if (!h || e.target.closest("button")) return;
  const r = host.getBoundingClientRect();
  drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
  h.setPointerCapture(e.pointerId);
});
root.addEventListener("pointermove", e => {
  if (!drag) return;
  const x = Math.max(0, Math.min(innerWidth - 80, e.clientX - drag.dx)),
    y = Math.max(0, Math.min(innerHeight - 40, e.clientY - drag.dy));
  Object.assign(host.style, { left: x + "px", top: y + "px", right: "auto" });
});
root.addEventListener("pointerup", () => {
  if (drag) {
    drag = null;
    store({ pos: { left: host.style.left, top: host.style.top } });
  }
});
const fit = () => {
  panel.style.maxHeight = Math.max(260, innerHeight - host.getBoundingClientRect().top - 12) + "px";
};
addEventListener("resize", fit);
root.addEventListener("pointerup", fit);

/* ---------- page info (symbol, interval, replay date) ---------- */
let info = {};
const ask = () =>
  new Promise(res => {
    const f = e => {
      if (e.source === window && e.data && e.data.__tj === "info") {
        removeEventListener("message", f);
        info = e.data;
        res(info);
      }
    };
    addEventListener("message", f);
    window.postMessage({ __tj: "ask" }, location.origin);
    setTimeout(() => {
      removeEventListener("message", f);
      res(info);
    }, 400);
  });
const pairOf = s =>
  String(s || "")
    .split(":")
    .pop()
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
const slotOf = iv => {
  const v = String(iv || "")
    .trim()
    .toLowerCase()
    .replace(/\s/g, "");
  if (INV()) {
    if (/^12m/.test(v)) return "m12";
    if (/^6m/.test(v)) return "m6";
    if (/^3m/.test(v)) return "m3";
    if (/^(1?m|1month)$/.test(v)) return "mo";
    if (/^(1?w|1week|week)$/.test(v)) return "wk";
    return null;
  }
  if (/^(1?w|1week|week)$/.test(v)) return "weekly";
  if (/^(1?d|1day|day)$/.test(v)) return "daily";
  if (/^(4h|240)$/.test(v)) return "h4";
  if (/^(1h|2h|60|120)$/.test(v)) return "ltf";
  return null;
};
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const dateOf = t => {
  if (!t) return "";
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return m[0];
  m = /(\d{1,2})\s([A-Za-z]{3})\w*\s'?(\d{2,4})/.exec(t);
  if (m && MON[m[2].toLowerCase()]) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${String(MON[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
};

/* ---------- snapshots ---------- */
const seen = new Set();
addEventListener("message", async e => {
  if (e.source !== window || !e.data || e.data.__tj !== "snap") return;
  // the same snapshot is often reported twice (network + clipboard): handle it once
  if (seen.has(e.data.id)) return;
  seen.add(e.data.id);
  let slot = armed;
  if (!slot) {
    await ask();
    slot = slotOf(info.interval);
  }
  if (!slot) {
    msg = `Snapshot caught, but which timeframe? Press Continue on a weekly, daily or 4H step, then take it again.`;
    return render();
  }
  D.links[slot] = "https://www.tradingview.com/x/" + e.data.id + "/";
  armed = null;
  clearTimeout(armTimer);
  msg = `${SLOTS.find(s => s[0] === slot)[1]} chart saved.`;
  keep();
  if (snapWait && snapWait.slot === slot) {
    const w = snapWait;
    snapWait = null;
    w.done(true);
    return;
  }
  render();
});
function trySnapshot() {
  // TradingView's own shortcut for "Copy link to the chart image". If it doesn't fire,
  // the user presses it (or camera → Copy link) and the hook still catches the link.
  const ev = t =>
    new KeyboardEvent(t, {
      key: "s",
      code: "KeyS",
      keyCode: 83,
      which: 83,
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
  const tgt = document.querySelector(".chart-container, .chart-gui-wrapper, canvas") || document.body;
  try {
    tgt.dispatchEvent(ev("keydown"));
    tgt.dispatchEvent(ev("keyup"));
  } catch {}
}
function arm(slot) {
  armed = armed === slot ? null : slot;
  clearTimeout(armTimer);
  if (armed) {
    msg = `Switch TradingView to ${SLOTS.find(s => s[0] === slot)[1]} if needed. Taking the snapshot…`;
    trySnapshot();
    armTimer = setTimeout(() => {
      if (armed === slot) {
        msg = `Press Alt+S on the chart (or camera → Copy link). It goes to ${SLOTS.find(s => s[0] === slot)[1]}.`;
        render();
      }
    }, 3500);
  } else msg = "";
  render();
}

/* ---------- candle-close notices in bar replay (hook.js reports each close) ---------- */
let toastT;
function showClose(m, test) {
  const w = m.w && closes.w,
    d = m.d && closes.d;
  if (!w && !d && !test) return;
  const when = new Date(m.t * 1000).toLocaleDateString(undefined, {
    timeZone: "America/New_York",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const btns = closes.tf
    ? `<span class="tbtn">${m.d ? `<button type="button" data-totf="D">Open Daily</button>` : ""}${w ? `<button type="button" data-totf="W">Open Weekly</button>` : ""}</span>`
    : "";
  toast.innerHTML = `<b>${w ? "Weekly candle closed" : "Daily candle closed"}</b><small>${esc(when)} · 17:00 New York</small>${btns}${closes.dur ? "" : `<em>Click to close</em>`}`;
  toast.className = `toast ${closes.size === "sm" ? "sm" : "lg"} p-${closes.pos || "mid"}${w ? " wk" : ""}`;
  toast.hidden = false;
  clearTimeout(toastT);
  if (closes.dur) toastT = setTimeout(() => (toast.hidden = true), closes.dur * 1000);
  if (closes.sound) chime(w);
  if (closes.pause && !test) window.postMessage({ __tj: "pause" }, location.origin);
}
window.addEventListener("message", e => {
  if (e.source === window && e.data && e.data.__tj === "close") showClose(e.data);
});
toast.addEventListener("click", e => {
  const b = e.target.closest("[data-totf]");
  toast.hidden = true;
  clearTimeout(toastT);
  if (b) setTf(b.dataset.totf);
});
// a short two-note chime (three notes for the weekly close), made in the browser, no sound files
function chime(w) {
  try {
    const ac = new AudioContext(),
      notes = w ? [660, 880, 1100] : [660, 880];
    notes.forEach((f, i) => {
      const o = ac.createOscillator(),
        g = ac.createGain(),
        t = ac.currentTime + i * 0.16;
      o.frequency.value = f;
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.32);
    });
    setTimeout(() => ac.close(), 1200);
  } catch {}
}

// On the start screen, follow the chart: pick Forex or Invest from the symbol's type (when that's on and no trade is
// in progress).
const STOCKY = ["stock", "fund", "dr", "etf", "structured"];
let autoSym = "";
async function followChart() {
  if (panel.hidden || !user || view !== "steps" || logging || settings) return;
  if (!autoMkt) return;
  await ask();
  let changed = false;
  if (autoMkt && info.symbol && info.symbol !== autoSym && info.type) {
    autoSym = info.symbol;
    const want = STOCKY.includes(info.type) ? "stocks" : "fx",
      draft =
        (INV() ? D.sPhase || D.s12Ms || D.s6Ms : D.dir || D.fase || D.concept || D.entry4h) ||
        Object.keys(D.links).length;
    if (want !== mkt && !draft) {
      mkt = want;
      D = { ...blank(), account: "", project: "" };
      step = 0;
      store({ mkt, step, draft: D });
      changed = true;
    }
  }
  if (changed) render();
}
setInterval(followChart, 1500);
