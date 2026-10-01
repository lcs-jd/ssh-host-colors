# Host Colors — SSH, WSL, Containers & Folders

[English](README.md) · [Français](README.fr.md) · **Deutsch** · [Español](README.es.md) · [Italiano](README.it.md) · [Português (Brasil)](README.pt-br.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-cn.md) · [繁體中文](README.zh-tw.md)

Färbt das VS Code-Fenster je nachdem ein, wo Sie arbeiten: SSH-Server, WSL-Distribution, Dev Container, Codespace, Remote Tunnel oder Projektordner. So verwechseln Sie nie wieder Produktion und Entwicklung – oder ein Projekt mit einem anderen.

![Verwaltung mit Vorschau](images/screenshot-manager.png)

## Funktionen

- **Grafische Verwaltung** (`Host Colors: Verwaltung öffnen`):
  - Liste aller Ihrer Hosts und Hinzufügen der Hosts aus Ihrer `~/.ssh/config` mit einem Klick
  - Farbwähler, 12 vorgeschlagene Farben, zufällige Farbe
  - **Live-Vorschau** in einem nachgebildeten VS Code-Fenster (aktives oder inaktives Fenster)
  - eigene Bezeichnung (z. B. „PROD ⚠“), die in der Statusleiste angezeigt wird
  - Standardbereiche oder eigene Bereiche pro Host
- **9 einfärbbare Bereiche**: Titelleiste, Befehlscenter, Aktivitätsleiste, Statusleiste, Remote-Anzeige, aktiver Tab, Rand der Seitenleiste, Panelrand, Fensterrahmen.
- **Vorschau im echten Fenster**: In `Farbe wählen` / `Eingefärbte Bereiche wählen` wird eine Farbe beim Darüberfahren bzw. ein Bereich beim Anhaken sofort angewendet. Escape bricht ab.
- **Muster**: `prod-*` färbt alle Hosts ein, die mit `prod-` beginnen. Ein exakter Name hat Vorrang vor einem Muster.
- **Alle entfernen** mit einem Klick, dazu ein Befehl zum Aktivieren / Deaktivieren aller Farben.
- Punkt in der Statusleiste: Ein Klick öffnet das Schnellmenü.

![Eigene Bereiche und Vorschau eines inaktiven Fensters](images/screenshot-zones.png)

## Befehle

| Befehl | Zweck |
|---|---|
| Verwaltung öffnen | Vollständige Oberfläche mit Vorschau |
| Farbe wählen (Live-Vorschau) | Schnellauswahl mit Vorschau im Fenster |
| Eingefärbte Bereiche wählen | Für diesen Host oder als Standard |
| Farben aktivieren / deaktivieren | Globaler Schalter |
| Farbe eines Hosts entfernen | |
| Alle entfernen | Löscht alle Hosts und entfernt die Farben |
| Farben aus diesem Arbeitsbereich entfernen | Entfernt hängengebliebene Farben |
| Konfiguration exportieren… / Konfiguration importieren… | Farben als JSON-Datei teilen (beim Import zusammenführen oder ersetzen) |

## Mehr als SSH: WSL, Container und Projektordner

Die Farben funktionieren auch in anderen Fenstern. Der Schlüssel des Eintrags gibt an, wofür er gilt:

| Schlüssel | Fenster |
|---|---|
| `prod-server` | SSH-Host (wie in `~/.ssh/config`) |
| `wsl:Ubuntu` | WSL-Distribution |
| `container:meine-app` | Dev Container (Ordner- oder Containername) |
| `codespace:<Name>` / `tunnel:<Name>` | GitHub Codespaces / Remote Tunnel |
| `folder:c:/projekte/shop` | Lokaler Projektordner |
| `folder:prod-server:/srv/app` | Ordner in einer Remote-Umgebung |

- Ein Ordnereintrag hat Vorrang vor seiner Umgebung: Färben Sie einen ganzen Server ein und geben Sie dann einem Projekt eine eigene Farbe (Menü → **Nur diesen Ordner einfärben**).
- In einem lokalen Fenster erscheint der Punkt in der Statusleiste nur für Ordner, die eine Farbe haben.
- Platzhalter bleiben in ihrem Typ: `*` gilt nur für SSH-Hosts, `folder:*/api` für alle Ordner namens `api`.

## Sprachen

Die Oberfläche folgt der Anzeigesprache von VS Code: Englisch (Standard), Französisch, Deutsch, Spanisch, Italienisch, Portugiesisch (Brasilien), Russisch, Japanisch, Koreanisch, vereinfachtes und traditionelles Chinesisch.

## Schnellstart

1. Öffnen Sie einen Ordner, lokal oder remote (SSH, WSL, Dev Container, Codespace…).
2. Remote-Fenster: Klicken Sie unten links auf den Punkt → **Farbe ändern**. Lokales Fenster: Führen Sie **Host Colors: Farbe wählen (Live-Vorschau)** über die Befehlspalette aus (der Punkt erscheint, sobald der Ordner eine Farbe hat).
3. Fahren Sie über die Farben, um sie auszuprobieren, und drücken Sie dann die Eingabetaste.

## Manuelle Konfiguration

```json
"sshHostColors.hosts": {
  "prod-*": "#c0392b",
  "dev-server": { "color": "#27ae60", "label": "DEV", "elements": ["statusBar", "activeTab"] }
},
"sshHostColors.elements": ["titleBar", "activityBar", "statusBar"]
```

## Hinweise

- Die Farben werden **auf Arbeitsbereichsebene** in `workbench.colorCustomizations` geschrieben (`.vscode/settings.json` auf dem Server), damit nur das verbundene Fenster eingefärbt wird. Ihre eigenen Anpassungen bleiben erhalten: Es werden nur die von der Erweiterung gesetzten Werte entfernt.
- Nach „Alle entfernen“ werden geöffnete Fenster sofort bereinigt, die anderen beim nächsten Öffnen.
- Ohne geöffneten Ordner kann VS Code das Fenster nicht einfärben: Nur der Punkt in der Statusleiste wird angezeigt.
- Titelleiste und Fensterrahmen erfordern `"window.titleBarStyle": "custom"` (Standard unter Windows).
