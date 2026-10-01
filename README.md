# Host Colors — SSH, WSL, Containers & Folders

**English** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Italiano](README.it.md) · [Português (Brasil)](README.pt-br.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-cn.md) · [繁體中文](README.zh-tw.md)

Colors the VS Code window based on where you are working: SSH server, WSL distribution, Dev Container, Codespace, Remote Tunnel or project folder. You'll never mix up production and development again, or one project with another.

![Manager with preview](images/screenshot-manager.png)

## Features

- **Visual manager** (`Host Colors: Open Manager`):
  - list of all your hosts, and one-click add of the ones in your `~/.ssh/config`
  - color picker, 12 suggested colors, random color
  - **live preview** in a mock VS Code window (active or inactive window)
  - custom label (e.g. "PROD ⚠") shown in the status bar
  - default areas, or areas specific to each host
- **9 colorable areas**: title bar, Command Center, activity bar, status bar, remote indicator, active tab, side bar border, panel border, window border.
- **Preview on the real window**: in `Choose Color` / `Choose Colored Areas`, hovering a color or checking an area applies it right away. Escape cancels.
- **Patterns**: `prod-*` colors every host starting with `prod-`. An exact name wins over a pattern.
- **Remove All** in one click, plus a command to enable / disable all colors.
- Status bar dot: a click opens the quick menu.

![Custom areas and inactive window preview](images/screenshot-zones.png)

## Commands

| Command | Purpose |
|---|---|
| Open Manager | Full interface with preview |
| Choose Color (Live Preview) | Quick pick with preview on the window |
| Choose Colored Areas | For this host or as default |
| Enable / Disable Colors | Global switch |
| Remove a Host's Color | |
| Remove All | Deletes every host and removes the colors |
| Clean Colors from This Workspace | Removes colors that got stuck |
| Export Configuration… / Import Configuration… | Share your colors as a JSON file (merge or replace on import) |

## Beyond SSH: WSL, containers and project folders

Colors also work in other windows. The entry key tells what it applies to:

| Key | Window |
|---|---|
| `prod-server` | SSH host (as in `~/.ssh/config`) |
| `wsl:Ubuntu` | WSL distribution |
| `container:my-app` | Dev Container (folder or container name) |
| `codespace:<name>` / `tunnel:<name>` | GitHub Codespaces / Remote Tunnel |
| `folder:c:/projects/shop` | Local project folder |
| `folder:prod-server:/srv/app` | Folder on a remote environment |

- A folder entry wins over its environment: color a whole server, then give one project its own color (menu → **Color Only This Folder**).
- In a local window, the status bar dot only appears for folders that have a color.
- Wildcards stay within their type: `*` only matches SSH hosts, `folder:*/api` matches every folder named `api`.

## Languages

The UI follows the VS Code display language: English (default), French, German, Spanish, Italian, Portuguese (Brazil), Russian, Japanese, Korean, Simplified and Traditional Chinese.

## Quick start

1. Open a folder, locally or remotely (SSH, WSL, Dev Container, Codespace…).
2. Remote window: click the dot at the bottom left → **Change Color**. Local window: run **Host Colors: Choose Color (Live Preview)** from the Command Palette (the dot appears once the folder has a color).
3. Hover the colors to try them, then press Enter.

## Manual configuration

```json
"sshHostColors.hosts": {
  "prod-*": "#c0392b",
  "dev-server": { "color": "#27ae60", "label": "DEV", "elements": ["statusBar", "activeTab"] }
},
"sshHostColors.elements": ["titleBar", "activityBar", "statusBar"]
```

## Notes

- Colors are written to `workbench.colorCustomizations` **at workspace level** (`.vscode/settings.json` on the server), so only the connected window is colored. Your own customizations are kept: only the values set by the extension are removed.
- After "Remove All", open windows are cleaned right away, the others the next time they are opened.
- Without an open folder, VS Code cannot color the window: only the status bar dot is shown.
- The title bar and window border require `"window.titleBarStyle": "custom"` (the default on Windows).
