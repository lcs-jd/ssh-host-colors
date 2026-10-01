# Host Colors — SSH, WSL, Containers & Folders

[English](README.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Italiano](README.it.md) · [Português (Brasil)](README.pt-br.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-cn.md) · **繁體中文**

根據您的工作位置為 VS Code 視窗上色：SSH 伺服器、WSL 發行版、Dev Container、Codespace、Remote Tunnel 或專案資料夾。從此不再混淆正式環境和開發環境，也不會把一個專案誤認成另一個。

![含預覽的管理員](images/screenshot-manager.png)

## 功能

- **圖形化管理員**(`Host Colors: 開啟管理員`)：
  - 列出您的所有主機，並可一鍵新增 `~/.ssh/config` 中的主機
  - 色彩選擇器、12 種建議色彩、隨機色彩
  - 在模擬的 VS Code 視窗中**即時預覽**(使用中或非使用中視窗)
  - 在狀態列中顯示的自訂標籤(例如「PROD ⚠」)
  - 預設區域，或每個主機各自的區域
- **9 個可上色區域**：標題列、命令中心、活動列、狀態列、遠端指示器、使用中索引標籤、側邊欄框線、面板框線、視窗框線。
- **在實際視窗中預覽**：在 `選擇色彩` / `選擇上色區域` 中，將滑鼠停在色彩上或勾選區域會立即套用。按 Esc 取消。
- **模式**：`prod-*` 會為所有以 `prod-` 開頭的主機上色。完全相符的名稱優先於模式。
- 一鍵**全部移除**，另有命令可啟用 / 停用所有色彩。
- 狀態列色點：按一下即可開啟快速選單。

![自訂區域與非使用中視窗預覽](images/screenshot-zones.png)

## 命令

| 命令 | 用途 |
|---|---|
| 開啟管理員 | 含預覽的完整介面 |
| 選擇色彩(即時預覽) | 可在視窗中預覽的快速選擇 |
| 選擇上色區域 | 針對此主機或作為預設值 |
| 啟用 / 停用色彩 | 全域開關 |
| 移除主機的色彩 | |
| 全部移除 | 刪除所有主機並移除色彩 |
| 清除此工作區的色彩 | 移除殘留的色彩 |
| 匯出設定… / 匯入設定… | 以 JSON 檔案分享色彩設定(匯入時可合併或取代) |

## 不只 SSH：WSL、容器與專案資料夾

色彩也適用於其他視窗。項目的鍵決定其套用對象：

| 鍵 | 視窗 |
|---|---|
| `prod-server` | SSH 主機(與 `~/.ssh/config` 相同) |
| `wsl:Ubuntu` | WSL 發行版 |
| `container:my-app` | Dev Container(資料夾名稱或容器名稱) |
| `codespace:<名稱>` / `tunnel:<名稱>` | GitHub Codespaces / Remote Tunnel |
| `folder:c:/projects/shop` | 本機專案資料夾 |
| `folder:prod-server:/srv/app` | 遠端環境中的資料夾 |

- 資料夾項目優先於其所在環境的項目：可以先為整台伺服器上色，再為某個專案設定專屬色彩(選單 → **只為此資料夾上色**)。
- 在本機視窗中，只有設定了色彩的資料夾才會在狀態列顯示色點。
- 萬用字元只在同類型的鍵中生效：`*` 只符合 SSH 主機，`folder:*/api` 符合所有名為 `api` 的資料夾。

## 語言

介面會依照 VS Code 的顯示語言：英文(預設)、法文、德文、西班牙文、義大利文、葡萄牙文(巴西)、俄文、日文、韓文、簡體中文和繁體中文。

## 快速入門

1. 在本機或遠端(SSH、WSL、Dev Container、Codespace…)開啟資料夾。
2. 遠端視窗：按一下左下角的色點 → **變更色彩**。本機視窗：從命令選擇區執行 **Host Colors: 選擇色彩(即時預覽)**(資料夾設定色彩後會顯示色點)。
3. 將滑鼠停在色彩上試用，然後按 Enter。

## 手動設定

```json
"sshHostColors.hosts": {
  "prod-*": "#c0392b",
  "dev-server": { "color": "#27ae60", "label": "DEV", "elements": ["statusBar", "activeTab"] }
},
"sshHostColors.elements": ["titleBar", "activityBar", "statusBar"]
```

## 注意事項

- 色彩會寫入**工作區層級**的 `workbench.colorCustomizations`(伺服器上的 `.vscode/settings.json`)，因此只會為已連線的視窗上色。您自己的自訂會被保留：只會移除擴充功能設定的值。
- 執行「全部移除」後，已開啟的視窗會立即清除，其他視窗會在下次開啟時清除。
- 未開啟資料夾時，VS Code 無法為視窗上色：只會顯示狀態列色點。
- 標題列和視窗框線需要 `"window.titleBarStyle": "custom"`(Windows 上的預設值)。
