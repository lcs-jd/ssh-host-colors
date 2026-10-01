// Clés des entrées, partagées entre l'extension (Node) et le gestionnaire (webview).
//   prod-server                  host SSH (pas de préfixe, compatible avec les anciennes versions)
//   wsl:Ubuntu                   distribution WSL
//   container:mon-projet         Dev Container
//   codespace:nom                GitHub Codespaces
//   tunnel:nom                   Remote Tunnel
//   folder:c:/projets/api        dossier local
//   folder:prod-server:/srv/app  dossier sur un environnement distant
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SshHostColorsTargets = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const REMOTE_LABELS = { wsl: 'WSL', container: 'Dev Container', codespace: 'Codespaces', tunnel: 'Tunnel' };
  const PREFIX = /^(folder|wsl|container|codespace|tunnel):/i;

  /** @param {string} key @returns {'ssh' | 'folder' | 'wsl' | 'container' | 'codespace' | 'tunnel'} */
  function kindOf(key) {
    const m = PREFIX.exec(key);
    return m ? /** @type {any} */ (m[1].toLowerCase()) : 'ssh';
  }

  /** @param {string} path */
  function basename(path) {
    return path.split(/[\\/]/).filter(Boolean).pop() || path;
  }

  /**
   * Nom court et libellé « distant » d'une clé, pour l'affichage.
   * @param {string} key
   * @returns {{ kind: ReturnType<typeof kindOf>, name: string, remote?: string }}
   */
  function describe(key) {
    const kind = kindOf(key);
    const rest = key.replace(PREFIX, '');
    if (kind === 'ssh') return { kind, name: key, remote: 'SSH: ' + key };
    if (kind === 'folder') return { kind, name: basename(rest) };
    return { kind, name: rest, remote: `${REMOTE_LABELS[kind]}: ${rest}` };
  }

  /** @param {string} remoteKey @param {string} path */
  function folderKey(remoteKey, path) {
    return 'folder:' + (remoteKey ? remoteKey + ':' : '') + path;
  }

  return { kindOf, describe, folderKey, basename };
});
