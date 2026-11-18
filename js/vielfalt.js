'use strict';

// Noch mehr Abwechslung: neue Ereignisse, neue Spielszenen, Geschichten über mehrere Saisons und Interviews

const lastSeasonTitles = () => S.titles.filter(t => t.includes(`(${seasonLabel(S.year - 1)})`));
const lastSeason = () => S.history[S.history.length - 1] || null;

// ---------- Neue Ereignisse ----------
const MORE_EVENTS = [
  {
    id: 'vStau', title: 'Der Bus steckt im Stau',
    cond: () => !S.youth,
    text: () => 'Eine Stunde vor dem Anpfiff steht der Mannschaftsbus im Stau. Das Stadion ist noch drei Kilometer entfernt.',
    options: [
      { label: 'Aussteigen und zum Stadion joggen', run: () => chance(0.6) ? 'Die Fans sehen dich durch die Straßen laufen und jubeln. Du kommst warm gelaufen an!' + mod({ form: 2, popularity: 5 }) : 'Du kommst völlig außer Atem an und spielst schwach.' + mod({ form: -2, popularity: 2 }) },
      { label: 'Ruhig bleiben und Musik hören', run: () => 'Der Anpfiff wird verschoben. Du gehst entspannt ins Spiel.' + mod({ form: 1 }) },
      { label: 'Ein Rollerfahrer nimmt dich mit', run: () => 'Das Video von dir auf dem Roller geht um die Welt. Der Trainer findet es weniger lustig.' + mod({ popularity: 7, trust: -3 }) },
    ],
  },
  {
    id: 'vSchnee', title: 'Schneechaos',
    cond: () => !S.youth,
    text: () => 'Über Nacht sind 20 Zentimeter Schnee gefallen. Das Spiel soll trotzdem stattfinden, der Ball ist orange.',
    options: [
      { label: 'Lange Bälle spielen', run: () => 'Auf dem tiefen Boden klappt das gut. Ihr gewinnt eine Schneeschlacht.' + mod({ form: 1, trust: 2 }) },
      { label: 'Trotzdem dribbeln', run: () => chance(0.4) ? 'Du tanzt durch den Schnee und triffst! Ein Bild für die Ewigkeit.' + mod({ goals: 1, popularity: 5, form: 2 }) : 'Du rutschst dauernd aus. Die Fans lachen.' + mod({ form: -2, popularity: -1 }) },
      { label: 'Mit den Fans Schnee schippen', run: () => 'Vor dem Spiel greifst du mit den Fans zur Schaufel. Sie werden das nie vergessen.' + mod({ popularity: 6, form: -1 }) },
    ],
  },
  {
    id: 'vNummer', title: 'Die Nummer der Legende',
    cond: () => !S.youth && !S.loan && S.player.age >= 23 && S.player.popularity >= 55,
    text: () => `${S.clubId} bietet dir die Rückennummer der größten Vereinslegende an. Sie wurde seit Jahren nicht mehr vergeben.`,
    options: [
      { label: 'Die Nummer annehmen', run: () => 'Die Trikots mit deinem Namen und der Legenden-Nummer sind sofort ausverkauft. Der Druck ist aber riesig.' + mod({ popularity: 8, form: -1, money: 0.1 }) },
      { label: 'Ablehnen: „Die gehört ihm allein.“', run: () => 'Die Fans finden deine Bescheidenheit großartig.' + mod({ popularity: 4, trust: 3 }) },
    ],
  },
  {
    id: 'vKabinenDJ', title: 'DJ in der Kabine',
    cond: () => !S.youth,
    text: () => 'Die Mannschaft streitet darüber, wer vor den Spielen die Musik aussucht. Alle schauen dich an.',
    options: [
      { label: 'Laute Partymusik', run: () => 'Die Kabine bebt. Die Stimmung ist großartig.' + mod({ trust: 3, form: 1 }) },
      { label: 'Die Lieder aus deiner Heimat', run: () => 'Am Anfang gucken alle komisch, nach drei Wochen singen alle mit.' + mod({ trust: 4, popularity: 2 }) },
      { label: 'Den Job an den Jüngsten abgeben', run: () => 'Der Neue spielt Kinderlieder. Alle lachen, das Eis ist gebrochen.' + mod({ trust: 2 }) },
    ],
  },
  {
    id: 'vZocken', title: 'Zocken bis 4 Uhr',
    cond: () => !S.youth && S.player.age <= 23,
    text: () => 'Ein Mitspieler fordert dich online zu einem Turnier in deinem Lieblings-Fußballspiel heraus. Morgen ist um 10 Uhr Training.',
    options: [
      { label: 'Bis zum Sieg weiterzocken', run: () => 'Du gewinnst das Turnier – und schläfst im Training fast ein.' + mod({ form: -2, trust: -2, popularity: 2 }) },
      { label: 'Nach einer Stunde ins Bett', run: () => 'Ausgeschlafen bist du im Training der Beste.' + mod({ form: 1, trust: 1 }) },
      { label: 'Das Turnier live streamen', run: () => 'Tausende schauen zu. Du verdienst sogar ein bisschen was.' + mod({ popularity: 5, money: 0.02, form: -1 }) },
    ],
  },
  {
    id: 'vSprache', title: 'Eine neue Sprache',
    cond: () => !S.youth && S.player.age >= 20,
    text: () => 'Viele deiner Mitspieler sprechen eine Sprache, die du kaum verstehst. Der Verein bietet dir einen Sprachkurs an.',
    options: [
      { label: 'Jeden Abend lernen', run: () => 'Nach ein paar Monaten machst du Witze in der Kabine. Alle mögen dich.' + mod({ trust: 5, form: -1, devBonus: 0.2 }) },
      { label: 'Fußball ist meine Sprache', run: () => 'Auf dem Platz klappt es. Neben dem Platz bleibst du etwas außen vor.' + mod({ trust: -2 }) },
    ],
  },
  {
    id: 'vMaskottchen', title: 'Ärger mit dem Maskottchen',
    cond: () => !S.youth,
    text: () => 'Beim Aufwärmen rennt dich das Vereinsmaskottchen aus Versehen um. Die Kameras haben alles gefilmt.',
    options: [
      { label: 'Lachen und das Maskottchen umarmen', run: () => 'Das Video wird ein Hit. Die Kinder im Stadion lieben dich.' + mod({ popularity: 6 }) },
      { label: 'Einen Revanche-Tanz aufführen', run: () => 'Ihr tanzt zusammen vor der Fankurve. Das Stadion tobt.' + mod({ popularity: 5, form: 1 }) },
      { label: 'Sich beschweren', run: () => 'Du wirkst humorlos. Das Maskottchen bekommt mehr Applaus als du.' + mod({ popularity: -4 }) },
    ],
  },
  {
    id: 'vRekord', title: 'Der Vereinsrekord wackelt',
    cond: () => !S.youth && POSITIONS[S.player.pos].group === 'att' && lastSeason() && lastSeason().goals >= 20,
    text: () => `Nach deinen ${lastSeason().goals} Toren letzte Saison schreiben alle Zeitungen: Du kannst den Torrekord von ${S.clubId} brechen.`,
    options: [
      { label: '„Der Rekord ist mein Ziel!“', run: () => chance(0.5) ? 'Der Ehrgeiz treibt dich an. Du triffst und triffst.' + mod({ goals: 3, form: 2, popularity: 4 }) : 'Der Druck lähmt dich. Du vergibst die einfachsten Chancen.' + mod({ form: -3 }) },
      { label: '„Mir ist nur die Mannschaft wichtig.“', run: () => 'Die Mitspieler spielen dir den Ball jetzt noch lieber zu.' + mod({ trust: 4, assists: 2 }) },
    ],
  },
  {
    id: 'vWunderheiler', title: 'Der Wunderheiler',
    cond: () => !S.youth && S.player.injuryProne >= 12,
    text: () => 'Ein Mann mit Kristallen und Räucherstäbchen verspricht dir: „Nach meiner Behandlung wirst du nie wieder verletzt.“ Er möchte 50.000 €.',
    options: [
      { label: 'Ausprobieren', run: () => 'Es riecht gut, sonst passiert nichts. Das Geld ist weg.' + mod({ money: -0.05, form: 1 }) },
      { label: 'Lieber zum Vereinsarzt', run: () => 'Der Arzt stellt dir ein Programm für die Muskeln zusammen.' + mod({ injuryProne: -3, trust: 1 }) },
    ],
  },
  {
    id: 'vFanReise', title: 'Die treuesten Fans',
    cond: () => !S.youth,
    text: () => '300 Fans sind 800 Kilometer im strömenden Regen zum Auswärtsspiel gereist. Ihr habt verloren.',
    options: [
      { label: 'Zu ihnen gehen und das Trikot verschenken', run: () => 'Die Fans singen trotz Niederlage deinen Namen.' + mod({ popularity: 6 }) },
      { label: 'Allen die Heimfahrt bezahlen', run: () => 'Das spricht sich im ganzen Land herum.' + mod({ popularity: 9, money: -0.06 }) },
      { label: 'Schnell in die Kabine', run: () => 'Die Fans fühlen sich im Stich gelassen.' + mod({ popularity: -4 }) },
    ],
  },
  {
    id: 'vWette', title: 'Eine Wette in der Kabine',
    cond: () => !S.youth,
    text: () => 'Ein Mitspieler wettet mit dir: Wer im nächsten Training weniger Tore im Abschlussspiel schießt, bekommt eine Glatze.',
    options: [
      { label: 'Die Wette annehmen', run: () => chance(0.55) ? 'Du gewinnst! Dein Mitspieler kommt mit Glatze zum Spiel. Die Kabine feiert.' + mod({ trust: 4, form: 1 }) : 'Du verlierst. Mit Glatze siehst du aus wie ein anderer Mensch – die Fans lieben es.' + mod({ popularity: 4, trust: 3 }) },
      { label: 'Ablehnen', run: () => '„Feigling!“, rufen alle. Aber deine Frisur sitzt.' + mod({ trust: -1 }) },
    ],
  },
  {
    id: 'vNeuerStar', title: 'Ein Star für deine Position',
    cond: () => !S.youth && !S.loan && S.player.age >= 21 && S.player.age <= 30,
    text: () => `${S.clubId} verpflichtet einen teuren Neuzugang – ausgerechnet auf deiner Position.`,
    options: [
      { label: 'Den Kampf annehmen', run: () => 'Du trainierst härter als je zuvor.' + mod({ devBonus: 0.6, form: 1, trust: -2 }) },
      { label: 'Ihn freundlich aufnehmen', run: () => 'Ihr werdet Freunde und spielt bald sogar zusammen.' + mod({ trust: 4, assists: 1 }) },
      { label: 'Beim Präsidenten beschweren', run: () => 'Der Präsident ist genervt, der Trainer auch.' + mod({ trust: -6, popularity: 2 }) },
    ],
  },
  {
    id: 'vAbschied', title: 'Dein Kumpel wird verkauft',
    cond: () => !S.youth,
    text: () => `Dein bester Freund im Team wechselt überraschend zu ${ctx().mateClub || (ctx().mateClub = pick(Object.keys(S.clubs).filter(n => n !== S.clubId)))}.`,
    options: [
      { label: 'Eine Abschiedsparty organisieren', run: () => 'Eine lange Nacht mit vielen Tränen. Die Mannschaft rückt zusammen.' + mod({ trust: 3, form: -1 }) },
      { label: 'Ein Abschiedsvideo für die Fans drehen', run: () => 'Das Video rührt alle. Dein Kumpel bedankt sich öffentlich.' + mod({ popularity: 5 }) },
    ],
  },
  {
    id: 'vStadionname', title: 'Ein neuer Stadionname',
    cond: () => !S.youth && !S.loan,
    text: () => 'Ein Sponsor will das Stadion umbenennen. Die Fans sind empört und bitten dich um Unterstützung.',
    options: [
      { label: 'Mit den Fans protestieren', run: () => 'Die Fans feiern dich. Der Verein ist weniger begeistert.' + mod({ popularity: 7, trust: -3 }) },
      { label: 'Neutral bleiben', run: () => 'Du hältst dich raus. Niemand ist sauer, niemand begeistert.' + mod({}) },
      { label: 'Den Sponsor unterstützen', run: () => 'Der Sponsor schickt dir ein Geschenk. Die Fans pfeifen.' + mod({ money: 0.15, popularity: -6 }) },
    ],
  },
  {
    id: 'vGolf', title: 'Das Golfturnier',
    cond: () => !S.youth && S.player.age >= 29,
    text: () => 'Ein Promi-Golfturnier lädt dich ein. Am selben Tag ist ein freiwilliges Zusatztraining.',
    options: [
      { label: 'Golf spielen', run: () => 'Ein schöner Tag mit vielen Fotos.' + mod({ popularity: 3, form: -1 }) },
      { label: 'Zusatztraining', run: () => 'Die jungen Spieler sehen, wie hart du noch arbeitest.' + mod({ trust: 3, devBonus: 0.3 }) },
    ],
  },
];

// ---------- Geschichten über mehrere Saisons ----------
const MORE_CHAINS = [
  // Der Jugendfreund
  {
    id: 'v2Freund1', title: 'Ein alter Freund aus der Jugend', weight: () => 1.2,
    cond: () => !S.youth && S.player.age >= 22 && !hasFlag('v2Freund') && !hasFlag('v2FreundDone'),
    text: () => 'Ein Freund, mit dem du früher im Jugendteam gespielt hast, meldet sich. Er hat es nicht zum Profi geschafft und sucht Arbeit.',
    options: [
      { label: 'Ihm einen Job im Nachwuchs besorgen', run: () => { setFlag('v2Freund', { how: 'job' }); return 'Er fängt als Co-Trainer der U12 an und ist dir unendlich dankbar.' + mod({ trust: 1 }); } },
      { label: 'Ihm Geld leihen', run: () => { setFlag('v2Freund', { how: 'money' }); return 'Er verspricht, alles zurückzuzahlen.' + mod({ money: -0.05 }); } },
      { label: 'Keine Zeit', run: () => { setFlag('v2Freund', { how: 'none' }); return 'Er legt traurig auf.' + mod({}); } },
    ],
  },
  {
    id: 'v2Freund2', title: 'Der Freund von damals', weight: () => 6,
    cond: () => hasFlag('v2Freund') && since('v2Freund') >= 3,
    text: () => flags().v2Freund.how === 'none'
      ? 'Dein Jugendfreund, dem du damals nicht geholfen hast, erzählt in einer Talkshow, wie arrogant du geworden bist.'
      : flags().v2Freund.how === 'job'
        ? 'Dein Jugendfreund ist jetzt ein gefeierter Nachwuchstrainer. In einem großen Interview sagt er: „Ohne ihn wäre ich nichts.“'
        : 'Dein Jugendfreund hat mit dem geliehenen Geld eine Fußballschule gegründet. Sie läuft super.',
    options: [
      {
        label: 'Ihn anrufen', run: () => {
          const how = flags().v2Freund.how; clearFlag('v2Freund'); setFlag('v2FreundDone');
          if (how === 'none') return 'Ihr sprecht euch aus. Er nimmt seine Worte zurück, aber ein bisschen bleibt hängen.' + mod({ popularity: -3 });
          if (how === 'job') return 'Er erzählt dir von einem 15-jährigen Talent – und ihr lacht wie früher.' + mod({ popularity: 6, trust: 3 });
          return 'Er zahlt dir das Geld doppelt zurück und macht dich zum Ehrenpaten der Schule.' + mod({ money: 0.1, popularity: 5 });
        },
      },
    ],
  },
  // Das Gerücht
  {
    id: 'v2Geruecht1', title: 'Ein Gerücht macht die Runde', weight: () => 1,
    cond: () => !S.youth && !S.loan && !hasFlag('v2Geruecht') && !hasFlag('v2GeruechtDone'),
    text: () => `Eine Zeitung schreibt, du hättest heimlich mit einem Rivalen von ${S.clubId} verhandelt. Es stimmt nicht.`,
    options: [
      { label: 'Sofort öffentlich dementieren', run: () => { setFlag('v2Geruecht', { how: 'deny', club: S.clubId }); return 'Du stellst dich vor die Kameras und sagst klar: „Ich bleibe!“' + mod({ trust: 2, popularity: 2 }); } },
      { label: 'Einfach ignorieren', run: () => { setFlag('v2Geruecht', { how: 'ignore', club: S.clubId }); return 'Du sagst nichts. Das Gerücht verschwindet – vorerst.' + mod({}); } },
      { label: 'Die Zeitung verklagen', run: () => { setFlag('v2Geruecht', { how: 'sue', club: S.clubId }); return 'Dein Anwalt schickt einen bösen Brief.' + mod({ money: -0.03 }); } },
    ],
  },
  {
    id: 'v2Geruecht2', title: 'Das Gerücht kehrt zurück', weight: () => 6,
    cond: () => hasFlag('v2Geruecht') && since('v2Geruecht') >= 1,
    text: () => {
      const g = flags().v2Geruecht;
      if (g.how === 'ignore') return 'Das alte Gerücht taucht wieder auf – diesmal mit „geheimen Fotos“. Die Fans hängen ein Banner auf: „Söldner!“';
      if (g.how === 'sue') return 'Das Gericht entscheidet: Die Zeitung muss sich bei dir entschuldigen und zahlen.';
      return 'Die Fans haben nicht vergessen, wie klar du dich damals bekannt hast.';
    },
    options: [
      {
        label: 'Weiter', run: () => {
          const g = flags().v2Geruecht; clearFlag('v2Geruecht'); setFlag('v2GeruechtDone');
          if (g.how === 'ignore') return 'Du musst dich jetzt doch erklären. Es dauert Wochen, bis die Fans dir wieder glauben.' + mod({ popularity: -6, form: -1 });
          if (g.how === 'sue') return 'Gerechtigkeit! Du spendest einen Teil der Summe.' + mod({ money: 0.08, popularity: 3 });
          return g.club === S.clubId ? 'Sie singen ein neues Lied über deine Treue.' + mod({ popularity: 6, trust: 3 }) : 'Deine alten Fans fühlen sich verraten – du hattest doch versprochen zu bleiben.' + mod({ popularity: -4 });
        },
      },
    ],
  },
  // Der Bolzplatz in der Heimat
  {
    id: 'v2Platz1', title: 'Der Bolzplatz deiner Kindheit', weight: () => 1,
    cond: () => !S.youth && S.money >= 0.5 && !hasFlag('v2Platz') && !hasFlag('v2PlatzDone'),
    text: () => 'Der Bolzplatz, auf dem du als Kind gespielt hast, ist kaputt. Die Stadt hat kein Geld. Ein neuer Platz würde 300.000 € kosten.',
    options: [
      { label: 'Den neuen Platz bezahlen', run: () => { setFlag('v2Platz'); return 'Die Bagger rollen an. In deiner Heimat bist du jetzt ein Held.' + mod({ money: -0.3, popularity: 4 }); } },
      { label: 'Eine Spendenaktion starten', run: () => { setFlag('v2Platz', { half: true }); return 'Deine Fans spenden fleißig. Es dauert, aber es geht voran.' + mod({ money: -0.1, popularity: 3 }); } },
      { label: 'Leider nicht', run: () => { setFlag('v2PlatzDone'); return 'Der Platz bleibt kaputt.' + mod({}); } },
    ],
  },
  {
    id: 'v2Platz2', title: 'Eröffnung des neuen Platzes', weight: () => 6,
    cond: () => hasFlag('v2Platz') && since('v2Platz') >= (flags().v2Platz.half ? 3 : 2),
    text: () => 'Der neue Platz in deiner Heimat ist fertig. Hunderte Kinder warten auf dich, und auf dem Eingangsschild steht dein Name.',
    options: [
      { label: 'Mit den Kindern kicken', run: () => { clearFlag('v2Platz'); setFlag('v2PlatzDone'); return 'Du spielst bis es dunkel wird. Einer der Jungs hat einen Schuss wie du früher.' + mod({ popularity: 10, form: 2 }); } },
      { label: 'Eine Rede halten', run: () => { clearFlag('v2Platz'); setFlag('v2PlatzDone'); return 'Deine Mutter weint in der ersten Reihe.' + mod({ popularity: 8, trust: 2 }); } },
    ],
  },
  // Die Wette mit dem Präsidenten
  {
    id: 'v2Wette1', title: 'Die Wette mit dem Präsidenten', weight: () => 1,
    cond: () => !S.youth && !S.loan && POSITIONS[S.player.pos].group === 'att' && S.player.rating >= 78 && !hasFlag('v2Wette') && !hasFlag('v2WetteDone'),
    text: () => `Der Präsident von ${S.clubId} lacht: „20 Tore in dieser Saison? Das schaffst du nie. Wenn doch, bekommst du ein Auto von mir.“`,
    options: [
      { label: '„Die Wette gilt!“', run: () => { setFlag('v2Wette', { club: S.clubId }); return 'Ihr schlagt ein. Die ganze Mannschaft ist Zeuge.' + mod({ form: 1 }); } },
      { label: '„Ich wette nicht.“', run: () => { setFlag('v2WetteDone'); return 'Der Präsident zuckt mit den Schultern.' + mod({}); } },
    ],
  },
  {
    id: 'v2Wette2', title: 'Die Wette wird eingelöst', weight: () => 8,
    cond: () => hasFlag('v2Wette') && since('v2Wette') >= 1,
    text: () => {
      const h = lastSeason(), won = h && h.club === flags().v2Wette.club && h.goals >= 20;
      return won ? `${h.goals} Tore! Der Präsident steht mit einem nagelneuen Sportwagen vor dem Trainingsgelände.` : `Nur ${h ? h.goals : 0} Tore. Der Präsident erinnert dich grinsend an die Wette: Du musst im Vereinsshop einen Tag lang an der Kasse arbeiten.`;
    },
    options: [
      {
        label: 'Weiter', run: () => {
          const h = lastSeason(), won = h && h.club === flags().v2Wette.club && h.goals >= 20;
          clearFlag('v2Wette'); setFlag('v2WetteDone');
          return won ? 'Die Fans feiern mit dir. Das Auto bekommt einen Ehrenplatz in deiner Garage.' + mod({ money: 0.2, popularity: 4 }) : 'Die Schlange vor der Kasse ist kilometerlang – alle wollen ein Selfie.' + mod({ popularity: 6 });
        },
      },
    ],
  },
];

// ---------- Interviews ----------
const IV_WEIGHT = () => 0.8;
const INTERVIEWS = [
  {
    id: 'ivZiel', title: '🎙️ Interview: Euer Saisonziel?', weight: IV_WEIGHT,
    cond: () => !S.youth && !hasFlag('ivZiel'),
    text: () => 'Reporter: „Was ist das Ziel für diese Saison?“',
    options: [
      { label: '„Wir holen einen Titel!“', run: () => { setFlag('ivZiel', { club: S.clubId }); return 'Die Schlagzeile ist groß. Jetzt musst du liefern.' + mod({ popularity: 4, form: 1 }); } },
      { label: '„Schritt für Schritt.“', run: () => 'Langweilig, aber der Trainer mag die Antwort.' + mod({ trust: 2 }) },
      { label: '„Fragen Sie den Trainer.“', run: () => 'Der Reporter guckt verwirrt.' + mod({}) },
    ],
  },
  {
    id: 'ivZiel2', title: '🎙️ Dein Versprechen von letzter Saison', weight: () => 6,
    cond: () => hasFlag('ivZiel') && since('ivZiel') >= 1,
    text: () => lastSeasonTitles().length
      ? 'Die Reporter erinnern an dein Versprechen: „Wir holen einen Titel!“ – und du hast Wort gehalten.'
      : 'Die Reporter erinnern an dein Versprechen: „Wir holen einen Titel!“ – daraus wurde nichts.',
    options: [
      {
        label: 'Antworten', run: () => {
          const ok = lastSeasonTitles().length > 0; clearFlag('ivZiel');
          return ok ? '„Ich halte, was ich verspreche.“ Die Fans lieben dich dafür.' + mod({ popularity: 6, trust: 2 }) : '„Diesmal klappt es.“ Viele glauben dir nicht mehr so richtig.' + mod({ popularity: -3 });
        },
      },
    ],
  },
  {
    id: 'ivBank', title: '🎙️ Interview: Zu oft auf der Bank?', weight: IV_WEIGHT,
    cond: () => !S.youth && S.season && S.season.role && S.season.role !== 'Stammspieler',
    text: () => 'Reporter: „Du sitzt oft nur auf der Bank. Bist du unzufrieden mit dem Trainer?“',
    options: [
      { label: '„Ich verdiene mehr Spielzeit.“', run: () => 'Die Fans geben dir recht, der Trainer liest es auch.' + mod({ popularity: 3, trust: -6 }) },
      { label: '„Ich arbeite weiter und warte auf meine Chance.“', run: () => 'Der Trainer klopft dir am nächsten Tag auf die Schulter.' + mod({ trust: 5 }) },
    ],
  },
  {
    id: 'ivRivale', title: '🎙️ Interview: Der Rivale', weight: IV_WEIGHT,
    cond: () => !S.youth,
    text: () => `Reporter: „Am Wochenende geht es gegen ${rivalName()}. Was sagst du zu denen?“`,
    options: [
      { label: '„Die schießen wir aus dem Stadion!“', run: () => chance(0.5) ? 'Ihr gewinnt hoch, und du triffst. Deine Worte werden legendär.' + mod({ goals: 1, popularity: 7, form: 2 }) : 'Ihr verliert. Die gegnerischen Fans zitieren dich hämisch.' + mod({ popularity: -4, form: -2 }) },
      { label: '„Großer Respekt vor dem Gegner.“', run: () => 'Ein faires Statement.' + mod({ trust: 2 }) },
    ],
  },
  {
    id: 'ivWechsel', title: '🎙️ Interview: Bleibst du?', weight: IV_WEIGHT,
    cond: () => !S.youth && !S.loan && !hasFlag('ivTreue') && S.player.popularity >= 40,
    text: () => `Reporter: „Es gibt Gerüchte über Angebote anderer Vereine. Bleibst du bei ${S.clubId}?“`,
    options: [
      { label: '„Ich bleibe für immer!“', run: () => { setFlag('ivTreue', { club: S.clubId }); return 'Die Fans sind außer sich vor Freude.' + mod({ popularity: 6, trust: 3 }); } },
      { label: '„Man weiß nie im Fußball.“', run: () => 'Ehrlich, aber die Fans sind verunsichert.' + mod({ popularity: -2 }) },
    ],
  },
  {
    id: 'ivWechsel2', title: '🎙️ „Für immer“?', weight: () => 8,
    cond: () => hasFlag('ivTreue') && flags().ivTreue.club !== S.clubId && !S.loan,
    text: () => `Die Fans von ${flags().ivTreue.club} haben ein altes Interview ausgegraben: „Ich bleibe für immer!“`,
    options: [
      { label: 'Sich entschuldigen', run: () => { clearFlag('ivTreue'); return 'Einige verzeihen dir, viele nicht.' + mod({ popularity: -2 }); } },
      { label: '„So ist Fußball.“', run: () => { clearFlag('ivTreue'); return 'Das Video mit deinem alten Versprechen geht viral.' + mod({ popularity: -6 }); } },
    ],
  },
  {
    id: 'ivKind', title: '🎙️ Der Kinderreporter', weight: IV_WEIGHT,
    cond: () => !S.youth,
    text: () => 'Ein 8-jähriger Junge darf für die Kinderzeitung ein Interview mit dir führen. Erste Frage: „Hast du auch mal Angst?“',
    options: [
      { label: 'Ehrlich antworten', run: () => '„Ja, vor jedem großen Spiel.“ Der Junge strahlt. Das Video rührt Millionen.' + mod({ popularity: 7 }) },
      { label: '„Niemals!“', run: () => 'Der Junge ist schwer beeindruckt.' + mod({ popularity: 3 }) },
      { label: 'Ihm den Ball schenken', run: () => 'Er drückt den Ball so fest, als wäre er aus Gold.' + mod({ popularity: 5, money: -0.001 }) },
    ],
  },
  {
    id: 'ivPleite', title: '🎙️ Interview nach der Pleite', weight: IV_WEIGHT,
    cond: () => !S.youth && S.player.form <= 0,
    text: () => 'Nach einer bitteren Niederlage hält dir ein Reporter das Mikrofon hin: „Was ist heute schiefgelaufen?“',
    options: [
      { label: '„Der Schiri hat uns verpfiffen!“', run: () => 'Der Verband ermittelt. Du zahlst eine Strafe.' + mod({ money: -0.03, popularity: 2, trust: -2 }) },
      { label: '„Ich war heute schlecht, das nehme ich auf mich.“', run: () => 'So viel Ehrlichkeit kommt gut an.' + mod({ trust: 4, popularity: 3 }) },
      { label: 'Wortlos weitergehen', run: () => 'Das Bild von dir, wie du am Reporter vorbeistapfst, ist überall.' + mod({ popularity: -3 }) },
    ],
  },
  {
    id: 'ivVorbild', title: '🎙️ Interview: Dein Vorbild', weight: IV_WEIGHT,
    cond: () => !S.youth,
    text: () => 'Reporter: „Wer war als Kind dein großes Vorbild?“',
    options: [
      { label: 'Deine Mutter', run: () => 'Deine Mutter ruft weinend an. Das ganze Land findet dich sympathisch.' + mod({ popularity: 5 }) },
      { label: 'Ein Weltstar von früher', run: () => 'Der Weltstar schickt dir ein signiertes Trikot.' + mod({ popularity: 3, form: 1 }) },
      { label: '„Ich selbst!“', run: () => 'Die einen lachen, die anderen schütteln den Kopf.' + mod({ popularity: -1, form: 1 }) },
    ],
  },
];

EVENTS.push(...MORE_EVENTS, ...MORE_CHAINS, ...INTERVIEWS);

// ---------- Neue Spielszenen ----------
SCENES.att.push(q => ({
  situation: 'Der Torwart pariert einen Schuss – der Abpraller landet genau vor deinen Füßen, fünf Meter vor dem Tor.',
  options: [
    { label: 'Sofort nachschießen', p: 0.45 + q * 0.3, kind: 'goal', okText: ['Abstauber! Du bist da, wo ein Stürmer sein muss.', 'Eiskalt nachgesetzt – drin!'], failText: 'Der Torwart rappelt sich auf und hält auch den Nachschuss.' },
    { label: 'Über den liegenden Torwart lupfen', p: 0.22 + q * 0.3, kind: 'goal', bonus: true, okText: 'Ein frecher Lupfer über den Torwart ins leere Tor!', failText: 'Der Lupfer gerät zu hoch und landet auf dem Tornetz.' },
    { label: 'Zum freien Mitspieler querlegen', p: 0.4 + q * 0.2, kind: 'assist', okText: 'Dein Mitspieler muss nur noch einschieben!', failText: 'Ein Verteidiger grätscht den Pass ins Aus.' },
  ],
}));
SCENES.att.push(q => ({
  situation: 'Die Flanke kommt hinter dich. Du stehst mit dem Rücken zum Tor, elf Meter vor dem Kasten.',
  options: [
    { label: 'Fallrückzieher!', p: 0.1 + q * 0.3, kind: 'goal', bonus: true, okText: ['Fallrückzieher – der Ball schlägt im Winkel ein! Das Stadion steht Kopf.', 'Ein Fallrückzieher wie aus dem Bilderbuch – Tor des Jahres!'], failText: 'Du triffst den Ball nicht richtig und landest unsanft auf dem Rücken.' },
    { label: 'Annehmen und aufdrehen', p: 0.22 + q * 0.28, kind: 'goal', okText: 'Ballannahme, Drehung, Schuss – drin!', failText: 'Bis du dich gedreht hast, ist der Verteidiger da.' },
    { label: 'Per Kopf ablegen', p: 0.38 + q * 0.22, kind: 'assist', okText: 'Dein Kopfball landet perfekt beim Mitspieler – Tor!', failText: 'Der Ball springt zum Gegner.' },
  ],
}));
SCENES.mid.push(q => ({
  situation: 'Du drehst dich im Mittelkreis auf und siehst eine riesige Lücke zwischen den Ketten des Gegners.',
  options: [
    { label: 'Tödlicher Steilpass', p: 0.35 + q * 0.28, kind: 'assist', okText: ['Der Pass schneidet die Abwehr auf – euer Stürmer trifft!', 'Ein Pass wie mit dem Lineal gezogen – Tor!'], failText: 'Der Pass ist einen Tick zu lang.' },
    { label: 'Selbst durchlaufen und schießen', p: 0.18 + q * 0.3, kind: 'goal', bonus: true, okText: 'Du läufst 40 Meter durch und versenkst den Ball im Eck!', failText: 'Der Torwart kommt raus und schnappt sich den Ball.' },
    { label: 'Sicher nach außen spielen', p: 0.85, kind: 'safe', okText: 'Ihr behaltet den Ball und kontrolliert das Spiel.', failText: 'Der Pass ist zu schwach – Konter und Gegentor!' },
  ],
}));
SCENES.mid.push(q => ({
  situation: 'Am Strafraum bietet dir dein Mitspieler einen Doppelpass an.',
  options: [
    { label: 'Doppelpass und abschließen', p: 0.28 + q * 0.28, kind: 'goal', okText: 'Doppelpass, Schuss, Tor – wie im Training!', failText: 'Der Rückpass kommt nicht an.' },
    { label: 'Mit der Hacke weiterleiten', p: 0.24 + q * 0.26, kind: 'assist', bonus: true, okText: 'Ein Hackentrick, der Mitspieler läuft durch – Tor! Was für eine Kombination.', failText: 'Die Hacke verspringt.' },
    { label: 'Aus der Distanz draufhalten', p: 0.14 + q * 0.26, kind: 'goal', okText: 'Der Ball schlägt aus 22 Metern unhaltbar ein!', failText: 'Der Ball fliegt weit über das Tor.' },
  ],
}));
SCENES.def.push(q => ({
  situation: 'Du bist der letzte Mann. Ein schneller Stürmer läuft allein auf dich zu.',
  options: [
    { label: 'Die Grätsche auspacken', p: 0.35 + q * 0.35, kind: 'stop', risky: true, okText: 'Eine saubere Grätsche – Ball gewonnen! Die Fans feiern dich wie ein Tor.', failText: 'Du kommst zu spät, der Stürmer trifft.' },
    { label: 'Stellen und auf Hilfe warten', p: 0.45 + q * 0.3, kind: 'stop', okText: 'Du lenkst ihn nach außen, bis die Hilfe kommt.', failText: 'Er zieht nach innen und trifft.' },
    { label: 'Abseitsfalle stellen', p: 0.4 + q * 0.25, kind: 'stop', okText: 'Abseits! Dein Timing war perfekt.', failText: 'Die Fahne bleibt unten – er läuft allein aufs Tor und trifft.' },
  ],
}));
SCENES.def.push(q => ({
  situation: 'Ecke für euch. Als großer Verteidiger gehst du mit nach vorne.',
  options: [
    { label: 'Wuchtiger Kopfball', p: 0.2 + q * 0.25, kind: 'goal', okText: ['Du steigst am höchsten und köpfst ein!', 'Kopfballtor! Der Verteidiger als Torjäger.'], failText: 'Der Kopfball geht knapp vorbei.' },
    { label: 'Ablegen für den Mitspieler', p: 0.3 + q * 0.22, kind: 'assist', okText: 'Dein Kopfball landet beim Mitspieler – der trifft!', failText: 'Der Torwart pflückt den Ball runter.' },
    { label: 'Mit Fallrückzieher versuchen', p: 0.06 + q * 0.18, kind: 'goal', bonus: true, okText: 'Ein Verteidiger trifft per Fallrückzieher! Das gab es noch nie.', failText: 'Der Fallrückzieher misslingt komplett.' },
  ],
}));
SCENES.gk.push(q => ({
  situation: 'Ein Stürmer bricht durch die Abwehr und läuft allein auf dich zu.',
  options: [
    { label: 'Rausstürmen und den Winkel verkürzen', p: 0.45 + q * 0.35, kind: 'stop', risky: true, okText: 'Du bist blitzschnell draußen und schnappst dir den Ball vor seinen Füßen!', failText: 'Er umkurvt dich und schiebt ins leere Tor.' },
    { label: 'Auf der Linie bleiben', p: 0.35 + q * 0.4, kind: 'stop', okText: 'Du bleibst stehen, bis er schießt – und hältst!', failText: 'Er schiebt den Ball überlegt ins Eck.' },
    { label: 'Groß machen wie ein Seestern', p: 0.42 + q * 0.33, kind: 'stop', okText: 'Mit gespreizten Armen und Beinen blockst du den Schuss!', failText: 'Der Ball geht zwischen deinen Beinen durch.' },
  ],
}));
SCENES.gk.push(q => ({
  situation: 'Ecke für euch – der Trainer winkt dich nach vorne! Wagst du es?',
  options: [
    { label: 'Mit nach vorne und köpfen', p: 0.05 + q * 0.12, kind: 'goal', bonus: true, okText: 'Der Torwart köpft ein! Das Stadion explodiert – unglaublich!', failText: 'Dein Kopfball geht vorbei.' },
    { label: 'Hinten bleiben', p: 0.8, kind: 'safe', okText: 'Du sicherst ab. Der Konter des Gegners verpufft.', failText: 'Ein Konter – der Gegner trifft noch einmal.' },
  ],
}));
