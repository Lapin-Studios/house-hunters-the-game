// Boot.
(function (HH) {
  "use strict";
  const UI = HH.ui;
  function boot() {
    UI.menu.renderTitle();
    UI.show("title");
    // invite links: ?join=CODE
    const m = /[?&]join=([A-Za-z0-9]{5})/.exec(location.search);
    if (m) setTimeout(() => UI.menu.join(m[1].toUpperCase()), 300);
    if (!window.L) console.info("Leaflet not loaded: map view disabled.");
    if (!window.Peer) console.info("PeerJS not loaded: multiplayer disabled.");
  }
  // global error surface (so nothing fails silently)
  window.addEventListener("error", (e) => {
    if (!e.filename || e.filename.indexOf(location.origin) !== 0 && location.protocol !== "file:") return;
    console.error(e.error || e.message);
    try { UI.toast("Something went wrong: " + HH.esc(e.message || "unknown error"), "bad", "⚠️", 6000); } catch (x) { /* ignore */ }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.HH);
