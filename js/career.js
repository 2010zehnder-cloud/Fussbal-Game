'use strict';

// Saisonziele, Traumverein, Nationalmannschaft, Social Media, Wohnort, Haustiere, Reha und Gericht

// ---------- Saisonziele ----------
function genSeasonGoals() {
  const p = S.player, se = S.season;
  if (S.youth) { se.goals = []; return; }
  const grp = POSITIONS[p.pos].group;
  const L = clubLeague(S.clubId);
  const expected = clubsIn(L.id).sort((a, b) => clubStr(b) - clubStr(a)).indexOf(S.clubId) + 1;
  const share = { 'Stammspieler': 0.85, 'Rotation': 0.55, 'Ergänzungsspieler': 0.25 }[se.role];
  const pool = [];
  const games = Math.max(5, Math.round((clubsIn(L.id).length - 1) * 2 * share * 0.9));
  pool.push({ type: 'games', target: games, text: `Mindestens ${games} Pflichtspiele` });
  if (grp === 'att' || grp === 'mid') {
    const g = Math.max(2, Math.round(games * POSITIONS[p.pos].goals * clamp(0.5 + (p.rating - 72) * 0.035, 0.2, 1.6)));
    pool.push({ type: 'goals', target: g, text: `Mindestens ${g} Tore` });
  }
  if (grp === 'mid' || p.pos === 'AV' || p.pos === 'FL') {
    const a = Math.max(2, Math.round(games * POSITIONS[p.pos].assists * 0.9));
    pool.push({ type: 'assists', target: a, text: `Mindestens ${a} Vorlagen` });
  }
  if (grp === 'gk') pool.push({ type: 'clean', target: Math.max(3, Math.round(games * 0.3)), text: `Mindestens ${Math.max(3, Math.round(games * 0.3))} Spiele zu null` });
  pool.push({ type: 'note', target: 3.0, text: 'Durchschnittsnote 3,0 oder besser' });
  pool.push({ type: 'pos', target: Math.max(1, expected - 1), text: expected <= 2 ? 'Meister werden' : `Mit dem Verein mindestens Platz ${Math.max(1, expected - 1)}` });
  if (se.role !== 'Stammspieler') pool.push({ type: 'starter', target: 1, text: 'Nächste Saison Stammspieler werden (Stärke steigern)' });
  se.goals = shuffle(pool).slice(0, 2);
}

function evalSeasonGoals(res) {
  const se = S.season;
  if (!se.goals || !se.goals.length) return;
  const results = se.goals.map(g => {
    let ok = false;
    if (g.type === 'games') ok = res.games >= g.target;
    else if (g.type === 'goals') ok = res.goals >= g.target;
    else if (g.type === 'assists') ok = res.assists >= g.target;
    else if (g.type === 'clean') ok = res.cleanSheets >= g.target;
    else if (g.type === 'note') ok = res.note !== null && res.note <= g.target;
    else if (g.type === 'pos') ok = res.pos <= g.target;
    else if (g.type === 'starter') ok = roleFor(S.player.rating, clubStr(S.clubId), S.player.trust) === 'Stammspieler';
    return { text: g.text, ok };
  });
  const done = results.filter(r => r.ok).length;
  if (done) {
    S.goalsDone = (S.goalsDone || 0) + done;
    S.player.popularity = clamp(S.player.popularity + 2 * done, 0, 100);
    S.player.trust = clamp(S.player.trust + 4 * done, 0, 100);
    S.money += S.contract.salary * 0.08 * done;
  }
  res.goalResults = results;
}

function renderGoalList(list, results) {
  if (!list || !list.length) return '';
  return `<ul class="goals">${list.map((g, i) => {
    const r = results && results[i];
    return `<li class="${r ? (r.ok ? 'ok' : 'fail') : ''}">${r ? (r.ok ? '✅' : '❌') : '🎯'} ${esc(g.text)}</li>`;
  }).join('')}</ul>`;
}

// ---------- Traumverein ----------
function dreamOffer(offers, newOffer, p) {
  const d = S.dreamClub;
  if (!d || d === S.clubId || offers.some(o => o.club === d)) return;
  const pChance = sigmoid((p.rating - clubStr(d) + 2) / 2) * (S.agent ? 1.3 : 1) * 0.8;
  if (chance(pChance)) { const o = newOffer(d); o.dream = true; offers.push(o); }
}
function renderDreamClub() {
  const all = Object.keys(S.clubs).sort((a, b) => a.localeCompare(b, 'de'));
  const d = S.dreamClub;
  return `
  <section class="card">
    <h2>Traumverein</h2>
    <p class="muted">${d ? `Dein Traumverein: <b>${esc(d)}</b> (Stärke ${clubStr(d)}). Je näher deine Stärke an der des Vereins ist, desto eher meldet er sich im Transferfenster.` : 'Wähle einen Traumverein. Dein Berater versucht dann jedes Jahr, dich dorthin zu bringen.'}</p>
    <label>Verein wählen<select id="dream-select"><option value="">– keiner –</option>${all.map(n => `<option${n === d ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <div class="actions">${btn('Speichern', () => { S.dreamClub = document.getElementById('dream-select').value || null; render(true); }, 'small')}</div>
  </section>`;
}

// ---------- Nationalmannschaft ----------
function nationalSeason(res) {
  const p = S.player, nat = nation();
  if (S.youth || p.age < 18 || S.fugitive || S.natRetired || p.rating < nat.str - 8 || res.games < 5) return;
  const games = randInt(4, 8);
  const goals = Math.round(games * POSITIONS[p.pos].goals * clamp((p.rating - 60) / 25, 0.2, 1.4) * rand(0.6, 1.3));
  p.caps += games; p.intGoals += goals;
  res.lines.push(`🌍 Nationalmannschaft: ${games} Länderspiele${goals ? `, ${goals} Tore` : ''} (insgesamt ${p.caps} Spiele, ${p.intGoals} Tore).`);
  if (!S.natCaptain && p.caps >= 40 && p.age >= 26 && p.rating >= nat.str) {
    S.natCaptain = true;
    res.lines.push(`⭐ Du wirst Kapitän der Nationalmannschaft von ${nat.name}!`);
  }
  if (p.caps >= 120 && !(S.milestones || []).some(m => m.id === 'natRecord')) addMilestone('natRecord', `Rekordnationalspieler von ${nat.name}`, res);
  if (p.intGoals >= 50 && !(S.milestones || []).some(m => m.id === 'natGoals')) addMilestone('natGoals', `Rekordtorschütze von ${nat.name}`, res);
}

// ---------- Social Media ----------
function social() { if (!S.social) S.social = { followers: 500 }; return S.social; }
function fmtFollowers(n) {
  if (n >= 1e6) return `${fmt1(n / 1e6)} Mio.`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} Tsd.`;
  return String(Math.round(n));
}
function addFollowers(f) {
  const so = social();
  so.followers = Math.max(50, Math.round(so.followers * f.mul + (f.add || 0)));
}
function socialSeason(res) {
  const so = social(), p = S.player;
  const before = so.followers;
  addFollowers({ mul: 1 + (p.popularity - 35) / 150 + res.titles.length * 0.08 + (res.goals >= 20 ? 0.1 : 0), add: Math.exp((p.rating - 60) / 8) * 300 });
  const diffF = so.followers - before;
  if (Math.abs(diffF) > 1000) res.lines.push(`📱 Social Media: ${diffF > 0 ? '+' : '−'}${fmtFollowers(Math.abs(diffF))} Follower (jetzt ${fmtFollowers(so.followers)}).`);
}
function shitstorm() {
  addFollowers({ mul: 0.88 });
  return 'Shitstorm! Tausende wütende Kommentare unter deinem Post.' + mod({ popularity: -8, form: -1 });
}
function renderSocial() {
  const so = social();
  const dealSum = Math.round(clamp(so.followers / 1e6 * 0.15, 0, 20) * 1000) / 1000;
  return `
    <h3>📱 Social Media · ${fmtFollowers(so.followers)} Follower</h3>
    <div class="lifeacts">
      ${actBtn('postTraining', 'Trainingsvideo posten', 'Sicher, bringt Follower', () => { addFollowers({ mul: 1.06, add: 300 }); return 'Die Fans lieben deinen Einsatz.' + mod({ popularity: 1 }); })}
      ${actBtn('postLuxury', 'Luxus-Post', 'Viele Follower, etwas riskant', () => {
        if (chance(0.25)) return shitstorm();
        addFollowers({ mul: 1.12, add: 800 }); return 'Dein Post mit Sportwagen und Pool geht viral.' + mod({ popularity: 2 });
      })}
      ${actBtn('postProvoke', 'Rivalen provozieren', 'Sehr riskant', () => {
        if (chance(0.45)) return shitstorm();
        addFollowers({ mul: 1.2, add: 1500 }); return 'Das Internet feiert deinen frechen Post.' + mod({ popularity: 4, trust: -2 });
      })}
      ${so.followers >= 1e5 ? actBtn('influencer', 'Influencer-Deal', `ca. ${money(dealSum)}`, () => 'Du bewirbst Energy-Drinks und Kopfhörer.' + mod({ money: dealSum, popularity: -1 })) : ''}
    </div>`;
}

// ---------- Wohnort ----------
const HOMES = {
  internat: { name: 'Internat', rent: 0, desc: 'Für Jugendspieler, kostenlos.', youthOnly: true },
  wg: { name: 'WG mit Teamkollegen', rent: 0.006, desc: 'Günstig, besseres Verhältnis zu Mitspielern.' },
  flat: { name: 'Stadtwohnung', rent: 0.02, desc: 'Nah am Nachtleben: mehr Beliebtheit, manchmal schlechte Form.', owned: 'home1' },
  country: { name: 'Haus auf dem Land', rent: 0.05, desc: 'Ruhe: bessere Form, weniger Verletzungen.' },
  villa: { name: 'Villa am Meer', rent: 0.5, desc: 'Luxus pur: mehr Beliebtheit und Form.', owned: 'home2' },
};
const homeOf = () => S.home || (S.youth ? 'internat' : 'flat');
const homeRent = id => (HOMES[id].owned && ownedCount(HOMES[id].owned)) || (id === 'villa' && ownedCount('home3')) ? 0 : HOMES[id].rent;
function homeSeason(res) {
  const id = homeOf(), p = S.player;
  if (S.youth && id === 'internat') return 0;
  const rent = homeRent(id);
  if (id === 'wg' && S.team) S.team.mates.forEach(m => { m.rel = clamp(m.rel + 6, -100, 100); });
  if (id === 'flat') { p.popularity = clamp(p.popularity + 1, 0, 100); if (chance(0.3)) p.form = clamp(p.form - 1, -10, 10); }
  if (id === 'country') { p.form = clamp(p.form + 1, -10, 10); p.injuryProne = clamp(p.injuryProne - 1, 0, 40); }
  if (id === 'villa') { p.popularity = clamp(p.popularity + 2, 0, 100); p.form = clamp(p.form + 1, -10, 10); }
  return rent;
}
function renderHome() {
  const cur = homeOf();
  return `
    <h3>🏠 Wohnort · ${esc(HOMES[cur].name)}</h3>
    <div class="focus">${Object.entries(HOMES).filter(([, h]) => !h.youthOnly || S.youth).map(([k, h]) => {
      const rent = homeRent(k);
      return btn(`${esc(h.name)}<small>${rent ? `${money(rent)}/Jahr` : 'kostenlos'} · ${esc(h.desc)}</small>`, () => { S.home = k; S.lifeMsg = `Du wohnst jetzt: ${h.name}.`; render(true); }, cur === k ? 'chosen-focus' : '');
    }).join('')}</div>`;
}

// ---------- Haustiere ----------
const PET_TYPES = { Hund: ['Bello', 'Rocky', 'Luna', 'Balu', 'Kiki'], Katze: ['Minka', 'Garfield', 'Mia', 'Simba', 'Tiger'], Papagei: ['Coco', 'Rio', 'Pelé', 'Kiwi'] };
function pets() { if (!S.pets) S.pets = []; return S.pets; }
function petsSeason(res) {
  const list = pets();
  if (!list.length) return 0;
  S.player.form = clamp(S.player.form + Math.min(2, list.length), -10, 10);
  const pet = pick(list);
  res.lines.push(`🐾 ${pet.type === 'Hund' ? 'Dein Hund' : pet.type === 'Katze' ? 'Deine Katze' : 'Dein Papagei'} ${pet.name} wartet nach jedem Spiel an der Tür und muntert dich auf.`);
  return list.length * 0.003;
}
function renderPets() {
  const list = pets();
  return `
    <h3>🐾 Haustiere${list.length ? ` · ${list.map(p => `${esc(p.name)} (${p.type})`).join(', ')}` : ''}</h3>
    <div class="lifeacts">${list.length < 3 ? Object.keys(PET_TYPES).map(t => actBtn(`pet${t}`, `${t} adoptieren`, 'aus dem Tierheim · 3 Tsd. €/Jahr', () => {
      const name = pick(PET_TYPES[t].filter(n => !list.some(p => p.name === n)));
      list.push({ type: t, name });
      return `Willkommen zu Hause, ${name}! Haustiere bringen jede Saison bessere Form.` + mod({ form: 1, popularity: 1, money: -0.002 });
    })).join('') : '<p class="muted">Mehr Tiere passen nicht ins Haus.</p>'}</div>`;
}

// ---------- Reha nach schwerer Verletzung ----------
const SERIOUS_INJURIES = ['Kreuzbandriss', 'Achillessehnenriss', 'Schienbeinbruch', 'Knorpelschaden im Knie'];
function maybeSeriousInjury() {
  if (S.youth) return false;
  const p = 0.03 * (diff().injury / 8) + S.player.injuryProne / 700;
  if (!chance(p)) return false;
  S.current = { type: 'rehab', ctx: {}, injury: pick(SERIOUS_INJURIES), stage: 0, progress: 0, risk: 0, log: [], result: null };
  return true;
}
const REHAB_STAGES = ['Woche 1–6: Operation und erste Reha', 'Woche 7–14: Aufbautraining', 'Woche 15+: Zurück ins Mannschaftstraining'];
const REHAB_CHOICES = [
  { label: 'Vorsichtig', sub: 'Langsam, aber sicher', prog: 1, risk: 0 },
  { label: 'Normal', sub: 'Nach Plan', prog: 2, risk: 0.08 },
  { label: 'Volle Belastung', sub: 'Schnell zurück, hohes Risiko', prog: 3, risk: 0.2 },
];
function rehabStep(ch) {
  const c = S.current;
  c.progress += ch.prog; c.risk += ch.risk;
  c.log.push(`${REHAB_STAGES[c.stage]}: ${ch.label}`);
  c.stage++;
  if (c.stage < REHAB_STAGES.length) return;
  let missed = Math.round(30 - c.progress * 2.6);
  let text = `Du bist nach ${missed} verpassten Spielen zurück auf dem Platz!`;
  const eff = { injuredGames: missed, injuryProne: 2 };
  if (chance(c.risk)) {
    missed += 10;
    eff.injuredGames = missed;
    S.player.rating = clamp(S.player.rating - 3, 35, 99);
    text = `Rückschlag! Du hast zu früh zu viel gemacht. Insgesamt verpasst du ${missed} Spiele und verlierst an Stärke.`;
    queueFx('sad');
  }
  c.result = `<p>${text}</p>` + mod(eff);
}
function renderRehab() {
  const c = S.current;
  return `
  <section class="card">
    ${stepHeader()}
    <h2>🚑 ${esc(c.injury)}!</h2>
    <p>Eine schwere Verletzung. Wie gehst du die Reha an? Je schneller, desto größer das Risiko eines Rückschlags.</p>
    <div class="rehabbar">${REHAB_STAGES.map((st, i) => `<span class="${i < c.stage ? 'done' : i === c.stage && !c.result ? 'now' : ''}">${i + 1}</span>`).join('')}</div>
    ${c.log.length ? `<ul class="lines">${c.log.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    ${c.result ? `<div class="result">${c.result}</div><div class="actions">${continueBtn()}</div>` : `
      <h3>${esc(REHAB_STAGES[c.stage])}</h3>
      <div class="choices">${REHAB_CHOICES.map(ch => btn(`${ch.label}<small>${ch.sub}</small>`, () => { rehabStep(ch); render(true); })).join('')}</div>`}
  </section>`;
}

// ---------- Gerichtsprozess ----------
function courtVerdict(lawyer) {
  const cs = S.court;
  const cost = { star: 0.15 + Math.max(0, S.money) * 0.03, normal: 0.01, confess: 0.005 }[lawyer];
  S.money -= cost;
  let text;
  const winP = { star: 0.7, normal: 0.35, confess: 0 }[lawyer];
  if (cs.plaintiff) {
    if (chance(winP + 0.15)) { const gain = 0.05 + S.player.popularity / 400; text = `Du gewinnst den Prozess und bekommst ${money(gain)} Schadenersatz.` + mod({ money: gain, popularity: 3 }); }
    else text = 'Das Gericht weist deine Klage ab.' + mod({ popularity: -2 });
  } else if (lawyer !== 'confess' && chance(winP)) {
    text = 'Freispruch! Du verlässt das Gericht erhobenen Hauptes.' + mod({ popularity: 2 });
  } else {
    const fine = (0.05 + Math.max(0, S.money) * 0.08) * cs.severity * (lawyer === 'confess' ? 0.5 : 1);
    text = `Schuldig. Du musst ${money(fine)} Strafe zahlen.` + mod({ money: -fine, popularity: lawyer === 'confess' ? -3 : -8, trust: -3 });
    if (cs.severity >= 2 && lawyer !== 'confess' && chance(0.35)) {
      S.ban = { type: 'prison', years: 1 };
      text += '<p>Außerdem verurteilt dich das Gericht zu einem Jahr Gefängnis. Nach der Saison musst du die Strafe antreten.</p>';
    }
  }
  S.court = null;
  return `<p>Anwaltskosten: ${money(cost)}.</p>` + text;
}
