# LumiraLab Social Check — lokaler UX-Prototyp

## Start

```bash
cd /home/hermes/projects/hermes-ops/artifacts/lumira-social-decision-deck
python3 -m http.server 8765 --bind 127.0.0.1
```

Dann im Browser `http://127.0.0.1:8765/` öffnen.

## Bedienung v3

- Die drei großen Buttons sind die primäre Bedienung.
- Karte antippen: keine Aktion — die Aufgabe bleibt sichtbar und stabil.
- Quelle und Prüfhinweis über den eigenen Button öffnen.
- Optional nur im markierten Griffbereich wischen.
- Kleine Bewegungen lösen nichts aus.
- Deutlicher Wisch nach rechts: Ja, nächsten Arbeitsschritt starten.
- Deutlicher Wisch nach links: Nein, nicht weiter.
- Deutlicher Wisch nach oben: später.
- Pfeiltasten: gleiche Entscheidungen auf Desktop.
- „Demo zurücksetzen“: lokalen Zustand löschen.

## Usability-Test

Für den vorbereiteten Test den Link mit `?test=1` öffnen. Nach dem Durchlauf kann
Johann eine Klarheitsbewertung abgeben und einen lokalen Testbericht in die
Zwischenablage kopieren.

## Sicherheitsgrenze

Die Demo schreibt nur in `localStorage`. Sie veröffentlicht nichts und verbindet sich
nicht mit Instagram, Canva, Make, WordPress, Hermes-Kanban oder einem Kundenkonto.
