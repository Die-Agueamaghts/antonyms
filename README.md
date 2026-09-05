# WortGegensätze – Sprachtrainer

Eine responsive Lern-, Trainings- und Test-Webseite für Gegenteile in Deutsch, Englisch, Französisch und Arabisch.

## Struktur

```text
sprachen-gegenpaare/
├── index.html
├── app/
│   └── main.js
├── data/
│   ├── categories.json
│   ├── describing_people.json
│   ├── feelings.json
│   └── positions_and_directions.json
└── style/
    └── main.css
```

## Modi

- **Lernen:** Das Wort und sein Gegenteil werden angezeigt. Mit „Weiter“ geht es zum nächsten Wort. Nach dem letzten Wort gelangt man zurück zur Auswahl.
- **Trainieren:** Das Gegenteil wird eingegeben und mit Enter geprüft. Bei einer falschen Antwort wird die korrekte Antwort angezeigt. Danach geht es weiter. Nach dem letzten Wort ist die Runde abgeschlossen und eine neue Runde kann gestartet werden.
- **Test:** Jedes Wort wird genau einmal durchlaufen. Nach der letzten Antwort wird eine Ergebnisübersicht mit Prozentwert angezeigt.

## Neue Kategorien hinzufügen

Jede Kategorie besitzt eine eigene JSON-Datei. Die Datei enthält den Kategorienamen und gruppierte Wortpaare für alle vier Sprachen:

```json
"id": "appearance",
"name": {"de": "Aussehen", "en": "Appearance", "fr": "Apparence", "ar": "المظهر"},
"items": [
  {
    "de": {"word": "schön", "opposite": "hässlich"},
    "en": {"word": "beautiful", "opposite": "ugly"},
    "fr": {"word": "beau", "opposite": "laid"},
    "ar": {"word": "جميل", "opposite": "قبيح"}
  }
}
```

`opposite` ist das gesuchte Gegenteil. Mehrere gültige Varianten können bei Bedarf später als zusätzliches Feld ergänzt werden.

Die Kategorien `appearance`, `feelings` und `positions_and_directions` werden aus den JSON-Dateien geladen. Eine Datei kann entweder ein einzelnes Kategorieobjekt oder ein Array von Kategorieobjekten enthalten. Dadurch kann die Sprache auch während einer Lern-, Trainings- oder Testrunde gewechselt werden, ohne die Kategorie zu verlieren. `app/main.js` enthält keine Wortdaten; alle Wörter werden aus den JSON-Dateien geladen.

Die Liste der zu ladenden Kategorie-Dateien steht in `data/categories.json`. Neue Kategorien werden dort im Feld `files` eingetragen.

Die App verwendet die Gruppierung für die Übersetzungspopups, damit Wörter nicht über unterschiedliche Listenpositionen zugeordnet werden.

## Lokal starten

Da die Wortdaten per `fetch()` geladen werden, sollte das Projekt über einen lokalen Webserver geöffnet werden, z. B.:

```bash
python -m http.server 8000
```

Danach im Browser `http://localhost:8000` öffnen.
