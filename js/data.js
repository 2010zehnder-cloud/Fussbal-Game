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
  {
    id: 'tr', name: 'Süper Lig', country: 'tr', cup: 'Türkischer Pokal', champion: 'Türkischer Meister',
    cl: 1, el: 2, topScorer: 'Torschützenkönig der Süper Lig', scorerBase: 22, top5: false,
    clubs: [
      ['Galatasaray Istanbul', 80], ['Fenerbahçe Istanbul', 79], ['Beşiktaş Istanbul', 76], ['Trabzonspor', 74],
      ['İstanbul Başakşehir', 72], ['Samsunspor', 71], ['Göztepe Izmir', 70], ['Kasımpaşa', 68],
      ['Alanyaspor', 68], ['Antalyaspor', 67], ['Çaykur Rizespor', 67], ['Konyaspor', 67],
      ['Gaziantep FK', 67], ['Kayserispor', 66], ['Eyüpspor', 66], ['Kocaelispor', 65],
      ['Gençlerbirliği Ankara', 65], ['Fatih Karagümrük', 64],
    ],
  },
  {
    id: 'be', name: 'Pro League', country: 'be', cup: 'Belgischer Pokal', champion: 'Belgischer Meister',
    cl: 1, el: 1, topScorer: 'Torschützenkönig in Belgien', scorerBase: 20, top5: false,
    clubs: [
      ['FC Brügge', 77], ['Union Saint-Gilloise', 76], ['RSC Anderlecht', 74], ['KRC Genk', 74],
      ['Royal Antwerpen', 72], ['KAA Gent', 72], ['Standard Lüttich', 70], ['KV Mechelen', 68],
      ['Cercle Brügge', 67], ['Sporting Charleroi', 67], ['VV St. Truiden', 67], ['Oud-Heverlee Löwen', 66],
      ['KVC Westerlo', 66], ['FCV Dender', 64], ['SV Zulte Waregem', 64], ['RAAL La Louvière', 63],
    ],
  },
  {
    id: 'sco', name: 'Scottish Premiership', country: 'sco', cup: 'Scottish Cup', champion: 'Schottischer Meister',
    cl: 1, el: 1, topScorer: 'Torschützenkönig in Schottland', scorerBase: 20, top5: false,
    clubs: [
      ['Celtic Glasgow', 76], ['Glasgow Rangers', 74], ['Heart of Midlothian', 68], ['Hibernian Edinburgh', 67],
      ['FC Aberdeen', 66], ['FC Motherwell', 65], ['Dundee United', 64], ['FC St. Mirren', 63],
      ['FC Kilmarnock', 63], ['FC Falkirk', 62], ['FC Dundee', 62], ['FC Livingston', 61],
    ],
  },
  {
    id: 'sa', name: 'Saudi Pro League', country: 'sa', conf: 'AFC', cup: "King's Cup", champion: 'Saudischer Meister',
    cl: 3, el: 0, topScorer: 'Torschützenkönig der Saudi Pro League', scorerBase: 22, top5: false,
    clubs: [
      ['Al-Hilal', 80], ['Al-Nassr', 80], ['Al-Ittihad', 79], ['Al-Ahli', 78],
      ['Al-Qadsiah', 75], ['Al-Ettifaq', 72], ['Al-Shabab', 72], ['Al-Taawoun', 71],
      ['Neom SC', 70], ['Al-Fateh', 68], ['Al-Khaleej', 68], ['Al-Fayha', 67],
      ['Damac FC', 66], ['Al-Kholood', 66], ['Al-Riyadh', 65], ['Al-Hazem', 64],
      ['Al-Okhdood', 64], ['Al-Najma', 63],
    ],
  },
  {
    id: 'mls', name: 'Major League Soccer', country: 'us', conf: 'CONCACAF', cup: 'U.S. Open Cup', champion: 'MLS-Meister',
    cl: 3, el: 0, topScorer: 'Torschützenkönig der MLS', scorerBase: 22, top5: false,
    clubs: [
      ['Inter Miami', 74], ['Los Angeles FC', 74], ['LA Galaxy', 72], ['Columbus Crew', 72],
      ['FC Cincinnati', 72], ['Philadelphia Union', 72], ['Seattle Sounders', 71], ['Vancouver Whitecaps', 71],
      ['New York Red Bulls', 70], ['New York City FC', 70], ['Atlanta United', 70], ['Orlando City', 70],
      ['Nashville SC', 70], ['San Diego FC', 70], ['Charlotte FC', 69], ['Real Salt Lake', 68],
      ['Portland Timbers', 68], ['Toronto FC', 67],
    ],
  },
  {
    id: 'br', name: 'Brasileirão', country: 'br', conf: 'CONMEBOL', cup: 'Copa do Brasil', champion: 'Brasilianischer Meister',
    cl: 6, el: 6, topScorer: 'Torschützenkönig in Brasilien', scorerBase: 20, top5: false,
    clubs: [
      ['Flamengo', 79], ['Palmeiras', 79], ['Botafogo', 76], ['Atlético Mineiro', 75],
      ['Cruzeiro', 75], ['Fluminense', 75], ['São Paulo FC', 75], ['Corinthians', 74],
      ['Internacional Porto Alegre', 74], ['Grêmio Porto Alegre', 73], ['EC Bahia', 73], ['Vasco da Gama', 72],
      ['Red Bull Bragantino', 72], ['FC Santos', 72], ['Fortaleza EC', 71], ['Mirassol FC', 69],
      ['EC Vitória', 69], ['Ceará SC', 68], ['EC Juventude', 68], ['Sport Recife', 67],
    ],
  },
  {
    id: 'ar', name: 'Liga Profesional', country: 'ar', conf: 'CONMEBOL', cup: 'Copa Argentina', champion: 'Argentinischer Meister',
    cl: 5, el: 5, topScorer: 'Torschützenkönig in Argentinien', scorerBase: 18, top5: false,
    clubs: [
      ['River Plate', 77], ['Boca Juniors', 76], ['Racing Club', 75], ['Estudiantes de La Plata', 73],
      ['Vélez Sarsfield', 72], ['Talleres Córdoba', 72], ['Independiente', 71], ['Argentinos Juniors', 71],
      ['Rosario Central', 71], ['CA Lanús', 71], ['San Lorenzo', 70], ['CA Huracán', 70],
      ['Godoy Cruz', 69], ['CA Belgrano', 69], ["Newell's Old Boys", 69], ['Defensa y Justicia', 69],
      ['CA Tigre', 68], ['Unión de Santa Fe', 68], ['CA Platense', 67], ['Gimnasia La Plata', 67],
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
  { name: 'Belgien', str: 82, conf: 'UEFA', country: 'be' },
  { name: 'Kroatien', str: 80, conf: 'UEFA' },
  { name: 'Dänemark', str: 78, conf: 'UEFA' },
  { name: 'Norwegen', str: 79, conf: 'UEFA' },
  { name: 'Türkei', str: 78, conf: 'UEFA', country: 'tr' },
  { name: 'Polen', str: 75, conf: 'UEFA' },
  { name: 'Serbien', str: 74, conf: 'UEFA' },
  { name: 'Ukraine', str: 74, conf: 'UEFA' },
  { name: 'Schweden', str: 75, conf: 'UEFA' },
  { name: 'Schottland', str: 73, conf: 'UEFA', country: 'sco' },
  { name: 'Tschechien', str: 73, conf: 'UEFA' },
  { name: 'Griechenland', str: 72, conf: 'UEFA' },
  { name: 'Ungarn', str: 72, conf: 'UEFA' },
  { name: 'Albanien', str: 68, conf: 'UEFA' },
  { name: 'Bosnien und Herzegowina', str: 68, conf: 'UEFA' },
  { name: 'Kosovo', str: 66, conf: 'UEFA' },
  { name: 'Argentinien', str: 88, conf: 'CONMEBOL', country: 'ar' },
  { name: 'Brasilien', str: 87, conf: 'CONMEBOL', country: 'br' },
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
  { name: 'Saudi-Arabien', str: 68, conf: 'AFC', country: 'sa' },
  { name: 'USA', str: 77, conf: 'CONCACAF', country: 'us' },
  { name: 'Mexiko', str: 76, conf: 'CONCACAF' },
  { name: 'Kanada', str: 74, conf: 'CONCACAF' },
];

// Gehaltsniveau pro Liga (Faktor auf das Grundgehalt)
const LEAGUE_WAGE = {
  pl: 1.6, laliga: 1.3, bl: 1.2, seriea: 1.1, ligue1: 1.0, sa: 2.4, tr: 0.8, mls: 0.9, port: 0.6, ered: 0.6,
  be: 0.5, sco: 0.45, aut: 0.45, sui: 0.5, bl2: 0.4, br: 0.5, ar: 0.3,
};

// Internationale Klubwettbewerbe je Kontinentalverband
const CLUB_COMPS = {
  UEFA: { cl: 'Champions League', el: 'Europa League', clMin: 76, elMin: 68, elMax: 82 },
  AFC: { cl: 'AFC Champions League Elite', el: null, clMin: 66, elMin: 0, elMax: 0 },
  CONCACAF: { cl: 'CONCACAF Champions Cup', el: null, clMin: 66, elMin: 0, elMax: 0 },
  CONMEBOL: { cl: 'Copa Libertadores', el: 'Copa Sudamericana', clMin: 71, elMin: 64, elMax: 74 },
};

// Gegner in internationalen Wettbewerben, deren Ligen nicht spielbar sind
const EXTRA_OPPONENTS = {
  AFC: [['Al-Sadd', 70], ['Ulsan HD', 70], ['Urawa Red Diamonds', 70], ['Vissel Kobe', 71], ['Kawasaki Frontale', 70],
    ['Shanghai Port', 68], ['Buriram United', 66], ['Al-Wahda', 67], ['Al-Ain', 70], ['Persepolis', 66]],
  CONCACAF: [['Club América', 74], ['CF Monterrey', 74], ['Tigres UANL', 73], ['Cruz Azul', 72], ['CD Guadalajara', 70],
    ['CF Pachuca', 71], ['Deportivo Toluca', 71], ['LD Alajuelense', 64], ['CS Herediano', 63]],
  CONMEBOL: [['Club Nacional', 70], ['Peñarol', 70], ['Club Olimpia', 67], ['LDU Quito', 70], ['Independiente del Valle', 71],
    ['Atlético Nacional', 69], ['Colo-Colo', 68], ['Universitario', 66], ['Cerro Porteño', 67], ['Bolívar', 65]],
};

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

// Dinge, die du dir von deinem Vermögen kaufen kannst (Preise in Mio. €).
// upkeep = jährliche Unterhaltskosten als Anteil vom Preis.
const SHOP = [
  { id: 'car1', cat: 'Auto', name: 'Kompaktwagen', price: 0.03, upkeep: 0.1, pop: 0 },
  { id: 'car2', cat: 'Auto', name: 'Sportwagen', price: 0.25, upkeep: 0.08, pop: 2 },
  { id: 'car3', cat: 'Auto', name: 'Hypercar', price: 2.5, upkeep: 0.06, pop: 4 },
  { id: 'home1', cat: 'Wohnen', name: 'Eigentumswohnung', price: 0.5, upkeep: 0.02, pop: 0 },
  { id: 'home2', cat: 'Wohnen', name: 'Villa mit Pool', price: 4, upkeep: 0.03, pop: 3 },
  { id: 'home3', cat: 'Wohnen', name: 'Anwesen am Meer', price: 20, upkeep: 0.03, pop: 5 },
  { id: 'watch', cat: 'Luxus', name: 'Luxusuhr', price: 0.15, upkeep: 0, pop: 1 },
  { id: 'yacht', cat: 'Luxus', name: 'Yacht', price: 30, upkeep: 0.08, pop: 6 },
  { id: 'jet', cat: 'Luxus', name: 'Privatjet', price: 65, upkeep: 0.1, pop: 6 },
  { id: 'charity', cat: 'Soziales', name: 'Stiftung für Nachwuchsfußball', price: 2, upkeep: 0.05, pop: 10 },
  { id: 'fund', cat: 'Geldanlage', name: 'Fondsanteil (1 Mio. €)', price: 1, upkeep: 0, pop: 0, repeat: true },
];
