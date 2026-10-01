// @ts-check
const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

/**
 * Liste les hosts déclarés dans ~/.ssh/config (et les fichiers Include),
 * sans les motifs à jokers.
 * @returns {string[]}
 */
function readSshHosts() {
  const home = os.homedir();
  const hosts = new Set();
  const visited = new Set();

  /** @param {string} p */
  const expand = (p) => {
    let out = p.replace(/^~(?=$|[\\/])/, home);
    if (!path.isAbsolute(out)) out = path.join(home, '.ssh', out);
    return out;
  };

  /** @param {string} file */
  const readFile = (file) => {
    if (visited.has(file)) return;
    visited.add(file);
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return;
    }
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*(Host|Include)(?:\s*=\s*|\s+)(.+)$/i.exec(line);
      if (!m) continue;
      const args = (m[2].match(/"[^"]*"|\S+/g) ?? []).map((a) => a.replace(/^"|"$/g, ''));
      if (m[1].toLowerCase() === 'host') {
        for (const a of args) if (!/[*?!]/.test(a)) hosts.add(a);
      } else {
        for (const a of args) readPattern(expand(a));
      }
    }
  };

  /** Gère les Include avec jokers dans le nom de fichier (ex: config.d/*). */
  const readPattern = (/** @type {string} */ p) => {
    if (!/[*?]/.test(p)) return readFile(p);
    const dir = path.dirname(p);
    const re = new RegExp(
      '^' + path.basename(p).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    let entries = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries.sort()) if (re.test(e)) readFile(path.join(dir, e));
  };

  /** @type {string | undefined} */
  const custom = vscode.workspace.getConfiguration('remote.SSH').get('configFile');
  if (custom) readFile(expand(custom));
  readFile(path.join(home, '.ssh', 'config'));

  return [...hosts].sort((a, b) => a.localeCompare(b));
}

module.exports = { readSshHosts };
