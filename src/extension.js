// @ts-check
const vscode = require('vscode');
const { l10n } = vscode;
const colors = require('../media/colors.js');
const targets = require('../media/targets.js');
const hosts = require('./hosts');
const { ManagerPanel } = require('./panel');
const transfer = require('./transfer');

const STATE_KEY = 'sshHostColors.applied';

/** @type {vscode.StatusBarItem} */
let statusItem;
/** @type {vscode.ExtensionContext} */
let ctx;

/**
 * Couleur temporaire utilisée pendant une prévisualisation (quick pick).
 * @type {{ color: string, elements?: string[], label?: string } | undefined}
 */
let previewEntry;

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  ctx = context;
  statusItem = vscode.window.createStatusBarItem('sshHostColors.host', vscode.StatusBarAlignment.Left, 10000);
  statusItem.name = 'Host Colors';
  statusItem.command = 'sshHostColors.menu';

  const reg = (/** @type {string} */ id, /** @type {(...a: any[]) => any} */ fn) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, fn));

  reg('sshHostColors.openManager', () => ManagerPanel.show(context, api));
  reg('sshHostColors.menu', menuCommand);
  reg('sshHostColors.setColor', setColorCommand);
  reg('sshHostColors.configureZones', configureZonesCommand);
  reg('sshHostColors.removeColor', removeColorCommand);
  reg('sshHostColors.removeAll', removeAllCommand);
  reg('sshHostColors.cleanWorkspace', cleanWorkspaceCommand);
  reg('sshHostColors.toggle', toggleCommand);
  reg('sshHostColors.refresh', apply);
  reg('sshHostColors.export', transfer.exportCommand);
  reg('sshHostColors.import', transfer.importCommand);

  context.subscriptions.push(
    statusItem,
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(hosts.SECTION) || e.affectsConfiguration('remote.SSH.configFile')) {
        apply();
        ManagerPanel.refresh();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      apply();
      ManagerPanel.refresh();
    })
  );
  apply();
}

function deactivate() {}

// ---------------------------------------------------------------------------
// Détection de la fenêtre (environnement distant et dossier ouvert)
// ---------------------------------------------------------------------------

/** URI qui identifie la fenêtre : le fichier .code-workspace, sinon le premier dossier. */
function windowUri() {
  const file = vscode.workspace.workspaceFile;
  return file && file.scheme !== 'untitled' ? file : vscode.workspace.workspaceFolders?.[0]?.uri;
}

/**
 * Certaines extensions distantes encodent l'authority en hexa (souvent du JSON).
 * @param {string} raw
 * @returns {unknown}
 */
function decodeHex(raw) {
  if (!/^[0-9a-f]+$/i.test(raw) || raw.length % 2 !== 0) return undefined;
  const text = Buffer.from(raw, 'hex').toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Clé de l'environnement distant de cette fenêtre (voir media/targets.js).
 * @returns {string | undefined}
 */
function getRemoteKey() {
  const remote = vscode.env.remoteName;
  const uri = windowUri();
  if (!remote || !uri) return undefined;

  const match = /^[^+]+\+(.+)$/.exec(decodeURIComponent(uri.authority));
  if (!match) return undefined;
  const raw = match[1];
  const decoded = /** @type {any} */ (decodeHex(raw));

  switch (remote) {
    case 'ssh-remote':
      // Remote-SSH récent : {"hostName":"..."} en hexa
      return typeof decoded?.hostName === 'string' ? decoded.hostName : raw;
    case 'wsl':
      return 'wsl:' + raw;
    case 'dev-container':
    case 'attached-container': {
      let name;
      if (typeof decoded?.containerName === 'string') name = decoded.containerName.replace(/^\//, '');
      else if (typeof decoded?.hostPath === 'string') name = targets.basename(decoded.hostPath);
      else if (typeof decoded === 'string') name = targets.basename(decoded);
      return 'container:' + (name || targets.basename(uri.path));
    }
    case 'codespaces':
      return 'codespace:' + raw;
    case 'tunnel':
      return 'tunnel:' + raw;
    default:
      return undefined;
  }
}

/**
 * Clés possibles pour cette fenêtre.
 * @returns {{ remote?: string, folder?: string }}
 */
function getWindowKeys() {
  const remote = getRemoteKey();
  const uri = windowUri();
  // Pas de couleur par dossier pour un environnement distant non reconnu.
  if (!uri || (vscode.env.remoteName && !remote)) return { remote };
  const path = uri.scheme === 'file' ? uri.fsPath.replace(/\\/g, '/') : uri.path;
  return { remote, folder: targets.folderKey(remote ?? '', path) };
}

/**
 * Clé utilisée pour colorer cette fenêtre : le dossier s'il a sa propre couleur,
 * sinon l'environnement distant, sinon le dossier (fenêtre locale).
 * @returns {string | undefined}
 */
function getCurrentKey() {
  const { remote, folder } = getWindowKeys();
  if (folder && hosts.findEntry(folder)) return folder;
  return remote ?? folder;
}

/** Nom lisible d'une clé, pour les titres et la barre d'état. */
function displayName(/** @type {string} */ key) {
  const d = targets.describe(key);
  return d.kind === 'folder' ? l10n.t('Folder: {0}', d.name) : d.remote ?? key;
}

function hasWorkspace() {
  return !!(vscode.workspace.workspaceFolders?.length || vscode.workspace.workspaceFile);
}

function isEnabled() {
  return vscode.workspace.getConfiguration(hosts.SECTION).get('enabled', true);
}

// ---------------------------------------------------------------------------
// Application des couleurs
// ---------------------------------------------------------------------------

let queue = Promise.resolve();

/** Sérialise les écritures dans les settings pour éviter les conflits. */
function apply() {
  queue = queue.then(applyNow).catch((err) => console.warn('[ssh-host-colors]', err));
  return queue;
}

let previewTimer;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(apply, 120);
}

async function applyNow() {
  const host = getCurrentKey();
  const entry = host && isEnabled() ? previewEntry ?? hosts.findEntry(host) : undefined;
  const zones = entry ? entry.elements ?? hosts.defaultZones() : [];
  const wanted = entry ? colors.buildCustomizations(entry.color, zones) : {};

  updateStatusItem(host, entry, zones);
  await writeColorCustomizations(wanted);
}

/**
 * @param {string | undefined} host
 * @param {{ color: string, label?: string } | undefined} entry
 * @param {string[]} zones
 */
function updateStatusItem(host, entry, zones) {
  const show = vscode.workspace.getConfiguration(hosts.SECTION).get('showStatusBarItem', true);
  // En local, la pastille n'apparaît que pour les dossiers qui ont une couleur.
  if (!host || !show || (!entry && !vscode.env.remoteName)) {
    statusItem.hide();
    return;
  }
  const name = entry?.label ?? targets.describe(host).name;
  statusItem.text = `${entry ? '$(circle-filled)' : '$(circle-outline)'} ${name}`;
  // Si la barre d'état est déjà colorée, la pastille prend la couleur du texte.
  statusItem.color = entry && !zones.includes('statusBar') ? entry.color : undefined;

  const md = new vscode.MarkdownString(undefined, true);
  md.appendMarkdown(`**${displayName(host)}**\n\n`);
  if (!isEnabled()) md.appendMarkdown(l10n.t('Colors disabled') + '\n\n');
  else if (entry) md.appendMarkdown(l10n.t('Color: {0}', `\`${entry.color}\``) + '\n\n');
  else md.appendMarkdown(l10n.t('No color set') + '\n\n');
  if (!hasWorkspace()) md.appendMarkdown(`_${l10n.t('Open a folder to color the window.')}_\n\n`);
  md.appendMarkdown(l10n.t('Click for options'));
  statusItem.tooltip = md;
  statusItem.show();
}

/**
 * Fusionne nos couleurs dans workbench.colorCustomizations (niveau workspace)
 * sans toucher aux personnalisations de l'utilisateur.
 * @param {Record<string, string>} wanted
 */
async function writeColorCustomizations(wanted) {
  if (!hasWorkspace()) return;

  /** @type {Record<string, string>} */
  const previouslyApplied = ctx.workspaceState.get(STATE_KEY) ?? {};
  const workbench = vscode.workspace.getConfiguration('workbench');
  /** @type {Record<string, unknown>} */
  const current = { ...(workbench.inspect('colorCustomizations')?.workspaceValue ?? {}) };

  let changed = false;
  // Retire ce qu'on avait posé, sauf si l'utilisateur l'a modifié entre-temps.
  for (const [key, value] of Object.entries(previouslyApplied)) {
    if (!(key in wanted) && current[key] === value) {
      delete current[key];
      changed = true;
    }
  }
  for (const [key, value] of Object.entries(wanted)) {
    if (current[key] !== value) {
      current[key] = value;
      changed = true;
    }
  }

  await ctx.workspaceState.update(STATE_KEY, wanted);
  if (!changed) return;

  await workbench.update(
    'colorCustomizations',
    Object.keys(current).length ? current : undefined,
    vscode.ConfigurationTarget.Workspace
  );
}

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------

/** @param {unknown} [arg] */
async function askHost(arg) {
  if (typeof arg === 'string' && arg) return arg;
  const detected = getCurrentKey();
  if (detected) return detected;

  const { readSshHosts } = require('./sshConfig');
  const known = new Set([...hosts.listEntries().map((e) => e.key), ...readSshHosts()]);
  const items = [...known].map((h) => ({ label: h, description: hosts.findEntry(h)?.color ?? '' }));
  const typed = { label: `$(add) ${l10n.t('Enter another host…')}`, alwaysShow: true };
  const pick = await vscode.window.showQuickPick([...items, typed], {
    placeHolder: l10n.t('No remote or folder detected in this window — pick an entry'),
  });
  if (!pick) return undefined;
  if (pick !== typed) return pick.label;
  return vscode.window.showInputBox({
    prompt: l10n.t(
      "SSH host (as in ~/.ssh/config), or wsl:…, container:…, codespace:…, tunnel:…, folder:…. Wildcards '*' and '?' are allowed."
    ),
    placeHolder: l10n.t('e.g. prod-server or prod-*'),
  });
}

async function menuCommand() {
  const host = getCurrentKey();
  const entry = host ? hosts.findEntry(host) : undefined;
  const { remote, folder } = getWindowKeys();
  /** @type {(vscode.QuickPickItem & { cmd?: string, arg?: string })[]} */
  const items = [
    { label: `$(symbol-color) ${l10n.t('Change Color')}`, cmd: 'sshHostColors.setColor' },
    // Fenêtre distante sans couleur propre au dossier : proposer de colorer ce projet seul.
    ...(remote && folder && host !== folder
      ? [{ label: `$(folder) ${l10n.t('Color Only This Folder')}`, cmd: 'sshHostColors.setColor', arg: folder }]
      : []),
    { label: `$(layout) ${l10n.t('Choose Colored Areas')}`, cmd: 'sshHostColors.configureZones' },
    {
      label: `$(settings-gear) ${l10n.t('Open Manager')}`,
      description: l10n.t('preview, all hosts'),
      cmd: 'sshHostColors.openManager',
    },
    { label: '', kind: vscode.QuickPickItemKind.Separator },
    {
      label: isEnabled() ? `$(eye-closed) ${l10n.t('Disable Colors')}` : `$(eye) ${l10n.t('Enable Colors')}`,
      cmd: 'sshHostColors.toggle',
    },
  ];
  if (entry) items.push({ label: `$(trash) ${l10n.t("Remove This Host's Color")}`, cmd: 'sshHostColors.removeColor' });
  const pick = await vscode.window.showQuickPick(items, { placeHolder: host ? displayName(host) : 'Host Colors' });
  if (pick?.cmd) vscode.commands.executeCommand(pick.cmd, pick.arg);
}

/** @param {unknown} [arg] */
async function setColorCommand(arg) {
  const host = await askHost(arg);
  if (!host) return;
  const entry = hosts.findEntry(host);
  // Le dossier de la fenêtre passe avant l'environnement distant : il est toujours prévisualisable.
  const live = (host === getCurrentKey() || host === getWindowKeys().folder) && hasWorkspace() && isEnabled();

  /** @type {(vscode.QuickPickItem & { color?: string, action?: 'custom' | 'random' })[]} */
  const items = [
    ...colors.PRESETS.map((p) => ({
      label: `$(circle-filled) ${l10n.t(p.label)}`,
      description: p.color + (p.color === entry?.color ? `  · ${l10n.t('current')}` : ''),
      color: p.color,
    })),
    { label: '', kind: vscode.QuickPickItemKind.Separator },
    { label: `$(edit) ${l10n.t('Custom color…')}`, description: l10n.t('hex code'), action: 'custom' },
    { label: `$(sparkle) ${l10n.t('Random color')}`, action: 'random' },
  ];

  const qp = vscode.window.createQuickPick();
  qp.items = items;
  qp.title = l10n.t('Color for “{0}”', host);
  qp.placeholder = live ? l10n.t('Hover over a color to preview it on the window') : l10n.t('Pick a color');
  const currentItem = items.find((i) => i.color && i.color === entry?.color);
  if (currentItem) qp.activeItems = [currentItem];

  const preview = (/** @type {string | undefined} */ color) => {
    if (!live) return;
    previewEntry = color ? { color, elements: entry?.elements, label: entry?.label } : undefined;
    schedulePreview();
  };

  let accepted = false;
  qp.onDidChangeActive(([item]) => preview(/** @type {any} */ (item)?.color));
  qp.onDidAccept(async () => {
    accepted = true;
    const item = /** @type {typeof items[number]} */ (qp.selectedItems[0]);
    qp.hide();
    let color = item?.color;
    if (item?.action === 'random') color = colors.randomColor();
    if (item?.action === 'custom') {
      color = await vscode.window.showInputBox({
        title: l10n.t('Color for “{0}”', host),
        prompt: l10n.t('Hex color (live preview while typing)'),
        value: entry?.color ?? '#',
        validateInput: (v) => {
          const ok = colors.normalizeHex(v);
          if (ok) preview(ok);
          return ok ? undefined : l10n.t('Expected format: #rrggbb or #rgb');
        },
      });
    }
    previewEntry = undefined;
    const normalized = colors.normalizeHex(color ?? '');
    if (normalized) {
      // Si la couleur venait d'un motif (prod-*), on crée une entrée propre à ce host.
      const own = entry && !/[*?]/.test(entry.key) ? entry : undefined;
      await hosts.saveEntry(own?.key ?? host, { ...own, color: normalized });
    } else {
      apply();
    }
  });
  qp.onDidHide(() => {
    if (!accepted) {
      previewEntry = undefined;
      apply();
    }
    qp.dispose();
  });
  qp.show();
}

/** @param {unknown} [arg] */
async function configureZonesCommand(arg) {
  const detected = getCurrentKey();
  /** @type {'host' | 'defaults'} */
  let scope = 'defaults';
  let host = typeof arg === 'string' ? arg : detected;

  if (host) {
    const pick = await vscode.window.showQuickPick(
      [
        { label: `$(server) ${l10n.t('For “{0}” only', host)}`, scope: /** @type {const} */ ('host') },
        { label: `$(globe) ${l10n.t('Default areas (all hosts)')}`, scope: /** @type {const} */ ('defaults') },
      ],
      { placeHolder: l10n.t('Which areas do you want to change?') }
    );
    if (!pick) return;
    scope = pick.scope;
  }

  const entry = host ? hosts.findEntry(host) : undefined;
  if (scope === 'host' && !entry) {
    vscode.window.showInformationMessage(l10n.t('“{0}” has no color yet. Pick one first.', String(host)));
    return setColorCommand(host);
  }

  const initial = scope === 'host' && entry ? hosts.zonesOf(entry) : hosts.defaultZones();
  const live = !!entry && host === detected && hasWorkspace() && isEnabled() && (scope === 'host' || !entry.elements);

  const qp = vscode.window.createQuickPick();
  qp.canSelectMany = true;
  qp.title = scope === 'host' ? l10n.t('Colored areas for “{0}”', String(host)) : l10n.t('Default colored areas');
  qp.placeholder = live
    ? l10n.t('Check / uncheck: live preview. Press Enter to confirm.')
    : l10n.t('Press Enter to confirm');
  const items = colors.ZONES.map((z) => ({ label: l10n.t(z.label), description: l10n.t(z.description), id: z.id }));
  qp.items = items;
  qp.selectedItems = items.filter((i) => initial.includes(i.id));

  let accepted = false;
  qp.onDidChangeSelection((sel) => {
    if (!live || !entry) return;
    previewEntry = { color: entry.color, label: entry.label, elements: sel.map((s) => /** @type {any} */ (s).id) };
    schedulePreview();
  });
  qp.onDidAccept(async () => {
    accepted = true;
    const zones = qp.selectedItems.map((s) => /** @type {any} */ (s).id);
    qp.hide();
    previewEntry = undefined;
    if (scope === 'host' && entry) {
      await hosts.saveEntry(entry.key, { ...entry, elements: zones });
    } else {
      await hosts.setDefaultZones(zones);
    }
  });
  qp.onDidHide(() => {
    if (!accepted) {
      previewEntry = undefined;
      apply();
    }
    qp.dispose();
  });
  qp.show();
}

/** @param {unknown} [arg] */
async function removeColorCommand(arg) {
  const host = await askHost(arg);
  if (!host) return;
  const entry = hosts.findEntry(host);
  if (!entry) {
    vscode.window.showInformationMessage(l10n.t('“{0}” has no color.', host));
    return;
  }
  if (/[*?]/.test(entry.key)) {
    const ok = await vscode.window.showWarningMessage(
      l10n.t(
        'The color of “{0}” comes from the pattern “{1}”. Remove this pattern (and therefore the color of every host matching it)?',
        host,
        entry.key
      ),
      { modal: true },
      l10n.t('Remove pattern')
    );
    if (!ok) return;
  }
  await hosts.deleteEntry(entry.key);
}

async function removeAllCommand() {
  const count = hosts.listEntries().length;
  const ok = await vscode.window.showWarningMessage(
    count
      ? l10n.t('Remove the colors of the {0} configured host(s)?', count)
      : l10n.t('No host configured. Clean up the remaining colors in this window anyway?'),
    {
      modal: true,
      detail: l10n.t(
        'Open windows are cleaned right away, the others will be the next time they are opened. Your own color customizations are not touched.'
      ),
    },
    l10n.t('Remove All')
  );
  if (!ok) return;
  previewEntry = undefined;
  await hosts.deleteAllEntries();
  await apply();
  vscode.window.showInformationMessage(l10n.t('All SSH colors have been removed.'));
}

async function cleanWorkspaceCommand() {
  if (!hasWorkspace()) {
    vscode.window.showInformationMessage(l10n.t('No folder open: nothing to clean.'));
    return;
  }
  const ok = await vscode.window.showWarningMessage(
    l10n.t('Remove from this workspace all the colors this extension can write?'),
    {
      modal: true,
      detail: l10n.t(
        "Useful if colors got stuck. Warning: if you customized these same areas yourself in .vscode/settings.json, they will be removed too. Remember to disable the extension or remove the host's color, otherwise it will be applied again."
      ),
    },
    l10n.t('Clean')
  );
  if (!ok) return;

  await queue;
  const workbench = vscode.workspace.getConfiguration('workbench');
  /** @type {Record<string, unknown>} */
  const current = { ...(workbench.inspect('colorCustomizations')?.workspaceValue ?? {}) };
  for (const k of colors.ALL_KEYS) delete current[k];
  await workbench.update(
    'colorCustomizations',
    Object.keys(current).length ? current : undefined,
    vscode.ConfigurationTarget.Workspace
  );
  await ctx.workspaceState.update(STATE_KEY, {});
}

async function toggleCommand() {
  await vscode.workspace
    .getConfiguration(hosts.SECTION)
    .update('enabled', !isEnabled(), vscode.ConfigurationTarget.Global);
}

/** Fonctions exposées au gestionnaire. */
const api = { getCurrentKey, getWindowKeys, hasWorkspace, isEnabled, apply };

module.exports = { activate, deactivate };
