# Host Colors — SSH, WSL, Containers & Folders

[English](README.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · **Italiano** · [Português (Brasil)](README.pt-br.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-cn.md) · [繁體中文](README.zh-tw.md)

Colora la finestra di VS Code in base a dove lavori: server SSH, distribuzione WSL, Dev Container, Codespace, Remote Tunnel o cartella di progetto. Così non confonderai mai più produzione e sviluppo, né un progetto con un altro.

![Gestore con anteprima](images/screenshot-manager.png)

## Funzionalità

- **Gestore grafico** (`Host Colors: Apri il gestore`):
  - elenco di tutti i tuoi host e aggiunta con un clic di quelli presenti nel tuo `~/.ssh/config`
  - selettore di colore, 12 colori suggeriti, colore casuale
  - **anteprima in tempo reale** in una finta finestra di VS Code (finestra attiva o inattiva)
  - etichetta personalizzata (es. «PROD ⚠») mostrata nella barra di stato
  - aree predefinite o specifiche per ogni host
- **9 aree colorabili**: barra del titolo, centro comandi, barra attività, barra di stato, indicatore remoto, scheda attiva, bordo laterale, bordo del pannello, bordo della finestra.
- **Anteprima sulla finestra reale**: in `Scegli il colore` / `Scegli le aree colorate`, passare il mouse su un colore o selezionare un'area la applica subito. Esc annulla.
- **Modelli**: `prod-*` colora tutti gli host che iniziano con `prod-`. Un nome esatto ha la precedenza su un modello.
- **Rimuovi tutto** con un clic, più un comando per attivare / disattivare tutti i colori.
- Punto nella barra di stato: un clic apre il menu rapido.

![Aree personalizzate e anteprima della finestra inattiva](images/screenshot-zones.png)

## Comandi

| Comando | Funzione |
|---|---|
| Apri il gestore | Interfaccia completa con anteprima |
| Scegli il colore (anteprima in tempo reale) | Selezione rapida con anteprima sulla finestra |
| Scegli le aree colorate | Per questo host o predefinite |
| Attiva / disattiva i colori | Interruttore globale |
| Rimuovi il colore di un host | |
| Rimuovi tutto | Elimina tutti gli host e rimuove i colori |
| Pulisci i colori di questa area di lavoro | Rimuove i colori rimasti bloccati |
| Esporta la configurazione… / Importa una configurazione… | Condividere i colori in un file JSON (unione o sostituzione all'importazione) |

## Oltre SSH: WSL, container e cartelle di progetto

I colori funzionano anche nelle altre finestre. La chiave della voce indica a cosa si applica:

| Chiave | Finestra |
|---|---|
| `prod-server` | Host SSH (come in `~/.ssh/config`) |
| `wsl:Ubuntu` | Distribuzione WSL |
| `container:mia-app` | Dev Container (nome della cartella o del container) |
| `codespace:<nome>` / `tunnel:<nome>` | GitHub Codespaces / Remote Tunnel |
| `folder:c:/progetti/negozio` | Cartella di progetto locale |
| `folder:prod-server:/srv/app` | Cartella su un ambiente remoto |

- Una voce di cartella ha la precedenza sul suo ambiente: colora un intero server, poi assegna a un progetto un colore proprio (menu → **Colora solo questa cartella**).
- In una finestra locale, il punto nella barra di stato compare solo per le cartelle che hanno un colore.
- I caratteri jolly restano nel loro tipo: `*` vale solo per gli host SSH, `folder:*/api` per tutte le cartelle chiamate `api`.

## Lingue

L'interfaccia segue la lingua di visualizzazione di VS Code: inglese (predefinito), francese, tedesco, spagnolo, italiano, portoghese (Brasile), russo, giapponese, coreano, cinese semplificato e tradizionale.

## Avvio rapido

1. Apri una cartella, in locale o in remoto (SSH, WSL, Dev Container, Codespace…).
2. Finestra remota: fai clic sul punto in basso a sinistra → **Cambia colore**. Finestra locale: esegui **Host Colors: Scegli il colore (anteprima in tempo reale)** dal riquadro comandi (il punto compare non appena la cartella ha un colore).
3. Passa il mouse sui colori per provarli, poi premi Invio.

## Configurazione manuale

```json
"sshHostColors.hosts": {
  "prod-*": "#c0392b",
  "dev-server": { "color": "#27ae60", "label": "DEV", "elements": ["statusBar", "activeTab"] }
},
"sshHostColors.elements": ["titleBar", "activityBar", "statusBar"]
```

## Note

- I colori vengono scritti in `workbench.colorCustomizations` **a livello di area di lavoro** (`.vscode/settings.json` sul server), così viene colorata solo la finestra connessa. Le tue personalizzazioni vengono mantenute: vengono rimossi solo i valori impostati dall'estensione.
- Dopo «Rimuovi tutto», le finestre aperte vengono pulite subito, le altre alla prossima apertura.
- Senza una cartella aperta, VS Code non permette di colorare la finestra: viene mostrato solo il punto nella barra di stato.
- La barra del titolo e il bordo della finestra richiedono `"window.titleBarStyle": "custom"` (impostazione predefinita su Windows).
