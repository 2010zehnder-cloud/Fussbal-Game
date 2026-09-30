# ⚽ Fußballkarriere

Ein Browser-Spiel, in dem du deine eigene Fußballkarriere simulierst – vom 17-jährigen Nachwuchstalent bis zum Karriereende. Inspiriert von Copero.

## Spielen

Einfach `index.html` im Browser öffnen. Alternativ gibt es `dist/fussballkarriere.html` als einzelne Datei mit allem drin (neu bauen mit `python3 tools/build_single.py`). Es wird nichts installiert, der Spielstand wird automatisch im Browser gespeichert.

## So funktioniert's

- **Spieler erstellen:** Name, Nationalität, Position und Rückennummer wählen.
- **Nachwuchsleistungszentrum:** Drei Vereine bieten dir einen Platz in ihrer U19 an.
- **Trainingsschwerpunkt:** Vor jeder Saison wählst du Abschluss, Athletik, Technik, Taktik oder Regeneration.
- **Saison:** Jede Saison besteht aus sechs Stationen:
  - **Ereignisse** mit Entscheidungen – über 40 verschiedene (Verletzungen, Partys, Interviews, Trainerwechsel, Liebe und Hochzeit, Heimweh, Investments …)
  - **Schlüsselszenen** in Liga, Pokal und Europapokal, die du selbst entscheidest (Schuss, Freistoß, Elfmeter schießen, Kopfball, Grätsche, Elfmeter halten, Flanken abfangen …)
- **Saisonbilanz:** Spiele, Tore, Vorlagen, Durchschnittsnote, Tabelle, Pokal, Champions League / Europa League und Auszeichnungen (Torjägerkanone, Goldener Schuh, Golden Boy, Ballon d'Or …).
- **Nationalmannschaft:** WM und EM (bzw. Copa América, Afrika-Cup …) alle zwei Jahre.
- **Transferfenster:** Wechsel, Leihen, Vertragsverlängerung, Gehaltserhöhung fordern oder einen Topberater engagieren. Ab 33 kannst du deine Karriere beenden.
- **Privatleben wie in BitLife:** Auf Partnersuche gehen, Dates, Geschenke, Heiratsantrag, Familie planen, Trennung und Scheidung. Die Beziehung kühlt ohne Pflege ab.
- **Aktivitäten:** Urlaub, Party-Nacht – oder der dubiose Arzt: Doping bringt sofort mehr Stärke, aber bei einem positiven Test drohen Sperre oder Gefängnis, Aberkennung der Titel und hohe Strafen.
- **Familiendynastie:** Am Karriereende kannst du als eines deiner Kinder weiterspielen. Es erbt Vermögen, Besitz, Bekanntheit und einen Teil deines Talents.
- **Rivale:** Ein Spieler aus deinem Jahrgang begleitet dich die ganze Karriere – direkte Duelle, Kampf um den Stammplatz in der Nationalmannschaft und um den Ballon d'Or.
- **Elfmeterschießen:** Finals in Pokal, Europapokal und bei Turnieren können ins Elfmeterschießen gehen – du schießt oder hältst den entscheidenden Elfmeter.
- **Meilensteine und Vereinslegende:** 100 Tore, 500 Spiele, 100 Länderspiele … und nach vielen Jahren bei einem Verein Abschiedsspiel, Statue oder gesperrte Rückennummer.
- **Familie und Mannschaft:** Eltern und Geschwister (die selbst Fußballprofis werden können), Freundschaften und Feindschaften mit Mitspielern.
- **Gefängnis:** Zellengenosse, Berufung einlegen oder ein Ausbruchsversuch.
- **Firmen:** Fußballschule, Restaurant, Modemarke, E-Sport-Team, Fitnessstudios oder ein Hotel – mit Gewinnen, Verlusten und Pleiten.
- **Nach der Karriere:** Spielbare Trainerkarriere (Taktik, Transferpolitik, Kabinen-Entscheidungen, Entlassungen), einen eigenen Verein als Präsident kaufen, TV-Experte, Sportdirektor oder Ruhestand.
- **Ruhmeshalle:** Deine besten beendeten Karrieren werden auf dem Startbildschirm gespeichert.
- **Gehalt & Vermögen:** Jeder Vertrag hat ein Jahresgehalt und eine Laufzeit. Dazu kommen Handgeld, Prämien und Werbeverträge (45 % Steuern). Von deinem Vermögen kaufst du Autos, Häuser, eine Yacht oder einen Privatjet, gründest eine Stiftung oder legst Geld in Fonds an. Achtung: Besitz kostet Unterhalt.

## Ligen

17 Ligen mit echten Vereinen: Bundesliga, 2. Bundesliga (mit Auf- und Abstieg), Premier League, LaLiga, Serie A, Ligue 1, Eredivisie, Liga Portugal, Süper Lig, Belgische Pro League, Scottish Premiership, Österreichische Bundesliga, Schweizer Super League, Saudi Pro League, MLS, Brasileirão und die argentinische Liga Profesional.

Internationale Wettbewerbe: Champions League, Europa League, Copa Libertadores, Copa Sudamericana, AFC Champions League Elite und CONCACAF Champions Cup.

## Dateien

- `index.html` – Einstiegspunkt
- `css/style.css` – Aussehen
- `js/data.js` – Ligen, Vereine, Nationen, Positionen
- `js/events.js` – Ereignisse während der Saison
- `js/people.js` – Rivale, Familie, Mitspieler
- `js/business.js` – Firmen und Vereinskauf
- `js/coach.js` – Trainerkarriere
- `js/fame.js` – Meilensteine, Vereinslegenden, Ruhmeshalle, Elfmeterschießen
- `js/game.js` – Spiellogik und Oberfläche
- `tools/build_single.py` – baut die Einzeldatei in `dist/`
