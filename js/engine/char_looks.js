/* ============================================================
   DYA'AKARA — engine/char_looks.js
   Plug-in slots for how creatures and people are drawn —
   everywhere: on the field, on cards, in the Vakarborac.

   Every character improvement lives in its OWN file in
   js/engine/looks/ and registers itself here. To remove one:
     1. delete its file from js/engine/looks/
     2. delete its <script> line from index.html
   A species redesign that is removed falls back to the original
   drawing. Each one can also be switched off per player in
   Settings → Display → Character looks.

   Display-only: looks never touch the simulation.
   An admin-uploaded sprite image always wins over any redesign.

   A look may provide any of:
     species: ['id', ...] or (sp) => bool, with
     draw(ctx, o, t, state)        replaces the body drawing for those species
     pose(ctx, o, t, state)        adjusts the transform before the body is drawn
     finish(lctx, o, t, state, px) a finishing pass on the body's own layer:
                                   lctx is in device pixels (identity transform),
                                   px = device pixels per local unit. Use
                                   'source-atop' to paint only on the body.
     under(ctx, o, t, state, layer, px)
                                   draws behind the body layer, in device pixels
                                   centred on the body
     wants(o, t, state)            optional: return false when a finish/under
                                   pass has nothing to do this frame, so the
                                   body is drawn directly (much cheaper)
   ============================================================ */
(function () {
  'use strict';
  const CL = { list: [] };

  CL.register = function (def) {
    if (!def || !def.id) return;
    CL.list = CL.list.filter(d => d.id !== def.id).concat([def]);
  };

  function dset() {
    const me = DYA.state && DYA.state.me;
    return (me && me.settings && me.settings.display) || {};
  }
  CL.enabled = function (def) {
    const d = dset();
    if (d.charLooks && d.charLooks[def.id] === false) return false;
    if (def.heavy && d.quality === 'low') return false;
    return true;
  };
  function matches(def, sp) {
    if (!def.species) return true;
    return typeof def.species === 'function' ? !!def.species(sp) : def.species.indexOf(sp.id) >= 0;
  }

  /* one shared layer canvas (drawing is synchronous, so reuse is safe) */
  let layer = null, lctx = null, depth = 0;
  /* body shapes that reach further than ~2.3 radii from their centre */
  const WIDE = { lutut: 3.4, hvaleia: 3.2, tree: 3, quad: 2.9, bird: 2.8, mcfly: 2.6, flame: 2.8 };
  const MAX_PX = 640;

  function safe(def, fn) {
    try { fn(); }
    catch (e) { def._broken = true; if (window.console) console.warn('[char look] ' + def.id + ' switched off:', e); }
  }

  CL.body = function (ctx, o, t, state, drawOriginal) {
    const sp = o.sp;
    const active = CL.list.filter(d => !d._broken && CL.enabled(d) && (!d.species || matches(d, sp)));
    /* which body to draw: a species redesign, unless the admin uploaded art */
    const redesign = sp.spriteImg ? null : active.find(d => d.draw && d.species);
    const drawBodyRaw = (c) => {
      for (const d of active) if (d.pose) safe(d, () => d.pose(c, o, t, state));
      if (redesign) {
        let ok = true;
        safe(redesign, () => { redesign.draw(c, o, t, state); });
        if (redesign._broken) ok = false;
        if (!ok) drawOriginal(c);
        else if (o.indiv && state !== 'death' && DYA.sprites.drawMarking && redesign.markings) DYA.sprites.drawMarking(c, o, o.indiv);
      } else drawOriginal(c);
    };

    const finishers = active.filter(d => (d.finish || d.under) && (!d.wants || d.wants(o, t, state)));
    const m = ctx.getTransform ? ctx.getTransform() : null;
    const px = m ? Math.hypot(m.a, m.b) : 1;
    const E = o.r * (WIDE[sp.rig] || 2.3);            // half-extent of the layer, local units
    const P = Math.ceil(2 * E * px);
    /* small icons, nested draws, or nothing to finish: draw directly */
    if (!finishers.length || !m || depth > 0 || P < 14 || P > MAX_PX || typeof document === 'undefined') {
      ctx.save(); drawBodyRaw(ctx); ctx.restore();
      return;
    }
    if (!layer) { layer = document.createElement('canvas'); lctx = layer.getContext('2d'); }
    if (layer.width < P || layer.height < P) { layer.width = Math.max(P, layer.width); layer.height = Math.max(P, layer.height); }
    depth++;
    try {
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1;
      lctx.clearRect(0, 0, P, P);
      /* same rotation/scale/flip as the real canvas, origin at the layer centre */
      lctx.setTransform(m.a, m.b, m.c, m.d, P / 2, P / 2);
      lctx.save(); drawBodyRaw(lctx); lctx.restore();
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const d of finishers) if (d.finish) {
        lctx.save(); safe(d, () => d.finish(lctx, o, t, state, px, P)); lctx.restore();
        lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1;
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, m.e, m.f);
      for (const d of finishers) if (d.under) { ctx.save(); safe(d, () => d.under(ctx, o, t, state, layer, px, P)); ctx.restore(); }
      ctx.drawImage(layer, 0, 0, P, P, -P / 2, -P / 2, P, P);
      ctx.restore();
    } finally { depth--; }
  };

  /* ---- shared helper: a weapon that floats beside its bearer ----
     The creator draws the Eikar without hands — their weapons and
     tools simply float. Used by the Eikar and Keilia redesigns.
     (x, y) is where the weapon hovers; s = size unit; swing 0..1. */
  const TAU = Math.PI * 2;
  function shadeOf(hex, amt) { return DYA.sprites && DYA.sprites.shade ? DYA.sprites.shade(hex, amt) : hex; }
  CL.drawFloatingWeapon = function (ctx, weapon, x, y, s, t, state) {
    const atk = state === 'attack' || state === 'special';
    const hover = Math.sin(t * 2.6) * s * 0.06;
    ctx.save();
    ctx.translate(x, y + hover);
    /* faint lift-glow under the floating weapon */
    const gl = ctx.createRadialGradient(0, s * 0.55, 0, 0, s * 0.55, s * 0.5);
    gl.addColorStop(0, 'rgba(255,236,190,0.22)'); gl.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(0, s * 0.55, s * 0.5, s * 0.16, 0, 0, TAU); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (weapon === 'sword') {                      /* tuun */
      ctx.rotate(atk ? -1.2 + Math.max(0, Math.sin(t * 14)) * 2.1 : -0.35 + Math.sin(t * 1.8) * 0.05);
      const bg = ctx.createLinearGradient(-s * 0.08, 0, s * 0.08, 0);
      bg.addColorStop(0, '#9aa0ab'); bg.addColorStop(0.5, '#f1f3f7'); bg.addColorStop(1, '#8a909b');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(-s * 0.07, -s * 0.2); ctx.lineTo(0, -s * 1.25); ctx.lineTo(s * 0.07, -s * 0.2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b8903e'; ctx.lineWidth = Math.max(1.5, s * 0.08);
      ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.2); ctx.lineTo(s * 0.2, -s * 0.2); ctx.stroke();
      ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = Math.max(1.5, s * 0.09);
      ctx.beginPath(); ctx.moveTo(0, -s * 0.2); ctx.lineTo(0, s * 0.08); ctx.stroke();
      ctx.fillStyle = '#d9b87a'; ctx.beginPath(); ctx.arc(0, s * 0.12, s * 0.05, 0, TAU); ctx.fill();
    } else if (weapon === 'spear') {               /* the Hanii */
      ctx.rotate(atk ? 1.25 + Math.max(0, Math.sin(t * 12)) * 0.15 : 0.12 + Math.sin(t * 1.7) * 0.04);
      const thrust = atk ? Math.max(0, Math.sin(t * 12)) * s * 0.35 : 0;
      ctx.translate(0, -thrust);
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = Math.max(1.5, s * 0.07);
      ctx.beginPath(); ctx.moveTo(0, s * 0.7); ctx.lineTo(0, -s * 1.3); ctx.stroke();
      ctx.strokeStyle = '#d9b87a'; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); ctx.moveTo(0, -s * 1.12); ctx.lineTo(0, -s * 1.22); ctx.stroke();
      ctx.fillStyle = '#e4e7ec';
      ctx.beginPath(); ctx.moveTo(-s * 0.11, -s * 1.28); ctx.lineTo(0, -s * 1.7); ctx.lineTo(s * 0.11, -s * 1.28); ctx.closePath(); ctx.fill();
    } else if (weapon === 'bow') {                 /* saka and akalay */
      const pull = atk ? 0.5 + 0.5 * Math.sin(t * 10) : 0.12;
      ctx.rotate(0.1 + Math.sin(t * 1.6) * 0.04);
      ctx.strokeStyle = '#6d4a2e'; ctx.lineWidth = Math.max(1.8, s * 0.08);
      ctx.beginPath(); ctx.arc(-s * 0.1, 0, s * 0.8, -1.2, 1.2); ctx.stroke();
      const bx = -s * 0.1 + Math.cos(1.2) * s * 0.8, by = Math.sin(1.2) * s * 0.8;
      ctx.strokeStyle = '#efe8d6'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, -by); ctx.lineTo(-pull * s * 0.55, 0); ctx.lineTo(bx, by); ctx.stroke();
      if (atk) {
        ctx.strokeStyle = '#a8845a'; ctx.lineWidth = Math.max(1, s * 0.04);
        ctx.beginPath(); ctx.moveTo(-pull * s * 0.55, 0); ctx.lineTo(s * 0.85, 0); ctx.stroke();
        ctx.fillStyle = '#d6d9df'; ctx.beginPath(); ctx.moveTo(s * 0.85, -s * 0.07); ctx.lineTo(s * 1.02, 0); ctx.lineTo(s * 0.85, s * 0.07); ctx.fill();
      }
    } else if (weapon === 'flask') {               /* a Chemist's vials */
      const wob = Math.sin(t * 3.2) * 0.2 + (atk ? Math.sin(t * 16) * 0.4 : 0);
      [[0, 0, 1, '#9be07a'], [-s * 0.42, -s * 0.35, 0.65, '#c48ae8']].forEach(([fx, fy, k, liquid], i) => {
        ctx.save(); ctx.translate(fx, fy + Math.sin(t * 2.2 + i * 2) * s * 0.06); ctx.rotate(wob * (i ? -1 : 1));
        const w = s * 0.3 * k;
        ctx.fillStyle = 'rgba(220,240,255,0.35)'; ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = Math.max(1, s * 0.035);
        ctx.beginPath(); ctx.moveTo(-w * 0.3, -w * 1.2); ctx.lineTo(-w * 0.3, -w * 0.5); ctx.lineTo(-w, w * 0.6);
        ctx.quadraticCurveTo(0, w * 1.05, w, w * 0.6); ctx.lineTo(w * 0.3, -w * 0.5); ctx.lineTo(w * 0.3, -w * 1.2); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = liquid;
        ctx.beginPath(); ctx.moveTo(-w * 0.72, w * 0.25); ctx.lineTo(-w * 0.95, w * 0.6); ctx.quadraticCurveTo(0, w * 1.0, w * 0.95, w * 0.6); ctx.lineTo(w * 0.72, w * 0.25); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#6d4a2e'; ctx.fillRect(-w * 0.34, -w * 1.4, w * 0.68, w * 0.26);
        ctx.restore();
      });
    } else if (weapon === 'hammer') {              /* a Kalo-made builder's hammer */
      ctx.rotate(atk ? -1.3 + Math.max(0, Math.sin(t * 11)) * 1.9 : -0.25 + Math.sin(t * 1.5) * 0.05);
      ctx.strokeStyle = '#6d4a2e'; ctx.lineWidth = Math.max(2, s * 0.1);
      ctx.beginPath(); ctx.moveTo(0, s * 0.35); ctx.lineTo(0, -s * 0.85); ctx.stroke();
      const hg = ctx.createLinearGradient(0, -s * 1.15, 0, -s * 0.8);
      hg.addColorStop(0, '#c9cdd6'); hg.addColorStop(1, '#6f7580');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.rect(-s * 0.32, -s * 1.12, s * 0.64, s * 0.3); ctx.fill();
      ctx.strokeStyle = '#68e0e8aa'; ctx.lineWidth = Math.max(1, s * 0.03);     /* the Kalo's Stygian inlay */
      ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.97); ctx.lineTo(s * 0.2, -s * 0.97); ctx.stroke();
    }
    ctx.restore();
  };
  CL.shade = shadeOf;

  DYA.charLooks = CL;
})();
