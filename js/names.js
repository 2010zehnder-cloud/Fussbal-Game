'use strict';

// Namens-Datenbank: typische Vor- und Nachnamen je Land, jedes Mal zufällig kombiniert

const NAME_GROUPS = {
  de: {
    first: ['Lukas', 'Jonas', 'Leon', 'Felix', 'Tim', 'Niklas', 'Julian', 'Maximilian', 'Paul', 'Moritz', 'Jan', 'Florian', 'Kai', 'Tobias', 'Marvin', 'Jannik', 'Finn', 'Luca', 'David', 'Simon', 'Fabian', 'Benedikt', 'Robin', 'Dennis'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Brandt', 'Vogel', 'Kuhn', 'Hofmann', 'Baumann'],
  },
  fr: {
    first: ['Hugo', 'Théo', 'Lucas', 'Enzo', 'Mathis', 'Nathan', 'Louis', 'Antoine', 'Maxime', 'Kylian', 'Adrien', 'Benjamin', 'Clément', 'Raphaël', 'Jules', 'Aurélien', 'Moussa', 'Rayan', 'Yanis', 'Bastien'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Fournier', 'Girard', 'Mercier', 'Blanc', 'Camara', 'Traoré', 'Lemaire', 'Faure', 'Roux', 'Chevalier'],
  },
  es: {
    first: ['Pablo', 'Sergio', 'Álvaro', 'Hugo', 'Daniel', 'Javier', 'Marcos', 'Adrián', 'Iker', 'Pedro', 'Rodrigo', 'Raúl', 'Mikel', 'Unai', 'Carlos', 'Diego', 'Alejandro', 'Íñigo', 'Rubén', 'Óscar'],
    last: ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Gil'],
  },
  latam: {
    first: ['Santiago', 'Mateo', 'Matías', 'Thiago', 'Nicolás', 'Juan', 'Sebastián', 'Facundo', 'Lautaro', 'Julián', 'Agustín', 'Emiliano', 'Rodrigo', 'Joaquín', 'Franco', 'Luis', 'Andrés', 'Camilo', 'Federico', 'Tomás'],
    last: ['González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Pérez', 'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Benítez', 'Acosta', 'Medina', 'Herrera', 'Castro', 'Vargas', 'Ríos', 'Molina', 'Rojas'],
  },
  pt: {
    first: ['João', 'Rúben', 'Bernardo', 'Diogo', 'Rafael', 'Gonçalo', 'Tiago', 'Pedro', 'André', 'Nuno', 'Francisco', 'Ricardo', 'Duarte', 'Miguel', 'Afonso', 'Rodrigo'],
    last: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Fernandes', 'Gonçalves', 'Gomes', 'Lopes', 'Carvalho', 'Almeida', 'Ribeiro', 'Neves', 'Dias'],
  },
  br: {
    first: ['Gabriel', 'Lucas', 'Pedro', 'Matheus', 'Vinícius', 'Bruno', 'Thiago', 'Raphael', 'Gustavo', 'Felipe', 'Arthur', 'Caio', 'Rafael', 'Douglas', 'Wesley', 'Davi'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Barbosa', 'Martins', 'Moura', 'Cunha'],
  },
  it: {
    first: ['Lorenzo', 'Federico', 'Alessandro', 'Matteo', 'Giovanni', 'Marco', 'Andrea', 'Nicolò', 'Davide', 'Riccardo', 'Simone', 'Francesco', 'Luca', 'Giacomo', 'Mattia', 'Pietro', 'Tommaso', 'Gabriele'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti'],
  },
  en: {
    first: ['Harry', 'Jack', 'James', 'Oliver', 'George', 'Mason', 'Jordan', 'Kyle', 'Callum', 'Ollie', 'Aaron', 'Charlie', 'Alfie', 'Freddie', 'Joe', 'Tom'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Wright', 'Robinson', 'Thompson', 'White', 'Hughes', 'Edwards', 'Green', 'Hall', 'Wood', 'Harris', 'Clarke', 'Turner'],
  },
  sco: {
    first: ['Andrew', 'Scott', 'John', 'Callum', 'Kieran', 'Billy', 'Ryan', 'Lewis', 'Stuart', 'Craig', 'Ross', 'Grant'],
    last: ['Campbell', 'Stewart', 'Murray', 'MacDonald', 'Fraser', 'Reid', 'Ferguson', 'Henderson', 'Wilson', 'Thomson', 'Ross', 'Paterson', 'MacLeod'],
  },
  us: {
    first: ['Tyler', 'Josh', 'Matt', 'Jordan', 'Brandon', 'Chris', 'Ethan', 'Logan', 'Caleb', 'Austin', 'Hunter', 'Dylan', 'Ryan', 'Cameron'],
    last: ['Miller', 'Johnson', 'Davis', 'Brown', 'Wilson', 'Anderson', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'Harris', 'Clark', 'Lewis', 'Walker'],
  },
  ca: {
    first: ['Liam', 'Jacob', 'Noah', 'Ethan', 'Owen', 'Nathan', 'Logan', 'Samuel', 'Mathieu', 'Olivier'],
    last: ['Smith', 'Tremblay', 'Martin', 'Roy', 'Gagnon', 'Lee', 'Wilson', 'Johnson', 'MacDonald', 'Gauthier', 'Campbell'],
  },
  au: {
    first: ['Jack', 'Liam', 'Harry', 'Riley', 'Mitchell', 'Lachlan', 'Cooper', 'Jordan', 'Bailey', 'Kyle'],
    last: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Nguyen', 'Martin', 'Anderson', 'Kelly', 'Murphy'],
  },
  nl: {
    first: ['Daan', 'Sem', 'Lucas', 'Milan', 'Levi', 'Bram', 'Thijs', 'Jesse', 'Ruud', 'Teun', 'Joey', 'Stefan', 'Ryan', 'Jasper', 'Niels', 'Wout'],
    last: ['Jansen', 'de Vries', 'van den Berg', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer', 'de Groot'],
  },
  be: {
    first: ['Kevin', 'Thibaut', 'Arthur', 'Lois', 'Charles', 'Wout', 'Jan', 'Thomas', 'Maxim', 'Lucas', 'Senne', 'Robbe', 'Mathis'],
    last: ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet', 'Dubois', 'Lambert', 'Hermans'],
  },
  at: {
    first: ['David', 'Marcel', 'Konrad', 'Christoph', 'Marko', 'Nicolas', 'Florian', 'Stefan', 'Patrick', 'Michael', 'Philipp', 'Maximilian'],
    last: ['Gruber', 'Huber', 'Bauer', 'Wagner', 'Pichler', 'Steiner', 'Moser', 'Mayer', 'Hofer', 'Leitner', 'Berger', 'Fuchs', 'Eder', 'Fischer'],
  },
  ch: {
    first: ['Manuel', 'Nico', 'Remo', 'Fabian', 'Ruben', 'Dan', 'Silvan', 'Denis', 'Yann', 'Noah', 'Luca', 'Jonas'],
    last: ['Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber', 'Schneider', 'Brunner', 'Baumann', 'Frei', 'Zimmermann', 'Gerber', 'Moser'],
  },
  hr: {
    first: ['Luka', 'Ivan', 'Mateo', 'Josip', 'Andrej', 'Dominik', 'Lovro', 'Mario', 'Ante', 'Borna', 'Marko', 'Filip'],
    last: ['Horvat', 'Kovačević', 'Babić', 'Marić', 'Jurić', 'Novak', 'Knežević', 'Vuković', 'Marković', 'Petrović', 'Matić', 'Tomić', 'Pavlović'],
  },
  dk: {
    first: ['Christian', 'Rasmus', 'Kasper', 'Joachim', 'Mikkel', 'Jonas', 'Andreas', 'Mads', 'Morten', 'Victor', 'Gustav', 'Frederik'],
    last: ['Hansen', 'Nielsen', 'Jensen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Jørgensen', 'Madsen', 'Kristensen'],
  },
  no: {
    first: ['Martin', 'Alexander', 'Sander', 'Kristoffer', 'Oscar', 'Jørgen', 'Fredrik', 'Leo', 'Ola', 'Morten', 'Henrik', 'Magnus'],
    last: ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen', 'Berg', 'Haugen'],
  },
  se: {
    first: ['Alexander', 'Viktor', 'Emil', 'Victor', 'Isak', 'Jesper', 'Lucas', 'Hugo', 'Gustav', 'Oskar', 'Erik', 'Filip'],
    last: ['Johansson', 'Andersson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Lindberg'],
  },
  tr: {
    first: ['Emre', 'Burak', 'Mehmet', 'Hakan', 'Arda', 'Kerem', 'Ferdi', 'Çağlar', 'Orkun', 'Kenan', 'Yusuf', 'Barış', 'Cengiz', 'Merih', 'Uğurcan', 'Okay', 'Abdülkerim', 'Semih', 'Oğuz', 'Eren'],
    last: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Polat', 'Erdem', 'Güneş'],
  },
  pl: {
    first: ['Piotr', 'Jakub', 'Kamil', 'Wojciech', 'Krzysztof', 'Mateusz', 'Sebastian', 'Przemysław', 'Bartosz', 'Michał', 'Tomasz', 'Paweł'],
    last: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur'],
  },
  rs: {
    first: ['Dušan', 'Aleksandar', 'Nikola', 'Filip', 'Strahinja', 'Luka', 'Lazar', 'Nemanja', 'Miloš', 'Andrija', 'Stefan', 'Marko'],
    last: ['Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Stanković', 'Pavlović', 'Milošević', 'Popović', 'Živković'],
  },
  ba: {
    first: ['Edin', 'Amar', 'Haris', 'Sead', 'Anel', 'Benjamin', 'Ermin', 'Kenan', 'Adnan', 'Emir', 'Tarik', 'Dino'],
    last: ['Hodžić', 'Hadžić', 'Delić', 'Begić', 'Mehmedović', 'Kovačević', 'Ibrahimović', 'Husić', 'Salihović', 'Mujić', 'Alić', 'Šabić'],
  },
  ua: {
    first: ['Oleksandr', 'Mykhailo', 'Artem', 'Andriy', 'Viktor', 'Ruslan', 'Roman', 'Heorhiy', 'Illia', 'Taras', 'Vitaliy', 'Mykola'],
    last: ['Shevchenko', 'Kovalenko', 'Bondarenko', 'Tkachenko', 'Kravchenko', 'Oliynyk', 'Melnyk', 'Boyko', 'Koval', 'Moroz', 'Lysenko', 'Marchenko'],
  },
  cz: {
    first: ['Tomáš', 'Adam', 'Vladimír', 'Lukáš', 'Václav', 'Ondřej', 'Jakub', 'David', 'Pavel', 'Martin', 'Jan', 'Petr'],
    last: ['Novák', 'Svoboda', 'Novotný', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Němec', 'Marek', 'Pokorný'],
  },
  gr: {
    first: ['Giorgos', 'Konstantinos', 'Dimitris', 'Kostas', 'Vangelis', 'Anastasios', 'Fotis', 'Christos', 'Petros', 'Nikos', 'Manolis', 'Panagiotis'],
    last: ['Papadopoulos', 'Papadakis', 'Georgiou', 'Nikolaidis', 'Oikonomou', 'Dimitriou', 'Pappas', 'Vasileiou', 'Karagiannis', 'Ioannou', 'Makris', 'Antoniou'],
  },
  hu: {
    first: ['Dominik', 'Roland', 'Péter', 'Bendegúz', 'Ádám', 'Zsolt', 'Attila', 'Barnabás', 'Martin', 'Kevin', 'Bence', 'Dániel'],
    last: ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh', 'Papp'],
  },
  al: {
    first: ['Armando', 'Kristjan', 'Elseid', 'Berat', 'Ylber', 'Nedim', 'Arbër', 'Mario', 'Taulant', 'Klaus', 'Enis', 'Endri'],
    last: ['Hoxha', 'Berisha', 'Krasniqi', 'Gashi', 'Shala', 'Kola', 'Dervishi', 'Leka', 'Çela', 'Hasani', 'Mema', 'Prifti'],
  },
  ma: {
    first: ['Achraf', 'Hakim', 'Youssef', 'Sofyan', 'Azzedine', 'Noussair', 'Brahim', 'Bilal', 'Ilias', 'Yassine', 'Amine', 'Hamza'],
    last: ['El Amrani', 'Benali', 'Alaoui', 'Bennani', 'El Idrissi', 'Tazi', 'Chraibi', 'Berrada', 'El Fassi', 'Ouazzani', 'Lahlou', 'Bouzidi'],
  },
  eg: {
    first: ['Mohamed', 'Omar', 'Mostafa', 'Ahmed', 'Mahmoud', 'Hamdi', 'Ibrahim', 'Karim', 'Tarek', 'Youssef', 'Amr', 'Hossam'],
    last: ['Hassan', 'Mohamed', 'Ali', 'Ibrahim', 'Mahmoud', 'Abdelrahman', 'Kamal', 'Fathy', 'Saad', 'Mostafa', 'Shawky', 'Salem'],
  },
  sa: {
    first: ['Salem', 'Firas', 'Saud', 'Mohammed', 'Abdulrahman', 'Saleh', 'Nasser', 'Hassan', 'Abdullah', 'Faisal', 'Sultan', 'Ali'],
    last: ['Al-Harbi', 'Al-Otaibi', 'Al-Shehri', 'Al-Ghamdi', 'Al-Zahrani', 'Al-Malki', 'Al-Qahtani', 'Al-Amri', 'Al-Dossary', 'Al-Mutairi', 'Al-Anazi', 'Al-Shammari'],
  },
  ir: {
    first: ['Mehdi', 'Alireza', 'Saman', 'Karim', 'Ali', 'Milad', 'Saeid', 'Hossein', 'Reza', 'Morteza', 'Ehsan', 'Amir'],
    last: ['Mohammadi', 'Hosseini', 'Rezaei', 'Karimi', 'Ahmadi', 'Moradi', 'Jafari', 'Rahimi', 'Heidari', 'Sadeghi', 'Ghasemi', 'Kazemi'],
  },
  sn: {
    first: ['Ismaïla', 'Idrissa', 'Édouard', 'Pape', 'Lamine', 'Habib', 'Moussa', 'Cheikh', 'Abdou', 'Mamadou', 'Ibrahima', 'Ousmane'],
    last: ['Sarr', 'Gueye', 'Mendy', 'Ndiaye', 'Diallo', 'Diatta', 'Diop', 'Camara', 'Ciss', 'Faye', 'Fall', 'Sow', 'Seck'],
  },
  ng: {
    first: ['Victor', 'Samuel', 'Wilfred', 'Alex', 'Kelechi', 'Moses', 'Calvin', 'Taiwo', 'Bright', 'Chidera', 'Emeka', 'Tunde'],
    last: ['Okafor', 'Eze', 'Adeyemi', 'Nwankwo', 'Okonkwo', 'Obi', 'Adebayo', 'Ogunleye', 'Chukwu', 'Okeke', 'Balogun', 'Uche', 'Afolabi'],
  },
  ci: {
    first: ['Sébastien', 'Franck', 'Simon', 'Nicolas', 'Ibrahim', 'Evan', 'Willy', 'Serge', 'Jean-Philippe', 'Yaya', 'Didier', 'Lassina'],
    last: ['Fofana', 'Diallo', 'Sangaré', 'Touré', 'Koné', 'Bamba', 'Ouattara', 'Coulibaly', 'Kouassi', 'Yao', 'Konan', 'Traoré'],
  },
  gh: {
    first: ['Mohammed', 'Thomas', 'Jordan', 'Abdul', 'Ernest', 'Daniel', 'Joseph', 'Kwame', 'Kofi', 'Yaw', 'Kwabena', 'Emmanuel'],
    last: ['Mensah', 'Asante', 'Boateng', 'Owusu', 'Osei', 'Addo', 'Amoah', 'Agyeman', 'Appiah', 'Darko', 'Ofori', 'Sarpong'],
  },
  cm: {
    first: ['André', 'Vincent', 'Bryan', 'Karl', 'Frank', 'Christopher', 'Carlos', 'Nicolas', 'Samuel', 'Olivier', 'Jean', 'Stéphane'],
    last: ['Nkoulou', 'Mbarga', 'Fotso', 'Ngono', 'Essomba', 'Tchami', 'Abena', 'Owona', 'Manga', 'Biya', 'Ekotto', 'Ndongo'],
  },
  jp: {
    first: ['Takumi', 'Kaoru', 'Wataru', 'Daichi', 'Ritsu', 'Hiroki', 'Ayase', 'Junya', 'Yuki', 'Ko', 'Shogo', 'Haruto', 'Sota', 'Ren'],
    last: ['Watanabe', 'Suzuki', 'Tanaka', 'Sato', 'Takahashi', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Matsumoto'],
  },
  kr: {
    first: ['Min-jun', 'Seo-jun', 'Do-yun', 'Ji-ho', 'Joon-ho', 'Hyun-woo', 'Seung-ho', 'Jae-won', 'Dong-hyun', 'Sung-min', 'Tae-yang', 'Woo-jin'],
    last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Shin', 'Seo'],
  },
  mx: {
    first: ['Raúl', 'Edson', 'Santiago', 'Guillermo', 'César', 'Luis', 'Johan', 'Julián', 'Alexis', 'Diego', 'Jesús', 'Érick'],
    last: ['Hernández', 'García', 'Martínez', 'López', 'González', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Flores', 'Cruz', 'Gutiérrez', 'Mendoza'],
  },
  xk: {
    first: ['Milot', 'Vedat', 'Edon', 'Florent', 'Amir', 'Lumbardh', 'Arijanet', 'Muhamet', 'Fisnik', 'Leart', 'Ermal', 'Arben'],
    last: ['Krasniqi', 'Berisha', 'Gashi', 'Hoti', 'Morina', 'Shala', 'Bytyqi', 'Kastrati', 'Hasani', 'Rexhepi', 'Sylejmani', 'Zeqiri'],
  },
};

// Welche Namensgruppe passt zu welchem Land
const NATION_NAMES = {
  'Deutschland': 'de', 'Österreich': 'at', 'Schweiz': 'ch', 'Frankreich': 'fr', 'Spanien': 'es', 'England': 'en', 'Italien': 'it',
  'Portugal': 'pt', 'Niederlande': 'nl', 'Belgien': 'be', 'Kroatien': 'hr', 'Dänemark': 'dk', 'Norwegen': 'no', 'Türkei': 'tr',
  'Polen': 'pl', 'Serbien': 'rs', 'Ukraine': 'ua', 'Schweden': 'se', 'Schottland': 'sco', 'Tschechien': 'cz', 'Griechenland': 'gr',
  'Ungarn': 'hu', 'Albanien': 'al', 'Bosnien und Herzegowina': 'ba', 'Kosovo': 'xk', 'Argentinien': 'latam', 'Brasilien': 'br',
  'Uruguay': 'latam', 'Kolumbien': 'latam', 'Ecuador': 'latam', 'Marokko': 'ma', 'Senegal': 'sn', 'Nigeria': 'ng',
  'Elfenbeinküste': 'ci', 'Ghana': 'gh', 'Ägypten': 'eg', 'Kamerun': 'cm', 'Japan': 'jp', 'Südkorea': 'kr', 'Iran': 'ir',
  'Australien': 'au', 'Saudi-Arabien': 'sa', 'USA': 'us', 'Mexiko': 'mx', 'Kanada': 'ca',
};

// Land eines Ligakürzels (für Spieler eines Vereins)
const COUNTRY_NATION = {
  de: 'Deutschland', en: 'England', es: 'Spanien', it: 'Italien', fr: 'Frankreich', nl: 'Niederlande', pt: 'Portugal', at: 'Österreich',
  ch: 'Schweiz', tr: 'Türkei', be: 'Belgien', sco: 'Schottland', sa: 'Saudi-Arabien', us: 'USA', br: 'Brasilien', ar: 'Argentinien',
};

// Zufälliger Name passend zum Land; ohne Land aus einem zufälligen Land
function nameFor(nation) {
  const key = NATION_NAMES[nation] || pick(Object.keys(NAME_GROUPS));
  const g = NAME_GROUPS[key];
  return `${pick(g.first)} ${pick(g.last)}`;
}

// Nationalität für einen Spieler eines Vereins: meist aus dem Land des Vereins, sonst international
function nationForClub(club) {
  const L = typeof clubLeague === 'function' && S && S.clubs && S.clubs[club] ? clubLeague(club) : null;
  const home = L && COUNTRY_NATION[L.country];
  if (home && chance(0.6)) return home;
  return pick(NATIONS).name;
}
