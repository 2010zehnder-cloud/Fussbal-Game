'use strict';

// Ereignisse während der Saison. Jede Option gibt einen Ergebnistext zurück;
// mod() wendet die Werteänderungen an und hängt sie lesbar an.
const EVENTS = [
  {
    id: 'extraTraining', title: 'Zusatzschichten',
    text: () => 'Der Co-Trainer bietet dir individuelles Zusatztraining an – auch an deinen freien Tagen.',
    options: [
      { label: 'Klar, ich bin dabei', run: () => 'Du schuftest, während die anderen frei haben. Der Trainer bemerkt es.' + mod({ devBonus: 1.2, trust: 3, injuryProne: 2 }) },
      { label: 'Lieber regenerieren', run: () => 'Du gönnst deinem Körper Ruhe und startest frisch in die nächsten Wochen.' + mod({ form: 1, injuryProne: -1 }) },
    ],
  },
  {
    id: 'party', title: 'Party-Einladung',
    text: () => `Zwei Tage vor dem Spiel gegen ${rivalName()} lädt dich ein Teamkollege zu seiner Geburtstagsparty ein.`,
    options: [
      {
        label: 'Hingehen', run: () => chance(0.5)
          ? 'Ein lustiger Abend – der Teamgeist ist super, und niemand hat etwas mitbekommen.' + mod({ popularity: 2, form: 1 })
          : 'Fotos von dir um 3 Uhr morgens landen im Netz. Der Trainer ist stinksauer.' + mod({ form: -2, trust: -7, popularity: -3 }),
      },
      { label: 'Absagen und früh schlafen', run: () => 'Du bist topfit und hellwach im Training.' + mod({ form: 2, trust: 1 }) },
    ],
  },
  {
    id: 'nutrition', title: 'Ernährungsberater',
    text: () => 'Ein bekannter Ernährungsberater bietet dir einen persönlichen Plan an. Teuer, aber viele Profis schwören darauf.',
    options: [
      { label: 'Investieren', run: () => 'Weniger Zucker, mehr Gemüse. Dein Körper dankt es dir.' + mod({ injuryProne: -4, devBonus: 0.5 }) },
      { label: 'Nee, Döner schmeckt zu gut', run: () => 'Die Fans feiern dein Döner-Video, aber im Training bist du etwas schwerfälliger.' + mod({ form: -1, popularity: 3 }) },
    ],
  },
  {
    id: 'youngster', title: 'Konkurrenz aus der Jugend',
    cond: () => S.player.age >= 24 && !S.youth,
    text: () => `Ein 18-jähriges Talent spielt im Training auf deiner Position (${POSITIONS[S.player.pos].name}) groß auf. Die Presse schreibt schon über einen Stammplatz für ihn.`,
    options: [
      { label: 'Noch härter arbeiten', run: () => 'Du nimmst die Herausforderung an und legst eine Schippe drauf.' + mod({ devBonus: 0.8, trust: 3, injuryProne: 2 }) },
      { label: 'Ihn als Mentor unterstützen', run: () => 'Du nimmst den Jungen unter deine Fittiche. Kabine und Fans lieben es.' + mod({ trust: 6, popularity: 4, form: -1 }) },
      {
        label: 'Beim Trainer beschweren', run: () => S.player.popularity > 60
          ? 'Dein Standing im Verein ist groß – der Trainer setzt weiter auf dich.' + mod({ trust: 2 })
          : 'Der Trainer mag keine Beschwerden. Das Verhältnis kühlt ab.' + mod({ trust: -9 }),
      },
    ],
  },
  {
    id: 'positionChange', title: 'Neue Position?',
    cond: () => S.player.pos !== 'TW',
    text: () => `Der Trainer möchte dich als ${POSITIONS[switchTarget()].name} testen.`,
    options: [
      {
        label: 'Annehmen', run: () => {
          const target = switchTarget();
          if (chance(0.55)) {
            S.player.pos = target;
            return `Du überzeugst auf Anhieb! Ab sofort spielst du als ${POSITIONS[target].name}.` + mod({ trust: 7 });
          }
          return 'Es passt nicht so richtig. Nach ein paar Wochen spielst du wieder auf deiner alten Position – aber der Trainer schätzt deine Flexibilität.' + mod({ trust: 4, devBonus: -0.3 });
        },
      },
      { label: 'Ablehnen', run: () => 'Du bleibst auf deiner Position. Der Trainer ist enttäuscht.' + mod({ trust: -5 }) },
    ],
  },
  {
    id: 'injury', title: 'Ziehen im Oberschenkel', weight: () => 1 + S.player.injuryProne / 10,
    text: () => 'Nach dem Training spürst du ein Ziehen im hinteren Oberschenkel. Am Wochenende steht ein wichtiges Spiel an.',
    options: [
      {
        label: 'Durchbeißen und spielen', run: () => {
          if (chance(0.35 + S.player.injuryProne / 100)) {
            const g = randInt(8, 16);
            return `Muskelfaserriss! Du fällst ${g} Spiele aus.` + mod({ injuredGames: g, injuryProne: 4, devBonus: -1, form: -2 });
          }
          return 'Glück gehabt – es hält, und du lieferst eine starke Partie ab.' + mod({ form: 2, trust: 3 });
        },
      },
      {
        label: 'Pause einlegen', run: () => {
          const g = randInt(1, 3);
          return `Du setzt ${g} Spiel${g > 1 ? 'e' : ''} aus und kommst vollständig genesen zurück.` + mod({ injuredGames: g, injuryProne: -1 });
        },
      },
    ],
  },
  {
    id: 'media', title: 'Interview-Anfrage',
    cond: () => !S.youth,
    text: () => 'Nach einer Niederlage fragt dich ein Reporter, ob der Trainer die richtige Taktik gewählt hat.',
    options: [
      { label: 'Diplomatisch antworten', run: () => '„Wir müssen alle besser werden.“ Kein Aufreger – der Trainer nickt zufrieden.' + mod({ trust: 3 }) },
      { label: 'Klartext reden', run: () => 'Deine Kritik geht viral. Die Fans feiern dich, der Trainer weniger.' + mod({ popularity: 6, trust: -8 }) },
      { label: 'Interview absagen', run: () => 'Du gehst wortlos an den Mikrofonen vorbei. Manche Fans finden das arrogant.' + mod({ popularity: -2 }) },
    ],
  },
  {
    id: 'sponsor', title: 'Werbedeal',
    text: () => 'Eine Sportmarke will mit dir einen Werbespot drehen – mitten in der Saison.',
    options: [
      { label: 'Annehmen', run: () => 'Dein Gesicht ist jetzt auf Plakaten in der ganzen Stadt. Der Dreh kostet aber Kraft.' + mod({ popularity: 6, form: -1 }) },
      { label: 'Fokus auf Fußball', run: () => 'Du lehnst ab und konzentrierst dich voll auf den Sport.' + mod({ form: 1, trust: 1 }) },
    ],
  },
  {
    id: 'captain', title: 'Die Kapitänsbinde',
    cond: () => S.player.age >= 24 && S.player.trust >= 65 && !S.youth && S.captainAt !== S.clubId,
    text: () => `Der Trainer möchte dich zum Kapitän von ${S.clubId} machen.`,
    options: [
      { label: 'Binde annehmen', run: () => { S.captainAt = S.clubId; return 'Du führst die Mannschaft ab sofort als Kapitän aufs Feld!' + mod({ trust: 6, popularity: 6 }); } },
      { label: 'Ablehnen – ich will mich aufs Spielen konzentrieren', run: () => 'Der Trainer respektiert deine Entscheidung.' + mod({ form: 1 }) },
    ],
  },
  {
    id: 'fanPressure', title: 'Pfiffe von den Rängen',
    cond: () => S.player.form <= 1,
    text: () => 'Nach ein paar schwachen Spielen pfeifen dich die eigenen Fans aus.',
    options: [
      {
        label: 'Mit Leistung antworten', run: () => chance(0.3 + (S.player.rating - 55) / 80)
          ? 'Im nächsten Spiel bist du der Beste auf dem Platz. Die Pfiffe verwandeln sich in Applaus!' + mod({ form: 3, popularity: 4 })
          : 'Der Druck lähmt dich. Es wird eher schlimmer.' + mod({ form: -2 }),
      },
      { label: 'Den Fanclub besuchen', run: () => 'Du trinkst ein Bier mit den Ultras und erklärst dich. Das kommt gut an.' + mod({ popularity: 8 }) },
      { label: 'Auf Social Media zurückschießen', run: () => 'Dein Post macht alles nur schlimmer.' + mod({ popularity: -10, trust: -3 }) },
    ],
  },
  {
    id: 'conflict', title: 'Streit in der Kabine',
    cond: () => !S.youth,
    text: () => 'Ein Mitspieler wirft dir vor, im letzten Spiel zu egoistisch gewesen zu sein. Es wird laut.',
    options: [
      { label: 'Aussprache suchen', run: () => 'Ihr redet euch aus und gebt euch die Hand.' + mod({ trust: 3 }) },
      {
        label: 'Nicht nachgeben', run: () => chance(0.5)
          ? 'Du setzt dich durch und verschaffst dir Respekt in der Kabine.' + mod({ popularity: 3, trust: 2 })
          : 'Der Streit eskaliert, der Trainer muss dazwischengehen.' + mod({ trust: -7, form: -1 }),
      },
    ],
  },
  {
    id: 'mentalCoach', title: 'Mentaltrainer',
    text: () => 'Der Verein bietet dir Sitzungen bei einem Mentaltrainer an.',
    options: [
      { label: 'Ausprobieren', run: () => 'Du lernst, mit Druck umzugehen. Du wirkst auf dem Platz ruhiger.' + mod({ form: 3, devBonus: 0.3 }) },
      { label: 'Brauche ich nicht', run: () => 'Du vertraust auf dich selbst.' + mod({}) },
    ],
  },
  {
    id: 'agent', title: 'Dein Berater hat eine Idee',
    cond: () => !S.youth && !S.loan,
    text: () => 'Dein Berater will Wechselgerüchte in den Medien streuen, um deinen Marktwert zu pushen.',
    options: [
      { label: 'Mitspielen', run: () => { S.season.transferBoost = 1; return 'Plötzlich wirst du mit großen Klubs in Verbindung gebracht. Im Verein ist man nicht begeistert.' + mod({ trust: -8, popularity: -2 }); } },
      { label: 'Nein – ich stehe zu meinem Verein', run: () => 'Deine Loyalität spricht sich herum.' + mod({ trust: 5, popularity: 5 }) },
    ],
  },
  {
    id: 'firstTeam', title: 'Training bei den Profis',
    cond: () => S.youth,
    text: () => `Der Cheftrainer von ${S.clubId} lädt dich zum Training der ersten Mannschaft ein.`,
    options: [
      {
        label: 'Vollgas geben', run: () => chance(0.7)
          ? 'Du zeigst keinen Respekt vor großen Namen und fällst positiv auf!' + mod({ devBonus: 1.2, trust: 6 })
          : 'Du übertreibst es mit einer harten Grätsche gegen den Kapitän. Autsch.' + mod({ trust: -4, devBonus: 0.5 }),
      },
      { label: 'Respektvoll zurückhalten', run: () => 'Solide, aber unauffällig.' + mod({ devBonus: 0.4, trust: 2 }) },
    ],
  },
  {
    id: 'school', title: 'Schule oder Fußball?',
    cond: () => S.youth,
    text: () => 'Die Abschlussprüfungen stehen an – genau in der wichtigsten Phase der U19-Saison.',
    options: [
      { label: 'Schule durchziehen', run: () => 'Du bestehst mit guten Noten. Deine Eltern sind stolz, das Training kam aber etwas zu kurz.' + mod({ devBonus: -0.4, popularity: 2 }) },
      { label: 'Voll auf Fußball setzen', run: () => 'Du trainierst wie ein Profi. Hoffentlich geht das gut …' + mod({ devBonus: 0.9 }) },
    ],
  },
  {
    id: 'nationalFriendly', title: 'Einladung zur Nationalmannschaft',
    cond: () => !S.youth && S.player.age >= 18 && S.player.rating >= nation().str - 9,
    text: () => `Der Bundestrainer von ${S.player.nation} lädt dich zu zwei Länderspielen ein. Dein Verein hätte dich lieber ausgeruht.`,
    options: [
      { label: 'Zusagen', run: () => { S.player.caps += 2; return 'Zwei Länderspiele für dein Land – ein Traum!' + mod({ popularity: 5, injuryProne: 1 }); } },
      { label: 'Absagen', run: () => 'Du bleibst beim Verein und erholst dich.' + mod({ form: 1, trust: 2, popularity: -2 }) },
    ],
  },
  {
    id: 'veteran', title: 'Der Körper wird älter',
    cond: () => S.player.age >= 30,
    text: () => 'Du merkst, dass du nach Spielen länger brauchst, um dich zu erholen.',
    options: [
      { label: 'Trainingsplan anpassen', run: () => 'Yoga, Kältekammer, mehr Schlaf. Du fühlst dich wieder jünger.' + mod({ injuryProne: -3, devBonus: 0.6 }) },
      { label: 'Weiter wie bisher', run: () => 'Du ziehst dein Ding durch – aber der Körper protestiert.' + mod({ injuryProne: 3, form: 1 }) },
    ],
  },
  {
    id: 'derby', title: 'Derby-Woche',
    cond: () => S.player.pos !== 'TW',
    text: () => `Vor dem Derby gegen ${rivalName()} provozieren dich gegnerische Fans in den sozialen Medien.`,
    options: [
      { label: 'Ruhig bleiben', run: () => 'Du lässt dich nicht provozieren und bleibst fokussiert.' + mod({ form: 1 }) },
      {
        label: 'Einen Jubel vor ihrer Kurve ankündigen', run: () => chance(0.5)
          ? 'Du triffst und jubelst vor der gegnerischen Kurve. Legendär!' + mod({ popularity: 8, form: 2, goals: 1 })
          : 'Du bleibst blass, die gegnerischen Fans verspotten dich.' + mod({ popularity: -4, form: -2 }),
      },
    ],
  },
];
