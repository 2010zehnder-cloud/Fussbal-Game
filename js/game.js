'use strict';

const SAVE_KEY = 'fussballkarriere-save-v1';
const START_YEAR = 2026;

let S = null; // Spielstand
let handlers = [];
const app = () => document.getElementById('app');

// ---------- Hilfsfunktionen ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sigmoid = x => 1 / (1 + Math.exp(-x));
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt1 = n => n.toFixed(1).replace('.', ',');
const fmt2 = n => n.toFixed(2).replace('.', ',');

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function btn(label, fn, cls = '') {
  handlers.push(fn);
  return `<button class="btn ${cls}" data-h="${handlers.length - 1}">${label}</button>`;
}

// ---------- Daten-Zugriff ----------
const leagueById = id => LEAGUES.find(l => l.id === id);
const clubStr = name => clamp(Math.round(S.clubs[name].base + S.clubs[name].drift), 40, 95);
const clubLeague = name => leagueById(S.clubs[name].league);
const clubsIn = id => Object.keys(S.clubs).filter(n => S.clubs[n].league === id);
const nation = () => NATIONS.find(n => n.name === S.player.nation);
const seasonLabel = y => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;

function marketValue(p = S.player) {
  const ageF = p.age <= 23 ? 1.3 : p.age <= 27 ? 1.1 : p.age <= 30 ? 0.8 : p.age <= 32 ? 0.5 : 0.25;
  return Math.min(250, 5 * Math.exp((p.rating - 70) / 5.9) * ageF);
}
function money(mio) {
  if (mio < 1) return `${Math.max(10, Math.round(mio * 100) * 10)} Tsd. €`;
  return `${mio < 10 ? fmt1(mio) : Math.round(mio)} Mio. €`;
}

function crest(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  const words = name.replace(/[0-9.]/g, '').split(/\s+/).filter(w => w.length > 2 && !['FC', 'SC', 'SV', 'AC', 'AS', 'CF'].includes(w));
  const ini = (words[0] || name)[0] + ((words[1] || '')[0] || '');
  return `<span class="crest" style="background:hsl(${h} 55% 38%)">${esc(ini.toUpperCase())}</span>`;
}

// ---------- Werteänderungen ----------
const STAT_LABELS = {
  form: 'Form', trust: 'Vertrauen', popularity: 'Beliebtheit', injuryProne: 'Verletzungsrisiko',
  devBonus: 'Entwicklung', injuredGames: 'Ausfall (Spiele)', goals: 'Tore', assists: 'Vorlagen',
};
function mod(changes) {
  const p = S.player, se = S.season;
  const parts = [];
  for (const [k, v] of Object.entries(changes)) {
    if (!v) continue;
    if (k === 'form') p.form = clamp(p.form + v, -10, 10);
    else if (k === 'trust') p.trust = clamp(p.trust + v, 0, 100);
    else if (k === 'popularity') p.popularity = clamp(p.popularity + v, 0, 100);
    else if (k === 'injuryProne') p.injuryProne = clamp(p.injuryProne + v, 0, 40);
    else if (k === 'devBonus') se.devBonus += v;
    else if (k === 'injuredGames') se.injuredGames += v;
    else if (k === 'goals') se.extraGoals += v;
    else if (k === 'assists') se.extraAssists += v;
    const good = k === 'injuryProne' || k === 'injuredGames' ? v < 0 : v > 0;
    const shown = k === 'devBonus' ? (v > 0 ? '▲' : '▼') : (v > 0 ? '+' : '−') + Math.abs(v);
    parts.push(`<span class="chip ${good ? 'up' : 'down'}">${STAT_LABELS[k]} ${shown}</span>`);
  }
  return parts.length ? `<div class="chips">${parts.join('')}</div>` : '';
}

function ctx() { return S.current.ctx; }
function rivalName() {
  if (!ctx().rival) {
    const others = clubsIn(S.clubs[S.clubId].league).filter(n => n !== S.clubId);
    ctx().rival = pick(others);
  }
  return ctx().rival;
}
function switchTarget() {
  if (!ctx().target) ctx().target = pick(POSITION_SWITCH[S.player.pos]);
  return ctx().target;
}

// ---------- Speichern ----------
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignorieren */ } }
function loadSave() { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorieren */ } }

// ---------- Neues Spiel ----------
function newGame(name, nationName, pos, number) {
  const clubs = {};
  for (const L of LEAGUES) for (const [n, str] of L.clubs) clubs[n] = { league: L.id, base: str, drift: 0 };
  const potential = clamp(Math.round(72 + Math.pow(Math.random(), 0.8) * 26), 72, 99);
  S = {
    player: {
      name, nation: nationName, pos, number, age: 17,
      rating: randInt(48, 55), potential, form: 0, trust: 50, popularity: 20, injuryProne: 8, caps: 0, intGoals: 0,
    },
    year: START_YEAR, clubs, clubId: null, loan: null, youth: true, captainAt: null,
    lastTables: {}, phase: 'academy', current: null, season: null, seasonEnd: null, offers: null,
    history: [], titles: [], awards: [], clubsPlayed: [], peak: 0,
    scoutGuess: clamp(potential + randInt(-5, 5), 60, 99),
  };
  S.peak = S.player.rating;
  S.academyOffers = academyOffers();
}

function academyOffers() {
  const home = nation().country;
  const all = Object.keys(S.clubs).filter(n => clubStr(n) >= 68);
  const domestic = shuffle(all.filter(n => clubLeague(n).country === home));
  const foreign = shuffle(all.filter(n => clubLeague(n).country !== home));
  const picks = [...domestic.slice(0, home ? 2 : 0), ...foreign].slice(0, 3);
  return picks.sort((a, b) => clubStr(b) - clubStr(a));
}

// ---------- Rollen ----------
const ROLE_SHARE = { 'Stammspieler': [0.78, 0.95], 'Rotation': [0.42, 0.65], 'Ergänzungsspieler': [0.1, 0.3], 'U19': [0.75, 0.95] };
const ROLE_MIN = { 'Stammspieler': 1, 'Rotation': 0.7, 'Ergänzungsspieler': 0.45, 'U19': 1 };
function roleFor(rating, str, trust) {
  const d = rating - str + (trust - 50) / 12;
  return d >= -2 ? 'Stammspieler' : d >= -8 ? 'Rotation' : 'Ergänzungsspieler';
}

// ---------- Saisonablauf ----------
const STEPS = [
  { type: 'event', label: 'August – Saisonstart' },
  { type: 'match', label: 'Oktober – Topspiel' },
  { type: 'event', label: 'Januar – Winterpause' },
  { type: 'match', label: 'April – Saisonendspurt' },
];

function startSeason() {
  const p = S.player;
  const str = clubStr(S.clubId);
  const role = S.youth ? 'U19' : roleFor(p.rating, str, p.trust);
  S.season = { role, devBonus: 0, injuredGames: 0, extraGoals: 0, extraAssists: 0, usedEvents: [], transferBoost: 0, scenes: [], step: 0 };
  S.europe = S.youth ? null : europeFor(S.clubId);
  S.phase = 'preseason';
  S.current = null;
  if (!S.clubsPlayed.includes(S.clubId)) S.clubsPlayed.push(S.clubId);
}

function europeFor(club) {
  const L = clubLeague(club);
  const table = S.lastTables[L.id] || clubsIn(L.id).sort((a, b) => clubStr(b) - clubStr(a));
  const idx = table.indexOf(club);
  if (idx < 0) return null;
  if (idx < L.cl) return 'cl';
  if (idx < L.cl + L.el) return 'el';
  return null;
}

function nextStep() {
  const se = S.season;
  if (se.step >= STEPS.length) { endSeason(); return; }
  const step = STEPS[se.step];
  if (step.type === 'event') setupEvent(); else setupMatch();
  S.phase = 'season';
}

function setupEvent() {
  const pool = EVENTS.filter(e => !S.season.usedEvents.includes(e.id) && (!e.cond || e.cond()));
  const total = pool.reduce((s, e) => s + (e.weight ? e.weight() : 1), 0);
  let r = Math.random() * total, ev = pool[0];
  for (const e of pool) { r -= e.weight ? e.weight() : 1; if (r <= 0) { ev = e; break; } }
  S.season.usedEvents.push(ev.id);
  S.current = { type: 'event', id: ev.id, ctx: {}, result: null };
  S.current.text = ev.text(); // Text einmal festhalten (Zufallswerte stabil)
}

function setupMatch() {
  const p = S.player, se = S.season;
  const own = S.clubId;
  const L = clubLeague(own);
  let comp = L.name, opp;
  const second = se.step === 3;
  if (S.youth) {
    comp = 'U19-Liga';
    opp = pick(clubsIn(L.id).filter(n => n !== own));
  } else if (second && S.europe && chance(0.6)) {
    comp = S.europe === 'cl' ? 'Champions League' : 'Europa League';
    const pool = Object.keys(S.clubs).filter(n => clubLeague(n).id !== L.id && clubStr(n) >= (S.europe === 'cl' ? 80 : 73));
    opp = pick(pool.length ? pool : Object.keys(S.clubs).filter(n => n !== own));
  } else {
    const others = clubsIn(L.id).filter(n => n !== own).sort((a, b) => clubStr(b) - clubStr(a));
    opp = pick(others.slice(0, 6));
  }
  const home = chance(0.5);
  const minute = randInt(62, 89);
  const a = randInt(0, 2);
  const b = clamp(a + randInt(-1, 1), 0, 3);
  const group = POSITIONS[p.pos].group;
  const q = quality();
  let situation, options;
  if (group === 'att') {
    situation = 'Du bekommst den Ball 18 Meter vor dem Tor. Ein Verteidiger rückt heraus, links läuft ein Mitspieler frei.';
    options = [
      { label: 'Direkt abziehen', p: 0.25 + q * 0.3, kind: 'goal' },
      { label: 'Den Mitspieler bedienen', p: 0.42 + q * 0.25, kind: 'assist' },
      { label: 'Ins Dribbling gehen', p: 0.18 + q * 0.32, kind: 'goal', bonus: true },
    ];
  } else if (group === 'mid') {
    situation = 'Ballgewinn im Mittelfeld! Vor dir öffnet sich Raum für einen Konter.';
    options = [
      { label: 'Steilpass in die Spitze', p: 0.35 + q * 0.3, kind: 'assist' },
      { label: 'Selbst durchlaufen und schießen', p: 0.18 + q * 0.28, kind: 'goal' },
      { label: 'Tempo rausnehmen, Ballbesitz sichern', p: 0.85, kind: 'safe' },
    ];
  } else if (group === 'def') {
    situation = 'Der gegnerische Stürmer ist durch und läuft allein auf dich zu. Du bist der letzte Mann!';
    options = [
      { label: 'Grätsche!', p: 0.3 + q * 0.35, kind: 'tackle', risky: true },
      { label: 'Stellung halten und abdrängen', p: 0.4 + q * 0.25, kind: 'tackle' },
      { label: 'Taktisches Foul', p: 0.9, kind: 'foul' },
    ];
  } else {
    situation = 'Elfmeter gegen euch! Der Schütze legt sich den Ball zurecht. Wohin springst du?';
    options = [
      { label: 'Links', kind: 'save', dir: 0 },
      { label: 'Mitte', kind: 'save', dir: 1 },
      { label: 'Rechts', kind: 'save', dir: 2 },
    ];
  }
  S.current = {
    type: 'match', ctx: {}, result: null, comp, opp, home, minute, a, b, situation,
    options: options.map(o => ({ ...o, p: o.p !== undefined ? clamp(o.p, 0.05, 0.92) : undefined })),
  };
}

function quality() {
  const p = S.player;
  return clamp((p.rating - 50) / 40 + p.form / 40, 0, 1.2);
}

function resolveMatch(i) {
  const c = S.current, o = c.options[i], p = S.player;
  let us = c.a, them = c.b, text, eff;
  if (o.kind === 'save') {
    const shot = randInt(0, 2);
    const saved = shot === o.dir ? chance(0.55 + quality() * 0.3) : chance(0.04 + quality() * 0.06);
    if (saved) { text = `Gehalten! Du ahnst die Ecke und parierst. Ihr bringt das ${us}:${them} über die Zeit.`; eff = { form: 3, trust: 3, popularity: 5 }; }
    else { them++; text = `Der Ball schlägt ${['links', 'in der Mitte', 'rechts'][shot]} ein. Endstand ${us}:${them}.`; eff = { form: -1 }; }
  } else {
    const ok = chance(o.p);
    if (o.kind === 'goal') {
      if (ok) { us++; text = `TOOOR! Du triffst zum ${us}:${them}!${o.bonus ? ' Was für ein Solo – das Stadion bebt!' : ''} Endstand ${us}:${them}.`; eff = { form: 3, trust: 3, popularity: o.bonus ? 7 : 4, goals: 1 }; }
      else { text = `${o.bonus ? 'Du bleibst am dritten Gegenspieler hängen.' : 'Knapp vorbei!'} Endstand ${us}:${them}.`; eff = { form: -1, trust: o.bonus ? -3 : -1 }; }
    } else if (o.kind === 'assist') {
      if (ok) { us++; text = `Perfekter Pass – dein Mitspieler schiebt ein! ${us}:${them}. So endet das Spiel.`; eff = { form: 2, trust: 4, popularity: 3, assists: 1 }; }
      else { text = `Der Pass wird abgefangen. Endstand ${us}:${them}.`; eff = { form: -1 }; }
    } else if (o.kind === 'safe') {
      if (ok) { text = `Clever gespielt. Ihr kontrolliert das Spiel. Endstand ${us}:${them}.`; eff = { trust: 2 }; }
      else { them++; text = `Ballverlust im Aufbau – Gegentor! Endstand ${us}:${them}.`; eff = { form: -2, trust: -3 }; }
    } else if (o.kind === 'tackle') {
      if (ok) { text = `Ball erobert! Die Fans feiern deine Rettungstat. Endstand ${us}:${them}.`; eff = { form: 2, trust: 4, popularity: o.risky ? 5 : 3 }; }
      else if (o.risky && chance(0.35)) { them++; text = `Zu spät! Rote Karte und Elfmeter – ${us}:${them}. Du bist für 3 Spiele gesperrt.`; eff = { form: -3, trust: -5, injuredGames: 3 }; }
      else { them++; text = `Der Stürmer lässt dich stehen und trifft. Endstand ${us}:${them}.`; eff = { form: -2, trust: -2 }; }
    } else {
      if (ok) { text = `Gelbe Karte – aber der Konter ist gestoppt. Endstand ${us}:${them}.`; eff = { trust: 1 }; }
      else { text = `Der Schiri zeigt Rot! Du fliegst vom Platz. Endstand ${us}:${them}.`; eff = { trust: -4, injuredGames: 2 }; }
    }
  }
  const resultWord = us > them ? 'Sieg' : us < them ? 'Niederlage' : 'Unentschieden';
  S.season.scenes.push(`${c.comp}: ${resultWord} gegen ${c.opp} (${us}:${them})`);
  c.final = c.home ? `${us}:${them}` : `${them}:${us}`;
  c.chosen = i;
  c.result = `<p>${text}</p>` + mod(eff);
}

// ---------- Saisonende ----------
function simLeague(id, bonusClub, bonus) {
  const clubs = clubsIn(id);
  const strs = clubs.map(clubStr);
  const min = Math.min(...strs), max = Math.max(...strs);
  const games = (clubs.length - 1) * 2;
  const rows = clubs.map((n, i) => {
    let ppg = 0.5 + ((strs[i] - min) / Math.max(1, max - min)) * 1.75 + gauss() * 0.22;
    if (n === bonusClub) ppg += bonus;
    return { name: n, pts: Math.round(clamp(ppg, 0.3, 2.75) * games), r: Math.random() };
  });
  rows.sort((a, b) => b.pts - a.pts || a.r - b.r);
  return { rows, games };
}

function knockout(ownStr, rounds, pool, k = 5, firstEasy = false) {
  const sorted = pool.slice().sort((a, b) => b.str - a.str);
  for (let i = 0; i < rounds.length; i++) {
    const topN = Math.max(2, Math.ceil(sorted.length * (1 - i / rounds.length)));
    const opp = pick(sorted.slice(0, topN));
    let pw = sigmoid((ownStr - opp.str) / k);
    if (i === 0 && firstEasy) pw = Math.max(pw, 0.7);
    if (!chance(pw)) return { won: false, reached: rounds[i], lostTo: opp.name, played: i + 1 };
    if (i === rounds.length - 1) return { won: true, reached: rounds[i], beat: opp.name, played: i + 1 };
  }
}

function endSeason() {
  const p = S.player, se = S.season;
  const own = S.clubId, L = clubLeague(own), str = clubStr(own);
  const youth = S.youth;
  const res = { year: S.year, age: p.age, club: own, league: youth ? 'U19-Liga' : L.name, role: se.role, lines: [], titles: [], awards: [], loan: !!S.loan };

  // Spielerbonus für die Mannschaft
  const share = ROLE_SHARE[se.role];
  const bonus = youth ? 0 : ((p.rating - str) * 0.025 + p.form * 0.012) * (se.role === 'Stammspieler' ? 1 : se.role === 'Rotation' ? 0.5 : 0.1);

  // Alle Ligen simulieren
  const tables = {};
  for (const lg of LEAGUES) tables[lg.id] = simLeague(lg.id, own, bonus);
  const myTable = tables[L.id];
  const pos = myTable.rows.findIndex(r => r.name === own) + 1;

  // Einsätze
  const avail = Math.max(0, myTable.games - se.injuredGames);
  const trustAdj = (p.trust - 50) / 400;
  let leagueGames = youth ? randInt(20, 28) - Math.min(10, se.injuredGames) : Math.round(avail * clamp(rand(share[0], share[1]) + trustAdj, 0.03, 1));
  leagueGames = Math.max(0, leagueGames);
  const cupRes = youth ? null : cupRun(own);
  const cupGames = cupRes ? Math.round(cupRes.played * (se.role === 'Ergänzungsspieler' ? 0.5 : 0.9)) : 0;
  let euroRes = null, euroGames = 0;
  if (!youth && S.europe) {
    euroRes = europeRun(own, S.europe);
    const matches = 8 + (euroRes.played - 1) * 2 - (euroRes.reached === 'Finale' ? 1 : 0);
    euroGames = Math.round(matches * (se.role === 'Stammspieler' ? 0.85 : se.role === 'Rotation' ? 0.55 : 0.2));
  }
  const games = leagueGames + cupGames + euroGames;

  // Tore, Vorlagen, Note
  const P = POSITIONS[p.pos];
  const refStr = youth ? 58 : str;
  const q = clamp(0.5 + (p.rating - 72) * 0.035 + (p.rating - refStr) * 0.02 + p.form * 0.02, 0.15, 1.8) * ROLE_MIN[se.role];
  const goals = Math.max(0, Math.round(games * P.goals * q * rand(0.8, 1.2)) + se.extraGoals);
  const leagueGoals = games ? Math.round(goals * leagueGames / games) : 0;
  const assists = Math.max(0, Math.round(games * P.assists * q * rand(0.8, 1.2)) + se.extraAssists);
  const cleanSheets = P.group === 'gk' ? Math.round(games * clamp(0.2 + (refStr - 70) * 0.015 + (p.rating - 70) * 0.006, 0.08, 0.6)) : 0;
  let note = 3.6 - (p.rating - refStr) * 0.04 - (p.rating - 70) * 0.03 - p.form * 0.05;
  note -= games ? ((goals + assists) / games) * 0.6 + (cleanSheets / games) * 0.8 : 0;
  note = clamp(note + gauss() * 0.12, 1.3, 5.0);
  if (games === 0) note = null;

  Object.assign(res, { games, goals, assists, cleanSheets, note, pos, teams: myTable.rows.length });

  // Liga
  if (youth) {
    if (chance(clamp((str - 62) / 45, 0.05, 0.5))) { res.titles.push('U19-Meister'); res.lines.push('🏆 Deine U19 wird Meister!'); }
    else res.lines.push(`Deine U19 beendet die Saison auf Platz ${randInt(2, 8)}.`);
  } else {
    res.lines.push(`${L.name}: ${own} wird ${pos}. von ${myTable.rows.length}.`);
    if (pos === 1) { res.titles.push(L.champion); res.lines.push(`🏆 ${L.champion}!`); }
    if (L.id === PROMOTION.upper && pos > myTable.rows.length - PROMOTION.count) res.lines.push('⬇️ Abstieg in die 2. Bundesliga!');
    if (L.id === PROMOTION.lower && pos <= PROMOTION.count) res.lines.push('⬆️ Aufstieg in die Bundesliga!');
    else if (pos <= L.cl) res.lines.push('Qualifiziert für die Champions League.');
    else if (pos <= L.cl + L.el) res.lines.push('Qualifiziert für die Europa League.');
  }
  if (cupRes) {
    if (cupRes.won) { res.titles.push(`${L.cup}-Sieger`); res.lines.push(`🏆 ${L.cup}-Sieger! Finale gegen ${cupRes.beat} gewonnen.`); }
    else res.lines.push(`${L.cup}: Aus in der Runde „${cupRes.reached}“ gegen ${cupRes.lostTo}.`);
  }
  if (euroRes) {
    const name = S.europe === 'cl' ? 'Champions League' : 'Europa League';
    if (euroRes.won) { res.titles.push(`${name}-Sieger`); res.lines.push(`🏆 ${name}-Sieger! Finale gegen ${euroRes.beat} gewonnen.`); }
    else res.lines.push(`${name}: Aus in der Runde „${euroRes.reached}“${euroRes.lostTo ? ` gegen ${euroRes.lostTo}` : ''}.`);
  }
  res.cupRes = cupRes; res.euroRes = euroRes;

  // Auszeichnungen
  awards(res, L, leagueGoals);

  S.titles.push(...res.titles.map(t => `${t} (${seasonLabel(S.year)})`));
  S.awards.push(...res.awards.map(a => `${a} (${seasonLabel(S.year)})`));

  // Vertrauen, Beliebtheit, Form
  if (note !== null) {
    if (note <= 2.5) p.trust = clamp(p.trust + 8, 0, 100);
    else if (note >= 3.8) p.trust = clamp(p.trust - 8, 0, 100);
    p.popularity = clamp(p.popularity + (3.2 - note) * 4 + res.titles.length * 3, 0, 100);
  }
  p.trust = Math.round(p.trust + (50 - p.trust) * 0.15);
  p.popularity = Math.round(p.popularity);

  // Entwicklung
  const before = p.rating;
  const a = p.age;
  let g = a <= 19 ? 5 : a <= 22 ? 3.5 : a <= 25 ? 1.5 : a <= 28 ? 0.5 : a <= 30 ? -0.7 : a <= 32 ? -1.8 : a <= 34 ? -3 : -4.5;
  if (g > 0) {
    const play = { 'Stammspieler': 1.25, 'Rotation': 1, 'Ergänzungsspieler': 0.55, 'U19': 1 }[se.role];
    g *= play;
    if (p.rating >= p.potential) g *= 0.15;
    else if (p.rating + g > p.potential) g = p.potential - p.rating + 0.3;
  }
  g += se.devBonus + rand(-1.2, 1.2) + (note !== null && note < 2.3 ? 0.8 : 0);
  if (se.injuredGames > 12) g -= 1;
  p.rating = clamp(p.rating + g, 35, 99);
  S.peak = Math.max(S.peak, Math.round(p.rating));
  res.ratingBefore = Math.round(before);
  res.ratingAfter = Math.round(p.rating);
  p.form = Math.round(p.form * 0.4);
  p.injuryProne = clamp(p.injuryProne + (a >= 30 ? 1.5 : -0.5), 0, 40);

  res.table = myTable.rows.map(r => ({ name: r.name, pts: r.pts }));
  res.scenes = se.scenes.slice();

  S.history.push({
    year: S.year, age: p.age, club: own, role: se.role, games, goals, assists, cleanSheets,
    note, rating: res.ratingAfter, titles: res.titles.length, youth, loan: !!S.loan,
  });

  // Tabellen merken, Auf-/Abstieg, Stärke-Schwankungen
  for (const lg of LEAGUES) S.lastTables[lg.id] = tables[lg.id].rows.map(r => r.name);
  const up = S.lastTables[PROMOTION.lower].slice(0, PROMOTION.count);
  const down = S.lastTables[PROMOTION.upper].slice(-PROMOTION.count);
  up.forEach(n => { S.clubs[n].league = PROMOTION.upper; });
  down.forEach(n => { S.clubs[n].league = PROMOTION.lower; });
  for (const n of Object.keys(S.clubs)) S.clubs[n].drift = S.clubs[n].drift * 0.6 + rand(-2.5, 2.5);

  // Nationalmannschaft / Turnier im Sommer
  res.tournament = tournament(res);

  p.age++;
  S.seasonEnd = res;
  S.phase = 'seasonEnd';
  S.current = null;
}

function cupRun(club) {
  const L = clubLeague(club);
  const pool = Object.keys(S.clubs).filter(n => n !== club && clubLeague(n).country === L.country).map(n => ({ name: n, str: clubStr(n) }));
  return knockout(clubStr(club) + (S.season.role === 'Stammspieler' ? (S.player.rating - clubStr(club)) * 0.1 : 0),
    ['1. Runde', '2. Runde', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'], pool, 4.5, true);
}

function europeRun(club, comp) {
  const own = clubLeague(club).id;
  const min = comp === 'cl' ? 76 : 68, maxS = comp === 'cl' ? 99 : 82;
  const pool = Object.keys(S.clubs).filter(n => n !== club && S.clubs[n].league !== own && clubStr(n) >= min && clubStr(n) <= maxS)
    .map(n => ({ name: n, str: clubStr(n) }));
  const bonus = S.season.role === 'Stammspieler' ? (S.player.rating - clubStr(club)) * 0.1 : 0;
  const ownStr = clubStr(club) + bonus;
  // Ligaphase: Weiterkommen hängt von der Stärke ab
  const passLeague = sigmoid((ownStr - (comp === 'cl' ? 78 : 72)) / 3.5);
  if (!chance(passLeague)) return { won: false, reached: 'Ligaphase', played: 1 };
  const direct = chance(sigmoid((ownStr - (comp === 'cl' ? 84 : 77)) / 3));
  const rounds = direct ? ['Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'] : ['K.-o.-Playoffs', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'];
  const r = knockout(ownStr, rounds, pool, 4.5);
  r.played += 1;
  return r;
}

function awards(res, L, leagueGoals) {
  const p = S.player;
  if (S.youth || res.games < 10) return;
  const grp = POSITIONS[p.pos].group;
  const stamm = res.role === 'Stammspieler';
  // Torschützenkönig
  if (leagueGoals >= L.scorerBase + randInt(-4, 5)) { res.awards.push(L.topScorer); res.lines.push(`👟 ${L.topScorer} mit ${leagueGoals} Ligatoren!`); }
  // Goldener Schuh
  if ((L.top5 && leagueGoals >= 31 + randInt(0, 5)) || (!L.top5 && leagueGoals >= 40)) { res.awards.push('Goldener Schuh'); res.lines.push('👟 Goldener Schuh als bester Torjäger Europas!'); }
  // Golden Boy
  if (p.age <= 20 && p.rating >= 77 && stamm && chance(0.6)) { res.awards.push('Golden Boy'); res.lines.push('⭐ Golden Boy – bester junger Spieler Europas!'); }
  // Jaschin-Trophäe
  if (grp === 'gk' && p.rating >= 86 && stamm && chance(0.5)) { res.awards.push('Jaschin-Trophäe'); res.lines.push('🧤 Jaschin-Trophäe als bester Torwart der Welt!'); }
  // Spieler der Saison
  if (res.note !== null && res.note <= 2.2 && stamm && chance(0.5)) { res.awards.push(`Spieler der Saison (${L.name})`); res.lines.push(`⭐ Spieler der Saison in der ${L.name}!`); }
  // Ballon d'Or
  let perf = grp === 'att' ? Math.min(6, (res.goals + res.assists * 0.5) / 8)
    : grp === 'mid' ? Math.min(6, (res.goals + res.assists) / 6)
      : clamp((3 - (res.note || 4)) * 3, 0, 5);
  let score = p.rating + p.form * 0.3 + perf + (grp === 'def' ? -2 : grp === 'gk' ? -3 : 0);
  if (res.euroRes && res.euroRes.won && S.europe === 'cl') score += 4;
  else if (res.euroRes && S.europe === 'cl' && ['Halbfinale', 'Finale'].includes(res.euroRes.reached)) score += 1.5;
  if (res.titles.includes(L.champion)) score += 1.5;
  if (!stamm) score -= 6;
  res.bdScore = score;
  if (score >= 101 && chance(0.85) || score >= 99 && chance(0.45)) { res.awards.push("Ballon d'Or"); res.lines.push("🏅 BALLON D'OR! Du bist der beste Fußballer der Welt!"); }
  else if (score >= 95.5) res.lines.push(`Ballon d'Or: Platz ${clamp(Math.round(2 + (101 - score) * 1.5 + rand(0, 2)), 2, 20)}.`);
}

function tournament(res) {
  const summer = S.year + 1;
  if (summer % 2 !== 0) return null;
  const nat = nation();
  const wm = summer % 4 === 2;
  const name = wm ? 'Weltmeisterschaft' : CONTINENTAL[nat.conf].name;
  const title = wm ? 'Weltmeister' : CONTINENTAL[nat.conf].title;
  const p = S.player;
  const out = { name, summer, lines: [] };
  if (p.age < 18 || S.youth || p.rating < nat.str - 8 || (res.games < 8 && p.rating < nat.str)) {
    out.lines.push(`Du wirst für die ${name} ${summer} nicht nominiert.`);
    out.nominated = false;
    return out;
  }
  out.nominated = true;
  const starter = p.rating >= nat.str - 2;
  out.lines.push(`Du stehst im Kader von ${nat.name} für die ${name} ${summer}${starter ? ' – als Stammspieler!' : '.'}`);
  if (wm && !chance(clamp(sigmoid((nat.str - 72) / 3), 0.1, 0.99))) {
    out.lines.push(`${nat.name} verpasst leider die Qualifikation.`);
    return out;
  }
  const pool = NATIONS.filter(n => n.name !== nat.name && (wm || n.conf === nat.conf)).map(n => ({ name: n.name, str: n.str }));
  const rounds = wm ? ['Gruppenphase', 'Sechzehntelfinale', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'] : ['Gruppenphase', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'];
  const r = knockout(nat.str + (starter ? (p.rating - nat.str) * 0.15 : 0), rounds, pool, 5, true);
  const games = starter ? 2 + r.played : randInt(1, 1 + r.played);
  const rate = POSITIONS[p.pos].goals * clamp((p.rating - 60) / 25, 0.2, 1.4);
  const goals = Math.round(games * rate * rand(0.6, 1.3));
  p.caps += games; p.intGoals += goals;
  out.lines.push(`Du machst ${games} Spiele${goals ? ` und schießt ${goals} Tor${goals > 1 ? 'e' : ''}` : ''}.`);
  if (r.won) {
    out.lines.push(`🏆 ${nat.name} ist ${title}! Finale gegen ${r.beat} gewonnen!`);
    S.titles.push(`${title} ${summer}`);
    p.popularity = clamp(p.popularity + 12, 0, 100);
    out.won = true;
  } else {
    out.lines.push(`Aus in der Runde „${r.reached}“ gegen ${r.lostTo}.`);
  }
  return out;
}

// ---------- Transfers ----------
function openTransfer() {
  const p = S.player, res = S.seasonEnd;
  const msgs = [];
  if (p.age >= 41) { retire('Mit 41 Jahren ist Schluss – dein Körper macht nicht mehr mit.'); return; }
  if (S.loan) {
    msgs.push(`Deine Leihe ist beendet. Du kehrst zu ${S.loan.parent} zurück.`);
    S.clubId = S.loan.parent;
    S.loan = null;
  }
  if (S.youth) {
    S.youth = false;
    msgs.push(`Du wirst in den Profikader von ${S.clubId} befördert!`);
  }
  const str = clubStr(S.clubId);
  const released = !res.loan && p.rating < str - 14 && p.age >= 19;
  if (released) msgs.push(`${S.clubId} verlängert deinen Vertrag nicht. Du musst dir einen neuen Verein suchen.`);

  const perf = res.note === null ? 0 : (3.2 - res.note);
  const hi = p.rating + 3 + (perf > 0.6 ? 3 : 0) + (p.popularity > 70 ? 2 : 0);
  const lo = p.rating - (released ? 22 : 12);
  const cands = Object.keys(S.clubs).filter(n => n !== S.clubId && clubStr(n) >= lo && clubStr(n) <= hi)
    .sort((a, b) => clubStr(b) - clubStr(a));
  let k = randInt(1, 3) + (perf > 0.5 ? 1 : 0) + (S.season.transferBoost || 0) - (p.age >= 33 ? 1 : 0);
  if (released) k = Math.max(k, 2);
  const chosen = [];
  const top = cands.slice(0, Math.max(6, Math.ceil(cands.length / 3)));
  for (const n of shuffle(top)) { if (chosen.length >= k) break; chosen.push(n); }
  const offers = chosen.map(n => ({ club: n, loan: false, fee: marketValue() * rand(0.9, 1.5) }));

  // Leihangebote für junge Ergänzungsspieler
  const wasBench = res.role === 'Ergänzungsspieler' || (res.role === 'Rotation' && res.games < 18) || res.role === 'U19';
  if (!released && p.age <= 22 && wasBench) {
    const loanCands = shuffle(Object.keys(S.clubs).filter(n => n !== S.clubId && clubStr(n) >= p.rating - 7 && clubStr(n) <= p.rating + 1));
    loanCands.slice(0, randInt(1, 2)).forEach(n => offers.push({ club: n, loan: true, fee: 0 }));
  }
  offers.sort((a, b) => clubStr(b.club) - clubStr(a.club));
  if (released && !offers.length) {
    retire('Kein Verein will dich mehr verpflichten. Du beendest deine Karriere.');
    return;
  }
  S.offers = { list: offers, released, msgs };
  S.phase = 'transfer';
}

function acceptOffer(o) {
  if (o) {
    if (o.loan) S.loan = { parent: S.clubId };
    S.clubId = o.club;
    S.player.trust = 45;
  }
  S.offers = null;
  S.year++;
  startSeason();
}

function retire(reason) {
  S.phase = 'retired';
  S.retireReason = reason;
  S.offers = null;
}

// ---------- Rendering ----------
function render() {
  handlers = [];
  const root = app();
  let html = '';
  if (!S) html = renderStart();
  else if (S.phase === 'create') html = renderCreate();
  else if (S.phase === 'academy') html = renderAcademy();
  else {
    html = renderPlayerCard();
    if (S.phase === 'preseason') html += renderPreseason();
    else if (S.phase === 'season') html += S.current.type === 'event' ? renderEvent() : renderMatch();
    else if (S.phase === 'seasonEnd') html += renderSeasonEnd();
    else if (S.phase === 'transfer') html += renderTransfer();
    else if (S.phase === 'retired') html = renderRetired();
  }
  root.innerHTML = html;
  if (S && S.phase !== 'create') save();
  window.scrollTo({ top: 0 });
}

function renderStart() {
  const saved = loadSave();
  return `
  <section class="hero">
    <div class="ball">⚽</div>
    <h1>Fußballkarriere</h1>
    <p class="lead">Vom Nachwuchstalent zur Legende. Triff Entscheidungen, spiele Schlüsselszenen und gewinne Titel mit echten Vereinen aus ganz Europa.</p>
    <div class="actions">
      ${saved && saved.phase !== 'retired' ? btn(`Karriere fortsetzen (${esc(saved.player.name)}, ${saved.player.age} J.)`, () => { S = saved; render(); }, 'primary') : ''}
      ${btn('Neue Karriere starten', () => { S = { phase: 'create' }; render(); }, saved && saved.phase !== 'retired' ? '' : 'primary')}
    </div>
  </section>`;
}

function renderCreate() {
  const natOpts = NATIONS.map(n => `<option${n.name === 'Deutschland' ? ' selected' : ''}>${esc(n.name)}</option>`).join('');
  const posOpts = Object.entries(POSITIONS).map(([k, v]) => `<option value="${k}"${k === 'ST' ? ' selected' : ''}>${v.name}</option>`).join('');
  return `
  <section class="card">
    <h2>Dein Spieler</h2>
    <label>Name<input id="f-name" maxlength="30" placeholder="z. B. Max Müller"></label>
    <label>Nationalität<select id="f-nation">${natOpts}</select></label>
    <label>Position<select id="f-pos">${posOpts}</select></label>
    <label>Rückennummer<input id="f-num" type="number" min="1" max="99" value="${randInt(7, 30)}"></label>
    <p class="err" id="f-err"></p>
    <div class="actions">
      ${btn('Los geht\'s', () => {
        const name = document.getElementById('f-name').value.trim();
        const num = parseInt(document.getElementById('f-num').value, 10);
        if (!name) { document.getElementById('f-err').textContent = 'Bitte gib einen Namen ein.'; return; }
        if (!(num >= 1 && num <= 99)) { document.getElementById('f-err').textContent = 'Die Rückennummer muss zwischen 1 und 99 liegen.'; return; }
        newGame(name, document.getElementById('f-nation').value, document.getElementById('f-pos').value, num);
        render();
      }, 'primary')}
      ${btn('Zurück', () => { S = null; render(); })}
    </div>
  </section>`;
}

function renderAcademy() {
  const p = S.player;
  const stars = Math.round((S.scoutGuess - 65) / 7);
  const cards = S.academyOffers.map(n => `
    <div class="offer">
      ${crest(n)}
      <div class="offer-info"><strong>${esc(n)}</strong><small>${esc(clubLeague(n).name)} · Stärke ${clubStr(n)}</small></div>
      ${btn('Unterschreiben', () => { S.clubId = n; startSeason(); render(); }, 'primary small')}
    </div>`).join('');
  return `
  <section class="card">
    <h2>Willkommen, ${esc(p.name)}!</h2>
    <p>Du bist 17 Jahre alt, ${esc(POSITIONS[p.pos].name)} aus ${esc(p.nation)} mit der Nummer ${p.number}. Deine aktuelle Stärke: <b>${Math.round(p.rating)}</b>.</p>
    <p>Die Scouts schätzen dein Talent auf <span class="stars">${'★'.repeat(clamp(stars, 1, 5))}${'☆'.repeat(5 - clamp(stars, 1, 5))}</span>.</p>
    <p>Drei Nachwuchsleistungszentren wollen dich für ihre U19 verpflichten:</p>
    <div class="offers">${cards}</div>
  </section>`;
}

function bar(label, v, max, cls = '') {
  const pct = clamp((v / max) * 100, 0, 100);
  return `<div class="bar ${cls}"><span>${label}</span><div class="track"><div class="fill" style="width:${pct}%"></div></div></div>`;
}

function renderPlayerCard() {
  const p = S.player;
  const r = Math.round(p.rating);
  const club = S.clubId;
  const L = club ? clubLeague(club) : null;
  return `
  <section class="player">
    <div class="rating ${r >= 85 ? 'gold' : r >= 75 ? 'silver' : 'bronze'}"><b>${r}</b><small>${p.pos}</small></div>
    <div class="pinfo">
      <h2>${esc(p.name)} <span class="num">#${p.number}</span></h2>
      <p>${p.age} Jahre · ${esc(p.nation)} · ${esc(POSITIONS[p.pos].name)}</p>
      ${club ? `<p class="clubline">${crest(club)} ${esc(club)}${S.loan ? ' <em>(Leihe)</em>' : ''} · ${S.youth ? 'U19' : esc(L.name)}</p>` : ''}
      <p class="mv">Saison ${seasonLabel(S.year)} · Marktwert ${money(marketValue())}</p>
    </div>
    <div class="bars">
      ${bar('Form', p.form + 10, 20, 'form')}
      ${bar('Vertrauen', p.trust, 100)}
      ${bar('Beliebtheit', p.popularity, 100)}
    </div>
  </section>`;
}

function renderPreseason() {
  const se = S.season, own = S.clubId, L = clubLeague(own);
  const table = clubsIn(L.id).sort((a, b) => clubStr(b) - clubStr(a));
  const exp = table.indexOf(own) + 1;
  const comps = S.youth ? ['U19-Liga'] : [L.name, L.cup, S.europe === 'cl' ? 'Champions League' : S.europe === 'el' ? 'Europa League' : null].filter(Boolean);
  const roleText = {
    'Stammspieler': 'Der Trainer plant fest mit dir – du bist Stammspieler!',
    'Rotation': 'Du bist Rotationsspieler und musst dich im Training beweisen.',
    'Ergänzungsspieler': 'Du bist nur Ergänzungsspieler. Nutze jede Chance!',
    'U19': 'Du spielst in der U19 und willst dich für die Profis empfehlen.',
  }[se.role];
  return `
  <section class="card">
    <h2>Saisonvorschau ${seasonLabel(S.year)}</h2>
    <p>${roleText}</p>
    <ul class="facts">
      <li><span>Rolle</span><b>${se.role}</b></li>
      <li><span>Vereinsstärke</span><b>${clubStr(own)}</b></li>
      ${S.youth ? '' : `<li><span>Erwartete Platzierung</span><b>${exp}. Platz</b></li>`}
      <li><span>Wettbewerbe</span><b>${comps.map(esc).join(', ')}</b></li>
    </ul>
    <div class="actions">${btn('Saison starten', () => { nextStep(); render(); }, 'primary')}</div>
  </section>
  ${renderHistory()}`;
}

function stepHeader() {
  const se = S.season;
  const dots = STEPS.map((s, i) => `<span class="dot ${i < se.step ? 'done' : i === se.step ? 'now' : ''}"></span>`).join('');
  return `<div class="stephead"><span>${STEPS[se.step].label}</span><span class="dots">${dots}</span></div>`;
}

function continueBtn() {
  return btn('Weiter', () => { S.season.step++; S.current = null; nextStep(); render(); }, 'primary');
}

function renderEvent() {
  const c = S.current;
  const ev = EVENTS.find(e => e.id === c.id);
  const opts = c.result ? '' : ev.options.map((o, i) => btn(esc(o.label), () => {
    c.result = o.run();
    c.chosen = i;
    render();
  })).join('');
  return `
  <section class="card">
    ${stepHeader()}
    <h2>${esc(ev.title)}</h2>
    <p>${esc(c.text)}</p>
    ${c.result ? `<div class="result"><p class="chosen">Deine Entscheidung: ${esc(ev.options[c.chosen].label)}</p><div>${c.result}</div></div><div class="actions">${continueBtn()}</div>` : `<div class="choices">${opts}</div>`}
  </section>`;
}

function renderMatch() {
  const c = S.current;
  const homeName = c.home ? S.clubId : c.opp, awayName = c.home ? c.opp : S.clubId;
  const score = c.final || (c.home ? `${c.a}:${c.b}` : `${c.b}:${c.a}`);
  const opts = c.result ? '' : c.options.map((o, i) => btn(`${esc(o.label)}${o.p !== undefined ? `<small>${Math.round(o.p * 100)} % Erfolg</small>` : ''}`, () => {
    resolveMatch(i);
    render();
  })).join('');
  return `
  <section class="card">
    ${stepHeader()}
    <div class="scoreboard">
      <div class="comp">${esc(c.comp)}</div>
      <div class="teams">
        <div class="team">${crest(homeName)}<span>${esc(homeName)}</span></div>
        <div class="score">${score}<small>${c.result ? 'Abpfiff' : c.minute + '. Minute'}</small></div>
        <div class="team">${crest(awayName)}<span>${esc(awayName)}</span></div>
      </div>
    </div>
    <p class="situation">${esc(c.situation)}</p>
    ${c.result ? `<div class="result"><p class="chosen">Deine Entscheidung: ${esc(c.options[c.chosen].label)}</p>${c.result}</div><div class="actions">${continueBtn()}</div>` : `<div class="choices">${opts}</div>`}
  </section>`;
}

function renderSeasonEnd() {
  const r = S.seasonEnd;
  const diff = r.ratingAfter - r.ratingBefore;
  const gk = S.player.pos === 'TW' || r.cleanSheets > 0;
  const table = r.role === 'U19' ? '' : `
    <details class="table"><summary>Abschlusstabelle ${esc(r.league)}</summary>
      <ol>${r.table.map(t => `<li class="${t.name === r.club ? 'me' : ''}">${crest(t.name)}<span>${esc(t.name)}</span><b>${t.pts}</b></li>`).join('')}</ol>
    </details>`;
  const t = r.tournament;
  return `
  <section class="card">
    <h2>Saisonbilanz ${seasonLabel(r.year)}</h2>
    <div class="stats">
      <div><b>${r.games}</b><span>Spiele</span></div>
      <div><b>${r.goals}</b><span>Tore</span></div>
      <div><b>${r.assists}</b><span>Vorlagen</span></div>
      ${gk ? `<div><b>${r.cleanSheets}</b><span>Zu null</span></div>` : ''}
      <div><b>${r.note === null ? '–' : fmt2(r.note)}</b><span>Ø Note</span></div>
      <div><b>${r.ratingAfter}</b><span>Stärke <em class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : ''}${diff}</em></span></div>
    </div>
    ${r.scenes.length ? `<h3>Deine Schlüsselszenen</h3><ul class="lines">${r.scenes.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    <h3>Wettbewerbe &amp; Auszeichnungen</h3>
    <ul class="lines">${r.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    ${table}
    ${t ? `<h3>Sommer ${t.summer}: ${esc(t.name)}</h3><ul class="lines">${t.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    <div class="actions">${btn('Weiter zum Transferfenster', () => { openTransfer(); render(); }, 'primary')}</div>
  </section>`;
}

function renderTransfer() {
  const o = S.offers, p = S.player;
  const list = o.list.map(of => {
    const str = clubStr(of.club);
    const role = roleFor(p.rating, str, 45);
    return `
    <div class="offer">
      ${crest(of.club)}
      <div class="offer-info"><strong>${esc(of.club)}</strong>
        <small>${esc(clubLeague(of.club).name)} · Stärke ${str} · voraussichtlich ${role}</small>
        <small>${of.loan ? 'Leihe für 1 Saison' : `Ablöse: ${money(of.fee)}`}</small>
      </div>
      ${btn(of.loan ? 'Leihe annehmen' : 'Wechseln', () => acceptOffer(of) || render(), 'primary small')}
    </div>`;
  }).join('');
  const stayRole = roleFor(p.rating, clubStr(S.clubId), p.trust);
  return `
  <section class="card">
    <h2>Transferfenster – Sommer ${S.year + 1}</h2>
    ${o.msgs.map(m => `<p class="note">${esc(m)}</p>`).join('')}
    ${o.list.length ? `<p>Diese Vereine wollen dich verpflichten:</p><div class="offers">${list}</div>` : '<p>Diesmal gibt es keine Angebote für dich.</p>'}
    <div class="actions">
      ${o.released ? '' : btn(`Bei ${esc(S.clubId)} bleiben (${stayRole})`, () => acceptOffer(null) || render(), o.list.length ? '' : 'primary')}
      ${p.age >= 33 ? btn('Karriere beenden', () => { retire('Du hast dich entschieden, deine Karriere zu beenden.'); render(); }, 'danger') : ''}
    </div>
  </section>
  ${renderHistory()}`;
}

function totals() {
  const pro = S.history.filter(h => !h.youth);
  return {
    seasons: pro.length,
    games: pro.reduce((s, h) => s + h.games, 0),
    goals: pro.reduce((s, h) => s + h.goals, 0),
    assists: pro.reduce((s, h) => s + h.assists, 0),
  };
}

function renderHistory() {
  if (!S.history.length) return '';
  const rows = S.history.map(h => `
    <tr><td>${seasonLabel(h.year)}</td><td>${h.age}</td><td class="club">${esc(h.club)}${h.loan ? ' (L)' : ''}${h.youth ? ' (U19)' : ''}</td>
    <td>${h.games}</td><td>${h.goals}</td><td>${h.assists}</td><td>${h.note === null ? '–' : fmt2(h.note)}</td><td>${h.rating}</td><td>${h.titles ? '🏆'.repeat(Math.min(h.titles, 4)) : ''}</td></tr>`).join('');
  const t = totals();
  return `
  <section class="card">
    <details${S.phase === 'retired' ? ' open' : ''}><summary>Karriereverlauf (${t.games} Spiele, ${t.goals} Tore, ${t.assists} Vorlagen)</summary>
      <div class="scroll"><table>
        <thead><tr><th>Saison</th><th>Alter</th><th>Verein</th><th>Sp</th><th>T</th><th>V</th><th>Note</th><th>Stä</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      ${S.titles.length ? `<h3>Titel (${S.titles.length})</h3><ul class="lines">${S.titles.map(x => `<li>🏆 ${esc(x)}</li>`).join('')}</ul>` : ''}
      ${S.awards.length ? `<h3>Auszeichnungen (${S.awards.length})</h3><ul class="lines">${S.awards.map(x => `<li>⭐ ${esc(x)}</li>`).join('')}</ul>` : ''}
    </details>
  </section>`;
}

function legacy() {
  const t = totals();
  const bd = S.awards.filter(a => a.startsWith("Ballon d'Or")).length;
  const score = S.peak * 1.2 + S.titles.length * 3 + S.awards.length * 4 + bd * 15 + t.goals * 0.05 + S.player.caps * 0.1;
  if (score >= 190) return ['🐐', 'G.O.A.T.', 'Du bist einer der größten Spieler aller Zeiten.'];
  if (score >= 150) return ['👑', 'Weltstar', 'Deine Karriere wird noch Jahrzehnte später erzählt.'];
  if (score >= 125) return ['⭐', 'Nationalheld', 'Du hast Fußballgeschichte in deinem Land geschrieben.'];
  if (score >= 105) return ['💪', 'Solider Profi', 'Eine starke Karriere, auf die du stolz sein kannst.'];
  return ['🙂', 'Wandervogel', 'Nicht jeder wird ein Superstar – aber du hast deinen Traum gelebt.'];
}

function renderRetired() {
  const p = S.player, t = totals();
  const [icon, title, text] = legacy();
  return `
  <section class="hero small">
    <div class="ball">${icon}</div>
    <h1>${esc(title)}</h1>
    <p class="lead">${esc(p.name)} beendet die Karriere mit ${p.age} Jahren. ${esc(S.retireReason || '')}</p>
    <p>${esc(text)}</p>
  </section>
  <section class="card">
    <div class="stats">
      <div><b>${t.seasons}</b><span>Profisaisons</span></div>
      <div><b>${t.games}</b><span>Spiele</span></div>
      <div><b>${t.goals}</b><span>Tore</span></div>
      <div><b>${t.assists}</b><span>Vorlagen</span></div>
      <div><b>${S.peak}</b><span>Höchste Stärke</span></div>
      <div><b>${p.caps}</b><span>Länderspiele</span></div>
    </div>
    <p>Vereine: ${S.clubsPlayed.map(esc).join(' → ')}</p>
    <div class="actions">${btn('Neue Karriere starten', () => { deleteSave(); S = { phase: 'create' }; render(); }, 'primary')}</div>
  </section>
  ${renderHistory()}`;
}

// ---------- Start ----------
window.addEventListener('DOMContentLoaded', () => {
  app().addEventListener('click', e => {
    const b = e.target.closest('[data-h]');
    if (!b) return;
    const fn = handlers[+b.dataset.h];
    if (fn) fn();
  });
  render();
});
