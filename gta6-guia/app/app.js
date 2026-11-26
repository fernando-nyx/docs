(() => {
  'use strict';

  // ---- configuração ----
  // Códigos dos módulos bônus (order bumps). Guardamos só o hash; troque os códigos antes de publicar.
  // Gere o hash no console do navegador com: VICE.hash('SEU-CODIGO')
  const BUMP_HASHES = {
    dinheiro: '214gsb', // ROTA-7741
    platina: '1liv98w', // PLAT-5530
    garagem: 'zmmisb', // GARA-2219
  };
  const STORE = 'vice100:';

  // ---- estado ----
  const store = {
    get(k, d) { try { const v = localStorage.getItem(STORE + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(STORE + k, JSON.stringify(v)); } catch { /* modo privado */ } },
  };
  let lang = store.get('lang', 'pt');
  let done = store.get('done', {});
  let unlocked = store.get('unlocked', {});
  let pendingOnly = store.get('pendingOnly', false);
  let DATA = null;
  const T = () => window.I18N[lang] && !window.I18N[lang]._soon ? window.I18N[lang] : window.I18N.pt;

  function hash(s) {
    let h = 5381;
    for (const c of s) h = ((h << 5) + h + c.codePointAt(0)) >>> 0;
    return h.toString(36);
  }
  window.VICE = { hash };

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

  function moduleItems(m) {
    const ids = [];
    for (const s of m.sections) for (const b of s.blocks) {
      if (b.type === 'table' && b.check) b.items.forEach((x) => ids.push(x.id));
      if (b.type === 'list') b.items.forEach((x) => x.check && ids.push(x.id));
    }
    return ids;
  }
  const isOpen = (m) => !m.bump || unlocked[m.bump];
  function stats(m) {
    const ids = m._ids || (m._ids = moduleItems(m));
    const n = ids.filter((id) => done[id]).length;
    return { n, total: ids.length, pct: ids.length ? Math.round((n / ids.length) * 100) : 0 };
  }
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
  }

  // ---- telas ----
  const PALMS = `<svg class="palms" viewBox="0 0 240 150" fill="currentColor" aria-hidden="true">
    <path d="M150 150c4-40 8-70 22-96l4 2c-12 26-16 56-19 94z"/>
    <path d="M174 56c-14-10-36-12-52-2 16-4 34 0 46 8-18-2-34 6-42 20 12-10 30-14 44-10-10 6-16 18-16 30 8-14 18-22 24-24 4 10 4 24-2 36 12-12 14-30 8-44 14 2 28 12 34 26 0-18-14-32-30-38 14-6 32-4 44 4-8-14-28-20-44-14 6-10 18-16 30-18-16-4-32 2-40 14 0-8 4-16 10-22-12 4-20 14-22 26z"/>
    <path d="M70 150c2-30 6-52 16-72l3 2c-8 20-11 40-12 70z"/>
    <path d="M88 80c-10-8-26-9-38-2 12-3 25 0 34 6-13-1-25 4-31 14 9-7 22-10 32-7-7 4-12 13-12 22 6-10 13-16 18-17 3 7 3 17-1 26 9-9 10-22 6-32 10 1 20 9 25 19 0-13-10-23-22-28 10-4 23-3 32 3-6-10-20-14-32-10 4-7 13-12 22-13-12-3-23 1-29 10 0-6 3-12 7-16-9 3-14 10-16 19z"/>
  </svg>`;

  function home() {
    const t = T();
    const open = DATA.modules.filter(isOpen);
    let n = 0, total = 0;
    open.forEach((m) => { const s = stats(m); n += s.n; total += s.total; });
    const pct = total ? Math.round((n / total) * 100) : 0;
    const mods = DATA.modules.map((m) => {
      const s = stats(m); const info = t.modules[m.id];
      if (!isOpen(m)) {
        return `<a class="mod locked" href="#/unlock/${m.id}"><div class="ic">${m.icon}</div><div style="flex:1">
          <h3>${info.t}<span class="tag">${t.locked}</span></h3><p>${info.d}</p>
          <span class="btn gold">🔒 ${t.unlock}</span></div></a>`;
      }
      return `<a class="mod" href="#/m/${m.id}"><div class="ic">${m.icon}</div><div style="flex:1">
        <h3>${info.t}</h3><p>${info.d}</p>
        <div class="bar"><i style="width:${s.pct}%"></i></div>
        <div class="meta">${s.n}/${s.total} ${t.done} · ${s.pct}%</div></div></a>`;
    }).join('');
    return `${topbar()}
      <section class="hero"><div class="sun"></div>${PALMS}<div class="sea"></div>
        <div class="hero-in"><div class="pct">${pct}%</div><div class="pct-label">${t.overall}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="counts">${n} / ${total} ${t.items}</div></div></section>
      <form class="search" onsubmit="location.hash='#/busca/'+encodeURIComponent(this.q.value);return false">
        <span>🔎</span><input name="q" type="search" placeholder="${esc(t.search)}" autocomplete="off"></form>
      <div class="grid">${mods}</div>
      <p class="foot">${t.disclaimer}<br>${t.updated} ${new Date(DATA.built).toLocaleDateString('pt-BR')}</p>`;
  }

  function topbar(back) {
    const t = T();
    const langs = Object.keys(window.I18N).map((k) =>
      `<option value="${k}" ${k === lang ? 'selected' : ''} ${window.I18N[k]._soon ? 'disabled' : ''}>${k.toUpperCase()}${window.I18N[k]._soon ? ' · ' + T().soon : ''}</option>`).join('');
    return `<header class="top">${back ? `<a class="iconbtn" href="#/" aria-label="${t.back}" style="display:grid;place-items:center;text-decoration:none">←</a>` : ''}
      <div class="logo">${t.brand}<small>${t.tagline}</small></div><div class="spacer"></div>
      <select class="lang" aria-label="Idioma" onchange="VICE.setLang(this.value)">${langs}</select></header>`;
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
        const rest = cols.map((k, i) => i === numCol || i === titleCol || !c[i] || c[i] === '—' && false ? '' :
          `<div class="kv"><span>${esc(plain(k))}:</span> ${hl(c[i])}</div>`).join('');
        const num = numCol === 0 && c[0] ? `<span class="num">${esc(c[0])}</span>` : '';
        const cls = b.check ? `item chk ${done[r.id] ? 'on' : ''}` : 'item';
        return `<div class="${cls}" ${b.check ? `data-id="${r.id}"` : ''}>${b.check ? '<div class="box"></div>' : ''}
          <div class="ib"><div class="ttl">${num}${hl(c[titleCol] || '')}</div>${rest}</div></div>`;
      }).join('')}</div>`;
    }
    return '';
  }

  function moduleView(id) {
    const t = T();
    const m = DATA.modules.find((x) => x.id === id);
    if (!m) return home();
    if (!isOpen(m)) { location.hash = '#/unlock/' + id; return ''; }
    const s = stats(m);
    const toc = m.sections.filter((x) => x.title && x.level <= 3).map((x) =>
      `<li class="l${x.level}"><a href="#/m/${id}/${x.id}">${esc(plain(x.title))}</a></li>`).join('');
    const body = m.sections.map((x) => {
      const head = x.title ? `<h${x.level === 2 ? 2 : 3} class="sec-t">${md(x.title)}</h${x.level === 2 ? 2 : 3}>` : '';
      return `<section class="sec" id="${x.id}">${head}${x.blocks.map((b) => renderBlock(b)).join('')}</section>`;
    }).join('');
    return `${topbar(true)}
      <div class="mhead"><div style="font-size:30px">${m.icon}</div><h1>${t.modules[id].t}</h1>
        <div style="color:var(--muted)">${t.modules[id].d}</div>
        <div class="bar"><i id="mbar" style="width:${s.pct}%"></i></div>
        <div class="meta" id="mmeta" style="font-size:13px;color:var(--muted);margin-top:6px">${s.n}/${s.total} ${t.done} · ${s.pct}%</div>
        <div class="chips"><button class="chip ${pendingOnly ? '' : 'on'}" onclick="VICE.pending(false)">${t.all}</button>
          <button class="chip ${pendingOnly ? 'on' : ''}" onclick="VICE.pending(true)">${t.pending}</button></div></div>
      <details class="toc"><summary>📍 ${t.sections} <span class="n">(${m.sections.filter((x) => x.title).length})</span></summary><ol>${toc}</ol></details>
      <div id="body" class="${pendingOnly ? 'hidden-done' : ''}">${body}</div>
      <p class="foot"><button class="btn ghost" onclick="VICE.reset('${id}')">${t.reset}</button><br><br>${t.disclaimer}</p>`;
  }

  function searchView(q) {
    const t = T();
    q = (q || '').trim();
    const ql = q.toLowerCase();
    const out = [];
    if (ql.length >= 2) {
      for (const m of DATA.modules) {
        if (!isOpen(m)) continue;
        for (const s of m.sections) {
          for (const b of s.blocks) {
            const texts = b.type === 'table' ? b.items.map((r) => r.cells.join(' · ')) : b.type === 'list' ? b.items.map((x) => x.text) : [b.text];
            for (const tx of texts) if (tx.toLowerCase().includes(ql)) out.push({ m, s, tx });
          }
        }
      }
    }
    const list = out.slice(0, 80).map((r) => `<a class="res" href="#/m/${r.m.id}/${r.s.id}"><small>${r.m.icon} ${T().modules[r.m.id].t}${r.s.title ? ' › ' + esc(plain(r.s.title)) : ''}</small>
      <div>${renderBlock({ type: 'p', text: r.tx.length > 220 ? r.tx.slice(0, 220) + '…' : r.tx }, q).replace(/^<p>|<\/p>$/g, '')}</div></a>`).join('');
    return `${topbar(true)}
      <form class="search" style="margin-top:8px" onsubmit="location.hash='#/busca/'+encodeURIComponent(this.q.value);return false">
        <span>🔎</span><input name="q" type="search" value="${esc(q)}" placeholder="${esc(t.search)}" autofocus></form>
      <h2 class="sec-t">${t.searchTitle} (${out.length})</h2>${list || `<p>${t.noResults}</p>`}`;
  }

  function unlockDialog(id) {
    const t = T();
    const el = $('#modal');
    el.innerHTML = `<form class="dlg"><h3>${DATA.modules.find((m) => m.id === id).icon} ${t.modules[id].t}</h3>
      <p>${t.modules[id].d}</p><p>${t.unlockHint}</p>
      <input name="code" placeholder="${t.code}" autocomplete="off" autocapitalize="characters">
      <div class="err" id="err"></div>
      <div class="row"><button type="button" class="btn ghost" id="cx">${t.cancel}</button><button class="btn gold">${t.confirm}</button></div></form>`;
    el.hidden = false;
    const form = $('form', el);
    $('#cx', el).onclick = () => { el.hidden = true; location.hash = '#/'; };
    form.onsubmit = (e) => {
      e.preventDefault();
      const code = form.code.value.trim().toUpperCase();
      const m = DATA.modules.find((x) => x.id === id);
      if (hash(code) === BUMP_HASHES[m.bump]) {
        unlocked[m.bump] = 1; store.set('unlocked', unlocked);
        el.hidden = true; toast(t.unlocked); location.hash = '#/m/' + id;
      } else $('#err', el).textContent = t.wrongCode;
    };
    setTimeout(() => form.code.focus(), 50);
  }

  // ---- roteamento ----
  function route() {
    const app = $('#app');
    const [, view, a, b] = location.hash.split('/');
    $('#modal').hidden = true;
    if (view === 'm') {
      app.innerHTML = moduleView(a);
      if (b) { const el = document.getElementById(b); if (el) { el.scrollIntoView(); return; } }
      window.scrollTo(0, 0);
    } else if (view === 'busca') {
      app.innerHTML = searchView(decodeURIComponent(a || '')); window.scrollTo(0, 0);
    } else if (view === 'unlock') {
      app.innerHTML = home(); unlockDialog(a);
    } else {
      app.innerHTML = home();
    }
  }

  // marcar/desmarcar item
  document.addEventListener('click', (e) => {
    const it = e.target.closest('.item.chk');
    if (!it) return;
    const id = it.dataset.id;
    if (done[id]) delete done[id]; else done[id] = 1;
    store.set('done', done);
    it.classList.toggle('on', !!done[id]);
    const mid = location.hash.split('/')[2];
    const m = DATA.modules.find((x) => x.id === mid);
    if (m) {
      const s = stats(m);
      $('#mbar').style.width = s.pct + '%';
      $('#mmeta').textContent = `${s.n}/${s.total} ${T().done} · ${s.pct}%`;
    }
  });

  Object.assign(window.VICE, {
    setLang(l) { lang = l; store.set('lang', l); route(); },
    pending(v) { pendingOnly = v; store.set('pendingOnly', v); const y = window.scrollY; route(); window.scrollTo(0, y); },
    reset(id) {
      if (!confirm(T().resetConfirm)) return;
      const m = DATA.modules.find((x) => x.id === id);
      stats(m); m._ids.forEach((k) => delete done[k]); store.set('done', done); route();
    },
  });

  window.addEventListener('hashchange', route);
  fetch('data/pt.json').then((r) => r.json()).then((d) => { DATA = d; route(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
