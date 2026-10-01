// Logique de couleurs partagée entre l'extension (Node) et le gestionnaire (webview).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SshHostColors = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const ZONES = [
    { id: 'titleBar', label: 'Barre de titre', description: 'Tout le bandeau en haut de la fenêtre' },
    { id: 'commandCenter', label: 'Centre de commandes', description: 'La barre de recherche au milieu du titre' },
    { id: 'activityBar', label: "Barre d'activité", description: 'La colonne d’icônes à gauche' },
    { id: 'statusBar', label: "Barre d'état", description: 'Le bandeau tout en bas' },
    { id: 'remoteIndicator', label: 'Indicateur distant', description: 'Le bouton « SSH: … » en bas à gauche' },
    { id: 'activeTab', label: 'Onglet actif', description: 'Liseré au-dessus de l’onglet ouvert' },
    { id: 'sideBarBorder', label: 'Bordure latérale', description: 'Trait entre l’explorateur et l’éditeur' },
    { id: 'panelBorder', label: 'Bordure du panneau', description: 'Trait au-dessus du terminal' },
    { id: 'windowBorder', label: 'Bordure de fenêtre', description: 'Cadre autour de la fenêtre (Windows/Linux)' },
  ];

  const DEFAULT_ZONES = ['titleBar', 'activityBar', 'statusBar'];

  const PRESETS = [
    { label: 'Rouge', color: '#c0392b' },
    { label: 'Orange', color: '#d35400' },
    { label: 'Jaune', color: '#f1c40f' },
    { label: 'Vert', color: '#27ae60' },
    { label: 'Turquoise', color: '#16a085' },
    { label: 'Cyan', color: '#0097a7' },
    { label: 'Bleu', color: '#2980b9' },
    { label: 'Indigo', color: '#3f51b5' },
    { label: 'Violet', color: '#8e44ad' },
    { label: 'Rose', color: '#e84393' },
    { label: 'Marron', color: '#795548' },
    { label: 'Gris', color: '#607d8b' },
  ];

  /** @returns {[number, number, number] | undefined} */
  function parseHex(hex) {
    if (typeof hex !== 'string') return undefined;
    let h = hex.trim().replace(/^#/, '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) return undefined;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }

  function toHex(rgb) {
    return '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  }

  /** '#ABC' -> '#aabbcc', ou undefined si invalide. */
  function normalizeHex(hex) {
    const rgb = parseHex(hex);
    return rgb ? toHex(rgb) : undefined;
  }

  function luminance(rgb) {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /** Texte foncé ou blanc selon la luminosité du fond. */
  function foregroundFor(rgb) {
    return luminance(rgb) > 0.4 ? '#15202b' : '#ffffff';
  }

  function mix(rgb, target, amount) {
    return rgb.map((v, i) => v + (target[i] - v) * amount);
  }

  /** Variante un peu plus sombre (ou plus claire si la couleur est déjà très sombre). */
  function shade(rgb) {
    return luminance(rgb) < 0.03 ? mix(rgb, [255, 255, 255], 0.2) : mix(rgb, [0, 0, 0], 0.25);
  }

  function randomColor() {
    const h = Math.random() * 360;
    const s = 0.55 + Math.random() * 0.25;
    const l = 0.38 + Math.random() * 0.17;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      return 255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    };
    return toHex([f(0), f(8), f(4)]);
  }

  /**
   * @param {string} color
   * @param {string[]} zones
   * @returns {Record<string, string>}
   */
  function buildCustomizations(color, zones) {
    const rgb = parseHex(color);
    if (!rgb || !Array.isArray(zones)) return {};
    const has = (z) => zones.includes(z) || (z === 'activeTab' && zones.includes('tabBar'));
    const bg = toHex(rgb);
    const fg = foregroundFor(rgb);
    const alt = toHex(shade(rgb));

    const c = {};
    if (has('titleBar')) {
      c['titleBar.activeBackground'] = bg;
      c['titleBar.activeForeground'] = fg;
      c['titleBar.inactiveBackground'] = alt;
      c['titleBar.inactiveForeground'] = fg + '99';
    }
    if (has('commandCenter')) {
      c['commandCenter.border'] = has('titleBar') ? fg + '55' : bg;
      c['commandCenter.background'] = has('titleBar') ? alt : bg + '33';
      if (has('titleBar')) c['commandCenter.foreground'] = fg;
    }
    if (has('activityBar')) {
      c['activityBar.background'] = bg;
      c['activityBar.foreground'] = fg;
      c['activityBar.inactiveForeground'] = fg + '99';
      c['activityBar.activeBorder'] = fg;
    }
    if (has('statusBar')) {
      c['statusBar.background'] = bg;
      c['statusBar.foreground'] = fg;
      c['statusBarItem.hoverBackground'] = fg + '22';
    }
    if (has('remoteIndicator')) {
      c['statusBarItem.remoteBackground'] = has('statusBar') ? alt : bg;
      c['statusBarItem.remoteForeground'] = fg;
    }
    if (has('activeTab')) {
      c['tab.activeBorderTop'] = bg;
      c['tab.unfocusedActiveBorderTop'] = bg + '99';
    }
    if (has('sideBarBorder')) {
      c['sideBar.border'] = bg;
    }
    if (has('panelBorder')) {
      c['panel.border'] = bg;
      c['panelTitle.activeBorder'] = bg;
    }
    if (has('windowBorder')) {
      c['window.activeBorder'] = bg;
      c['window.inactiveBorder'] = alt;
    }
    return c;
  }

  /** Toutes les clés que l'extension peut écrire. */
  const ALL_KEYS = Object.keys(buildCustomizations('#808080', ZONES.map((z) => z.id)));

  return {
    ZONES,
    DEFAULT_ZONES,
    PRESETS,
    ALL_KEYS,
    parseHex,
    toHex,
    normalizeHex,
    foregroundFor,
    randomColor,
    buildCustomizations,
  };
});
