'use strict';

// Live-Finale, Saisonfinale-Drama, Torjubel, Kindheitsfreund, Tagesherausforderung,
// Schlagzeilen, Saison-Rückblick, Schnellmodus und Rekorde

const lastName = () => S.player.name.trim().split(/\s+/).slice(-1)[0].toUpperCase();

// ---------- Live-Finale ----------
function opponentStrength(name) {
  if (S.clubs[name]) return clubStr(name);
  const nat = NATIONS.find(n => n.name === name);
  if (nat) return nat.str;
  for (const list of Object.values(EXTRA_OPPONENTS)) for (const [n, s] of list) if (n === name) return s;
  return 75;
}

// Ein erreichtes Finale wird live gespielt statt ausgewürfelt
function queueLiveFinal(r, kind, title, comp, ownStr) {
  if (!r || r.reached !== 'Finale') return false;
  const opp = r.won ? r.beat : r.lostTo;
  r.won = false; r.pending = true; r.lostTo = opp;
  S.finals = S.finals || [];
  S.finals.push({ kind, title, comp, opp, ownStr, oppStr: opponentStrength(opp), us: 0, them: 0, scene: 0, log: [], current: null, done: false });
  return true;
}

const FINAL_MINUTES = [23, 58, 84];
function poisson(l) { let k = 0, p = Math.exp(-l), s = p; const u = Math.random(); while (u > s && k < 8) { k++; p *= l / k; s += p; } return k; }

// Tore der Mitspieler zwischen den Szenen
function simChunk(f, minuteFrom, minuteTo) {
  const share = (minuteTo - minuteFrom) / 90;
  const diffS = (f.ownStr - f.oppStr) / 12;
  const gUs = poisson(1.25 * Math.exp(diffS) * share), gThem = poisson(1.25 * Math.exp(-diffS) * share);
  for (let i = 0; i < gUs; i++) { f.us++; f.log.push(`${randInt(minuteFrom + 1, minuteTo - 1)}'. Tor für euch durch einen Mitspieler – ${f.us}:${f.them}!`); }
  for (let i = 0; i < gThem; i++) { f.them++; f.log.push(`${randInt(minuteFrom + 1, minuteTo - 1)}'. Gegentor durch ${f.opp} – ${f.us}:${f.them}.`); }
}

function nextFinalScene() {
  const f = S.finals[0];
  const from = f.scene === 0 ? 0 : FINAL_MINUTES[f.scene - 1];
  simChunk(f, from, FINAL_MINUTES[f.scene]);
  const sc = pick(SCENES[POSITIONS[S.player.pos].group])(quality());
  f.current = { situation: sc.situation, options: sc.options.map(o => ({ ...o, p: o.p !== undefined ? clamp(o.p - 0.05, 0.05, 0.9) : undefined })), result: null };
}

// Tore und Vorlagen im Finale zählen nachträglich zur Saison bzw. zur Nationalmannschaft
function finalStat(f, key) {
  if (f.kind === 'nation') { if (key === 'goals') S.player.intGoals++; return; }
  const res = S.seasonEnd, h = S.history[S.history.length - 1];
  res[key]++;
  if (h) h[key]++;
}

function playFinalOption(i) {
  const f = S.finals[0], c = f.current, o = c.options[i];
  const q = quality();
  let text;
  const minute = FINAL_MINUTES[f.scene];
  if (o.kind === 'shoot') {
    const ok = chance(0.75 + q * 0.1);
    if (ok) { f.us++; text = `TOOOR! Du verwandelst den Elfmeter ${o.label.toLowerCase()}!${celebrationText()}`; finalStat(f, 'goals'); queueFx('goal'); }
    else text = 'Der Torwart hält deinen Elfmeter!';
  } else if (o.kind === 'save') {
    const ok = chance(0.3 + q * 0.15);
    if (ok) text = 'GEHALTEN! Du ahnst die Ecke!';
    else { f.them++; text = 'Der Elfmeter ist drin.'; }
  } else {
    const ok = chance(o.p);
    if (o.kind === 'goal') {
      if (ok) { f.us++; finalStat(f, 'goals'); text = `${goalCry()} ${pickText(o.okText) || 'Du triffst!'}${celebrationText()}`; queueFx('goal'); }
      else text = pickText(o.failText) || 'Knapp vorbei!';
    } else if (o.kind === 'assist') {
      if (ok) { f.us++; finalStat(f, 'assists'); text = pickText(o.okText) || 'Perfekter Pass – Tor!'; queueFx('goal'); }
      else text = pickText(o.failText) || 'Der Pass kommt nicht an.';
    } else if (o.kind === 'foul') {
      text = ok ? 'Gelbe Karte, aber der Konter ist gestoppt.' : 'Rote Karte! Ihr müsst in Unterzahl weiterspielen.';
      if (!ok) f.ownStr -= 4;
    } else {
      if (ok) text = pickText(o.okText) || 'Gefahr gebannt!';
      else { f.them++; text = pickText(o.failText) || 'Gegentor.'; }
    }
  }
  f.log.push(`${minute}'. ${o.label}: ${text.replace(/<[^>]+>/g, '')} (${f.us}:${f.them})`);
  c.result = text;
}

function continueFinal() {
  const f = S.finals[0];
  f.scene++;
  f.current = null;
  if (f.scene < FINAL_MINUTES.length) { nextFinalScene(); return; }
  simChunk(f, FINAL_MINUTES[FINAL_MINUTES.length - 1], 90);
  f.done = true;
  const res = S.seasonEnd;
  if (f.us > f.them) {
    grantFinalTitle(f, `Finale gegen ${f.opp} mit ${f.us}:${f.them} gewonnen`);
    f.verdict = `🏆 ${f.title}! Ihr gewinnt das Finale ${f.us}:${f.them}!`;
    setHeadline(f.kind === 'nation' ? `${lastName()} MACHT ${S.player.nation.toUpperCase()} ZUM ${f.title.split(' ')[0].toUpperCase()}!` : `FINAL-HELD ${lastName()}! ${f.title.toUpperCase()}!`);
  } else if (f.us < f.them) {
    f.verdict = `Ihr verliert das Finale ${f.us}:${f.them}. Bittere Tränen.`;
    res.lines.push(`Finale gegen ${f.opp} mit ${f.us}:${f.them} verloren.`);
    queueFx('sad');
  } else {
    f.verdict = `${f.us}:${f.them} nach 120 Minuten – es geht ins Elfmeterschießen!`;
    S.shootouts = S.shootouts || [];
    S.shootouts.push({ kind: f.kind, title: f.title, opp: f.opp, round: 0 });
  }
}

function finishFinal() {
  S.finals.shift();
  if (S.finals.length) { nextFinalScene(); return; }
  S.phase = S.shootouts && S.shootouts.length ? 'shootout' : 'seasonEnd';
}

function renderFinal() {
  const f = S.finals[0];
  if (!f.current && !f.done) nextFinalScene();
  const isCL = f.comp === 'Champions League';
  const home = f.kind === 'nation' ? S.player.nation : S.clubId;
  const crestOf = n => (S.clubs[n] ? crest(n) : '⚽');
  const intro = f.scene === 0 && !f.current.result
    ? `<p class="anthem">${isCL ? '🎶 Die Champions-League-Hymne erklingt. Flutlicht, 70.000 Fans, die ganze Welt schaut zu.' : `🏟️ Finale! Das Stadion ist ausverkauft, die Spannung ist kaum auszuhalten.`}</p>` : '';
  return `
  <section class="card final">
    <div class="scoreboard">
      <div class="comp">${esc(f.comp)} · Finale · LIVE</div>
      <div class="teams">
        <div class="team">${crestOf(home)}<span>${esc(home)}</span></div>
        <div class="score">${f.us}:${f.them}<small>${f.done ? 'Abpfiff' : `${FINAL_MINUTES[f.scene]}. Minute`}</small></div>
        <div class="team">${crestOf(f.opp)}<span>${esc(f.opp)}</span></div>
      </div>
    </div>
    ${intro}
    ${f.log.length ? `<ul class="ticker">${f.log.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    ${f.done
      ? `<div class="result"><p><b>${esc(f.verdict)}</b></p></div><div class="actions">${btn('Weiter', () => { finishFinal(); render(); }, 'primary')}</div>`
      : f.current.result
        ? `<div class="result"><p>${f.current.result}</p></div><div class="actions">${btn(f.scene < FINAL_MINUTES.length - 1 ? 'Weiterspielen' : 'Zum Abpfiff', () => { continueFinal(); render(); }, 'primary')}</div>`
        : `<p class="situation">Szene ${f.scene + 1} von ${FINAL_MINUTES.length}: ${esc(f.current.situation)}</p>
           <div class="choices">${f.current.options.map((o, i) => btn(`${esc(o.label)}${o.p !== undefined ? `<small>${Math.round(o.p * 100)} % Erfolg</small>` : ''}`, () => { playFinalOption(i); render(true); })).join('')}</div>`}
  </section>`;
}

// ---------- Drama am letzten Spieltag ----------
function finalDayDrama() {
  if (S.youth) return null;
  const L = clubLeague(S.clubId);
  const n = clubsIn(L.id).length;
  const rank = clubsIn(L.id).sort((a, b) => clubStr(b) - clubStr(a)).indexOf(S.clubId) + 1;
  const r = rank + randInt(-2, 2);
  if (L.id === PROMOTION.upper && r >= n - PROMOTION.count) return { type: 'relegation', text: '🔥 Abstiegskampf am letzten Spieltag! Nur ein Sieg rettet euch vor dem Abstieg. ' };
  if (L.id === PROMOTION.lower && r <= PROMOTION.count + 1) return { type: 'promotion', text: '🔥 Aufstiegsdrama am letzten Spieltag! Mit einem Sieg seid ihr in der Bundesliga. ' };
  if (r <= 2) return { type: 'title', text: '🔥 Meisterschaftsfinale am letzten Spieltag! Gewinnt ihr, seid ihr Meister. ' };
  return null;
}

// Ergebnis des letzten Spieltags in der Tabelle umsetzen
function applyDrama(rows) {
  const d = S.season.drama;
  if (!d || d.won === undefined) return;
  const n = rows.length;
  const idx = rows.findIndex(r => r.name === S.clubId);
  let target = idx;
  if (d.type === 'relegation') target = d.won ? Math.min(idx, n - PROMOTION.count - 1) : Math.max(idx, n - PROMOTION.count);
  if (d.type === 'promotion') target = d.won ? Math.min(idx, PROMOTION.count - 1) : Math.max(idx, PROMOTION.count);
  if (d.type === 'title') target = d.won ? 0 : Math.max(idx, 1);
  if (target === idx) return;
  const [row] = rows.splice(idx, 1);
  rows.splice(target, 0, row);
  rows.forEach((r, i) => { if (i < n - 1 && rows[i + 1].pts > r.pts) rows[i + 1].pts = r.pts; });
  if (target < idx) row.pts = Math.max(row.pts, (rows[target + 1] || row).pts + 1);
}

// ---------- Torjubel ----------
const CELEBRATIONS = {
  slide: 'Kniesliding zur Eckfahne',
  salto: 'Salto mit Schraube',
  heart: 'Herz mit den Händen',
  sleep: 'Schlaf-Pose am Boden',
  phone: 'Telefon-Jubel',
  archer: 'Bogenschütze',
  silence: 'Finger auf den Lippen',
  dance: 'Tanz an der Eckfahne',
};
function celebrationText() {
  if (!S.celebration) return '';
  S.celebFame = (S.celebFame || 0) + 1;
  return ` Du jubelst mit deinem ${CELEBRATIONS[S.celebration]}!`;
}
function celebrationSeason(res) {
  if (!S.celebration) return;
  const f = (S.celebFame || 0) + Math.round(res.goals / 3);
  S.celebFame = f;
  if (f >= 15 && !S.celebKult) {
    S.celebKult = true;
    S.player.popularity = clamp(S.player.popularity + 6, 0, 100);
    res.lines.push(`⭐ Dein Jubel „${CELEBRATIONS[S.celebration]}“ wird Kult! Kinder auf allen Bolzplätzen machen ihn nach.`);
  }
}
function renderCelebration() {
  return `
    <h3>🎉 Torjubel${S.celebration ? ` · ${esc(CELEBRATIONS[S.celebration])}${S.celebKult ? ' (Kult!)' : ''}` : ''}</h3>
    <div class="lifeacts">${Object.entries(CELEBRATIONS).map(([k, v]) => btn(esc(v), () => {
      if (S.celebration !== k) { S.celebration = k; S.celebFame = 0; S.celebKult = false; }
      S.lifeMsg = `Dein neuer Torjubel: ${v}. Je öfter du triffst, desto bekannter wird er.`;
      render(true);
    }, S.celebration === k ? 'small chosen-focus' : 'small')).join('')}</div>`;
}

// ---------- Bester Freund aus der Kindheit ----------
const BUDDY_NAMES = ['Kevin', 'Dennis', 'Marvin', 'Jana', 'Selin', 'Tom', 'Murat', 'Lea'];
function buddy() {
  if (!S.buddy) S.buddy = { name: pick(BUDDY_NAMES), rel: 75, type: chance(0.5) ? 'loyal' : 'trouble', job: false };
  return S.buddy;
}
function renderBuddy() {
  const b = buddy();
  return `
    <div class="person">
      <div><strong>${esc(b.name)}</strong><small>Bester Freund aus der Kindheit · ${b.type === 'loyal' ? 'hält dich auf dem Boden' : 'zieht dich gern in Abenteuer'}${b.job ? ' · arbeitet für dich' : ''}</small>${bar('Freundschaft', b.rel, 100)}</div>
      <div class="lifeacts">
        ${pBtn('buddyMeet', 'Treffen wie früher', 'Bolzplatz und Pizza', () => `Ihr redet über alte Zeiten. ${b.name} kennt dich besser als jeder andere.` + mod({ form: 2 }) + relChip(b, 12))}
        ${b.job ? '' : pBtn('buddyJob', 'Job anbieten', `als Fahrer oder Assistent · ${money(0.04)}/Jahr`, () => { b.job = true; return `${b.name} arbeitet jetzt für dich und ist immer an deiner Seite.` + mod({ money: -0.04, form: 1 }) + relChip(b, 20); })}
      </div>
    </div>`;
}

// ---------- Tagesherausforderung ----------
const DAILY_KEY = 'fussballkarriere-tageschallenge';
function dateKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function seeded(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
const DAILY_GOALS = [
  { id: 'title23', text: 'Gewinne bis zum Alter von 23 einen Titel', test: () => S.titles.length > 0 && S.player.age <= 24 },
  { id: 'goals150', text: 'Schieße in deiner Karriere 150 Tore', test: () => totals().goals >= 150 },
  { id: 'caps30', text: 'Bestreite 30 Länderspiele', test: () => S.player.caps >= 30 },
  { id: 'rating88', text: 'Erreiche Stärke 88', test: () => S.peak >= 88 },
  { id: 'cl', text: 'Gewinne die Champions League', test: () => S.titles.some(t => t.startsWith('Champions-League-Sieger')) },
  { id: 'money50', text: 'Besitze 50 Mio. €', test: () => S.money >= 50 },
  { id: 'clubs4', text: 'Spiele für 4 verschiedene Vereine und gewinne einen Titel', test: () => S.clubsPlayed.length >= 4 && S.titles.length > 0 },
];
function dailyChallenge() {
  const key = dateKey();
  const rnd = seeded(key);
  const pickR = arr => arr[Math.floor(rnd() * arr.length)];
  const nat = pickR(NATIONS.filter(n => n.str >= 72));
  const pos = pickR(Object.keys(POSITIONS));
  const allClubs = LEAGUES.flatMap(L => L.clubs.filter(([, s]) => s >= 60 && s <= 72).map(([n]) => n));
  return { date: key, nation: nat.name, pos, club: pickR(allClubs), goal: pickR(DAILY_GOALS) };
}
function dailyDone() { try { return (JSON.parse(localStorage.getItem(DAILY_KEY) || '{}'))[dateKey()]; } catch (e) { return false; } }
function startDaily() {
  const d = dailyChallenge();
  S = { phase: 'create', daily: d };
}
function applyDaily(daily) {
  S.daily = { date: daily.date, goalId: daily.goal.id, text: daily.goal.text, done: false };
  S.academyOffers = [daily.club];
}
function checkDaily() {
  if (!S || !S.daily || S.daily.done) return;
  const g = DAILY_GOALS.find(x => x.id === S.daily.goalId);
  if (!g || !g.test()) return;
  S.daily.done = true;
  try {
    const all = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    all[S.daily.date] = true;
    localStorage.setItem(DAILY_KEY, JSON.stringify(all));
  } catch (e) { /* ignorieren */ }
  toast(`🎯 Tagesherausforderung geschafft: ${S.daily.text}!`);
  queueFx('fanfare', 'confetti');
}
function renderDailyCard() {
  const d = dailyChallenge();
  return `
  <section class="card daily">
    <h2>🎯 Herausforderung des Tages</h2>
    <p><b>${esc(d.goal.text)}</b></p>
    <p class="muted">Start: ${esc(POSITIONS[d.pos].name)} aus ${esc(d.nation)} in der Jugend von ${esc(d.club)}. Jeden Tag gibt es eine neue Herausforderung.</p>
    ${dailyDone() ? '<p class="up">✅ Heute schon geschafft!</p>' : ''}
    <div class="actions">${btn('Herausforderung starten', () => { pendingSlot = SLOT_COUNT; startDaily(); render(); }, 'primary')}</div>
    <p class="muted small">Die Herausforderung nutzt Spielstand ${SLOT_COUNT}.</p>
  </section>`;
}

// ---------- Schlagzeilen ----------
function setHeadline(text) { S.headline = text; }
function seasonHeadline(res) {
  const ln = lastName();
  const L = clubLeague(res.club);
  if (res.lines.some(l => l.startsWith('🚨 Positiver Dopingtest'))) return `DOPING-SKANDAL! ${ln} ERWISCHT`;
  if (res.awards.includes("Ballon d'Or")) return `${ln} IST DER BESTE FUSSBALLER DER WELT!`;
  if (res.titles.includes(L.champion)) return `${ln} & CO. SIND ${L.champion.toUpperCase()}!`;
  if (res.titles.length) return `TITEL-JUBEL! ${ln} HOLT ${res.titles[0].toUpperCase()}`;
  if (res.lines.some(l => l.startsWith('⬇️'))) return `ABSTIEG! ${res.club.toUpperCase()} IN TRÄNEN`;
  if (res.lines.some(l => l.startsWith('⬆️'))) return `AUFSTIEG! ${res.club.toUpperCase()} FEIERT DIE GANZE NACHT`;
  if (res.goals >= 25) return `${ln} TRIFFT UND TRIFFT – ${res.goals} SAISONTORE!`;
  if (res.note !== null && res.note >= 3.9) return `KRISE! WAS IST NUR MIT ${ln} LOS?`;
  if (res.ratingAfter - res.ratingBefore >= 5) return `SHOOTINGSTAR ${ln}! DIE GANZE LIGA STAUNT`;
  return null;
}
function renderHeadline() {
  if (!S.headline) return '';
  return `<aside class="newspaper"><div class="paper">SPORT-EXPRESS · ${seasonLabel(S.year)}</div><div class="headline">${esc(S.headline)}</div></aside>`;
}

// ---------- Saison-Rückblick (Animation) ----------
function animateRecap() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const dec = el.dataset.dec ? parseInt(el.dataset.dec, 10) : 0;
    const start = performance.now();
    const fmt = v => (dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v)));
    (function step(t) {
      const k = Math.min(1, (t - start) / 1100);
      el.textContent = fmt(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(target);
    })(start);
  });
  document.querySelectorAll('.recap li, .recap .stats > div').forEach((el, i) => { el.style.animationDelay = `${0.08 * i}s`; el.classList.add('pop'); });
}

// ---------- Schnellmodus ----------
function autoSeason() {
  if (focusOf() === 'recovery') S.player.form = clamp(S.player.form + 2, -10, 10);
  nextStep();
  let guard = 0;
  while (S.phase === 'season' && guard++ < 50) {
    const c = S.current;
    if (c.type === 'event') {
      const ev = EVENTS.find(e => e.id === c.id);
      const i = randInt(0, ev.options.length - 1);
      c.result = ev.options[i].run(); c.chosen = i;
      S.season.autoLog = S.season.autoLog || [];
      S.season.autoLog.push(`${ev.title}: ${ev.options[i].label}`);
    } else if (c.type === 'rehab') {
      while (!c.result) rehabStep(REHAB_CHOICES[1]);
    } else if (!c.result) {
      let best = 0;
      c.options.forEach((o, i) => { if ((o.p || 0.33) > (c.options[best].p || 0.33)) best = i; });
      resolveMatch(best);
    }
    S.season.step++; S.current = null; nextStep();
  }
}

// ---------- Rekorde über alle Karrieren ----------
const REC_KEY = 'fussballkarriere-rekorde';
const RECORDS = [
  ['goalsSeason', 'Meiste Tore in einer Saison', v => `${v} Tore`],
  ['goalsCareer', 'Meiste Karrieretore', v => `${v} Tore`],
  ['titles', 'Meiste Titel', v => `${v} Titel`],
  ['peak', 'Höchste Stärke', v => `${v}`],
  ['caps', 'Meiste Länderspiele', v => `${v} Spiele`],
  ['money', 'Größtes Vermögen', v => money(v)],
  ['ballon', "Meiste Ballon d'Ors", v => `${v}×`],
  ['youngBallon', "Jüngster Ballon-d'Or-Sieger", v => `${v} Jahre`, true],
  ['followers', 'Meiste Follower', v => fmtFollowers(v)],
  ['seasons', 'Längste Karriere', v => `${v} Profisaisons`],
];
function loadRecords() { try { return JSON.parse(localStorage.getItem(REC_KEY) || '{}'); } catch (e) { return {}; } }
function updateRecords(res) {
  const rec = loadRecords();
  const t = totals();
  const who = `${S.player.name} (${seasonLabel(S.year)})`;
  const vals = {
    goalsSeason: res ? res.goals : 0, goalsCareer: t.goals, titles: S.titles.length, peak: S.peak, caps: S.player.caps,
    money: S.money, ballon: S.awards.filter(a => a.startsWith("Ballon d'Or")).length,
    followers: S.social ? S.social.followers : 0, seasons: t.seasons,
  };
  if (res && res.awards.includes("Ballon d'Or")) vals.youngBallon = res.age;
  let broken = null;
  for (const [k, label, , lower] of RECORDS) {
    const v = vals[k];
    if (v === undefined || !v) continue;
    const old = rec[k];
    if (!old || (lower ? v < old.v : v > old.v)) {
      if (old && old.who.split(' (')[0] !== S.player.name) broken = label;
      rec[k] = { v, who };
    }
  }
  try { localStorage.setItem(REC_KEY, JSON.stringify(rec)); } catch (e) { /* ignorieren */ }
  if (broken) toast(`📈 Neuer Rekord: ${broken}!`);
}
function renderRecords() {
  const rec = loadRecords();
  const rows = RECORDS.filter(([k]) => rec[k]);
  if (!rows.length) return '';
  return `
  <section class="card">
    <details><summary>Rekorde aller Karrieren</summary>
      <ul class="facts">${rows.map(([k, label, f]) => `<li><span>${esc(label)}</span><b>${esc(f(rec[k].v))}<small class="sub">${esc(rec[k].who)}</small></b></li>`).join('')}</ul>
    </details>
  </section>`;
}

// ---------- Saison-Rückblick im Video-Stil ----------
const RECAP_MS = 3400;
let recap = null;

function recapSlides() {
  const r = S.seasonEnd;
  const gk = S.player.pos === 'TW';
  const diff = r.ratingAfter - r.ratingBefore;
  const slides = [];
  slides.push({
    cls: 'intro',
    html: `<div class="rc-kicker">Saison-Rückblick</div><div class="rc-big">${seasonLabel(r.year)}</div>
      <div class="rc-club">${crest(r.club)}<span>${esc(r.club)}</span></div><div class="rc-sub">${esc(r.league)} · ${esc(r.role)}</div>`,
  });
  slides.push({
    cls: 'stats',
    html: `<div class="rc-kicker">Deine Zahlen</div>
      <div class="rc-stats">
        <div><b data-rc="${r.games}">0</b><span>Spiele</span></div>
        <div><b data-rc="${r.goals}">0</b><span>Tore</span></div>
        <div><b data-rc="${gk ? r.cleanSheets : r.assists}">0</b><span>${gk ? 'Zu null' : 'Vorlagen'}</span></div>
      </div>
      ${r.note !== null ? `<div class="rc-sub">Durchschnittsnote ${fmt2(r.note)}</div>` : ''}`,
  });
  const moments = [...(r.scenes || []), ...(r.milestones || []).map(m => `🎖️ ${m}`)].slice(0, 4);
  if (moments.length) {
    slides.push({
      cls: 'moments',
      html: `<div class="rc-kicker">Deine Momente</div><ul class="rc-list">${moments.map(m => `<li>${esc(m)}</li>`).join('')}</ul>`,
    });
  }
  if (r.role !== 'U19') {
    const drama = S.season && S.season.drama && S.season.drama.won !== undefined
      ? `<div class="rc-sub">${S.season.drama.won ? '🔥 Am letzten Spieltag hast du alles entschieden!' : '💔 Der letzte Spieltag ging leider schief.'}</div>` : '';
    slides.push({
      cls: 'table',
      html: `<div class="rc-kicker">${esc(r.league)}</div><div class="rc-big">Platz ${r.pos}</div><div class="rc-sub">von ${r.teams} Mannschaften</div>${drama}`,
    });
  }
  const trophies = [...r.titles.map(t => `🏆 ${t}`), ...r.awards.map(a => `⭐ ${a}`)];
  slides.push(trophies.length
    ? { cls: 'trophy', fx: ['fanfare', 'confetti'], html: `<div class="rc-kicker">Titel & Auszeichnungen</div><ul class="rc-list big">${trophies.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` }
    : { cls: 'trophy', html: `<div class="rc-kicker">Titel</div><div class="rc-big small">Diesmal kein Pokal</div><div class="rc-sub">Nächste Saison greifst du wieder an!</div>` });
  if (S.headline) {
    slides.push({ cls: 'news', html: `<div class="newspaper rc-paper"><div class="paper">SPORT-EXPRESS · ${seasonLabel(r.year)}</div><div class="headline">${esc(S.headline)}</div></div>` });
  }
  slides.push({
    cls: 'outro',
    html: `<div class="rc-kicker">Deine Stärke</div>
      <div class="rc-rating"><span>${r.ratingBefore}</span><i>→</i><b>${r.ratingAfter}</b></div>
      <div class="rc-sub ${diff >= 0 ? 'up' : 'down'}">${diff > 0 ? `+${diff} – du wirst immer besser!` : diff < 0 ? `${diff} – du musst wieder angreifen.` : 'Gleich geblieben.'}</div>`,
  });
  return slides;
}

function openRecap() {
  closeRecap();
  const slides = recapSlides();
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'recap-overlay';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Saison-Rückblick');
  el.innerHTML = `
    <div class="rc-bars">${slides.map(() => '<span><i></i></span>').join('')}</div>
    <button class="rc-close" type="button" aria-label="Rückblick schließen">✕</button>
    <div class="rc-stage"></div>
    <div class="rc-nav"><button class="rc-prev" type="button" aria-label="Zurück">‹</button><button class="rc-pause" type="button">${reduced ? '▶' : '❚❚'}</button><button class="rc-next" type="button" aria-label="Weiter">›</button></div>`;
  document.body.appendChild(el);
  recap = { el, slides, i: -1, timer: null, paused: reduced };
  el.querySelector('.rc-close').addEventListener('click', closeRecap);
  el.querySelector('.rc-next').addEventListener('click', () => showSlide(recap.i + 1));
  el.querySelector('.rc-prev').addEventListener('click', () => showSlide(Math.max(0, recap.i - 1)));
  el.querySelector('.rc-pause').addEventListener('click', togglePause);
  el.querySelector('.rc-stage').addEventListener('click', e => {
    const rect = e.currentTarget.getBoundingClientRect();
    showSlide(e.clientX < rect.left + rect.width / 3 ? Math.max(0, recap.i - 1) : recap.i + 1);
  });
  document.addEventListener('keydown', recapKeys);
  showSlide(0);
}

function recapKeys(e) {
  if (!recap) return;
  if (e.key === 'Escape') closeRecap();
  else if (e.key === 'ArrowRight') showSlide(recap.i + 1);
  else if (e.key === 'ArrowLeft') showSlide(Math.max(0, recap.i - 1));
}

function showSlide(i) {
  if (!recap) return;
  if (i >= recap.slides.length) { closeRecap(); return; }
  clearTimeout(recap.timer);
  recap.i = i;
  const s = recap.slides[i];
  const stage = recap.el.querySelector('.rc-stage');
  stage.innerHTML = `<div class="rc-slide rcs-${s.cls}">${s.html}</div>`;
  recap.el.querySelectorAll('.rc-bars span').forEach((b, k) => {
    b.className = k < i ? 'done' : k === i ? (recap.paused ? 'now paused' : 'now') : '';
    b.style.setProperty('--dur', `${RECAP_MS}ms`);
  });
  stage.querySelectorAll('[data-rc]').forEach(n => {
    const target = parseInt(n.dataset.rc, 10);
    if (recap.paused) { n.textContent = target; return; }
    const start = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - start) / 1200);
      n.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && recap) requestAnimationFrame(step);
    })(start);
  });
  if (s.fx) { queueFx(...s.fx); flushFx(); } else playSound(i === 0 ? 'whistle' : 'chime');
  if (!recap.paused) recap.timer = setTimeout(() => showSlide(i + 1), RECAP_MS);
}

function togglePause() {
  if (!recap) return;
  recap.paused = !recap.paused;
  recap.el.querySelector('.rc-pause').textContent = recap.paused ? '▶' : '❚❚';
  showSlide(recap.i);
}

function closeRecap() {
  if (!recap) return;
  clearTimeout(recap.timer);
  recap.el.remove();
  document.removeEventListener('keydown', recapKeys);
  recap = null;
}
