'use strict';

// Walkout-Animation für Sonderkarten, Einstellungen, Traumelf und Deadline Day

// ---------- Flaggen ----------
const NATION_ISO = {
  'Deutschland': 'DE', 'Österreich': 'AT', 'Schweiz': 'CH', 'Frankreich': 'FR', 'Spanien': 'ES', 'Italien': 'IT', 'Portugal': 'PT',
  'Niederlande': 'NL', 'Belgien': 'BE', 'Kroatien': 'HR', 'Dänemark': 'DK', 'Norwegen': 'NO', 'Türkei': 'TR', 'Polen': 'PL', 'Serbien': 'RS',
  'Ukraine': 'UA', 'Schweden': 'SE', 'Tschechien': 'CZ', 'Griechenland': 'GR', 'Ungarn': 'HU', 'Albanien': 'AL',
  'Bosnien und Herzegowina': 'BA', 'Kosovo': 'XK', 'Argentinien': 'AR', 'Brasilien': 'BR', 'Uruguay': 'UY', 'Kolumbien': 'CO',
  'Ecuador': 'EC', 'Marokko': 'MA', 'Senegal': 'SN', 'Nigeria': 'NG', 'Elfenbeinküste': 'CI', 'Ghana': 'GH', 'Ägypten': 'EG',
  'Kamerun': 'CM', 'Japan': 'JP', 'Südkorea': 'KR', 'Iran': 'IR', 'Australien': 'AU', 'Saudi-Arabien': 'SA', 'USA': 'US', 'Mexiko': 'MX', 'Kanada': 'CA',
};
function flagOf(nation) {
  if (nation === 'England') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (nation === 'Schottland') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
  const iso = NATION_ISO[nation];
  return iso ? String.fromCodePoint(...[...iso].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65)) : '🌍';
}

// ---------- Walkout-Animation ----------
// Bei einer neuen Sonderkarte: Flagge, Position, Verein – dann dreht sich die Karte um
function maybeWalkout() {
  const v = S && S.vg;
  if (!v || !v.special || v.walked || v.year !== S.year || S.phase !== 'preseason') return;
  v.walked = true;
  if (prefs().noWalkout) return;
  const steps = [
    `<div class="wo-big">${flagOf(S.player.nation)}</div><div class="wo-txt">${esc(S.player.nation)}</div>`,
    `<div class="wo-big wo-pos">${esc(S.player.pos)}</div><div class="wo-txt">${esc(POSITIONS[S.player.pos].name)}</div>`,
    `<div class="wo-big">${crest(S.clubId)}</div><div class="wo-txt">${esc(S.clubId)}</div>`,
    `<div class="wo-card">${vgCard(v)}</div><div class="wo-txt">${esc(S.player.name)}</div>`,
  ];
  const el = document.createElement('div');
  el.className = 'card-overlay walkout';
  el.innerHTML = `<div class="wo-stage"><div class="wo-beam"></div><div class="wo-slot"></div><p class="wo-hint">Tippen zum Überspringen</p></div>`;
  document.body.appendChild(el);
  const slot = el.querySelector('.wo-slot');
  let i = 0, timer = null;
  const close = () => { clearTimeout(timer); if (el.parentNode) el.parentNode.removeChild(el); };
  const show = () => {
    slot.innerHTML = `<div class="wo-step${i === steps.length - 1 ? ' last' : ''}">${steps[i]}</div>`;
    if (i === steps.length - 1) { playSound('fanfare'); confetti(); } else playSound('chime');
    i++;
    timer = i === steps.length ? setTimeout(close, 3200) : setTimeout(show, 1000);
  };
  // Tippen: direkt zur Karte springen, beim zweiten Tippen schließen
  el.addEventListener('click', () => { clearTimeout(timer); if (i < steps.length) { i = steps.length - 1; show(); } else close(); });
  show();
}

// ---------- Einstellungen ----------
function openSettings() {
  const el = document.createElement('div');
  el.className = 'card-overlay settings-overlay';
  const draw = () => {
    const p = prefs();
    const row = (key, label, desc, on) => `<button class="set-row" data-set="${key}"><span><b>${label}</b><small>${desc}</small></span><i class="switch ${on ? 'on' : ''}"></i></button>`;
    el.innerHTML = `<div class="co-box settings">
      <h2>⚙️ Einstellungen</h2>
      ${row('recap', 'Saison-Rückblick', 'Am Saisonende automatisch als Video-Story zeigen', !p.noRecap)}
      ${row('walkout', 'Walkout-Animation', 'Neue Sonderkarten wie in FIFA enthüllen', !p.noWalkout)}
      ${row('sound', 'Ton', 'Jubel, Pfiffe und Fanfaren', !p.mute)}
      ${row('theme', 'Helles Design', 'Zwischen hell und dunkel wechseln', currentTheme() === 'light')}
      <div class="actions"><button class="btn primary small set-close">Fertig</button></div></div>`;
  };
  draw();
  el.addEventListener('click', e => {
    const r = e.target.closest('[data-set]');
    if (r) {
      const k = r.dataset.set;
      if (k === 'recap') setPref('noRecap', !prefs().noRecap);
      if (k === 'walkout') setPref('noWalkout', !prefs().noWalkout);
      if (k === 'sound') toggleSound();
      if (k === 'theme') toggleTheme();
      draw();
      return;
    }
    if (e.target === el || e.target.closest('.set-close')) { el.parentNode.removeChild(el); if (S) render(true); }
  });
  document.body.appendChild(el);
}

// ---------- Traumelf ----------
// Am Karriereende: die beste Elf aus Mitspielern, Rivalen, Weltstars und Trikottausch-Partnern
const DREAM_SLOTS = [['TW'], ['AV', 'IV', 'IV', 'AV'], ['ZM', 'ZOM', 'ZM'], ['FL', 'ST', 'FL']];

function buildDreamTeam() {
  if (S.dreamTeam) return S.dreamTeam;
  const pool = [];
  const add = (name, rating, why, nation, pos) => { if (name && name !== S.player.name && !pool.some(x => x.name === name)) pool.push({ name, rating: Math.round(rating), why, nation, pos }); };
  if (S.rival) add(S.rival.name, S.rival.rating || 85, 'Dein Rivale', S.rival.nation, S.rival.pos);
  for (const s of S.bdStars || []) add(s.name, s.rating, "Ballon-d'Or-Konkurrent", s.nation, null);
  for (const sh of S.shirts || []) add(sh.name, 84 + randInt(0, 6), `Trikottausch (${sh.team})`, null, null);
  for (const m of (S.team && S.team.mates) || []) add(m.name, clamp(clubStr(S.clubId) + randInt(-3, 3), 60, 95), `Mitspieler bei ${S.clubId}`, null, m.pos);
  const b = S.buddy;
  if (b) add(b.name, 70 + randInt(0, 10), 'Dein Kindheitsfreund', S.player.nation, null);
  pool.sort((a, z) => z.rating - a.rating);
  const me = { name: S.player.name, rating: S.peak, why: 'Du', nation: S.player.nation, pos: S.player.pos, me: true };
  const lines = DREAM_SLOTS.map(r => r.map(pos => ({ pos })));
  // Eigene Position zuerst besetzen, dann passende Positionen, dann die Stärksten
  const all = lines.flat();
  const mySlot = all.find(s => s.pos === S.player.pos) || all.find(s => POSITIONS[s.pos].group === POSITIONS[S.player.pos].group) || all[all.length - 2];
  Object.assign(mySlot, me);
  for (const slot of all.filter(s => !s.name)) {
    const i = pool.findIndex(x => x.pos === slot.pos);
    const pickIdx = i >= 0 ? i : 0;
    const p = pool.splice(pickIdx, 1)[0] || { name: randomName(), rating: 75 + randInt(0, 8), why: 'Talent aus deiner Zeit' };
    Object.assign(slot, p, { pos: slot.pos });
  }
  S.dreamTeam = lines;
  return lines;
}

function renderDreamTeam() {
  if (totals().seasons < 3) return '';
  const lines = buildDreamTeam();
  return `
  <section class="card">
    <details><summary>⭐ Deine Traumelf</summary>
      <p class="muted">Die besten Spieler deiner Karriere – Mitspieler, Rivalen und Stars, mit denen du das Trikot getauscht hast.</p>
      <div class="pitch">${lines.slice().reverse().map(r => `<div class="pitch-row">${r.map(s => `<div class="pitch-p${s.me ? ' me' : ''}" title="${esc(s.why || '')}">
        <div class="pp-card"><b>${s.rating}</b><small>${esc(s.pos)}</small></div><span>${esc(s.name.split(' ').length > 1 ? `${s.name[0]}. ${s.name.split(' ').slice(-1)[0]}` : s.name)}</span></div>`).join('')}</div>`).join('')}</div>
    </details>
  </section>`;
}

// ---------- Deadline Day ----------
const DEADLINE_SECONDS = 20;

function maybeDeadline(offers, newOffer) {
  const p = S.player;
  if (offers.released || S.youth || p.age > 33 || !chance(0.25)) return;
  // Nur Vereine, die zur eigenen Stärke passen: etwas stärker als der jetzige Verein, aber höchstens ein paar Punkte über dir
  const str = clubStr(S.clubId);
  const res = S.seasonEnd || {};
  const good = res.note !== null && res.note !== undefined && res.note <= 2.8 ? 2 : 0;
  const lo = Math.max(str + 1, p.rating - 4), hi = p.rating + 3 + good;
  const cands = Object.keys(S.clubs).filter(n => n !== S.clubId && clubStr(n) >= lo && clubStr(n) <= hi && !offers.list.some(o => o.club === n));
  if (!cands.length) return;
  const o = newOffer(pick(cands));
  o.salary *= 1.25; o.signing *= 1.5; o.deadline = true;
  offers.deadline = { offer: o, until: Date.now() + DEADLINE_SECONDS * 1000, state: 'open' };
}

let deadlineTimer = null;
function tickDeadline() {
  clearInterval(deadlineTimer);
  const d = S && S.offers && S.offers.deadline;
  if (!d || d.state !== 'open') return;
  deadlineTimer = setInterval(() => {
    const el = document.getElementById('dl-left');
    const left = Math.max(0, Math.ceil((d.until - Date.now()) / 1000));
    if (el) el.textContent = left;
    if (left <= 0 || !S || !S.offers || S.offers.deadline !== d) {
      clearInterval(deadlineTimer);
      if (S && S.offers && S.offers.deadline === d && d.state === 'open') { d.state = 'expired'; render(true); }
    }
  }, 250);
}

function renderDeadline() {
  const d = S.offers && S.offers.deadline;
  if (!d) return '';
  if (d.state === 'open' && Date.now() > d.until) d.state = 'expired';
  const o = d.offer;
  if (d.state === 'expired') return `<section class="card deadline gone"><p>⏰ <b>Deadline Day vorbei.</b> Das Last-Minute-Angebot von ${esc(o.club)} ist abgelaufen – das Faxgerät hat zu spät gepiept.</p></section>`;
  if (d.state === 'declined') return '';
  setTimeout(tickDeadline);
  return `
  <section class="card deadline">
    <div class="dl-head"><span>⏰ DEADLINE DAY</span><b><span id="dl-left">${Math.max(0, Math.ceil((d.until - Date.now()) / 1000))}</span> s</b></div>
    <p>Das Transferfenster schließt gleich! <b>${esc(o.club)}</b> meldet sich in letzter Minute – mehr Gehalt, ein großes Handgeld. Aber du musst sofort entscheiden.</p>
    <div class="offer">${crest(o.club)}<div class="offer-info"><strong>${esc(o.club)}</strong>
      <small>${esc(clubLeague(o.club).name)} · Stärke ${clubStr(o.club)}</small>
      <small><b>${money(o.salary)}/Jahr</b> · ${o.years} ${o.years === 1 ? 'Jahr' : 'Jahre'} · Handgeld ${money(o.signing)}</small></div></div>
    <div class="choices">${btn('Sofort unterschreiben<small>keine Zeit für einen Medizincheck</small>', () => { d.state = 'done'; clearInterval(deadlineTimer); o.medDone = true; acceptOffer(o); render(); }, 'primary')}
      ${btn('Ablehnen', () => { d.state = 'declined'; clearInterval(deadlineTimer); render(true); })}</div>
  </section>`;
}
