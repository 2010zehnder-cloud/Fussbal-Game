'use strict';

// Rivale, Familie und Mitspieler

const FIRST_NAMES = ['Lukas', 'Jonas', 'Leon', 'Felix', 'Tim', 'Niklas', 'Julian', 'Marco', 'Kevin', 'Luca', 'Mateo', 'Diego',
  'Rafael', 'Hugo', 'Théo', 'Enzo', 'Kai', 'Ryan', 'Jamal', 'Youssef', 'Ismael', 'Mats', 'Emil', 'Tobias', 'Ivan', 'Andrej',
  'Kenji', 'Omar', 'Nico', 'Sandro'];
const SURNAMES = ['Becker', 'Schulz', 'Hoffmann', 'Wagner', 'Keller', 'Richter', 'Neumann', 'Krüger', 'Silva', 'Santos', 'García',
  'Martínez', 'Rossi', 'Bianchi', 'Dubois', 'Moreau', 'Smith', 'Walker', 'Jansen', 'de Vries', 'Kovač', 'Novak', 'Yılmaz',
  'Diallo', 'Mensah', 'Tanaka', 'Kim', 'Hansen', 'Nielsen', 'Costa'];
const BROTHER_NAMES = ['Leon', 'Paul', 'Ben', 'Finn', 'Elias', 'Noah', 'Luca', 'Matteo'];
const SISTER_NAMES = ['Mia', 'Emma', 'Lina', 'Ella', 'Mila', 'Sofia', 'Hanna', 'Lia'];
const randomName = () => `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`;

// ---------- Rivale ----------
function initRival() {
  const p = S.player;
  S.rival = {
    name: randomName(), nation: chance(0.5) ? p.nation : pick(NATIONS).name, pos: p.pos, age: p.age,
    rating: p.rating + randInt(-2, 3), potential: clamp(p.potential + randInt(-4, 4), 75, 99),
    club: pick(Object.keys(S.clubs).filter(n => n !== S.clubId && clubStr(n) >= 70)),
    games: 0, goals: 0, titles: 0, ballon: 0, retired: false, wins: 0, losses: 0, last: null,
  };
}
const rivalActive = () => S.rival && !S.rival.retired;

function rivalSeason(res) {
  const r = S.rival;
  if (!r || r.retired) return;
  const a = r.age;
  let g = a <= 19 ? 5 : a <= 22 ? 3.5 : a <= 25 ? 1.5 : a <= 28 ? 0.5 : a <= 30 ? -0.7 : a <= 32 ? -1.8 : -3.5;
  if (g > 0 && r.rating >= r.potential) g *= 0.15;
  r.rating = clamp(r.rating + g + rand(-1.2, 1.5), 40, 99);
  const str = clubStr(r.club);
  const games = r.age < 18 ? 0 : randInt(26, 48);
  const q = clamp(0.5 + (r.rating - 72) * 0.035 + (r.rating - str) * 0.02, 0.15, 1.8);
  const goals = Math.round(games * POSITIONS[r.pos].goals * q * rand(0.8, 1.2));
  r.games += games; r.goals += goals;
  const title = games > 0 && chance(sigmoid((str - 84) / 3) * 0.6);
  if (title) r.titles++;
  r.last = { games, goals, club: r.club, title };
  if (games) res.lines.push(`🆚 Dein Rivale ${r.name} (${r.club}): ${games} Spiele, ${goals} Tore${title ? ', holt einen Titel' : ''}, Stärke ${Math.round(r.rating)}.`);
  r.age++;
  if (chance(0.3)) {
    const cands = Object.keys(S.clubs).filter(n => n !== r.club && n !== S.clubId && Math.abs(clubStr(n) - r.rating) <= 4);
    if (cands.length) { r.club = pick(cands); res.lines.push(`🆚 ${r.name} wechselt zu ${r.club}.`); }
  }
  if ((r.age >= 35 && chance(0.4)) || r.age >= 38) { r.retired = true; res.lines.push(`👋 Dein ewiger Rivale ${r.name} beendet die Karriere.`); }
}

// Wertung des Rivalen für den Ballon d'Or
function rivalBallonScore() {
  if (!rivalActive() || !S.rival.last || !S.rival.last.games) return 0;
  return S.rival.rating + rand(-1, 4) + (S.rival.last.title ? 1.5 : 0);
}

// ---------- Familie ----------
function makeSibling(ageBase) {
  const brother = chance(0.5);
  const footballer = chance(0.4);
  return {
    name: pick(brother ? BROTHER_NAMES : SISTER_NAMES), brother, age: clamp(ageBase + randInt(-5, 5), 3, 60),
    footballer, rating: footballer ? randInt(45, 56) : 0, club: null, rel: 60,
  };
}
function initFamily(heir) {
  if (heir && heir.family) { S.family = heir.family; return; }
  S.family = {
    parents: [
      { role: 'Vater', name: pick(['Thomas', 'Michael', 'Stefan', 'Andreas', 'Frank', 'Carlos', 'Ahmet', 'Marco']), age: randInt(40, 50), alive: true, rel: 70 },
      { role: 'Mutter', name: pick(['Sabine', 'Andrea', 'Petra', 'Claudia', 'Maria', 'Ayşe', 'Elena', 'Nicole']), age: randInt(38, 48), alive: true, rel: 75 },
    ],
    siblings: Array.from({ length: randInt(0, 2) }, () => makeSibling(S.player.age)),
  };
}
function family() {
  if (!S.family) initFamily(null);
  return S.family;
}
const sibWord = s => (s.brother ? 'Bruder' : 'Schwester');
const sibPossessive = s => (s.brother ? 'Dein Bruder' : 'Deine Schwester');

function familySeason(res) {
  const f = family();
  for (const par of f.parents) {
    if (!par.alive) continue;
    par.age++;
    par.rel = clamp(par.rel - 4, 0, 100);
    if (par.age > 68 && chance((par.age - 68) * 0.03)) {
      par.alive = false;
      S.player.form = clamp(S.player.form - 3, -10, 10);
      res.lines.push(`🕊️ ${par.role === 'Elternteil' ? 'Dein Elternteil' : par.role === 'Vater' ? 'Dein Vater' : 'Deine Mutter'} ${par.name} ist mit ${par.age} Jahren gestorben. Die ganze Mannschaft trägt Trauerflor.`);
    }
  }
  for (const s of f.siblings) {
    s.age++;
    s.rel = clamp(s.rel - 3, 0, 100);
    if (!s.footballer || s.age < 17) continue;
    if (!s.club) {
      s.club = pick(Object.keys(S.clubs).filter(n => clubStr(n) <= 66));
      res.lines.push(`⚽ ${sibPossessive(s)} ${s.name} unterschreibt ${s.brother ? 'einen Profivertrag bei' : 'beim Frauenteam von'} ${s.club}!`);
    }
    const g = s.age <= 22 ? 3 : s.age <= 27 ? 0.8 : s.age <= 31 ? -0.5 : -2.5;
    s.rating = clamp(s.rating + g + rand(-1, 1.5), 40, 95);
    if (chance(0.25)) {
      const c = Object.keys(S.clubs).filter(n => Math.abs(clubStr(n) - s.rating) <= 4);
      if (c.length) s.club = pick(c);
    }
    if (s.age >= 34) { s.footballer = false; res.lines.push(`${sibPossessive(s)} ${s.name} beendet die Fußballkarriere.`); }
  }
}

// ---------- Mitspieler ----------
function initTeam() {
  S.team = {
    club: S.clubId,
    mates: Array.from({ length: 4 }, () => ({ name: randomName(), pos: pick(Object.keys(POSITIONS)), rel: randInt(-10, 30) })),
  };
}
function ensureTeam() {
  if (!S.team || S.team.club !== S.clubId) initTeam();
  return S.team;
}
const relLabel = r => (r >= 60 ? '💚 beste Freundschaft' : r >= 25 ? '🙂 befreundet' : r > -30 ? '😐 neutral' : '😠 Feindschaft');

function teamSeason(res) {
  if (!S.team || S.youth) return;
  const best = S.team.mates.filter(m => m.rel >= 60).length;
  const enemies = S.team.mates.filter(m => m.rel <= -30).length;
  if (best) {
    S.player.form = clamp(S.player.form + Math.min(2, best), -10, 10);
    S.player.trust = clamp(S.player.trust + 2 * best, 0, 100);
    res.lines.push(`💚 Deine Freundschaften in der Kabine geben dir Rückhalt (${best}× beste Freundschaft).`);
  }
  if (enemies) {
    S.player.trust = clamp(S.player.trust - 3 * enemies, 0, 100);
    res.lines.push(`😠 Stress in der Kabine: ${enemies} ${enemies === 1 ? 'Mitspieler arbeitet' : 'Mitspieler arbeiten'} gegen dich.`);
  }
  for (const m of S.team.mates) m.rel = Math.round(m.rel * 0.9);
}

// ---------- Oberfläche: Familie & Mannschaft ----------
function renderPeople() {
  const f = family(), p = S.player;
  const parents = f.parents.map((par, i) => {
    if (!par.alive) return `<div class="person"><div><strong>${esc(par.name)}</strong><small>${esc(par.role)} · verstorben 🕊️</small></div></div>`;
    const gift = Math.max(0.005, S.money * 0.02);
    return `<div class="person">
      <div><strong>${esc(par.name)}</strong><small>${esc(par.role)} · ${par.age} Jahre</small>${bar('Verhältnis', par.rel, 100)}</div>
      <div class="lifeacts">
        ${pBtn(`visit${i}`, 'Besuchen', 'Zeit mit der Familie', () => `${par.name} freut sich riesig über deinen Besuch.` + mod({ form: 1 }) + relChip(par, 12))}
        ${pBtn(`pgift${i}`, 'Geld schenken', money(gift), () => `${par.name} ist gerührt.` + mod({ money: -gift, popularity: 1 }) + relChip(par, 18))}
      </div>
    </div>`;
  }).join('');
  const sibs = f.siblings.map((s, i) => {
    const help = Math.max(0.005, S.money * 0.02);
    const info = s.footballer && s.club ? `Fußballprofi bei ${s.club} · Stärke ${Math.round(s.rating)}` : s.footballer ? 'will Fußballprofi werden' : `${s.age} Jahre`;
    return `<div class="person">
      <div><strong>${esc(s.name)}</strong><small>${sibWord(s)} · ${esc(info)}</small>${bar('Verhältnis', s.rel, 100)}</div>
      <div class="lifeacts">
        ${pBtn(`sib${i}`, 'Zusammen abhängen', 'Zocken, Essen, Quatschen', () => `Ein lustiger Abend mit ${s.name}.` + mod({ form: 1 }) + relChip(s, 12))}
        ${pBtn(`sibhelp${i}`, 'Finanziell unterstützen', money(help), () => `${s.name} bedankt sich tausendmal.` + mod({ money: -help }) + relChip(s, 15))}
      </div>
    </div>`;
  }).join('');
  const team = S.youth ? '' : ensureTeam().mates.map((m, i) => `
    <div class="person">
      <div><strong>${esc(m.name)}</strong><small>${esc(POSITIONS[m.pos].name)} · ${relLabel(m.rel)}</small></div>
      <div class="lifeacts">
        ${pBtn(`mtrain${i}`, 'Zusammen trainieren', 'Freundschaft + Entwicklung', () => `Du und ${m.name} schiebt Extraschichten.` + mod({ devBonus: 0.2 }) + relChip(m, 12))}
        ${pBtn(`mprank${i}`, 'Streich spielen', 'Kann lustig werden … oder nicht', () => chance(0.55)
          ? `${m.name} lacht sich schlapp. Die Kabine feiert euch.` + relChip(m, 12)
          : `${m.name} findet das gar nicht witzig.` + relChip(m, -20))}
        ${pBtn(`minsult${i}`, 'Anlegen', 'Streit suchen', () => `Du legst dich mit ${m.name} an. Die Stimmung ist im Keller.` + mod({ trust: -2 }) + relChip(m, -30))}
      </div>
    </div>`).join('');
  const r = S.rival;
  const rival = r ? `<p class="muted">🆚 Rivale: <b>${esc(r.name)}</b> (${esc(r.nation)}) · ${r.retired ? 'Karriere beendet' : `${esc(r.club)} · Stärke ${Math.round(r.rating)}`} · ${r.goals} Tore, ${r.titles} Titel${r.ballon ? `, ${r.ballon}× Ballon d'Or` : ''} · direkte Duelle ${r.wins}:${r.losses}</p>` : '';
  return `
  <section class="card">
    <details${S.peopleMsg ? ' open' : ''}><summary>Familie, Mannschaft &amp; Rivale</summary>
      ${S.peopleMsg ? `<div class="result">${S.peopleMsg}</div>` : ''}
      <h3>Familie</h3>
      <div class="people">${parents}${sibs || '<p class="muted">Du hast keine Geschwister.</p>'}</div>
      ${team ? `<h3>Mannschaft</h3><div class="people">${team}</div>` : ''}
      ${rival ? `<h3>Rivale</h3>${rival}` : ''}
    </details>
  </section>`;
}

// Beziehungswert einer Person ändern und als Chip anzeigen
function relChip(person, v) {
  person.rel = clamp(person.rel + v, -100, 100);
  return `<div class="chips"><span class="chip ${v > 0 ? 'up' : 'down'}">Verhältnis ${v > 0 ? '+' : '−'}${Math.abs(v)}</span></div>`;
}

function pBtn(k, label, sub, fn) {
  const used = actUsed(k);
  return btn(`${label}<small>${used ? 'diese Saison schon gemacht' : sub}</small>`,
    used ? () => {} : () => { useAct(k); S.peopleMsg = fn(); S.lifeMsg = null; render(true); }, used ? 'small disabled' : 'small');
}
