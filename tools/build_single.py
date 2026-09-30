#!/usr/bin/env python3
"""Baut aus index.html, CSS und JS eine einzelne HTML-Datei (dist/fussballkarriere.html),
die sich ohne weitere Dateien veröffentlichen oder verschicken lässt."""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
css = (root / 'css/style.css').read_text(encoding='utf-8')
js = '\n'.join((root / f).read_text(encoding='utf-8') for f in ['js/data.js', 'js/game.js', 'js/events.js'])

html = f"""<title>Fußballkarriere</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;600;700&display=swap">
<style>
{css}
</style>
<header class="top">⚽ Fußballkarriere</header>
<main id="app"></main>
<footer class="foot">Fanprojekt · Alle Vereinsnamen gehören ihren jeweiligen Inhabern · Stärkewerte sind Schätzungen</footer>
<script>
{js}
</script>
"""
out = root / 'dist/fussballkarriere.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(f'{out} ({len(html) // 1024} KB)')
