'use strict';

// Erinnerungen: Trophäenschrank, Trikottausch, Abschiedsspiel, Erbe der Eltern,
// Spielerkarte, Fotoalbum und „Was wäre wenn …“

// ---------- Trophäenschrank ----------
function trophyLook(name) {
  if (/^Ballon d'Or/.test(name)) return ['🏅', 'gold'];
  if (/Golden Boy/.test(name)) return ['⭐', 'gold'];
  if (/Schuh|Torschützenkönig|Torjäger|Pichichi|Capocannoniere|Boot/i.test(name)) return ['👟', 'silver'];
  if (/Jaschin/.test(name)) return ['🧤', 'gold'];
  if (/Spieler der Saison/.test(name)) return ['🎖️', 'silver'];
  if (/Weltmeister|Europameister|Copa-América|Afrikameister|Asienmeister|Gold-Cup|CONCACAF-Meister/.test(name)) return ['🌍', 'gold'];
  if (/Champions|Europa|Conference|Libertadores|CONCACAF|Klub-WM/.test(name)) return ['🏆', 'gold'];
  if (/Meister$/.test(name)) return ['🏆', 'silver'];
  return ['🏆', 'bronze'];
}

function renderTrophyCabinet(titles = S.titles, awards = S.awards) {
  const items = [...groupTitles(titles), ...groupTitles(awards)];
  if (!items.length) return '';
  const order = { gold: 0, silver: 1, bronze: 2 };
  items.sort((a, b) => order[trophyLook(a.name)[1]] - order[trophyLook(b.name)[1]] || b.n - a.n);
  return `
  <section class="card">
    <h2>Trophäenschrank</h2>
    <div class="cabinet">${items.map(g => {
      const [icon, tier] = trophyLook(g.name);
      return `<div class="trophy ${tier}" title="${esc(g.years.join(', '))}">
        <div class="cup">${icon}${g.n > 1 ? `<span class="cnt">${g.n}×</span>` : ''}</div>
        <span>${esc(g.name)}</span></div>`;
    }).join('')}</div>
  </section>`;
}

// ---------- Trikottausch ----------
// Jeder Verein bzw. jedes Land hat einen Star, der nach einigen Jahren abgelöst wird
function starOf(team) {
  S.stars = S.stars || {};
  const s = S.stars[team];
  if (!s || S.year - s.since > randInt(6, 9)) S.stars[team] = { name: randomName(), since: S.year };
  return S.stars[team].name;
}

function swapShirt(name, team, why) {
  S.shirts = S.shirts || [];
  if (S.shirts.some(x => x.name === name && x.year === S.year)) return '';
  S.shirts.push({ name, team, why, year: S.year });
  if (S.shirts.length === 1) addPhoto('👕', `Erster Trikottausch – mit ${name} (${team})`);
  return ` 👕 Nach dem Abpfiff tauschst du das Trikot mit ${name}.`;
}

function shirtSwap(c, us, them) {
  if (S.youth) return '';
  if (c.rivalMatch && chance(0.5)) return swapShirt(S.rival.name, c.opp, 'Duell mit deinem Rivalen');
  const big = c.comp === 'Champions League' || opponentStrength(c.opp) >= 84;
  if (!big || !chance(us >= them ? 0.3 : 0.15)) return '';
  return swapShirt(starOf(c.opp), c.opp, c.comp);
}

function shirtSwapFinal(f) {
  if (!chance(0.6)) return '';
  return swapShirt(starOf(f.opp), f.opp, `Finale ${f.comp}`);
}

function renderShirts() {
  const list = S.shirts || [];
  if (!list.length) return '';
  return `
  <section class="card">
    <details><summary>👕 Trikot-Sammlung · ${list.length} ${list.length === 1 ? 'Trikot' : 'Trikots'}</summary>
      <div class="shirts">${list.slice().reverse().map(x => `<div class="shirt">${S.clubs[x.team] ? crest(x.team) : '<span class="crest nat">🌍</span>'}
        <div><b>${esc(x.name)}</b><small>${esc(x.team)} · ${esc(x.why)} · ${seasonLabel(x.year)}</small></div></div>`).join('')}</div>
    </details>
  </section>`;
}

// ---------- Fotoalbum ----------
function addPhoto(icon, text) {
  S.photos = S.photos || [];
  S.photos.push({ icon, text, year: S.year });
}

const yearOfLabel = l => { const m = String(l).match(/(\d{4})(\/\d\d)?/); return m ? +m[1] - (m[2] ? 0 : 0.5) : null; };
const BIG_TITLE = /Champions|Weltmeister|Europameister|Copa-América/;

function albumPhotos() {
  const out = [];
  const add = (year, icon, text, order = 0) => { if (year !== null && year !== undefined) out.push({ year, icon, text, order }); };
  let prev = null;
  for (const h of S.history) {
    if (h.youth || h.banned) continue;
    if (!prev) add(h.year, '✍️', `Erster Profivertrag bei ${h.club}`, -2);
    else if (h.club !== prev) add(h.year, h.loan ? '🔁' : '🤝', `${h.loan ? 'Leihe' : 'Wechsel'} zu ${h.club}`, -1);
    prev = h.club;
  }
  const msIcon = id => /^goal|^season|^young/.test(id) ? '⚽' : /^games|^club100/.test(id) ? '👟' : /^caps/.test(id) ? '🎽' : /^title/.test(id) ? '🏆' : /^legend/.test(id) ? '🏛️' : '🎖️';
  for (const m of S.milestones || []) add(m.year, msIcon(m.id), m.text, 1);
  const seen = new Set();
  for (const t of S.titles) {
    const m = t.match(/^(.*) \(([^()]+)\)$/) || t.match(/^(.*) (\d{4})$/);
    const name = m ? m[1] : t;
    if (seen.has(name) && !BIG_TITLE.test(name)) continue;
    seen.add(name);
    add(m ? yearOfLabel(m[2]) : null, BIG_TITLE.test(name) ? '🏆' : '🥇', name, 2);
  }
  const seenA = new Set();
  for (const a of S.awards) {
    const m = a.match(/^(.*) \(([^()]+)\)$/);
    const name = m ? m[1] : a;
    if (seenA.has(name) && !name.startsWith("Ballon d'Or")) continue;
    seenA.add(name);
    add(m ? yearOfLabel(m[2]) : null, trophyLook(name)[0], name, 3);
  }
  for (const c of (S.life && S.life.children) || []) add(c.born, '👶', `${c.name} wird geboren`, 0);
  for (const p of S.photos || []) add(p.year, p.icon, p.text, 0);
  out.sort((a, b) => a.year - b.year || a.order - b.order);
  return out;
}

function renderAlbum() {
  const list = albumPhotos();
  if (!list.length) return '';
  return `
  <section class="card">
    <details${S.phase === 'retired' ? ' open' : ''}><summary>📷 Fotoalbum · ${list.length} ${list.length === 1 ? 'Foto' : 'Fotos'}</summary>
      <div class="album">${list.map((x, i) => `<div class="photo" style="--tilt:${(i % 3 - 1) * 1.5}deg">
        <div class="pic">${x.icon}</div><p>${esc(x.text)}</p><small>${Number.isInteger(x.year) ? seasonLabel(x.year) : `Sommer ${Math.ceil(x.year)}`}</small></div>`).join('')}</div>
    </details>
  </section>`;
}

// ---------- Abschiedsspiel ----------
const FAREWELL_MINUTES = [17, 54, 88];

function farewellClub() {
  const cs = clubStats().sort((a, b) => b.games - a.games);
  return cs.length ? cs[0].club : S.clubId;
}

function startFarewell() {
  const mates = ensureTeam().mates.map(m => m.name).slice(0, 3);
  const kid = (life().children || []).find(c => S.year - c.born >= 5);
  S.farewell = { club: farewellClub(), us: 0, them: 0, scene: 0, log: [], current: null, done: false, mates, kid: kid ? kid.name : null };
  nextFarewellScene();
}

function nextFarewellScene() {
  const f = S.farewell;
  // Zwischen den Szenen fallen lockere Tore auf beiden Seiten
  const from = f.scene === 0 ? 1 : FAREWELL_MINUTES[f.scene - 1] + 1, to = FAREWELL_MINUTES[f.scene] - 1;
  const goals = [];
  if (chance(0.55)) goals.push([randInt(from, to), true]);
  if (chance(0.45)) goals.push([randInt(from, to), false]);
  goals.sort((x, y) => x[0] - y[0]).forEach(([m, ours]) => {
    if (ours) { f.us++; f.log.push(`${m}'. ${pick(f.mates.length ? f.mates : ['Ein alter Weggefährte'])} trifft – ${f.us}:${f.them}.`); }
    else { f.them++; f.log.push(`${m}'. Die Weltauswahl trifft – ${f.us}:${f.them}.`); }
  });
  const sc = pick(SCENES[POSITIONS[S.player.pos].group])(quality());
  const last = f.scene === FAREWELL_MINUTES.length - 1;
  const intro = f.scene === 0
    ? `${pick(f.mates.length ? f.mates : ['Dein alter Kapitän'])} führt dich aufs Feld, die Fans halten ein riesiges Banner mit deinem Gesicht hoch. `
    : last ? `Der Stadionsprecher kündigt deine Auswechslung an – das ist deine letzte Aktion als Profi. ` : '';
  f.current = { situation: intro + sc.situation, options: sc.options.map(o => ({ ...o, p: o.p !== undefined ? clamp(o.p + 0.15, 0.1, 0.95) : undefined })), result: null };
}

function playFarewell(i) {
  const f = S.farewell, o = f.current.options[i];
  const minute = FAREWELL_MINUTES[f.scene];
  let text;
  if (o.kind === 'shoot') {
    if (chance(0.85)) { f.us++; text = `${goalCry()} Elfmeter verwandelt – das Stadion bebt!`; queueFx('goal'); } else text = 'Verschossen! Aber alle lachen – heute ist das egal.';
  } else if (o.kind === 'save') {
    if (chance(0.5)) text = 'Gehalten! Die Fans singen deinen Namen.'; else { f.them++; text = 'Der Elfmeter ist drin – die Weltauswahl jubelt.'; }
  } else if (o.kind === 'goal' || o.kind === 'assist') {
    if (chance(o.p)) { f.us++; text = o.kind === 'goal' ? `${goalCry()} ${pickText(o.okText) || 'Du triffst!'}` : (pickText(o.okText) || 'Perfekter Pass – Tor!'); queueFx('goal'); }
    else text = pickText(o.failText) || 'Knapp daneben – die Fans applaudieren trotzdem.';
  } else if (chance(o.p)) text = pickText(o.okText) || 'Stark verteidigt!';
  else { f.them++; text = pickText(o.failText) || 'Gegentor – aber heute zählt nur die Party.'; }
  f.log.push(`${minute}'. ${o.label}: ${text.replace(/<[^>]+>/g, '')} (${f.us}:${f.them})`);
  f.current.result = text;
}

function continueFarewell() {
  const f = S.farewell;
  f.scene++;
  if (f.scene < FAREWELL_MINUTES.length) { nextFarewellScene(); return; }
  f.current = null;
  f.done = true;
  const extra = [
    f.kid ? `${f.kid} läuft im Trikot mit deiner Nummer zu dir aufs Feld.` : '',
    S.rival && S.rival.name ? `Dein ewiger Rivale ${S.rival.name} nimmt dich lange in den Arm.` : '',
  ].filter(Boolean).join(' ');
  f.verdict = `Abpfiff – ${f.us}:${f.them}! Bei deiner Auswechslung erheben sich alle Zuschauer. Minutenlanger Applaus, Tränen, Gänsehaut. ${extra}`;
  addPhoto('👋', `Abschiedsspiel bei ${f.club} (${f.us}:${f.them})`);
  S.player.popularity = clamp(S.player.popularity + 5, 0, 100);
  queueFx('fanfare', 'confetti');
}

function renderFarewell() {
  if (totals().seasons < 3) return '';
  const f = S.farewell;
  if (!f) return `
  <section class="card">
    <h2>👋 Dein Abschiedsspiel</h2>
    <p>${esc(farewellClub())} lädt zu deinem Abschiedsspiel ein: du und deine alten Mitspieler gegen eine Weltauswahl, ausverkauftes Stadion. Drei letzte Szenen – genieß sie.</p>
    <div class="actions">${btn('Abschiedsspiel spielen', () => { startFarewell(); render(true); }, 'primary')}</div>
  </section>`;
  const board = `
    <div class="scoreboard">
      <div class="comp">Abschiedsspiel · ${esc(f.club)}</div>
      <div class="teams">
        <div class="team">${crest(f.club)}<span>${esc(S.player.name)} &amp; Freunde</span></div>
        <div class="score">${f.us}:${f.them}<small>${f.done ? 'Abpfiff' : `${FAREWELL_MINUTES[f.scene]}. Minute`}</small></div>
        <div class="team"><span class="crest nat">🌍</span><span>Weltauswahl</span></div>
      </div>
    </div>`;
  const body = f.done
    ? `<div class="result"><p><b>${esc(f.verdict)}</b></p></div>`
    : f.current.result
      ? `<div class="result"><p>${f.current.result}</p></div><div class="actions">${btn(f.scene < FAREWELL_MINUTES.length - 1 ? 'Weiterspielen' : 'Zum Abpfiff', () => { continueFarewell(); render(true); }, 'primary')}</div>`
      : `<p class="situation">Szene ${f.scene + 1} von ${FAREWELL_MINUTES.length}: ${esc(f.current.situation)}</p>
         <div class="choices">${f.current.options.map((o, i) => btn(`${esc(o.label)}${o.p !== undefined ? `<small>${Math.round(o.p * 100)} % Erfolg</small>` : ''}`, () => { playFarewell(i); render(true); })).join('')}</div>`;
  return `
  <section class="card final">
    ${board}
    ${f.log.length ? `<ul class="ticker">${f.log.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    ${body}
  </section>`;
}

// ---------- Erbe der Eltern: Statue und gesperrte Nummer ----------
function parentLegacy() {
  return legends().map(l => ({
    club: l.club, parent: S.player.name, number: S.player.number,
    statue: l.honors.some(h => h.startsWith('Statue')), retired: l.honors.some(h => h.startsWith('Rückennummer')),
  })).filter(x => x.statue || x.retired);
}

// Beim Saisonstart: Kind spielt beim Verein, an dem das Elternteil Legende ist
function legacyArrival() {
  const lg = (S.parentLegacy || []).find(x => x.club === S.clubId && !x.seen);
  if (!lg || S.youth) return;
  lg.seen = true;
  const parts = [];
  if (lg.statue) parts.push(`Jeden Morgen gehst du an der Statue von ${lg.parent} vor dem Stadion vorbei.`);
  if (lg.retired) parts.push(S.player.number === lg.number
    ? `Der Verein holt die gesperrte #${lg.number} für dich aus dem Ruhestand – die Fans weinen vor Rührung.`
    : `Die #${lg.number} von ${lg.parent} hängt unter dem Stadiondach. Niemand darf sie tragen.`);
  sendMail(`Fans von ${S.clubId}`, `${parts.join(' ')} Die ganze Stadt erwartet viel von dir.`);
  addPhoto('🗿', `Bei ${S.clubId}, wo ${lg.parent} Legende ist`);
  S.player.popularity = clamp(S.player.popularity + (S.player.number === lg.number && lg.retired ? 6 : 3), 0, 100);
  toast(`🗿 Du spielst beim Verein von ${lg.parent}!`);
}

// Spiel gegen den Verein, an dem das Elternteil Legende ist
function legacyOpponent(opp) {
  const lg = (S.parentLegacy || []).find(x => x.club === opp && S.clubId !== opp);
  if (!lg || S.youth || !chance(0.6)) return '';
  return `Auswärts bei ${opp}: ${lg.statue ? `Vor dem Stadion steht die Statue von ${lg.parent}, ` : ''}${lg.retired ? `unter dem Dach hängt die #${lg.number}. ` : ''}Die Fans wissen nicht, ob sie dich ausbuhen oder feiern sollen. `;
}

// ---------- Spielerkarte ----------
function cardTier(peak) { return peak >= 90 ? 'icon' : peak >= 80 ? 'gold' : peak >= 70 ? 'silver' : 'bronze'; }

function cardData() {
  const t = totals();
  const cs = clubStats().sort((a, b) => b.games - a.games);
  const pro = S.history.filter(h => !h.youth && !h.banned);
  return {
    name: S.player.name, nation: S.player.nation, pos: S.player.pos, number: S.player.number, peak: S.peak,
    games: t.games, goals: t.goals, assists: t.assists, caps: S.player.caps || 0, titles: S.titles.length,
    ballon: S.awards.filter(a => a.startsWith("Ballon d'Or")).length, club: cs.length ? cs[0].club : S.clubId,
    years: pro.length ? `${pro[0].year}–${pro[pro.length - 1].year + 1}` : '', legacy: legacy()[1], gen: S.gen || 1,
  };
}

// Auch alte Ruhmeshallen-Einträge ohne gespeicherte Karte bekommen eine
function cardFromEntry(e) {
  return e.card || { name: e.name, nation: e.nation, pos: e.pos, number: null, peak: e.peak, games: e.games, goals: e.goals,
    assists: e.assists, caps: e.caps || 0, titles: e.titles, ballon: e.ballon, club: null, years: '', legacy: e.title, gen: e.gen || 1 };
}

const cardStats = d => [['SP', d.games], ['TOR', d.goals], ['VOR', d.assists ?? '–'], ['TIT', d.titles], ['LS', d.caps], ['BDO', d.ballon]];

function renderCard(d, saveBtn = true) {
  return `
  <div class="pcard-wrap">
    <div class="pcard ${cardTier(d.peak)}">
      <div class="pc-top"><div class="pc-ovr">${d.peak}<small>${esc(d.pos)}</small></div>
        <div class="pc-club">${d.club ? crest(d.club) : ''}${d.number ? `<span>#${d.number}</span>` : ''}</div></div>
      <div class="pc-face">${d.ballon ? '👑' : d.peak >= 85 ? '😎' : '🙂'}</div>
      <div class="pc-name">${esc(d.name)}</div>
      <div class="pc-sub">${esc(d.nation)}${d.years ? ` · ${esc(d.years)}` : ''}${d.gen > 1 ? ` · Gen. ${d.gen}` : ''}</div>
      <div class="pc-stats">${cardStats(d).map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}</div>
      <div class="pc-foot">${esc(d.legacy || '')}</div>
    </div>
    ${saveBtn ? `<div class="actions">${btn('Als Bild speichern', () => showCardImage(d), 'small')}</div>` : ''}
  </div>`;
}

function renderCareerCard() {
  return `<section class="card"><h2>Deine Spielerkarte</h2>${renderCard(cardData())}</section>`;
}

// Karte auf ein Canvas zeichnen und als Bild anzeigen (gedrückt halten oder Rechtsklick zum Speichern)
function cardImage(d) {
  const W = 600, H = 860, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const colors = { icon: ['#f6e7b0', '#b8892a', '#2a1d05'], gold: ['#f3d36b', '#a8801c', '#2a1d05'], silver: ['#e4e9ee', '#8e99a4', '#1b2229'], bronze: ['#e3a873', '#8a5428', '#2a1608'] }[cardTier(d.peak)];
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1]);
  g.fillStyle = grad;
  g.beginPath(); g.roundRect(10, 10, W - 20, H - 20, 46); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 6; g.stroke();
  g.fillStyle = colors[2]; g.textBaseline = 'alphabetic';
  g.font = 'bold 120px Arial Narrow, Arial, sans-serif'; g.fillText(String(d.peak), 60, 170);
  g.font = 'bold 48px Arial, sans-serif'; g.fillText(d.pos, 66, 230);
  if (d.number) { g.textAlign = 'right'; g.font = 'bold 60px Arial, sans-serif'; g.fillText(`#${d.number}`, W - 60, 150); g.textAlign = 'left'; }
  g.textAlign = 'center';
  g.font = '170px serif'; g.fillText(d.ballon ? '👑' : d.peak >= 85 ? '😎' : '🙂', W / 2, 420);
  g.font = 'bold 54px Arial Narrow, Arial, sans-serif';
  let name = d.name.toUpperCase();
  while (g.measureText(name).width > W - 80 && name.length > 4) name = name.slice(0, -1);
  g.fillText(name, W / 2, 510);
  g.font = '30px Arial, sans-serif';
  g.fillText([d.nation, d.years, d.club].filter(Boolean).join(' · '), W / 2, 555, W - 80);
  g.fillRect(80, 585, W - 160, 3);
  cardStats(d).forEach(([k, v], i) => {
    const x = 120 + (i % 3) * 180, y = 645 + Math.floor(i / 3) * 85;
    g.font = 'bold 50px Arial, sans-serif'; g.fillText(String(v), x, y);
    g.font = '24px Arial, sans-serif'; g.fillText(k, x, y + 30);
  });
  g.font = 'bold 30px Arial, sans-serif'; g.fillText(d.legacy || '', W / 2, H - 36);
  return c.toDataURL('image/png');
}

function showCardImage(d) {
  let url;
  try { url = cardImage(d); } catch (e) { toast('Das Bild konnte nicht erstellt werden.'); return; }
  const el = document.createElement('div');
  el.className = 'card-overlay';
  el.innerHTML = `<div class="co-box"><img src="${url}" alt="Spielerkarte von ${esc(d.name)}">
    <p>Bild gedrückt halten oder Rechtsklick → „Bild speichern“.</p>
    <div class="actions"><button class="btn primary small co-save">Herunterladen</button>
    <button class="btn small co-close">Schließen</button></div><p class="muted co-msg"></p></div>`;
  const filename = `spielerkarte-${d.name.replace(/[^A-Za-z0-9ÄÖÜäöüß]+/g, '-').toLowerCase()}.png`;
  el.addEventListener('click', e => {
    if (e.target === el || e.target.closest('.co-close')) el.remove();
    else if (e.target.closest('.co-save')) saveCardFile(url, filename, el.querySelector('.co-msg'));
  });
  document.body.appendChild(el);
}

// Speichern: auf claude.ai über die Download-Funktion der Seite, sonst über einen normalen Download-Link
async function saveCardFile(url, filename, msg) {
  const bin = atob(url.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/png' });
  const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) {
    try { await dl.save({ filename, data: blob }); msg.textContent = 'Gespeichert!'; }
    catch (e) { msg.textContent = e && e.code === 'declined' ? 'Abgebrochen.' : 'Speichern geht hier nicht – halte das Bild gedrückt oder nutze Rechtsklick.'; }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---------- Was wäre wenn … ----------
// Merkt sich die folgenreichste Wechselentscheidung der Karriere
function recordDecision(o) {
  const offers = S.offers;
  if (!offers || S.youth || (o && o.loan)) return;
  const chosen = o ? o.club : S.clubId;
  const alts = offers.list.filter(x => !x.loan && x.club !== chosen).map(x => x.club);
  if (o && !offers.released && S.clubId !== chosen) alts.push(S.clubId);
  if (!alts.length) return;
  const alt = alts.sort((a, b) => Math.abs(clubStr(b) - clubStr(chosen)) - Math.abs(clubStr(a) - clubStr(chosen)))[0];
  const gap = Math.abs(clubStr(alt) - clubStr(chosen));
  if (gap < 4 || (S.whatIf && S.whatIf.gap >= gap)) return;
  S.whatIf = { year: S.year + 1, rating: Math.round(S.player.rating), chosen, alt, altStr: clubStr(alt), chosenStr: clubStr(chosen), gap, stay: alt === S.clubId };
}

function whatIfStory() {
  const w = S.whatIf;
  if (!w) return null;
  if (w.story) return w.story;
  const span = [];
  for (const h of S.history) {
    if (h.year < w.year || h.youth || h.banned) continue;
    if (h.club !== w.chosen) break;
    span.push(h);
  }
  const n = Math.max(1, span.length);
  const actual = span.reduce((s, h) => s + h.titles, 0);
  const goals = span.reduce((s, h) => s + h.goals, 0);
  const L = clubLeague(w.alt);
  const rank = clubsIn(L.id).sort((a, b) => clubStr(b) - clubStr(a)).indexOf(w.alt) + 1;
  const perSeason = ([0.42, 0.22, 0.12][rank - 1] || 0.04) + (rank <= 3 ? 0.18 : 0.08) + (w.altStr >= 84 ? 0.12 : 0);
  const est = Math.max(0, Math.round(n * perSeason + rand(-0.4, 0.4)));
  const role = w.rating < w.altStr - 6 ? 'bench' : w.rating > w.altStr + 4 ? 'star' : 'regular';
  const estGoals = Math.round(goals * { bench: 0.5, star: 1.25, regular: 1 }[role] + rand(-3, 3));
  const how = w.stay ? `bei ${w.alt} geblieben` : `zu ${w.alt} gewechselt`;
  const roleText = { bench: `Dort hättest du anfangs vermutlich oft auf der Bank gesessen.`, star: `Dort wärst du sofort der Star der Mannschaft gewesen.`, regular: `Dort hättest du wohl einen Stammplatz bekommen.` }[role];
  const verdict = est > actual + 1 ? 'Vielleicht war es die falsche Entscheidung … aber wer weiß das schon?'
    : est < actual ? 'Du hast alles richtig gemacht!' : 'Am Ende hätte es kaum einen Unterschied gemacht.';
  w.story = `Sommer ${w.year}: Du hast dich für ${w.chosen} entschieden. Wärst du damals ${how}, wäre alles anders gekommen. ${roleText} `
    + `In ${n} ${n === 1 ? 'Saison' : 'Saisons'} hättest du wahrscheinlich etwa ${est} Titel und ${Math.max(0, estGoals)} Tore geholt – bei ${w.chosen} waren es tatsächlich ${actual} Titel und ${goals} Tore. ${verdict}`;
  return w.story;
}

function renderWhatIf() {
  const s = whatIfStory();
  if (!s) return '';
  return `<section class="card"><h2>🔮 Was wäre wenn …</h2><p>${esc(s)}</p><p class="muted">Ein Gedankenspiel – geschätzt aus der Stärke der Vereine.</p></section>`;
}
