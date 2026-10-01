# Changelog

## 0.3.0 — 2026-10-01

- Renamed to **Host Colors — SSH, WSL, Containers & Folders** (commands now appear as "Host Colors: …"). The extension ID and the `sshHostColors.*` settings are unchanged, so existing configurations keep working.
- Beyond SSH: colors for WSL (`wsl:<distro>`), Dev Containers (`container:<name>`), GitHub Codespaces (`codespace:<name>`) and Remote Tunnels (`tunnel:<name>`).
- Per-folder colors (`folder:<path>`), for local projects too. A folder entry wins over its environment; remote folder keys include the environment so the same path on two servers never shares a color. New "Color Only This Folder" menu item and "This window" suggestions in the manager.
- Export / import the configuration as a JSON file (commands and manager buttons). Import can merge (imported entries win) or replace everything; invalid entries are skipped. A plain `{ "key": "#color" }` object or a `settings.json` excerpt is accepted too.
- Wildcard patterns now only match keys of their own type: `*` still matches every SSH host but never folders or WSL.
- Localized UI: English by default, plus French, German, Spanish, Italian, Portuguese (Brazil), Russian, Japanese, Korean, Simplified and Traditional Chinese, following the VS Code display language (commands, settings, messages, manager).
- README in English, translated versions in `README.<lang>.md` for every supported language.

## 0.2.0 — 2026-10-01

- Visual manager with live preview (active / inactive window).
- 9 colorable areas, default areas or per-host areas.
- Custom label per host, shown in the status bar.
- Preview on the real window from the quick pick (colors and areas).
- Host suggestions from `~/.ssh/config` (including `Include` and `remote.SSH.configFile`).
- `*` / `?` patterns, case-insensitive matching and `user@host`.
- "Remove All", "Enable / Disable" and "Clean This Workspace" commands.
- Quick menu from the status bar dot.

## 0.1.0

- First release: one color per SSH host (title bar, status bar, activity bar).
