'use strict';

// Ballon-d'Or-Konkurrenten, Kettenszenen, Szenen passend zum Spielstand, VAR-Drama

// ---------- Konkurrenten um den Ballon d'Or ----------
function newStar(young) {
  const clubs = Object.keys(S.clubs).filter(n => clubStr(n) >= 84);
  const nats = NATIONS.filter(n => n.str >= 80);
  return {
    name: randomName(), nation: pick(nats).name, club: pick(clubs),
    age: young ? randInt(19, 21) : randInt(21, 29), rating: young ? randInt(85, 88) : randInt(87, 93) + (S.diff === 'world' ? 2 : 0),
    ballon: 0, year: S.year,
  };
}
function ballonStars() {
  if (!S.bdStars) S.bdStars = Array.from({ length: 4 }, () => newStar(false));
  return S.bdStars;
}

// Einmal pro Saison: Stars entwickeln sich, wechseln, hören auf. Gibt den stärksten Konkurrenten zurück.
function ballonContest() {
  const stars = ballonStars();
  stars.forEach((s, i) => {
    if (s.year === S.year) return;
    s.year = S.year; s.age++;
    s.rating = clamp(s.rating + (s.age <= 26 ? rand(0, 2) : s.age <= 30 ? rand(-1, 1) : -rand(1, 3)), 75, 97);
    if (chance(0.15)) s.club = pick(Object.keys(S.clubs).filter(n => clubStr(n) >= 84));
    if (s.age >= 35 || s.rating < 82) stars[i] = newStar(true);
  });
  stars.forEach(s => { s.score = s.rating + rand(0, 4) + (S.diff === 'world' ? 1.5 : 0); });
  return stars.slice().sort((a, b) => b.score - a.score)[0];
}

function renderBallonRace() {
  if (S.youth || !S.bdStars) return '';
  const me = { name: S.player.name, nation: S.player.nation, club: S.clubId, rating: Math.round(S.player.rating), ballon: S.awards.filter(a => a.startsWith("Ballon d'Or")).length, me: true };
  const rows = [...S.bdStars.map(s => ({ ...s, rating: Math.round(s.rating) })), me].sort((a, b) => b.rating - a.rating);
  return `
  <section class="card">
    <h2>🏅 Kampf um den Ballon d'Or</h2>
    <p class="muted">Die größten Stars der Welt – sie wollen den Ballon d'Or genauso wie du.</p>
    <ul class="lines stars-race">${rows.map(r => `<li class="${r.me ? 'me' : ''}">${crest(r.club)} <b>${esc(r.name)}${r.me ? ' (du)' : ''}</b>
      <span class="muted">${esc(r.nation)} · ${esc(r.club)} · Stärke ${r.rating}${r.ballon ? ` · ${r.ballon}× 🏅` : ''}</span></li>`).join('')}</ul>
  </section>`;
}

// ---------- Kettenszenen ----------
// Ein gelungenes Dribbling führt zu einer zweiten Entscheidung
function chainStart(i) {
  const c = S.current, o = c.options[i];
  if (o.kind !== 'goal' || !o.bonus || c.chained || S.youth || !chance(0.6)) return false;
  c.chained = true;
  if (!chance(clamp(o.p + 0.18, 0.1, 0.9))) { c.forceFail = true; return false; }
  const q = quality();
  c.situation = pick([
    'Du lässt den ersten Gegner stehen, dann den zweiten! Plötzlich bist du allein im Strafraum – noch eine Entscheidung:',
    'Übersteiger, Haken – der Verteidiger liegt am Boden! Der Torwart kommt dir entgegen. Was jetzt?',
    'Du tanzt durch die Abwehr, das Stadion steht! Rechts läuft ein Mitspieler mit. Jetzt zählt es:',
  ]);
  c.options = [
    { label: 'Eiskalt abschließen', kind: 'goal', p: clamp(0.5 + q * 0.25, 0.1, 0.9), okText: ['Flach ins Eck – unhaltbar!', 'Du schiebst den Ball cool am Torwart vorbei!'], failText: 'Der Torwart wirft sich in deinen Schuss.' },
    { label: 'Querlegen auf den freien Mitspieler', kind: 'assist', p: clamp(0.65 + q * 0.15, 0.1, 0.92), okText: 'Du legst quer, dein Mitspieler muss nur noch einschieben!', failText: 'Ein Verteidiger grätscht im letzten Moment dazwischen.' },
    { label: 'Den Torwart auch noch umkurven', kind: 'goal', bonus: true, p: clamp(0.3 + q * 0.3, 0.05, 0.85), okText: ['Du umkurvst auch noch den Torwart und schiebst ins leere Tor. Was für ein Solo!'], failText: 'Der Torwart spitzelt dir den Ball vom Fuß. Zu verspielt!' },
  ];
  return true;
}

// ---------- Szenen passend zum Spielstand und VAR ----------
function lateScene(c) {
  if (S.youth || c.drama) return;
  const q = quality(), gk = POSITIONS[S.player.pos].group === 'gk';
  if (!gk && chance(0.07)) {
    c.var = true;
    c.situation = `${c.minute}. Minute. Du triffst! Du drehst jubelnd ab – doch der Schiri hält sich die Hand ans Ohr. 📺 VAR-Check: Stand dein Fuß im Abseits?`;
    c.options = [
      { label: 'Ruhig abwarten', kind: 'var', p: 0.6 },
      { label: 'Zum Schiri laufen und diskutieren', kind: 'var', p: 0.62, argue: true },
      { label: 'Schon mal mit den Fans feiern', kind: 'var', p: 0.6, party: true },
    ];
    return;
  }
  if (!chance(0.3)) return;
  c.minute = randInt(88, 90);
  if (c.a > c.b) {
    c.situation = `${c.minute}. Minute, ihr führt ${c.a}:${c.b}. Die Gegner werfen alles nach vorne. Du hast den Ball – jetzt nur nichts mehr anbrennen lassen.`;
    c.options = [
      { label: 'Ball an der Eckfahne festmachen', kind: 'safe', p: clamp(0.6 + q * 0.25, 0.1, 0.92), okText: 'Du schirmst den Ball ab, holst Einwurf um Einwurf heraus – die Zeit läuft ab!', failText: 'Der Verteidiger spitzelt dir den Ball weg, Konter – der Ausgleich!' },
      { label: 'Den Konter selbst laufen', kind: 'goal', p: clamp(0.28 + q * 0.3, 0.05, 0.9), okText: 'Du rennst allein aufs Tor zu und machst den Deckel drauf!', failText: 'Der Torwart pariert – aber die Uhr ist fast abgelaufen.' },
      { label: 'Lange am Boden liegen bleiben', kind: 'safe', p: 0.5, okText: 'Pfiffe von den Rängen, aber wertvolle Sekunden sind weg. Abpfiff!', failText: 'Der Schiri lässt nachspielen – und in der Nachspielzeit fällt der Ausgleich.' },
    ];
  } else if (c.b > c.a && gk) {
    c.situation = `${c.minute}. Minute, ihr liegt ${c.a}:${c.b} hinten. Letzte Ecke! Der Trainer winkt hektisch: Du sollst als Torwart mit nach vorne!`;
    c.options = [
      { label: 'Zum Kopfball hochsteigen', kind: 'goal', bonus: true, p: clamp(0.1 + q * 0.15, 0.05, 0.4), okText: 'DER TORWART KÖPFT DEN AUSGLEICH! Das Stadion explodiert!', failText: 'Knapp drüber! Jetzt schnell zurück ins Tor.' },
      { label: 'Am Elfmeterpunkt lauern', kind: 'goal', p: clamp(0.12 + q * 0.12, 0.05, 0.4), okText: 'Der Abpraller fällt dir vor die Füße – drin! Der Torwart trifft!', failText: 'Der Ball kommt nie bei dir an.' },
      { label: 'Doch lieber im Tor bleiben', kind: 'safe', p: 0.8, okText: 'Du bleibst hinten. Es bleibt bei der knappen Niederlage – aber wenigstens kein Gegentor mehr.', failText: 'Konter über das halbe Feld – noch ein Gegentor.' },
    ];
  } else if (c.b > c.a) {
    c.situation = `${c.minute}. Minute, ihr liegt ${c.a}:${c.b} hinten. Alles nach vorne – sogar euer Torwart rennt mit in den Strafraum!`;
    c.options = [
      { label: 'Flanke auf den mitgelaufenen Torwart', kind: 'assist', p: clamp(0.25 + q * 0.2, 0.05, 0.7), okText: 'Euer Torwart steigt am höchsten und köpft ein! Wahnsinn!', failText: 'Die Flanke segelt ins Aus. Abpfiff.' },
      { label: 'Selbst aus 25 Metern abziehen', kind: 'goal', p: clamp(0.15 + q * 0.3, 0.05, 0.7), okText: 'Aus 25 Metern in den Winkel – in letzter Sekunde!', failText: 'Drüber. Das war die letzte Chance.' },
      { label: 'Ins Dribbling in den Strafraum', kind: 'goal', bonus: true, p: clamp(0.2 + q * 0.3, 0.05, 0.75), okText: ['Du setzt dich gegen drei Mann durch und triffst. Was für ein Solo!'], failText: 'Du bleibst hängen. Der Schiri pfeift ab.' },
    ];
  }
}

// VAR-Entscheidung: Tor zählt oder wird zurückgenommen
function resolveVar(c, o, us, them) {
  const counts = chance(o.p);
  const eff = counts ? { form: 3, trust: 2, popularity: 4, goals: 1 } : { form: -1 };
  let text;
  if (counts) {
    us++;
    text = `Minutenlanges Warten … dann zeigt der Schiri zur Mitte: Das Tor zählt! ${goalCry()}`;
    if (o.party) { text += ' Und du hattest schon längst mit den Fans gefeiert.'; eff.popularity += 2; }
  } else {
    text = 'Die Linie wird gezogen … eine Zehenspitze im Abseits. Das Tor wird zurückgenommen!';
    if (o.party) { text += ' Peinlich – du hattest schon mit den Fans gefeiert. Die Bilder gehen viral.'; eff.popularity = -3; }
  }
  if (o.argue) {
    if (chance(0.4)) { text += ' Wegen deines Protests siehst du Gelb.'; eff.trust = (eff.trust || 0) - 2; }
    else text += ' Der Schiri hört dir sogar zu.';
  }
  return { us, them, text: `${text} Endstand ${us}:${them}.`, eff };
}
