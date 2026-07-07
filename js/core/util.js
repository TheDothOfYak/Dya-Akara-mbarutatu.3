/* ============================================================
   DYA'AKARA — core/util.js
   Namespace, deterministic seeded RNG, general helpers.
   Everything in the game hangs off window.DYA.
   ============================================================ */
(function () {
  'use strict';
  window.DYA = window.DYA || {};
  const U = {};

  /* ---------- Deterministic RNG (mulberry32) ----------
     The match engine may ONLY use an Rng instance seeded from the
     match seed — never Math.random — so replays are exact. */
  U.Rng = function Rng(seed) {
    let a = seed >>> 0;
    if (a === 0) a = 0x9e3779b9;
    this.next = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.range = (min, max) => min + this.next() * (max - min);
    this.int = (min, max) => Math.floor(this.range(min, max + 1)); // inclusive
    this.pick = (arr) => arr[Math.floor(this.next() * arr.length)];
    this.chance = (p) => this.next() < p;
    this.shuffle = (arr) => {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    };
    this.gauss = (mean, sd) => {
      // Box-Muller, deterministic
      const u1 = Math.max(this.next(), 1e-9), u2 = this.next();
      return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
  };

  U.hashStr = function (s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  U.newSeed = () => (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;

  /* ---------- ids ---------- */
  let idCounter = 0;
  U.uid = (prefix) => (prefix || 'id') + '_' + Date.now().toString(36) + '_' + (idCounter++).toString(36) + '_' + Math.floor(Math.random() * 46656).toString(36);

  /* ---------- math ---------- */
  U.clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

  /* ---------- formatting ---------- */
  U.fmt = (n) => {
    n = Math.floor(n);
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + 'k';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  U.fmtTime = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  };
  U.fmtClock = (ms) => {
    const d = new Date(ms);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  U.fmtDur = (ms) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
    return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  };
  U.esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  U.deepCopy = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- DOM helpers ---------- */
  U.el = function (tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'cls') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'style') e.style.cssText = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (children) children.forEach(c => { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  };
  U.qs = (sel, root) => (root || document).querySelector(sel);
  U.qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- misc ---------- */
  U.profanityOk = function (name) {
    const bad = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'dick', 'cock', 'ass\b', 'rape'];
    const low = name.toLowerCase();
    return !bad.some(w => new RegExp(w).test(low));
  };

  U.timeAgo = function (ms) {
    const d = Date.now() - ms;
    if (d < 60000) return 'just now';
    if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
    if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
    return Math.floor(d / 86400000) + 'd ago';
  };

  /* The Nurtui — one in-world day = 5 real hours (design doc) */
  U.NURTUI_MS = 5 * 60 * 60 * 1000;

  DYA.util = U;
})();
