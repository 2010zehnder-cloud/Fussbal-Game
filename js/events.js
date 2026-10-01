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
      { label: 'Investieren (20 Tsd. €)', run: () => 'Weniger Zucker, mehr Gemüse. Dein Körper dankt es dir.' + mod({ injuryProne: -4, devBonus: 0.5, money: -0.02 }) },
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
      { label: 'Annehmen', run: () => 'Dein Gesicht ist jetzt auf Plakaten in der ganzen Stadt. Der Dreh kostet aber Kraft.' + mod({ popularity: 6, form: -1, money: dealSize() }) },
      { label: 'Fokus auf Fußball', run: () => 'Du lehnst ab und konzentrierst dich voll auf den Sport.' + mod({ form: 1, trust: 1 }) },
    ],
  },
  {
    id: 'startup', title: 'Ein Freund braucht Startkapital',
    cond: () => S.money >= 0.05,
    text: () => `Ein Schulfreund gründet ein Start-up für Fußball-Apps und bittet dich um ${money(stake())}.`,
    options: [
      {
        label: 'Investieren', run: () => {
          const v = stake();
          return chance(0.35)
            ? `Die App wird ein Hit! Deine Anteile sind jetzt viermal so viel wert.` + mod({ money: v * 3 })
            : 'Das Start-up geht pleite. Das Geld ist weg.' + mod({ money: -v });
        },
      },
      { label: 'Ablehnen', run: () => 'Du wünschst ihm viel Glück, bleibst aber vorsichtig.' + mod({}) },
    ],
  },
  {
    id: 'charity', title: 'Spendenaufruf',
    cond: () => S.money >= 0.1,
    text: () => `Eine Kinderklinik in deiner Heimatstadt sammelt Spenden für eine neue Station. Die Presse fragt, ob du ${money(stake())} gibst.`,
    options: [
      { label: 'Spenden', run: () => 'Die Kinder schicken dir ein riesiges Dankes-Plakat. Die ganze Stadt spricht darüber.' + mod({ money: -stake(), popularity: 8 }) },
      { label: 'Diesmal nicht', run: () => 'Du sagst ab. Ein paar Fans sind enttäuscht.' + mod({ popularity: -2 }) },
    ],
  },
  {
    id: 'casino', title: 'Casino-Abend',
    cond: () => !S.youth && S.money >= 0.05,
    text: () => 'Ein paar Mitspieler nehmen dich nach dem Sieg mit ins Casino.',
    options: [
      {
        label: 'Alles auf Rot', run: () => {
          const v = stake();
          return chance(0.47)
            ? 'Rot! Du verdoppelst deinen Einsatz.' + mod({ money: v })
            : 'Schwarz. Und ein Foto von dir am Roulettetisch landet in der Zeitung.' + mod({ money: -v, trust: -3, popularity: -2 });
        },
      },
      { label: 'Nur zuschauen', run: () => 'Du trinkst eine Cola und gehst früh nach Hause.' + mod({ form: 1 }) },
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
  {
    id: 'penaltyTaker', title: 'Neuer Elfmeterschütze gesucht',
    cond: () => !S.youth && ['att', 'mid'].includes(POSITIONS[S.player.pos].group),
    text: () => 'Euer Elfmeterschütze hat dreimal in Folge verschossen. Der Trainer fragt in der Kabine, wer den Job übernimmt.',
    options: [
      {
        label: 'Ich mach das!', run: () => chance(0.35 + quality() * 0.4)
          ? 'Du verwandelst die nächsten Elfmeter eiskalt. Der Job gehört jetzt dir.' + mod({ goals: randInt(2, 4), trust: 4, popularity: 3 })
          : 'Gleich beim ersten Versuch hält der Torwart. Das Pfeifkonzert ist laut.' + mod({ form: -2, popularity: -3 }),
      },
      { label: 'Soll ein anderer machen', run: () => 'Du hältst dich raus. Ein Mitspieler übernimmt.' + mod({}) },
    ],
  },
  {
    id: 'coachFired', title: 'Trainer entlassen!',
    cond: () => !S.youth,
    text: () => `Nach einer Niederlagenserie trennt sich ${S.clubId} vom Trainer. Der Neue kennt dich noch nicht.`,
    options: [
      { label: 'Im ersten Training Vollgas geben', run: () => { S.player.trust = 50; return 'Der neue Trainer ist beeindruckt von deiner Einstellung.' + mod({ trust: 8, injuryProne: 1 }); } },
      { label: 'Abwarten und ruhig bleiben', run: () => { S.player.trust = 50; return 'Alles startet bei null. Du musst dich neu beweisen.' + mod({}); } },
      { label: 'Dem alten Trainer öffentlich danken', run: () => { S.player.trust = 45; return 'Die Fans finden das stark, der Neue weniger.' + mod({ popularity: 5 }); } },
    ],
  },
  {
    id: 'winterRumor', title: 'Angebot im Winter',
    cond: () => !S.youth && !S.loan && S.player.rating >= 70,
    text: () => `Dein Berater meldet: ${bigClub()} will dich unbedingt haben und fragt, ob du im Sommer offen für Gespräche wärst.`,
    options: [
      { label: 'Gespräche führen', run: () => { S.season.transferBoost = (S.season.transferBoost || 0) + 1; return 'Die Gespräche sickern durch. Im Verein ist man verstimmt, aber im Sommer hast du mehr Optionen.' + mod({ trust: -6 }); } },
      { label: 'Klar absagen', run: () => 'Du bekennst dich öffentlich zu deinem Verein.' + mod({ trust: 6, popularity: 4 }) },
    ],
  },
  {
    id: 'tattoo', title: 'Neues Tattoo?',
    text: () => 'Du überlegst, dir ein riesiges Tattoo mit dem Vereinswappen auf den Rücken stechen zu lassen.',
    options: [
      { label: 'Stechen lassen', run: () => chance(0.6) ? 'Die Fans lieben es!' + mod({ popularity: 6 }) : 'Das Motiv sieht irgendwie schief aus. Das Internet lacht.' + mod({ popularity: -3 }) },
      { label: 'Lieber nicht', run: () => 'Deine Haut bleibt, wie sie ist.' + mod({}) },
    ],
  },
  {
    id: 'love', title: 'Liebe auf den ersten Blick',
    cond: () => !life().partner && S.player.age >= 18,
    text: () => `Auf einer Charity-Gala lernst du ${partnerName()} kennen. Es funkt sofort.`,
    options: [
      { label: 'Nach einem Date fragen', run: () => { life().partner = { name: partnerName(), rel: 60, job: pick(JOBS) }; return `Ihr seid jetzt ein Paar! ${partnerName()} gibt dir Halt.` + mod({ form: 2, popularity: 2 }); } },
      { label: 'Fokus auf die Karriere', run: () => 'Du bleibst Single und konzentrierst dich auf Fußball.' + mod({ devBonus: 0.3 }) },
    ],
  },
  {
    id: 'wedding', title: 'Hochzeit',
    cond: () => life().partner && !life().married && S.player.age >= 22,
    text: () => `Du und ${life().partner.name} wollt heiraten. Wie groß soll die Feier werden?`,
    options: [
      { label: 'Riesige Party auf Mallorca', run: () => { life().married = true; return 'Die Bilder gehen um die Welt. Unvergesslich – und teuer.' + mod({ popularity: 5, money: -Math.max(0.03, Math.min(1.5, S.money * 0.1)) }); } },
      { label: 'Kleine Feier mit Familie', run: () => { life().married = true; return 'Ein wunderschöner Tag im kleinen Kreis.' + mod({ form: 2 }); } },
      { label: 'Noch warten', run: () => 'Ihr lasst euch noch Zeit.' + mod({}) },
    ],
  },
  {
    id: 'baby', title: 'Nachwuchs!',
    cond: () => life().married && life().children.length < 4,
    weight: () => 0.7,
    text: () => `Große Neuigkeiten: Du und ${life().partner.name} bekommt ein Baby! Es kommt mitten in der Saison.`,
    options: [
      { label: 'Zwei Wochen Elternzeit', run: () => `Du bist bei der Geburt von ${haveChild()} dabei und genießt die ersten Tage. Der Verein zeigt Verständnis.` + mod({ form: 2, injuredGames: 2, popularity: 3, rel: 12 }) },
      { label: 'Sofort zurück zum Training', run: () => `${haveChild()} ist da! Du trainierst weiter, aber schläfst kaum.` + mod({ form: -2, trust: 2, rel: -8 }) },
    ],
  },
  {
    id: 'homesick', title: 'Heimweh',
    cond: () => !S.youth && clubLeague(S.clubId).country !== nation().country,
    text: () => `Das Leben in ${clubLeague(S.clubId).name === 'Major League Soccer' ? 'den USA' : 'der Fremde'} ist nicht leicht. Du vermisst Familie und Freunde.`,
    options: [
      { label: 'Sprachkurs machen', run: () => 'Du lernst die Sprache und findest schnell Anschluss.' + mod({ form: 2, trust: 3 }) },
      { label: 'Familie einfliegen lassen', run: () => 'Deine Familie besucht dich für einen Monat. Das tut gut.' + mod({ form: 3, money: -0.02 }) },
      { label: 'Durchbeißen', run: () => 'Du ziehst dich zurück. Man merkt es dir auf dem Platz an.' + mod({ form: -2 }) },
    ],
  },
  {
    id: 'referee', title: 'Fehlentscheidung',
    cond: () => !S.youth,
    text: () => 'In der Nachspielzeit gibt der Schiri einen klaren Elfmeter nicht. Ihr verliert. Die Kameras sind auf dich gerichtet.',
    options: [
      { label: 'Den Schiri öffentlich kritisieren', run: () => 'Deine Wutrede geht viral – der Verband sperrt dich für zwei Spiele.' + mod({ popularity: 5, injuredGames: 2, trust: -2 }) },
      { label: 'Tief durchatmen', run: () => '„Wir müssen das Spiel vorher entscheiden.“ Starke Worte.' + mod({ trust: 3 }) },
    ],
  },
  {
    id: 'flu', title: 'Grippewelle',
    text: () => 'Die halbe Mannschaft liegt mit Grippe flach. Du fühlst dich auch schon schlapp.',
    options: [
      { label: 'Trotzdem spielen', run: () => chance(0.5) ? 'Du hältst durch und bist einer der wenigen Fitten.' + mod({ trust: 5 }) : 'Du brichst in der Halbzeit zusammen und fällst länger aus.' + mod({ injuredGames: 4, form: -2 }) },
      { label: 'Im Bett bleiben', run: () => 'Eine Woche Tee und Schlaf.' + mod({ injuredGames: 1 }) },
    ],
  },
  {
    id: 'fanSong', title: 'Dein eigenes Fanlied',
    cond: () => S.player.popularity >= 55,
    text: () => 'Die Fans haben ein Lied über dich gedichtet und singen es in jedem Heimspiel.',
    options: [
      { label: 'Nach dem Spiel mitsingen', run: () => 'Du stellst dich vor die Kurve und singst mit. Gänsehaut!' + mod({ popularity: 6, form: 1 }) },
      { label: 'Einfach genießen', run: () => 'Du lächelst still in dich hinein.' + mod({ form: 1 }) },
    ],
  },
  {
    id: 'cover', title: 'Cover-Star',
    cond: () => S.player.rating >= 84,
    text: () => 'Ein großes Fußball-Videospiel will dich aufs Cover der neuen Ausgabe nehmen.',
    options: [
      { label: 'Zusagen', run: () => 'Dein Gesicht ist jetzt in Millionen Kinderzimmern.' + mod({ popularity: 8, money: dealSize() * 2 }) },
      { label: 'Ablehnen', run: () => 'Du bleibst lieber bescheiden.' + mod({ trust: 1 }) },
    ],
  },
  {
    id: 'podcast', title: 'Eigener Podcast',
    cond: () => !S.youth && S.player.popularity >= 40,
    text: () => 'Ein Streaming-Dienst bietet dir einen eigenen Podcast an – jede Woche eine Folge.',
    options: [
      { label: 'Machen', run: () => 'Die Klickzahlen sind stark, aber der Trainer findet, du redest zu viel.' + mod({ popularity: 5, money: dealSize(), trust: -3 }) },
      { label: 'Nein danke', run: () => 'Du lässt lieber deine Füße sprechen.' + mod({ form: 1 }) },
    ],
  },
  {
    id: 'legend', title: 'Tipps von der Vereinslegende',
    cond: () => S.player.age <= 22,
    text: () => `Eine Vereinslegende von ${S.clubId} bietet dir an, nach dem Training mit dir zu arbeiten.`,
    options: [
      { label: 'Sofort annehmen', run: () => 'Du lernst Tricks, die in keinem Lehrbuch stehen.' + mod({ devBonus: 1, trust: 2 }) },
      { label: 'Höflich ablehnen', run: () => 'Du gehst deinen eigenen Weg.' + mod({}) },
    ],
  },
  {
    id: 'autograph', title: 'Der kleine Fan',
    text: () => 'Ein kleiner Junge wartet seit drei Stunden im Regen vor dem Trainingsgelände auf ein Autogramm.',
    options: [
      { label: 'Anhalten und Trikot schenken', run: () => 'Das Video von der Szene sehen Millionen Menschen.' + mod({ popularity: 6 }) },
      { label: 'Schnell weiterfahren', run: () => 'Du hast es eilig. Jemand filmt, wie du vorbeifährst …' + mod({ popularity: -4 }) },
    ],
  },
  {
    id: 'matchFixing', title: 'Ein verdächtiger Anruf',
    cond: () => !S.youth,
    text: () => 'Ein Unbekannter bietet dir Geld dafür, im nächsten Spiel absichtlich eine Gelbe Karte zu holen.',
    options: [
      { label: 'Sofort dem Verein und der Polizei melden', run: () => 'Die Ermittler heben einen Wettbetrüger-Ring aus. Du wirst für deine Ehrlichkeit gefeiert.' + mod({ popularity: 8, trust: 6 }) },
      { label: 'Auflegen und vergessen', run: () => 'Du legst auf. Ein ungutes Gefühl bleibt.' + mod({ form: -1 }) },
    ],
  },
  {
    id: 'carDealer', title: 'Der Autohändler',
    cond: () => S.money >= 0.3 && !ownedCount('car2'),
    text: () => 'Ein Autohändler bietet dir einen Sportwagen für 200 Tsd. € an – 20 % unter Listenpreis.',
    options: [
      { label: 'Kaufen', run: () => { S.owned.car2 = 1; return 'Mit dem neuen Flitzer fährst du vor. Die Fans machen Fotos.' + mod({ money: -0.2, popularity: 2 }); } },
      { label: 'Brauche ich nicht', run: () => 'Dein alter Wagen tut es auch.' + mod({}) },
    ],
  },
  {
    id: 'realEstate', title: 'Immobilien-Deal',
    cond: () => S.money >= 2,
    text: () => `Ein Makler bietet dir an, ${money(stake())} in ein Neubauprojekt zu stecken.`,
    options: [
      {
        label: 'Investieren', run: () => {
          const v = stake();
          return chance(0.6)
            ? 'Die Wohnungen verkaufen sich super. Du machst 40 % Gewinn.' + mod({ money: v * 0.4 })
            : 'Der Bau verzögert sich, der Bauträger ist pleite. Die Hälfte ist weg.' + mod({ money: -v * 0.5 });
        },
      },
      { label: 'Lieber nicht', run: () => 'Dein Geld bleibt, wo es ist.' + mod({}) },
    ],
  },
  {
    id: 'youthCaptain', title: 'Kapitän der U19',
    cond: () => S.youth,
    text: () => 'Der U19-Trainer will dir die Kapitänsbinde geben.',
    options: [
      { label: 'Gerne!', run: () => 'Du führst die Mannschaft an und wächst an der Verantwortung.' + mod({ trust: 5, devBonus: 0.4, popularity: 2 }) },
      { label: 'Ich bin noch nicht so weit', run: () => 'Du konzentrierst dich auf dein eigenes Spiel.' + mod({ form: 1 }) },
    ],
  },
  {
    id: 'nerves', title: 'Schlaflose Nacht',
    text: () => 'Vor dem wichtigsten Spiel der Saison kannst du nicht schlafen.',
    options: [
      { label: 'Spiel von gestern analysieren', run: () => 'Du findest eine Schwäche im Gegner. Müde, aber gut vorbereitet.' + mod({ trust: 2, form: -1 }) },
      { label: 'Musik hören und entspannen', run: () => 'Irgendwann schläfst du doch ein.' + mod({ form: 1 }) },
      { label: 'Den Mannschaftsarzt anrufen', run: () => 'Ein Kräutertee und ein ruhiges Gespräch helfen.' + mod({ form: 2 }) },
    ],
  },
  {
    id: 'dopingOffer', title: 'Das Angebot im Hinterzimmer',
    cond: () => !S.youth && !S.season.doped,
    weight: () => 0.8,
    text: () => 'Ein Fitnesscoach zieht dich zur Seite: „Ich hab da ein Mittel. Nicht nachweisbar, sagen sie. Du wärst eine Maschine.“',
    options: [
      { label: 'Nehmen', run: () => doDope() },
      { label: 'Ablehnen und dem Verein melden', run: () => 'Der Coach fliegt raus. Der Verein ist dir dankbar.' + mod({ trust: 6, popularity: 3 }) },
      { label: 'Ablehnen', run: () => 'Du gehst einfach weg. Sauber bleiben ist dir wichtiger.' + mod({}) },
    ],
  },
  {
    id: 'jealous', title: 'Eifersucht',
    cond: () => !!life().partner,
    text: () => `${life().partner.name} ist genervt: Du bist ständig unterwegs, und auf Social Media schreiben dir fremde Leute.`,
    options: [
      { label: 'Ein Wochenende nur für euch', run: () => 'Ihr fahrt in die Berge, Handys aus. Das tut euch gut.' + mod({ rel: 15, form: 1, money: -0.005 }) },
      { label: 'Das ist halt mein Job', run: () => 'Die Stimmung bleibt angespannt.' + mod({ rel: -12 }) },
    ],
  },
  {
    id: 'partnerCareer', title: 'Ein Angebot für deinen Partner',
    cond: () => !!life().partner,
    text: () => `${life().partner.name} bekommt ein tolles Jobangebot in einer anderen Stadt.`,
    options: [
      { label: 'Unterstützen – Fernbeziehung', run: () => 'Ihr seht euch seltener, aber du stehst hinter der Entscheidung.' + mod({ rel: 6, form: -1 }) },
      { label: 'Bitten, das Angebot abzulehnen', run: () => chance(0.5) ? 'Das Angebot wird abgelehnt. Glücklich ist dein Partner damit aber nicht.' + mod({ rel: -10 }) : 'Riesiger Streit. Die Beziehung wackelt.' + mod({ rel: -25 }) },
    ],
  },
  {
    id: 'paparazzi', title: 'Paparazzi',
    cond: () => S.player.popularity >= 50,
    text: () => 'Paparazzi verfolgen dich seit Tagen. Heute stehen sie vor deiner Haustür.',
    options: [
      { label: 'Freundlich für Fotos posieren', run: () => 'Die Bilder sind sympathisch.' + mod({ popularity: 3 }) },
      { label: 'Die Kamera wegschlagen', run: () => 'Anzeige wegen Sachbeschädigung. Das kostet Geld und Ansehen.' + mod({ popularity: -6, money: -0.02, trust: -3 }) },
      { label: 'Durch die Hintertür verschwinden', run: () => 'Du entkommst unbemerkt.' + mod({}) },
    ],
  },
  {
    id: 'rivalTrash', title: 'Dein Rivale lästert',
    cond: () => !S.youth && rivalActive(),
    text: () => `${S.rival.name} sagt in einem Interview: „Gegen mich hat ${S.player.name.split(' ')[0]} keine Chance.“`,
    options: [
      { label: 'Zurücklästern', run: () => 'Die Medien lieben das Duell. Der Trainer weniger.' + mod({ popularity: 5, trust: -2 }) },
      { label: 'Mit Leistung antworten', run: () => 'Du beißt dich im Training fest.' + mod({ form: 2, devBonus: 0.3 }) },
      { label: 'Ignorieren', run: () => 'Du gibst ihm keine Bühne.' + mod({}) },
    ],
  },
  {
    id: 'rivalAd', title: 'Gemeinsamer Werbespot',
    cond: () => !S.youth && rivalActive() && S.player.popularity >= 40,
    text: () => `Ein Sportartikel-Hersteller will dich und ${S.rival.name} für einen gemeinsamen Werbespot.`,
    options: [
      { label: 'Zusagen', run: () => 'Am Set versteht ihr euch überraschend gut. Die Fans feiern den Clip.' + mod({ popularity: 5, money: dealSize() }) },
      { label: 'Niemals mit dem!', run: () => 'Die Rivalität bleibt eiskalt.' + mod({ form: 1 }) },
    ],
  },
  {
    id: 'parentsMoney', title: 'Deine Eltern fragen nach Geld',
    cond: () => family().parents.some(x => x.alive && x.role !== 'Elternteil') && S.money >= 0.1,
    text: () => `Deine Eltern wollen ihr Haus renovieren und fragen, ob du mit ${money(stake())} helfen kannst.`,
    options: [
      { label: 'Klar, gerne', run: () => { family().parents.forEach(x => { x.rel = clamp(x.rel + 15, 0, 100); }); return 'Deine Eltern sind unendlich dankbar.' + mod({ money: -stake(), form: 1 }); } },
      { label: 'Diesmal nicht', run: () => { family().parents.forEach(x => { x.rel = clamp(x.rel - 10, 0, 100); }); return 'Die Stimmung beim nächsten Familienessen ist frostig.' + mod({}); } },
    ],
  },
  {
    id: 'siblingDebt', title: 'Ärger in der Familie',
    cond: () => family().siblings.length > 0 && S.money >= 0.05,
    text: () => { const sb = sibling(); return `${sibPossessive(sb)} ${sb.name} hat Schulden bei den falschen Leuten und bittet dich um ${money(stake())}.`; },
    options: [
      { label: 'Schulden bezahlen', run: () => { sibling().rel = clamp(sibling().rel + 20, 0, 100); return 'Das Problem ist gelöst.' + mod({ money: -stake() }); } },
      { label: 'Eine Lektion erteilen', run: () => { sibling().rel = clamp(sibling().rel - 20, 0, 100); return 'Ihr redet eine Weile nicht miteinander.' + mod({ form: -1 }); } },
    ],
  },
  {
    id: 'siblingDuel', title: 'Familienduell',
    cond: () => !S.youth && family().siblings.some(sb => sb.brother && sb.footballer && sb.club && sb.club !== S.clubId && S.clubs[sb.club].league === S.clubs[S.clubId].league),
    text: () => { const sb = family().siblings.find(x => x.brother && x.footballer && x.club && S.clubs[x.club].league === S.clubs[S.clubId].league); return `Am Wochenende spielst du gegen deinen Bruder ${sb.name} und ${sb.club}. Die ganze Familie sitzt im Stadion.`; },
    options: [
      { label: 'Keine Gnade!', run: () => chance(0.6) ? 'Ihr gewinnt, und du triffst sogar. Beim Familienessen gibt es Sticheleien.' + mod({ goals: 1, form: 2 }) : 'Dein Bruder behält die Oberhand. Das hörst du jetzt jahrelang.' + mod({ form: -1 }) },
      { label: 'Trikottausch nach dem Spiel', run: () => 'Das Foto von euch beiden geht um die Welt.' + mod({ popularity: 6 }) },
    ],
  },
  {
    id: 'mateLoan', title: 'Ein Mitspieler braucht Geld',
    cond: () => !S.youth && S.team && S.team.club === S.clubId && S.money >= 0.02,
    text: () => `${mate().name} bittet dich, ihm ${money(0.01)} zu leihen. Er schwört, es zurückzuzahlen.`,
    options: [
      { label: 'Geld leihen', run: () => chance(0.7) ? `${mate().name} zahlt alles pünktlich zurück und ist dir ewig dankbar.` + relChip(mate(), 20) : `${mate().name} meldet sich nie wieder wegen des Geldes.` + mod({ money: -0.01 }) + relChip(mate(), -10) },
      { label: 'Ablehnen', run: () => `${mate().name} ist enttäuscht.` + relChip(mate(), -10) },
    ],
  },
  {
    id: 'mateGossip', title: 'Gerüchte in der Kabine',
    cond: () => !S.youth && S.team && S.team.club === S.clubId,
    text: () => `Du erfährst, dass ${enemyMate().name} beim Trainer schlecht über dich redet.`,
    options: [
      { label: 'Zur Rede stellen', run: () => chance(0.5) ? 'Ihr sprecht euch aus – es war ein Missverständnis.' + relChip(enemyMate(), 25) : 'Das Gespräch eskaliert.' + relChip(enemyMate(), -20) + mod({ trust: -2 }) },
      { label: 'Selbst mit dem Trainer reden', run: () => 'Der Trainer schätzt deine Offenheit.' + mod({ trust: 4 }) + relChip(enemyMate(), -10) },
      { label: 'Ignorieren', run: () => 'Du lässt es an dir abprallen.' + mod({}) },
    ],
  },
  {
    id: 'court', title: 'Vor Gericht',
    cond: () => !!S.court,
    weight: () => 25,
    text: () => S.court.plaintiff
      ? `Heute beginnt dein Prozess: Du klagst wegen ${S.court.charge}. Wie gehst du vor?`
      : `Heute beginnt dein Prozess wegen ${S.court.charge}. Die Presse belagert das Gericht. Wie verteidigst du dich?`,
    options: [
      { label: 'Teuren Staranwalt nehmen', run: () => courtVerdict('star') },
      { label: 'Normalen Anwalt nehmen', run: () => courtVerdict('normal') },
      { label: 'Vergleich anbieten (milderes Urteil)', run: () => courtVerdict('confess') },
    ],
  },
  {
    id: 'taxScheme', title: 'Das Steuersparmodell',
    cond: () => !S.youth && S.money >= 1 && !S.court && !S.taxRisk,
    text: () => 'Dein Steuerberater zeigt dir ein „kreatives“ Modell mit Briefkastenfirmen. Du würdest jedes Jahr viel Geld sparen.',
    options: [
      { label: 'Machen', run: () => { S.taxRisk = true; return 'Du sparst sofort eine Menge Geld. Hoffentlich schaut niemand genau hin …' + mod({ money: Math.max(0.05, S.money * 0.05) }); } },
      { label: 'Ablehnen – ich zahle meine Steuern', run: () => 'Du bleibst sauber.' + mod({ popularity: 1 }) },
    ],
  },
  {
    id: 'carAccident', title: 'Unfall',
    cond: () => !S.youth && (ownedCount('car2') || ownedCount('car3')) && !S.court,
    text: () => 'Nachts fährst du mit deinem Sportwagen viel zu schnell und rammst ein parkendes Auto. Niemand hat es gesehen …',
    options: [
      {
        label: 'Einfach weiterfahren', run: () => {
          if (chance(0.55)) { S.court = { charge: 'Fahrerflucht', severity: 2 }; return 'Eine Überwachungskamera hat alles gefilmt. Die Polizei ermittelt – es kommt zum Prozess.' + mod({ popularity: -10 }); }
          return 'Niemand findet es heraus. Aber dein schlechtes Gewissen bleibt.' + mod({ form: -1 });
        },
      },
      { label: 'Polizei rufen und den Schaden zahlen', run: () => 'Ein Bußgeld und eine Schlagzeile – mehr nicht.' + mod({ money: -0.02, popularity: -2 }) },
    ],
  },
  {
    id: 'fakeFriend', title: 'Falsche Freunde',
    cond: () => S.player.popularity >= 35 && !S.court,
    text: () => 'Ein angeblicher Jugendfreund verkauft erfundene Geschichten über dich an ein Klatschmagazin.',
    options: [
      { label: 'Verklagen', run: () => { S.court = { charge: 'Verleumdung', severity: 1, plaintiff: true }; return 'Deine Anwälte reichen Klage ein. Der Prozess beginnt bald.' + mod({}); } },
      { label: 'Ignorieren', run: () => 'Die Geschichte verschwindet nach ein paar Tagen.' + mod({ popularity: -3 }) },
    ],
  },
  {
    id: 'petChaos', title: 'Chaos zu Hause',
    cond: () => pets().length > 0,
    text: () => { const pt = pets()[0]; return `${pt.name} hat während deines Auswärtsspiels das halbe Wohnzimmer zerlegt.`; },
    options: [
      { label: 'Hundeschule bzw. Tiertrainer buchen', run: () => 'Ab jetzt herrscht Ordnung.' + mod({ money: -0.003, form: 1 }) },
      { label: 'Ein Video davon posten', run: () => { addFollowers({ mul: 1.15, add: 2000 }); return 'Das Video geht viral – Millionen lachen mit.' + mod({ popularity: 4 }); } },
    ],
  },
  {
    id: 'hacked', title: 'Account gehackt!',
    cond: () => S.social && S.social.followers >= 10000,
    text: () => 'Jemand hat sich in deinen Social-Media-Account gehackt und peinliche Nachrichten gepostet.',
    options: [
      { label: 'Sofort öffentlich erklären', run: () => 'Die Fans glauben dir und lachen mit.' + mod({ popularity: 1 }) },
      { label: 'Account für eine Weile löschen', run: () => { addFollowers({ mul: 0.7 }); return 'Ruhe im Kopf, aber viele Follower sind weg.' + mod({ form: 2 }); } },
    ],
  },
  {
    id: 'buddyAdvice', title: 'Ehrliche Worte',
    cond: () => buddy().type === 'loyal' && S.player.age >= 19,
    text: () => `${buddy().name} sagt dir ins Gesicht: „Du bist abgehoben. Denk daran, wo du herkommst.“`,
    options: [
      { label: 'Zuhören und nachdenken', run: () => 'Du merkst, dass es stimmt. Du konzentrierst dich wieder aufs Wesentliche.' + mod({ form: 2, trust: 3 }) + relChip(buddy(), 10) },
      { label: 'Beleidigt abhauen', run: () => 'Ihr redet eine Weile nicht miteinander.' + relChip(buddy(), -20) },
    ],
  },
  {
    id: 'buddyTrouble', title: 'Eine Idee von deinem besten Freund',
    cond: () => buddy().type === 'trouble' && S.player.age >= 18,
    text: () => `${buddy().name} will mit dir am Abend vor dem Spiel zu einer Party in einer anderen Stadt fahren. „Wie früher, komm schon!“`,
    options: [
      { label: 'Mitfahren', run: () => chance(0.5) ? 'Die Nacht wird legendär – und niemand erfährt davon.' + mod({ form: -1, popularity: 2 }) + relChip(buddy(), 12) : 'Ihr werdet erwischt, die Fotos sind überall.' + mod({ trust: -8, popularity: -4, form: -2 }) + relChip(buddy(), 5) },
      { label: 'Absagen', run: () => `${buddy().name} ist enttäuscht, aber du bleibst professionell.` + mod({ form: 1 }) + relChip(buddy(), -10) },
    ],
  },
  {
    id: 'buddyStory', title: 'Verrat?',
    cond: () => buddy().rel < 40 && S.player.popularity >= 40,
    text: () => `Ein Klatschmagazin bietet ${buddy().name} viel Geld für Geschichten aus deiner Jugend.`,
    options: [
      { label: 'Anrufen und reden', run: () => chance(0.6) ? `${buddy().name} lehnt das Angebot ab. Eure Freundschaft ist stärker.` + relChip(buddy(), 25) : `${buddy().name} verkauft die Geschichten trotzdem.` + mod({ popularity: -5 }) + relChip(buddy(), -30) },
      { label: 'Selbst mehr Geld bieten', run: () => 'Das Schweigen kostet dich, aber es wirkt.' + mod({ money: -Math.max(0.02, S.money * 0.03) }) + relChip(buddy(), -5) },
    ],
  },
];

// Beteiligte Personen einmal pro Ereignis festlegen
function sibling() {
  if (ctx().sib === undefined) ctx().sib = randInt(0, family().siblings.length - 1);
  return family().siblings[ctx().sib];
}
function mate() {
  if (ctx().mate === undefined) ctx().mate = randInt(0, S.team.mates.length - 1);
  return S.team.mates[ctx().mate];
}
function enemyMate() {
  if (ctx().enemy === undefined) {
    const m = S.team.mates;
    ctx().enemy = m.indexOf(m.slice().sort((x, y) => x.rel - y.rel)[0]);
  }
  return S.team.mates[ctx().enemy];
}

// Name eines großen Vereins aus einer anderen Liga (einmal pro Ereignis festgelegt)
function bigClub() {
  if (!ctx().big) {
    const own = S.clubs[S.clubId].league;
    const pool = Object.keys(S.clubs).filter(n => S.clubs[n].league !== own && clubStr(n) >= Math.max(S.player.rating, 78));
    ctx().big = pool.length ? pick(pool) : pick(Object.keys(S.clubs).filter(n => n !== S.clubId));
  }
  return ctx().big;
}
function partnerName() {
  if (!ctx().partner) ctx().partner = pick(PARTNER_NAMES);
  return ctx().partner;
}

// Betrag für Geld-Ereignisse: 15 % des Vermögens, einmal pro Ereignis festgelegt
function stake() {
  if (ctx().stake === undefined) ctx().stake = Math.max(0.01, Math.round(S.money * 0.15 * 1000) / 1000);
  return ctx().stake;
}
function dealSize() {
  return Math.round(clamp(0.02 * Math.exp((S.player.rating - 65) / 8) * (0.5 + S.player.popularity / 100), 0.005, 10) * 1000) / 1000;
}
