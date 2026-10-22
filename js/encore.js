'use strict';

// Turnierbaum, Tor des Monats, Fangesang, Comeback, Fußballschule und Karriere-Doku

// ---------- Turnierbaum (WM / EM) ----------
function matchScore(a, b) {
  const d = clamp((a - b) / 16, -1, 1);
  return [poisson(1.25 * Math.exp(d)), poisson(1.25 * Math.exp(-d))];
}

function simTournament(ownStr, me, pool, rounds) {
  const sorted = pool.slice().sort((a, b) => b.str - a.str);
  const used = new Set();
  const take = (lo, hi) => {
    const n = sorted.length;
    const from = Math.min(n - 1, Math.floor(n * lo));
    let cands = sorted.slice(from, Math.max(from + 1, Math.ceil(n * hi))).filter(x => !used.has(x.name));
    if (!cands.length) cands = sorted.filter(x => !used.has(x.name));
    const o = pick(cands.length ? cands : sorted);
    used.add(o.name);
    return o;
  };
  // Gruppe: ein starker, ein mittlerer und ein schwächerer Gegner
  const teams = [{ name: me, str: ownStr, me: true }, take(0, 0.3), take(0.3, 0.65), take(0.65, 1)]
    .map(t => ({ name: t.name, str: t.str, me: !!t.me, pts: 0, gf: 0, ga: 0 }));
  const games = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const [x, y] = matchScore(teams[i].str, teams[j].str);
    teams[i].gf += x; teams[i].ga += y; teams[j].gf += y; teams[j].ga += x;
    if (x > y) teams[i].pts += 3; else if (x < y) teams[j].pts += 3; else { teams[i].pts++; teams[j].pts++; }
    if (i === 0) games.push({ opp: teams[j].name, us: x, them: y });
  }
  const rows = teams.slice().sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || (b.me ? 1 : 0) - (a.me ? 1 : 0));
  const pos = rows.findIndex(r => r.me) + 1;
  const br = { group: { rows: rows.map(r => ({ name: r.name, pts: r.pts, gd: r.gf - r.ga, me: r.me })), games, pos }, ko: [], rounds, out: null, me };
  if (pos > 2) { br.out = 'Gruppenphase'; return br; }
  for (let i = 1; i < rounds.length; i++) {
    const round = rounds[i];
    const [lo, hi] = { Sechzehntelfinale: [0.35, 0.9], Achtelfinale: [0.2, 0.7], Viertelfinale: [0.05, 0.45] }[round] || [0, 0.4];
    const opp = take(lo, hi);
    const m = { round, opp: opp.name, oppStr: opp.str };
    br.ko.push(m);
    if (round === 'Halbfinale') {
      const fin = take(0, 0.3);
      m.live = true; m.finalOpp = fin.name;
      return br;
    }
    const [x, y] = matchScore(ownStr, opp.str);
    m.us = x; m.them = y;
    if (x === y) { m.pens = true; m.won = chance(sigmoid((ownStr - opp.str) / 10)); } else m.won = x > y;
    if (!m.won) { br.out = round; return br; }
  }
  return br;
}

function queueNationSemi(semi, title, summer, comp, ownStr) {
  S.finals = S.finals || [];
  S.finals.push({ kind: 'nation', semi: true, title: `${title} ${summer}`, comp, opp: semi.opp, finalOpp: semi.finalOpp, ownStr,
    oppStr: opponentStrength(semi.opp), us: 0, them: 0, scene: 0, log: [], current: null, done: false });
}

const curBracket = () => S.seasonEnd && S.seasonEnd.tournament && S.seasonEnd.tournament.bracket;

function bracketResult(round, won, us, them, pens = false) {
  const br = curBracket();
  if (!br) return;
  const m = br.ko.find(x => x.round === round);
  if (!m) return;
  if (us !== null) { m.us = us; m.them = them; }
  if (pens) m.pens = true;
  if (won !== null) { m.won = won; if (!won) br.out = round; }
}

// Halbfinale beendet: bei Sieg folgt das Finale live
function semiDone(f) {
  const res = S.seasonEnd, nat = S.player.nation;
  let won = f.us > f.them;
  let pens = false;
  if (f.us === f.them) { pens = true; won = chance(sigmoid((f.ownStr - f.oppStr) / 10) * 0.6 + quality() * 0.3); }
  bracketResult('Halbfinale', won, f.us, f.them, pens);
  S.player.caps++;
  if (won) {
    f.verdict = `${pens ? `${f.us}:${f.them} – im Elfmeterschießen gewonnen` : `${f.us}:${f.them} gewonnen`}! ${nat} steht im Finale gegen ${f.finalOpp}!`;
    res.lines.push(`🏟️ Halbfinale gegen ${f.opp} ${pens ? 'im Elfmeterschießen ' : ''}gewonnen – Finale gegen ${f.finalOpp}!`);
    const br = curBracket();
    if (br) br.ko.push({ round: 'Finale', opp: f.finalOpp, live: true });
    S.finals.push({ kind: 'nation', title: f.title, comp: f.comp, opp: f.finalOpp, ownStr: f.ownStr, oppStr: opponentStrength(f.finalOpp),
      us: 0, them: 0, scene: 0, log: [], current: null, done: false });
    queueFx('fanfare');
  } else {
    f.verdict = `Aus im Halbfinale gegen ${f.opp} (${f.us}:${f.them}${pens ? ', im Elfmeterschießen' : ''}). So nah dran …`;
    res.lines.push(`💔 Aus im Halbfinale gegen ${f.opp}.`);
    queueFx('sad');
  }
}

function renderBracket(br) {
  if (!br) return '';
  const g = br.group;
  const score = m => m.us === undefined ? (m.live && m.won === undefined ? 'live' : '–') : `${m.us}:${m.them}${m.pens ? ' n. E.' : ''}`;
  const cls = m => m.won === true ? 'win' : m.won === false ? 'loss' : '';
  const future = br.rounds.slice(1 + br.ko.length).filter(() => !br.out);
  return `
  <div class="bracket">
    <div class="br-col">
      <b class="br-round">Gruppe</b>
      <table class="br-group">${g.rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}${i < 2 ? ' through' : ''}"><td>${i + 1}.</td><td>${esc(r.name)}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table>
      <small class="muted">${g.games.map(x => `${x.us}:${x.them} ${esc(x.opp)}`).join(' · ')}</small>
    </div>
    ${br.ko.map(m => `<div class="br-col"><b class="br-round">${esc(m.round)}</b>
      <div class="br-match ${cls(m)}"><span>${esc(br.me)}</span><b>${score(m)}</b><span>${esc(m.opp)}</span></div></div>`).join('')}
    ${future.map(r => `<div class="br-col"><b class="br-round">${esc(r)}</b><div class="br-match empty"><span>?</span></div></div>`).join('')}
  </div>`;
}

// ---------- Tor des Monats ----------
function noteGoal(c, o, success, text) {
  if (!success || o.kind !== 'goal' || S.youth) return;
  const desc = String(text).replace(/<[^>]+>/g, '').replace(/^(TOR|DRIN|JA|WAHNSINN)[^!]*!\s*/i, '').split(/(?<=[.!])\s/)[0];
  S.season.goalList = S.season.goalList || [];
  S.season.goalList.push({ desc, opp: c.opp, comp: c.comp, special: !!o.bonus || !!c.wonder || /Freistoß|Fallrückzieher|Seitfallzieher|Solo|Mauer|Lupfer|Hacke/i.test(text) });
}

function goalOfMonth(res) {
  const list = (S.season && S.season.goalList) || [];
  if (!list.length || res.role === 'U19') return;
  const best = list.find(g => g.special) || list[0];
  const share = clamp(0.25 + (best.special ? 0.22 : 0) + S.player.popularity / 400 + rand(-0.12, 0.12), 0.08, 0.75);
  const rivals = [randomName(), randomName()];
  const restA = rand(0.3, 0.7) * (1 - share);
  const votes = [{ name: S.player.name, desc: best.desc, opp: best.opp, pct: share, me: true },
    { name: rivals[0], pct: restA }, { name: rivals[1], pct: 1 - share - restA }]
    .map(v => ({ ...v, pct: Math.round(v.pct * 100) }));
  const won = votes[0].pct >= Math.max(votes[1].pct, votes[2].pct);
  res.goalVote = { votes, won };
  if (won) {
    S.goalAwards = (S.goalAwards || 0) + 1;
    res.lines.push(`🎯 Dein Treffer gegen ${best.opp} wird zum Tor des Monats gewählt (${votes[0].pct} %)!`);
    addPhoto('🎯', `Tor des Monats gegen ${best.opp}`);
  } else res.lines.push(`Dein Treffer gegen ${best.opp} war für das Tor des Monats nominiert (${votes[0].pct} %).`);
}

function renderGoalVote(r) {
  const v = r.goalVote;
  if (!v) return '';
  return `<h3>🎯 Tor des Monats – Abstimmung</h3>
    <p class="muted">Nominiert: ${esc(v.votes[0].desc)} (gegen ${esc(v.votes[0].opp)})</p>
    <div class="votes">${v.votes.slice().sort((a, b) => b.pct - a.pct).map(x => `<div class="vote${x.me ? ' me' : ''}"><span>${esc(x.name)}</span>
      <div class="vbar"><i style="width:${x.pct}%"></i></div><b>${x.pct} %</b></div>`).join('')}</div>
    <p>${v.won ? '🏆 Gewonnen! Das Tor landet in deinem Fotoalbum.' : 'Knapp nicht gewonnen – nächstes Mal!'}</p>`;
}

// ---------- Fangesang ----------
const firstName = () => S.player.name.trim().split(/\s+/)[0];
const surname = () => S.player.name.trim().split(/\s+/).slice(-1)[0];
const clubShort = club => club.replace(/^(1\. )?(FC|SC|SV|VfB|VfL|TSG|AC|AS|SSC|RB|CF|SL|FK|AFC|CA|SE|CR|RC|OGC)\s+/, '').replace(/\s+(FC|CF|SC)$/, '');

function chantVerses(level, club) {
  const n = surname(), f = firstName(), c = clubShort(club);
  const v = [`„${n}, ${n}, olé, olé!“`];
  if (level >= 2) v.push(`„Wer schießt die Tore für ${c}? ${f} ${n}, unser Star!“`);
  if (level >= 3) v.push(`„${n}, ${n}, du holst uns den Pokal – ${c} singt für dich!“`);
  if (level >= 4) v.push(`„Es gibt nur einen ${n}! Nur einen ${n}! Für immer ${c}!“`);
  return v;
}

function updateChant(res) {
  if (res.role === 'U19' || res.loan) return;
  const club = res.club;
  if (!S.chant || S.chant.club !== club) S.chant = { club, level: 0, mock: false };
  const ch = S.chant;
  const cs = clubStats().find(x => x.club === club) || { titles: 0, seasons: 0 };
  if (S.ban || S.court) {
    ch.mock = true;
    res.lines.push(`🎶 Die gegnerischen Fans singen jetzt: „Wo ist ${surname()}? Er sitzt im Abseits – für immer!“`);
    return;
  }
  ch.mock = false;
  const lvl = (res.games >= 12 && S.player.popularity >= 35 ? 1 : 0) + (res.goals + res.assists >= 15 || res.note !== null && res.note <= 2.4 ? 1 : 0)
    + (cs.titles >= 1 ? 1 : 0) + (cs.seasons >= 5 || cs.titles >= 4 ? 1 : 0);
  if (lvl > ch.level) {
    ch.level = lvl;
    const verses = chantVerses(lvl, club);
    res.lines.push(`🎶 ${ch.level === 1 ? 'Die Fans haben ein Lied für dich' : 'Dein Fangesang bekommt eine neue Strophe'}: ${verses[verses.length - 1]}`);
    if (ch.level === 1) addPhoto('🎶', `Erster Fangesang bei ${club}`);
  }
}

function chantTransfer(oldClub, newClub) {
  const ch = S.chant;
  if (!ch || ch.club !== oldClub || ch.level < 1) return;
  const mock = chance(0.6)
    ? `Die Fans von ${oldClub} haben dein Lied umgedichtet: „${surname()}, ${surname()}, du Söldner – geh doch nach ${clubShort(newClub)}!“`
    : `Die Fans von ${oldClub} singen dein Lied weiter – mit Tränen in den Augen: „${surname()}, wir vergessen dich nie!“`;
  sendMail(`Fans von ${oldClub}`, mock);
  S.chant = { club: newClub, level: 0, mock: false };
}

// Gelegentlich singen die Fans im Spiel
function chantIntro() {
  const ch = S.chant;
  if (!ch || ch.club !== S.clubId || !chance(0.25)) return '';
  if (ch.mock) return `Die Gästefans pfeifen bei jeder deiner Ballberührungen. `;
  if (ch.level < 1) return '';
  return `Die Kurve singt: ${pick(chantVerses(ch.level, ch.club))} `;
}

function renderChant() {
  const ch = S.chant;
  if (!ch || ch.level < 1) return '';
  return `<section class="card"><h2>🎶 Dein Fangesang</h2><p class="muted">Gesungen von den Fans von ${esc(ch.club)}</p>
    <ul class="lines chant">${chantVerses(ch.level, ch.club).map(v => `<li>${esc(v)}</li>`).join('')}</ul></section>`;
}

// ---------- Comeback aus dem Ruhestand ----------
function comebackOffer() {
  if (S.comeback || S.coachDone || S.ownerDone || !S.after || S.fugitive) return null;
  const age = S.retireAge || S.player.age;
  if (age > 38 || totals().seasons < 4) return null;
  if (!S.comebackClub) {
    const youthClub = (S.history.find(h => h.youth) || {}).club;
    const mls = clubsIn('mls').sort((a, b) => clubStr(b) - clubStr(a)).slice(0, 8);
    S.comebackClub = youthClub && youthClub !== S.clubId && chance(0.6) ? youthClub : pick(mls);
    S.comebackYears = randInt(1, 2);
  }
  return S.comebackClub;
}

function startComeback() {
  const club = S.comebackClub, p = S.player;
  S.comeback = { club, year: S.year };
  for (let i = 0; i < S.comebackYears; i++) { p.age++; S.year++; p.rating = Math.max(45, p.rating - 3); }
  p.form = 2; p.trust = 60;
  S.clubId = club; S.loan = null; S.youth = false;
  S.contract = { salary: salaryFor(p.rating, club, roleFor(p.rating, clubStr(club), 60)), years: 1 };
  S.lastDance = true;
  S.phase = 'preseason';
  setHeadline(`SENSATION! ${lastName()} KEHRT ZURÜCK – ZU ${club.toUpperCase()}!`);
  addPhoto('📞', `Comeback bei ${club}`);
  startSeason();
}

function renderComeback() {
  const club = comebackOffer();
  if (!club) return '';
  const y = S.comebackYears;
  return `
  <section class="card">
    <h2>📞 Ein überraschender Anruf</h2>
    <p>${y === 1 ? 'Ein Jahr' : 'Zwei Jahre'} nach deinem Karriereende klingelt das Telefon. ${esc(club)} will dich zurück – für eine allerletzte Saison.
      Du bist nicht mehr so fit wie früher, aber die Fans würden ausrasten.</p>
    <div class="choices">${btn(`Comeback bei ${esc(club)}<small>eine letzte Saison</small>`, () => { startComeback(); render(); })}
      ${btn('Nein, es ist gut so<small>der Ruhestand bleibt</small>', () => { S.comeback = { declined: true }; render(true); })}</div>
  </section>`;
}

// ---------- Fußballschule ----------
const SCHOOL_COST = 2;

function foundSchool() {
  S.money -= SCHOOL_COST;
  S.school = {
    name: `Fußballschule ${surname()}`, founder: S.player.name, founded: S.year,
    talents: Array.from({ length: 3 }, () => ({ name: randomName(), pos: pick(Object.keys(POSITIONS)), born: S.year - randInt(9, 12), talent: randInt(60, 95) })),
  };
  S.player.popularity = clamp(S.player.popularity + 5, 0, 100);
  addPhoto('🏫', `Eröffnung der ${S.school.name}`);
}

// Was aus den Talenten geworden ist – abhängig von der vergangenen Zeit
function gradStatus(t, year) {
  const age = year - t.born;
  if (age < 17) return { age, text: `${age} Jahre, noch in der Fußballschule` };
  const clubs = Object.keys(S.clubs).sort((a, b) => clubStr(b) - clubStr(a));
  let h = 0;
  for (const ch of t.name) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  const tier = t.talent >= 88 ? 0.05 : t.talent >= 78 ? 0.2 : t.talent >= 68 ? 0.45 : 0.75;
  const club = clubs[Math.min(clubs.length - 1, Math.floor(clubs.length * tier) + (h % 12))];
  return { age, club, text: `${age} Jahre, Profi bei ${club}` };
}

function renderSchool() {
  if (S.coachDone || S.ownerDone) return '';
  const sc = S.school;
  if (!sc) {
    if (!S.after) return '';
    return `
    <section class="card">
      <h2>🏫 Eigene Fußballschule</h2>
      <p>Gründe eine Fußballschule mit deinem Namen. Deine Talente tauchen später als echte Spieler auf – vielleicht sogar als Mitspieler oder Gegner deines Kindes.</p>
      <div class="actions">${S.money >= SCHOOL_COST ? btn(`Fußballschule gründen<small>${money(SCHOOL_COST)}</small>`, () => { foundSchool(); render(true); }, 'primary') : `<p class="muted">Dafür brauchst du ${money(SCHOOL_COST)}.</p>`}</div>
    </section>`;
  }
  return `
  <section class="card">
    <h2>🏫 ${esc(sc.name)}</h2>
    <p class="muted">Gegründet ${sc.founded}. Deine größten Talente:</p>
    <ul class="lines">${sc.talents.map(t => `<li>⚽ <b>${esc(t.name)}</b> (${esc(POSITIONS[t.pos].name)}) – ${esc(gradStatus(t, S.year).text)}</li>`).join('')}</ul>
  </section>`;
}

// Für das Kind: Absolventen der Fußballschule des Elternteils
function schoolGrads() {
  const ps = S.parentSchool;
  if (!ps) return [];
  return ps.talents.map(t => ({ ...t, ...gradStatus(t, S.year), founder: ps.founder, school: ps.name })).filter(t => t.club);
}

function schoolMention(opp) {
  if (S.youth || !chance(0.35)) return '';
  const grads = schoolGrads();
  const mate = grads.find(t => t.club === S.clubId);
  const foe = grads.find(t => t.club === opp);
  if (foe) return `Bei ${opp} spielt ${foe.name} – ein Absolvent der ${foe.school}. Vor dem Anpfiff erzählt er dir, was ${foe.founder} ihm beigebracht hat. `;
  if (mate && chance(0.5)) return `Dein Mitspieler ${mate.name} kommt aus der ${mate.school} von ${mate.founder}. Ihr versteht euch blind. `;
  return '';
}

// ---------- Doku über die Karriere ----------
function careerDoc() {
  const pro = S.history.filter(h => !h.youth);
  if (pro.length < 3) return null;
  const n = surname();
  const chapters = [];
  const first = pro.find(h => !h.banned);
  if (first) chapters.push(['Der Anfang', first.year, `Mit ${first.age} Jahren beginnt bei ${first.club} alles.`]);
  const rise = pro.find(h => !h.banned && h.role === 'Stammspieler' && clubStr(h.club) >= 78) || pro.find(h => h.role === 'Stammspieler');
  if (rise && rise !== first) chapters.push(['Der Aufstieg', rise.year, `Bei ${rise.club} wird ${n} zum Stammspieler – ${rise.goals} Tore in einer Saison.`]);
  const peak = pro.filter(h => !h.banned).sort((a, b) => (b.titles * 10 + b.goals + b.assists * 0.5) - (a.titles * 10 + a.goals + a.assists * 0.5))[0];
  if (peak) chapters.push(['Der Höhepunkt', peak.year, `${peak.titles ? `${peak.titles} ${peak.titles === 1 ? 'Titel' : 'Titel'} und ` : ''}${peak.goals} Tore für ${peak.club} – die Welt schaut auf ${n}.`]);
  const banned = pro.find(h => h.banned);
  const drop = pro.slice(1).map((h, i) => ({ h, d: h.rating - pro[i].rating })).filter(x => !x.h.banned && x.h.age < 32).sort((a, b) => a.d - b.d)[0];
  let fall = null;
  if (banned) fall = ['Der Absturz', banned.year, banned.club === 'Gefängnis' ? 'Gefängnis. Die Karriere scheint vorbei.' : 'Dopingsperre. Plötzlich will niemand mehr etwas von ihm wissen.'];
  else if (drop && drop.d <= -4) fall = ['Der Absturz', drop.h.year, `Die Form ist weg, nur ${drop.h.games} Spiele bei ${drop.h.club}. Die Zeitungen schreiben ihn ab.`];
  if (fall) {
    chapters.push(fall);
    const back = pro.find(h => h.year > fall[1] && !h.banned && h.games >= 25);
    if (back) chapters.push(['Das Comeback', back.year, `Bei ${back.club} kämpft sich ${n} zurück: ${back.games} Spiele, ${back.goals} Tore.`]);
  }
  if (S.comeback && S.comeback.club) chapters.push(['Die letzte Saison', S.comeback.year + (S.comebackYears || 1), `Niemand hat damit gerechnet: das Comeback bei ${S.comeback.club}.`]);
  chapters.push(['Das Ende', S.year, `${S.retireReason || 'Die Schuhe hängen am Nagel.'}${S.farewell && S.farewell.done ? ' Beim Abschiedsspiel weint das ganze Stadion.' : ''}`]);
  chapters.sort((a, b) => a[1] - b[1]);
  const cs = clubStats().sort((a, b) => b.seasons - a.seasons);
  const cl = S.titles.filter(isCLTitle).length;
  const title = banned && banned.club === 'Gefängnis' ? `${n} – Hinter Gittern und zurück`
    : fall && chapters.some(c => c[0] === 'Das Comeback') ? `${n} – Gefallen und wieder aufgestanden`
    : S.awards.some(a => a.startsWith("Ballon d'Or")) ? `${n} – Der Beste der Welt`
    : cl >= 2 ? `${n} – König von Europa`
    : cs[0] && cs[0].seasons >= pro.length * 0.7 ? `${n} – Ein Leben für ${cs[0].club}`
    : S.clubsPlayed.length >= 6 ? `${n} – Der ewige Wandervogel`
    : S.titles.length >= 5 ? `${n} – Der Titelsammler`
    : `${n} – Vom Bolzplatz ins Stadion`;
  return { title, chapters: chapters.map(([head, year, text]) => ({ head, year, text })) };
}

function renderDoc() {
  const d = careerDoc();
  if (!d) return '';
  return `
  <section class="card doc">
    <div class="doc-poster"><small>EINE FUSSBALL-DOKU</small><h2>${esc(d.title)}</h2><small>Jetzt im Stream</small></div>
    <ol class="doc-ch">${d.chapters.map((c, i) => `<li><b>Kapitel ${i + 1}: ${esc(c.head)}</b> <span class="muted">${seasonLabel(c.year)}</span><p>${esc(c.text)}</p></li>`).join('')}</ol>
  </section>`;
}
