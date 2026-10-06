'use strict';

// Meilensteine, Vereinslegenden, Ruhmeshalle und Elfmeterschießen im Finale

const HOF_KEY = 'fussballkarriere-ruhmeshalle';

const MILESTONES = [
  { id: 'goal1', text: 'Erstes Profitor', test: t => t.goals >= 1 },
  { id: 'goal50', text: '50 Karrieretore', test: t => t.goals >= 50 },
  { id: 'goal100', text: '100 Karrieretore', test: t => t.goals >= 100 },
  { id: 'goal200', text: '200 Karrieretore', test: t => t.goals >= 200 },
  { id: 'goal300', text: '300 Karrieretore – eine Tormaschine', test: t => t.goals >= 300 },
  { id: 'goal500', text: '500 Karrieretore – historisch!', test: t => t.goals >= 500 },
  { id: 'ast100', text: '100 Torvorlagen', test: t => t.assists >= 100 },
  { id: 'games100', text: '100 Profispiele', test: t => t.games >= 100 },
  { id: 'games250', text: '250 Profispiele', test: t => t.games >= 250 },
  { id: 'games500', text: '500 Profispiele', test: t => t.games >= 500 },
  { id: 'games750', text: '750 Profispiele – ein Dauerbrenner', test: t => t.games >= 750 },
  { id: 'caps1', text: 'Erstes Länderspiel', test: () => S.player.caps >= 1 },
  { id: 'caps50', text: '50 Länderspiele', test: () => S.player.caps >= 50 },
  { id: 'caps100', text: '100 Länderspiele – Rekordnationalspieler-Niveau', test: () => S.player.caps >= 100 },
  { id: 'title1', text: 'Erster Titel', test: () => S.titles.length >= 1 },
  { id: 'title10', text: '10 Titel', test: () => S.titles.length >= 10 },
  { id: 'title20', text: '20 Titel – Seriensieger', test: () => S.titles.length >= 20 },
  { id: 'rating90', text: 'Stärke 90 erreicht – Weltklasse', test: () => S.peak >= 90 },
  { id: 'rating99', text: 'Stärke 99 – perfekter Spieler', test: () => S.peak >= 99 },
  { id: 'ballon3', text: "Drei Ballon d'Ors", test: () => S.awards.filter(a => a.startsWith("Ballon d'Or")).length >= 3 },
];

function milestones() { if (!S.milestones) S.milestones = []; return S.milestones; }
function addMilestone(id, text, res) {
  if (milestones().some(m => m.id === id)) return;
  S.milestones.push({ id, text, year: S.year });
  res.milestones = res.milestones || [];
  res.milestones.push(text);
}

function checkMilestones(res) {
  if (res.role === 'U19') return;
  const t = totals();
  for (const m of MILESTONES) if (m.test(t)) addMilestone(m.id, m.text, res);
  if (res.goals >= 30) addMilestone('season30', `${res.goals} Tore in einer Saison`, res);
  if (res.goals >= 45) addMilestone('season45', 'Über 45 Saisontore – weltrekordverdächtig', res);
  if (res.goals > 0 && res.age <= 18) addMilestone('young', `Profitor mit nur ${res.age} Jahren`, res);
  // Vereinslegende
  for (const l of legends()) addMilestone(`legend_${l.club}`, `Vereinslegende bei ${l.club}`, res);
  const club = clubStats().find(c => c.club === res.club);
  if (club && club.games >= 100) addMilestone(`club100_${club.club}`, `100 Spiele für ${club.club}`, res);
}

// Statistiken pro Verein aus dem Karriereverlauf
function clubStats() {
  const map = {};
  for (const h of S.history) {
    if (h.youth || h.banned || h.loan) continue;
    const c = map[h.club] = map[h.club] || { club: h.club, seasons: 0, games: 0, goals: 0, titles: 0 };
    c.seasons++; c.games += h.games; c.goals += h.goals; c.titles += h.titles;
  }
  return Object.values(map);
}
function legends() {
  return clubStats().filter(c => c.seasons >= 5 || c.games >= 180).map(c => ({
    ...c,
    honors: [
      'Abschiedsspiel vor ausverkauftem Stadion',
      ...(c.titles >= 4 || c.goals >= 120 ? ['Statue vor dem Stadion'] : []),
      ...(c.seasons >= 8 || c.games >= 300 ? [`Rückennummer ${S.player.number} wird nie wieder vergeben`] : []),
    ],
  }));
}

function renderLegends() {
  const ls = legends();
  if (!ls.length) return '';
  return `
  <section class="card">
    <h2>Vereinslegende</h2>
    ${ls.map(l => `<div class="legend">${crest(l.club)}<div><strong>${esc(l.club)}</strong>
      <small>${l.seasons} Saisons · ${l.games} Spiele · ${l.goals} Tore · ${l.titles} Titel</small>
      <ul class="lines">${l.honors.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div></div>`).join('')}
  </section>`;
}

// ---------- Ruhmeshalle ----------
function loadHallOfFame() { try { return JSON.parse(localStorage.getItem(HOF_KEY) || '[]'); } catch (e) { return []; } }
function saveHallOfFame() {
  if (!S || !S.player) return;
  if (!S.hofId) S.hofId = `${Date.now()}-${randInt(0, 99999)}`;
  const t = totals();
  const [, title] = legacy();
  const entry = {
    id: S.hofId, name: S.player.name, nation: S.player.nation, pos: S.player.pos, peak: S.peak, games: t.games, goals: t.goals, assists: t.assists,
    titleList: S.titles.slice(), awardList: S.awards.slice(), caps: S.player.caps || 0,
    coachList: S.coachDone ? S.coachDone.titles.slice() : [], ownerList: S.ownerDone ? S.ownerDone.titles.slice() : [],
    titles: S.titles.length, ballon: S.awards.filter(a => a.startsWith("Ballon d'Or")).length, money: S.money, title,
    gen: S.gen || 1, score: legacyScore(), coachTitles: S.coachDone ? S.coachDone.titles.length : 0, doping: S.dopeCaught || 0,
  };
  const list = loadHallOfFame().filter(e => e.id !== entry.id);
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  try { localStorage.setItem(HOF_KEY, JSON.stringify(list.slice(0, 50))); } catch (e) { /* ignorieren */ }
}

// Aufklappbare Details einer Karriere: alle Titel und Auszeichnungen
function hofDetail(e) {
  if (!e.titleList) return '<p class="muted">Für diese ältere Karriere wurden noch keine Details gespeichert.</p>';
  const block = (head, list, icon) => list.length ? `<h4>${head} (${list.length})</h4><ul class="lines">${list.map(x => `<li>${icon} ${esc(x)}</li>`).join('')}</ul>` : '';
  const html = block('Titel als Spieler', e.titleList, '🏆') + block('Auszeichnungen', e.awardList, '⭐')
    + block('Titel als Trainer', e.coachList || [], '📋') + block('Titel als Klubbesitzer', e.ownerList || [], '💼');
  return `<p class="muted">${e.games} Spiele · ${e.goals} Tore · ${e.assists ?? '–'} Vorlagen${e.caps ? ` · ${e.caps} Länderspiele` : ''} · Stärke ${e.peak}</p>`
    + (html || '<p class="muted">Keine Titel oder Auszeichnungen gewonnen.</p>');
}

function renderHallOfFame() {
  const list = loadHallOfFame();
  if (!list.length) return '';
  return `
  <section class="card">
    <h2>Ruhmeshalle</h2>
    <p class="muted">Deine besten beendeten Karrieren auf diesem Gerät. Tippe auf eine Karriere für alle Titel und Auszeichnungen.</p>
    <div class="scroll"><table class="hof">
      <thead><tr><th>#</th><th>Spieler</th><th>Status</th><th>Sp</th><th>T</th><th>V</th><th>Titel</th><th>Stä</th></tr></thead>
      <tbody>${list.slice(0, 10).map((e, i) => `<tr class="hof-row" data-hof="${i}"><td>${i + 1}</td>
        <td class="club">▸ ${esc(e.name)}<small class="sub">${esc(e.nation)} · ${e.pos}${e.gen > 1 ? ` · Gen. ${e.gen}` : ''}${e.ballon ? ` · ${e.ballon}× Ballon d'Or` : ''}${e.doping ? ' · 💉' : ''}</small></td>
        <td>${esc(e.title)}</td><td>${e.games}</td><td>${e.goals}</td><td>${e.assists ?? '–'}</td><td>${e.titles}${e.coachTitles ? ` +${e.coachTitles}` : ''}</td><td>${e.peak}</td></tr>
        <tr class="hof-detail" hidden><td colspan="8"><div class="hof-box">${hofDetail(e)}</div></td></tr>`).join('')}</tbody>
    </table></div>
  </section>`;
}

// ---------- Elfmeterschießen ----------
// Titel nach einem gewonnenen Finale vergeben
function grantFinalTitle(so, how) {
  const res = S.seasonEnd;
  const label = so.kind === 'nation' ? so.title : `${so.title} (${seasonLabel(S.year)})`;
  S.titles.push(label);
  res.titles.push(so.title);
  S.titleLog = [...(S.titleLog || []), { title: so.title, club: so.kind === 'nation' ? S.player.nation : S.clubId }];
  res.lines.push(`🏆 ${so.title}! ${how}.`);
  const h = S.history[S.history.length - 1];
  if (h) h.titles++;
  S.player.popularity = clamp(S.player.popularity + (so.title.startsWith('Champions') ? 12 : 8), 0, 100);
  S.money += S.contract.salary * 0.15 * 0.55;
  queueFx('fanfare', 'confetti');
}

function resolveShootout(dir) {
  const so = S.shootouts[0];
  const res = S.seasonEnd;
  const gk = S.player.pos === 'TW';
  const q = quality();
  const other = randInt(0, 2);
  let ok;
  if (gk) ok = other === dir ? chance(0.6 + q * 0.25) : chance(0.05);
  else ok = other !== dir ? chance(0.9 + q * 0.08) : chance(0.12 + q * 0.12);
  const dirs = ['links', 'in die Mitte', 'rechts'];
  if (ok) {
    so.text = gk
      ? (other === dir ? `Der Schütze zielt ${dirs[other]} – und du bist da! GEHALTEN! Ihr gewinnt das Elfmeterschießen!`
        : 'Du springst in die falsche Ecke – aber der Ball knallt an die Latte! Ihr gewinnt das Elfmeterschießen!')
      : (other === dir ? `Der Torwart ahnt die Ecke, aber dein Schuss ist zu scharf – drin! Ihr gewinnt das Elfmeterschießen!`
        : `Der Torwart springt ${dirs[other]}, du schiebst ${dirs[dir]} ein. Ihr gewinnt das Elfmeterschießen!`);
    grantFinalTitle(so, `Finale gegen ${so.opp} im Elfmeterschießen gewonnen`);
    setHeadline(`ELFMETER-HELD ${lastName()}! ${so.title.toUpperCase()}!`);
  } else {
    queueFx('sad');
    so.text = gk
      ? (other === dir ? 'Du bist in der richtigen Ecke, aber der Schuss ist zu platziert. Ihr verliert das Elfmeterschießen.'
        : `Du springst in die falsche Ecke, der Ball geht ${dirs[other]} rein. Ihr verliert das Elfmeterschießen.`)
      : (other === dir ? 'Der Torwart ahnt die Ecke und hält! Ihr verliert das Elfmeterschießen.'
        : 'Du schießt neben das Tor! Ihr verliert das Elfmeterschießen.');
    res.lines.push(`Finale gegen ${so.opp} im Elfmeterschießen verloren.`);
    S.player.popularity = clamp(S.player.popularity - 3, 0, 100);
  }
  so.done = ok ? 'won' : 'lost';
}

function renderShootout() {
  const so = S.shootouts[0];
  const gk = S.player.pos === 'TW';
  const dirs = gk ? ['Links springen', 'In der Mitte bleiben', 'Rechts springen'] : ['Links unten', 'Mitte', 'Rechts oben'];
  return `
  <section class="card">
    <div class="scoreboard">
      <div class="comp">Finale · Elfmeterschießen</div>
      <div class="teams">
        <div class="team">${S.clubId && so.kind !== 'nation' ? crest(S.clubId) : '⚽'}<span>${esc(so.kind === 'nation' ? S.player.nation : S.clubId)}</span></div>
        <div class="score">4:4<small>Elfmeterschießen</small></div>
        <div class="team">${so.kind !== 'nation' ? crest(so.opp) : '⚽'}<span>${esc(so.opp)}</span></div>
      </div>
    </div>
    <p class="situation">Um den Titel „${esc(so.title)}“: Nach 120 Minuten steht es unentschieden. ${gk
      ? 'Der letzte Schütze des Gegners läuft an. Hältst du, seid ihr Sieger!'
      : 'Du trittst als letzter Schütze an. Triffst du, habt ihr den Titel!'}</p>
    ${so.done
      ? `<div class="result"><p>${esc(so.text)}</p></div><div class="actions">${btn('Weiter', () => {
        S.shootouts.shift();
        if (!S.shootouts.length) S.phase = 'seasonEnd';
        render();
      }, 'primary')}</div>`
      : `<div class="choices">${dirs.map((d, i) => btn(esc(d), () => { resolveShootout(i); render(); })).join('')}</div>`}
  </section>`;
}
