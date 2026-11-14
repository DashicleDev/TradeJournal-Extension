/*
 * bg.js — background service worker. Handles sign-in (Supabase Auth), all database calls
 * (projects, accounts, saving trades, settings) and fetching the journal's plan.json.
 * The panel never talks to the network itself; it sends a message here (see `call` in panel/core.js).
 */
importScripts("config.js");

const H = tok => ({
  apikey: TJ.anonKey,
  "Content-Type": "application/json",
  ...(tok ? { Authorization: "Bearer " + tok } : {}),
});
const get = k => chrome.storage.local.get(k).then(o => o[k]);
const set = o => chrome.storage.local.set(o);

async function authCall(grant, body) {
  const r = await fetch(`${TJ.url}/auth/v1/token?grant_type=${grant}`, {
    method: "POST",
    headers: H(),
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok)
    throw Object.assign(new Error(j.error_description || j.msg || j.message || "Sign-in failed (" + r.status + ")"), {
      status: r.status,
    });
  const s = {
    access: j.access_token,
    refresh: j.refresh_token,
    exp: Date.now() + (j.expires_in || 3600) * 1000,
    uid: j.user && j.user.id,
    email: j.user && j.user.email,
  };
  await set({ session: s });
  return s;
}

async function session() {
  let s = await get("session");
  if (!s) return null;
  if (Date.now() > s.exp - 60000) {
    try {
      s = await authCall("refresh_token", { refresh_token: s.refresh });
    } catch (e) {
      // only sign out when the server rejected the login; offline, keep it and try again next time
      if (e.status === 400 || e.status === 401) {
        await chrome.storage.local.remove("session");
        return null;
      }
    }
  }
  return s;
}

async function rest(path, opt = {}) {
  const s = await session();
  if (!s) throw new Error("Not signed in");
  const r = await fetch(`${TJ.url}/rest/v1/${path}`, { ...opt, headers: { ...H(s.access), ...(opt.headers || {}) } });
  const txt = await r.text();
  if (!r.ok) {
    let m = txt;
    try {
      const j = JSON.parse(txt);
      m = j.message || j.hint || txt;
    } catch {}
    throw new Error(m || "Request failed (" + r.status + ")");
  }
  return txt ? JSON.parse(txt) : null;
}

async function plan() {
  try {
    const r = await fetch(TJ.planUrl, { cache: "no-cache" });
    if (r.ok) {
      const j = await r.json();
      await set({ plan: j });
      return j;
    }
  } catch {}
  return (await get("plan")) || null; // last known copy; the content script falls back to its built-in one
}

const handlers = {
  async status() {
    const s = await session();
    return s ? { email: s.email, uid: s.uid } : null;
  },
  async login({ email, password }) {
    const s = await authCall("password", { email, password });
    return { email: s.email, uid: s.uid };
  },
  async logout() {
    await chrome.storage.local.remove("session");
    return true;
  },
  plan,
  async projects() {
    const rows = await rest("docs?select=id,data&data->>kind=eq.project");
    return rows
      .map(r => ({ ...r.data, id: r.id }))
      .filter(p => !p.demo)
      .sort((a, b) => (a.status === "closed") - (b.status === "closed") || (b.created || 0) - (a.created || 0));
  },
  async accounts() {
    const rows = await rest("docs?select=id,data&data->>kind=eq.account");
    const st = a => a.status || (a.archived ? "closed" : "active");
    return rows
      .map(r => ({ ...r.data, id: r.id }))
      .sort(
        (a, b) =>
          (st(a) === "active" ? 0 : 1) - (st(b) === "active" ? 0 : 1) || String(a.name).localeCompare(String(b.name))
      );
  },
  // your role's features (e.g. { grade: true }), as the journal reads them
  async features() {
    const s = await session();
    if (!s) return {};
    const m = await rest("app_members?select=role&user_id=eq." + s.uid);
    const role = (m[0] && m[0].role) || "user";
    let r = await rest("app_roles?select=features&key=eq." + encodeURIComponent(role));
    if (!r.length && role !== "user") r = await rest("app_roles?select=features&key=eq.user");
    return (r[0] && r[0].features) || {};
  },
  async jsettings() {
    const rows = await rest("docs?select=data&id=eq.settings");
    return (rows[0] && rows[0].data) || null;
  },
  // the extension's own settings, as one document in your journal data (the journal ignores this kind)
  async extLoad() {
    const rows = await rest("docs?select=data&id=eq.extsettings");
    return (rows[0] && rows[0].data) || null;
  },
  async extSave({ data }) {
    const s = await session();
    if (!s) throw new Error("Not signed in");
    await rest("docs", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([
        {
          user_id: s.uid,
          id: "extsettings",
          data: { ...data, id: "extsettings", kind: "extsettings", updated: Date.now() },
          updated_at: new Date().toISOString(),
        },
      ]),
    });
    return true;
  },
  async save({ doc }) {
    const s = await session();
    if (!s) throw new Error("Not signed in");
    await rest("docs", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ user_id: s.uid, id: doc.id, data: doc, updated_at: new Date().toISOString() }]),
    });
    return true;
  },
  // The panel in a Replay window says so, to tell the journal when that window closes.
  async replayWin(msg, sender) {
    if (sender.tab) await set({ replayWin: sender.tab.windowId });
  },
  // A trade the journal's Replay window asked to open (#tj-trade=<id> in the chart address), for the panel to edit.
  async openTrade({ id }) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id || "")) return null;
    const rows = await rest("docs?select=data&id=eq." + encodeURIComponent(id));
    const d = rows[0] && rows[0].data;
    return d && !d.deletedAt ? d : null; // a trade in the journal's bin is not opened
  },
};

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === "reload") {
    set({ reloadTab: sender.tab && sender.tab.id }).then(() => chrome.runtime.reload());
    return false;
  }
  const h = handlers[msg && msg.type];
  if (!h) return false;
  h(msg, sender).then(
    v => reply({ ok: true, v }),
    e => reply({ ok: false, error: String((e && e.message) || e) })
  );
  return true;
});

// The Replay window closed: the journal tab unlocks.
chrome.windows.onRemoved.addListener(async id => {
  if ((await get("replayWin")) !== id) return;
  await chrome.storage.local.remove("replayWin");
  for (const t of await chrome.tabs.query({ url: "https://dashicledev.github.io/TradeJournal/*" }))
    chrome.tabs.sendMessage(t.id, { type: "replayClosed" }).catch(() => {});
});

chrome.action.onClicked.addListener(tab => {
  if (tab && tab.id)
    chrome.tabs.sendMessage(tab.id, { type: "toggle" }).catch(() => {
      chrome.tabs.create({ url: "https://www.tradingview.com/chart/" });
    });
});

// After a reload, refresh the TradingView tab that asked for it so it runs the new version.
chrome.runtime.onInstalled.addListener(async () => {
  const id = await get("reloadTab");
  if (id) {
    await chrome.storage.local.remove("reloadTab");
    chrome.tabs.reload(id).catch(() => {});
  }
});
