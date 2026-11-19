// Peer-to-peer multiplayer via PeerJS (WebRTC). The host's browser is authoritative.
// Lobby codes map to PeerJS ids, so no game server is needed.
(function (HH) {
  "use strict";
  const PREFIX = "househunters-tg-v1-";
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const PING_MS = 3000, TIMEOUT_MS = 12000;

  const net = {
    role: null, // 'host' | 'client' | null (solo)
    myId: "me",
    code: null,
    peer: null,
    conns: new Map(), // host: peerId -> conn
    hostConn: null, // client: conn to host
    lastSeen: new Map(),
    handlers: [],
    leaveHandlers: [],
    closeHandlers: [],
    timer: null,
  };
  HH.net = net;

  net.available = () => typeof window.Peer === "function";
  net.makeCode = () => { let s = ""; for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; };
  net.normalizeCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/O/g, "0").replace(/I/g, "1").slice(0, 5);

  net.onMessage = (fn) => net.handlers.push(fn);
  net.onLeave = (fn) => net.leaveHandlers.push(fn);
  net.onClosed = (fn) => net.closeHandlers.push(fn);
  function dispatch(msg, from) {
    if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;
    if (msg.t === "ping") { if (net.role === "client") { net.lastSeen.set("host", Date.now()); net.send({ t: "pong" }); } return; }
    if (msg.t === "pong") { net.lastSeen.set(from, Date.now()); return; }
    if (msg.t === "bye") { if (net.role === "host") dropPeer(from); return; }
    net.handlers.forEach((fn) => { try { fn(msg, from); } catch (e) { console.error("handler error", e); } });
  }

  function friendlyError(err) {
    const t = err && err.type;
    if (t === "peer-unavailable") return "No lobby found with that code. Double-check it and make sure the host is still in the lobby.";
    if (t === "network" || t === "server-error" || t === "socket-error" || t === "socket-closed") return "Couldn't reach the matchmaking server. Check your internet connection and try again.";
    if (t === "browser-incompatible") return "Your browser doesn't support peer-to-peer connections. Try Chrome, Edge or Firefox.";
    if (t === "unavailable-id") return "That lobby code is already in use.";
    return "Connection error: " + (err && (err.message || err.type) || "unknown");
  }

  // ---------- host ----------
  net.host = function () {
    return new Promise((resolve, reject) => {
      if (!net.available()) return reject(new Error("Multiplayer library failed to load. Check your internet connection and reload the page."));
      let attempts = 0;
      const tryOpen = () => {
        attempts++;
        const code = net.makeCode();
        const peer = new window.Peer(PREFIX + code, { debug: 1 });
        let opened = false;
        const to = setTimeout(() => { if (!opened) { peer.destroy(); reject(new Error("Timed out reaching the matchmaking server. Check your connection and try again.")); } }, 15000);
        peer.on("open", () => {
          opened = true;
          clearTimeout(to);
          net.peer = peer; net.role = "host"; net.code = code; net.myId = "host";
          startHeartbeat();
          resolve(code);
        });
        peer.on("connection", (conn) => {
          conn.on("open", () => {
            net.conns.set(conn.peer, conn);
            net.lastSeen.set(conn.peer, Date.now());
          });
          conn.on("data", (d) => dispatch(d, conn.peer));
          conn.on("close", () => dropPeer(conn.peer));
          conn.on("error", () => dropPeer(conn.peer));
        });
        peer.on("disconnected", () => { if (!peer.destroyed) setTimeout(() => { try { peer.reconnect(); } catch (e) { /* ignore */ } }, 1500); });
        peer.on("error", (err) => {
          if (!opened) {
            clearTimeout(to);
            peer.destroy();
            if (err.type === "unavailable-id" && attempts < 6) return tryOpen();
            return reject(new Error(friendlyError(err)));
          }
          console.warn("peer error", err);
        });
      };
      tryOpen();
    });
  };

  function dropPeer(id) {
    if (!net.conns.has(id)) return;
    const c = net.conns.get(id);
    net.conns.delete(id);
    net.lastSeen.delete(id);
    try { c.close(); } catch (e) { /* ignore */ }
    net.leaveHandlers.forEach((fn) => fn(id));
  }
  net.kick = function (id, reason) {
    const c = net.conns.get(id);
    if (c) { try { c.send({ t: "kicked", reason: reason || "Removed by host" }); } catch (e) { /* ignore */ } setTimeout(() => dropPeer(id), 300); }
  };

  // ---------- client ----------
  net.join = function (rawCode) {
    return new Promise((resolve, reject) => {
      if (!net.available()) return reject(new Error("Multiplayer library failed to load. Check your internet connection and reload the page."));
      const code = net.normalizeCode(rawCode);
      if (code.length !== 5) return reject(new Error("Lobby codes are 5 characters."));
      const peer = new window.Peer({ debug: 1 });
      let done = false;
      const fail = (msg) => { if (done) return; done = true; clearTimeout(to); try { peer.destroy(); } catch (e) { /* ignore */ } reject(new Error(msg)); };
      const to = setTimeout(() => fail("Couldn't connect to that lobby (timed out). Check the code and your connection."), 16000);
      peer.on("open", () => {
        const conn = peer.connect(PREFIX + code, { reliable: true, serialization: "json" });
        conn.on("open", () => {
          if (done) return;
          done = true;
          clearTimeout(to);
          net.peer = peer; net.role = "client"; net.code = code; net.hostConn = conn; net.myId = peer.id;
          net.lastSeen.set("host", Date.now());
          startHeartbeat();
          resolve(code);
        });
        conn.on("data", (d) => dispatch(d, "host"));
        conn.on("close", () => hostLost("The host closed the lobby."));
        conn.on("error", () => hostLost("Lost connection to the host."));
      });
      peer.on("error", (err) => { if (!done) fail(friendlyError(err)); else console.warn("peer error", err); });
      peer.on("disconnected", () => { if (!peer.destroyed) setTimeout(() => { try { peer.reconnect(); } catch (e) { /* ignore */ } }, 1500); });
    });
  };

  function hostLost(reason) {
    if (net.role !== "client") return;
    const handlers = net.closeHandlers.slice();
    net.close(true);
    handlers.forEach((fn) => fn(reason));
  }

  // ---------- messaging ----------
  // send: client -> host (host/solo: delivered locally)
  net.send = function (msg) {
    if (net.role === "client") {
      if (net.hostConn && net.hostConn.open) { try { net.hostConn.send(msg); } catch (e) { console.warn(e); } }
    } else {
      setTimeout(() => dispatch(msg, net.myId), 0);
    }
  };
  // broadcast: host -> everyone (including itself)
  net.broadcast = function (msg, opts) {
    if (net.role === "host") {
      net.conns.forEach((c) => { if (c.open) { try { c.send(msg); } catch (e) { console.warn(e); } } });
    }
    if (!(opts && opts.skipSelf)) setTimeout(() => dispatch(msg, "host"), 0);
  };
  net.sendTo = function (id, msg) {
    if (id === net.myId || id === "host" && net.role !== "client") return setTimeout(() => dispatch(msg, "host"), 0);
    const c = net.conns.get(id);
    if (c && c.open) { try { c.send(msg); } catch (e) { console.warn(e); } }
  };

  function startHeartbeat() {
    clearInterval(net.timer);
    net.timer = setInterval(() => {
      const now = Date.now();
      if (net.role === "host") {
        net.conns.forEach((c, id) => {
          if (c.open) { try { c.send({ t: "ping" }); } catch (e) { /* ignore */ } }
          if (now - (net.lastSeen.get(id) || now) > TIMEOUT_MS) dropPeer(id);
        });
      } else if (net.role === "client") {
        if (now - (net.lastSeen.get("host") || now) > TIMEOUT_MS) hostLost("Lost connection to the host.");
      }
    }, PING_MS);
  }

  net.close = function (silent) {
    clearInterval(net.timer);
    if (net.role === "host" && !silent) net.conns.forEach((c) => { try { c.send({ t: "end", reason: "The host closed the lobby." }); } catch (e) { /* ignore */ } });
    if (net.role === "client" && net.hostConn && net.hostConn.open) { try { net.hostConn.send({ t: "bye" }); } catch (e) { /* ignore */ } }
    const peer = net.peer;
    const conns = Array.from(net.conns.values());
    if (net.hostConn) conns.push(net.hostConn);
    net.conns.clear();
    setTimeout(() => {
      conns.forEach((c) => { try { c.close(); } catch (e) { /* ignore */ } });
      try { if (peer) peer.destroy(); } catch (e) { /* ignore */ }
    }, 250);
    net.role = null; net.peer = null; net.hostConn = null; net.code = null; net.myId = "me";
    net.lastSeen.clear();
  };

  window.addEventListener("beforeunload", () => { if (net.role) net.close(); });
})(window.HH);
