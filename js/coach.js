'use strict';

// Trainerkarriere und gemeinsame Saison-Simulation für Trainer und Präsident

// Simuliert alle Ligen, Auf-/Abstieg und Stärke-Schwankungen
function worldSeason(ownClub, bonus) {
  const tables = {};
  for (const lg of LEAGUES) tables[lg.id] = simLeague(lg.id, ownClub, bonus);
  for (const lg of LEAGUES) S.lastTables[lg.id] = tables[lg.id].rows.map(r => r.name);
  S.lastTables[PROMOTION.lower].slice(0, PROMOTION.count).forEach(n => { S.clubs[n].league = PROMOTION.upper; });
  S.lastTables[PROMOTION.upper].slice(-PROMOTION.count).forEach(n => { S.clubs[n].league = PROMOTION.lower; });
  for (const n of Object.keys(S.clubs)) S.clubs[n].drift = S.clubs[n].drift * 0.6 + rand(-2.5, 2.5);
  return tables;
}

// Pokal und internationaler Wettbewerb eines Vereins ohne Spielerbezug
function managerCups(club, ownStr, europe, lines, titles) {
  const L = clubLeague(club);
  const pool = Object.keys(S.clubs).filter(n => n !== club && clubLeague(n).country === L.country).map(n => ({ name: n, str: clubStr(n) }));
  const cup = knockout(ownStr, ['1. Runde', '2. Runde', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'], pool, 4.5, true);
  if (cup.won) titles.push(`${L.cup}-Sieger`);
  else lines.push(`${L.cup}: Aus in der Runde „${cup.reached}“ gegen ${cup.lostTo}.`);
  let eu = null;
  if (europe) {
    const name = euroName(club, europe);
    const ep = euroPool(club, europe);
    const avg = ep.reduce((s, x) => s + x.str, 0) / Math.max(1, ep.length);
    if (!chance(sigmoid((ownStr - (avg - 3)) / 3.5))) lines.push(`${name}: Aus in der Ligaphase.`);
    else {
      eu = knockout(ownStr, ['K.-o.-Playoffs', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'], ep, 4.5);
      if (eu.won) titles.push(`${name}-Sieger`);
      else lines.push(`${name}: Aus in der Runde „${eu.reached}“ gegen ${eu.lostTo}.`);
    }
  }
  return { cup, europe: !!europe };
}

const TACTICS = {
  balanced: { name: 'Ausgeglichen', desc: 'Solide und berechenbar.' },
  offensive: { name: 'Offensiv', desc: 'Stark für Favoriten, riskant für Außenseiter.' },
  defensive: { name: 'Defensiv', desc: 'Hilft Außenseitern gegen Abstieg.' },
  pressing: { name: 'Gegenpressing', desc: 'Hoher Ertrag, aber die Spieler können einbrechen.' },
};
const POLICIES = {
  normal: { name: 'Normal', desc: 'Kader zusammenhalten.' },
  star: { name: 'Star holen', desc: 'Sofort stärker, aber der Vorstand erwartet mehr.' },
  youth: { name: 'Jugend fördern', desc: 'Nächste Saison deutlich stärker.' },
  save: { name: 'Sparen', desc: 'Der Vorstand ist geduldiger.' },
};

const COACH_EVENTS = [
  {
    text: 'Dein Starspieler beschwert sich öffentlich über zu wenig Einsatzzeit.',
    options: [
      { label: 'Ihn auf die Tribüne setzen', run: c => { c.bonus -= 0.03; c.skill += 1; return 'Die Mannschaft sieht: Du greifst durch.'; } },
      { label: 'Ihm mehr Spielzeit geben', run: c => { c.bonus += 0.02; c.board -= 1; return 'Er ist zufrieden, aber andere murren.'; } },
    ],
  },
  {
    text: 'Der Vorstand will bei der Aufstellung mitreden.',
    options: [
      { label: 'Klare Grenze ziehen', run: c => { c.board -= 2; c.bonus += 0.02; return 'Du behältst die Kontrolle, aber der Vorstand ist verärgert.'; } },
      { label: 'Kompromiss eingehen', run: c => { c.board += 2; c.bonus -= 0.02; return 'Der Frieden ist gewahrt.'; } },
    ],
  },
  {
    text: 'Zwei Spieler prügeln sich im Training.',
    options: [
      { label: 'Beide suspendieren', run: c => { c.bonus -= 0.02; c.skill += 1; return 'Harte, aber klare Linie.'; } },
      { label: 'Aussprache moderieren', run: c => { if (chance(0.6)) { c.bonus += 0.03; return 'Die beiden geben sich die Hand. Die Kabine ist wieder vereint.'; } c.bonus -= 0.03; return 'Die Aussprache bringt nichts – die Stimmung bleibt vergiftet.'; } },
    ],
  },
  {
    text: 'Ein 17-jähriges Talent brennt im Training alles ab.',
    options: [
      { label: 'Sofort in die Startelf', run: c => { if (chance(0.5)) { c.bonus += 0.05; return 'Das Talent schlägt voll ein und trifft gleich im ersten Spiel!'; } c.bonus -= 0.03; return 'Das Talent ist noch nicht so weit und wirkt nervös.'; } },
      { label: 'Langsam heranführen', run: c => { c.nextBoost = (c.nextBoost || 0) + 1; return 'Das Talent entwickelt sich in Ruhe.'; } },
    ],
  },
  {
    text: 'Die Presse fragt, ob du dir den Titel zutraust.',
    options: [
      { label: '„Wir wollen Meister werden!“', run: c => { c.board -= 2; c.bonus += 0.03; return 'Die Mannschaft ist heiß, die Erwartungen steigen.'; } },
      { label: 'Tiefstapeln', run: c => { c.board += 2; return 'Keiner erwartet zu viel von euch.'; } },
    ],
  },
];

function startCoach() {
  const fame = clamp((S.peak - 70) * 0.5 + S.titles.length * 0.5, 0, 25);
  S.coach = {
    club: null, skill: Math.round(45 + fame + (hasFlag('coachPrep') ? 6 : 0)), seasons: [], titles: [], fired: 0,
    tactic: 'balanced', policy: 'normal', bonus: 0, board: 0, event: null, last: null,
  };
  S.coachOffers = coachOffersFor(56, 62 + fame * 0.4, 3);
  S.phase = 'coachOffers';
}

function coachOffersFor(lo, hi, k) {
  const c = Object.keys(S.clubs).filter(n => n !== (S.coach && S.coach.club) && clubStr(n) >= lo && clubStr(n) <= hi);
  return shuffle(c).slice(0, k).sort((a, b) => clubStr(b) - clubStr(a));
}

function signCoach(club) {
  S.coach.club = club;
  S.coach.board = 0;
  S.coachOffers = null;
  newCoachSeason();
}

function newCoachSeason() {
  const c = S.coach;
  if (c.nextBoost) { S.clubs[c.club].base += c.nextBoost; c.nextBoost = 0; }
  c.bonus = 0;
  c.event = { i: randInt(0, COACH_EVENTS.length - 1), result: null };
  c.europe = europeFor(c.club);
  S.phase = 'coach';
}

function coachSeason() {
  const c = S.coach, club = c.club, L = clubLeague(club);
  const expected = clubsIn(L.id).sort((a, b) => clubStr(b) - clubStr(a)).indexOf(club) + 1;
  const str = clubStr(club);
  const avg = clubsIn(L.id).reduce((s, n) => s + clubStr(n), 0) / clubsIn(L.id).length;
  let bonus = c.bonus + (c.skill - 60) * 0.012;
  if (c.tactic === 'offensive') bonus += str > avg ? 0.1 : -0.06;
  if (c.tactic === 'defensive') bonus += str < avg ? 0.07 : -0.03;
  if (c.tactic === 'pressing') bonus += chance(0.7) ? 0.12 : -0.12;
  if (c.policy === 'star') S.clubs[club].base += 2;
  if (c.policy === 'youth') c.nextBoost = (c.nextBoost || 0) + 2;
  const tolerance = c.board + (c.policy === 'save' ? 3 : 0) - (c.policy === 'star' ? 2 : 0);
  const tables = worldSeason(club, bonus);
  const rows = tables[L.id].rows;
  const pos = rows.findIndex(r => r.name === club) + 1;
  const lines = [`${L.name}: ${club} wird ${pos}. von ${rows.length} (erwartet: ${expected}.).`];
  const titles = [];
  if (pos === 1) titles.push(L.champion);
  managerCups(club, clubStr(club) + (c.skill - 60) * 0.1, c.europe, lines, titles);
  titles.forEach(t => { lines.push(`🏆 ${t}!`); c.titles.push(`${t} (${seasonLabel(S.year)})`); });
  const diff = expected - pos + tolerance;
  let fired = false;
  if (diff <= -5 && !titles.length) { fired = true; c.fired++; lines.push(`❌ Der Vorstand ist unzufrieden und entlässt dich.`); }
  else if (diff >= 3 || titles.length) lines.push('👏 Der Vorstand ist begeistert von deiner Arbeit.');
  c.skill = clamp(c.skill + 1 + titles.length + (diff > 0 ? 1 : 0), 30, 99);
  c.seasons.push({ year: S.year, club, league: L.name, pos, teams: rows.length, titles: titles.length, fired });
  const success = diff + titles.length * 3;
  const hi = clubStr(club) + (fired ? -4 : 2 + clamp(success, 0, 8)) + (c.skill - 60) * 0.1;
  const offers = coachOffersFor(clubStr(club) - (fired ? 14 : 3), hi, fired ? randInt(0, 2) : randInt(0, 3));
  c.last = { lines, fired, offers, table: rows.map(r => ({ name: r.name, pts: r.pts })) };
  S.year++;
  S.player.age++;
  S.phase = 'coachEnd';
}

function endCoaching(reason) {
  const c = S.coach;
  const seasons = c.seasons.length;
  S.after = `${reason} In ${seasons} ${seasons === 1 ? 'Saison' : 'Saisons'} als Trainer gewinnst du ${c.titles.length} Titel.`;
  S.coachDone = { titles: c.titles.slice(), seasons, clubs: [...new Set(c.seasons.map(x => x.club))] };
  S.phase = 'retired';
  saveHallOfFame();
}

function renderCoach() {
  const c = S.coach;
  if (S.phase === 'coachOffers') {
    return `
    <section class="card">
      <h2>Trainerkarriere</h2>
      <p>Du machst deinen Trainerschein. Diese Vereine bieten dir einen Job an:</p>
      <div class="offers">${S.coachOffers.map(n => `
        <div class="offer">${crest(n)}<div class="offer-info"><strong>${esc(n)}</strong><small>${esc(clubLeague(n).name)} · Stärke ${clubStr(n)}</small></div>
        ${btn('Unterschreiben', () => { signCoach(n); render(); }, 'primary small')}</div>`).join('') || '<p>Keine Angebote.</p>'}</div>
      <div class="actions">${btn('Doch keine Trainerkarriere', () => { endCoaching('Du entscheidest dich gegen die Trainerbank.'); render(); })}</div>
    </section>`;
  }
  const club = c.club, L = clubLeague(club);
  const header = `
    <section class="player coachcard">
      <div class="rating silver"><b>${c.skill}</b><small>Trainer</small></div>
      <div class="pinfo">
        <h2>${esc(S.player.name)}</h2>
        <p>${S.player.age} Jahre · Trainer</p>
        <p class="clubline">${crest(club)} ${esc(club)} · ${esc(L.name)}</p>
        <p class="mv">Saison ${seasonLabel(S.year)} · ${c.titles.length} Titel als Trainer · Vermögen ${money(S.money)}</p>
      </div>
    </section>`;
  if (S.phase === 'coachEnd') {
    const l = c.last;
    const offers = l.offers.map(n => `
      <div class="offer">${crest(n)}<div class="offer-info"><strong>${esc(n)}</strong><small>${esc(clubLeague(n).name)} · Stärke ${clubStr(n)}</small></div>
      ${btn('Wechseln', () => { S.coach.club = n; S.coach.board = 0; newCoachSeason(); render(); }, 'primary small')}</div>`).join('');
    return `${header}
    <section class="card">
      <h2>Saisonbilanz als Trainer</h2>
      <ul class="lines">${l.lines.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <details class="table"><summary>Abschlusstabelle</summary>
        <ol>${l.table.map(t => `<li class="${t.name === club ? 'me' : ''}">${crest(t.name)}<span>${esc(t.name)}</span><b>${t.pts}</b></li>`).join('')}</ol>
      </details>
      ${offers ? `<h3>Angebote</h3><div class="offers">${offers}</div>` : ''}
      <div class="actions">
        ${l.fired ? '' : btn(`Bei ${esc(club)} weitermachen`, () => { newCoachSeason(); render(); }, offers ? '' : 'primary')}
        ${(l.fired && !offers) || S.player.age >= 75
          ? btn('Trainerkarriere beenden', () => { endCoaching(S.player.age >= 75 ? 'Mit 75 ist Schluss an der Seitenlinie.' : 'Kein Verein will dich mehr als Trainer.'); render(); }, 'primary')
          : btn('Trainerkarriere beenden', () => { endCoaching('Du beendest deine Trainerkarriere.'); render(); }, 'danger')}
      </div>
    </section>
    ${renderCoachHistory()}`;
  }
  const ev = COACH_EVENTS[c.event.i];
  const expected = clubsIn(L.id).sort((a, b) => clubStr(b) - clubStr(a)).indexOf(club) + 1;
  const pickBtn = (key, obj) => Object.entries(obj).map(([k, v]) => btn(`${esc(v.name)}<small>${esc(v.desc)}</small>`, () => { c[key] = k; render(true); }, c[key] === k ? 'chosen-focus' : '')).join('');
  return `${header}
  <section class="card">
    <h2>Saisonvorbereitung ${seasonLabel(S.year)}</h2>
    <ul class="facts">
      <li><span>Vereinsstärke</span><b>${clubStr(club)}</b></li>
      <li><span>Erwartung des Vorstands</span><b>${expected}. Platz</b></li>
      <li><span>Wettbewerbe</span><b>${esc([L.name, L.cup, euroName(club, c.europe)].filter(Boolean).join(', '))}</b></li>
    </ul>
    <h3>Situation in der Kabine</h3>
    <p>${esc(ev.text)}</p>
    ${c.event.result ? `<div class="result">${esc(c.event.result)}</div>` : `<div class="choices">${ev.options.map(o => btn(esc(o.label), () => { c.event.result = o.run(c); render(true); })).join('')}</div>`}
    <h3>Taktik</h3>
    <div class="focus">${pickBtn('tactic', TACTICS)}</div>
    <h3>Transferpolitik</h3>
    <div class="focus">${pickBtn('policy', POLICIES)}</div>
    <div class="actions">${btn('Saison spielen', () => { if (!c.event.result) return; coachSeason(); render(); }, c.event.result ? 'primary' : 'primary disabled')}</div>
    ${c.event.result ? '' : '<p class="muted">Entscheide zuerst die Situation in der Kabine.</p>'}
  </section>
  ${renderCoachHistory()}`;
}

function renderCoachHistory() {
  const c = S.coach;
  if (!c || !c.seasons.length) return '';
  return `
  <section class="card"><h3>Trainerstationen</h3><div class="scroll"><table>
    <thead><tr><th>Saison</th><th>Verein</th><th>Platz</th><th>Titel</th><th></th></tr></thead>
    <tbody>${c.seasons.map(s => `<tr><td>${seasonLabel(s.year)}</td><td class="club">${esc(s.club)}</td><td>${s.pos}.</td><td>${s.titles ? '🏆'.repeat(Math.min(4, s.titles)) : ''}</td><td>${s.fired ? 'entlassen' : ''}</td></tr>`).join('')}</tbody>
  </table></div></section>`;
}
