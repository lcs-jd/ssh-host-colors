# Host Colors — SSH, WSL, Containers & Folders

[English](README.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Italiano](README.it.md) · **Português (Brasil)** · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-cn.md) · [繁體中文](README.zh-tw.md)

Colore a janela do VS Code de acordo com onde você está trabalhando: servidor SSH, distribuição WSL, Dev Container, Codespace, Remote Tunnel ou pasta de projeto. Para nunca mais confundir produção e desenvolvimento, nem um projeto com outro.

![Gerenciador com pré-visualização](images/screenshot-manager.png)

## Recursos

- **Gerenciador gráfico** (`Host Colors: Abrir o gerenciador`):
  - lista de todos os seus hosts e inclusão com um clique dos que estão no seu `~/.ssh/config`
  - seletor de cor, 12 cores sugeridas, cor aleatória
  - **pré-visualização ao vivo** em uma janela simulada do VS Code (janela ativa ou inativa)
  - rótulo personalizado (ex.: "PROD ⚠") exibido na barra de status
  - áreas padrão ou próprias de cada host
- **9 áreas coloríveis**: barra de título, central de comandos, barra de atividades, barra de status, indicador remoto, guia ativa, borda lateral, borda do painel, borda da janela.
- **Pré-visualização na janela real**: em `Escolher a cor` / `Escolher as áreas coloridas`, passar o mouse sobre uma cor ou marcar uma área a aplica imediatamente. Esc cancela.
- **Padrões**: `prod-*` colore todos os hosts que começam com `prod-`. Um nome exato tem prioridade sobre um padrão.
- **Remover tudo** com um clique, além de um comando para ativar / desativar todas as cores.
- Ponto na barra de status: um clique abre o menu rápido.

![Áreas personalizadas e pré-visualização da janela inativa](images/screenshot-zones.png)

## Comandos

| Comando | Função |
|---|---|
| Abrir o gerenciador | Interface completa com pré-visualização |
| Escolher a cor (pré-visualização ao vivo) | Seleção rápida com pré-visualização na janela |
| Escolher as áreas coloridas | Para este host ou como padrão |
| Ativar / desativar as cores | Interruptor global |
| Remover a cor de um host | |
| Remover tudo | Apaga todos os hosts e remove as cores |
| Limpar as cores deste workspace | Remove as cores que ficaram presas |
| Exportar a configuração… / Importar uma configuração… | Compartilhar suas cores em um arquivo JSON (mesclar ou substituir ao importar) |

## Além do SSH: WSL, contêineres e pastas de projeto

As cores também funcionam em outras janelas. A chave da entrada indica a que ela se aplica:

| Chave | Janela |
|---|---|
| `prod-server` | Host SSH (como em `~/.ssh/config`) |
| `wsl:Ubuntu` | Distribuição WSL |
| `container:meu-app` | Dev Container (nome da pasta ou do contêiner) |
| `codespace:<nome>` / `tunnel:<nome>` | GitHub Codespaces / Remote Tunnel |
| `folder:c:/projetos/loja` | Pasta de projeto local |
| `folder:prod-server:/srv/app` | Pasta em um ambiente remoto |

- Uma entrada de pasta tem prioridade sobre a do seu ambiente: colora um servidor inteiro e depois dê a um projeto a sua própria cor (menu → **Colorir somente esta pasta**).
- Em uma janela local, o ponto da barra de status só aparece para pastas que têm cor.
- Os curingas ficam no seu tipo: `*` só vale para hosts SSH, `folder:*/api` para todas as pastas chamadas `api`.

## Idiomas

A interface segue o idioma de exibição do VS Code: inglês (padrão), francês, alemão, espanhol, italiano, português (Brasil), russo, japonês, coreano, chinês simplificado e tradicional.

## Início rápido

1. Abra uma pasta, localmente ou remotamente (SSH, WSL, Dev Container, Codespace…).
2. Janela remota: clique no ponto no canto inferior esquerdo → **Alterar a cor**. Janela local: execute **Host Colors: Escolher a cor (pré-visualização ao vivo)** pela paleta de comandos (o ponto aparece assim que a pasta tiver uma cor).
3. Passe o mouse sobre as cores para testá-las e pressione Enter.

## Configuração manual

```json
"sshHostColors.hosts": {
  "prod-*": "#c0392b",
  "dev-server": { "color": "#27ae60", "label": "DEV", "elements": ["statusBar", "activeTab"] }
},
"sshHostColors.elements": ["titleBar", "activityBar", "statusBar"]
```

## Observações

- As cores são gravadas em `workbench.colorCustomizations` **no nível do workspace** (`.vscode/settings.json` no servidor), para colorir apenas a janela conectada. Suas próprias personalizações são mantidas: apenas os valores definidos pela extensão são removidos.
- Depois de "Remover tudo", as janelas abertas são limpas imediatamente e as outras na próxima vez que forem abertas.
- Sem uma pasta aberta, o VS Code não permite colorir a janela: apenas o ponto da barra de status é exibido.
- A barra de título e a borda da janela exigem `"window.titleBarStyle": "custom"` (o padrão no Windows).
