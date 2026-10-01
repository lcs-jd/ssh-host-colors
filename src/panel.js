// @ts-check
const vscode = require('vscode');
const crypto = require('crypto');
const colors = require('../media/colors.js');
const hosts = require('./hosts');
const { readSshHosts } = require('./sshConfig');

/**
 * @typedef {{ getSshHost: () => string | undefined, hasWorkspace: () => boolean, isEnabled: () => boolean, apply: () => Promise<void> }} Api
 */

class ManagerPanel {
  /** @type {ManagerPanel | undefined} */
  static current;

  /**
   * @param {vscode.ExtensionContext} context
   * @param {Api} api
   */
  static show(context, api) {
    if (ManagerPanel.current) {
      ManagerPanel.current.panel.reveal();
      return;
    }
    ManagerPanel.current = new ManagerPanel(context, api);
  }

  static refresh() {
    ManagerPanel.current?.postState();
  }

  /**
   * @param {vscode.ExtensionContext} context
   * @param {Api} api
   */
  constructor(context, api) {
    this.api = api;
    const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media');
    this.panel = vscode.window.createWebviewPanel('sshHostColors.manager', 'SSH Host Colors', vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [mediaRoot],
    });
    this.panel.iconPath = new vscode.ThemeIcon('symbol-color');
    this.panel.webview.html = this.html(mediaRoot);
    this.panel.webview.onDidReceiveMessage((m) => this.onMessage(m));
    this.panel.onDidDispose(() => (ManagerPanel.current = undefined));
  }

  postState() {
    const currentHost = this.api.getSshHost();
    const current = currentHost ? hosts.findEntry(currentHost) : undefined;
    this.panel.webview.postMessage({
      type: 'state',
      hosts: hosts.listEntries(),
      defaults: hosts.defaultZones(),
      sshHosts: readSshHosts(),
      currentHost,
      currentKey: current?.key,
      hasWorkspace: this.api.hasWorkspace(),
      enabled: this.api.isEnabled(),
    });
  }

  /** @param {any} m */
  async onMessage(m) {
    try {
      switch (m.type) {
        case 'ready':
          return this.postState();

        case 'saveHost': {
          const name = String(m.name ?? '').trim();
          const color = colors.normalizeHex(m.color);
          if (!name || !color) return;
          if (name !== m.originalName && hosts.listEntries().some((e) => e.key === name)) {
            vscode.window.showErrorMessage(`Le host « ${name} » existe déjà.`);
            return this.postState();
          }
          const zones = Array.isArray(m.elements) ? m.elements.filter((z) => typeof z === 'string') : undefined;
          const label = typeof m.label === 'string' && m.label.trim() ? m.label.trim() : undefined;
          return hosts.saveEntry(name, { color, elements: zones, label }, m.originalName);
        }

        case 'deleteHost': {
          const ok = await vscode.window.showWarningMessage(
            `Supprimer la couleur de « ${m.name} » ?`,
            { modal: true },
            'Supprimer'
          );
          if (ok) await hosts.deleteEntry(m.name);
          return;
        }

        case 'setDefaults':
          return hosts.setDefaultZones(m.elements);

        case 'setEnabled':
          return vscode.workspace
            .getConfiguration(hosts.SECTION)
            .update('enabled', !!m.enabled, vscode.ConfigurationTarget.Global);

        case 'removeAll':
          return vscode.commands.executeCommand('sshHostColors.removeAll');

        case 'cleanWorkspace':
          return vscode.commands.executeCommand('sshHostColors.cleanWorkspace');

        case 'openSettings':
          return vscode.commands.executeCommand('workbench.action.openSettings', hosts.SECTION);

        case 'openSettingsJson':
          return vscode.commands.executeCommand('workbench.action.openSettingsJson');
      }
    } catch (err) {
      vscode.window.showErrorMessage(`SSH Host Colors : ${err instanceof Error ? err.message : err}`);
    }
  }

  /** @param {vscode.Uri} mediaRoot */
  html(mediaRoot) {
    const webview = this.panel.webview;
    const nonce = crypto.randomBytes(16).toString('base64');
    const uri = (/** @type {string} */ f) => webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, f));
    return /* html */ `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${uri('panel.css')}">
  <title>SSH Host Colors</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${uri('colors.js')}"></script>
  <script nonce="${nonce}" src="${uri('panel.js')}"></script>
</body>
</html>`;
  }
}

module.exports = { ManagerPanel };
