// Converte o conteúdo em markdown (../conteudo, versão para o cliente) em worker/content/<lang>.json.
// Uso: node build.js
const fs = require('fs');
const path = require('path');

const FILES = ['01-historia-e-inicio.md', '02a-checklist-100-e-progress-database.md', '02b-colecionaveis-localizacoes.md',
  '03-dinheiro-e-roubos.md', '04-carros-armas-segredos.md', '05-trofeus-platina.md'];
const BASE = FILES.every((f) => fs.existsSync(path.join(__dirname, '..', 'conteudo', f)))
  ? path.join(__dirname, '..', 'conteudo')
  : path.join(__dirname, '..', 'base');

// Módulos do app. "bump" = vendido como order bump (trancado até liberar com código).
const MODULES = [
  { id: 'inicio', files: ['01-historia-e-inicio.md'], icon: '🎮', bump: null },
  { id: 'cem', files: ['02a-checklist-100-e-progress-database.md', '02b-colecionaveis-localizacoes.md'], icon: '💯', bump: null },
  { id: 'dinheiro', files: ['03-dinheiro-e-roubos.md'], icon: '💰', bump: 'dinheiro' },
  { id: 'platina', files: ['05-trofeus-platina.md'], icon: '🏆', bump: 'platina' },
  { id: 'garagem', files: ['04-carros-armas-segredos.md'], icon: '🏎️', bump: 'garagem' },
];

// Seções que não entram no app (referências internas de compilação).
const SKIP_SECTION = /^(fontes|fontes usadas|arquivos-fonte|source)/i;

function hash(s) {
  let h = 5381;
  for (const c of s) h = ((h << 5) + h + c.codePointAt(0)) >>> 0;
  return h.toString(36);
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function parseFile(file, modId) {
  const lines = fs.readFileSync(path.join(BASE, file), 'utf8').split('\n');
  const sections = [];
  let cur = null;
  let skipping = false;
  let i = 0;
  const push = (b) => { if (cur && !skipping) cur.blocks.push(b); };

  while (i < lines.length) {
    const line = lines[i];
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const title = h[2].trim();
      if (level === 1) { i++; continue; } // título do arquivo
      skipping = SKIP_SECTION.test(title.replace(/^[\d.\s]+/, ''));
      cur = { id: modId + '-' + hash(file + title + sections.length), level, title, blocks: [] };
      if (!skipping) sections.push(cur);
      i++; continue;
    }
    if (!cur) { // texto antes da primeira seção: vira seção "Visão geral"
      if (line.trim()) {
        cur = { id: modId + '-' + hash(file + 'intro'), level: 2, title: '', blocks: [] };
        sections.push(cur);
      } else { i++; continue; }
    }
    if (/^\s*\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const header = splitRow(rows[0]);
      const body = rows.slice(1).filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r)).map(splitRow);
      const ITEM_COL = /^(#|Missão|Troféu|Banco|Alvo|Questline|Tarefa|Arma|Carro|Local|Gangue|Segredo|Referência|Garagem)$/;
      const check = /✔|✓|feito/i.test(header[0]) || body.some((r) => /^- \[[ x]\]$/.test(r[0]))
        || ITEM_COL.test(header[0]) || (/^(#|Cap\.)$/.test(header[0]) && ITEM_COL.test(header[1] || ''))
        || /checklist/i.test(cur.title) && !/categoria/i.test(header[0]);
      const hasBox = /✔|✓|feito/i.test(header[0]) || body.some((r) => /^- \[[ x]\]$/.test(r[0]));
      const cols = hasBox ? header.slice(1) : header;
      const items = body.map((r) => {
        const cells = hasBox ? r.slice(1) : r;
        const key = cells.slice(0, 3).join('|');
        return { id: check ? modId + '-' + hash(file + cur.title + key) : null, cells };
      });
      push({ type: 'table', check, cols, items });
      continue;
    }
    if (/^\s*>/.test(line)) {
      const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      const text = q.join(' ');
      // notas de compilação (citam arquivos-fonte) não vão para o app
      if (!/listad[oa]s no fim|arquivos?-fonte|\.md`?|guias-fonte/i.test(text)) push({ type: 'note', text });
      continue;
    }
    const li = line.match(/^(\s*)(?:[-*]|\d+\.)\s+(.*)$/);
    if (li) {
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)(?:[-*]|\d+\.)\s+(.*)$/);
        if (!m) {
          if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; continue; }
          break;
        }
        let text = m[2];
        const cb = text.match(/^\[( |x)\]\s+(.*)$/i);
        const indent = m[1].length >= 2 ? 1 : 0;
        if (cb) items.push({ id: modId + '-' + hash(file + cur.title + cb[2]), check: true, text: cb[2], indent });
        else items.push({ text, indent });
        i++;
      }
      push({ type: 'list', items });
      continue;
    }
    if (/^---+\s*$/.test(line) || !line.trim()) { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\s*\||\s*>|\s*[-*]\s|\s*\d+\.\s|---)/.test(lines[i])) { para.push(lines[i].trim()); i++; }
    if (para.length) push({ type: 'p', text: para.join(' ') });
    else i++;
  }
  return sections.filter((s) => s.blocks.length);
}

const out = { built: new Date().toISOString(), modules: [] };
for (const m of MODULES) {
  const sections = m.files.flatMap((f) => parseFile(f, m.id));
  const total = sections.reduce((n, s) => n + s.blocks.reduce((k, b) =>
    k + (b.type === 'table' && b.check ? b.items.length : b.type === 'list' ? b.items.filter((x) => x.check).length : 0), 0), 0);
  out.modules.push({ id: m.id, icon: m.icon, bump: m.bump, total, sections });
}
const dir = path.join(__dirname, 'worker', 'content');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'pt.json'), JSON.stringify(out));
console.log('fonte:', path.relative(__dirname, BASE));
for (const m of out.modules) console.log(m.id.padEnd(10), 'seções:', String(m.sections.length).padStart(3), ' itens marcáveis:', m.total);
