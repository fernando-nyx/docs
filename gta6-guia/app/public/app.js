(() => {
  'use strict';

  const STORE = 'vice100:';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(STORE + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(STORE + k, JSON.stringify(v)); } catch { /* modo privado */ } },
  };

  let lang = store.get('lang', 'pt');
  let done = store.get('done', {});
  let pendingOnly = store.get('pendingOnly', false);
  let ME = null;            // /api/me
  const MODS = {};          // conteúdo carregado por módulo
  const T = () => (window.I18N[lang] && !window.I18N[lang]._soon ? window.I18N[lang] : window.I18N.pt);

  // ---- util ----
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function md(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\s*&lt;br&gt;\s*/gi, '<br>');
  }
  const plain = (s) => String(s).replace(/[*`]/g, '');
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
  }
  async function api(path, opts = {}) {
    const r = await fetch('/api' + path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'content-type': 'application/json' } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(data.error || 'HTTP_' + r.status); e.status = r.status; throw e; }
    return data;
  }

  // ---- progresso (local + servidor) ----
  let syncTimer = null;
  function saveDone() {
    store.set('done', done);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => api('/progress', { method: 'PUT', body: { data: done } }).catch(() => {}), 1200);
  }
  async function pullProgress() {
    try {
      const { data } = await api('/progress');
      done = { ...data, ...done }; // une o que está no aparelho com o que está na conta
      store.set('done', done);
      if (Object.keys(done).length !== Object.keys(data).length) saveDone();
    } catch { /* offline: fica o local */ }
  }

  const stat = (ids) => {
    const n = ids.filter((id) => done[id]).length;
    return { n, total: ids.length, pct: ids.length ? Math.round((n / ids.length) * 100) : 0 };
  };
  function idsOf(m) {
    const ids = [];
    for (const s of m.sections) for (const b of s.blocks) {
      if (b.type === 'table' && b.check) b.items.forEach((x) => ids.push(x.id));
      if (b.type === 'list') b.items.forEach((x) => x.check && ids.push(x.id));
    }
    return ids;
  }
  // Sem o conteúdo carregado, conta pelos ids marcados com o prefixo do módulo.
  const modStat = (m) => {
    if (m.id === 'missoes') {
      const n = Object.keys(done).filter((k) => k.startsWith('missoes-')).length;
      return { n, total: m.total, pct: m.total ? Math.round((n / m.total) * 100) : 0 };
    }
    if (MODS[m.id]) return stat(MODS[m.id]._ids || (MODS[m.id]._ids = idsOf(MODS[m.id])));
    const n = Object.keys(done).filter((k) => k.startsWith(m.id + '-')).length;
    return { n, total: m.total, pct: m.total ? Math.round((n / m.total) * 100) : 0 };
  };

  async function loadModule(id) {
    if (MODS[id]) return MODS[id];
    const cached = store.get('mod:' + lang + ':' + id, null);
    try {
      const m = await api(`/content/${lang}/${id}`);
      store.set('mod:' + lang + ':' + id, m);
      return (MODS[id] = m);
    } catch (e) {
      if (cached && e.status !== 403) return (MODS[id] = cached); // offline
      throw e;
    }
  }

  // ---- telas ----
  const PALMS = `<svg class="palms" viewBox="0 0 240 150" fill="currentColor" aria-hidden="true">
    <path d="M150 150c4-40 8-70 22-96l4 2c-12 26-16 56-19 94z"/>
    <path d="M174 56c-14-10-36-12-52-2 16-4 34 0 46 8-18-2-34 6-42 20 12-10 30-14 44-10-10 6-16 18-16 30 8-14 18-22 24-24 4 10 4 24-2 36 12-12 14-30 8-44 14 2 28 12 34 26 0-18-14-32-30-38 14-6 32-4 44 4-8-14-28-20-44-14 6-10 18-16 30-18-16-4-32 2-40 14 0-8 4-16 10-22-12 4-20 14-22 26z"/>
    <path d="M70 150c2-30 6-52 16-72l3 2c-8 20-11 40-12 70z"/>
    <path d="M88 80c-10-8-26-9-38-2 12-3 25 0 34 6-13-1-25 4-31 14 9-7 22-10 32-7-7 4-12 13-12 22 6-10 13-16 18-17 3 7 3 17-1 26 9-9 10-22 6-32 10 1 20 9 25 19 0-13-10-23-22-28 10-4 23-3 32 3-6-10-20-14-32-10 4-7 13-12 22-13-12-3-23 1-29 10 0-6 3-12 7-16-9 3-14 10-16 19z"/>
  </svg>`;

  function topbar(back) {
    const t = T();
    const langs = Object.keys(window.I18N).map((k) =>
      `<option value="${k}" ${k === lang ? 'selected' : ''} ${window.I18N[k]._soon ? 'disabled' : ''}>${k.toUpperCase()}${window.I18N[k]._soon ? ' · ' + t.soon : ''}</option>`).join('');
    return `<header class="top">${back ? `<a class="iconbtn" href="#/" aria-label="${t.back}">←</a>` : ''}
      <div class="logo">${t.brand}<small>${t.tagline}</small></div><div class="spacer"></div>
      <select class="lang" aria-label="Idioma" onchange="VICE.setLang(this.value)">${langs}</select>
      ${ME ? `<button class="iconbtn" aria-label="${t.account}" onclick="VICE.account()">👤</button>` : ''}</header>`;
  }

  function loginView() {
    const t = T();
    return `${topbar()}
      <section class="hero hero-login"><div class="sun"></div>${PALMS}<div class="sea"></div>
        <div class="hero-in"><div class="pct" style="font-size:38px">100%</div><div class="pct-label">${t.tagline}</div></div></section>
      <form class="card-form" id="login">
        <h2 class="display">${t.loginTitle}</h2><p class="muted">${t.loginHint}</p>
        <label>${t.email}<input name="email" type="email" autocomplete="email" required></label>
        <label>${t.password}<input name="password" type="password" autocomplete="current-password" required></label>
        <div class="err" id="err"></div>
        <button class="btn primary big">${t.enter}</button></form>`;
  }

  function home() {
    const t = T();
    let n = 0, total = 0;
    ME.modules.filter((m) => m.access).forEach((m) => { const s = modStat(m); n += s.n; total += s.total; });
    const pct = total ? Math.round((n / total) * 100) : 0;
    const nudge = ME.user.mustChangePassword ? `<button class="nudge" onclick="VICE.account()">🔑 ${t.pwNudge} <b>${t.changePw}</b></button>` : '';
    const mods = ME.modules.map((m) => {
      const info = t.modules[m.id] || { t: m.id, d: '' };
      if (!m.access) {
        const url = ME.bumpUrls[m.id] || ME.checkoutUrl;
        return `<a class="mod locked" href="#/locked/${m.id}"><div class="ic">${m.icon}</div><div style="flex:1">
          <h3>${info.t}${t.locked ? `<span class="tag">${t.locked}</span>` : ''}${url ? '' : '<span class="lockline">🔒</span>'}</h3><p>${info.d}</p>
          ${url ? `<span class="btn gold">🔒 ${t.get}</span>` : ''}</div></a>`;
      }
      const s = modStat(m);
      return `<a class="mod" href="${m.id === 'missoes' ? '#/missoes' : '#/m/' + m.id}"><div class="ic">${m.icon}</div><div style="flex:1">
        <h3>${info.t}</h3><p>${info.d}</p>
        <div class="bar"><i style="width:${s.pct}%"></i></div>
        <div class="meta">${s.n}/${s.total} ${t.done} · ${s.pct}%</div></div></a>`;
    }).join('');
    return `${topbar()}
      <section class="hero"><div class="sun"></div>${PALMS}<div class="sea"></div>
        <div class="hero-in"><div class="pct">${pct}%</div><div class="pct-label">${t.overall}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="counts">${n} / ${total} ${t.items}</div></div></section>
      ${nudge}
      <form class="search" onsubmit="location.hash='#/busca/'+encodeURIComponent(this.q.value);return false">
        <span>🔎</span><input name="q" type="search" placeholder="${esc(t.search)}" autocomplete="off"></form>
      <div class="grid">${mods}</div>`;
  }

  function renderBlock(b, q) {
    const hl = (s) => { let h = md(s); if (q) h = h.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark class="hl">$1</mark>'); return h; };
    if (b.type === 'p') return `<p>${hl(b.text)}</p>`;
    if (b.type === 'note') return `<div class="note">${hl(b.text)}</div>`;
    if (b.type === 'list') {
      const plainItems = b.items.filter((x) => !x.check);
      const chk = b.items.filter((x) => x.check);
      let h = '';
      if (plainItems.length) h += `<ul>${plainItems.map((x) => `<li class="${x.indent ? 'in' : ''}">${hl(x.text)}</li>`).join('')}</ul>`;
      if (chk.length) h += `<div class="cards">${chk.map((x) => `<div class="item chk ${done[x.id] ? 'on' : ''}" data-id="${x.id}"><div class="box"></div><div class="ib"><div class="ttl">${hl(x.text)}</div></div></div>`).join('')}</div>`;
      return h;
    }
    if (b.type === 'table') {
      const cols = b.cols;
      if (!b.check && cols.length === 2) {
        return `<div class="dl">${b.items.map((r) => `<div>${hl(r.cells[0] || '')}</div><div>${hl(r.cells[1] || '')}</div>`).join('')}</div>`;
      }
      const numCol = /^(#|nº.*|n\.?º.*|cap\.)$/i.test(cols[0]) ? 0 : -1;
      const titleCol = numCol === 0 ? 1 : 0;
      return `<div class="cards">${b.items.map((r) => {
        const c = r.cells;
        const rest = cols.map((k, i) => (i === numCol || i === titleCol || !c[i] || c[i] === '—') ? '' :
          `<div class="kv"><span>${esc(plain(k))}:</span> ${hl(c[i])}</div>`).join('');
        const num = numCol === 0 && c[0] ? `<span class="num">${esc(c[0])}</span>` : '';
        const cls = b.check ? `item chk ${done[r.id] ? 'on' : ''}` : 'item';
        return `<div class="${cls}" ${b.check ? `data-id="${r.id}"` : ''}>${b.check ? '<div class="box"></div>' : ''}
          <div class="ib"><div class="ttl">${num}${hl(c[titleCol] || '')}</div>${rest}</div></div>`;
      }).join('')}</div>`;
    }
    return '';
  }

  function moduleView(m) {
    const t = T();
    const info = t.modules[m.id];
    const s = modStat(ME.modules.find((x) => x.id === m.id));
    const toc = m.sections.filter((x) => x.title && x.level <= 3).map((x) =>
      `<li class="l${x.level}"><a href="#/m/${m.id}/${x.id}">${esc(plain(x.title))}</a></li>`).join('');
    const body = m.sections.map((x) => {
      const h = x.level === 2 ? 2 : 3;
      const head = x.title ? `<h${h} class="sec-t">${md(x.title)}</h${h}>` : '';
      return `<section class="sec" id="${x.id}">${head}${x.blocks.map((b) => renderBlock(b)).join('')}</section>`;
    }).join('');
    return `${topbar(true)}
      <div class="mhead"><div style="font-size:30px">${m.icon}</div><h1>${info.t}</h1>
        <div class="muted">${info.d}</div>
        <div class="bar"><i id="mbar" style="width:${s.pct}%"></i></div>
        <div class="meta" id="mmeta">${s.n}/${s.total} ${t.done} · ${s.pct}%</div>
        <div class="chips"><button class="chip ${pendingOnly ? '' : 'on'}" onclick="VICE.pending(false)">${t.all}</button>
          <button class="chip ${pendingOnly ? 'on' : ''}" onclick="VICE.pending(true)">${t.pending}</button></div></div>
      <details class="toc"><summary>📍 ${t.sections} <span class="n">(${m.sections.filter((x) => x.title).length})</span></summary><ol>${toc}</ol></details>
      <div id="body" class="${pendingOnly ? 'hidden-done' : ''}">${body}</div>
      <p class="foot"><button class="btn ghost" onclick="VICE.reset('${m.id}')">${t.reset}</button></p>`;
  }

  async function searchView(q) {
    const t = T();
    q = (q || '').trim();
    const ql = q.toLowerCase();
    const out = [];
    if (ql.length >= 2) {
      const open = ME.modules.filter((m) => m.access && m.id !== 'missoes');
      await Promise.all(open.map((m) => loadModule(m.id).catch(() => null)));
      for (const om of open) {
        const m = MODS[om.id];
        if (!m) continue;
        for (const s of m.sections) for (const b of s.blocks) {
          const texts = b.type === 'table' ? b.items.map((r) => r.cells.join(' · ')) : b.type === 'list' ? b.items.map((x) => x.text) : [b.text];
          for (const tx of texts) if (tx.toLowerCase().includes(ql)) out.push({ m, s, tx });
        }
      }
    }
    if (ql.length >= 2 && ME.modules.find((m) => m.id === 'missoes' && m.access)) {
      const idx = await missionIndex().catch(() => []);
      for (const x of idx) if (x.nome.toLowerCase().includes(ql)) out.unshift({ mission: x });
    }
    const list = out.slice(0, 80).map((r) => (r.mission
      ? `<a class="res" href="#/missao/${r.mission.slug}"><small>🎯 ${t.modules.missoes.t}</small><div><b>#${r.mission.ordem} ${esc(r.mission.nome)}</b></div></a>`
      : `<a class="res" href="#/m/${r.m.id}/${r.s.id}"><small>${r.m.icon} ${t.modules[r.m.id].t}${r.s.title ? ' › ' + esc(plain(r.s.title)) : ''}</small>
      <div>${renderBlock({ type: 'p', text: r.tx.length > 220 ? r.tx.slice(0, 220) + '…' : r.tx }, q).replace(/^<p>|<\/p>$/g, '')}</div></a>`)).join('');
    return `${topbar(true)}
      <form class="search" style="margin-top:8px" onsubmit="location.hash='#/busca/'+encodeURIComponent(this.q.value);return false">
        <span>🔎</span><input name="q" type="search" value="${esc(q)}" placeholder="${esc(t.search)}"></form>
      <h2 class="sec-t">${t.searchTitle} (${out.length})</h2>${list || `<p>${t.noResults}</p>`}`;
  }

  // ---- missões ----
  let MINDEX = null;
  const MDET = {};
  async function missionIndex() {
    if (MINDEX) return MINDEX;
    try { MINDEX = await api(`/missions/${lang}`); store.set('mindex:' + lang, MINDEX); } catch (e) {
      MINDEX = store.get('mindex:' + lang, null); if (!MINDEX) throw e;
    }
    return MINDEX;
  }
  async function missionDetail(slug) {
    if (MDET[slug]) return MDET[slug];
    try { MDET[slug] = await api(`/missions/${lang}/${slug}`); store.set('mis:' + slug, MDET[slug]); } catch (e) {
      MDET[slug] = store.get('mis:' + slug, null); if (!MDET[slug]) throw e;
    }
    return MDET[slug];
  }
  const capLabel = (c) => (c === 0 || c === '0' ? T().ms.prologue : `${T().ms.chapter} ${c}`);
  const typeTag = (tp) => {
    const ms = T().ms;
    if (tp === 'perdivel') return `<span class="mtag warn">${ms.missable}</span>`;
    if (tp === 'opcional') return `<span class="mtag">${ms.optional}</span>`;
    if (tp === 'secundaria') return `<span class="mtag">${ms.side}</span>`;
    return '';
  };

  function missionsList(list) {
    const t = T();
    const m = ME.modules.find((x) => x.id === 'missoes');
    const s = modStat(m);
    const groups = [];
    for (const x of list) {
      const key = String(x.capitulo ?? '');
      let g = groups.find((y) => y.key === key);
      if (!g) groups.push((g = { key, items: [] }));
      g.items.push(x);
    }
    const body = groups.map((g) => `<section class="sec"><h2 class="sec-t">${g.key === '' ? t.ms.others : capLabel(g.key)}</h2><div class="cards">
      ${g.items.map((x) => `<div class="item mrow ${done[x.id] ? 'on' : ''}">
        <div class="box chkbox" data-id="${x.id}" role="checkbox" aria-checked="${!!done[x.id]}"></div>
        <a class="ib mlink" href="#/missao/${x.slug}">
          ${x.capa ? `<img class="thumb" src="${x.capa}" alt="" loading="lazy">` : ''}
          <div><div class="ttl"><span class="num">${x.ordem}</span>${esc(x.nome)}</div>
          <div class="kv">${typeTag(x.tipo)} ${esc(x.personagem || '')}</div></div></a></div>`).join('')}
    </div></section>`).join('');
    return `${topbar(true)}
      <div class="mhead"><div style="font-size:30px">🎯</div><h1>${t.modules.missoes.t}</h1>
        <div class="muted">${t.modules.missoes.d}</div>
        <div class="bar"><i id="mbar" style="width:${s.pct}%"></i></div>
        <div class="meta" id="mmeta">${s.n}/${s.total} ${t.done} · ${s.pct}%</div>
        <div class="chips"><button class="chip ${pendingOnly ? '' : 'on'}" onclick="VICE.pending(false)">${t.all}</button>
          <button class="chip ${pendingOnly ? 'on' : ''}" onclick="VICE.pending(true)">${t.pending}</button></div></div>
      <div id="body" class="${pendingOnly ? 'hidden-done' : ''}">${body}</div>`;
  }

  function missionView(m, list) {
    const t = T(); const ms = t.ms;
    const i = list.findIndex((x) => x.slug === m.slug);
    const prev = list[i - 1], next = list[i + 1];
    const facts = [
      [ms.chapterL, m.capitulo === undefined || m.capitulo === null ? '' : capLabel(m.capitulo)],
      [ms.giver, m.quem_passa], [ms.character, m.personagem], [ms.counts, m.conta_100], [ms.reward, m.recompensa],
    ].filter(([, v]) => v);
    const steps = (m.passos || []).map((p, n) => `<section class="step"><h3 class="sec-t"><span class="num">${n + 1}</span>${md(p.titulo)}</h3>
      ${(p.imagens || []).map((src) => `<img class="shot" src="${src}" alt="${esc(p.titulo)}" loading="lazy" onclick="VICE.zoom(this.src)">`).join('')}
      ${(p.texto || []).map((x) => `<p>${md(x)}</p>`).join('')}
      ${(p.lista || []).length ? `<ul>${p.lista.map((x) => `<li>${md(x)}</li>`).join('')}</ul>` : ''}
      ${(p.dicas || []).map((x) => `<div class="tip">💡 ${md(x)}</div>`).join('')}</section>`).join('');
    return `${topbar(true)}
      <article class="mission">
        ${m.capa ? `<img class="cover" src="${m.capa}" alt="" onclick="VICE.zoom(this.src)">` : ''}
        <div class="mtitle"><span class="num">#${m.ordem}</span> ${typeTag(m.tipo)}<h1>${esc(m.nome)}</h1></div>
        ${m.aviso ? `<div class="note">⚠️ ${md(m.aviso)}</div>` : ''}
        ${m.resumo ? `<p class="lead">${md(m.resumo)}</p>` : ''}
        <div class="dl">${facts.map(([k, v]) => `<div>${k}</div><div>${md(String(v))}</div>`).join('')}</div>
        ${(m.objetivos || []).length ? `<h2 class="sec-t">${ms.objectives}</h2><ol class="objs">${m.objetivos.map((x) => `<li>${md(x)}</li>`).join('')}</ol>` : ''}
        ${steps ? `<h2 class="sec-t">${ms.walkthrough}</h2>${steps}` : ''}
        ${(m.recompensas || []).length ? `<h2 class="sec-t">${ms.rewards}</h2><ul>${m.recompensas.map((x) => `<li>${md(x)}</li>`).join('')}</ul>` : ''}
        ${(m.trofeus || []).length ? `<h2 class="sec-t">${ms.trophies}</h2><ul>${m.trofeus.map((x) => `<li>${md(x)}</li>`).join('')}</ul>` : ''}
        <button class="btn ${done[m.id] ? 'ghost' : 'primary'} big" onclick="VICE.toggleMission('${m.id}')">${done[m.id] ? '✓ ' + ms.isDone : ms.markDone}</button>
        <nav class="mnav">${prev ? `<a class="btn ghost" href="#/missao/${prev.slug}">← ${esc(prev.nome)}</a>` : '<span></span>'}
          ${next ? `<a class="btn ghost" href="#/missao/${next.slug}">${esc(next.nome)} →</a>` : ''}</nav>
      </article>`;
  }

  // ---- diálogos ----
  function dialog(html, onReady) {
    const el = $('#modal');
    el.innerHTML = html; el.hidden = false;
    onReady && onReady(el);
  }
  const closeDialog = () => { $('#modal').hidden = true; };

  function termsDialog() {
    const t = T().terms;
    dialog(`<div class="dlg terms"><h3>${t.title}</h3><ul>${t.body.map((x) => `<li>${x}</li>`).join('')}</ul>
      <div class="row"><button class="btn primary big" id="ok">${t.accept}</button></div></div>`, (el) => {
      $('#ok', el).onclick = async () => {
        $('#ok', el).disabled = true;
        try {
          await api('/terms', { method: 'POST', body: { version: ME.termsVersion } });
          ME.user.termsAccepted = true; closeDialog();
        } catch { $('#ok', el).disabled = false; toast(T().netError); }
      };
    });
  }

  function lockedDialog(id) {
    const t = T();
    const m = ME.modules.find((x) => x.id === id);
    const url = ME.bumpUrls[id] || ME.checkoutUrl;
    dialog(`<div class="dlg"><h3>${m.icon} ${t.modules[id].t}</h3><p>${t.modules[id].d}</p><p>${t.lockedHint}</p>
      <div class="row"><button class="btn ghost" id="cx">${t.cancel}</button>${url ? `<a class="btn gold" href="${esc(url)}" target="_blank" rel="noopener">${t.get}</a>` : ''}</div></div>`, (el) => {
      $('#cx', el).onclick = () => { closeDialog(); location.hash = '#/'; };
    });
  }

  function accountDialog() {
    const t = T();
    dialog(`<form class="dlg"><h3>👤 ${t.account}</h3><p>${esc(ME.user.email)}</p>
      <label>${t.currentPw}<input name="current" type="password" autocomplete="current-password" required></label>
      <label>${t.newPw}<input name="next" type="password" minlength="6" autocomplete="new-password" required></label>
      <div class="err" id="err"></div>
      <div class="row"><button type="button" class="btn ghost" id="out">${t.logout}</button><span class="spacer"></span>
        <button type="button" class="btn ghost" id="cx">${t.cancel}</button><button class="btn primary">${t.save}</button></div></form>`, (el) => {
      $('#cx', el).onclick = closeDialog;
      $('#out', el).onclick = async () => { await api('/logout', { method: 'POST' }).catch(() => {}); ME = null; store.set('logged', false); closeDialog(); location.hash = '#/'; route(); };
      $('form', el).onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        try {
          await api('/password', { method: 'POST', body: { current: f.current.value, next: f.next.value } });
          ME.user.mustChangePassword = false; closeDialog(); toast(t.pwSaved); route();
        } catch { $('#err', el).textContent = t.pwError; }
      };
    });
  }

  // ---- roteamento ----
  async function route() {
    const app = $('#app');
    if (!ME) {
      try { ME = await api('/me'); store.set('logged', true); await pullProgress(); } catch (e) {
        if (e.status === 401) {
          const kicked = store.get('logged', false);
          app.innerHTML = loginView();
          if (kicked) { $('#err').textContent = T().kicked; store.set('logged', false); }
          $('#login').onsubmit = async (ev) => {
            ev.preventDefault();
            const f = ev.target;
            try {
              ME = await api('/login', { method: 'POST', body: { email: f.email.value, password: f.password.value } });
              store.set('logged', true);
              await pullProgress(); route();
            } catch (err) {
              $('#err').textContent = err.status === 401 ? T().loginError : err.status === 429 ? T().tooMany : T().netError;
            }
          };
          return;
        }
        app.innerHTML = `${topbar()}<p class="foot">${T().netError}</p>`; return;
      }
    }
    if (!ME.user.termsAccepted) termsDialog(); else closeDialog();

    const [, view, a, b] = location.hash.split('/');
    if (view === 'm') {
      try {
        const m = await loadModule(a);
        app.innerHTML = moduleView(m);
        const el = b && document.getElementById(b);
        if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
      } catch (e) { if (e.status === 403) { location.hash = '#/locked/' + a; } else app.innerHTML = `${topbar(true)}<p class="foot">${T().netError}</p>`; }
    } else if (view === 'missoes' || view === 'missao') {
      try {
        const list = await missionIndex();
        if (view === 'missoes') { app.innerHTML = missionsList(list); window.scrollTo(0, 0); }
        else { app.innerHTML = missionView(await missionDetail(a), list); window.scrollTo(0, 0); }
      } catch (e) { if (e.status === 403) location.hash = '#/locked/missoes'; else app.innerHTML = `${topbar(true)}<p class="foot">${T().netError}</p>`; }
    } else if (view === 'busca') {
      app.innerHTML = await searchView(decodeURIComponent(a || '')); window.scrollTo(0, 0);
    } else if (view === 'locked') {
      app.innerHTML = home(); if (ME.user.termsAccepted) lockedDialog(a);
    } else {
      app.innerHTML = home();
    }
  }

  document.addEventListener('click', (e) => {
    const cb = e.target.closest('.chkbox');
    if (cb) {
      const id = cb.dataset.id;
      if (done[id]) delete done[id]; else done[id] = 1;
      saveDone();
      cb.closest('.item').classList.toggle('on', !!done[id]);
      const m = ME.modules.find((x) => x.id === 'missoes'); const s = modStat(m);
      if ($('#mbar')) { $('#mbar').style.width = s.pct + '%'; $('#mmeta').textContent = `${s.n}/${s.total} ${T().done} · ${s.pct}%`; }
      return;
    }
    const it = e.target.closest('.item.chk');
    if (!it) return;
    const id = it.dataset.id;
    if (done[id]) delete done[id]; else done[id] = 1;
    saveDone();
    it.classList.toggle('on', !!done[id]);
    const mid = location.hash.split('/')[2];
    const m = ME && ME.modules.find((x) => x.id === mid);
    if (m && $('#mbar')) {
      const s = modStat(m);
      $('#mbar').style.width = s.pct + '%';
      $('#mmeta').textContent = `${s.n}/${s.total} ${T().done} · ${s.pct}%`;
    }
  });

  window.VICE = {
    setLang(l) { lang = l; store.set('lang', l); route(); },
    pending(v) { pendingOnly = v; store.set('pendingOnly', v); const y = window.scrollY; route().then(() => window.scrollTo(0, y)); },
    reset(id) {
      if (!confirm(T().resetConfirm)) return;
      Object.keys(done).filter((k) => k.startsWith(id + '-')).forEach((k) => delete done[k]);
      saveDone(); route();
    },
    account: accountDialog,
    toggleMission(id) { if (done[id]) delete done[id]; else done[id] = 1; saveDone(); route(); },
    zoom(src) {
      const el = $('#modal');
      el.innerHTML = `<img class="zoomed" src="${src}" alt="">`; el.hidden = false;
      el.onclick = () => { el.hidden = true; el.onclick = null; };
    },
  };

  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
