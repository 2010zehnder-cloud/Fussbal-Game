'use strict';

// Mehr Abwechslung: Geschichten über mehrere Saisons, Ereignisse je Karrierephase,
// Ereignisse in der Fußballwelt, Saison-Themen, seltene Momente und variierende Szenentexte

// ---------- Merker für Geschichten ----------
function flags() { if (!S.flags) S.flags = {}; return S.flags; }
function setFlag(k, data = {}) { flags()[k] = { year: S.year, ...data }; }
function clearFlag(k) { delete flags()[k]; }
const hasFlag = k => !!flags()[k];
const since = k => (hasFlag(k) ? S.year - flags()[k].year : -1);
const phase = () => (S.player.age <= 21 ? 'young' : S.player.age <= 29 ? 'prime' : 'veteran');

// ---------- Geschichten über mehrere Saisons ----------
const STORY_EVENTS = [
  // Der skeptische Trainer
  {
    id: 'storyCoach1', title: 'Ein Trainer, der nicht an dich glaubt', weight: () => 1.5,
    cond: () => !S.youth && !hasFlag('coachDoubt') && !hasFlag('coachDoubtDone') && S.player.trust < 55,
    text: () => `Der Trainer von ${S.clubId} sagt vor versammelter Mannschaft: „Ich weiß nicht, ob du gut genug für uns bist.“`,
    options: [
      { label: 'Es ihm beweisen', run: () => { setFlag('coachDoubt', { club: S.clubId }); return 'Du beißt die Zähne zusammen. Das wird ein langer Weg.' + mod({ devBonus: 0.6, form: -1 }); } },
      { label: 'Zurückschlagen: „Dann stellen Sie mich auf!“', run: () => { setFlag('coachDoubt', { club: S.clubId, angry: true }); return 'Die Kabine hält den Atem an. Der Trainer schweigt – vorerst.' + mod({ trust: -6, popularity: 3 }); } },
    ],
  },
  {
    id: 'storyCoach2', title: 'Ein überraschendes Gespräch', weight: () => 6,
    cond: () => hasFlag('coachDoubt') && since('coachDoubt') >= 1 && flags().coachDoubt.club === S.clubId,
    text: () => 'Der Trainer, der dich einst öffentlich kritisiert hat, bittet dich in sein Büro. „Ich lag falsch. Ich möchte, dass du ein Anführer dieser Mannschaft wirst.“',
    options: [
      { label: 'Die Hand reichen', run: () => { clearFlag('coachDoubt'); setFlag('coachDoubtDone'); return 'Aus dem größten Kritiker wird dein größter Förderer.' + mod({ trust: 20, form: 2 }); } },
      { label: '„Zu spät.“', run: () => { clearFlag('coachDoubt'); setFlag('coachDoubtDone'); return 'Du lässt ihn abblitzen. Stolz, aber das Verhältnis bleibt kühl.' + mod({ trust: -5, popularity: 2 }); } },
    ],
  },
  // Das geheime Video
  {
    id: 'storyVideo', title: 'Die Vergangenheit holt dich ein', weight: () => 5,
    cond: () => hasFlag('secretVideo') && since('secretVideo') >= 2,
    text: () => `Ein Video von der Party vor ${since('secretVideo')} Jahren taucht plötzlich im Internet auf. Damals hatte es niemand bemerkt …`,
    options: [
      { label: 'Offen dazu stehen', run: () => { clearFlag('secretVideo'); return '„Ja, das war ich. Ich war jung.“ Die meisten Fans finden das ehrlich.' + mod({ popularity: 2, trust: -2 }); } },
      { label: 'Anwälte einschalten', run: () => { clearFlag('secretVideo'); return 'Das Video verschwindet – aber erst, nachdem es Millionen gesehen haben.' + mod({ money: -0.03, popularity: -5 }); } },
    ],
  },
  // Der Schützling
  {
    id: 'storyMentee', title: 'Dein Schützling', weight: () => 5,
    cond: () => hasFlag('mentee') && since('mentee') >= 2 && !flags().mentee.done,
    text: () => `${flags().mentee.name}, den du vor ${since('mentee')} Jahren als Mentor betreut hast, gibt sein Debüt in der Nationalmannschaft – und widmet es dir.`,
    options: [
      { label: 'Gratulieren und stolz sein', run: () => { flags().mentee.done = true; return 'Die Presse schreibt über „den Mentor hinter dem neuen Star“.' + mod({ popularity: 6, form: 1 }); } },
      { label: 'Ihn zu deinem Verein holen wollen', run: () => { flags().mentee.done = true; return chance(0.5) ? 'Er kommt tatsächlich! Ihr spielt wieder zusammen.' + mod({ trust: 4, form: 2 }) : 'Er bleibt lieber bei seinem Verein, bedankt sich aber herzlich.' + mod({ popularity: 2 }); } },
    ],
  },
  // Der kleine Fan mit dem Schild
  {
    id: 'storyFanKid1', title: 'Das Schild auf der Tribüne', weight: () => 1.2,
    cond: () => !S.youth && !hasFlag('fanKid') && !hasFlag('fanKidDone'),
    text: () => 'Ein Junge hält ein Schild hoch: „Darf ich einmal mit dir trainieren?“ Die Kameras zoomen auf ihn.',
    options: [
      { label: 'Ihn zum Training einladen', run: () => { setFlag('fanKid', { name: pick(BROTHER_NAMES) }); return `Der Kleine heißt ${flags().fanKid.name} und hat richtig Talent!` + mod({ popularity: 5 }); } },
      { label: 'Ein Trikot zuwerfen', run: () => 'Er fängt es und strahlt.' + mod({ popularity: 2 }) },
    ],
  },
  {
    id: 'storyFanKid2', title: 'Wiedersehen mit dem Jungen vom Schild', weight: () => 6,
    cond: () => hasFlag('fanKid') && since('fanKid') >= 4,
    text: () => `${flags().fanKid.name}, der Junge mit dem Schild, ist jetzt Jugendspieler bei ${S.clubId} – und trainiert heute zum ersten Mal mit den Profis.`,
    options: [
      { label: 'Ihm eine Vorlage zum ersten Tor geben', run: () => { clearFlag('fanKid'); setFlag('fanKidDone'); return 'Im nächsten Spiel legst du ihm den Ball auf – Tor! Das ganze Land weint vor Rührung.' + mod({ popularity: 10, assists: 1 }); } },
      { label: 'Ihm Tipps geben', run: () => { clearFlag('fanKid'); setFlag('fanKidDone'); return 'Er hört dir zu, als wärst du ein Superheld.' + mod({ popularity: 4, trust: 2 }); } },
    ],
  },
  // Rückkehr zum Ex-Verein
  {
    id: 'storyExClub', title: 'Rückkehr an die alte Wirkungsstätte', weight: () => 4,
    cond: () => !S.youth && hasFlag('exClub') && flags().exClub.club !== S.clubId && S.clubs[flags().exClub.club] && S.clubs[flags().exClub.club].league === S.clubs[S.clubId].league,
    text: () => `Heute spielst du gegen ${flags().exClub.club} – den Verein, der dich damals nicht mehr wollte. Die Fans dort pfeifen schon beim Aufwärmen.`,
    options: [
      { label: 'Treffen und provokant jubeln', run: () => { clearFlag('exClub'); return chance(0.55) ? 'Du triffst und jubelst vor der alten Kurve. Süße Rache!' + mod({ goals: 1, popularity: 4, form: 2 }) : 'Du bleibst blass. Die Pfiffe werden zum Hohngelächter.' + mod({ form: -2, popularity: -2 }); } },
      { label: 'Respektvoll bleiben', run: () => { clearFlag('exClub'); return 'Nach dem Spiel applaudierst du den alten Fans. Sie applaudieren zurück.' + mod({ popularity: 5 }); } },
    ],
  },
];

// ---------- Ereignisse je Karrierephase ----------
const PHASE_EVENTS = [
  // jung
  {
    id: 'youngLicense', title: 'Der Führerschein', weight: () => 1.5,
    cond: () => phase() === 'young' && S.player.age >= 18 && !hasFlag('license'),
    text: () => 'Endlich 18 – die Führerscheinprüfung steht an. Der Termin liegt aber genau auf einem Trainingstag.',
    options: [
      { label: 'Training schwänzen', run: () => { setFlag('license'); return 'Bestanden! Aber der Trainer ist wenig begeistert.' + mod({ trust: -4, popularity: 1 }); } },
      { label: 'Prüfung verschieben', run: () => { setFlag('license'); return 'Du bestehst ein paar Wochen später. Der Trainer schätzt deine Disziplin.' + mod({ trust: 3 }); } },
    ],
  },
  {
    id: 'youngStarAirs', title: 'Starallüren?', weight: () => 1.5,
    cond: () => phase() === 'young' && !S.youth && S.player.popularity >= 35,
    text: () => 'Plötzlich kennt dich jeder. Du kommst mit Sonnenbrille und neuen Designer-Klamotten zum Training. Die älteren Spieler tuscheln.',
    options: [
      { label: 'Egal, ich bin jetzt wer', run: () => 'Die Kabine findet dich arrogant.' + mod({ popularity: 3, trust: -5 }) },
      { label: 'Bescheiden bleiben', run: () => 'Du trägst wieder Trainingsanzug. Die Alten nicken anerkennend.' + mod({ trust: 4 }) },
    ],
  },
  {
    id: 'youngU21', title: 'Einladung zur U21', weight: () => 1.5,
    cond: () => phase() === 'young' && !S.youth && S.player.rating >= 62 && S.player.caps === 0,
    text: () => `Der U21-Trainer von ${S.player.nation} lädt dich zu einem Lehrgang ein. Dein Verein hätte dich lieber im Training.`,
    options: [
      { label: 'Zusagen', run: () => 'Du sammelst internationale Erfahrung und lernst viel.' + mod({ devBonus: 0.6, popularity: 2 }) },
      { label: 'Beim Verein bleiben', run: () => 'Der Trainer rechnet dir das hoch an.' + mod({ trust: 4 }) },
    ],
  },
  // beste Jahre
  {
    id: 'primeIdolAsk', title: 'Ein Idol fragt um Rat', weight: () => 1.5,
    cond: () => phase() === 'prime' && S.player.rating >= 78,
    text: () => 'Eine Vereinslegende, deren Poster früher in deinem Kinderzimmer hing, ruft an: Ihr Sohn will Profi werden. Ob du ihm Tipps geben kannst?',
    options: [
      { label: 'Gerne helfen', run: () => 'Ein Kreis schließt sich. Du bist jetzt selbst ein Vorbild.' + mod({ popularity: 4, form: 1 }) },
      { label: 'Keine Zeit', run: () => 'Verständlich, aber ein bisschen schade.' + mod({}) },
    ],
  },
  {
    id: 'primeGlobalBrand', title: 'Das Gesicht einer Weltmarke', weight: () => 1.5,
    cond: () => phase() === 'prime' && S.player.popularity >= 60,
    text: () => 'Eine weltbekannte Sportmarke will dich als Hauptgesicht ihrer neuen Kampagne – mit eigenem Schuh.',
    options: [
      { label: 'Unterschreiben', run: () => 'Dein eigener Schuh ist in Minuten ausverkauft.' + mod({ money: dealSize() * 4, popularity: 6, form: -1 }) },
      { label: 'Lieber bei der kleinen Marke von früher bleiben', run: () => 'Die Fans lieben deine Treue.' + mod({ popularity: 5 }) },
    ],
  },
  {
    id: 'primeLeader', title: 'Der Anführer in der Krise', weight: () => 1.5,
    cond: () => phase() === 'prime' && !S.youth,
    text: () => 'Vier Niederlagen in Folge. Die Mannschaft schaut auf dich. Was tust du?',
    options: [
      { label: 'Eine Ansprache in der Kabine halten', run: () => chance(0.6) ? 'Deine Worte wirken – ihr gewinnt die nächsten drei Spiele!' + mod({ trust: 6, popularity: 3, form: 2 }) : 'Die Rede verpufft. Die Krise geht weiter.' + mod({ form: -1 }) },
      { label: 'Ein Teamessen organisieren', run: () => 'Pizza, Lachen, gute Stimmung. Die Mannschaft rückt zusammen.' + mod({ trust: 3, money: -0.005 }) },
    ],
  },
  // Veteran
  {
    id: 'vetPainkiller', title: 'Die Spritze', weight: () => 1.5,
    cond: () => phase() === 'veteran' && !S.youth,
    text: () => 'Dein Knie schmerzt vor dem wichtigen Spiel. Der Arzt bietet dir eine Schmerzspritze an.',
    options: [
      { label: 'Spritze nehmen und spielen', run: () => chance(0.7) ? 'Du spielst schmerzfrei und überragend.' + mod({ form: 2, trust: 3 }) : 'Das Knie meldet sich danach umso heftiger.' + mod({ injuredGames: 6, injuryProne: 3 }) },
      { label: 'Aussetzen', run: () => 'Du gönnst deinem Körper die Pause.' + mod({ injuredGames: 1, injuryProne: -2 }) },
    ],
  },
  {
    id: 'vetLicense', title: 'Trainerschein nebenbei?', weight: () => 1.5,
    cond: () => phase() === 'veteran' && !hasFlag('coachPrep'),
    text: () => 'Der Verband bietet dir an, schon jetzt mit dem Trainerschein zu beginnen – abends nach dem Training.',
    options: [
      { label: 'Anmelden', run: () => { setFlag('coachPrep'); return 'Du büffelst Taktik. Später als Trainer wird dir das helfen.' + mod({ form: -1 }); } },
      { label: 'Erst mal weiterspielen', run: () => 'Du konzentrierst dich voll aufs Spielen.' + mod({ form: 1 }) },
    ],
  },
  {
    id: 'vetApplause', title: 'Applaus vom Gegner', weight: () => 1.2,
    cond: () => phase() === 'veteran' && S.player.age >= 33 && S.player.popularity >= 50,
    text: () => 'Bei deiner Auswechslung im Auswärtsspiel stehen plötzlich auch die gegnerischen Fans auf und applaudieren.',
    options: [
      { label: 'Zurückwinken', run: () => 'Gänsehaut. Solche Momente vergisst man nie.' + mod({ popularity: 5, form: 2 }) },
      { label: 'Trikot in die Kurve werfen', run: () => 'Ein Fan fängt es und weint vor Glück.' + mod({ popularity: 7 }) },
    ],
  },
];

// ---------- Saison-Themen ----------
const SEASON_THEMES = [
  { id: 'farewell', title: 'Vielleicht die letzte Saison', text: 'Mit über 34 fragen alle: Ist das deine Abschiedstour?', cond: () => S.player.age >= 34 },
  { id: 'comeback', title: 'Comeback-Saison', text: 'Nach der langen Verletzung willst du allen zeigen, dass du zurück bist.', cond: () => hasFlag('comeback') && since('comeback') <= 1 },
  { id: 'tournament', title: S => (((S.year + 1) % 4 === 2) ? 'WM-Jahr' : 'EM-Jahr'), text: 'Im Sommer steht ein großes Turnier an. Spiel dich in den Kader!', cond: () => (S.year + 1) % 2 === 0 && S.player.age >= 19 && !S.natRetired && S.player.rating >= nation().str - 12 },
  { id: 'contract', title: 'Vertragsjahr', text: 'Dein Vertrag läuft aus. Jetzt zählt jede Leistung – die ganze Liga schaut zu.', cond: () => S.contract.years === 1 && !S.loan },
  { id: 'newstart', title: 'Neuanfang', text: 'Neuer Verein, neue Stadt, neue Mitspieler. Alle Augen sind auf dich gerichtet.', cond: () => S.history.length > 0 && S.history[S.history.length - 1].club !== S.clubId },
  { id: 'newcoach', title: 'Neuer Trainer', text: 'Ein neuer Trainer übernimmt. Alle starten bei null.', cond: () => chance(0.18) },
];
function pickTheme() {
  if (S.youth) return null;
  const th = SEASON_THEMES.find(t => t.cond());
  if (!th) return null;
  if (th.id === 'newcoach') S.player.trust = 50;
  if (th.id === 'comeback') S.season.devBonus += 0.5;
  return th.id;
}
const themeOf = id => SEASON_THEMES.find(t => t.id === id);
function renderTheme() {
  const id = S.season && S.season.theme;
  if (!id) return '';
  const t = themeOf(id);
  const title = typeof t.title === 'function' ? t.title(S) : t.title;
  return `<div class="theme"><b>📌 ${esc(title)}</b><span>${esc(t.text)}</span></div>`;
}
function themeSeasonEnd(res) {
  const id = S.season.theme;
  if (id === 'contract' && res.note !== null && res.note <= 2.8) { S.season.transferBoost = (S.season.transferBoost || 0) + 1; res.lines.push('📌 Starkes Vertragsjahr – die Interessenten stehen Schlange.'); }
  if (id === 'farewell') S.player.popularity = clamp(S.player.popularity + 4, 0, 100);
  if (S.season.injuredGames > 12) setFlag('comeback');
}
const THEME_EVENTS = [
  {
    id: 'themeTournament', title: 'Der Bundestrainer auf der Tribüne', weight: () => 8,
    cond: () => S.season.theme === 'tournament',
    text: () => `Der Nationaltrainer von ${S.player.nation} sitzt heute im Stadion. Es geht um einen Platz im Turnierkader.`,
    options: [
      { label: 'Alles riskieren und glänzen wollen', run: () => chance(0.55) ? 'Du spielst überragend. Der Nationaltrainer macht sich Notizen.' + mod({ form: 3, popularity: 3 }) : 'Du willst zu viel und machst Fehler.' + mod({ form: -2 }) },
      { label: 'Sicher und mannschaftsdienlich spielen', run: () => 'Solide Leistung ohne Fehler. Das wird registriert.' + mod({ form: 1, trust: 2 }) },
    ],
  },
  {
    id: 'themeContract', title: 'Pokern ums Gehalt', weight: () => 8,
    cond: () => S.season.theme === 'contract',
    text: () => 'Der Sportdirektor will schon jetzt verlängern – zu den alten Bedingungen.',
    options: [
      { label: 'Abwarten und pokern', run: () => 'Du lässt dir alle Optionen offen. Der Verein ist nervös.' + mod({ trust: -3 }) },
      { label: 'Treue zeigen', run: () => { S.contract.years += 2; return 'Du verlängerst vorzeitig um zwei Jahre. Die Fans feiern dich.' + mod({ trust: 6, popularity: 5 }); } },
    ],
  },
  {
    id: 'themeNewstart', title: 'Der erste Eindruck', weight: () => 8,
    cond: () => S.season.theme === 'newstart',
    text: () => `Erster Tag bei ${S.clubId}. Beim Einstand musst du traditionell vor der Mannschaft ein Lied singen.`,
    options: [
      { label: 'Laut und schief singen', run: () => 'Alle lachen – mit dir, nicht über dich. Du bist sofort angekommen.' + mod({ trust: 4, popularity: 2 }) },
      { label: 'Verweigern', run: () => 'Die Kabine findet das uncool.' + mod({ trust: -4 }) },
    ],
  },
  {
    id: 'themeComeback', title: 'Das erste Spiel nach der Verletzung', weight: () => 8,
    cond: () => S.season.theme === 'comeback',
    text: () => 'Monate hast du dafür gekämpft. Heute stehst du wieder im Kader. Das Publikum singt deinen Namen.',
    options: [
      { label: 'Volles Tempo von Anfang an', run: () => chance(0.6) ? 'Was für ein Comeback – du bist sofort wieder der Alte!' + mod({ form: 3, popularity: 4 }) : 'Der Körper braucht noch Zeit. Ein leichter Rückschlag.' + mod({ injuredGames: 3 }) },
      { label: 'Langsam reinkommen', run: () => 'Schritt für Schritt findest du zurück.' + mod({ form: 1, injuryProne: -1 }) },
    ],
  },
  {
    id: 'themeFarewell', title: 'Die Frage aller Fragen', weight: () => 8,
    cond: () => S.season.theme === 'farewell',
    text: () => 'Bei der Pressekonferenz fragt ein Reporter: „Ist das Ihre letzte Saison?“',
    options: [
      { label: '„Ja – ich will noch einmal alles geben.“', run: () => 'Jedes Stadion bereitet dir jetzt einen besonderen Empfang.' + mod({ popularity: 6, form: 2 }) },
      { label: '„Ich spiele, bis die Beine nicht mehr wollen!“', run: () => 'Die Fans lieben deinen Ehrgeiz.' + mod({ popularity: 3, devBonus: 0.4 }) },
    ],
  },
  {
    id: 'themeNewcoach', title: 'Der neue Trainer testet dich', weight: () => 8,
    cond: () => S.season.theme === 'newcoach',
    text: () => 'Der neue Trainer lässt dich im Training auf einer ungewohnten Position spielen, um dich zu testen.',
    options: [
      { label: 'Ohne Murren mitmachen', run: () => 'Er notiert sich deinen Einsatz.' + mod({ trust: 8 }) },
      { label: 'Nachfragen, warum', run: () => 'Er erklärt seine Idee. Ihr versteht euch.' + mod({ trust: 4, devBonus: 0.2 }) },
    ],
  },
];

// ---------- Seltene Momente ----------
const RARE_EVENTS = [
  {
    id: 'rareSuperclub', title: '✨ Der Anruf', rare: true, weight: () => 0.06,
    cond: () => !S.youth && !S.loan && S.player.rating >= 74 && !hasFlag('superOffer'),
    text: () => { const c = superclub(); return `Spät abends klingelt dein Handy. Am Apparat: der Präsident von ${c}. „Wir wollen dich. Diesen Sommer. Egal, was es kostet.“`; },
    options: [
      { label: '„Ich bin bereit.“', run: () => { setFlag('superOffer', { club: superclub() }); return 'Im Sommer wird dir ein Angebot vorliegen, das du nie vergessen wirst.' + mod({ popularity: 5 }); } },
      { label: '„Mein Herz gehört meinem Verein.“', run: () => 'Die Geschichte sickert durch. Deine Fans lieben dich dafür.' + mod({ popularity: 8, trust: 8 }) },
    ],
  },
  {
    id: 'rareIdol', title: '✨ Dein Kindheitsidol', rare: true, weight: () => 0.06,
    cond: () => !S.youth,
    text: () => 'Auf einer Gala sitzt plötzlich dein großes Kindheitsidol neben dir – und sagt: „Ich verfolge deine Karriere. Du erinnerst mich an mich selbst.“',
    options: [
      { label: 'Um ein Foto bitten', run: () => 'Das Foto wird dein Handy-Hintergrund. Für immer.' + mod({ form: 4, popularity: 3 }) },
      { label: 'Ganz cool bleiben', run: () => 'Innerlich explodierst du vor Freude.' + mod({ form: 3 }) },
    ],
  },
  {
    id: 'rareLottery', title: '✨ Lottoglück', rare: true, weight: () => 0.04,
    cond: () => true,
    text: () => 'Deine Oma hat für dich einen Lottoschein ausgefüllt – mit deiner Rückennummer. Volltreffer!',
    options: [
      { label: 'Alles für die Familie', run: () => 'Deine Familie muss sich nie wieder Sorgen machen.' + mod({ money: 2, popularity: 4 }) },
      { label: 'Für einen guten Zweck spenden', run: () => 'Ein ganzes Kinderkrankenhaus wird davon gebaut.' + mod({ popularity: 15 }) },
    ],
  },
  {
    id: 'rareStateDinner', title: '✨ Einladung ins Präsidentenamt', rare: true, weight: () => 0.05,
    cond: () => S.titles.length >= 3,
    text: () => `Das Staatsoberhaupt von ${S.player.nation} lädt dich zu einem Abendessen ein, um dir einen Orden zu verleihen.`,
    options: [
      { label: 'Im Anzug hingehen', run: () => { S.awards.push(`Verdienstorden (${seasonLabel(S.year)})`); return 'Du bekommst den Verdienstorden. Deine Eltern sind unfassbar stolz.' + mod({ popularity: 8 }); } },
      { label: 'Im Trainingsanzug hingehen', run: () => { S.awards.push(`Verdienstorden (${seasonLabel(S.year)})`); return 'Ein legendärer Auftritt. Das Internet feiert dich.' + mod({ popularity: 10, trust: -2 }); } },
    ],
  },
  {
    id: 'rareStreet', title: '✨ Bolzplatz-Legende', rare: true, weight: () => 0.06,
    cond: () => !S.youth && S.player.popularity >= 30,
    text: () => 'Inkognito spielst du abends auf dem Bolzplatz deiner Kindheit mit. Ein Kind erkennt dich – und filmt.',
    options: [
      { label: 'Weiterspielen, als wäre nichts', run: () => 'Das Video geht um die Welt: „Weltstar kickt mit Kindern“.' + mod({ popularity: 10, form: 2 }) },
      { label: 'Autogramme für alle', run: () => 'Am Ende stehen 300 Kinder Schlange.' + mod({ popularity: 7 }) },
    ],
  },
];
function superclub() {
  if (ctx().superclub) return ctx().superclub;
  const top = Object.keys(S.clubs).filter(n => n !== S.clubId).sort((a, b) => clubStr(b) - clubStr(a)).slice(0, 6);
  ctx().superclub = pick(top);
  return ctx().superclub;
}
// Das versprochene Angebot im Transferfenster
function superOffer(offers, newOffer) {
  const f = flags().superOffer;
  if (!f || f.club === S.clubId) { clearFlag('superOffer'); return; }
  const o = newOffer(f.club);
  o.salary *= 1.5; o.signing *= 2; o.dream = o.dream || f.club === S.dreamClub; o.superclub = true;
  offers.push(o);
  clearFlag('superOffer');
}

EVENTS.push(...STORY_EVENTS, ...PHASE_EVENTS, ...THEME_EVENTS, ...RARE_EVENTS);

// Gewicht eines Ereignisses: schon erlebte Ereignisse werden seltener
function eventWeight(e) {
  const base = e.weight ? e.weight() : 1;
  const seen = (S.seenEvents && S.seenEvents[e.id]) || 0;
  return base / (1 + seen * 1.5);
}
function markSeen(e) {
  S.seenEvents = S.seenEvents || {};
  S.seenEvents[e.id] = (S.seenEvents[e.id] || 0) + 1;
  if (e.rare) { S.rareSeen = (S.rareSeen || 0) + 1; toast('✨ Ein seltener Moment!'); queueFx('chime'); }
}

// ---------- Ereignisse in der Fußballwelt ----------
const WORLD_EVENTS = [
  {
    id: 'investor', pick: () => Object.keys(S.clubs).filter(n => clubStr(n) >= 58 && clubStr(n) <= 72),
    apply: c => { S.clubs[c].base = Math.min(90, S.clubs[c].base + 12); return `💰 Ein Milliardär übernimmt ${c} und kündigt an, den Verein an die Spitze zu führen.`; },
    mine: () => { S.contract.salary *= 1.3; return 'Der neue Besitzer erhöht sofort dein Gehalt um 30 %!'; },
  },
  {
    id: 'bankrupt', pick: () => Object.keys(S.clubs).filter(n => clubStr(n) >= 64 && clubStr(n) <= 80),
    apply: c => { S.clubs[c].base = Math.max(45, S.clubs[c].base - 10); return `📉 ${c} ist finanziell am Ende und muss seine besten Spieler verkaufen.`; },
    mine: () => { S.player.trust = clamp(S.player.trust + 10, 0, 100); return 'Bei deinem Verein bricht Chaos aus – aber du bist jetzt wichtiger denn je.'; },
  },
  {
    id: 'wonderCoach', pick: () => Object.keys(S.clubs).filter(n => clubStr(n) >= 62 && clubStr(n) <= 78),
    apply: c => { S.clubs[c].base = Math.min(92, S.clubs[c].base + 5); return `🧠 Ein 33-jähriges Trainer-Wunderkind übernimmt ${c}. Experten sind begeistert.`; },
    mine: () => { S.season.devBonus += 0.5; return 'Unter dem jungen Trainer lernst du taktisch enorm dazu.'; },
  },
  {
    id: 'stadium', pick: () => Object.keys(S.clubs).filter(n => clubStr(n) >= 70),
    apply: c => { S.clubs[c].base = Math.max(45, S.clubs[c].base - 3); return `🏗️ ${c} baut ein neues Stadion – die Kosten explodieren, gespart wird am Kader.`; },
    mine: () => 'Bei euch wird gebaut. Das neue Stadion wird spektakulär.',
  },
  {
    id: 'legendBack', pick: () => Object.keys(S.clubs).filter(n => clubStr(n) >= 65),
    apply: c => `🔙 Eine Vereinslegende kehrt als Sportdirektor zu ${c} zurück.`,
    mine: () => { S.player.popularity = clamp(S.player.popularity + 2, 0, 100); return 'Die Legende lobt dich öffentlich als Zukunft des Vereins.'; },
  },
  {
    id: 'rules', pick: () => [null],
    apply: () => pick(['📜 Neue Regel: Zeitspiel wird ab sofort mit Gelb-Rot bestraft.', '📜 Der Videobeweis bekommt eine neue Abseits-Technik.', '📜 Die Spielzeit wird künftig nach Netto-Minuten gemessen – in der Testphase.', '📜 Ab sofort dürfen Trainer eine „Videobeweis-Challenge“ pro Halbzeit nutzen.']),
  },
  {
    id: 'superleague', pick: () => [null],
    apply: () => { Object.keys(S.clubs).filter(n => clubStr(n) >= 86).forEach(n => { S.clubs[n].base += 1; }); return '🌍 Die Topklubs Europas planen angeblich eine Superliga. Fans protestieren in allen Stadien.'; },
  },
];
function worldSeasonEvents(res) {
  if (!chance(0.6)) return;
  const ev = pick(WORLD_EVENTS);
  const cands = ev.pick();
  if (!cands.length) return;
  const c = pick(cands);
  let line = ev.apply(c);
  if (c && c === S.clubId && ev.mine) line += ` ${ev.mine()}`;
  res.lines.push(line);
  S.worldNews = [line, ...(S.worldNews || [])].slice(0, 4);
}
function renderWorldNews() {
  if (!S.worldNews || !S.worldNews.length) return '';
  return `<div class="worldnews"><b>🌍 Neues aus der Fußballwelt</b><ul>${S.worldNews.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
}

// ---------- Abwechslung in Spielszenen ----------
const ATMOSPHERE = [
  'Es regnet in Strömen, der Rasen ist tief.', 'Flutlicht, leichter Nebel zieht übers Feld.', 'Bei 34 Grad kleben die Trikots am Körper.',
  'Schneeflocken tanzen im Scheinwerferlicht.', 'Das Stadion ist ausverkauft, die Stimmung kocht.', 'Die Fans pfeifen bei jedem Ballkontakt des Gegners.',
  'Ein heftiger Wind weht durchs Stadion.', 'Die eigene Kurve singt seit Minuten ohne Pause.', 'Es ist ein zähes, nervöses Spiel.',
];
function sceneIntro(a, b) {
  const score = a < b ? 'Ihr liegt zurück.' : a > b ? 'Ihr führt knapp.' : 'Es steht unentschieden.';
  return `${pick(ATMOSPHERE)} ${score} `;
}
const GOAL_CRIES = ['TOOOR!', 'DRIN!', 'JAAAA!', 'WAS FÜR EIN TOR!', 'Das Netz zappelt!', 'TOR, TOR, TOR!'];
const CROWD_LINES = [' Das Stadion bebt!', ' Die Fans flippen völlig aus!', ' Die Kommentatoren überschlagen sich!', ' Gänsehaut im ganzen Stadion!'];
const goalCry = () => pick(GOAL_CRIES);
const crowdLine = () => pick(CROWD_LINES);
const pickText = t => (Array.isArray(t) ? pick(t) : t);

// Zusätzliche Szenen
SCENES.att.push(q => ({
  situation: 'Konter! Ihr lauft zu zweit auf einen einzigen Verteidiger zu.',
  options: [
    { label: 'Selbst abschließen', p: 0.25 + q * 0.3, kind: 'goal', okText: ['Du ziehst ab und versenkst den Ball im kurzen Eck!', 'Eiskalt vorbei am Torwart – drin!'], failText: 'Der Verteidiger wirft sich in den Schuss.' },
    { label: 'Im letzten Moment querlegen', p: 0.4 + q * 0.25, kind: 'assist', okText: 'Perfektes Timing – dein Mitspieler schiebt ins leere Tor!', failText: 'Der Verteidiger ahnt den Pass und fängt ihn ab.' },
    { label: 'Den Verteidiger tunneln', p: 0.15 + q * 0.3, kind: 'goal', bonus: true, okText: 'Durch die Beine des Verteidigers und dann ins Tor – unfassbar frech!', failText: 'Der Tunnel misslingt, der Ball ist weg.' },
  ],
}));
SCENES.mid.push(q => ({
  situation: 'Ecke für euch! Du trittst sie.',
  options: [
    { label: 'Scharf auf den ersten Pfosten', p: 0.28 + q * 0.25, kind: 'assist', okText: 'Dein Mitspieler verlängert per Kopf ins Tor!', failText: 'Der erste Verteidiger köpft die Ecke weg.' },
    { label: 'Hoch an den zweiten Pfosten', p: 0.25 + q * 0.25, kind: 'assist', okText: 'Der Innenverteidiger steigt hoch – Kopfballtor!', failText: 'Der Torwart pflückt den Ball sicher herunter.' },
    { label: 'Direkt aufs Tor zirkeln', p: 0.05 + q * 0.12, kind: 'goal', bonus: true, okText: 'Eine direkt verwandelte Ecke – ein Tor für die Ewigkeit!', failText: 'Der Ball landet auf dem Tornetz.' },
  ],
}));
SCENES.def.push(q => ({
  situation: 'Du bekommst den Ball tief in der eigenen Hälfte, zwei Gegner laufen dich an.',
  options: [
    { label: 'Langer Ball nach vorne', p: 0.4 + q * 0.25, kind: 'assist', okText: 'Dein langer Ball fliegt 60 Meter genau in den Lauf des Stürmers – Tor!', failText: 'Der lange Ball landet im Aus.' },
    { label: 'Ausspielen und aufbauen', p: 0.45 + q * 0.3, kind: 'safe', okText: 'Du lässt beide Gegner mit einer Drehung stehen. Die Fans jubeln.', failText: 'Ballverlust vor dem eigenen Strafraum – Gegentor!' },
    { label: 'Zurück zum Torwart', p: 0.85, kind: 'safe', okText: 'Sicher ist sicher. Euer Torwart schlägt den Ball weit weg.', failText: 'Der Rückpass ist zu kurz – der Stürmer spritzt dazwischen und trifft!' },
  ],
}));
SCENES.gk.push(q => ({
  situation: 'Ein Fernschuss aus 30 Metern – der Ball flattert gefährlich.',
  options: [
    { label: 'Fangen', p: 0.4 + q * 0.4, kind: 'stop', okText: 'Du hältst den flatternden Ball sicher fest.', failText: 'Der Ball rutscht dir durch die Hände ins Tor.' },
    { label: 'Zur Seite fausten', p: 0.55 + q * 0.3, kind: 'stop', okText: 'Du faustest den Ball zur Seite weg – Gefahr gebannt.', failText: 'Die Faust erwischt den Ball nicht richtig, er trudelt ins Tor.' },
    { label: 'Über die Latte lenken', p: 0.45 + q * 0.35, kind: 'stop', risky: true, okText: 'Mit den Fingerspitzen über die Latte – Parade des Jahres!', failText: 'Du kommst nicht mehr ran, der Ball senkt sich unter die Latte.' },
  ],
}));

// Seltene Traumtor-Szene
const WONDER_SCENE = q => ({
  situation: '✨ Der Ball springt dir an der Mittellinie vor die Füße. Der gegnerische Torwart steht weit vor seinem Tor …',
  options: [
    { label: 'Von der Mittellinie schießen', p: 0.18 + q * 0.2, kind: 'goal', bonus: true, okText: 'Der Ball fliegt 50 Meter über den zurückhechtenden Torwart ins Netz! Das Tor des Jahrhunderts!', failText: 'Knapp drüber! Aber allein der Versuch war spektakulär.' },
    { label: 'Losdribbeln', p: 0.25 + q * 0.3, kind: 'goal', okText: 'Du läufst übers halbe Feld und schiebst überlegt ein!', failText: 'Ein Verteidiger holt dich mit einem Sprint noch ein.' },
    { label: 'Ballbesitz sichern', p: 0.9, kind: 'safe', okText: 'Vernünftig. Ihr behaltet den Ball.', failText: 'Ballverlust – und der Gegner kontert erfolgreich.' },
  ],
});

function renderPhaseTag() {
  const p = phase();
  return { young: 'Junges Talent', prime: 'Beste Jahre', veteran: 'Routinier' }[p];
}
