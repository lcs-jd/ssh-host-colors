// @ts-check
const vscode = require('vscode');
const colors = require('../media/colors.js');
const hosts = require('./hosts');
const { ManagerPanel } = require('./panel');

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
  statusItem.name = 'SSH Host Colors';
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
// Détection du host
// ---------------------------------------------------------------------------

/** @returns {string | undefined} */
function getSshHost() {
  if (vscode.env.remoteName !== 'ssh-remote') return undefined;

  const uri = vscode.workspace.workspaceFile ?? vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!uri) return undefined;

  const match = /^ssh-remote\+(.+)$/.exec(decodeURIComponent(uri.authority));
  if (!match) return undefined;
  const raw = match[1];

  // Les versions récentes de Remote-SSH encodent l'authority en hexa : {"hostName":"..."}
  if (/^[0-9a-f]+$/i.test(raw) && raw.length % 2 === 0) {
    try {
      const json = JSON.parse(Buffer.from(raw, 'hex').toString('utf8'));
      if (json && typeof json.hostName === 'string') return json.hostName;
    } catch {
      // pas du JSON hexa : on garde la valeur brute
    }
  }
  return raw;
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
  const host = getSshHost();
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
  if (!host || !show) {
    statusItem.hide();
    return;
  }
  const name = entry?.label ?? host;
  statusItem.text = `${entry ? '$(circle-filled)' : '$(circle-outline)'} ${name}`;
  // Si la barre d'état est déjà colorée, la pastille prend la couleur du texte.
  statusItem.color = entry && !zones.includes('statusBar') ? entry.color : undefined;

  const md = new vscode.MarkdownString(undefined, true);
  md.appendMarkdown(`**SSH : ${host}**\n\n`);
  if (!isEnabled()) md.appendMarkdown('Couleurs désactivées\n\n');
  else if (entry) md.appendMarkdown(`Couleur : \`${entry.color}\`\n\n`);
  else md.appendMarkdown('Aucune couleur définie\n\n');
  if (!hasWorkspace()) md.appendMarkdown('_Ouvre un dossier pour colorer la fenêtre._\n\n');
  md.appendMarkdown('Clic pour les options');
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
  const detected = getSshHost();
  if (detected) return detected;

  const { readSshHosts } = require('./sshConfig');
  const known = new Set([...hosts.listEntries().map((e) => e.key), ...readSshHosts()]);
  const items = [...known].map((h) => ({ label: h, description: hosts.findEntry(h)?.color ?? '' }));
  const typed = { label: '$(add) Saisir un autre host…', alwaysShow: true };
  const pick = await vscode.window.showQuickPick([...items, typed], {
    placeHolder: 'Aucun host SSH détecté dans cette fenêtre — choisis un host',
  });
  if (!pick) return undefined;
  if (pick !== typed) return pick.label;
  return vscode.window.showInputBox({
    prompt: "Nom du host (comme dans ~/.ssh/config). Les jokers '*' et '?' sont acceptés.",
    placeHolder: 'ex : prod-server ou prod-*',
  });
}

async function menuCommand() {
  const host = getSshHost();
  const entry = host ? hosts.findEntry(host) : undefined;
  /** @type {(vscode.QuickPickItem & { cmd?: string })[]} */
  const items = [
    { label: '$(symbol-color) Changer la couleur', cmd: 'sshHostColors.setColor' },
    { label: '$(layout) Choisir les zones colorées', cmd: 'sshHostColors.configureZones' },
    { label: '$(settings-gear) Ouvrir le gestionnaire', description: 'aperçu, tous les hosts', cmd: 'sshHostColors.openManager' },
    { label: '', kind: vscode.QuickPickItemKind.Separator },
    {
      label: isEnabled() ? '$(eye-closed) Désactiver les couleurs' : '$(eye) Activer les couleurs',
      cmd: 'sshHostColors.toggle',
    },
  ];
  if (entry) items.push({ label: '$(trash) Supprimer la couleur de ce host', cmd: 'sshHostColors.removeColor' });
  const pick = await vscode.window.showQuickPick(items, { placeHolder: host ? `SSH : ${host}` : 'SSH Host Colors' });
  if (pick?.cmd) vscode.commands.executeCommand(pick.cmd);
}

/** @param {unknown} [arg] */
async function setColorCommand(arg) {
  const host = await askHost(arg);
  if (!host) return;
  const entry = hosts.findEntry(host);
  const live = host === getSshHost() && hasWorkspace() && isEnabled();

  /** @type {(vscode.QuickPickItem & { color?: string, action?: 'custom' | 'random' })[]} */
  const items = [
    ...colors.PRESETS.map((p) => ({
      label: `$(circle-filled) ${p.label}`,
      description: p.color + (p.color === entry?.color ? '  · actuelle' : ''),
      color: p.color,
    })),
    { label: '', kind: vscode.QuickPickItemKind.Separator },
    { label: '$(edit) Couleur personnalisée…', description: 'code hexadécimal', action: 'custom' },
    { label: '$(sparkle) Couleur aléatoire', action: 'random' },
  ];

  const qp = vscode.window.createQuickPick();
  qp.items = items;
  qp.title = `Couleur pour « ${host} »`;
  qp.placeholder = live ? 'Survole une couleur pour la prévisualiser sur la fenêtre' : 'Choisis une couleur';
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
        title: `Couleur pour « ${host} »`,
        prompt: 'Couleur hexadécimale (aperçu en direct pendant la saisie)',
        value: entry?.color ?? '#',
        validateInput: (v) => {
          const ok = colors.normalizeHex(v);
          if (ok) preview(ok);
          return ok ? undefined : 'Format attendu : #rrggbb ou #rgb';
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
  const detected = getSshHost();
  /** @type {'host' | 'defaults'} */
  let scope = 'defaults';
  let host = typeof arg === 'string' ? arg : detected;

  if (host) {
    const pick = await vscode.window.showQuickPick(
      [
        { label: `$(server) Pour « ${host} » uniquement`, scope: /** @type {const} */ ('host') },
        { label: '$(globe) Zones par défaut (tous les hosts)', scope: /** @type {const} */ ('defaults') },
      ],
      { placeHolder: 'Quelles zones modifier ?' }
    );
    if (!pick) return;
    scope = pick.scope;
  }

  const entry = host ? hosts.findEntry(host) : undefined;
  if (scope === 'host' && !entry) {
    vscode.window.showInformationMessage(`« ${host} » n'a pas encore de couleur. Choisis-en une d'abord.`);
    return setColorCommand(host);
  }

  const initial = scope === 'host' && entry ? hosts.zonesOf(entry) : hosts.defaultZones();
  const live = !!entry && host === detected && hasWorkspace() && isEnabled() && (scope === 'host' || !entry.elements);

  const qp = vscode.window.createQuickPick();
  qp.canSelectMany = true;
  qp.title = scope === 'host' ? `Zones colorées pour « ${host} »` : 'Zones colorées par défaut';
  qp.placeholder = live ? 'Coche / décoche : aperçu en direct. Entrée pour valider.' : 'Entrée pour valider';
  const items = colors.ZONES.map((z) => ({ label: z.label, description: z.description, id: z.id }));
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
    vscode.window.showInformationMessage(`« ${host} » n'a pas de couleur.`);
    return;
  }
  if (/[*?]/.test(entry.key)) {
    const ok = await vscode.window.showWarningMessage(
      `La couleur de « ${host} » vient du motif « ${entry.key} ». Supprimer ce motif (et donc la couleur de tous les hosts qui y correspondent) ?`,
      { modal: true },
      'Supprimer le motif'
    );
    if (!ok) return;
  }
  await hosts.deleteEntry(entry.key);
}

async function removeAllCommand() {
  const count = hosts.listEntries().length;
  const ok = await vscode.window.showWarningMessage(
    count
      ? `Supprimer les couleurs des ${count} host(s) configuré(s) ?`
      : 'Aucun host configuré. Nettoyer quand même les couleurs restantes de cette fenêtre ?',
    {
      modal: true,
      detail:
        "Les fenêtres ouvertes sont nettoyées tout de suite, les autres le seront à leur prochaine ouverture. Tes propres personnalisations de couleurs ne sont pas touchées.",
    },
    'Tout supprimer'
  );
  if (!ok) return;
  previewEntry = undefined;
  await hosts.deleteAllEntries();
  await apply();
  vscode.window.showInformationMessage('Toutes les couleurs SSH ont été supprimées.');
}

async function cleanWorkspaceCommand() {
  if (!hasWorkspace()) {
    vscode.window.showInformationMessage('Aucun dossier ouvert : rien à nettoyer.');
    return;
  }
  const ok = await vscode.window.showWarningMessage(
    'Retirer de ce workspace toutes les couleurs que cette extension peut écrire ?',
    {
      modal: true,
      detail:
        "Utile si des couleurs sont restées bloquées. Attention : si tu as toi-même personnalisé ces mêmes zones dans .vscode/settings.json, elles seront aussi retirées. Pense à désactiver l'extension ou à supprimer la couleur du host, sinon elle sera réappliquée.",
    },
    'Nettoyer'
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
const api = { getSshHost, hasWorkspace, isEnabled, apply };

module.exports = { activate, deactivate };
