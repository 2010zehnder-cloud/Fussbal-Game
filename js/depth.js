'use strict';

// Spezialfähigkeiten, Posteingang, Derbys und Karriere-Tagebuch

// ---------- Spezialfähigkeiten ----------
const PERKS = {
  freekick: { name: 'Freistoß-Spezialist', icon: '🎯', need: 4, desc: 'Freistöße gelingen dir öfter.' },
  header: { name: 'Kopfballmonster', icon: '🦒', need: 4, desc: 'Kopfbälle gelingen dir öfter.' },
  penalty: { name: 'Elfmeterkiller', icon: '🧊', need: 3, desc: 'Elfmeter verwandelst du noch sicherer.' },
  dribble: { name: 'Dribbelkünstler', icon: '🪄', need: 4, desc: 'Dribblings und Solos gelingen dir öfter.' },
  pass: { name: 'Spielmacher', icon: '🧠', need: 6, desc: 'Deine Pässe kommen öfter an.' },
  longshot: { name: 'Distanzschütze', icon: '🚀', need: 3, desc: 'Fernschüsse und Volleys gelingen dir öfter.' },
  tackle: { name: 'Abwehrchef', icon: '🛡️', need: 5, desc: 'Zweikämpfe und Rettungstaten gelingen dir öfter.' },
  save: { name: 'Katze im Tor', icon: '🐈', need: 5, desc: 'Du hältst mehr Bälle.' },
};
const PERK_BONUS = 0.08;

// Welche Fähigkeit eine Option trainiert
function perkCat(o, situation) {
  const l = o.label;
  if (o.kind === 'shoot') return 'penalty';
  if (o.kind === 'save') return 'save';
  if (/Freistoß/.test(situation) && (o.kind === 'goal' || /Mauer|Torwarteck|Direkt/.test(l))) return 'freekick';
  if (/Kopf/.test(l)) return o.kind === 'stop' ? 'tackle' : 'header';
  if (/Dribbling|tunneln|Losdribbeln|Selbst durchlaufen/.test(l)) return 'dribble';
  if (/Volley|Distanz|Mittellinie|Fernschuss/.test(l)) return 'longshot';
  if (o.kind === 'assist') return 'pass';
  if (o.kind === 'stop') return S.player.pos === 'TW' ? 'save' : 'tackle';
  return null;
}
function perks() { if (!S.perks) S.perks = { counts: {}, have: [] }; return S.perks; }
const hasPerk = k => perks().have.includes(k);

function applyPerks(c) {
  c.options.forEach(o => {
    const cat = perkCat(o, c.situation);
    o.cat = cat;
    if (cat && hasPerk(cat)) {
      o.perk = PERKS[cat].name;
      if (o.p !== undefined) o.p = clamp(o.p + PERK_BONUS, 0.05, 0.95);
    }
  });
}
function countPerk(o, success) {
  if (!success || !o.cat) return '';
  const pk = perks();
  pk.counts[o.cat] = (pk.counts[o.cat] || 0) + 1;
  const def = PERKS[o.cat];
  if (!hasPerk(o.cat) && pk.counts[o.cat] >= def.need) {
    pk.have.push(o.cat);
    toast(`${def.icon} Neue Spezialfähigkeit: ${def.name}!`);
    queueFx('chime');
    return ` ${def.icon} Neue Spezialfähigkeit freigeschaltet: ${def.name}!`;
  }
  return '';
}
function renderPerks() {
  const pk = perks();
  return `
  <section class="card">
    <h2>Spezialfähigkeiten</h2>
    <p class="muted small">Gelingt dir eine Aktion oft genug, schaltest du eine Spezialfähigkeit frei. Sie erhöht die Erfolgschance dieser Aktionen um ${Math.round(PERK_BONUS * 100)} Prozentpunkte.</p>
    <div class="perks">${Object.entries(PERKS).map(([k, d]) => {
      const n = Math.min(pk.counts[k] || 0, d.need), got = hasPerk(k);
      return `<div class="perk ${got ? 'got' : ''}"><b>${got ? d.icon : '🔒'} ${esc(d.name)}</b><small>${esc(d.desc)}</small>${got ? '' : bar('Fortschritt', n, d.need)}</div>`;
    }).join('')}</div>
  </section>`;
}

// ---------- Derbys ----------
const DERBIES = [
  ['Borussia Dortmund', 'FC Schalke 04', 'Revierderby'], ['FC Bayern München', 'Borussia Dortmund', 'Der Klassiker'],
  ['Hamburger SV', 'FC St. Pauli', 'Hamburger Stadtderby'], ['1. FC Köln', 'Borussia Mönchengladbach', 'Rheinderby'],
  ['VfB Stuttgart', 'SC Freiburg', 'Baden-Württemberg-Derby'], ['Hertha BSC', '1. FC Union Berlin', 'Berliner Stadtderby'],
  ['Real Madrid', 'FC Barcelona', 'El Clásico'], ['Real Madrid', 'Atlético Madrid', 'Madrid-Derby'], ['FC Sevilla', 'Real Betis', 'Gran Derbi'],
  ['Inter Mailand', 'AC Mailand', 'Derby della Madonnina'], ['AS Rom', 'Lazio Rom', 'Derby della Capitale'], ['Juventus Turin', 'FC Turin', 'Derby della Mole'],
  ['FC Liverpool', 'FC Everton', 'Merseyside-Derby'], ['Manchester United', 'Manchester City', 'Manchester-Derby'], ['FC Arsenal', 'Tottenham Hotspur', 'Nord-London-Derby'],
  ['Olympique Marseille', 'Paris Saint-Germain', 'Le Classique'], ['Ajax Amsterdam', 'Feyenoord Rotterdam', 'De Klassieker'],
  ['Benfica Lissabon', 'Sporting Lissabon', 'Lissabon-Derby'], ['Galatasaray Istanbul', 'Fenerbahçe Istanbul', 'Istanbul-Derby'],
  ['Celtic Glasgow', 'Glasgow Rangers', 'Old Firm'], ['SK Rapid Wien', 'FK Austria Wien', 'Wiener Derby'], ['FC Basel', 'FC Zürich', 'Schweizer Klassiker'],
  ['Boca Juniors', 'River Plate', 'Superclásico'], ['Flamengo', 'Fluminense', 'Fla-Flu'], ['Al-Hilal', 'Al-Nassr', 'Riad-Derby'],
  ['LA Galaxy', 'Los Angeles FC', 'El Tráfico'], ['FC Brügge', 'RSC Anderlecht', 'Belgischer Klassiker'],
];
function derbyFor(club) {
  const list = DERBIES.filter(([a, b]) => (a === club || b === club))
    .map(([a, b, name]) => ({ opp: a === club ? b : a, name }))
    .filter(d => S.clubs[d.opp] && S.clubs[d.opp].league === S.clubs[club].league);
  return list.length ? pick(list) : null;
}
// Bei Liga-Spielen kommt öfter das Derby
function maybeDerby(c, L) {
  if (S.youth || c.comp !== L.name || c.drama || c.rivalMatch) return;
  const d = derbyFor(S.clubId);
  if (!d || !chance(0.45)) return;
  c.opp = d.opp;
  c.derby = d.name;
  c.situation = `🔥 ${d.name}! Die ganze Stadt ist seit Tagen im Ausnahmezustand. ` + c.situation;
}
function derbyResult(c, us, them) {
  if (!c.derby) return '';
  S.derbyStats = S.derbyStats || { w: 0, d: 0, l: 0 };
  if (us > them) {
    S.derbyStats.w++;
    S.player.popularity = clamp(S.player.popularity + 6, 0, 100);
    setHeadline(`DERBYSIEG! ${lastName()} LÄSST ${S.clubId.toUpperCase()} JUBELN`);
    return ` Derbysieg! Die Fans feiern dich die ganze Nacht.`;
  }
  if (us < them) { S.derbyStats.l++; S.player.popularity = clamp(S.player.popularity - 3, 0, 100); return ' Derby verloren – das tut doppelt weh.'; }
  S.derbyStats.d++;
  return ' Ein Remis im Derby. Keiner kann jubeln.';
}

// ---------- Posteingang ----------
function inbox() { if (!S.inbox) S.inbox = []; return S.inbox; }
function sendMail(from, text, replies = null) {
  inbox().unshift({ id: `${Date.now()}-${randInt(0, 9999)}`, from, text, replies, read: false, answered: null, year: S.year });
  if (S.inbox.length > 30) S.inbox.length = 30;
}
const unreadMail = () => inbox().filter(m => !m.read).length;

// Briefe nach jeder Saison, passend zu dem, was passiert ist
function mailSeason(res) {
  if (res.role === 'U19' && chance(0.5)) return;
  const p = S.player;
  const pool = [];
  if (res.goals >= 10) pool.push(() => sendMail('Fan-Post', `Hallo! Ich bin 9 Jahre alt und habe alle deine ${res.goals} Tore diese Saison im Album. Kannst du mir ein Autogramm schicken?`,
    [{ label: 'Signiertes Trikot schicken', eff: { popularity: 3 }, reply: 'Das Kind postet ein Video vor Freude. Tausende teilen es.' }, { label: 'Autogrammkarte schicken', eff: { popularity: 1 }, reply: 'Eine nette Geste.' }]));
  if (res.note !== null && res.note >= 3.8) pool.push(() => sendMail('Wütender Fan', 'So schlecht wie du diese Saison hat noch nie jemand in unserem Trikot gespielt. Verkauft ihn!',
    [{ label: 'Freundlich antworten', eff: { popularity: 2 }, reply: 'Der Fan entschuldigt sich sogar.' }, { label: 'Ignorieren', eff: {}, reply: 'Du löschst die Nachricht.' }]));
  const parent = (S.family && S.family.parents || []).find(x => x.alive);
  if (parent) pool.push(() => sendMail(`${parent.name} (Familie)`, pick([
    'Wir haben jedes Spiel im Fernsehen gesehen. Iss genug Gemüse und ruf mal wieder an!',
    'Die Nachbarn fragen ständig nach dir. Wir sind so stolz!',
    'Kommst du an Weihnachten nach Hause? Es gibt dein Lieblingsessen.',
  ]), [{ label: 'Anrufen', eff: { form: 1 }, reply: 'Ihr telefoniert eine Stunde lang. Das tut gut.', fam: 8 }, { label: 'Kurz zurückschreiben', eff: {}, reply: 'Ein kurzes „Danke, alles gut!“', fam: 2 }]));
  if (!S.youth && S.contract.years <= 1) pool.push(() => sendMail('Dein Berater', 'Dein Vertrag läuft bald aus. Ich habe schon mit drei Vereinen gesprochen. Sollen wir pokern?',
    [{ label: 'Ja, lass uns pokern', eff: { trust: -3 }, reply: 'Dein Berater streut Gerüchte. Mehr Vereine werden aufmerksam.', boost: 1 }, { label: 'Nein, ich bleibe ruhig', eff: { trust: 2 }, reply: 'Der Berater respektiert deine Entscheidung.' }]));
  if (S.team && S.team.mates.length) {
    const m = pick(S.team.mates);
    pool.push(() => sendMail(m.name, pick(['Starke Saison, Kollege! Gehen wir nach dem Training essen?', 'Hast du Lust, im Urlaub zusammen zu trainieren?', 'Danke für den Pass im letzten Spiel – das Bier geht auf mich!']),
      [{ label: 'Gerne!', eff: { form: 1 }, reply: 'Ihr habt einen lustigen Abend.', mate: m.name }, { label: 'Keine Zeit', eff: {}, reply: 'Vielleicht ein anderes Mal.' }]));
  }
  if (rivalActive() && chance(0.4)) pool.push(() => sendMail(S.rival.name, pick(['Glückwunsch zur Saison. Nächstes Jahr schlage ich dich.', 'Du hattest Glück diese Saison. Mal sehen, wer am Ende mehr Titel hat.']),
    [{ label: 'Kampfansage zurück', eff: { popularity: 2 }, reply: 'Die Medien lieben euer Duell.' }, { label: 'Respektvoll antworten', eff: { trust: 1 }, reply: 'Ihr verabschiedet euch mit gegenseitigem Respekt.' }]));
  if (S.player.popularity >= 50 && chance(0.5)) pool.push(() => sendMail('Fernsehsender', 'Wir möchten eine Doku über dein Leben drehen. Darf ein Kamerateam dich eine Woche begleiten?',
    [{ label: 'Zusagen', eff: { popularity: 5, form: -1 }, reply: 'Die Doku wird ein Riesenerfolg.', money: dealSize() }, { label: 'Ablehnen', eff: {}, reply: 'Du bleibst lieber privat.' }]));
  if (res.titles.length) pool.push(() => sendMail('Bürgermeister', `Herzlichen Glückwunsch zum Titel! Die Stadt möchte dich ins Goldene Buch eintragen.`,
    [{ label: 'Gerne kommen', eff: { popularity: 4 }, reply: 'Tausende Fans feiern dich vor dem Rathaus.' }, { label: 'Absagen', eff: { popularity: -1 }, reply: 'Der Bürgermeister ist enttäuscht.' }]));
  shuffle(pool).slice(0, randInt(1, 3)).forEach(f => f());
}

function answerMail(m, r) {
  m.answered = r.label;
  let text = r.reply + mod(r.eff || {});
  if (r.money) text += mod({ money: r.money });
  if (r.boost) S.agentPush = (S.agentPush || 0) + r.boost;
  if (r.fam && S.family) S.family.parents.filter(x => x.alive).forEach(x => { x.rel = clamp(x.rel + r.fam, 0, 100); });
  if (r.mate && S.team) { const mt = S.team.mates.find(x => x.name === r.mate); if (mt) mt.rel = clamp(mt.rel + 10, -100, 100); }
  m.result = text;
}

function renderInbox() {
  const list = inbox();
  list.forEach(m => { m.read = true; });
  if (!list.length) return '<section class="card"><h2>Posteingang</h2><p class="muted">Noch keine Nachrichten. Nach jeder Saison bekommst du Post.</p></section>';
  return `
  <section class="card">
    <h2>Posteingang</h2>
    <div class="mails">${list.map(m => `
      <article class="mail">
        <header><b>${esc(m.from)}</b><small>${seasonLabel(m.year)}</small></header>
        <p>${esc(m.text)}</p>
        ${m.answered ? `<div class="result"><p class="chosen">Deine Antwort: ${esc(m.answered)}</p>${m.result || ''}</div>`
          : m.replies ? `<div class="lifeacts">${m.replies.map(r => btn(esc(r.label), () => { answerMail(m, r); render(true); }, 'small')).join('')}</div>` : ''}
      </article>`).join('')}</div>
  </section>`;
}

// ---------- Karriere-Tagebuch ----------
function careerDiary() {
  const p = S.player;
  const first = p.name.trim().split(/\s+/)[0];
  const parts = [];
  const originText = {
    academy: `${first} kam mit 17 Jahren in die Jugend`,
    street: `${first} wurde auf einem Bolzplatz entdeckt und kam in die Jugend`,
    late: `${first} war ein Spätstarter und begann die Profikarriere erst mit 20`,
    legacy: `${first} trug einen berühmten Nachnamen und begann in der Jugend`,
    wonderkid: `${first} galt schon mit 17 als Wunderkind und kam in die Jugend`,
  }[originOf()] || `${first} begann in der Jugend`;
  const rows = S.history;
  const youth = rows.find(h => h.youth);
  const start = youth ? `${originText} von ${youth.club}` : originOf() === 'late' ? originText : `${first} begann die Karriere mit 17 Jahren`;
  parts.push(`${start}${S.gen > 1 ? ` – als Kind von ${S.parentName}, das die Familientradition fortsetzen wollte` : ''}.`);
  // Stationen
  const stints = [];
  for (const h of rows.filter(r => !r.youth)) {
    const last = stints[stints.length - 1];
    if (last && last.club === h.club) { last.to = h.year; last.games += h.games; last.goals += h.goals; last.titles += h.titles; }
    else stints.push({ club: h.club, from: h.year, to: h.year, games: h.games, goals: h.goals, titles: h.titles, banned: h.banned, loan: h.loan });
  }
  stints.forEach((st, i) => {
    const span = st.from === st.to ? `${st.from}` : `${st.from} bis ${st.to + 1}`;
    if (st.banned) { parts.push(`${span} folgte der Tiefpunkt: ${st.club === 'Gefängnis' ? 'eine Zeit im Gefängnis' : 'eine lange Dopingsperre'}.`); return; }
    const verb = i === 0 ? 'Den Durchbruch suchte ' + first : pick(['Danach wechselte ' + first, 'Anschließend ging es weiter', 'Die nächste Station']);
    parts.push(`${verb} ${i === 0 ? 'bei' : 'zu'} ${st.club}${st.loan ? ' (Leihe)' : ''} (${span}): ${st.games} Spiele, ${st.goals} Tore${st.titles ? `, ${st.titles} Titel` : ''}.`);
  });
  // Höhepunkte
  const bd = S.awards.filter(a => a.startsWith("Ballon d'Or"));
  if (bd.length) parts.push(`Der größte Ruhm: ${bd.length === 1 ? 'der Ballon d\'Or' : `${bd.length} Ballon d'Ors`} (${bd.map(a => a.match(/\((.*)\)/)[1]).join(', ')}).`);
  const big = S.titles.filter(t => /Weltmeister|Europameister|Champions[- ]League-Sieger/.test(t));
  if (big.length) parts.push(`Unvergessen bleiben ${big.join(', ')}.`);
  if (S.milestones && S.milestones.length) parts.push(`Meilensteine: ${S.milestones.slice(0, 5).map(m => m.text).join(', ')}.`);
  if (S.derbyStats && (S.derbyStats.w + S.derbyStats.l + S.derbyStats.d)) parts.push(`In Derbys stand die Bilanz bei ${S.derbyStats.w} Siegen, ${S.derbyStats.d} Remis und ${S.derbyStats.l} Niederlagen.`);
  if (perks().have.length) parts.push(`Bekannt war ${first} als ${perks().have.map(k => PERKS[k].name).join(' und ')}.`);
  if (S.dopeCaught) parts.push(`Ein dunkler Fleck: ${S.dopeCaught}× beim Doping erwischt.`);
  // Privat
  const l = life();
  if (l.partner || l.children.length) {
    let t = l.married ? `Privat fand ${first} das Glück mit ${l.partner.name}` : l.partner ? `Privat war ${first} mit ${l.partner.name} zusammen` : 'Privat';
    if (l.children.length) t += `${l.partner ? ' und' : ''} bekam ${l.children.length === 1 ? 'ein Kind' : `${l.children.length} Kinder`}: ${l.children.map(c => c.name).join(', ')}`;
    parts.push(t + '.');
  }
  if (rivalActive() || (S.rival && S.rival.games)) parts.push(`Der ewige Rivale hieß ${S.rival.name} – direkte Duelle: ${S.rival.wins}:${S.rival.losses}.`);
  if (S.phase === 'retired') {
    parts.push(`Mit ${S.retireAge || p.age} Jahren beendete ${first} die Karriere: ${totals().games} Spiele, ${totals().goals} Tore, ${S.titles.length} Titel.`);
    if (S.after) parts.push(S.after);
  } else parts.push(`Die Geschichte ist noch nicht zu Ende – ${first} ist ${p.age} Jahre alt und spielt für ${S.clubId}.`);
  return parts;
}
function renderDiary() {
  if (!S.history || !S.history.length) return '';
  return `
  <section class="card diary">
    <details${S.phase === 'retired' ? ' open' : ''}><summary>📖 Lebensgeschichte</summary>
      ${careerDiary().map(t => `<p>${esc(t)}</p>`).join('')}
    </details>
  </section>`;
}
