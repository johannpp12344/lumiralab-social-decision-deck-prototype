# LumiraLab Social Decision Deck — lokaler Prototyp

## Start

```bash
cd /home/hermes/projects/hermes-ops/artifacts/lumira-social-decision-deck
python3 -m http.server 8765 --bind 127.0.0.1
```

Dann im Browser `http://127.0.0.1:8765/` öffnen.

## Bedienung

- Karte antippen: Quelle und Prüfhinweis öffnen
- nach rechts wischen: zur Produktion vormerken
- nach links wischen: zurückstellen
- nach oben wischen: später
- Buttons unten: zugängliche Alternative
- Pfeiltasten: gleiche Entscheidungen auf Desktop
- „Demo zurücksetzen“: lokalen Zustand löschen

## Sicherheitsgrenze

Die Demo schreibt nur in `localStorage`. Sie veröffentlicht nichts und verbindet sich
nicht mit Instagram, Canva, Make, WordPress, Hermes-Kanban oder einem Kundenkonto.
