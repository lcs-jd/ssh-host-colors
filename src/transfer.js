// @ts-check
const vscode = require('vscode');
const os = require('os');
const { l10n } = vscode;
const hosts = require('./hosts');

const FILTERS = { JSON: ['json'] };

/** Dossier proposé par défaut : celui du workspace local, sinon le dossier personnel. */
function defaultFolder() {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  return folder?.scheme === 'file' ? folder : vscode.Uri.file(os.homedir());
}

async function exportCommand() {
  const target = await vscode.window.showSaveDialog({
    title: l10n.t('Export Configuration'),
    defaultUri: vscode.Uri.joinPath(defaultFolder(), 'ssh-host-colors.json'),
    filters: FILTERS,
  });
  if (!target) return;
  const json = JSON.stringify(hosts.exportData(), null, 2) + '\n';
  await vscode.workspace.fs.writeFile(target, Buffer.from(json, 'utf8'));
  vscode.window.showInformationMessage(l10n.t('Configuration exported to {0}.', target.fsPath));
}

async function importCommand() {
  const [source] =
    (await vscode.window.showOpenDialog({
      title: l10n.t('Import Configuration'),
      defaultUri: defaultFolder(),
      filters: FILTERS,
      canSelectMany: false,
    })) ?? [];
  if (!source) return;

  let data;
  try {
    data = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(source)).toString('utf8'));
  } catch (err) {
    vscode.window.showErrorMessage(
      l10n.t('Could not read {0}: {1}', source.fsPath, err instanceof Error ? err.message : String(err))
    );
    return;
  }

  const { entries, skipped, elements } = hosts.parseImport(data);
  if (!entries.length) {
    vscode.window.showErrorMessage(l10n.t('No valid entry found in this file.'));
    return;
  }

  /** @type {'merge' | 'replace'} */
  let mode = 'merge';
  const current = hosts.listEntries().length;
  if (current) {
    const merge = l10n.t('Merge');
    const replace = l10n.t('Replace');
    const pick = await vscode.window.showWarningMessage(
      l10n.t('Import {0} entries: merge them with your {1} current entries, or replace everything?', entries.length, current),
      {
        modal: true,
        detail: l10n.t(
          'Merge keeps your other entries; imported entries win on conflicts. Replace deletes your current entries and default areas first.'
        ),
      },
      merge,
      replace
    );
    if (!pick) return;
    mode = pick === replace ? 'replace' : 'merge';
  }

  await hosts.importEntries(entries, mode, elements);
  const done = l10n.t('{0} entries imported.', entries.length);
  vscode.window.showInformationMessage(skipped ? `${done} ${l10n.t('{0} invalid entries skipped.', skipped)}` : done);
}

module.exports = { exportCommand, importCommand };
