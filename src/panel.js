// @ts-check
const vscode = require('vscode');
const crypto = require('crypto');
const colors = require('../media/colors.js');
const hosts = require('./hosts');
const { readSshHosts } = require('./sshConfig');

/**
 * @typedef {{
 *   getCurrentKey: () => string | undefined,
 *   getWindowKeys: () => { remote?: string, folder?: string },
 *   hasWorkspace: () => boolean,
 *   isEnabled: () => boolean,
 *   apply: () => Promise<void>,
 * }} Api
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
    this.panel = vscode.window.createWebviewPanel('sshHostColors.manager', 'Host Colors', vscode.ViewColumn.Active, {
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
    const currentHost = this.api.getCurrentKey();
    const current = currentHost ? hosts.findEntry(currentHost) : undefined;
    this.panel.webview.postMessage({
      type: 'state',
      hosts: hosts.listEntries(),
      defaults: hosts.defaultZones(),
      sshHosts: readSshHosts(),
      currentHost,
      currentKey: current?.key,
      windowKeys: this.api.getWindowKeys(),
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
            vscode.window.showErrorMessage(vscode.l10n.t('Host “{0}” already exists.', name));
            return this.postState();
          }
          const zones = Array.isArray(m.elements) ? m.elements.filter((z) => typeof z === 'string') : undefined;
          const label = typeof m.label === 'string' && m.label.trim() ? m.label.trim() : undefined;
          return hosts.saveEntry(name, { color, elements: zones, label }, m.originalName);
        }

        case 'deleteHost': {
          const ok = await vscode.window.showWarningMessage(
            vscode.l10n.t('Remove the color of “{0}”?', String(m.name)),
            { modal: true },
            vscode.l10n.t('Remove')
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

        case 'exportConfig':
          return vscode.commands.executeCommand('sshHostColors.export');

        case 'importConfig':
          return vscode.commands.executeCommand('sshHostColors.import');
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Host Colors: ${err instanceof Error ? err.message : err}`);
    }
  }

  /** @param {vscode.Uri} mediaRoot */
  html(mediaRoot) {
    const webview = this.panel.webview;
    const nonce = crypto.randomBytes(16).toString('base64');
    const uri = (/** @type {string} */ f) => webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, f));
    // Traductions passées au webview (vide en anglais : les clés sont les textes anglais).
    const bundle = JSON.stringify(vscode.l10n.bundle ?? {}).replace(/</g, '\\u003c');
    const lang = vscode.env.language.replace(/[^\w-]/g, '');
    return /* html */ `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${uri('panel.css')}">
  <title>Host Colors</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}">window.SSH_HOST_COLORS_L10N = ${bundle};</script>
  <script nonce="${nonce}" src="${uri('colors.js')}"></script>
  <script nonce="${nonce}" src="${uri('targets.js')}"></script>
  <script nonce="${nonce}" src="${uri('panel.js')}"></script>
</body>
</html>`;
  }
}

module.exports = { ManagerPanel };
