#!/usr/bin/env python3
"""Baut aus index.html, CSS und JS eine einzelne HTML-Datei (dist/fussballkarriere.html),
die sich ohne weitere Dateien veröffentlichen oder verschicken lässt."""
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
css = (root / 'css/style.css').read_text(encoding='utf-8')
js = '\n'.join((root / f).read_text(encoding='utf-8') for f in ['js/data.js', 'js/names.js', 'js/game.js', 'js/events.js', 'js/people.js', 'js/business.js', 'js/coach.js', 'js/fame.js', 'js/ui.js', 'js/meta.js', 'js/career.js', 'js/extras.js', 'js/variety.js', 'js/modes.js', 'js/depth.js', 'js/memories.js', 'js/encore.js', 'js/gala.js', 'js/arena.js', 'js/walkout.js'])

# Optional: private Version mit Vereinslogos
#   python3 tools/build_single.py --logos logos.json --out privat.html
# Die Logos gehören nicht ins öffentliche Repository.
args = sys.argv[1:]
logos_path = args[args.index('--logos') + 1] if '--logos' in args else None
out_path = args[args.index('--out') + 1] if '--out' in args else None
if logos_path:
    logos = json.loads(Path(logos_path).read_text(encoding='utf-8'))
    js = f'window.CLUB_LOGOS = {json.dumps(logos)};\n' + js

html = f"""<meta charset="utf-8">
<title>Fußballkarriere</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;600;700&display=swap">
<style>
{css}
</style>
<header class="top"><span>⚽ Fußballkarriere</span><span class="hbtns"><button id="home-btn" class="helpbtn" type="button" aria-label="Zum Hauptmenü" title="Zum Hauptmenü" hidden>🏠<span class="hl"> Menü</span></button><button id="settings-btn" class="helpbtn" type="button" aria-label="Einstellungen" title="Einstellungen">⚙️</button><button id="help-btn" class="helpbtn" type="button" aria-label="Hilfe">?<span class="hl"> Hilfe</span></button></span></header>
<main id="app"></main>
<footer class="foot">Fanprojekt · Alle Vereinsnamen gehören ihren jeweiligen Inhabern · Stärkewerte sind Schätzungen</footer>
<script>
{js}
</script>
"""
out = Path(out_path) if out_path else root / 'dist/fussballkarriere.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(f'{out} ({len(html) // 1024} KB)')
