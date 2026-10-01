// @ts-check
const vscode = require('vscode');
const colors = require('../media/colors.js');
const targets = require('../media/targets.js');

const SECTION = 'sshHostColors';

/**
 * @typedef {{ key: string, color: string, elements?: string[], label?: string }} HostEntry
 */

/** @returns {Record<string, unknown>} */
function rawHosts() {
  return { ...(vscode.workspace.getConfiguration(SECTION).inspect('hosts')?.globalValue ?? {}) };
}

/**
 * @param {string} key
 * @param {unknown} value
 * @returns {HostEntry | undefined}
 */
function normalize(key, value) {
  if (typeof value === 'string') {
    const color = colors.normalizeHex(value);
    return color ? { key, color } : undefined;
  }
  if (value && typeof value === 'object') {
    const v = /** @type {any} */ (value);
    const color = colors.normalizeHex(v.color);
    if (!color) return undefined;
    return {
      key,
      color,
      elements: Array.isArray(v.elements) ? v.elements.filter((e) => typeof e === 'string') : undefined,
      label: typeof v.label === 'string' && v.label.trim() ? v.label.trim() : undefined,
    };
  }
  return undefined;
}

/** @returns {HostEntry[]} */
function listEntries() {
  return Object.entries(rawHosts())
    .map(([k, v]) => normalize(k, v))
    .filter(/** @returns {e is HostEntry} */ (e) => !!e);
}

/** @param {string} pattern */
function wildcardRegex(pattern) {
  return new RegExp(
    '^' + pattern.toLowerCase().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
  );
}

/**
 * Trouve l'entrée correspondant à une clé : nom exact, puis sans « user@ » (SSH),
 * puis motifs à jokers (le plus spécifique d'abord). Un motif ne s'applique qu'aux
 * clés de même type : « * » ne vise que les hosts SSH, « folder:* » que les dossiers.
 * @param {string} host
 * @returns {HostEntry | undefined}
 */
function findEntry(host) {
  const entries = listEntries();
  const kind = targets.kindOf(host);
  const candidates = [host.toLowerCase()];
  const at = host.lastIndexOf('@');
  if (kind === 'ssh' && at >= 0) candidates.push(host.slice(at + 1).toLowerCase());

  for (const c of candidates) {
    const exact = entries.find((e) => e.key.toLowerCase() === c);
    if (exact) return exact;
  }
  const patterns = entries
    .filter((e) => /[*?]/.test(e.key) && targets.kindOf(e.key) === kind)
    .sort((a, b) => b.key.length - a.key.length);
  for (const c of candidates) {
    const hit = patterns.find((e) => wildcardRegex(e.key).test(c));
    if (hit) return hit;
  }
  return undefined;
}

/** @returns {string[]} */
function defaultZones() {
  const z = vscode.workspace.getConfiguration(SECTION).get('elements');
  return Array.isArray(z) ? z : colors.DEFAULT_ZONES;
}

/** @param {HostEntry} e */
function zonesOf(e) {
  return e.elements ?? defaultZones();
}

/** @param {Omit<HostEntry, 'key'>} e */
function serialize(e) {
  /** @type {Record<string, unknown>} */
  const o = { color: e.color };
  if (e.elements) o.elements = e.elements;
  if (e.label) o.label = e.label;
  return Object.keys(o).length === 1 ? e.color : o;
}

/** @param {Record<string, unknown>} hosts */
async function writeHosts(hosts) {
  await vscode.workspace
    .getConfiguration(SECTION)
    .update('hosts', Object.keys(hosts).length ? hosts : undefined, vscode.ConfigurationTarget.Global);
}

/**
 * Crée / modifie (et éventuellement renomme) une entrée.
 * @param {string} key
 * @param {Omit<HostEntry, 'key'>} data
 * @param {string} [previousKey]
 */
async function saveEntry(key, data, previousKey) {
  const hosts = rawHosts();
  /** @type {Record<string, unknown>} */
  const out = {};
  const value = serialize(data);
  let inserted = false;
  // Conserve l'ordre : la nouvelle valeur prend la place de l'ancienne.
  for (const [k, v] of Object.entries(hosts)) {
    if (k === previousKey || k === key) {
      if (!inserted) out[key] = value;
      inserted = true;
    } else {
      out[k] = v;
    }
  }
  if (!inserted) out[key] = value;
  await writeHosts(out);
}

/** @param {string} key */
async function deleteEntry(key) {
  const hosts = rawHosts();
  delete hosts[key];
  await writeHosts(hosts);
}

async function deleteAllEntries() {
  await writeHosts({});
}

/** @param {string[]} zones */
async function setDefaultZones(zones) {
  await vscode.workspace.getConfiguration(SECTION).update('elements', zones, vscode.ConfigurationTarget.Global);
}

/** Configuration à exporter : entrées brutes et zones par défaut. */
function exportData() {
  return { sshHostColors: 1, hosts: rawHosts(), elements: defaultZones() };
}

/**
 * Lit un fichier exporté. Accepte aussi un simple objet { clé: couleur } ou
 * un extrait de settings.json ({ "sshHostColors.hosts": … }).
 * @param {unknown} data
 * @returns {{ entries: HostEntry[], skipped: number, elements?: string[] }}
 */
function parseImport(data) {
  const d = /** @type {any} */ (data);
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { entries: [], skipped: 0 };
  const map = d.hosts ?? d['sshHostColors.hosts'] ?? (d.sshHostColors === undefined ? d : {});
  const entries = [];
  let skipped = 0;
  for (const [k, v] of Object.entries(map && typeof map === 'object' ? map : {})) {
    const key = k.trim();
    const e = key ? normalize(key, v) : undefined;
    if (e) entries.push(e);
    else skipped++;
  }
  const rawZones = d.elements ?? d['sshHostColors.elements'];
  const known = new Set(colors.ZONES.map((z) => z.id));
  const elements = Array.isArray(rawZones) ? rawZones.filter((z) => known.has(z)) : undefined;
  return { entries, skipped, elements };
}

/**
 * Fusionne (les entrées importées l'emportent) ou remplace la configuration.
 * @param {HostEntry[]} entries
 * @param {'merge' | 'replace'} mode
 * @param {string[]} [elements] zones par défaut, appliquées seulement en mode « remplacer »
 */
async function importEntries(entries, mode, elements) {
  /** @type {Record<string, unknown>} */
  const out = mode === 'replace' ? {} : rawHosts();
  for (const { key, ...data } of entries) {
    // Les clés sont insensibles à la casse : on remplace aussi « Prod » par « prod ».
    for (const k of Object.keys(out)) if (k.toLowerCase() === key.toLowerCase()) delete out[k];
    out[key] = serialize(data);
  }
  await writeHosts(out);
  if (mode === 'replace' && elements) await setDefaultZones(elements);
}

module.exports = {
  SECTION,
  exportData,
  parseImport,
  importEntries,
  listEntries,
  findEntry,
  defaultZones,
  zonesOf,
  saveEntry,
  deleteEntry,
  deleteAllEntries,
  setDefaultZones,
};
