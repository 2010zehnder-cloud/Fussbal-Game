'use strict';

// Startszenarien, Saisonverläufe, Gegner mit Spielstil, wiederkehrende Gegenspieler,
// Pokal-Wunder und Blamagen, weitere Geschichten, Herausforderungen und Zufallskarriere

// ---------- Startszenarien ----------
const ORIGINS = {
  academy: { name: 'Akademie-Talent', desc: 'Der klassische Weg: mit 17 in ein Nachwuchsleistungszentrum.' },
  street: { name: 'Straßenfußballer', desc: 'Auf dem Bolzplatz entdeckt. Weniger Technik, aber riesiges Potenzial.' },
  late: { name: 'Spätstarter', desc: 'Mit 20 noch bei einem kleinen Verein. Der Weg nach oben ist steil.' },
  legacy: { name: 'Kind einer Legende', desc: 'Berühmter Nachname, viel Aufmerksamkeit – und riesiger Druck.' },
  wonderkid: { name: 'Wunderkind', desc: 'Mit 17 schon in aller Munde. Kann alles erreichen – oder zerbrechen.' },
};
const originOf = () => (S && S.origin) || 'academy';

function applyOrigin(origin) {
  const p = S.player;
  S.origin = origin;
  if (origin === 'street') {
    p.rating -= 3; p.potential = clamp(p.potential + 4, 70, 99); p.popularity += 5;
    S.academyOffers = Object.keys(S.clubs).filter(n => clubStr(n) >= 60 && clubStr(n) <= 70).sort(() => Math.random() - 0.5).slice(0, 3);
  } else if (origin === 'legacy') {
    p.rating += 2; p.popularity = clamp(p.popularity + 25, 0, 100); p.trust -= 8;
    S.legacyParent = `${pick(['Michael', 'Thomas', 'Lothar', 'Jürgen', 'Oliver', 'Miroslav'])} ${S.player.name.trim().split(/\s+/).slice(-1)[0]}`;
  } else if (origin === 'wonderkid') {
    p.rating += 4; p.potential = clamp(p.potential + 1, 78, 97); p.popularity += 15; p.injuryProne += 5;
    S.academyOffers = Object.keys(S.clubs).sort((a, b) => clubStr(b) - clubStr(a)).slice(0, 8).sort(() => Math.random() - 0.5).slice(0, 3);
  } else if (origin === 'late') {
    p.age = 20; p.rating = randInt(57, 61); p.potential = clamp(p.potential - 4, 72, 90);
    const small = Object.keys(S.clubs).filter(n => clubStr(n) <= 63).sort(() => Math.random() - 0.5);
    S.clubId = small[0];
    S.youth = false;
    S.contract = { salary: salaryFor(p.rating, S.clubId, 'Rotation'), years: 2 };
    S.peak = Math.round(p.rating);
    startSeason();
  }
}

const ORIGIN_EVENTS = [
  {
    id: 'originStreet', title: 'Die alten Bolzplatz-Kumpels', weight: () => 3,
    cond: () => originOf() === 'street' && S.player.age <= 21 && !hasFlag('streetDone'),
    text: () => 'Deine Freunde vom Bolzplatz wollen, dass du am Wochenende wieder mit ihnen kickst – wie früher, ohne Schienbeinschoner.',
    options: [
      { label: 'Klar, ich vergesse nicht, wo ich herkomme', run: () => { setFlag('streetDone'); return 'Du zauberst wie früher. Die Jungs sind stolz auf dich.' + mod({ popularity: 4, form: 2, injuryProne: 1 }); } },
      { label: 'Das Verletzungsrisiko ist zu groß', run: () => { setFlag('streetDone'); return 'Die Kumpels sind enttäuscht, verstehen es aber.' + mod({ trust: 2 }); } },
    ],
  },
  {
    id: 'originLegacy', title: 'Der berühmte Nachname', weight: () => 3,
    cond: () => originOf() === 'legacy' && S.player.age <= 23,
    text: () => `Wieder schreibt die Zeitung: „Wird ${S.player.name.trim().split(/\s+/)[0]} jemals so gut wie ${S.legacyParent}?“ Der Vergleich verfolgt dich überall.`,
    options: [
      { label: 'Mit dem berühmten Elternteil reden', run: () => 'Ihr redet lange. „Geh deinen eigenen Weg“, bekommst du zu hören.' + mod({ form: 3 }) },
      { label: 'Den Namen auf dem Trikot ändern', run: () => 'Ab jetzt steht nur dein Vorname auf dem Rücken. Ein Statement!' + mod({ popularity: 5, form: 1 }) },
      { label: 'Es einfach ignorieren', run: () => 'Leichter gesagt als getan.' + mod({ form: -1 }) },
    ],
  },
  {
    id: 'originLate', title: 'Ein Scout auf dem Dorfplatz', weight: () => 3,
    cond: () => originOf() === 'late' && S.player.age <= 23 && !hasFlag('lateScout'),
    text: () => 'Bei einem Spiel vor 800 Zuschauern sitzt ein Scout eines großen Vereins auf der Tribüne. Er ist offenbar deinetwegen hier.',
    options: [
      { label: 'Alles geben und auffallen wollen', run: () => { setFlag('lateScout'); S.season.transferBoost = (S.season.transferBoost || 0) + 2; return 'Du spielst wie entfesselt. Der Scout macht sich lange Notizen.' + mod({ form: 2 }); } },
      { label: 'Ganz normal spielen', run: () => { setFlag('lateScout'); S.season.transferBoost = (S.season.transferBoost || 0) + 1; return 'Solide Leistung. Mal sehen, ob er sich meldet.' + mod({}); } },
    ],
  },
  {
    id: 'originWonderkid', title: 'Die Last der Erwartungen', weight: () => 3,
    cond: () => originOf() === 'wonderkid' && S.player.age <= 21,
    text: () => 'Mit gerade mal 18 Jahren bist du auf dem Cover eines Fußballmagazins: „Der nächste Weltfußballer?“',
    options: [
      { label: 'Den Hype genießen', run: () => 'Du gibst Interviews und postest das Cover. Der Trainer sieht das kritisch.' + mod({ popularity: 6, trust: -4 }) },
      { label: 'Abtauchen und arbeiten', run: () => 'Du schaltest dein Handy aus und trainierst doppelt.' + mod({ devBonus: 0.8 }) },
    ],
  },
];

// ---------- Zufällige Saisonverläufe ----------
const FLOWS = {
  normal: { name: 'Normale Saison', bonus: 0 },
  high: { name: 'Höhenflug', text: 'Alles läuft: Ihr gewinnt Spiel um Spiel, die Fans träumen.', bonus: 0.15 },
  crisis: { name: 'Krisen-Saison', text: 'Nichts klappt: Niederlagen, Unruhe, Pfiffe von den Rängen.', bonus: -0.15 },
  chaos: { name: 'Chaos-Saison', text: 'Verletzungswelle, Streit im Vorstand, Trainerwechsel im Winter – bei euch ist alles durcheinander.', bonus: -0.05 },
};
function pickFlow() {
  if (S.youth) return 'normal';
  const r = Math.random();
  return r < 0.55 ? 'normal' : r < 0.72 ? 'high' : r < 0.88 ? 'crisis' : 'chaos';
}
function renderFlow() {
  const f = S.season && S.season.flow;
  if (!f || f === 'normal' || S.season.step < 2) return '';
  const fl = FLOWS[f];
  return `<div class="flow flow-${f}"><b>${f === 'high' ? '📈' : f === 'crisis' ? '📉' : '🌀'} Zwischenbilanz: ${esc(fl.name)}</b><span>${esc(fl.text)}</span></div>`;
}
const FLOW_EVENTS = [
  {
    id: 'flowCrisis', title: 'Krisengipfel', weight: () => 6,
    cond: () => S.season.flow === 'crisis' && S.season.step >= 2,
    text: () => 'Nach der fünften Niederlage in Folge ruft der Vorstand zum Krisengipfel. Du sollst als Führungsspieler dabei sein.',
    options: [
      { label: 'Für den Trainer einstehen', run: () => 'Der Trainer bleibt – und vergisst dir das nie.' + mod({ trust: 10, popularity: -2 }) },
      { label: 'Einen neuen Trainer fordern', run: () => { S.season.flowBonus = 0.08; return 'Der Trainer wird entlassen. Unter dem Neuen geht es tatsächlich bergauf.' + mod({ trust: -4, form: 2 }); } },
      { label: 'Raushalten', run: () => 'Du sagst nichts. Die Krise geht weiter.' + mod({ form: -1 }) },
    ],
  },
  {
    id: 'flowHigh', title: 'Die Euphorie kennt keine Grenzen', weight: () => 6,
    cond: () => S.season.flow === 'high' && S.season.step >= 2,
    text: () => 'Die Stadt ist im Ausnahmezustand. Überall hängen Fahnen, die Fans singen schon von Titeln.',
    options: [
      { label: 'Die Erwartungen bremsen', run: () => 'Klug. Ihr bleibt bodenständig und konzentriert.' + mod({ trust: 4, form: 1 }) },
      { label: '„Wir holen den Titel!“', run: () => { S.season.flowBonus = chance(0.5) ? 0.06 : -0.06; return 'Die Fans flippen aus. Jetzt seid ihr Gejagte.' + mod({ popularity: 6 }); } },
    ],
  },
  {
    id: 'flowChaos', title: 'Aushelfen in der Not', weight: () => 6,
    cond: () => S.season.flow === 'chaos' && S.season.step >= 2 && S.player.pos !== 'TW',
    text: () => 'Sieben Spieler sind verletzt. Der Trainer fragt, ob du auf einer völlig fremden Position aushelfen kannst.',
    options: [
      { label: 'Natürlich, ich spiele überall', run: () => chance(0.55) ? 'Du überzeugst auch dort. Der Trainer ist begeistert.' + mod({ trust: 8, popularity: 3 }) : 'Es läuft nicht gut, aber alle rechnen dir die Hilfe hoch an.' + mod({ trust: 5, form: -2 }) },
      { label: 'Lieber nicht', run: () => 'Der Trainer muss improvisieren. Er ist enttäuscht.' + mod({ trust: -6 }) },
    ],
  },
];

// ---------- Gegner mit Spielstil ----------
const STYLES = {
  pressing: { name: 'Gegenpressing', tip: 'Hektisch: Sicheres Passspiel ist schwerer, schnelle Abschlüsse lohnen sich.', mod: o => (o.kind === 'safe' || o.kind === 'assist' ? -0.08 : o.kind === 'goal' ? 0.03 : 0) },
  bus: { name: 'Mauertaktik', tip: 'Der Gegner steht tief: Schüsse sind schwer, kluge Pässe helfen.', mod: o => (o.kind === 'goal' ? -0.08 : o.kind === 'assist' ? 0.05 : 0) },
  possession: { name: 'Ballbesitz', tip: 'Viel Ballbesitz beim Gegner: Verteidigen ist anstrengend.', mod: o => (o.kind === 'stop' ? -0.05 : 0) },
  counter: { name: 'Konterfußball', tip: 'Gefährlich bei Ballverlust: Riskantes lieber lassen.', mod: o => (o.kind === 'safe' ? -0.1 : o.bonus || o.risky ? -0.05 : 0) },
  physical: { name: 'Körperbetont', tip: 'Harte Zweikämpfe: Dribblings und Grätschen sind riskanter.', mod: o => (o.bonus || o.risky ? -0.1 : o.kind === 'assist' ? 0.03 : 0) },
};
function clubStyle(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return Object.keys(STYLES)[h % Object.keys(STYLES).length];
}

// ---------- Wiederkehrende Gegenspieler ----------
const FOE_ROLES = { gk: 'Torwart', def: 'Innenverteidiger', mid: 'Sechser', att: 'Stürmer' };
function foeFor(club) {
  S.foes = S.foes || {};
  if (!S.foes[club]) {
    const grp = POSITIONS[S.player.pos].group;
    const role = grp === 'att' || grp === 'mid' ? (chance(0.6) ? FOE_ROLES.gk : FOE_ROLES.def) : FOE_ROLES.att;
    S.foes[club] = { name: randomName(), role, meetings: 0, wins: 0, losses: 0, last: null };
  }
  return S.foes[club];
}

// ---------- Pokal-Wunder und Blamagen ----------
const MINNOWS = {
  de: ['TSV Havelse', 'SV Rödinghausen', 'FC Teutonia Ottensen', 'SV Atlas Delmenhorst', 'FC 08 Homburg', 'Rot-Weiss Essen', 'FC Carl Zeiss Jena', 'SpVgg Unterhaching'],
  en: ['Wrexham AFC', 'Maidstone United', 'Bromley FC', 'Barnet FC'],
  es: ['CD Ourense', 'UD Logroñés', 'SD Amorebieta', 'CD Calahorra'],
  it: ['US Triestina', 'AC Reggiana', 'Calcio Lecco'],
  fr: ['US Chauvigny', 'Le Puy Foot', 'Stade Briochin', 'Vierzon FC'],
};
function minnowName(country) { return pick(MINNOWS[country] || ['ein Amateurverein aus der 5. Liga']); }

// ---------- Szene anpassen: Stil, Gegenspieler, Pokal ----------
function flavorMatch(c, L) {
  if (S.youth) return;
  // Pokal: Riese gegen Zwerg
  if (c.comp === L.cup && chance(0.5)) {
    const giant = clubStr(S.clubId) < 80 && chance(0.5);
    if (giant) {
      c.opp = Object.keys(S.clubs).filter(n => clubLeague(n).country === L.country && n !== S.clubId).sort((a, b) => clubStr(b) - clubStr(a))[0];
      c.cupType = 'giant';
      c.situation = `🏆 Pokal-Wunder möglich! Ihr seid klarer Außenseiter gegen ${c.opp}. ` + c.situation;
    } else {
      c.opp = minnowName(L.country);
      c.cupType = 'minnow';
      c.situation = `⚠️ Achtung, Blamage droht! Ihr spielt beim krassen Außenseiter ${c.opp} auf einem holprigen Rasen. ` + c.situation;
    }
  }
  if (c.comp === L.cup) S.season.cupScene = { opp: c.opp, type: c.cupType || null };
  // Spielstil
  const styleKey = S.clubs[c.opp] ? clubStyle(c.opp) : 'physical';
  const st = STYLES[styleKey];
  c.style = st.name; c.styleTip = st.tip;
  c.options.forEach(o => { if (o.p !== undefined) o.p = clamp(o.p + st.mod(o), 0.05, 0.92); });
  // Wiederkehrender Gegenspieler
  if (S.clubs[c.opp] && chance(0.7)) {
    const f = foeFor(c.opp);
    c.foe = c.opp;
    if (f.meetings > 0) {
      c.situation = `Wieder triffst du auf ${f.name}, den ${f.role} von ${c.opp} (Bilanz ${f.wins}:${f.losses}). ` + c.situation;
      const remembered = c.options.find(o => o.label === f.last);
      if (remembered && remembered.p !== undefined) { remembered.p = clamp(remembered.p - 0.12, 0.05, 0.92); remembered.remembered = f.name; }
    } else {
      c.situation = `Gegenüber steht ${f.name}, ${f.role} bei ${c.opp}. ` + c.situation;
    }
  }
}

function afterMatch(c, us, them, o) {
  let extra = '';
  if (c.foe) {
    const f = foeFor(c.foe);
    f.meetings++;
    if (us > them) f.wins++; else if (us < them) f.losses++;
    f.last = o.label;
    if (o.remembered) extra += ` ${o.remembered} kannte deinen Trick schon vom letzten Mal.`;
  }
  if (S.season.cupScene && c.comp === clubLeague(S.clubId).cup) {
    const won = us > them || (us === them && chance(0.5));
    S.season.cupScene.won = won;
    if (us === them) extra += won ? ' Im Elfmeterschießen setzt ihr euch durch!' : ' Im Elfmeterschießen scheidet ihr aus.';
    if (c.cupType === 'giant' && won) {
      extra += ' POKAL-WUNDER! Der Außenseiter wirft den Favoriten raus!';
      S.player.popularity = clamp(S.player.popularity + 8, 0, 100);
      setHeadline(`POKAL-WUNDER! ${lastName()} SCHOCKT ${c.opp.toUpperCase()}`);
      queueFx('fanfare', 'confetti');
    }
    if (c.cupType === 'minnow' && !won) {
      extra += ` BLAMAGE! Ihr scheidet gegen ${c.opp} aus.`;
      S.player.trust = clamp(S.player.trust - 6, 0, 100);
      S.player.popularity = clamp(S.player.popularity - 4, 0, 100);
      setHeadline(`BLAMAGE! ${S.clubId.toUpperCase()} SCHEITERT AN ${c.opp.toUpperCase()}`);
    }
  }
  return extra;
}

// Pokalergebnis am Saisonende an die gespielte Szene anpassen
function cupFromScene(club, defaultRun) {
  const cs = S.season.cupScene;
  if (!cs || cs.won === undefined) return defaultRun();
  if (!cs.won) return { won: false, reached: '2. Runde', lostTo: cs.opp, played: 2 };
  const L = clubLeague(club);
  const pool = Object.keys(S.clubs).filter(n => n !== club && clubLeague(n).country === L.country).map(n => ({ name: n, str: clubStr(n) }));
  const r = knockout(clubStr(club) + (S.season.role === 'Stammspieler' ? (S.player.rating - clubStr(club)) * 0.1 : 0),
    ['Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'], pool, 4.5);
  r.played += 2;
  return r;
}

// ---------- Weitere Geschichten ----------
const MORE_STORIES = [
  {
    id: 'storyJournalist1', title: 'Der Journalist', weight: () => 1.2,
    cond: () => !S.youth && !hasFlag('journalist') && !hasFlag('journalistDone') && S.player.popularity >= 30,
    text: () => 'Ein Reporter einer großen Zeitung schreibt einen bösen Artikel über dich: „Überbezahlt und überschätzt.“',
    options: [
      { label: 'Ihn öffentlich anprangern', run: () => { setFlag('journalist', { name: `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`, war: true }); return 'Ab jetzt hast du einen Feind in der Presse.' + mod({ popularity: 3, trust: -2 }); } },
      { label: 'Zum Interview einladen', run: () => { setFlag('journalist', { name: `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`, war: false }); return 'Er nimmt an. Das Gespräch ist überraschend fair.' + mod({ popularity: 2 }); } },
    ],
  },
  {
    id: 'storyJournalist2', title: 'Der Journalist meldet sich wieder', weight: () => 6,
    cond: () => hasFlag('journalist') && since('journalist') >= 2,
    text: () => flags().journalist.war
      ? `${flags().journalist.name}, der Reporter, mit dem du dich angelegt hast, veröffentlicht ein Enthüllungsbuch – mit einem ganzen Kapitel über dich.`
      : `${flags().journalist.name}, der Reporter von damals, schreibt jetzt eine Biografie – und möchte, dass du die Hauptfigur bist.`,
    options: [],
  },
  {
    id: 'storyCeleb1', title: 'Eine Nachricht von einem Star', weight: () => 1,
    cond: () => !S.youth && !life().partner && S.player.popularity >= 45 && !hasFlag('celeb') && !hasFlag('celebDone'),
    text: () => 'Ein bekannter Popstar schreibt dir heimlich auf Social Media: „Lust auf ein Treffen? Niemand muss davon erfahren.“',
    options: [
      { label: 'Heimlich treffen', run: () => { setFlag('celeb', { name: pick(['Lia Stern', 'Nova', 'Jules Winter', 'Mara Blue']) }); return `Ihr trefft euch heimlich. Mit ${flags().celeb.name} verstehst du dich blendend.` + mod({ form: 2 }); } },
      { label: 'Nicht antworten', run: () => 'Du bleibst lieber auf dem Teppich.' + mod({}) },
    ],
  },
  {
    id: 'storyCeleb2', title: 'Das Geheimnis fliegt auf', weight: () => 6,
    cond: () => hasFlag('celeb') && since('celeb') >= 1,
    text: () => `Paparazzi haben dich und ${flags().celeb.name} zusammen fotografiert. Die Bilder sind morgen auf allen Titelseiten.`,
    options: [
      { label: 'Die Beziehung offiziell machen', run: () => { const n = flags().celeb.name; clearFlag('celeb'); setFlag('celebDone'); if (!life().partner) life().partner = { name: n, rel: 65, job: 'ist ein bekannter Popstar' }; addFollowers({ mul: 1.5, add: 50000 }); return `Ihr seid jetzt das Traumpaar der Klatschpresse! Deine Follower explodieren.` + mod({ popularity: 8 }); } },
      { label: 'Alles abstreiten', run: () => { clearFlag('celeb'); setFlag('celebDone'); return 'Niemand glaubt dir so richtig. Die Geschichte verläuft im Sand.' + mod({ popularity: -3 }); } },
    ],
  },
  {
    id: 'storyPresident1', title: 'Streit mit dem Präsidenten', weight: () => 1,
    cond: () => !S.youth && !hasFlag('president') && !hasFlag('presidentDone') && S.player.rating >= 72,
    text: () => `Der Präsident von ${S.clubId} kritisiert öffentlich dein Gehalt: „Zu teuer für das, was er bringt.“`,
    options: [
      { label: 'Zurückschießen', run: () => { setFlag('president', { club: S.clubId }); return 'Die Fehde ist eröffnet. Die Fans stehen hinter dir.' + mod({ popularity: 5, trust: -5 }); } },
      { label: 'Mit Leistung antworten', run: () => 'Du schweigst und trainierst. Bald verstummt die Kritik.' + mod({ devBonus: 0.4 }) },
    ],
  },
  {
    id: 'storyPresident2', title: 'Die Fehde eskaliert', weight: () => 6,
    cond: () => hasFlag('president') && since('president') >= 1 && flags().president.club === S.clubId,
    text: () => 'Der Präsident lässt dich nicht mehr in die VIP-Lounge und droht, dich auf die Tribüne zu setzen. Die Fans planen einen Protest – gegen ihn.',
    options: [
      { label: 'Den Fan-Protest unterstützen', run: () => { clearFlag('president'); setFlag('presidentDone'); return chance(0.5) ? 'Der Druck wird zu groß – der Präsident tritt zurück! Du bist der Held der Stadt.' + mod({ popularity: 10, trust: 6 }) : 'Der Präsident bleibt. Im Sommer will der Verein dich loswerden.' + mod({ popularity: 4, trust: -10 }); } },
      { label: 'Frieden schließen', run: () => { clearFlag('president'); setFlag('presidentDone'); return 'Ein Handschlag vor den Kameras. Die Fehde ist beendet.' + mod({ trust: 4 }); } },
    ],
  },
];
// Optionen für den zweiten Teil der Journalisten-Geschichte hängen vom ersten Teil ab
MORE_STORIES[1].options = [
  { label: 'Ein Statement abgeben', run: () => { const war = flags().journalist.war; clearFlag('journalist'); setFlag('journalistDone'); return war ? 'Dein Statement ist souverän. Das Buch floppt.' + mod({ popularity: 2 }) : 'Du gibst viele Interviews für das Buch. Es wird ein Bestseller.' + mod({ popularity: 6, money: 0.05 }); } },
  { label: 'Schweigen', run: () => { const war = flags().journalist.war; clearFlag('journalist'); setFlag('journalistDone'); return war ? 'Das Buch wird ein Bestseller – auf deine Kosten.' + mod({ popularity: -6 }) : 'Die Biografie erscheint ohne dich. Schade drum.' + mod({}); } },
];

EVENTS.push(...ORIGIN_EVENTS, ...FLOW_EVENTS, ...MORE_STORIES);

// ---------- Herausforderungen ----------
const CH_KEY = 'fussballkarriere-herausforderungen';
const titleAt = (club, prefix) => (S.titleLog || []).some(t => t.club === club && t.title.startsWith(prefix));
const CHALLENGES = [
  { id: 'hsv', name: 'Die Rothosen zurück an die Spitze', text: 'Werde mit dem Hamburger SV Deutscher Meister.', nation: 'Deutschland', pos: 'ST', club: 'Hamburger SV', age: 19, rating: 64, test: () => titleAt('Hamburger SV', 'Deutscher Meister') },
  { id: 'fck', name: 'Das Wunder vom Betzenberg', text: 'Gewinne mit dem 1. FC Kaiserslautern die Champions League.', nation: 'Deutschland', pos: 'ZOM', club: '1. FC Kaiserslautern', age: 18, rating: 62, test: () => titleAt('1. FC Kaiserslautern', 'Champions-League-Sieger') },
  { id: 'gk', name: 'Der fliegende Torwart', text: "Gewinne als Torwart den Ballon d'Or.", nation: 'Österreich', pos: 'TW', club: null, age: 17, rating: 54, test: () => S.awards.some(a => a.startsWith("Ballon d'Or")) },
  { id: 'kosovo', name: 'Vom Kosovo nach ganz oben', text: 'Werde als Spieler aus dem Kosovo Champions-League-Sieger.', nation: 'Kosovo', pos: 'FL', club: null, age: 17, rating: 52, test: () => S.titles.some(t => t.startsWith('Champions-League-Sieger')) },
  { id: 'iv', name: 'Torjäger in der Abwehr', text: 'Schieße als Innenverteidiger 100 Karrieretore.', nation: 'Spanien', pos: 'IV', club: null, age: 17, rating: 53, test: () => totals().goals >= 100 },
  { id: 'loyal', name: 'Ein Leben, ein Verein', text: 'Spiele die ganze Karriere beim FC St. Pauli und werde Vereinslegende.', nation: 'Deutschland', pos: 'ZM', club: 'FC St. Pauli', age: 17, rating: 55, academy: true, test: () => S.phase === 'retired' && S.clubsPlayed.length === 1 && S.clubsPlayed[0] === 'FC St. Pauli' && legends().length > 0 },
];
function doneChallenges() { try { return JSON.parse(localStorage.getItem(CH_KEY) || '[]'); } catch (e) { return []; } }
function startChallenge(ch) {
  pendingSlot = SLOT_COUNT;
  S = { phase: 'create', challenge: ch.id };
}
function applyChallenge(id) {
  const ch = CHALLENGES.find(c => c.id === id);
  S.challenge = { id: ch.id, text: ch.text, done: false };
  S.player.rating = ch.rating;
  S.peak = ch.rating;
  if (ch.club && !ch.academy) {
    S.player.age = ch.age;
    S.clubId = ch.club;
    S.youth = false;
    S.contract = { salary: salaryFor(ch.rating, ch.club, 'Rotation'), years: 3 };
    startSeason();
  } else if (ch.club) {
    S.academyOffers = [ch.club];
  }
}
function checkChallenge() {
  if (!S || !S.challenge || S.challenge.done) return;
  const ch = CHALLENGES.find(c => c.id === S.challenge.id);
  if (!ch || !ch.test()) return;
  S.challenge.done = true;
  const d = doneChallenges();
  if (!d.includes(ch.id)) try { localStorage.setItem(CH_KEY, JSON.stringify([...d, ch.id])); } catch (e) { /* ignorieren */ }
  toast(`🏅 Herausforderung geschafft: ${ch.name}!`);
  queueFx('fanfare', 'confetti');
}
function renderChallenges() {
  const done = doneChallenges();
  return `
  <section class="card">
    <details><summary>🎯 Herausforderungen · ${done.length} von ${CHALLENGES.length} geschafft</summary>
      <p class="muted small">Fertige Szenarien mit festem Start. Sie nutzen Spielstand ${SLOT_COUNT}.</p>
      <div class="offers">${CHALLENGES.map(ch => `
        <div class="offer"><div class="offer-info"><strong>${done.includes(ch.id) ? '✅ ' : ''}${esc(ch.name)}</strong><small>${esc(ch.text)}</small>
        <small>${esc(ch.nation)} · ${esc(POSITIONS[ch.pos].name)}${ch.club ? ` · ${esc(ch.club)}` : ''}</small></div>
        ${btn('Starten', () => { startChallenge(ch); render(); }, 'primary small')}</div>`).join('')}</div>
    </details>
  </section>`;
}

// ---------- Zufallskarriere ----------
function startRandomCareer() {
  let slot = 0;
  for (let n = 1; n <= SLOT_COUNT; n++) if (!readSlot(n)) { slot = n; break; }
  if (!slot) { toast('Alle Spielstände sind belegt. Lösche zuerst einen.'); return false; }
  pendingSlot = slot;
  const nat = pick(NATIONS).name;
  newGame(`${pick(FIRST_NAMES)} ${pick(SURNAMES)}`, nat, pick(Object.keys(POSITIONS)), randInt(1, 99), null, 'normal');
  applyOrigin(pick(Object.keys(ORIGINS)));
  return true;
}
