'use strict';

// Übersicht für Einsteiger: Reiter, Hilfe und Tipps

let uiTab = 'main';
let uiLastPhase = null;
let uiHelp = false;

function hubTabs() {
  return [
    ['main', S.phase === 'preseason' ? '⚽' : '✍️', S.phase === 'preseason' ? 'Saison' : 'Transfers'],
    ['life', '❤️', 'Privat'],
    ['people', '👪', 'Familie'],
    ['money', '💰', 'Geld'],
    ['career', '📋', 'Karriere'],
  ];
}

// Einklappbare Karten in einem Reiter immer geöffnet anzeigen
const openAll = html => html.replace(/<details(?![^>]*\bopen\b)/g, '<details open');

function renderHub() {
  if (S.phase !== uiLastPhase) { uiTab = 'main'; uiLastPhase = S.phase; }
  const tabs = hubTabs().map(([k, icon, label]) => btn(`<span class="ti">${icon}</span>${label}`, () => { uiTab = k; render(true); }, `tab ${uiTab === k ? 'active' : ''}`)).join('');
  let content;
  if (uiTab === 'life') content = renderLife();
  else if (uiTab === 'people') content = renderPeople();
  else if (uiTab === 'money') content = renderMoneyOverview() + renderBusiness() + renderShop();
  else if (uiTab === 'career') content = renderHistory() || '<section class="card"><p class="muted">Dein Karriereverlauf erscheint hier nach der ersten Saison.</p></section>';
  else content = S.phase === 'preseason' ? renderPreseason() : renderTransfer();
  return `<nav class="tabs" aria-label="Bereiche">${tabs}</nav>${uiTab === 'main' ? tip(S.phase) : ''}${openAll(content)}`;
}

function renderMoneyOverview() {
  const c = S.contract;
  return `
  <section class="card">
    <h2>Deine Finanzen</h2>
    <ul class="facts">
      <li><span>Vermögen</span><b class="${S.money < 0 ? 'down' : ''}">${money(S.money)}</b></li>
      <li><span>Gehalt pro Jahr (brutto)</span><b>${money(c.salary)}</b></li>
      <li><span>Marktwert</span><b>${money(marketValue())}</b></li>
      <li><span>Bisher netto verdient</span><b>${money(S.earned)}</b></li>
      ${S.agent ? '<li><span>Berater</span><b>Topberater (10 % Provision)</b></li>' : ''}
    </ul>
    <p class="muted">Vom Gehalt gehen 45 % Steuern ab. Besitz kostet jedes Jahr Unterhalt, Firmen können Gewinn oder Verlust machen.</p>
  </section>`;
}

// ---------- Tipps für die ersten Saisons ----------
const TIPS = {
  academy: 'Wähle einen Verein für deine Jugendzeit. Stärkere Vereine sind besser für den Ruf, bei schwächeren kommst du schneller zu den Profis.',
  preseason: 'Wähle einen Trainingsschwerpunkt und drücke auf „Saison starten“. Eine Saison hat 6 Stationen: 3 Entscheidungen und 3 Spielszenen. In den Reitern oben verwaltest du Privatleben, Familie und Geld.',
  event: 'Bei Entscheidungen gibt es keine perfekte Antwort. Die farbigen Kästchen danach zeigen dir, was sich verändert hat: grün ist gut, rot ist schlecht.',
  match: 'Die Prozentzahl unter jeder Option ist deine Erfolgschance. Sie steigt mit deiner Stärke und deiner Form.',
  seasonEnd: 'Hier siehst du deine Saison. Deine Stärke wächst vor allem, solange du jung bist und viel spielst.',
  transfer: 'Als junger Spieler ist Spielzeit wichtiger als Geld: Achte auf „Mehr Spielzeit“ und die Rolle „Stammspieler“. Später kannst du zu größeren Vereinen wechseln.',
};
function tipsActive() {
  return S && !S.hideTips && S.history && S.history.filter(h => !h.youth).length < 3;
}
function tip(key) {
  if (!tipsActive() || !TIPS[key]) return '';
  return `<aside class="tip"><b>💡 Tipp</b><p>${esc(TIPS[key])}</p>${btn('Tipps ausblenden', () => { S.hideTips = true; render(true); }, 'small link')}</aside>`;
}

// ---------- Hilfe ----------
const HELP = [
  ['🎯 Ziel', 'Werde vom 17-jährigen Talent zur Legende. Sammle Tore, Titel und Auszeichnungen – oder genieße einfach das Leben als Profi.'],
  ['📅 So läuft eine Saison', 'Vor der Saison wählst du einen Trainingsschwerpunkt. Dann kommen 6 Stationen: abwechselnd eine Entscheidung und eine Spielszene. Danach siehst du deine Saisonbilanz und kommst ins Transferfenster.'],
  ['⭐ Stärke', 'Die große Zahl auf deiner Karte (bis 99). Sie steigt, wenn du jung bist, viel spielst und gut trainierst. Ab etwa 30 Jahren sinkt sie langsam.'],
  ['📈 Form', 'Wie gut du gerade drauf bist. Gute Form bringt mehr Tore und bessere Chancen in Spielszenen.'],
  ['🤝 Vertrauen', 'Wie sehr der Trainer auf dich setzt. Mit viel Vertrauen spielst du öfter.'],
  ['📣 Beliebtheit', 'Wie sehr dich Fans und Medien mögen. Bringt Werbeverträge und bessere Angebote.'],
  ['🧑‍💼 Rollen', 'Stammspieler spielen fast immer, Rotationsspieler manchmal, Ergänzungsspieler selten. Die Rolle hängt von deiner Stärke im Vergleich zum Verein ab.'],
  ['✍️ Transfers', 'Nach jeder Saison bekommst du Angebote. Du kannst bleiben, wechseln oder dich ausleihen lassen. Läuft dein Vertrag aus, wechselst du ablösefrei.'],
  ['💰 Geld', 'Du verdienst Gehalt, Prämien und Werbegeld. Im Reiter „Geld“ kaufst du Autos, Häuser oder gründest Firmen.'],
  ['❤️ Privatleben', 'Im Reiter „Privat“ findest du Partner, machst Dates, heiratest und bekommst Kinder. Ohne Pflege kühlt die Beziehung ab.'],
  ['⚠️ Risiken', 'Partys, Casino und vor allem Doping können deine Karriere zerstören. Doping bringt sofort Stärke, aber wer erwischt wird, wird gesperrt oder muss ins Gefängnis.'],
  ['🏁 Karriereende', 'Ab 33 kannst du aufhören, mit 41 ist Schluss. Danach wirst du Trainer, kaufst einen Verein oder spielst als dein Kind weiter.'],
];
function renderHelp() {
  return `
  <section class="card help">
    <h2>So funktioniert's</h2>
    <div class="helpgrid">${HELP.map(([h, t]) => `<div><h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join('')}</div>
    <div class="actions">${btn('Zurück zum Spiel', () => { uiHelp = false; render(); }, 'primary')}</div>
  </section>`;
}
function toggleHelp() { uiHelp = !uiHelp; render(); }
