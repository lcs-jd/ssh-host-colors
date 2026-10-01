# Host Colors — SSH, WSL, Containers & Folders

[English](README.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Español** · [Italiano](README.it.md) · [Português (Brasil)](README.pt-br.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-cn.md) · [繁體中文](README.zh-tw.md)

Colorea la ventana de VS Code según dónde trabajas: servidor SSH, distribución WSL, Dev Container, Codespace, Remote Tunnel o carpeta de proyecto. Para no volver a confundir producción y desarrollo, ni un proyecto con otro.

![Administrador con vista previa](images/screenshot-manager.png)

## Características

- **Administrador gráfico** (`Host Colors: Abrir el administrador`):
  - lista de todos tus hosts y alta con un clic de los que están en tu `~/.ssh/config`
  - selector de color, 12 colores sugeridos, color aleatorio
  - **vista previa en directo** en una ventana de VS Code simulada (ventana activa o inactiva)
  - etiqueta personalizada (p. ej. «PROD ⚠») mostrada en la barra de estado
  - zonas predeterminadas o propias de cada host
- **9 zonas coloreables**: barra de título, centro de comandos, barra de actividad, barra de estado, indicador remoto, pestaña activa, borde lateral, borde del panel, borde de la ventana.
- **Vista previa en la ventana real**: en `Elegir color` / `Elegir las zonas coloreadas`, pasar el ratón sobre un color o marcar una zona lo aplica al instante. Escape cancela.
- **Patrones**: `prod-*` colorea todos los hosts que empiezan por `prod-`. Un nombre exacto tiene prioridad sobre un patrón.
- **Quitar todo** con un clic, además de un comando para activar / desactivar todos los colores.
- Punto en la barra de estado: un clic abre el menú rápido.

![Zonas personalizadas y vista previa de ventana inactiva](images/screenshot-zones.png)

## Comandos

| Comando | Función |
|---|---|
| Abrir el administrador | Interfaz completa con vista previa |
| Elegir color (vista previa en directo) | Selección rápida con vista previa en la ventana |
| Elegir las zonas coloreadas | Para este host o por defecto |
| Activar / desactivar los colores | Interruptor global |
| Quitar el color de un host | |
| Quitar todo | Borra todos los hosts y quita los colores |
| Limpiar los colores de esta área de trabajo | Quita los colores que se quedaron bloqueados |
| Exportar la configuración… / Importar una configuración… | Compartir tus colores en un archivo JSON (combinar o reemplazar al importar) |

## Más allá de SSH: WSL, contenedores y carpetas de proyecto

Los colores también funcionan en otras ventanas. La clave de la entrada indica a qué se aplica:

| Clave | Ventana |
|---|---|
| `prod-server` | Host SSH (como en `~/.ssh/config`) |
| `wsl:Ubuntu` | Distribución WSL |
| `container:mi-app` | Dev Container (nombre de la carpeta o del contenedor) |
| `codespace:<nombre>` / `tunnel:<nombre>` | GitHub Codespaces / Remote Tunnel |
| `folder:c:/proyectos/tienda` | Carpeta de proyecto local |
| `folder:prod-server:/srv/app` | Carpeta en un entorno remoto |

- Una entrada de carpeta tiene prioridad sobre la de su entorno: colorea todo un servidor y luego da a un proyecto su propio color (menú → **Colorear solo esta carpeta**).
- En una ventana local, el punto de la barra de estado solo aparece para las carpetas que tienen color.
- Los comodines se quedan en su tipo: `*` solo afecta a los hosts SSH, `folder:*/api` a todas las carpetas llamadas `api`.

## Idiomas

La interfaz sigue el idioma de visualización de VS Code: inglés (predeterminado), francés, alemán, español, italiano, portugués (Brasil), ruso, japonés, coreano, chino simplificado y tradicional.

## Inicio rápido

1. Abre una carpeta, en local o en remoto (SSH, WSL, Dev Container, Codespace…).
2. Ventana remota: haz clic en el punto de abajo a la izquierda → **Cambiar el color**. Ventana local: ejecuta **Host Colors: Elegir color (vista previa en directo)** desde la paleta de comandos (el punto aparece en cuanto la carpeta tiene color).
3. Pasa el ratón por los colores para probarlos y pulsa Intro.

## Configuración manual

```json
"sshHostColors.hosts": {
  "prod-*": "#c0392b",
  "dev-server": { "color": "#27ae60", "label": "DEV", "elements": ["statusBar", "activeTab"] }
},
"sshHostColors.elements": ["titleBar", "activityBar", "statusBar"]
```

## Notas

- Los colores se escriben en `workbench.colorCustomizations` **a nivel de área de trabajo** (`.vscode/settings.json` en el servidor), para colorear solo la ventana conectada. Tus propias personalizaciones se conservan: solo se quitan los valores que puso la extensión.
- Tras «Quitar todo», las ventanas abiertas se limpian de inmediato y las demás la próxima vez que se abran.
- Sin una carpeta abierta, VS Code no permite colorear la ventana: solo se muestra el punto de la barra de estado.
- La barra de título y el borde de la ventana requieren `"window.titleBarStyle": "custom"` (es el valor predeterminado en Windows).
