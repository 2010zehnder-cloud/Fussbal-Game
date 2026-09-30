'use strict';

const SAVE_KEY = 'fussballkarriere-save-v2';
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
const confOf = L => L.conf || 'UEFA';
const euroName = (club = S.clubId, comp = S.europe) => comp ? CLUB_COMPS[confOf(clubLeague(club))][comp] : null;
const seasonLabel = y => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;

function marketValue(p = S.player) {
  const ageF = p.age <= 23 ? 1.3 : p.age <= 27 ? 1.1 : p.age <= 30 ? 0.8 : p.age <= 32 ? 0.5 : 0.25;
  return Math.min(250, 5 * Math.exp((p.rating - 70) / 5.9) * ageF);
}
function money(mio) {
  const neg = mio < 0 ? '−' : '';
  const a = Math.abs(mio);
  if (a < 1) return `${neg}${Math.max(1, Math.round(a * 1000))} Tsd. €`;
  return `${neg}${a < 10 ? fmt1(a) : Math.round(a)} Mio. €`;
}

// Jahresgehalt (brutto, Mio. €) je nach Stärke, Liga und Rolle
function salaryFor(rating, club, role) {
  const wage = LEAGUE_WAGE[S.clubs[club].league] || 0.5;
  const roleF = { 'Stammspieler': 1, 'Rotation': 0.8, 'Ergänzungsspieler': 0.65 }[role] || 0.8;
  return Math.max(0.03, 0.08 * Math.exp((rating - 60) / 6.5) * wage * roleF);
}
function sponsorIncome() {
  const p = S.player;
  return clamp(Math.pow(p.popularity / 100, 2) * 0.4 * Math.exp((p.rating - 70) / 7), 0, 40);
}
function ownedCount(id) { return (S.owned && S.owned[id]) || 0; }

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
  devBonus: 'Entwicklung', injuredGames: 'Ausfall (Spiele)', goals: 'Tore', assists: 'Vorlagen', money: 'Vermögen',
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
    else if (k === 'money') S.money += v;
    const good = k === 'injuryProne' || k === 'injuredGames' ? v < 0 : v > 0;
    const shown = k === 'devBonus' ? (v > 0 ? '▲' : '▼') : k === 'money' ? (v > 0 ? '+' : '−') + money(Math.abs(v)) : (v > 0 ? '+' : '−') + Math.abs(v);
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
    money: 0.005, earned: 0, contract: { salary: 0.015, years: 1 }, owned: {},
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

// ---------- Trainingsschwerpunkt ----------
const FOCUS = {
  balanced: { name: 'Ausgewogen', desc: 'Kein besonderer Schwerpunkt.' },
  shooting: { name: 'Abschluss', gkName: 'Reflexe', desc: 'Mehr Tore und Vorlagen.', gkDesc: 'Mehr Spiele ohne Gegentor.' },
  athletic: { name: 'Athletik', desc: 'Dein Verletzungsrisiko sinkt deutlich.' },
  technique: { name: 'Technik', desc: 'Du entwickelst dich schneller.' },
  tactics: { name: 'Taktik', desc: 'Videoanalyse mit dem Trainer: mehr Vertrauen.' },
  recovery: { name: 'Regeneration', desc: 'Bessere Form, kürzere Ausfälle.' },
};
const focusOf = () => (S.season && S.season.focus) || 'balanced';

// ---------- Privatleben ----------
const PARTNER_NAMES = ['Lena', 'Sophie', 'Mia', 'Laura', 'Emma', 'Anna', 'Lea', 'Julia', 'Jonas', 'Luca', 'Noah', 'Elias'];
function life() {
  if (!S.life) S.life = { partner: null, married: false, kids: 0 };
  return S.life;
}
function lifeText() {
  const l = life();
  if (!l.partner) return 'Single';
  let t = l.married ? `Verheiratet mit ${l.partner}` : `In einer Beziehung mit ${l.partner}`;
  if (l.kids) t += `, ${l.kids} ${l.kids === 1 ? 'Kind' : 'Kinder'}`;
  return t;
}

// ---------- Saisonablauf ----------
const STEPS = [
  { type: 'event', label: 'August – Saisonstart' },
  { type: 'match', label: 'September – Topspiel' },
  { type: 'event', label: 'November – Herbst' },
  { type: 'match', label: 'Dezember – Pokal & Europa' },
  { type: 'event', label: 'Februar – Rückrunde' },
  { type: 'match', label: 'Mai – Saisonfinale' },
];

function startSeason() {
  const p = S.player;
  const str = clubStr(S.clubId);
  const role = S.youth ? 'U19' : roleFor(p.rating, str, p.trust);
  S.season = { role, focus: 'balanced', devBonus: 0, injuredGames: 0, extraGoals: 0, extraAssists: 0, usedEvents: [], transferBoost: 0, scenes: [], step: 0 };
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
  const C = CLUB_COMPS[confOf(L)];
  if (idx < L.cl) return 'cl';
  if (C.el && idx < L.cl + L.el) return 'el';
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

// Spielszenen je Positionsgruppe. p = Erfolgschance, q = Qualität des Spielers (0–1,2)
const SCENES = {
  att: [
    q => ({
      situation: 'Du bekommst den Ball 18 Meter vor dem Tor. Ein Verteidiger rückt heraus, links läuft ein Mitspieler frei.',
      options: [
        { label: 'Direkt abziehen', p: 0.25 + q * 0.3, kind: 'goal' },
        { label: 'Den Mitspieler bedienen', p: 0.42 + q * 0.25, kind: 'assist' },
        { label: 'Ins Dribbling gehen', p: 0.18 + q * 0.32, kind: 'goal', bonus: true },
      ],
    }),
    () => ({
      situation: 'Foul an dir im Strafraum – Elfmeter! Du schnappst dir den Ball. Wohin schießt du?',
      options: [
        { label: 'Links unten', kind: 'shoot', dir: 0 },
        { label: 'Frech in die Mitte', kind: 'shoot', dir: 1 },
        { label: 'Rechts oben', kind: 'shoot', dir: 2 },
      ],
    }),
    q => ({
      situation: 'Freistoß aus 20 Metern, halbrechts. Die Mauer steht, der Torwart schreit Kommandos.',
      options: [
        { label: 'Über die Mauer zirkeln', p: 0.12 + q * 0.3, kind: 'goal', bonus: true },
        { label: 'Scharf ins Torwarteck', p: 0.18 + q * 0.25, kind: 'goal' },
        { label: 'Kurz ablegen', p: 0.35 + q * 0.2, kind: 'assist' },
      ],
    }),
    q => ({
      situation: 'Flanke von rechts! Du stehst am langen Pfosten, der Verteidiger klebt an dir.',
      options: [
        { label: 'Volley nehmen', p: 0.15 + q * 0.3, kind: 'goal', bonus: true },
        { label: 'Kopfball aufs Tor', p: 0.22 + q * 0.28, kind: 'goal' },
        { label: 'Quer auf den Mitspieler köpfen', p: 0.3 + q * 0.25, kind: 'assist' },
      ],
    }),
  ],
  mid: [
    q => ({
      situation: 'Ballgewinn im Mittelfeld! Vor dir öffnet sich Raum für einen Konter.',
      options: [
        { label: 'Steilpass in die Spitze', p: 0.35 + q * 0.3, kind: 'assist' },
        { label: 'Selbst durchlaufen und schießen', p: 0.18 + q * 0.28, kind: 'goal' },
        { label: 'Tempo rausnehmen, Ballbesitz sichern', p: 0.85, kind: 'safe' },
      ],
    }),
    q => ({
      situation: 'Ein abgewehrter Ball springt dir 25 Meter vor dem Tor vor die Füße.',
      options: [
        { label: 'Volley aus der Distanz', p: 0.1 + q * 0.28, kind: 'goal', bonus: true },
        { label: 'Annehmen und in die Gasse spielen', p: 0.3 + q * 0.25, kind: 'assist' },
        { label: 'Flanke in den Strafraum', p: 0.25 + q * 0.22, kind: 'assist' },
      ],
    }),
    q => ({
      situation: 'Freistoß aus 22 Metern, zentral. Alle schauen auf dich.',
      options: [
        { label: 'Direkt schießen', p: 0.12 + q * 0.28, kind: 'goal', bonus: true },
        { label: 'Hoch in den Strafraum flanken', p: 0.28 + q * 0.22, kind: 'assist' },
        { label: 'Einstudierte Variante spielen', p: 0.2 + q * 0.3, kind: 'assist' },
      ],
    }),
    q => ({
      situation: 'Der Gegner kontert mit drei gegen zwei. Du sprintest zurück.',
      options: [
        { label: 'In den Passweg grätschen', p: 0.3 + q * 0.35, kind: 'stop', risky: true, okText: 'Pass abgefangen! Du leitest sofort den nächsten Angriff ein.' },
        { label: 'Den Ballführenden stellen', p: 0.35 + q * 0.3, kind: 'stop', okText: 'Du verzögerst lange genug – die Abwehr ist wieder sortiert.' },
        { label: 'Taktisches Foul', p: 0.9, kind: 'foul' },
      ],
    }),
  ],
  def: [
    q => ({
      situation: 'Der gegnerische Stürmer ist durch und läuft allein auf dich zu. Du bist der letzte Mann!',
      options: [
        { label: 'Grätsche!', p: 0.3 + q * 0.35, kind: 'stop', risky: true },
        { label: 'Stellung halten und abdrängen', p: 0.4 + q * 0.25, kind: 'stop' },
        { label: 'Taktisches Foul', p: 0.9, kind: 'foul' },
      ],
    }),
    q => ({
      situation: 'Ecke für euch in der Nachspielzeit! Du gehst mit nach vorne.',
      options: [
        { label: 'Kopfball aufs Tor', p: 0.18 + q * 0.25, kind: 'goal', bonus: true },
        { label: 'Ball für den Mitspieler zurücklegen', p: 0.25 + q * 0.2, kind: 'assist' },
        { label: 'Hinten bleiben und absichern', p: 0.85, kind: 'safe' },
      ],
    }),
    q => ({
      situation: 'Gefährliche Flanke von links, der Stürmer steigt hinter dir hoch.',
      options: [
        { label: 'Kopfball-Duell annehmen', p: 0.35 + q * 0.35, kind: 'stop', okText: 'Du gewinnst das Luftduell und köpfst den Ball weit weg!' },
        { label: 'Den Ball ins Aus klären', p: 0.5 + q * 0.25, kind: 'stop', okText: 'Ecke statt Gefahr – das reicht. Ihr übersteht die Situation.' },
        { label: 'Auf Abseits spekulieren', p: 0.3 + q * 0.2, kind: 'stop', okText: 'Die Fahne geht hoch – Abseits! Genau richtig gelesen.' },
      ],
    }),
  ],
  gk: [
    () => ({
      situation: 'Elfmeter gegen euch! Der Schütze legt sich den Ball zurecht. Wohin springst du?',
      options: [
        { label: 'Links', kind: 'save', dir: 0 },
        { label: 'Mitte', kind: 'save', dir: 1 },
        { label: 'Rechts', kind: 'save', dir: 2 },
      ],
    }),
    q => ({
      situation: 'Ein Stürmer läuft allein auf dich zu!',
      options: [
        { label: 'Rauslaufen und Winkel verkürzen', p: 0.35 + q * 0.35, kind: 'stop', risky: true, okText: 'Du machst dich riesig und hältst den Ball fest!' },
        { label: 'Auf der Linie bleiben', p: 0.28 + q * 0.3, kind: 'stop', okText: 'Reflex! Du lenkst den Schuss mit den Fingerspitzen um den Pfosten.' },
        { label: 'Früh abtauchen', p: 0.25 + q * 0.35, kind: 'stop', okText: 'Du spekulierst richtig und begräbst den Ball unter dir.' },
      ],
    }),
    q => ({
      situation: 'Hohe Flanke in den Fünfmeterraum, drei Spieler rennen auf den Ball zu.',
      options: [
        { label: 'Rauskommen und fangen', p: 0.35 + q * 0.45, kind: 'stop', okText: 'Sicher gefangen – das ganze Stadion atmet auf.' },
        { label: 'Den Ball wegfausten', p: 0.5 + q * 0.3, kind: 'stop', okText: 'Du faustest den Ball 30 Meter weit aus der Gefahrenzone.' },
        { label: 'Auf der Linie bleiben', p: 0.3 + q * 0.3, kind: 'stop', okText: 'Der Kopfball kommt – und du reißt die Arme hoch. Gehalten!' },
      ],
    }),
  ],
};

function setupMatch() {
  const p = S.player, se = S.season;
  const own = S.clubId;
  const L = clubLeague(own);
  let comp = L.name, opp;
  const matchNo = STEPS.slice(0, se.step).filter(st => st.type === 'match').length; // 0, 1, 2
  if (S.youth) {
    comp = 'U19-Liga';
    opp = pick(clubsIn(L.id).filter(n => n !== own));
  } else if (matchNo === 1 && S.europe && chance(0.65)) {
    comp = euroName();
    const pool = euroPool(own, S.europe).sort((x, y) => y.str - x.str);
    opp = pick(pool.slice(0, Math.max(3, Math.ceil(pool.length / 3)))).name;
  } else if (matchNo === 1) {
    comp = L.cup;
    opp = pick(Object.keys(S.clubs).filter(n => n !== own && clubLeague(n).country === L.country));
  } else {
    const others = clubsIn(L.id).filter(n => n !== own).sort((a, b) => clubStr(b) - clubStr(a));
    opp = pick(others.slice(0, 6));
  }
  const home = chance(0.5);
  const minute = randInt(62, 89);
  const a = randInt(0, 2);
  const b = clamp(a + randInt(-1, 1), 0, 3);
  const scene = pick(SCENES[POSITIONS[p.pos].group])(quality());
  S.current = {
    type: 'match', ctx: {}, result: null, comp, opp, home, minute, a, b, situation: scene.situation,
    options: scene.options.map(o => ({ ...o, p: o.p !== undefined ? clamp(o.p, 0.05, 0.92) : undefined })),
  };
}

function quality() {
  const p = S.player;
  return clamp((p.rating - 50) / 40 + p.form / 40, 0, 1.2);
}

function resolveMatch(i) {
  const c = S.current, o = c.options[i], p = S.player;
  let us = c.a, them = c.b, text, eff;
  if (o.kind === 'shoot') {
    const keeper = randInt(0, 2);
    const scored = keeper !== o.dir ? chance(0.9 + quality() * 0.08) : chance(0.12 + quality() * 0.12);
    if (scored) { us++; text = `TOOOR! Der Torwart springt ${['nach links', 'nicht', 'nach rechts'][keeper]}${keeper === 1 ? ' weg' : ''} – eiskalt verwandelt zum ${us}:${them}. Endstand ${us}:${them}.`; eff = { form: 3, trust: 3, popularity: 4, goals: 1 }; }
    else { text = `Der Torwart ahnt die Ecke und hält! Endstand ${us}:${them}.`; eff = { form: -2, trust: -2, popularity: -2 }; }
  } else if (o.kind === 'save') {
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
    } else if (o.kind === 'stop') {
      if (ok) { text = `${o.okText || 'Ball erobert! Die Fans feiern deine Rettungstat.'} Endstand ${us}:${them}.`; eff = { form: 2, trust: 4, popularity: o.risky ? 5 : 3 }; }
      else if (o.risky && chance(0.35)) { them++; text = `Zu spät! Rote Karte und Elfmeter – ${us}:${them}. Du bist für 3 Spiele gesperrt.`; eff = { form: -3, trust: -5, injuredGames: 3 }; }
      else { them++; text = `Nicht zu verhindern – der Ball ist drin. Endstand ${us}:${them}.`; eff = { form: -2, trust: -2 }; }
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
  const focus = focusOf();
  if (focus === 'recovery') se.injuredGames = Math.round(se.injuredGames * 0.6);
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
  const shootF = focus === 'shooting' ? 1.2 : 1;
  const goals = Math.max(0, Math.round(games * P.goals * q * shootF * rand(0.8, 1.2)) + se.extraGoals);
  const leagueGoals = games ? Math.round(goals * leagueGames / games) : 0;
  const assists = Math.max(0, Math.round(games * P.assists * q * (focus === 'shooting' ? 1.1 : 1) * rand(0.8, 1.2)) + se.extraAssists);
  const cleanSheets = P.group === 'gk' ? Math.round(games * clamp(0.2 + (refStr - 70) * 0.015 + (p.rating - 70) * 0.006 + (focus === 'shooting' ? 0.04 : 0), 0.08, 0.6)) : 0;
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
    else if (pos <= L.cl) res.lines.push(`Qualifiziert für: ${CLUB_COMPS[confOf(L)].cl}.`);
    else if (CLUB_COMPS[confOf(L)].el && pos <= L.cl + L.el) res.lines.push(`Qualifiziert für: ${CLUB_COMPS[confOf(L)].el}.`);
  }
  if (cupRes) {
    if (cupRes.won) { res.titles.push(`${L.cup}-Sieger`); res.lines.push(`🏆 ${L.cup}-Sieger! Finale gegen ${cupRes.beat} gewonnen.`); }
    else res.lines.push(`${L.cup}: Aus in der Runde „${cupRes.reached}“ gegen ${cupRes.lostTo}.`);
  }
  if (euroRes) {
    const name = euroName();
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
  p.trust = Math.round(p.trust + (50 - p.trust) * 0.15 + (focus === 'tactics' ? 6 : 0));
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
  g += se.devBonus + rand(-1.2, 1.2) + (note !== null && note < 2.3 ? 0.8 : 0) + (focus === 'technique' ? 0.7 : 0);
  if (se.injuredGames > 12) g -= 1;
  p.rating = clamp(p.rating + g, 35, 99);
  S.peak = Math.max(S.peak, Math.round(p.rating));
  res.ratingBefore = Math.round(before);
  res.ratingAfter = Math.round(p.rating);
  p.form = Math.round(p.form * 0.4);
  p.injuryProne = clamp(p.injuryProne + (a >= 30 ? 1.5 : -0.5) - (focus === 'athletic' ? 4 : 0), 0, 40);

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

  // Finanzen: Gehalt, Prämien und Sponsoren (nach 45 % Steuern), minus Unterhalt
  const c = S.contract;
  const gross = c.salary;
  const bonusPay = (res.titles.length * 0.15 + res.awards.length * 0.1 + (res.tournament && res.tournament.won ? 0.2 : 0)) * gross;
  const sponsor = youth ? 0 : sponsorIncome();
  const upkeep = SHOP.reduce((sum, it) => sum + ownedCount(it.id) * it.price * it.upkeep, 0);
  const fund = ownedCount('fund') * rand(-0.08, 0.14);
  const agentFee = S.agent ? gross * 0.1 : 0;
  const net = (gross + bonusPay + sponsor - agentFee) * 0.55;
  S.money += net - upkeep + fund;
  S.earned += net;
  c.years -= 1;
  res.finance = { gross, bonusPay, sponsor, agentFee, net, upkeep, fund, total: net - upkeep + fund };

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

// Mögliche Gegner im internationalen Wettbewerb des eigenen Kontinentalverbands
function euroPool(club, comp) {
  const L = clubLeague(club), conf = confOf(L), C = CLUB_COMPS[conf];
  const min = comp === 'cl' ? C.clMin : C.elMin, maxS = comp === 'cl' ? 99 : C.elMax;
  // In Europa trifft man keine Klubs aus der eigenen Liga; anderswo gibt es zu wenige spielbare Ligen dafür
  const pool = Object.keys(S.clubs).filter(n => n !== club && confOf(clubLeague(n)) === conf
    && (conf !== 'UEFA' || S.clubs[n].league !== L.id) && clubStr(n) >= min && clubStr(n) <= maxS)
    .map(n => ({ name: n, str: clubStr(n) }));
  for (const [n, str] of EXTRA_OPPONENTS[conf] || []) if (comp === 'cl' || str <= maxS) pool.push({ name: n, str });
  return pool;
}

function europeRun(club, comp) {
  const pool = euroPool(club, comp);
  const avg = pool.reduce((s, x) => s + x.str, 0) / Math.max(1, pool.length);
  const bonus = S.season.role === 'Stammspieler' ? (S.player.rating - clubStr(club)) * 0.1 : 0;
  const ownStr = clubStr(club) + bonus;
  // Ligaphase: Weiterkommen hängt von der Stärke ab
  const passLeague = sigmoid((ownStr - (avg - 3)) / 3.5);
  if (!chance(passLeague)) return { won: false, reached: comp === 'cl' && confOf(clubLeague(club)) === 'UEFA' ? 'Ligaphase' : 'Gruppenphase', played: 1 };
  const direct = chance(sigmoid((ownStr - (avg + 3)) / 3));
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
  const uefa = confOf(L) === 'UEFA';
  if (res.euroRes && res.euroRes.won && S.europe === 'cl') score += uefa ? 4 : 1.5;
  else if (res.euroRes && S.europe === 'cl' && uefa && ['Halbfinale', 'Finale'].includes(res.euroRes.reached)) score += 1.5;
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
    S.contract = { salary: salaryFor(p.rating, S.clubId, 'Ergänzungsspieler'), years: 3 };
    msgs.push(`Du wirst in den Profikader von ${S.clubId} befördert und bekommst deinen ersten Profivertrag: ${money(S.contract.salary)} pro Jahr, 3 Jahre.`);
  }
  const str = clubStr(S.clubId);
  const released = !res.loan && p.rating < str - 14 && p.age >= 19;
  if (released) msgs.push(`${S.clubId} verlängert deinen Vertrag nicht. Du musst dir einen neuen Verein suchen.`);

  const perf = res.note === null ? 0 : (3.2 - res.note);
  const hi = p.rating + 3 + (perf > 0.6 ? 3 : 0) + (p.popularity > 70 ? 2 : 0);
  const lo = p.rating - (released ? 22 : 12);
  const cands = Object.keys(S.clubs).filter(n => n !== S.clubId && clubStr(n) >= lo && clubStr(n) <= hi)
    .sort((a, b) => clubStr(b) - clubStr(a));
  let k = randInt(1, 3) + (perf > 0.5 ? 1 : 0) + (S.season.transferBoost || 0) + (S.agent ? 1 : 0) - (p.age >= 33 ? 1 : 0);
  if (released) k = Math.max(k, 2);
  const chosen = [];
  const top = cands.slice(0, Math.max(6, Math.ceil(cands.length / 3)));
  for (const n of shuffle(top)) { if (chosen.length >= k) break; chosen.push(n); }
  const expired = S.contract.years <= 0;
  const newOffer = n => {
    const sal = salaryFor(p.rating, n, roleFor(p.rating, clubStr(n), 45)) * rand(1, 1.3) * (S.agent ? 1.15 : 1);
    return {
      club: n, loan: false, salary: sal, years: p.age >= 31 ? randInt(1, 2) : randInt(2, 5),
      // Ablösefrei bei auslaufendem Vertrag – dafür gibt es ein höheres Handgeld
      fee: expired || released ? 0 : marketValue() * rand(0.9, 1.5),
      signing: sal * (expired || released ? 0.8 : 0.25),
    };
  };
  const offers = chosen.map(newOffer);

  // Lukratives Angebot aus Saudi-Arabien für etablierte Spieler
  if (S.clubs[S.clubId].league !== 'sa' && p.age >= 27 && p.rating >= 76 && chance(0.35)) {
    const sa = shuffle(clubsIn('sa').sort((a, b) => clubStr(b) - clubStr(a)).slice(0, 5)).find(n => !chosen.includes(n));
    if (sa) { const o = newOffer(sa); o.salary *= 1.4; o.signing *= 2; offers.push(o); }
  }

  // Leihangebote für junge Ergänzungsspieler
  const wasBench = res.role === 'Ergänzungsspieler' || (res.role === 'Rotation' && res.games < 18) || res.role === 'U19';
  if (!released && p.age <= 22 && wasBench) {
    const loanCands = shuffle(Object.keys(S.clubs).filter(n => n !== S.clubId && clubStr(n) >= p.rating - 7 && clubStr(n) <= p.rating + 1));
    loanCands.slice(0, randInt(1, 2)).forEach(n => offers.push({ club: n, loan: true, fee: 0, salary: 0, years: 1, signing: 0 }));
  }
  // Junge Spieler finden immer einen kleineren Verein
  if (released && !offers.length && p.age < 30) {
    const weakest = Object.keys(S.clubs).filter(n => n !== S.clubId).sort((a, b) => clubStr(a) - clubStr(b)).slice(0, 12);
    shuffle(weakest).slice(0, 2).forEach(n => offers.push(newOffer(n)));
  }
  offers.sort((a, b) => clubStr(b.club) - clubStr(a.club));
  if (released && !offers.length) {
    retire('Kein Verein will dich mehr verpflichten. Du beendest deine Karriere.');
    return;
  }
  const stayRole = roleFor(p.rating, str, p.trust);
  const extension = !released && expired
    ? { salary: salaryFor(p.rating, S.clubId, stayRole) * rand(0.95, 1.15), years: p.age >= 31 ? randInt(1, 2) : randInt(2, 4) }
    : null;
  // Ein weiterer Interessent, den nur ein Topberater an Land zieht
  const spareClub = top.find(n => !chosen.includes(n) && !offers.some(o => o.club === n));
  const spare = spareClub ? newOffer(spareClub) : null;
  S.offers = { list: offers, released, msgs, extension, raiseTried: false, spare };
  S.phase = 'transfer';
}

function acceptOffer(o) {
  if (o) {
    if (o.loan) S.loan = { parent: S.clubId };
    else {
      S.contract = { salary: o.salary, years: o.years };
      S.money += o.signing * 0.55;
      S.earned += o.signing * 0.55;
    }
    S.clubId = o.club;
    S.player.trust = 45;
  } else if (S.offers.extension) {
    S.contract = { ...S.offers.extension };
  }
  S.offers = null;
  S.year++;
  startSeason();
}

function hireAgent() {
  const o = S.offers;
  S.agent = true;
  o.list.forEach(of => { if (!of.loan) { of.salary *= 1.15; of.signing *= 1.15; } });
  if (o.extension) o.extension.salary *= 1.15;
  if (o.spare) { o.spare.salary *= 1.15; o.spare.signing *= 1.15; o.list.push(o.spare); o.spare = null; }
  o.list.sort((a, b) => clubStr(b.club) - clubStr(a.club));
  o.msgs.push('Dein neuer Topberater verhandelt ab sofort für dich: bessere Gehälter und mehr Angebote, dafür 10 % Provision.');
}

function demandRaise() {
  const p = S.player, o = S.offers;
  o.raiseTried = true;
  const target = salaryFor(p.rating, S.clubId, roleFor(p.rating, clubStr(S.clubId), p.trust));
  if (chance(clamp((p.trust - 30) / 60 + (p.popularity - 50) / 200, 0.1, 0.9))) {
    S.contract = { salary: target, years: Math.max(S.contract.years, 3) };
    o.msgs.push(`Der Verein gibt nach: Dein neues Gehalt beträgt ${money(target)} pro Jahr, Vertrag bis ${S.year + 1 + S.contract.years}.`);
  } else {
    p.trust = clamp(p.trust - 10, 0, 100);
    o.msgs.push('Der Verein lehnt ab und findet deine Forderung unverschämt. Das Vertrauen sinkt.');
  }
}

function buy(item) {
  S.money -= item.price;
  S.owned[item.id] = ownedCount(item.id) + 1;
  S.player.popularity = clamp(S.player.popularity + item.pop, 0, 100);
}
function sellFund() {
  S.owned.fund = ownedCount('fund') - 1;
  S.money += 1;
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
      <p class="mv">Privat: ${esc(lifeText())}${S.agent ? ' · mit Topberater' : ''}</p>
    </div>
    <div class="wallet">
      <div><span>Vermögen</span><b class="${S.money < 0 ? 'down' : ''}">${money(S.money)}</b></div>
      <div><span>Gehalt</span><b>${money(S.contract.salary)}/Jahr</b></div>
      <div><span>Vertrag</span><b>${S.contract.years > 0 ? `bis ${S.year + S.contract.years + (S.phase === 'transfer' || S.phase === 'seasonEnd' ? 1 : 0)}` : 'läuft aus'}</b></div>
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
  const comps = S.youth ? ['U19-Liga'] : [L.name, L.cup, euroName()].filter(Boolean);
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
    <h3>Trainingsschwerpunkt</h3>
    <div class="focus">${Object.entries(FOCUS).map(([k, f]) => {
      const gk = S.player.pos === 'TW';
      return btn(`${esc(gk && f.gkName ? f.gkName : f.name)}<small>${esc(gk && f.gkDesc ? f.gkDesc : f.desc)}</small>`,
        () => { se.focus = k; render(); }, focusOf() === k ? 'chosen-focus' : '');
    }).join('')}</div>
    <div class="actions">${btn('Saison starten', () => {
      if (focusOf() === 'recovery') S.player.form = clamp(S.player.form + 2, -10, 10);
      nextStep(); render();
    }, 'primary')}</div>
  </section>
  ${renderShop()}
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
    ${renderFinance(r.finance)}
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
        ${of.loan ? '<small>Leihe für 1 Saison · dein Gehalt bleibt gleich</small>'
          : `<small><b>${money(of.salary)}/Jahr</b> · ${of.years} ${of.years === 1 ? 'Jahr' : 'Jahre'} · Handgeld ${money(of.signing)}</small>
             <small>${of.fee ? `Ablöse: ${money(of.fee)}` : 'Ablösefrei'}</small>`}
      </div>
      ${btn(of.loan ? 'Leihe annehmen' : 'Wechseln', () => acceptOffer(of) || render(), 'primary small')}
    </div>`;
  }).join('');
  const stayRole = roleFor(p.rating, clubStr(S.clubId), p.trust);
  const c = S.contract, ext = o.extension;
  let stay = '';
  if (!o.released) {
    stay = ext
      ? btn(`Vertrag bei ${esc(S.clubId)} verlängern<small>${money(ext.salary)}/Jahr · ${ext.years} ${ext.years === 1 ? 'Jahr' : 'Jahre'} · ${stayRole}</small>`, () => acceptOffer(null) || render(), o.list.length ? '' : 'primary')
      : btn(`Bei ${esc(S.clubId)} bleiben<small>${stayRole} · Vertrag noch ${c.years} ${c.years === 1 ? 'Jahr' : 'Jahre'}</small>`, () => acceptOffer(null) || render(), o.list.length ? '' : 'primary');
  }
  const fair = salaryFor(p.rating, S.clubId, stayRole);
  const raise = !o.released && !ext && !o.raiseTried && fair > c.salary * 1.35
    ? btn(`Gehaltserhöhung fordern<small>ca. ${money(fair)}/Jahr</small>`, () => { demandRaise(); render(); })
    : '';
  const agentBtn = S.agent
    ? btn('Berater entlassen<small>keine Provision mehr</small>', () => { S.agent = false; o.msgs.push('Du trennst dich von deinem Berater.'); render(); }, 'small')
    : btn('Topberater engagieren<small>+15 % Gehalt, mehr Angebote · 10 % Provision</small>', () => { hireAgent(); render(); });
  return `
  <section class="card">
    <h2>Transferfenster – Sommer ${S.year + 1}</h2>
    ${o.msgs.map(m => `<p class="note">${esc(m)}</p>`).join('')}
    ${o.list.length ? `<p>Diese Vereine wollen dich verpflichten:</p><div class="offers">${list}</div>` : '<p>Diesmal gibt es keine Angebote für dich.</p>'}
    <div class="actions">
      ${stay}
      ${raise}
      ${agentBtn}
      ${p.age >= 33 ? btn('Karriere beenden', () => { retire('Du hast dich entschieden, deine Karriere zu beenden.'); render(); }, 'danger') : ''}
    </div>
  </section>
  ${renderShop()}
  ${renderHistory()}`;
}

function renderFinance(f) {
  if (!f) return '';
  const row = (label, v, cls = '') => `<li><span>${label}</span><b class="${cls}">${v < 0 ? '' : '+'}${money(v)}</b></li>`;
  return `
    <h3>Finanzen</h3>
    <ul class="facts money">
      <li><span>Gehalt (brutto)</span><b>${money(f.gross)}</b></li>
      ${f.bonusPay ? `<li><span>Titel- und Erfolgsprämien (brutto)</span><b>${money(f.bonusPay)}</b></li>` : ''}
      ${f.sponsor >= 0.001 ? `<li><span>Werbeverträge (brutto)</span><b>${money(f.sponsor)}</b></li>` : ''}
      ${f.agentFee ? `<li><span>Beraterprovision (10 %)</span><b class="down">−${money(f.agentFee)}</b></li>` : ''}
      ${row('Nach Steuern (45 %)', f.net, 'up')}
      ${f.upkeep ? row('Unterhalt für Besitz', -f.upkeep, 'down') : ''}
      ${f.fund ? row('Rendite Fonds', f.fund, f.fund >= 0 ? 'up' : 'down') : ''}
      <li class="sum"><span>Vermögen jetzt</span><b>${money(S.money)}</b></li>
    </ul>`;
}

function renderShop() {
  const groups = {};
  for (const it of SHOP) (groups[it.cat] = groups[it.cat] || []).push(it);
  const owned = SHOP.filter(it => ownedCount(it.id)).map(it => `${esc(it.name)}${ownedCount(it.id) > 1 ? ` ×${ownedCount(it.id)}` : ''}`);
  const items = Object.entries(groups).map(([cat, list]) => `
    <div class="shopcat"><h4>${esc(cat)}</h4>
      ${list.map(it => {
        const have = ownedCount(it.id);
        const can = S.money >= it.price && (it.repeat || !have);
        const extra = it.id === 'fund' && have ? btn('Verkaufen', () => { sellFund(); render(); }, 'small') : '';
        return `<div class="shopitem"><div><strong>${esc(it.name)}</strong><small>${money(it.price)}${it.upkeep ? ` · Unterhalt ${money(it.price * it.upkeep)}/Jahr` : ''}${it.pop ? ` · Beliebtheit +${it.pop}` : ''}${it.id === 'fund' ? ' · Rendite schwankt jedes Jahr' : ''}</small></div>
          <div class="shopbtns">${!it.repeat && have ? '<span class="owned">Gekauft</span>' : btn('Kaufen', () => { if (can) { buy(it); render(); } }, can ? 'small' : 'small disabled')}${extra}</div></div>`;
      }).join('')}
    </div>`).join('');
  return `
  <section class="card">
    <details><summary>Vermögen &amp; Besitz · ${money(S.money)}</summary>
      <p class="muted">${owned.length ? `Dein Besitz: ${owned.join(', ')}.` : 'Du besitzt noch nichts Besonderes.'} Insgesamt hast du bisher ${money(S.earned)} netto verdient.</p>
      <div class="shop">${items}</div>
    </details>
  </section>`;
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

const AFTER_CAREER = {
  coach: {
    label: 'Trainer werden', run: () => {
      const club = pick(S.clubsPlayed);
      return S.titles.length >= 8
        ? `Du machst deinen Trainerschein und übernimmst später ${club}. In deiner dritten Saison holst du als Trainer die Meisterschaft!`
        : chance(0.5)
          ? `Du wirst Jugendtrainer bei ${club} und bringst drei Spieler in die Nationalmannschaft.`
          : `Du trainierst ein paar Jahre ${club}, wirst aber nach einer Negativserie entlassen. Heute bist du Co-Trainer und glücklich damit.`;
    },
  },
  tv: {
    label: 'TV-Experte werden', run: () => S.player.popularity >= 60
      ? 'Du wirst das Gesicht der Samstagabend-Show. Deine Analysen gehen regelmäßig viral.'
      : 'Du kommentierst Spiele im Pay-TV. Nicht jeder mag deine Sprüche, aber die Quote stimmt.',
  },
  director: {
    label: 'Sportdirektor werden', run: () => chance(0.55)
      ? `Als Sportdirektor bei ${pick(S.clubsPlayed)} findest du ein Supertalent für 2 Mio. € und verkaufst es später für 80 Mio. €.`
      : `Als Sportdirektor bei ${pick(S.clubsPlayed)} verpflichtest du einige Flops. Nach zwei Jahren ist Schluss.`,
  },
  beach: {
    label: 'Ruhestand genießen', run: () => S.money >= 20
      ? 'Du lebst in deiner Villa am Meer, spielst Golf und besuchst ab und zu deinen alten Verein.'
      : S.money >= 1
        ? 'Du ziehst zurück in deine Heimatstadt, eröffnest ein Café und spielst in der Altherrenmannschaft.'
        : 'Das Geld ist knapp. Du nimmst einen Job als Fußballlehrer an einer Schule an – und merkst, dass dir das richtig Spaß macht.',
  },
};

function renderAfterCareer() {
  if (S.after) return `<section class="card"><h2>Nach der Karriere</h2><p>${esc(S.after)}</p></section>`;
  return `
  <section class="card">
    <h2>Wie geht es weiter?</h2>
    <p>Die Schuhe hängen am Nagel. Was machst du jetzt?</p>
    <div class="choices">${Object.values(AFTER_CAREER).map(a => btn(esc(a.label), () => { S.after = a.run(); render(); })).join('')}</div>
  </section>`;
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
  ${renderAfterCareer()}
  <section class="card">
    <div class="stats">
      <div><b>${t.seasons}</b><span>Profisaisons</span></div>
      <div><b>${t.games}</b><span>Spiele</span></div>
      <div><b>${t.goals}</b><span>Tore</span></div>
      <div><b>${t.assists}</b><span>Vorlagen</span></div>
      <div><b>${S.peak}</b><span>Höchste Stärke</span></div>
      <div><b>${p.caps}</b><span>Länderspiele</span></div>
      <div><b>${money(S.money)}</b><span>Vermögen</span></div>
      <div><b>${money(S.earned)}</b><span>Netto verdient</span></div>
    </div>
    <p>Vereine: ${S.clubsPlayed.map(esc).join(' → ')}</p>
    <p>Privat: ${esc(lifeText())}</p>
    <div class="actions">${btn('Neue Karriere starten', () => { deleteSave(); S = { phase: 'create' }; render(); }, 'primary')}</div>
  </section>
  ${renderHistory()}`;
}

// ---------- Start ----------
function init() {
  app().addEventListener('click', e => {
    const b = e.target.closest('[data-h]');
    if (!b) return;
    const fn = handlers[+b.dataset.h];
    if (fn) fn();
  });
  render();
}
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
else setTimeout(init);
