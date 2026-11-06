'use strict';

// Ballon-d'Or-Gala live, Videospiel-Wertung, Weihnachten und Silvester, Medizincheck beim Wechsel

// ---------- Ballon-d'Or-Gala ----------
function makeGala(place, winner) {
  const rival = S.rival && S.rival.name;
  const stars = (S.bdStars || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0)).map(s => s.name);
  const pool = [...stars, rival, randomName(), randomName()].filter((x, i, a) => x && a.indexOf(x) === i && x !== winner);
  const top = [];
  if (place === 1) top.push(S.player.name);
  else top.push(winner || pool.shift());
  while (top.length < 3) {
    if (place === top.length + 1) top.push(S.player.name);
    else top.push(pool.shift() || randomName());
  }
  // Enthüllt wird von Platz 3 bis Platz 1
  return { place, order: top.slice().reverse(), shown: 0, speech: null, done: false };
}

const GALA_SPEECHES = [
  { label: 'Der Familie danken', run: () => (life().partner ? `„Ohne ${life().partner.name} wäre ich nichts.“ ` : '„Mama, Papa – das ist für euch.“ ') + 'Im Saal werden Taschentücher gezückt.' + mod({ popularity: 3, rel: 10 }) },
  { label: 'Der Mannschaft danken', run: () => '„Fußball ist ein Mannschaftssport. Dieser Preis gehört uns allen.“ Deine Mitspieler jubeln vor den Fernsehern.' + mod({ trust: 6, popularity: 2 }) },
  { label: 'Seitenhieb gegen den Rivalen', run: () => chance(0.5)
    ? `„Ich hoffe, ${S.rival ? S.rival.name : 'mein ewiger Konkurrent'} schaut zu.“ Der Saal lacht, das Internet feiert dich.` + mod({ popularity: 5 })
    : `„Manche brauchen eben mehr Glück.“ Buhrufe im Saal – das kam arrogant rüber.` + mod({ popularity: -4 }) },
];

function galaNext() {
  const g = S.seasonEnd.gala;
  g.shown++;
  if (g.shown === 3) {
    if (g.place === 1) { queueFx('fanfare', 'confetti'); addPhoto('🏅', "Ballon-d'Or-Gala in Paris – der Sieg"); }
    else queueFx('sad');
  }
}

function renderGala(g) {
  const shown = g.order.slice(0, g.shown);
  const all = g.shown >= 3;
  const me = S.player.name;
  const list = `<ol class="gala-list">${g.order.map((n, i) => {
    const rank = 3 - i;
    return i < g.shown
      ? `<li class="${n === me ? 'me' : ''} ${rank === 1 ? 'first' : ''}"><span>Platz ${rank}</span><b>${esc(n)}${n === me ? ' (du)' : ''}</b></li>`
      : `<li class="hidden"><span>Platz ${rank}</span><b>✉️ ?</b></li>`;
  }).join('')}</ol>`;
  let action;
  if (!all) action = btn(g.shown === 0 ? 'Den ersten Umschlag öffnen' : g.shown === 1 ? 'Platz 2 enthüllen' : 'Und der Ballon d\'Or geht an …', () => { galaNext(); render(true); }, 'primary');
  else if (g.place === 1 && !g.speech) action = `<p><b>Du gehst auf die Bühne. Was sagst du in deiner Rede?</b></p><div class="choices">${GALA_SPEECHES.map((sp, i) => btn(sp.label, () => { g.speech = GALA_SPEECHES[i].run(); render(true); })).join('')}</div>`;
  else if (g.place !== 1 && !g.speech) action = `<div class="choices">${btn('Applaudieren', () => { g.speech = 'Du stehst auf und applaudierst. Fair – die Kameras fangen es ein.' + mod({ popularity: 2 }); render(true); })}${btn('Wütend die Gala verlassen', () => { g.speech = 'Du verlässt den Saal noch vor dem Dessert. Die Schlagzeilen am nächsten Morgen sind nicht nett.' + mod({ popularity: -3, form: 1 }); render(true); })}</div>`;
  else action = `<div class="result"><p>${g.speech}</p></div><div class="actions">${btn('Weiter zur Saisonbilanz', () => { g.done = true; render(); }, 'primary')}</div>`;
  return `
  <section class="card gala">
    <div class="gala-head"><small>PARIS · THÉÂTRE DU CHÂTELET</small><h2>🏅 Die Ballon-d'Or-Gala</h2>
      <p>Smoking, Blitzlichtgewitter, die Stars der Fußballwelt. ${g.place > 3 ? `Du bist nominiert und landest auf Platz ${g.place}. Jetzt werden die ersten drei enthüllt.` : 'Du bist unter den letzten drei!'}</p></div>
    ${list}
    ${all && shown[2] === me ? '<p class="gala-win">🎉 DU BIST DER BESTE FUSSBALLER DER WELT!</p>' : ''}
    ${action}
  </section>`;
}

// ---------- Videospiel-Wertung ----------
function videoGameRating() {
  const p = S.player;
  const h = S.history[S.history.length - 1];
  const form = h && h.note !== null && h.note !== undefined ? (3 - h.note) * 1.5 : 0;
  const r = clamp(Math.round(p.rating + (p.popularity - 50) / 25 + form), 40, 99);
  const old = S.vg ? S.vg.rating : null;
  S.vg = { rating: r, year: S.year, old, reacted: false, title: `KICK ${String((S.year + 1) % 100).padStart(2, '0')}` };
}

function reactRating(kind) {
  const v = S.vg;
  v.reacted = true;
  if (kind === 'share') {
    addFollowers({ mul: 1.04, add: 500 });
    v.msg = 'Du postest deine Spielerkarte. Die Fans kommentieren fleißig.' + mod({ popularity: 1 });
  } else if (v.old !== null && v.rating < v.old) {
    if (chance(0.5)) { v.rating++; v.msg = 'Die Entwickler lenken ein: Mit dem nächsten Update bekommst du +1!' + mod({ popularity: 2 }); }
    else v.msg = '„Heul doch“, schreiben die Leute unter deinen Post. Die Wertung bleibt.' + mod({ popularity: -2 });
  } else v.msg = 'Du beschwerst dich – obwohl du gar nicht schlechter geworden bist. Das Internet lacht dich aus.' + mod({ popularity: -3 });
}

function renderGameRating() {
  const v = S.vg;
  if (!v || v.year !== S.year) return '';
  const d = v.old === null ? null : v.rating - v.old;
  return `
  <section class="card vgame">
    <div class="vg-row"><div class="vg-badge">${v.rating}</div>
      <div><b>🎮 ${esc(v.title)}: deine neue Wertung</b>
        <p>${d === null ? `Du bist zum ersten Mal im Videospiel – mit einer Wertung von ${v.rating}!` : d > 0 ? `${v.old} → ${v.rating} – ein Upgrade um ${d}!` : d < 0 ? `${v.old} → ${v.rating} – abgewertet um ${-d}.` : `Unverändert bei ${v.rating}.`}</p></div></div>
    ${v.reacted ? `<div class="result"><p>${v.msg}</p></div>` : `<div class="choices">${btn('Freuen und teilen', () => { reactRating('share'); render(true); })}${btn('Öffentlich beschweren', () => { reactRating('complain'); render(true); })}</div>`}
  </section>`;
}

// ---------- Weihnachten und Silvester ----------
const inDecember = () => S.season && S.season.step === 2;
const HOLIDAY_EVENTS = [
  {
    id: 'xmasFamily', title: 'Weihnachten',
    cond: () => inDecember(), weight: () => 5,
    text: () => 'Weihnachten steht vor der Tür. Du hast drei freie Tage – aber der Fitnesstrainer gibt dir einen Plan mit, „damit du nicht aus dem Leim gehst“.',
    options: [
      { label: 'Ab nach Hause zur Familie', run: () => { addPhoto('🎄', 'Weihnachten zu Hause'); return 'Omas Plätzchen, alte Freunde, dein Kinderzimmer. Du kommst mit vollem Herzen – und zwei Kilo mehr – zurück.' + mod({ form: 1, injuryProne: -1, rel: 5 }); } },
      { label: 'Durchtrainieren', run: () => 'Während alle Gans essen, läufst du durch den Schnee. Der Trainer ist beeindruckt.' + mod({ devBonus: 0.6, trust: 2, form: -1 }) },
      { label: 'Kurzurlaub in der Sonne', run: () => 'Strand statt Schnee. Die Fotos gefallen nicht allen Fans.' + mod({ form: 2, popularity: -1, money: -0.02 }) },
    ],
  },
  {
    id: 'xmasGifts', title: 'Geschenke für die Mannschaft',
    cond: () => inDecember() && !S.youth, weight: () => 4,
    text: () => 'Bei der Weihnachtsfeier der Mannschaft ist es Tradition, dass die Großverdiener Geschenke mitbringen.',
    options: [
      { label: 'Für alle teure Kopfhörer', run: () => 'Die Kabine liebt dich. Sogar der Zeugwart hat Tränen in den Augen.' + mod({ trust: 4, money: -Math.min(0.08, Math.max(0.01, S.money * 0.02)) }) },
      { label: 'Selbstgemachte Fotokalender', run: () => 'Zwölf Monate mit deinem Gesicht. Die Mitspieler lachen sich schlapp – und hängen ihn trotzdem auf.' + mod({ trust: 2, popularity: 1 }) },
      { label: 'Nichts mitbringen', run: () => 'Du bist der Einzige mit leeren Händen. Peinlich.' + mod({ trust: -3 }) },
    ],
  },
  {
    id: 'boxingDay', title: 'Boxing Day',
    cond: () => inDecember() && !S.youth && clubLeague(S.clubId).id === 'pl', weight: () => 6,
    text: () => 'In England ruht der Ball an Weihnachten nicht: Am 26. Dezember ist Boxing Day, das Stadion ist voll mit Fans in Weihnachtspullis. Deine Familie feiert ohne dich.',
    options: [
      { label: 'Mit Weihnachtsmütze aufwärmen', run: () => 'Die Fans singen „Jingle Bells“ mit deinem Namen. Du schießt die Mannschaft warm.' + mod({ popularity: 4, form: 1 }) },
      { label: 'Videoanruf mit der Familie in der Kabine', run: () => 'Ein kurzer Anruf, ein paar Tränen – dann bist du voll da.' + mod({ form: 2, rel: 5 }) },
    ],
  },
  {
    id: 'newYear', title: 'Silvester',
    cond: () => inDecember(), weight: () => 4,
    text: () => 'Silvester! Ein Mitspieler lädt zur Party auf seine Yacht ein, deine Familie zum Raclette – und am 2. Januar ist schon wieder Training.',
    options: [
      { label: 'Yacht-Party', run: () => chance(0.6)
        ? 'Feuerwerk über dem Meer, die beste Nacht des Jahres!' + mod({ popularity: 2, trust: 1 })
        : 'Ein Video von dir mit Wunderkerze und Sonnenbrille um 4 Uhr morgens geht viral.' + mod({ popularity: -2, form: -2, trust: -2 }) },
      { label: 'Raclette mit der Familie', run: () => 'Gemütlich, lecker, um halb eins im Bett. Perfekt.' + mod({ form: 1, rel: 5 }) },
      { label: 'Gute Vorsätze schreiben und früh schlafen', run: () => '„Mehr Tore, weniger Handy.“ Du startest topfit ins neue Jahr.' + mod({ form: 2, devBonus: 0.3 }) },
    ],
  },
];
EVENTS.push(...HOLIDAY_EVENTS);

// ---------- Medizincheck beim Wechsel ----------
function medicalCheck(o) {
  if (o.loan || o.medDone || S.youth) return false;
  const big = o.fee >= 15 || clubStr(o.club) >= 82;
  if (!big) return false;
  o.medDone = true;
  const p = S.player;
  const risk = 0.05 + p.injuryProne / 160 + (p.age >= 30 ? 0.06 : 0);
  if (!chance(risk)) return false;
  const part = pick(['am Knie', 'am Sprunggelenk', 'am Rücken', 'im Oberschenkel', 'an der Leiste']);
  const offers = S.offers;
  if (chance(0.45)) {
    offers.list = offers.list.filter(x => x !== o);
    offers.msgs.unshift(`🩺 Medizincheck bei ${o.club}: auffälliger Befund ${part}. ${o.club} zieht das Angebot zurück. Wähle ein anderes Angebot.`);
    setHeadline(`GEPLATZT! ${lastName()}-WECHSEL SCHEITERT AM MEDIZINCHECK`);
  } else {
    o.salary *= 0.75; o.signing *= 0.5; o.years = Math.min(o.years, 2); o.medNote = true;
    offers.msgs.unshift(`🩺 Medizincheck bei ${o.club}: kleiner Befund ${part}. ${o.club} will dich trotzdem – aber nur noch für ${money(o.salary)} pro Jahr und höchstens 2 Jahre. Tippe erneut auf „Wechseln“, wenn du einverstanden bist.`);
  }
  return true;
}
