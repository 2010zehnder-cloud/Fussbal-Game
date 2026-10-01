'use strict';

// Spielstände, Schwierigkeit, Teilen, Erfolge, Sound, Konfetti, Diagramm und Design

// ---------- Mehrere Spielstände ----------
const SLOT_COUNT = 3;
const slotKey = n => `fussballkarriere-slot-${n}`;
let pendingSlot = 1;
let slotConfirm = null;

function readSlot(n) {
  try {
    // Alten Einzelspielstand einmalig in Slot 1 übernehmen
    if (n === 1 && !localStorage.getItem(slotKey(1))) {
      const old = localStorage.getItem('fussballkarriere-save-v2');
      if (old) { localStorage.setItem(slotKey(1), old); localStorage.removeItem('fussballkarriere-save-v2'); }
    }
    const r = localStorage.getItem(slotKey(n));
    return r ? JSON.parse(r) : null;
  } catch (e) { return null; }
}
function writeSlot(n, data) { try { localStorage.setItem(slotKey(n), JSON.stringify(data)); } catch (e) { /* ignorieren */ } }
function clearSlot(n) { try { localStorage.removeItem(slotKey(n)); } catch (e) { /* ignorieren */ } }

function renderSlots() {
  const rows = [];
  for (let n = 1; n <= SLOT_COUNT; n++) {
    const d = readSlot(n);
    let info = '<span class="muted">Leer</span>';
    if (d && d.player) {
      const what = d.phase === 'retired' ? 'Karriere beendet' : d.phase && d.phase.startsWith('coach') ? 'Trainer' : d.phase === 'owner' ? 'Präsident' : (d.clubId || 'Akademie');
      info = `<strong>${esc(d.player.name)}</strong><small>${d.player.age} Jahre · ${esc(what)} · Stärke ${Math.round(d.peak || d.player.rating)}${d.gen > 1 ? ` · Gen. ${d.gen}` : ''}</small>`;
    }
    const confirm = slotConfirm === n;
    rows.push(`<div class="slot">
      <div class="slotnum">${n}</div>
      <div class="offer-info">${info}</div>
      <div class="shopbtns">
        ${d && d.player && d.phase !== 'create' ? btn('Weiter', () => { S = d; S.slot = n; render(); }, 'primary small') : ''}
        ${btn(d ? 'Neu' : 'Neue Karriere', () => {
          if (d && !confirm) { slotConfirm = n; render(true); return; }
          slotConfirm = null; clearSlot(n); pendingSlot = n; S = { phase: 'create' }; render();
        }, confirm ? 'small danger' : d ? 'small' : 'primary small')}
      </div>
      ${confirm ? `<p class="slotwarn">Achtung: Der alte Spielstand wird gelöscht. Zum Bestätigen nochmal auf „Neu“ tippen.</p>` : ''}
    </div>`);
  }
  return `<section class="card"><h2>Spielstände</h2><div class="slots">${rows.join('')}</div></section>`;
}

// ---------- Schwierigkeitsgrad ----------
const DIFFICULTY = {
  easy: { name: 'Einfach', desc: 'Mehr Talent, weniger Verletzungen.', rating: 3, potential: 3, injury: 5, growth: 1.15 },
  normal: { name: 'Normal', desc: 'Das ausgewogene Spiel.', rating: 0, potential: 0, injury: 8, growth: 1 },
  legend: { name: 'Legende', desc: 'Weniger Talent, mehr Verletzungen, strengere Kontrollen.', rating: -2, potential: -3, injury: 12, growth: 0.9 },
};
const diff = () => DIFFICULTY[(S && S.diff) || 'normal'];

// ---------- Karriere teilen ----------
function shareText() {
  const t = totals();
  const [, title] = legacy();
  const bd = S.awards.filter(a => a.startsWith("Ballon d'Or")).length;
  return [
    `⚽ Meine Fußballkarriere: ${S.player.name} (${S.player.nation}, ${POSITIONS[S.player.pos].name})`,
    `🏟️ ${S.clubsPlayed.join(' → ')}`,
    `📊 ${t.games} Spiele · ${t.goals} Tore · ${t.assists} Vorlagen · Stärke bis ${S.peak}`,
    `🏆 ${S.titles.length} Titel${bd ? ` · ${bd}× Ballon d'Or` : ''} · ${S.player.caps} Länderspiele`,
    `💰 Vermögen: ${money(S.money)}`,
    `⭐ Status: ${title}${S.phase === 'retired' ? '' : ' (Karriere läuft noch)'}`,
  ].join('\n');
}
function renderShare() {
  const text = shareText();
  return `
  <section class="card">
    <h2>Karriere teilen</h2>
    <textarea id="share-text" class="sharebox" readonly rows="6">${esc(text)}</textarea>
    <div class="actions">${btn('Text kopieren', () => copyShare(), 'primary')}</div>
    <p class="muted" id="share-status"></p>
  </section>`;
}
function copyShare() {
  const ta = document.getElementById('share-text');
  const status = document.getElementById('share-status');
  const fallback = () => { ta.focus(); ta.select(); status.textContent = 'Text markiert – jetzt mit „Kopieren“ übernehmen.'; };
  try {
    navigator.clipboard.writeText(ta.value).then(() => { status.textContent = 'Kopiert! Jetzt einfach in WhatsApp & Co. einfügen.'; }, fallback);
  } catch (e) { fallback(); }
}

// ---------- Erfolge (über alle Karrieren) ----------
const ACH_KEY = 'fussballkarriere-erfolge';
const ACHIEVEMENTS = [
  { id: 'firstTitle', name: 'Erster Pokal', desc: 'Gewinne deinen ersten Titel.', test: () => S.titles.length >= 1 },
  { id: 'cl', name: 'Königsklasse', desc: 'Gewinne die Champions League.', test: () => S.titles.some(t => t.startsWith('Champions-League-Sieger')) },
  { id: 'world', name: 'Weltmeister', desc: 'Werde Weltmeister.', test: () => S.titles.some(t => t.startsWith('Weltmeister')) },
  { id: 'ballon', name: 'Bester der Welt', desc: "Gewinne den Ballon d'Or.", test: () => S.awards.some(a => a.startsWith("Ballon d'Or")) },
  { id: 'goals100', name: 'Torjäger', desc: 'Schieße 100 Karrieretore.', test: () => totals().goals >= 100 },
  { id: 'goals300', name: 'Tormaschine', desc: 'Schieße 300 Karrieretore.', test: () => totals().goals >= 300 },
  { id: 'clubs5', name: 'Wandervogel', desc: 'Spiele für 5 Vereine.', test: () => S.clubsPlayed.length >= 5 },
  { id: 'legend', name: 'Vereinslegende', desc: 'Werde Legende bei einem Verein.', test: () => legends().length >= 1 },
  { id: 'million', name: 'Millionär', desc: 'Besitze 1 Mio. €.', test: () => S.money >= 1 },
  { id: 'billion', name: 'Milliardär', desc: 'Besitze 1 Milliarde €.', test: () => S.money >= 1000 },
  { id: 'married', name: 'Ja, ich will', desc: 'Heirate.', test: () => S.life && S.life.married },
  { id: 'kids3', name: 'Großfamilie', desc: 'Bekomme 3 Kinder.', test: () => S.life && S.life.children && S.life.children.length >= 3 },
  { id: 'gen3', name: 'Dynastie', desc: 'Spiele die 3. Generation.', test: () => (S.gen || 1) >= 3 },
  { id: 'caught', name: 'Erwischt', desc: 'Werde beim Doping erwischt.', test: () => (S.dopeCaught || 0) >= 1 },
  { id: 'escape', name: 'Ausbrecher', desc: 'Brich aus dem Gefängnis aus.', test: () => !!S.fugitive },
  { id: 'rival', name: 'Rivalen-Schreck', desc: 'Gewinne 5 Duelle gegen deinen Rivalen.', test: () => S.rival && S.rival.wins >= 5 },
  { id: 'dream', name: 'Traum erfüllt', desc: 'Spiele für deinen Traumverein.', test: () => S.dreamClub && S.clubsPlayed.includes(S.dreamClub) },
  { id: 'followers', name: 'Influencer', desc: 'Erreiche 1 Mio. Follower.', test: () => S.social && S.social.followers >= 1e6 },
  { id: 'captain', name: 'Spielführer', desc: 'Werde Kapitän der Nationalmannschaft.', test: () => !!S.natCaptain },
  { id: 'coachTitle', name: 'Meistertrainer', desc: 'Gewinne einen Titel als Trainer.', test: () => S.coach && S.coach.titles.length >= 1 },
  { id: 'president', name: 'Boss', desc: 'Kaufe einen Verein.', test: () => !!(S.owner || S.ownerDone) },
  { id: 'goals5', name: 'Musterschüler', desc: 'Erfülle 10 Saisonziele.', test: () => (S.goalsDone || 0) >= 10 },
];
function unlockedAchievements() { try { return JSON.parse(localStorage.getItem(ACH_KEY) || '[]'); } catch (e) { return []; } }
function checkAchievements() {
  if (!S || !S.player) return;
  const have = unlockedAchievements();
  const fresh = ACHIEVEMENTS.filter(a => !have.includes(a.id) && (() => { try { return a.test(); } catch (e) { return false; } })());
  if (!fresh.length) return;
  try { localStorage.setItem(ACH_KEY, JSON.stringify([...have, ...fresh.map(a => a.id)])); } catch (e) { /* ignorieren */ }
  fresh.forEach(a => toast(`🏅 Erfolg freigeschaltet: ${a.name}`));
  queueFx('chime');
}
function renderAchievements() {
  const have = unlockedAchievements();
  return `
  <section class="card">
    <details><summary>Erfolge · ${have.length} von ${ACHIEVEMENTS.length}</summary>
      <div class="achs">${ACHIEVEMENTS.map(a => `<div class="ach ${have.includes(a.id) ? 'got' : ''}"><b>${have.includes(a.id) ? '🏅' : '🔒'} ${esc(a.name)}</b><small>${esc(a.desc)}</small></div>`).join('')}</div>
    </details>
  </section>`;
}

// ---------- Kurze Einblendungen ----------
function toast(text) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ---------- Sound (ohne Dateien, mit Web Audio erzeugt) ----------
const PREF_KEY = 'fussballkarriere-einstellungen';
function prefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch (e) { return {}; } }
function setPref(k, v) { const p = prefs(); p[k] = v; try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) { /* ignorieren */ } }
let audioCtx = null;
let fxQueue = [];
function queueFx(...names) { fxQueue.push(...names); }
function flushFx() {
  const list = fxQueue; fxQueue = [];
  for (const n of list) {
    if (n === 'confetti') confetti();
    else playSound(n);
  }
}
function tone(freq, start, dur, type = 'sine', vol = 0.15) {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, audioCtx.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(audioCtx.currentTime + start); o.stop(audioCtx.currentTime + start + dur + 0.05);
}
function crowd(dur) {
  const len = audioCtx.sampleRate * dur;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len) * 0.5;
  const src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  f.type = 'bandpass'; f.frequency.value = 900; g.gain.value = 0.35;
  src.buffer = buf; src.connect(f); f.connect(g); g.connect(audioCtx.destination); src.start();
}
function playSound(name) {
  if (prefs().mute) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (name === 'goal') { crowd(1.6); tone(523, 0, 0.15, 'square', 0.06); tone(784, 0.15, 0.3, 'square', 0.06); }
    else if (name === 'whistle') { tone(2900, 0, 0.18, 'sine', 0.08); tone(2900, 0.25, 0.45, 'sine', 0.08); }
    else if (name === 'fanfare') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.4, 'triangle', 0.12));
    else if (name === 'chime') { tone(880, 0, 0.3, 'sine', 0.1); tone(1320, 0.12, 0.4, 'sine', 0.08); }
    else if (name === 'sad') { tone(392, 0, 0.35, 'triangle', 0.1); tone(330, 0.3, 0.5, 'triangle', 0.1); }
  } catch (e) { /* kein Ton möglich */ }
}

// ---------- Konfetti ----------
function confetti() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.width = window.innerWidth; c.height = window.innerHeight;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const colors = ['#3ddc84', '#e8c547', '#ef5b5b', '#4aa3ff', '#ffffff'];
  const parts = Array.from({ length: 140 }, () => ({
    x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
    r: 4 + Math.random() * 5, a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3, col: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.col; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
    }
    if (t - start < 3200) requestAnimationFrame(frame); else c.remove();
  })(start);
}

// ---------- Design und Ton umschalten ----------
function applyTheme() {
  const t = prefs().theme;
  if (t) document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
  const tb = document.getElementById('theme-btn');
  if (tb) tb.textContent = currentTheme() === 'dark' ? '☀️' : '🌙';
  const sb = document.getElementById('sound-btn');
  if (sb) sb.textContent = prefs().mute ? '🔇' : '🔊';
}
function currentTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t) return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function toggleTheme() { setPref('theme', currentTheme() === 'dark' ? 'light' : 'dark'); applyTheme(); }
function toggleSound() { setPref('mute', !prefs().mute); applyTheme(); if (!prefs().mute) playSound('chime'); }

// ---------- Karriere-Diagramm ----------
function renderCareerChart() {
  const rows = S.history.filter(h => !h.banned);
  if (rows.length < 2) return '';
  const W = 340, H = 170, padL = 30, padR = 10, padT = 12, padB = 26;
  const ratings = rows.map(h => h.rating);
  const goals = rows.map(h => h.goals);
  const minR = Math.max(30, Math.floor((Math.min(...ratings) - 3) / 10) * 10);
  const maxR = Math.min(100, Math.ceil((Math.max(...ratings) + 3) / 10) * 10);
  const maxG = Math.max(10, ...goals);
  const x = i => padL + (i * (W - padL - padR)) / (rows.length - 1);
  const yR = v => padT + (1 - (v - minR) / (maxR - minR)) * (H - padT - padB);
  const yG = v => H - padB - (v / maxG) * (H - padT - padB) * 0.6;
  const bw = Math.max(3, Math.min(14, (W - padL - padR) / rows.length - 3));
  const ticks = [];
  for (let v = minR; v <= maxR; v += 10) ticks.push(v);
  const line = rows.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yR(h.rating).toFixed(1)}`).join(' ');
  const area = `${line} L${x(rows.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;
  const peakI = ratings.indexOf(Math.max(...ratings));
  const labelEvery = Math.ceil(rows.length / 6);
  return `
  <section class="card">
    <h2>Deine Karriere als Kurve</h2>
    <p class="muted"><span class="lg lg-r"></span> Stärke &nbsp; <span class="lg lg-g"></span> Tore pro Saison</p>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stärke und Tore pro Saison">
      ${ticks.map(v => `<line x1="${padL}" x2="${W - padR}" y1="${yR(v)}" y2="${yR(v)}" class="grid"/><text x="${padL - 4}" y="${yR(v) + 3}" class="axis" text-anchor="end">${v}</text>`).join('')}
      ${rows.map((h, i) => `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${yG(h.goals).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - padB - yG(h.goals)).toFixed(1)}" class="gbar"><title>${seasonLabel(h.year)}: ${h.goals} Tore</title></rect>`).join('')}
      <path d="${area}" class="rarea"/>
      <path d="${line}" class="rline"/>
      <circle cx="${x(peakI)}" cy="${yR(ratings[peakI])}" r="4" class="rpeak"><title>Höchste Stärke: ${ratings[peakI]}</title></circle>
      ${rows.map((h, i) => (i % labelEvery === 0 ? `<text x="${x(i)}" y="${H - 8}" class="axis" text-anchor="middle">${h.age}</text>` : '')).join('')}
    </svg>
    <p class="muted small">Unten: dein Alter.</p>
  </section>`;
}
