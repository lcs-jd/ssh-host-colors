// @ts-check
(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();
  // @ts-ignore
  const C = window.SshHostColors;

  /**
   * @typedef {{ key: string, color: string, elements?: string[], label?: string }} HostEntry
   * @typedef {{ hosts: HostEntry[], defaults: string[], sshHosts: string[], currentHost?: string, currentKey?: string, hasWorkspace: boolean, enabled: boolean }} State
   * @typedef {{ originalName: string, name: string, label: string, color: string, custom: boolean, elements: string[] }} Draft
   */

  /** @type {State | null} */
  let state = null;
  /** @type {string | null} */
  let selected = (vscode.getState() || {}).selected ?? null;
  /** @type {Draft | null} */
  let draft = null;
  let previewActive = true;
  /** @type {any} */
  let saveTimer = null;

  const app = /** @type {HTMLElement} */ (document.getElementById('app'));

  /** @param {unknown} s */
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
  /** @param {string} sel */
  const $ = (sel) => /** @type {HTMLElement} */ (app.querySelector(sel));
  /** @param {string} sel */
  const $$ = (sel) => /** @type {HTMLElement[]} */ ([...app.querySelectorAll(sel)]);

  // -------------------------------------------------------------------------
  // Squelette
  // -------------------------------------------------------------------------

  app.innerHTML = `
    <header class="top">
      <div class="brand">
        <span class="logo"></span>
        <div>
          <h1>SSH Host Colors</h1>
          <p class="muted" id="status-line"></p>
        </div>
      </div>
      <div class="actions">
        <label class="switch" title="Activer / désactiver toutes les couleurs">
          <input type="checkbox" id="enabled"><span class="slider"></span><span>Activé</span>
        </label>
        <button class="secondary" data-cmd="openSettingsJson" title="Ouvrir settings.json">settings.json</button>
        <button class="secondary" data-cmd="cleanWorkspace" id="clean-btn" title="Retirer les couleurs restées bloquées dans ce workspace">Nettoyer ce workspace</button>
        <button class="danger" data-cmd="removeAll">Tout supprimer</button>
      </div>
    </header>

    <div id="banner"></div>

    <main class="layout">
      <aside>
        <section class="card">
          <h2>Hosts <span class="count" id="count"></span></h2>
          <ul class="host-list" id="host-list"></ul>
          <form id="add-form" class="add">
            <input id="add-input" list="ssh-hosts" placeholder="Nom du host ou motif (prod-*)" autocomplete="off">
            <datalist id="ssh-hosts"></datalist>
            <button type="submit">Ajouter</button>
          </form>
          <div id="suggestions"></div>
        </section>

        <section class="card">
          <h2>Zones par défaut</h2>
          <p class="muted small">Utilisées par tous les hosts qui n'ont pas leurs propres zones.</p>
          <div class="zones" id="default-zones"></div>
        </section>
      </aside>

      <section class="card editor" id="editor"></section>
    </main>
  `;

  app.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('[data-cmd]');
    if (btn) vscode.postMessage({ type: /** @type {HTMLElement} */ (btn).dataset.cmd });
  });

  $('#enabled').addEventListener('change', (e) => {
    vscode.postMessage({ type: 'setEnabled', enabled: /** @type {HTMLInputElement} */ (e.target).checked });
  });

  $('#add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = /** @type {HTMLInputElement} */ ($('#add-input'));
    addHost(input.value.trim());
    input.value = '';
  });

  /** @param {string} name */
  function addHost(name) {
    if (!name || !state) return;
    if (state.hosts.some((h) => h.key === name)) {
      select(name);
      return;
    }
    const used = new Set(state.hosts.map((h) => h.color));
    const color = (C.PRESETS.find((/** @type {any} */ p) => !used.has(p.color)) || { color: C.randomColor() }).color;
    selected = name;
    persistSelection();
    vscode.postMessage({ type: 'saveHost', name, color });
  }

  /** @param {string} name */
  function select(name) {
    flushSave();
    selected = name;
    persistSelection();
    loadDraft();
    renderList();
    renderEditor();
  }

  function persistSelection() {
    vscode.setState({ selected });
  }

  // -------------------------------------------------------------------------
  // Réception de l'état
  // -------------------------------------------------------------------------

  window.addEventListener('message', (e) => {
    if (e.data?.type !== 'state') return;
    state = e.data;
    const s = /** @type {State} */ (state);

    if (!selected || !s.hosts.some((h) => h.key === selected)) {
      selected = s.currentKey ?? s.hosts[0]?.key ?? null;
      persistSelection();
    }

    renderHeader();
    renderList();
    renderSuggestions();
    renderDefaults();

    // Ne pas écraser l'éditeur pendant une sauvegarde en attente.
    if (!saveTimer) {
      const entry = s.hosts.find((h) => h.key === selected);
      if (!draft || !entry || !sameAsDraft(entry)) {
        loadDraft();
        renderEditor();
        return;
      }
    }
    renderPreview();
  });

  vscode.postMessage({ type: 'ready' });

  /** @param {HostEntry} e */
  function sameAsDraft(e) {
    if (!draft) return false;
    return (
      draft.originalName === e.key &&
      draft.color === e.color &&
      (draft.label || undefined) === e.label &&
      draft.custom === !!e.elements &&
      (!e.elements || JSON.stringify(draft.elements) === JSON.stringify(e.elements))
    );
  }

  function loadDraft() {
    const entry = state?.hosts.find((h) => h.key === selected);
    draft = entry
      ? {
          originalName: entry.key,
          name: entry.key,
          label: entry.label ?? '',
          color: entry.color,
          custom: !!entry.elements,
          elements: [...(entry.elements ?? state?.defaults ?? [])],
        }
      : null;
  }

  // -------------------------------------------------------------------------
  // Sauvegarde (avec anti-rebond pour le sélecteur de couleur)
  // -------------------------------------------------------------------------

  function scheduleSave(delay = 250) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, delay);
  }

  function flushSave() {
    if (!saveTimer || !draft) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    const name = draft.name.trim();
    if (!name) return;
    vscode.postMessage({
      type: 'saveHost',
      originalName: draft.originalName,
      name,
      label: draft.label,
      color: draft.color,
      elements: draft.custom ? draft.elements : undefined,
    });
    draft.originalName = name;
    selected = name;
    persistSelection();
  }

  // -------------------------------------------------------------------------
  // Rendu
  // -------------------------------------------------------------------------

  function renderHeader() {
    if (!state) return;
    /** @type {HTMLInputElement} */ ($('#enabled')).checked = state.enabled;
    $('#clean-btn').hidden = !state.hasWorkspace;

    const line = $('#status-line');
    if (state.currentHost) {
      const entry = state.hosts.find((h) => h.key === state?.currentKey);
      line.innerHTML = `Connecté à <b>${esc(state.currentHost)}</b>${
        entry ? ` · <span class="dot" style="background:${entry.color}"></span>${esc(entry.color)}` : ' · pas de couleur'
      }`;
    } else {
      line.textContent = 'Fenêtre locale — les couleurs s’appliquent aux fenêtres connectées en SSH.';
    }

    const banner = $('#banner');
    banner.innerHTML = '';
    if (!state.enabled) {
      banner.innerHTML = `<div class="banner warn">Les couleurs sont désactivées. Réactive-les avec l’interrupteur en haut.</div>`;
    } else if (state.currentHost && !state.hasWorkspace) {
      banner.innerHTML = `<div class="banner warn">Aucun dossier ouvert sur <b>${esc(
        state.currentHost
      )}</b> : VS Code ne permet de colorer la fenêtre qu’avec un dossier ou un workspace ouvert.</div>`;
    }
  }

  function renderList() {
    if (!state) return;
    $('#count').textContent = String(state.hosts.length);
    const list = $('#host-list');
    if (!state.hosts.length) {
      list.innerHTML = `<li class="empty muted">Aucun host. Ajoute-en un ci-dessous.</li>`;
      return;
    }
    list.innerHTML = state.hosts
      .map((h) => {
        const color = h.key === draft?.originalName ? draft.color : h.color;
        const tags = [];
        if (h.key === state?.currentKey) tags.push('<span class="tag live">connecté</span>');
        if (/[*?]/.test(h.key)) tags.push('<span class="tag">motif</span>');
        if (h.elements) tags.push('<span class="tag">zones perso</span>');
        return `<li class="host ${h.key === selected ? 'selected' : ''}" data-host="${esc(h.key)}" tabindex="0">
          <span class="swatch" style="background:${color}"></span>
          <span class="host-name">
            <span>${esc(h.label || h.key)}</span>
            ${h.label ? `<span class="muted small">${esc(h.key)}</span>` : ''}
          </span>
          <span class="tags">${tags.join('')}</span>
        </li>`;
      })
      .join('');
    $$('#host-list .host').forEach((li) => {
      li.addEventListener('click', () => select(li.dataset.host ?? ''));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') select(li.dataset.host ?? '');
      });
    });
  }

  function renderSuggestions() {
    if (!state) return;
    const configured = new Set(state.hosts.map((h) => h.key.toLowerCase()));
    $('#ssh-hosts').innerHTML = state.sshHosts.map((h) => `<option value="${esc(h)}">`).join('');
    const missing = state.sshHosts.filter((h) => !configured.has(h.toLowerCase()));
    $('#suggestions').innerHTML = missing.length
      ? `<p class="muted small">Dans ton ~/.ssh/config :</p>
         <div class="chips">${missing
           .map((h) => `<button class="chip" data-add="${esc(h)}" title="Ajouter ${esc(h)}">+ ${esc(h)}</button>`)
           .join('')}</div>`
      : '';
    $$('#suggestions [data-add]').forEach((b) => b.addEventListener('click', () => addHost(b.dataset.add ?? '')));
  }

  /**
   * @param {HTMLElement} container
   * @param {string[]} active
   * @param {boolean} disabled
   * @param {(zones: string[]) => void} onChange
   */
  function renderZones(container, active, disabled, onChange) {
    container.innerHTML = C.ZONES.map(
      (/** @type {any} */ z) => `<label class="zone ${disabled ? 'disabled' : ''}" title="${esc(z.description)}">
        <input type="checkbox" value="${z.id}" ${active.includes(z.id) ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
        <span><b>${esc(z.label)}</b><span class="muted small">${esc(z.description)}</span></span>
      </label>`
    ).join('');
    container.querySelectorAll('input').forEach((input) =>
      input.addEventListener('change', () => {
        const zones = [...container.querySelectorAll('input:checked')].map((i) => /** @type {HTMLInputElement} */ (i).value);
        onChange(zones);
      })
    );
  }

  function renderDefaults() {
    if (!state) return;
    renderZones($('#default-zones'), state.defaults, false, (zones) => {
      if (state) state.defaults = zones;
      vscode.postMessage({ type: 'setDefaults', elements: zones });
      if (draft && !draft.custom) {
        draft.elements = [...zones];
        renderEditorZones();
        renderPreview();
      }
    });
  }

  function renderEditor() {
    const editor = $('#editor');
    if (!state || !draft) {
      editor.innerHTML = `<div class="empty-editor">
        <div class="big-swatch"></div>
        <h2>Aucun host sélectionné</h2>
        <p class="muted">Ajoute un host à gauche pour choisir sa couleur et voir l’aperçu.</p>
      </div>`;
      return;
    }
    const d = draft;
    editor.innerHTML = `
      <div class="editor-head">
        <h2>${esc(d.label || d.name)}</h2>
        <button class="danger ghost" id="delete-host">Supprimer</button>
      </div>

      <div class="grid2">
        <label class="field">
          <span>Host <span class="muted small">(nom dans ~/.ssh/config, jokers * ?)</span></span>
          <input id="f-name" value="${esc(d.name)}" list="ssh-hosts" autocomplete="off">
        </label>
        <label class="field">
          <span>Libellé <span class="muted small">(optionnel, affiché dans la barre d’état)</span></span>
          <input id="f-label" value="${esc(d.label)}" placeholder="${esc(d.name)}">
        </label>
      </div>

      <div class="field">
        <span>Couleur</span>
        <div class="color-row">
          <input type="color" id="f-color" value="${d.color}">
          <input id="f-hex" class="hex" value="${d.color}" maxlength="7" spellcheck="false">
          <button class="secondary" id="random">Aléatoire</button>
        </div>
        <div class="presets" id="presets">
          ${C.PRESETS.map(
            (/** @type {any} */ p) =>
              `<button class="preset" data-color="${p.color}" title="${esc(p.label)} ${p.color}" style="background:${p.color}"></button>`
          ).join('')}
        </div>
      </div>

      <div class="field">
        <span>Zones à colorer</span>
        <div class="segmented">
          <label><input type="radio" name="zmode" value="default" ${d.custom ? '' : 'checked'}> Zones par défaut</label>
          <label><input type="radio" name="zmode" value="custom" ${d.custom ? 'checked' : ''}> Zones personnalisées</label>
        </div>
        <div class="zones" id="host-zones"></div>
      </div>

      <div class="field">
        <div class="preview-head">
          <span>Aperçu</span>
          <div class="segmented small">
            <label><input type="radio" name="pmode" value="active" ${previewActive ? 'checked' : ''}> Fenêtre active</label>
            <label><input type="radio" name="pmode" value="inactive" ${previewActive ? '' : 'checked'}> Inactive</label>
          </div>
        </div>
        ${mockHtml()}
        <p class="muted small" id="live-hint"></p>
      </div>
    `;

    const nameInput = /** @type {HTMLInputElement} */ ($('#f-name'));
    nameInput.addEventListener('change', () => {
      const v = nameInput.value.trim();
      if (!v) {
        nameInput.value = d.name;
        return;
      }
      d.name = v;
      $('.editor-head h2').textContent = d.label || d.name;
      renderPreview();
      scheduleSave(0);
    });

    const labelInput = /** @type {HTMLInputElement} */ ($('#f-label'));
    labelInput.addEventListener('input', () => {
      d.label = labelInput.value;
      $('.editor-head h2').textContent = d.label || d.name;
      renderPreview();
      scheduleSave(500);
    });

    $('#f-color').addEventListener('input', (e) => setColor(/** @type {HTMLInputElement} */ (e.target).value, 'picker'));
    $('#f-hex').addEventListener('input', (e) => {
      const v = C.normalizeHex(/** @type {HTMLInputElement} */ (e.target).value);
      $('#f-hex').classList.toggle('invalid', !v);
      if (v) setColor(v, 'hex');
    });
    $('#random').addEventListener('click', () => setColor(C.randomColor()));
    $$('#presets .preset').forEach((b) => b.addEventListener('click', () => setColor(b.dataset.color ?? '')));

    $$('input[name="zmode"]').forEach((r) =>
      r.addEventListener('change', () => {
        d.custom = /** @type {HTMLInputElement} */ (r).value === 'custom' && /** @type {HTMLInputElement} */ (r).checked;
        if (!d.custom) d.elements = [...(state?.defaults ?? [])];
        renderEditorZones();
        renderPreview();
        scheduleSave(0);
      })
    );
    $$('input[name="pmode"]').forEach((r) =>
      r.addEventListener('change', () => {
        previewActive = /** @type {HTMLInputElement} */ (r).value === 'active';
        renderPreview();
      })
    );

    $('#delete-host').addEventListener('click', () => {
      flushSave();
      vscode.postMessage({ type: 'deleteHost', name: d.originalName });
    });

    renderEditorZones();
    renderPreview();
  }

  function renderEditorZones() {
    const d = draft;
    const container = app.querySelector('#host-zones');
    if (!d || !container) return;
    renderZones(/** @type {HTMLElement} */ (container), d.elements, !d.custom, (zones) => {
      d.elements = zones;
      renderPreview();
      scheduleSave(0);
    });
  }

  /**
   * @param {string} color
   * @param {'picker' | 'hex'} [source]
   */
  function setColor(color, source) {
    const d = draft;
    const c = C.normalizeHex(color);
    if (!d || !c) return;
    d.color = c;
    if (source !== 'picker') /** @type {HTMLInputElement} */ ($('#f-color')).value = c;
    if (source !== 'hex') {
      /** @type {HTMLInputElement} */ ($('#f-hex')).value = c;
      $('#f-hex').classList.remove('invalid');
    }
    const sw = app.querySelector(`#host-list .host.selected .swatch`);
    if (sw) /** @type {HTMLElement} */ (sw).style.background = c;
    renderPreview();
    scheduleSave(source === 'picker' || source === 'hex' ? 300 : 0);
  }

  // -------------------------------------------------------------------------
  // Aperçu (fausse fenêtre VS Code)
  // -------------------------------------------------------------------------

  function mockHtml() {
    const icons = ['files', 'search', 'git', 'debug', 'ext']
      .map((i, n) => `<span class="m-icon ${n === 0 ? 'active' : ''}" data-icon="${i}"></span>`)
      .join('');
    const code = [
      ['kw', 'import', 'id', ' os'],
      [],
      ['kw', 'def', 'fn', ' deploy', 'id', '(env):'],
      ['id', '    host = ', 'str', '"prod-01"'],
      ['id', '    ', 'kw', 'return', 'id', ' run(host, env)'],
    ]
      .map(
        (parts, i) =>
          `<div class="m-line"><span class="m-ln">${i + 1}</span>${chunk(parts)
            .map(([cls, txt]) => `<span class="c-${cls}">${esc(txt)}</span>`)
            .join('')}</div>`
      )
      .join('');
    return `
      <div class="mock" id="mock">
        <div class="m-title" id="m-title">
          <span class="m-dots"><i></i><i></i><i></i></span>
          <span class="m-menu">Fichier&nbsp;&nbsp;Édition&nbsp;&nbsp;Affichage</span>
          <span class="m-cc" id="m-cc">⌕ projet [SSH: <span id="m-host"></span>]</span>
          <span></span>
        </div>
        <div class="m-body">
          <div class="m-activity" id="m-activity">${icons}</div>
          <div class="m-sidebar" id="m-sidebar">
            <div class="m-sb-title">EXPLORATEUR</div>
            <div class="m-file">▾ projet</div>
            <div class="m-file in active">deploy.py</div>
            <div class="m-file in">README.md</div>
            <div class="m-file in">.env</div>
          </div>
          <div class="m-main">
            <div class="m-tabs" id="m-tabs">
              <div class="m-tab active" id="m-tab">deploy.py</div>
              <div class="m-tab">README.md</div>
            </div>
            <div class="m-editor">${code}</div>
            <div class="m-panel" id="m-panel">
              <div class="m-panel-tabs"><span class="active" id="m-panel-active">TERMINAL</span><span>PROBLÈMES</span></div>
              <div class="m-term">user@<span class="m-host-term"></span>:~$ <span class="m-cursor"></span></div>
            </div>
          </div>
        </div>
        <div class="m-status" id="m-status">
          <span class="m-remote" id="m-remote">⇋ SSH:&nbsp;<span class="m-host-remote"></span></span>
          <span class="m-status-item">⑂ main</span>
          <span class="m-status-item">⊗ 0  ⚠ 0</span>
          <span class="m-spacer"></span>
          <span class="m-status-item" id="m-ext-item"></span>
          <span class="m-status-item">UTF-8</span>
          <span class="m-status-item">Python</span>
        </div>
      </div>`;
  }

  /** @param {string[]} parts */
  function chunk(parts) {
    const out = [];
    for (let i = 0; i < parts.length; i += 2) out.push([parts[i], parts[i + 1]]);
    return out;
  }

  function renderPreview() {
    const d = draft;
    const mock = app.querySelector('#mock');
    if (!d || !state || !mock) return;

    const zones = d.custom ? d.elements : state.defaults;
    const map = C.buildCustomizations(d.color, zones);
    const a = previewActive;
    /** Valeur personnalisée, sinon la couleur du thème actuel. */
    const v = (/** @type {string} */ key, /** @type {string} */ fallback) =>
      map[key] ?? `var(--vscode-${key.replace(/\./g, '-')}, ${fallback})`;

    /** @param {string} id @param {Record<string, string>} styles */
    const set = (id, styles) => {
      const el = /** @type {HTMLElement | null} */ (mock.querySelector(id) ?? (id === '#mock' ? mock : null));
      if (el) Object.assign(el.style, styles);
    };

    set('#mock', {
      borderColor: a ? v('window.activeBorder', 'var(--vscode-widget-border, #8884)') : v('window.inactiveBorder', 'var(--vscode-widget-border, #8884)'),
      borderWidth: zones.includes('windowBorder') ? '2px' : '1px',
    });
    set('#m-title', {
      background: a ? v('titleBar.activeBackground', 'var(--vscode-sideBar-background)') : v('titleBar.inactiveBackground', 'var(--vscode-sideBar-background)'),
      color: a ? v('titleBar.activeForeground', 'var(--vscode-foreground)') : v('titleBar.inactiveForeground', 'var(--vscode-descriptionForeground)'),
    });
    set('#m-cc', {
      background: v('commandCenter.background', 'var(--vscode-input-background, #8882)'),
      borderColor: v('commandCenter.border', 'var(--vscode-widget-border, #8884)'),
      color: map['commandCenter.foreground'] ?? 'inherit',
    });
    set('#m-activity', {
      background: v('activityBar.background', 'var(--vscode-sideBar-background)'),
      color: v('activityBar.inactiveForeground', 'var(--vscode-descriptionForeground)'),
    });
    mock.querySelectorAll('.m-icon.active').forEach((el) =>
      Object.assign(/** @type {HTMLElement} */ (el).style, {
        color: v('activityBar.foreground', 'var(--vscode-foreground)'),
        borderLeftColor: v('activityBar.activeBorder', 'var(--vscode-focusBorder)'),
      })
    );
    set('#m-sidebar', { borderRightColor: v('sideBar.border', 'transparent') });
    set('#m-tabs', { borderBottomColor: v('editorGroupHeader.tabsBorder', 'transparent') });
    set('#m-tab', {
      borderTopColor: a ? v('tab.activeBorderTop', 'transparent') : v('tab.unfocusedActiveBorderTop', 'transparent'),
    });
    set('#m-panel', { borderTopColor: v('panel.border', 'var(--vscode-widget-border, #8884)') });
    set('#m-panel-active', { borderBottomColor: v('panelTitle.activeBorder', 'var(--vscode-focusBorder)') });
    set('#m-status', {
      background: v('statusBar.background', '#007acc'),
      color: v('statusBar.foreground', '#fff'),
    });
    set('#m-remote', {
      background: v('statusBarItem.remoteBackground', '#16825d'),
      color: v('statusBarItem.remoteForeground', '#fff'),
    });

    const hostText = d.name.replace(/[*?]/g, 'x');
    mock.querySelectorAll('#m-host, .m-host-term, .m-host-remote').forEach((el) => (el.textContent = hostText));
    const ext = /** @type {HTMLElement} */ (mock.querySelector('#m-ext-item'));
    ext.textContent = `● ${d.label || hostText}`;
    ext.style.color = zones.includes('statusBar') ? '' : d.color;

    const hint = app.querySelector('#live-hint');
    if (hint) {
      const live = state.currentKey === d.originalName && state.hasWorkspace && state.enabled;
      hint.textContent = live
        ? 'Tu es connecté à ce host : les changements s’appliquent aussi en direct sur cette fenêtre.'
        : zones.length
          ? ''
          : 'Aucune zone sélectionnée : seule la pastille de la barre d’état sera colorée.';
    }
  }

  renderEditor();
})();
