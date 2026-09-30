'use strict';

// Eigene Firmen und Vereinskauf

const BUSINESS_TYPES = [
  { id: 'academy', name: 'Fußballschule', cost: 0.2, min: 0, max: 0.12, fail: 0.02, pop: 4 },
  { id: 'restaurant', name: 'Restaurant', cost: 0.3, min: -0.05, max: 0.18, fail: 0.05, pop: 1 },
  { id: 'fashion', name: 'Modemarke', cost: 0.5, min: -0.25, max: 0.45, fail: 0.08, pop: 3 },
  { id: 'esports', name: 'E-Sport-Team', cost: 1.5, min: -0.35, max: 0.6, fail: 0.1, pop: 2 },
  { id: 'gym', name: 'Fitnessstudio-Kette', cost: 3, min: -0.1, max: 0.25, fail: 0.04, pop: 1 },
  { id: 'hotel', name: 'Hotel', cost: 8, min: -0.05, max: 0.15, fail: 0.03, pop: 1 },
];
const bizType = id => BUSINESS_TYPES.find(b => b.id === id);
function businesses() { if (!S.businesses) S.businesses = []; return S.businesses; }

// Gewinne und Pleiten am Saisonende; gibt den Gesamtgewinn zurück
function businessSeason(res) {
  let total = 0;
  for (const b of businesses().slice()) {
    const t = bizType(b.type);
    if (chance(t.fail)) {
      S.businesses = S.businesses.filter(x => x !== b);
      res.lines.push(`📉 Deine Firma „${t.name}“ ist pleite. Das investierte Geld ist weg.`);
      continue;
    }
    const profit = b.value * rand(t.min, t.max);
    b.value = Math.max(0.01, b.value * rand(0.95, 1.18));
    b.last = profit;
    total += profit;
  }
  S.money += total;
  return total;
}

function renderBusiness() {
  const list = businesses();
  const owned = list.map((b, i) => {
    const t = bizType(b.type);
    const investCost = b.value * 0.5;
    return `<div class="shopitem"><div><strong>${esc(t.name)}</strong><small>Wert ${money(b.value)}${b.last !== undefined ? ` · letzte Saison ${b.last >= 0 ? '+' : ''}${money(b.last)}` : ''}</small></div>
      <div class="shopbtns">
        ${btn('Ausbauen', () => { if (S.money < investCost) return; S.money -= investCost; b.value *= 1.6; S.bizMsg = `Du steckst ${money(investCost)} in „${t.name}“.`; render(true); }, S.money >= investCost ? 'small' : 'small disabled')}
        ${btn('Verkaufen', () => { S.money += b.value; S.businesses.splice(i, 1); S.bizMsg = `„${t.name}“ für ${money(b.value)} verkauft.`; render(true); }, 'small')}
      </div></div>`;
  }).join('');
  const available = BUSINESS_TYPES.filter(t => !list.some(b => b.type === t.id)).map(t => {
    const can = S.money >= t.cost;
    return `<div class="shopitem"><div><strong>${esc(t.name)}</strong><small>Gründung ${money(t.cost)} · ${t.max >= 0.4 ? 'hohes Risiko, hohe Gewinne' : t.min >= 0 ? 'sicher, kleine Gewinne' : 'mittleres Risiko'}</small></div>
      <div class="shopbtns">${btn('Gründen', () => {
        if (!can) return;
        S.money -= t.cost;
        businesses().push({ type: t.id, value: t.cost });
        S.player.popularity = clamp(S.player.popularity + t.pop, 0, 100);
        S.bizMsg = `Du gründest „${t.name}“. Viel Erfolg!`;
        render(true);
      }, can ? 'small' : 'small disabled')}</div></div>`;
  }).join('');
  return `
  <section class="card">
    <details${S.bizMsg ? ' open' : ''}><summary>Deine Firmen · ${list.length ? `${list.length} ${list.length === 1 ? 'Firma' : 'Firmen'}` : 'noch keine'}</summary>
      ${S.bizMsg ? `<div class="result">${esc(S.bizMsg)}</div>` : ''}
      ${owned ? `<h3>Im Besitz</h3><div class="shop">${owned}</div>` : ''}
      ${available ? `<h3>Gründen</h3><div class="shop">${available}</div>` : ''}
      <p class="muted">Firmen werfen jede Saison Gewinn oder Verlust ab und können pleitegehen.</p>
    </details>
  </section>`;
}

// ---------- Vereinskauf ----------
const clubPrice = n => 4 * Math.exp((clubStr(n) - 60) / 5.5);

function renderClubPurchase() {
  const affordable = Object.keys(S.clubs).filter(n => clubPrice(n) <= S.money);
  if (!affordable.length) {
    const cheapest = Math.min(...Object.keys(S.clubs).map(clubPrice));
    return `<section class="card"><h2>Eigenen Verein kaufen</h2><p class="muted">Der günstigste Verein kostet ${money(cheapest)}. Dafür reicht dein Vermögen (${money(S.money)}) nicht.</p></section>`;
  }
  const former = affordable.filter(n => S.clubsPlayed.includes(n));
  const others = affordable.filter(n => !former.includes(n)).sort((a, b) => clubStr(b) - clubStr(a)).slice(0, 6);
  const rows = [...former, ...others].map(n => `
    <div class="offer">${crest(n)}
      <div class="offer-info"><strong>${esc(n)}</strong><small>${esc(clubLeague(n).name)} · Stärke ${clubStr(n)} · ${money(clubPrice(n))}${former.includes(n) ? ' · dein Ex-Verein' : ''}</small></div>
      ${btn('Kaufen', () => { buyClub(n); render(); }, 'primary small')}
    </div>`).join('');
  return `
  <section class="card">
    <h2>Eigenen Verein kaufen</h2>
    <p>Mit deinem Vermögen kannst du einen Verein übernehmen und als Präsident groß machen.</p>
    <div class="offers">${rows}</div>
  </section>`;
}

function buyClub(n) {
  const price = clubPrice(n);
  S.money -= price;
  S.owner = { club: n, boughtFor: price, invest: 'none', tickets: 'normal', seasons: [], titles: [], last: null };
  S.phase = 'owner';
}

function ownerSeason() {
  const o = S.owner, club = o.club, L = clubLeague(club);
  const value = clubPrice(club);
  const investAmt = Math.min(Math.max(0, S.money), { none: 0, small: value * 0.1, big: value * 0.3 }[o.invest]);
  S.money -= investAmt;
  S.clubs[club].base += (investAmt / Math.max(1, value)) * 12;
  const ticketF = { cheap: 0.7, normal: 1, high: 1.35 }[o.tickets];
  const fanBonus = o.tickets === 'cheap' ? 0.05 : o.tickets === 'high' ? -0.04 : 0;
  const europe = europeFor(club);
  const tables = worldSeason(club, fanBonus);
  const rows = tables[L.id].rows;
  const pos = rows.findIndex(r => r.name === club) + 1;
  const lines = [`${L.name}: ${club} wird ${pos}. von ${rows.length}.`];
  const titles = [];
  if (pos === 1) titles.push(L.champion);
  const comps = managerCups(club, clubStr(club), europe, lines, titles);
  const revenue = value * 0.05 * ticketF + titles.length * value * 0.03 + (comps.europe ? value * 0.02 : 0);
  const costs = value * rand(0.03, 0.06);
  const profit = revenue - costs;
  S.money += profit;
  lines.push(`Finanzen: Einnahmen ${money(revenue)}, Kosten ${money(costs)}, Investition ${money(investAmt)}.`);
  titles.forEach(t => { lines.push(`🏆 ${t}!`); o.titles.push(`${t} (${seasonLabel(S.year)})`); });
  o.seasons.push({ year: S.year, pos, teams: rows.length, league: L.name, titles: titles.length, profit: profit - investAmt });
  o.last = { lines, table: rows.map(r => ({ name: r.name, pts: r.pts })) };
  S.year++;
  S.player.age++;
}

function renderOwner() {
  const o = S.owner, club = o.club, L = clubLeague(club);
  const choice = (key, val, label) => btn(label, () => { o[key] = val; render(true); }, o[key] === val ? 'small chosen-focus' : 'small');
  const value = clubPrice(club);
  return `
  <section class="card">
    <h2>Präsident von ${esc(club)}</h2>
    <p class="clubline">${crest(club)} ${esc(L.name)} · Stärke ${clubStr(club)} · Vereinswert ${money(value)}</p>
    <ul class="facts">
      <li><span>Saison</span><b>${seasonLabel(S.year)}</b></li>
      <li><span>Dein Alter</span><b>${S.player.age} Jahre</b></li>
      <li><span>Dein Vermögen</span><b class="${S.money < 0 ? 'down' : ''}">${money(S.money)}</b></li>
      <li><span>Titel als Präsident</span><b>${o.titles.length}</b></li>
    </ul>
    ${o.last ? `<h3>Letzte Saison</h3><ul class="lines">${o.last.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    <h3>Investition in die Mannschaft</h3>
    <div class="lifeacts">${choice('invest', 'none', 'Keine')}${choice('invest', 'small', `Klein (${money(value * 0.1)})`)}${choice('invest', 'big', `Groß (${money(value * 0.3)})`)}</div>
    <h3>Ticketpreise</h3>
    <div class="lifeacts">${choice('tickets', 'cheap', 'Günstig – Fans jubeln')}${choice('tickets', 'normal', 'Normal')}${choice('tickets', 'high', 'Teuer – mehr Geld')}</div>
    <div class="actions">
      ${btn('Saison spielen', () => { ownerSeason(); render(); }, 'primary')}
      ${btn(`Verein verkaufen (${money(value)})`, () => {
        S.money += value;
        S.after = `${S.after ? S.after + ' ' : ''}Als Präsident von ${club} holst du ${o.titles.length} Titel in ${o.seasons.length} ${o.seasons.length === 1 ? 'Saison' : 'Saisons'} und verkaufst den Verein für ${money(value)}.`;
        S.ownerDone = { club, titles: o.titles.slice(), seasons: o.seasons.length };
        S.owner = null;
        S.phase = 'retired';
        saveHallOfFame();
        render();
      }, 'danger')}
    </div>
  </section>
  ${o.seasons.length ? `<section class="card"><h3>Bilanz als Präsident</h3><div class="scroll"><table>
    <thead><tr><th>Saison</th><th>Liga</th><th>Platz</th><th>Titel</th><th>Gewinn</th></tr></thead>
    <tbody>${o.seasons.map(s => `<tr><td>${seasonLabel(s.year)}</td><td class="club">${esc(s.league)}</td><td>${s.pos}.</td><td>${s.titles ? '🏆'.repeat(Math.min(4, s.titles)) : ''}</td><td class="${s.profit >= 0 ? 'up' : 'down'}">${money(s.profit)}</td></tr>`).join('')}</tbody>
  </table></div></section>` : ''}`;
}
