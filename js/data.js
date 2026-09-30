'use strict';

// Ligen mit echten Vereinen. Die Stärkewerte (0–99) sind grobe Schätzungen
// und verändern sich im Spielverlauf leicht.
const LEAGUES = [
  {
    id: 'bl', name: 'Bundesliga', country: 'de', cup: 'DFB-Pokal', champion: 'Deutscher Meister',
    cl: 4, el: 2, topScorer: 'Torjägerkanone', scorerBase: 24, top5: true,
    clubs: [
      ['FC Bayern München', 90], ['Borussia Dortmund', 83], ['Bayer 04 Leverkusen', 82], ['RB Leipzig', 81],
      ['Eintracht Frankfurt', 78], ['VfB Stuttgart', 78], ['SC Freiburg', 75], ['TSG Hoffenheim', 74],
      ['VfL Wolfsburg', 73], ['Borussia Mönchengladbach', 73], ['1. FSV Mainz 05', 73], ['SV Werder Bremen', 72],
      ['1. FC Union Berlin', 71], ['FC Augsburg', 70], ['Hamburger SV', 69], ['1. FC Köln', 69],
      ['FC St. Pauli', 68], ['1. FC Heidenheim', 67],
    ],
  },
  {
    id: 'bl2', name: '2. Bundesliga', country: 'de', cup: 'DFB-Pokal', champion: 'Zweitliga-Meister',
    cl: 0, el: 0, topScorer: 'Torschützenkönig der 2. Bundesliga', scorerBase: 18, top5: false,
    clubs: [
      ['FC Schalke 04', 66], ['Hertha BSC', 66], ['VfL Bochum', 66], ['Hannover 96', 65],
      ['Holstein Kiel', 65], ['1. FC Kaiserslautern', 64], ['Fortuna Düsseldorf', 64], ['SC Paderborn 07', 64],
      ['SV Darmstadt 98', 64], ['SV Elversberg', 64], ['Karlsruher SC', 63], ['1. FC Nürnberg', 63],
      ['Arminia Bielefeld', 62], ['1. FC Magdeburg', 62], ['Dynamo Dresden', 61], ['Eintracht Braunschweig', 60],
      ['Preußen Münster', 60], ['SpVgg Greuther Fürth', 60],
    ],
  },
  {
    id: 'pl', name: 'Premier League', country: 'en', cup: 'FA Cup', champion: 'Englischer Meister',
    cl: 5, el: 2, topScorer: 'Torschützenkönig der Premier League', scorerBase: 22, top5: true,
    clubs: [
      ['Manchester City', 89], ['FC Arsenal', 89], ['FC Liverpool', 89], ['FC Chelsea', 86],
      ['Newcastle United', 83], ['Manchester United', 82], ['Tottenham Hotspur', 82], ['Aston Villa', 82],
      ['Brighton & Hove Albion', 79], ['Nottingham Forest', 79], ['Crystal Palace', 79], ['AFC Bournemouth', 78],
      ['FC Brentford', 77], ['FC Fulham', 77], ['West Ham United', 76], ['FC Everton', 76],
      ['Wolverhampton Wanderers', 75], ['Leeds United', 74], ['AFC Sunderland', 74], ['FC Burnley', 72],
    ],
  },
  {
    id: 'laliga', name: 'LaLiga', country: 'es', cup: 'Copa del Rey', champion: 'Spanischer Meister',
    cl: 4, el: 2, topScorer: 'Pichichi', scorerBase: 22, top5: true,
    clubs: [
      ['Real Madrid', 90], ['FC Barcelona', 90], ['Atlético Madrid', 85], ['Athletic Bilbao', 80],
      ['FC Villarreal', 80], ['Real Betis', 79], ['Real Sociedad', 78], ['FC Sevilla', 75],
      ['Celta Vigo', 75], ['FC Valencia', 74], ['CA Osasuna', 74], ['FC Girona', 74],
      ['RCD Mallorca', 73], ['Rayo Vallecano', 73], ['Espanyol Barcelona', 73], ['FC Getafe', 72],
      ['Deportivo Alavés', 72], ['FC Elche', 70], ['UD Levante', 69], ['Real Oviedo', 68],
    ],
  },
  {
    id: 'seriea', name: 'Serie A', country: 'it', cup: 'Coppa Italia', champion: 'Italienischer Meister',
    cl: 4, el: 2, topScorer: 'Capocannoniere', scorerBase: 22, top5: true,
    clubs: [
      ['Inter Mailand', 87], ['SSC Neapel', 86], ['Juventus Turin', 83], ['AC Mailand', 83],
      ['Atalanta Bergamo', 81], ['AS Rom', 81], ['Lazio Rom', 79], ['FC Bologna', 79],
      ['AC Florenz', 77], ['Como 1907', 77], ['FC Turin', 74], ['Udinese Calcio', 73],
      ['CFC Genua', 72], ['Cagliari Calcio', 71], ['Parma Calcio', 71], ['US Sassuolo', 71],
      ['US Lecce', 70], ['Hellas Verona', 70], ['US Cremonese', 69], ['Pisa SC', 68],
    ],
  },
  {
    id: 'ligue1', name: 'Ligue 1', country: 'fr', cup: 'Coupe de France', champion: 'Französischer Meister',
    cl: 3, el: 2, topScorer: 'Torschützenkönig der Ligue 1', scorerBase: 20, top5: true,
    clubs: [
      ['Paris Saint-Germain', 89], ['Olympique Marseille', 82], ['AS Monaco', 81], ['OSC Lille', 79],
      ['Olympique Lyon', 79], ['OGC Nizza', 77], ['RC Lens', 77], ['RC Straßburg', 77],
      ['Stade Rennes', 76], ['Stade Brest', 73], ['FC Toulouse', 73], ['FC Nantes', 72],
      ['AJ Auxerre', 71], ['Paris FC', 70], ['SCO Angers', 69], ['Le Havre AC', 69],
      ['FC Lorient', 69], ['FC Metz', 67],
    ],
  },
  {
    id: 'ered', name: 'Eredivisie', country: 'nl', cup: 'KNVB-Beker', champion: 'Niederländischer Meister',
    cl: 2, el: 1, topScorer: 'Torschützenkönig der Eredivisie', scorerBase: 22, top5: false,
    clubs: [
      ['PSV Eindhoven', 80], ['Feyenoord Rotterdam', 80], ['Ajax Amsterdam', 79], ['AZ Alkmaar', 76],
      ['FC Twente', 73], ['FC Utrecht', 72], ['NEC Nijmegen', 71], ['Go Ahead Eagles', 70],
      ['SC Heerenveen', 69], ['Sparta Rotterdam', 68], ['FC Groningen', 68], ['Fortuna Sittard', 67],
      ['PEC Zwolle', 66], ['Heracles Almelo', 66], ['NAC Breda', 66], ['Excelsior Rotterdam', 65],
      ['FC Volendam', 64], ['Telstar', 63],
    ],
  },
  {
    id: 'port', name: 'Liga Portugal', country: 'pt', cup: 'Taça de Portugal', champion: 'Portugiesischer Meister',
    cl: 2, el: 1, topScorer: 'Torschützenkönig der Liga Portugal', scorerBase: 22, top5: false,
    clubs: [
      ['Sporting Lissabon', 83], ['Benfica Lissabon', 82], ['FC Porto', 82], ['Sporting Braga', 77],
      ['Vitória Guimarães', 72], ['FC Famalicão', 71], ['Gil Vicente', 69], ['Moreirense FC', 68],
      ['GD Estoril Praia', 68], ['Casa Pia AC', 67], ['Rio Ave FC', 67], ['CD Santa Clara', 67],
      ['FC Arouca', 66], ['CD Nacional', 65], ['Estrela Amadora', 64], ['FC Alverca', 64],
      ['AVS Futebol', 63], ['CD Tondela', 63],
    ],
  },
  {
    id: 'aut', name: 'Österreichische Bundesliga', country: 'at', cup: 'ÖFB-Cup', champion: 'Österreichischer Meister',
    cl: 1, el: 1, topScorer: 'Torschützenkönig in Österreich', scorerBase: 18, top5: false,
    clubs: [
      ['FC Red Bull Salzburg', 76], ['SK Sturm Graz', 73], ['SK Rapid Wien', 70], ['FK Austria Wien', 69],
      ['LASK', 68], ['Wolfsberger AC', 67], ['TSV Hartberg', 64], ['SCR Altach', 63],
      ['WSG Tirol', 62], ['SV Ried', 62], ['Grazer AK', 62], ['FC Blau-Weiß Linz', 62],
    ],
  },
  {
    id: 'sui', name: 'Super League', country: 'ch', cup: 'Schweizer Cup', champion: 'Schweizer Meister',
    cl: 1, el: 1, topScorer: 'Torschützenkönig der Super League', scorerBase: 18, top5: false,
    clubs: [
      ['FC Basel', 73], ['BSC Young Boys', 72], ['FC Lugano', 70], ['Servette FC', 69],
      ['FC Zürich', 67], ['FC St. Gallen', 67], ['FC Lausanne-Sport', 67], ['FC Luzern', 66],
      ['FC Sion', 65], ['Grasshopper Club Zürich', 64], ['FC Thun', 64], ['FC Winterthur', 62],
    ],
  },
];

// Auf- und Abstieg zwischen Bundesliga und 2. Bundesliga
const PROMOTION = { upper: 'bl', lower: 'bl2', count: 2 };

const NATIONS = [
  { name: 'Deutschland', str: 86, conf: 'UEFA', country: 'de' },
  { name: 'Österreich', str: 79, conf: 'UEFA', country: 'at' },
  { name: 'Schweiz', str: 79, conf: 'UEFA', country: 'ch' },
  { name: 'Frankreich', str: 89, conf: 'UEFA', country: 'fr' },
  { name: 'Spanien', str: 90, conf: 'UEFA', country: 'es' },
  { name: 'England', str: 88, conf: 'UEFA', country: 'en' },
  { name: 'Italien', str: 83, conf: 'UEFA', country: 'it' },
  { name: 'Portugal', str: 86, conf: 'UEFA', country: 'pt' },
  { name: 'Niederlande', str: 84, conf: 'UEFA', country: 'nl' },
  { name: 'Belgien', str: 82, conf: 'UEFA' },
  { name: 'Kroatien', str: 80, conf: 'UEFA' },
  { name: 'Dänemark', str: 78, conf: 'UEFA' },
  { name: 'Norwegen', str: 79, conf: 'UEFA' },
  { name: 'Türkei', str: 78, conf: 'UEFA' },
  { name: 'Polen', str: 75, conf: 'UEFA' },
  { name: 'Serbien', str: 74, conf: 'UEFA' },
  { name: 'Ukraine', str: 74, conf: 'UEFA' },
  { name: 'Schweden', str: 75, conf: 'UEFA' },
  { name: 'Schottland', str: 73, conf: 'UEFA' },
  { name: 'Tschechien', str: 73, conf: 'UEFA' },
  { name: 'Griechenland', str: 72, conf: 'UEFA' },
  { name: 'Ungarn', str: 72, conf: 'UEFA' },
  { name: 'Albanien', str: 68, conf: 'UEFA' },
  { name: 'Bosnien und Herzegowina', str: 68, conf: 'UEFA' },
  { name: 'Kosovo', str: 66, conf: 'UEFA' },
  { name: 'Argentinien', str: 88, conf: 'CONMEBOL' },
  { name: 'Brasilien', str: 87, conf: 'CONMEBOL' },
  { name: 'Uruguay', str: 80, conf: 'CONMEBOL' },
  { name: 'Kolumbien', str: 80, conf: 'CONMEBOL' },
  { name: 'Ecuador', str: 76, conf: 'CONMEBOL' },
  { name: 'Marokko', str: 81, conf: 'CAF' },
  { name: 'Senegal', str: 78, conf: 'CAF' },
  { name: 'Nigeria', str: 75, conf: 'CAF' },
  { name: 'Elfenbeinküste', str: 75, conf: 'CAF' },
  { name: 'Ghana', str: 72, conf: 'CAF' },
  { name: 'Ägypten', str: 74, conf: 'CAF' },
  { name: 'Kamerun', str: 72, conf: 'CAF' },
  { name: 'Japan', str: 79, conf: 'AFC' },
  { name: 'Südkorea', str: 76, conf: 'AFC' },
  { name: 'Iran', str: 73, conf: 'AFC' },
  { name: 'Australien', str: 72, conf: 'AFC' },
  { name: 'Saudi-Arabien', str: 68, conf: 'AFC' },
  { name: 'USA', str: 77, conf: 'CONCACAF' },
  { name: 'Mexiko', str: 76, conf: 'CONCACAF' },
  { name: 'Kanada', str: 74, conf: 'CONCACAF' },
];

const CONTINENTAL = {
  UEFA: { name: 'Europameisterschaft', title: 'Europameister' },
  CONMEBOL: { name: 'Copa América', title: 'Copa-América-Sieger' },
  CAF: { name: 'Afrika-Cup', title: 'Afrikameister' },
  AFC: { name: 'Asienmeisterschaft', title: 'Asienmeister' },
  CONCACAF: { name: 'Gold Cup', title: 'Gold-Cup-Sieger' },
};

const POSITIONS = {
  TW: { name: 'Torwart', group: 'gk', goals: 0, assists: 0.005 },
  IV: { name: 'Innenverteidiger', group: 'def', goals: 0.06, assists: 0.03 },
  AV: { name: 'Außenverteidiger', group: 'def', goals: 0.05, assists: 0.12 },
  ZDM: { name: 'Defensives Mittelfeld', group: 'mid', goals: 0.06, assists: 0.08 },
  ZM: { name: 'Zentrales Mittelfeld', group: 'mid', goals: 0.14, assists: 0.18 },
  ZOM: { name: 'Offensives Mittelfeld', group: 'att', goals: 0.3, assists: 0.28 },
  FL: { name: 'Flügelspieler', group: 'att', goals: 0.36, assists: 0.26 },
  ST: { name: 'Stürmer', group: 'att', goals: 0.55, assists: 0.15 },
};

// Positionen, auf die ein Trainer dich umschulen könnte
const POSITION_SWITCH = {
  IV: ['ZDM', 'AV'], AV: ['FL', 'IV'], ZDM: ['IV', 'ZM'], ZM: ['ZOM', 'ZDM'],
  ZOM: ['ZM', 'FL'], FL: ['ST', 'AV'], ST: ['FL', 'ZOM'],
};
