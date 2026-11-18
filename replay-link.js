/*
 * replay-link.js — runs on the journal. Tells the page when the Replay window (opened by the journal, see bg.js "replayWin")
 * was closed, so the journal can unlock. The journal can't see that itself: TradingView cuts the link to a window it opens.
 */
// the journal's "Load in extension": hand the trade to a chart tab that is already open, and say whether one took it
addEventListener("message", e => {
  const m = e.source === window && e.data && e.data.tjLoad;
  if (!m || !/^[A-Za-z0-9_-]{1,40}$/.test(m.id || "")) return;
  chrome.runtime.sendMessage({ type: "loadTrade", id: m.id }, r =>
    postMessage({ tjLoaded: !chrome.runtime.lastError && !!(r && r.ok && r.v) }, location.origin)
  );
});
chrome.runtime.onMessage.addListener(m => {
  if (m && m.type === "replayClosed") postMessage({ tjReplay: "closed" }, location.origin);
});
