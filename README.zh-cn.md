# Host Colors — SSH, WSL, Containers & Folders

[English](README.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Italiano](README.it.md) · [Português (Brasil)](README.pt-br.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **简体中文** · [繁體中文](README.zh-tw.md)

根据你的工作位置为 VS Code 窗口着色：SSH 服务器、WSL 发行版、Dev Container、Codespace、Remote Tunnel 或项目文件夹。从此不再混淆生产环境和开发环境，也不会把一个项目当成另一个。

![带预览的管理器](images/screenshot-manager.png)

## 功能

- **图形化管理器**(`Host Colors: 打开管理器`)：
  - 列出你的所有主机，并可一键添加 `~/.ssh/config` 中的主机
  - 颜色选择器、12 种推荐颜色、随机颜色
  - 在模拟的 VS Code 窗口中**实时预览**(活动或非活动窗口)
  - 在状态栏中显示的自定义标签(例如“PROD ⚠”)
  - 默认区域，或每个主机单独的区域
- **9 个可着色区域**：标题栏、命令中心、活动栏、状态栏、远程指示器、活动标签页、侧边栏边框、面板边框、窗口边框。
- **在真实窗口中预览**：在 `选择颜色` / `选择着色区域` 中，将鼠标悬停在颜色上或勾选区域会立即生效。按 Esc 取消。
- **模式**：`prod-*` 会为所有以 `prod-` 开头的主机着色。精确名称优先于模式。
- 一键**全部删除**，另有一个命令可启用 / 禁用所有颜色。
- 状态栏圆点：单击即可打开快捷菜单。

![自定义区域与非活动窗口预览](images/screenshot-zones.png)

## 命令

| 命令 | 作用 |
|---|---|
| 打开管理器 | 带预览的完整界面 |
| 选择颜色(实时预览) | 可在窗口中预览的快速选择 |
| 选择着色区域 | 针对此主机或作为默认值 |
| 启用 / 禁用颜色 | 全局开关 |
| 删除主机的颜色 | |
| 全部删除 | 删除所有主机并移除颜色 |
| 清理此工作区的颜色 | 移除残留的颜色 |
| 导出配置… / 导入配置… | 以 JSON 文件共享颜色配置(导入时可合并或替换) |

## 不止 SSH：WSL、容器和项目文件夹

颜色同样适用于其他窗口。条目的键决定它应用于哪里：

| 键 | 窗口 |
|---|---|
| `prod-server` | SSH 主机(与 `~/.ssh/config` 中一致) |
| `wsl:Ubuntu` | WSL 发行版 |
| `container:my-app` | Dev Container(文件夹名或容器名) |
| `codespace:<名称>` / `tunnel:<名称>` | GitHub Codespaces / Remote Tunnel |
| `folder:c:/projects/shop` | 本地项目文件夹 |
| `folder:prod-server:/srv/app` | 远程环境中的文件夹 |

- 文件夹条目优先于其所在环境的条目：可以先为整个服务器着色，再为某个项目单独设置颜色(菜单 → **仅为此文件夹着色**)。
- 在本地窗口中，只有设置了颜色的文件夹才会在状态栏显示圆点。
- 通配符只在同类键中生效：`*` 只匹配 SSH 主机，`folder:*/api` 匹配所有名为 `api` 的文件夹。

## 语言

界面跟随 VS Code 的显示语言：英语(默认)、法语、德语、西班牙语、意大利语、葡萄牙语(巴西)、俄语、日语、韩语、简体中文和繁体中文。

## 快速开始

1. 在本地或远程(SSH、WSL、Dev Container、Codespace…)打开一个文件夹。
2. 远程窗口：单击左下角的圆点 → **更改颜色**。本地窗口：从命令面板运行 **Host Colors: 选择颜色(实时预览)**(文件夹设置颜色后会显示圆点)。
3. 将鼠标悬停在颜色上进行尝试，然后按 Enter。

## 手动配置

```json
"sshHostColors.hosts": {
  "prod-*": "#c0392b",
  "dev-server": { "color": "#27ae60", "label": "DEV", "elements": ["statusBar", "activeTab"] }
},
"sshHostColors.elements": ["titleBar", "activityBar", "statusBar"]
```

## 说明

- 颜色写入**工作区级别**的 `workbench.colorCustomizations`(服务器上的 `.vscode/settings.json`)，因此只会为已连接的窗口着色。你自己的自定义会被保留：只会移除扩展设置的值。
- 执行“全部删除”后，已打开的窗口会立即清理，其他窗口在下次打开时清理。
- 未打开文件夹时，VS Code 无法为窗口着色：只会显示状态栏圆点。
- 标题栏和窗口边框需要 `"window.titleBarStyle": "custom"`(Windows 上的默认值)。
