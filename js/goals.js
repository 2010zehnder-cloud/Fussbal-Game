// ---------- Langzeitziele: Prestige-Stufen, verrückte Regeln und Sammelziele ----------

// ---------- Sammelziele (über alle Karrieren) ----------
const COLL_KEY = 'fussballkarriere-sammlung';
const CARD_KINDS = [['wm', 'Weltmeister'], ['ballon', "Ballon d'Or"], ['euro', 'Europameister'], ['cont', 'Kontinentaltitel'], ['toty', 'Team des Jahres'],
  ['rttf', 'Champions League'], ['rttf-el', 'Europa League'], ['rttf-ecl', 'Conference League'], ['potm', 'Spieler des Monats'], ['icon', 'Ikone']];
const POTM_KINDS = [['bl', 'Bundesliga'], ['bl2', '2. Bundesliga'], ['pl', 'Premier League'], ['laliga', 'LaLiga'], ['seriea', 'Serie A'], ['ligue1', 'Ligue 1'], ['other', 'Andere Liga']];
const potmKind = c => `potm-${POTM_LEAGUES.includes(c.league) ? c.league : 'other'}`;

function loadCollection() {
  let c;
  try { c = JSON.parse(localStorage.getItem(COLL_KEY) || '{}'); } catch (e) { c = {}; }
  return { cards: c.cards || [], best: c.best || 0, perCareer: c.perCareer || 0, goals: c.goals || [] };
}
function saveCollection(c) { try { localStorage.setItem(COLL_KEY, JSON.stringify(c)); } catch (e) { /* ignorieren */ } }

// Ältere Karrieren haben kein Karten-Album gespeichert: Karten aus Titeln und Auszeichnungen nachbauen.
// Wie im Spiel gibt es pro Saison nur eine Sonderkarte, und zwar die wertvollste.
const CARD_ORDER = ['wm', 'ballon', 'euro', 'cont', 'toty', 'rttf', 'rttf-el', 'rttf-ecl', 'potm'];
function cardsFromRecord(titles, awards, legacyTitle) {
  const byYear = {};
  const put = (y, card) => { (byYear[y] = byYear[y] || []).push(card); };
  const seasonYear = s => { const m = s.match(/\((\d{4})\/\d{2}\)$/); return m ? +m[1] + 1 : null; };
  for (const t of titles || []) {
    const y = seasonYear(t);
    if (y) {
      if (isCLTitle(t)) put(y, { special: 'rttf' });
      else if (/^Europa[- ]League-Sieger/.test(t)) put(y, { special: 'rttf-el' });
      else if (/^Conference[- ]League-Sieger/.test(t)) put(y, { special: 'rttf-ecl' });
      else { const L = LEAGUES.find(l => t.startsWith(`${l.champion} (`)); if (L) put(y, { special: 'potm', league: L.id }); }
      continue;
    }
    const m = t.match(/^(.*) (\d{4})$/);
    if (!m) continue;
    if (m[1] === 'Weltmeister') put(+m[2], { special: 'wm' });
    else if (m[1] === 'Europameister') put(+m[2], { special: 'euro' });
    else if (/^(Copa-América-Sieger|Afrikameister|Asienmeister|Gold-Cup-Sieger)$/.test(m[1])) put(+m[2], { special: 'cont' });
  }
  for (const a of awards || []) {
    const y = seasonYear(a);
    if (!y) continue;
    if (a.startsWith("Ballon d'Or")) put(y, { special: 'ballon' });
    else if (a.startsWith('Spieler der Saison')) put(y, { special: 'toty' });
  }
  const list = Object.values(byYear).map(cards => cards.sort((a, b) => CARD_ORDER.indexOf(a.special) - CARD_ORDER.indexOf(b.special))[0]);
  if (['G.O.A.T.', 'Legende'].includes(legacyTitle)) list.push({ special: 'icon' });
  return list;
}

// Karten aus der laufenden Karriere, den Spielständen und der Ruhmeshalle in die Sammlung übernehmen
function syncCollection() {
  const c = loadCollection();
  const add = list => {
    for (const card of list || []) {
      if (!card || !card.special) continue;
      for (const k of [card.special, card.special === 'potm' ? potmKind(card) : null]) if (k && !c.cards.includes(k)) c.cards.push(k);
      c.best = Math.max(c.best, card.rating || 0);
    }
    c.perCareer = Math.max(c.perCareer, new Set((list || []).map(x => x && x.special).filter(Boolean)).size);
  };
  // Gespeichertes Album plus nachgebaute Karten (das Album gibt es erst seit einer späteren Version)
  const fromCareer = (album, titles, awards, legacyTitle) => add([...(album || []), ...cardsFromRecord(titles, awards, legacyTitle)]);
  if (typeof loadHallOfFame === 'function') for (const e of loadHallOfFame()) fromCareer(e.cards, e.titleList, e.awardList, e.title);
  for (let n = 1; n <= SLOT_COUNT; n++) { const s = readSlot(n); if (s && s.player) fromCareer(s.cardAlbum, s.titles, s.awards, null); }
  if (S && S.player) {
    add(S.cardAlbum);
    if (S.vg) c.best = Math.max(c.best, S.vg.rating || 0);
  }
  saveCollection(c);
  return c;
}

const COLLECTION_GOALS = [
  { id: 'potmAll', name: 'Liga-Sammler', desc: 'Sammle die Spieler-des-Monats-Karte jeder Liga.',
    parts: () => POTM_KINDS.map(([k, n]) => [`potm-${k}`, n]) },
  { id: 'europe', name: 'Europapokal-Trio', desc: 'Sammle die Karten von Champions League, Europa League und Conference League.',
    parts: () => [['rttf', 'Champions League'], ['rttf-el', 'Europa League'], ['rttf-ecl', 'Conference League']] },
  { id: 'nation', name: 'Nationalheld', desc: 'Sammle die Karten für WM, EM und einen anderen Kontinentaltitel.',
    parts: () => [['wm', 'WM'], ['euro', 'EM'], ['cont', 'Kontinentaltitel']] },
  { id: 'golden', name: 'Goldjunge', desc: "Sammle die Karten für den Ballon d'Or und das Team des Jahres.",
    parts: () => [['ballon', "Ballon d'Or"], ['toty', 'Team des Jahres']] },
  { id: 'icon', name: 'Unsterblich', desc: 'Hol dir eine Ikonen-Karte zum Karriereende.', parts: () => [['icon', 'Ikone']] },
  { id: 'r99', name: 'Die perfekte 99', desc: 'Erreiche eine KICK-Wertung von 99.', test: c => c.best >= 99, prog: c => `Beste Wertung: ${c.best || '–'}` },
  { id: 'album5', name: 'Volles Album', desc: 'Sammle 5 verschiedene Sonderkarten in einer einzigen Karriere.', test: c => c.perCareer >= 5, prog: c => `Bisher: ${c.perCareer} von 5` },
  { id: 'master', name: 'Meistersammler', desc: 'Sammle jede Art von Sonderkarte mindestens einmal.', parts: () => CARD_KINDS },
];
const goalDone = (g, c) => g.test ? g.test(c) : g.parts().every(([k]) => c.cards.includes(k));

function checkCollection() {
  const c = syncCollection();
  const fresh = COLLECTION_GOALS.filter(g => !c.goals.includes(g.id) && goalDone(g, c));
  if (!fresh.length) return;
  c.goals.push(...fresh.map(g => g.id));
  saveCollection(c);
  fresh.forEach(g => toast(`🎴 Sammelziel geschafft: ${g.name}!`));
  queueFx('fanfare', 'confetti');
}

function renderCollection() {
  const c = syncCollection();
  return `
  <section class="card">
    <details><summary>🎴 Sammelziele · ${c.goals.length} von ${COLLECTION_GOALS.length}</summary>
      <p class="muted small">Gilt über alle Karrieren. Jede Sonderkarte, die du bekommst, landet in deiner Sammlung.</p>
      <div class="achs">${COLLECTION_GOALS.map(g => {
        const done = c.goals.includes(g.id);
        const prog = g.prog ? g.prog(c) : g.parts().map(([k, n]) => `${c.cards.includes(k) ? '✅' : '⬜'} ${n}`).join(' · ');
        return `<div class="ach ${done ? 'got' : ''}"><b>${done ? '🎴' : '🔒'} ${esc(g.name)}</b><small>${esc(g.desc)}</small><small class="ach-prog">${esc(prog)}</small></div>`;
      }).join('')}</div>
    </details>
  </section>`;
}

// ---------- Prestige-Stufen ----------
const PRESTIGE_KEY = 'fussballkarriere-prestige';
const PRESTIGE = [
  { id: 'bronze', name: 'Bronze', icon: '🥉', need: 'Schaffe alle einfachen Herausforderungen.', test: d => CHALLENGES.filter(c => c.level === 'Einfach').every(c => d.includes(c.id)) },
  { id: 'silver', name: 'Silber', icon: '🥈', need: 'Schaffe alle mittleren Herausforderungen.', test: d => CHALLENGES.filter(c => c.level === 'Mittel').every(c => d.includes(c.id)) },
  { id: 'gold', name: 'Gold', icon: '🥇', need: 'Schaffe alle schweren Herausforderungen.', test: d => CHALLENGES.filter(c => c.level === 'Schwer').every(c => d.includes(c.id)) },
  { id: 'diamond', name: 'Diamant', icon: '💎', need: 'Schaffe alle Sammelziele.', test: () => loadCollection().goals.length >= COLLECTION_GOALS.length },
];
const prestigeOn = () => !prefs().noPrestige;
// Die Stufen bauen aufeinander auf: Silber gibt es erst nach Bronze usw.
function prestigeLevel() {
  const d = doneChallenges();
  let lv = -1;
  for (let i = 0; i < PRESTIGE.length; i++) { if (PRESTIGE[i].test(d)) lv = i; else break; }
  return lv;
}
function checkPrestige() {
  const lv = prestigeLevel();
  let seen = -1;
  try { seen = parseInt(localStorage.getItem(PRESTIGE_KEY) || '-1', 10); } catch (e) { /* ignorieren */ }
  if (lv <= seen) return;
  try { localStorage.setItem(PRESTIGE_KEY, String(lv)); } catch (e) { /* ignorieren */ }
  if (prestigeOn()) { toast(`${PRESTIGE[lv].icon} Neue Prestige-Stufe: ${PRESTIGE[lv].name}!`); queueFx('fanfare', 'confetti'); }
}
const prestigeClass = () => { const lv = prestigeLevel(); return prestigeOn() && lv >= 0 ? ` prestige prestige-${PRESTIGE[lv].id}` : ''; };
const prestigeChip = () => { const lv = prestigeLevel(); return prestigeOn() && lv >= 0 ? `<span class="prestige-chip p-${PRESTIGE[lv].id}">${PRESTIGE[lv].icon} ${PRESTIGE[lv].name}</span>` : ''; };

function renderPrestige() {
  if (!prestigeOn()) return '';
  const lv = prestigeLevel();
  const d = doneChallenges();
  return `
  <section class="card prestige-card${prestigeClass()}">
    <h2>Prestige ${prestigeChip() || '<span class="muted">· noch keine Stufe</span>'}</h2>
    <div class="prestige-steps">${PRESTIGE.map((p, i) => {
      const lvl = ['Einfach', 'Mittel', 'Schwer'][i];
      const prog = lvl ? `${CHALLENGES.filter(c => c.level === lvl && d.includes(c.id)).length} von ${CHALLENGES.filter(c => c.level === lvl).length}` : `${loadCollection().goals.length} von ${COLLECTION_GOALS.length}`;
      return `<div class="pstep ${i <= lv ? 'got' : i === lv + 1 ? 'next' : ''}"><b>${p.icon} ${p.name}</b><small>${esc(p.need)}</small><small class="ach-prog">${i <= lv ? '✅ erreicht' : prog}</small></div>`;
    }).join('')}</div>
    <p class="muted small">Deine Stufe zeigt sich als Rahmen um deinen Spieler. In den Einstellungen kannst du das ausschalten.</p>
  </section>`;
}

// ---------- Verrückte Regeln ----------
const RULE_KEY = 'fussballkarriere-regeln';
const CRAZY_RULES = [
  { id: 'glass', icon: '🦴', name: 'Glasknochen', desc: 'Verletzungen kommen doppelt so oft.', goal: 'Gewinne trotzdem 5 Titel.', test: () => S.titles.length >= 5 },
  { id: 'loyal', icon: '💍', name: 'Vereinstreue', desc: 'Du kannst nie freiwillig den Verein wechseln.', goal: 'Werde Vereinslegende.', test: () => legends().length >= 1 },
  { id: 'onemove', icon: '☝️', name: 'Nur ein Wechsel', desc: 'Du darfst nur ein einziges Mal freiwillig den Verein wechseln.', goal: 'Gewinne die Champions League.', test: () => S.titles.some(isCLTitle) },
  { id: 'slow', icon: '🐢', name: 'Spätzünder', desc: 'Training bringt dir ein Viertel weniger.', goal: 'Erreiche trotzdem eine Stärke von 88.', test: () => S.peak >= 88 },
  { id: 'poor', icon: '🪙', name: 'Sparprogramm', desc: 'Du bekommst nur das halbe Gehalt.', goal: 'Besitze trotzdem 10 Mio. €.', test: () => S.money >= 10 },
];
const rulesOn = () => !!prefs().crazyRules;
const activeRule = () => (S && S.rule ? CRAZY_RULES.find(r => r.id === S.rule) : null);
function masteredRules() { try { return JSON.parse(localStorage.getItem(RULE_KEY) || '[]'); } catch (e) { return []; } }
function rollRule() { S.rule = rulesOn() ? pick(CRAZY_RULES).id : null; S.ruleDone = false; S.ruleMoves = 0; }
// Wechselsperre für „Vereinstreue“ und „Nur ein Wechsel“
const ruleBlocksMove = () => S.rule === 'loyal' || (S.rule === 'onemove' && (S.ruleMoves || 0) >= 1);

function checkRule() {
  const r = activeRule();
  if (!r || S.ruleDone) return;
  let ok = false;
  try { ok = r.test(); } catch (e) { ok = false; }
  if (!ok) return;
  S.ruleDone = true;
  const m = masteredRules();
  if (!m.includes(r.id)) try { localStorage.setItem(RULE_KEY, JSON.stringify([...m, r.id])); } catch (e) { /* ignorieren */ }
  // Belohnung: Prämie und Beliebtheit
  S.money += 2;
  S.player.popularity = clamp(S.player.popularity + 5, 0, 100);
  toast(`${r.icon} Regel gemeistert: ${r.name}! +2 Mio. € und +5 Beliebtheit`);
  queueFx('fanfare', 'confetti');
}

function ruleNote() {
  const r = activeRule();
  return r ? `<p class="note rule-note">${r.icon} <b>Verrückte Regel: ${esc(r.name)}</b> – ${esc(r.desc)} Ziel: ${esc(r.goal)}${S.ruleDone ? ' – ✅ gemeistert!' : ''}</p>` : '';
}

function renderRules() {
  if (!rulesOn()) return '';
  const m = masteredRules();
  return `
  <section class="card">
    <details><summary>🃏 Verrückte Regeln · ${m.length} von ${CRAZY_RULES.length} gemeistert</summary>
      <p class="muted small">Jede neue Karriere bekommt eine zufällige Regel. Schaffst du ihr Ziel, gibt es 2 Mio. €, Beliebtheit und ein Abzeichen. Herausforderungen laufen ohne Regel.</p>
      <div class="achs">${CRAZY_RULES.map(r => `<div class="ach ${m.includes(r.id) ? 'got' : ''}"><b>${m.includes(r.id) ? r.icon : '🔒'} ${esc(r.name)}</b><small>${esc(r.desc)}</small><small class="ach-prog">Ziel: ${esc(r.goal)}</small></div>`).join('')}</div>
    </details>
  </section>`;
}

function checkLongGoals() { checkRule(); checkCollection(); checkPrestige(); }
