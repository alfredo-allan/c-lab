/* =====================================================================
 *  C-LAB APP — interface: editor, terminal, memória, FS, trilha, simulado
 * ===================================================================== */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const modById = id => MODULES.find(m => m.id === id);
const hasGsap = typeof window.gsap !== 'undefined';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Persistência (localStorage com fallback em memória) ---------- */
const KEY = 'clab-v1';
let P = { quiz: {}, runs: {}, chal: {}, vfs: null, code: null, sel: null };
try { Object.assign(P, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (_) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (_) {} };
const VFS = P.vfs || { 'leia-me.txt': 'Bem-vindo ao Diretorio Local do C-Lab!\nArquivos criados com fopen() aparecem aqui.\nClique em um arquivo para inspecionar o conteudo.\n' };
P.vfs = VFS;
QUESTIONS.forEach((q, i) => q.id = 'q' + i);

/* ---------- Progresso ---------- */
function modProgress(mid) {
  const qs = QUESTIONS.filter(q => q.mod === mid), ex = EXAMPLES.filter(e => e.mod === mid), ch = CHALLENGES.filter(c => c.mod === mid);
  const qOk = qs.filter(q => P.quiz[q.id]).length, eOk = ex.filter(e => P.runs[e.id]).length, cOk = ch.filter(c => P.chal[c.id]).length;
  const pct = Math.round((qOk / (qs.length || 1)) * 50 + (eOk / (ex.length || 1)) * 25 + (cOk / (ch.length || 1)) * 25);
  return { qOk, qT: qs.length, eOk, eT: ex.length, cOk, cT: ch.length, pct };
}
function updateProgress() {
  let all = 0, q = 0, e = 0, c = 0;
  MODULES.forEach(m => {
    const p = modProgress(m.id); all += p.pct; q += p.qOk; e += p.eOk; c += p.cOk;
    const card = document.querySelector(`[data-mod="${m.id}"]`);
    if (card) {
      card.querySelector('.progress-bar').style.width = p.pct + '%';
      card.querySelector('.pct').textContent = p.pct + '%';
      card.querySelector('.mini-stats .st').innerHTML = `<i class="bi bi-patch-check"></i> ${p.qOk}/${p.qT} questões · <i class="bi bi-play-circle"></i> ${p.eOk}/${p.eT} exemplos · <i class="bi bi-trophy"></i> ${p.cOk}/${p.cT} desafio`;
      card.closest('.track-item').querySelector('.track-node').style.borderColor = p.pct >= 100 ? 'var(--green)' : p.pct > 0 ? m.color : '';
    }
  });
  const pct = Math.round(all / MODULES.length);
  $('#stAll').textContent = pct + '%';
  $('#navProgress').textContent = pct + '% concluído';
  $('#ringAll').style.strokeDashoffset = 201 - 201 * pct / 100;
  $('#stQ').textContent = `${q}/${QUESTIONS.length}`;
  $('#stE').textContent = `${e}/${EXAMPLES.length}`;
  $('#stC').textContent = `${c}/${CHALLENGES.length}`;
}

/* ---------- Trilha de aprendizado ---------- */
function buildTrack() {
  const track = $('#track');
  MODULES.forEach((m, i) => {
    const el = document.createElement('div');
    el.className = 'track-item';
    el.innerHTML = `
      <div class="track-node" style="color:${m.color}">${m.n}</div>
      <div class="surface mod-card" data-mod="${m.id}" style="--mc:${m.color}">
        <div class="d-flex gap-3 align-items-start">
          <div class="mod-icon" style="background:${m.color}22;color:${m.color}"><i class="bi ${m.icon}"></i></div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center gap-2">
              <h3 class="h5 mb-1 fw-bold">${m.title}</h3><span class="pct mono small" style="color:${m.color}">0%</span>
            </div>
            <p class="text-muted2 small mb-2">${m.desc}</p>
            <div class="progress mb-2"><div class="progress-bar" style="width:0%;background:${m.color}"></div></div>
            <div class="mini-stats mb-3"><span class="st"></span></div>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-ghost btn-sm" data-act="tips"><i class="bi bi-lightbulb"></i> Dicas &amp; comparação</button>
              <button class="btn btn-ghost btn-sm" data-act="mini"><i class="bi bi-puzzle"></i> Mini-desafio</button>
              <button class="btn btn-ghost btn-sm" data-act="lab"><i class="bi bi-terminal"></i> Abrir no Lab</button>
              <button class="btn btn-ghost btn-sm" data-act="quiz"><i class="bi bi-patch-question"></i> Questões</button>
            </div>
          </div>
        </div>
      </div>`;
    el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'tips') openModule(m.id, 'tips');
      if (a === 'mini') openModule(m.id, 'mini');
      if (a === 'lab') { loadItem('ex', MODAL_CONTENT[m.id].example); goTo('#lab'); }
      if (a === 'quiz') { startQuiz(m.id); goTo('#simulado'); }
    }));
    track.appendChild(el);
  });
}
const goTo = sel => document.querySelector(sel).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });

/* ---------- Modal de módulo ---------- */
let modModal, curMod = null;
function openModule(mid, tab) {
  const m = modById(mid), c = MODAL_CONTENT[mid]; curMod = mid;
  $('#modTitle').innerHTML = `<span class="mono" style="color:${m.color}">Módulo ${m.n}</span> · ${m.title}`;
  // cada dica tem uma lâmpada que abre o conceito completo no glossário
  $('#mTips').innerHTML = `<div class="tip-hint mb-2"><i class="bi bi-lightbulb text-warning"></i> clique na lâmpada para entender o conceito por trás da dica</div>
    <ul class="tip-list">${c.tips.map(([t, k]) => `<li><button class="bulb" data-concept="${k}" title="Entender: ${esc(GLOSSARY[k].title)}" aria-label="Explicar conceito: ${esc(GLOSSARY[k].title)}"><i class="bi bi-lightbulb"></i></button><span>${t}</span></li>`).join('')}</ul>`;
  $$('#mTips .bulb').forEach(b => b.addEventListener('click', () => openConcept(b.dataset.concept, true)));
  const card = s => `<div class="cmp-card"><div class="fw-bold">${s.title}</div><pre>${esc(s.code)}</pre><div class="small text-muted2">${s.note}</div></div>`;
  $('#mCmp').innerHTML = `<div class="row g-3 align-items-center"><div class="col-md-5">${card(c.compare.left)}</div><div class="col-md-2 text-center vs">VS</div><div class="col-md-5">${card(c.compare.right)}</div></div>`;
  $('#mMini').innerHTML = `<p class="mb-3"><i class="bi bi-cpu text-info me-1"></i><b>Preveja a saída antes de executar:</b><br>${c.mini.q}</p>
    ${c.mini.opts.map((o, i) => `<button class="q-opt" data-i="${i}"><span class="letter">${'ABCD'[i]}</span>${esc(o)}</button>`).join('')}
    <div class="small mt-2 d-none" id="miniExp"></div>`;
  $$('#mMini .q-opt').forEach(b => b.addEventListener('click', () => {
    const ok = +b.dataset.i === c.mini.ans;
    $$('#mMini .q-opt').forEach(x => { x.disabled = true; if (+x.dataset.i === c.mini.ans) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    const ex = $('#miniExp'); ex.classList.remove('d-none');
    ex.innerHTML = `<span class="${ok ? 'text-success' : 'text-danger'} fw-bold">${ok ? '✓ Acertou!' : '✗ Não foi dessa vez.'}</span> ${c.mini.exp}`;
  }));
  bootstrap.Tab.getOrCreateInstance(tab === 'mini' ? $('#tbMini') : $('#tbTips')).show();
  modModal.show();
}

/* ---------- Glossário de conceitos (modal da lâmpada) ---------- */
let conceptModal, curConcept = null, conceptFromModule = false;
// troca de modal: o Bootstrap não empilha modais, então fechamos um e abrimos o outro
function swapModal(from, to) {
  const el = from._element;
  if (el.classList.contains('show')) { el.addEventListener('hidden.bs.modal', () => to.show(), { once: true }); from.hide(); }
  else to.show();
}
function renderConcept(key) {
  const g = GLOSSARY[key], m = modById(g.mod); curConcept = key;
  $('#cEyebrow').innerHTML = `<i class="bi bi-lightbulb-fill text-warning"></i> conceito · módulo ${m.n}`;
  $('#cTitle').textContent = g.title;
  let h = `<div class="c-section c-resumo">${g.resumo}</div>`;
  if (g.analogia) h += `<div class="c-section"><div class="c-label"><i class="bi bi-chat-quote"></i>analogia para lembrar</div><div class="c-analogia">${g.analogia}</div></div>`;
  if (g.table) h += `<div class="c-section"><div class="c-label"><i class="bi bi-table"></i>referência rápida</div><div class="table-responsive"><table class="c-table"><thead><tr>${g.table.head.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${g.table.rows.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  if (g.code) h += `<div class="c-section"><div class="c-label"><i class="bi bi-code-slash"></i>exemplo</div><pre class="c-code">${highlight(g.code)}</pre>${g.saida ? `<div class="c-out">${esc(g.saida)}</div>` : ''}</div>`;
  if (g.prova) h += `<div class="c-section"><div class="c-label"><i class="bi bi-exclamation-triangle"></i>pegadinha de prova</div><div class="c-prova">${g.prova}</div></div>`;
  const rel = Object.keys(GLOSSARY).filter(k => k !== key && GLOSSARY[k].mod === g.mod);
  h += `<div class="c-section mb-0"><div class="c-label"><i class="bi bi-diagram-3"></i>conceitos relacionados</div><div class="c-related">${rel.map(k => `<button data-k="${k}">${esc(GLOSSARY[k].title)}</button>`).join('')}</div></div>`;
  $('#cBody').innerHTML = h;
  $$('#cBody .c-related button').forEach(b => b.addEventListener('click', () => renderConcept(b.dataset.k)));
  $('#cLab').classList.remove('d-none');
  $('#cBody').scrollTop = 0;
}
function openConcept(key, fromModule) {
  conceptFromModule = !!fromModule;
  $('#cBack').classList.toggle('d-none', !conceptFromModule);
  renderConcept(key);
  swapModal(modModal, conceptModal);
}
function openGlossary() {
  curConcept = null;
  $('#cEyebrow').innerHTML = '<i class="bi bi-lightbulb-fill text-warning"></i> glossário';
  $('#cTitle').textContent = 'Todos os conceitos';
  $('#cBody').innerHTML = MODULES.map(m => {
    const ks = Object.keys(GLOSSARY).filter(k => GLOSSARY[k].mod === m.id);
    return `<div class="c-section"><div class="c-label" style="color:${m.color}"><i class="bi ${m.icon}"></i>Módulo ${m.n} · ${m.title}</div>
      <div class="gloss-grid">${ks.map(k => `<button class="gloss-item" data-k="${k}"><i class="bi bi-lightbulb"></i><span>${esc(GLOSSARY[k].title)}</span></button>`).join('')}</div></div>`;
  }).join('');
  $$('#cBody .gloss-item').forEach(b => b.addEventListener('click', () => renderConcept(b.dataset.k)));
  $('#cLab').classList.add('d-none');
}

/* ---------- Janelas flutuantes (terminal e memória) ---------- */
// Destaca o painel do layout e o transforma numa janela fixa, arrastável pela barra
// de título e redimensionável pelo canto — como uma janela "sempre no topo" do Linux.
let zTop = 1045;
function makeFloatable(panel) {
  const id = panel.id, slot = panel.parentElement, head = panel.querySelector('.panel-head');
  const btn = panel.querySelector('[data-float]');
  const placeholder = document.createElement('div');
  placeholder.className = 'panel-placeholder';
  placeholder.innerHTML = `<i class="bi bi-window-stack me-1"></i>${panel.dataset.title} flutuando — clique aqui para acoplar de volta`;
  placeholder.addEventListener('click', () => dock());
  const state = () => (P.win = P.win || {}, P.win[id] = P.win[id] || {});
  const clamp = () => {
    const r = panel.getBoundingClientRect(), maxL = window.innerWidth - Math.min(r.width, window.innerWidth) , maxT = window.innerHeight - 40;
    panel.style.left = Math.max(0, Math.min(parseFloat(panel.style.left) || 0, maxL)) + 'px';
    panel.style.top = Math.max(56, Math.min(parseFloat(panel.style.top) || 0, maxT)) + 'px';
  };
  const persist = () => { if (!panel.classList.contains('floating')) return; const r = panel.getBoundingClientRect(); Object.assign(state(), { on: true, l: r.left, t: r.top, w: r.width, h: r.height }); save(); };
  function float(pos) {
    if (panel.classList.contains('floating')) return;
    const r = panel.getBoundingClientRect();
    placeholder.style.height = Math.min(r.height, 70) + 'px';
    slot.insertBefore(placeholder, panel);
    document.body.appendChild(panel);           // sai do grid: fica acima de tudo
    panel.classList.add('floating');
    const s = pos || {};
    panel.style.width = (s.w || Math.min(560, window.innerWidth * .94)) + 'px';
    panel.style.height = (s.h || 360) + 'px';
    panel.style.left = (s.l ?? window.innerWidth - (s.w || 560) - 24) + 'px';
    panel.style.top = (s.t ?? 90) + 'px';
    panel.style.zIndex = ++zTop;
    clamp();
    btn.innerHTML = '<i class="bi bi-box-arrow-in-down-left"></i>'; btn.title = 'Acoplar de volta ao layout';
    persist();
    if (hasGsap && !reduced) gsap.from(panel, { scale: .94, opacity: 0, duration: .3, ease: 'power2.out' });
  }
  function dock() {
    if (!panel.classList.contains('floating')) return;
    panel.classList.remove('floating', 'dragging');
    ['left', 'top', 'width', 'height', 'zIndex'].forEach(k => panel.style[k] = '');
    slot.insertBefore(panel, placeholder); placeholder.remove();
    btn.innerHTML = '<i class="bi bi-window-stack"></i>'; btn.title = 'Destacar janela (arrastar)';
    state().on = false; save();
    if (id === 'termPanel') term.scrollTop = term.scrollHeight;
  }
  // coloca a janela exatamente ao lado do editor, com a mesma altura — ideal para comparar código e saída
  function beside() {
    const er = document.querySelector('.editor').getBoundingClientRect();
    const left = er.right + 12, width = window.innerWidth - left - 16;
    if (width < 300) { panel.style.left = (window.innerWidth - 576) + 'px'; panel.style.width = '560px'; }
    else { panel.style.left = left + 'px'; panel.style.width = width + 'px'; }
    panel.style.top = Math.max(64, er.top) + 'px';
    panel.style.height = Math.max(220, Math.min(er.height + 40, window.innerHeight - 90)) + 'px';
    clamp(); persist();
  }
  btn.addEventListener('click', e => { e.stopPropagation(); panel.classList.contains('floating') ? dock() : float(); });
  panel.querySelector('[data-side]')?.addEventListener('click', e => { e.stopPropagation(); beside(); });
  // arrastar com pointer events (mouse, toque e caneta)
  let drag = null;
  head.addEventListener('pointerdown', e => {
    if (!panel.classList.contains('floating') || e.target.closest('button,input,select')) return;
    const r = panel.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    panel.classList.add('dragging'); panel.style.zIndex = ++zTop;
    head.setPointerCapture(e.pointerId); e.preventDefault();
  });
  head.addEventListener('pointermove', e => {
    if (!drag) return;
    panel.style.left = (e.clientX - drag.dx) + 'px'; panel.style.top = (e.clientY - drag.dy) + 'px'; clamp();
  });
  const end = () => { if (!drag) return; drag = null; panel.classList.remove('dragging'); persist(); };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  head.addEventListener('dblclick', e => { if (panel.classList.contains('floating') && !e.target.closest('button')) beside(); });
  panel.addEventListener('pointerdown', () => { if (panel.classList.contains('floating')) panel.style.zIndex = ++zTop; });
  if ('ResizeObserver' in window) { let t; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(persist, 250); }).observe(panel); }
  window.addEventListener('resize', () => { if (panel.classList.contains('floating')) clamp(); });
  const saved = P.win && P.win[id];
  if (saved && saved.on) float(saved);
  return { float, dock, beside, isFloating: () => panel.classList.contains('floating') };
}

/* ---------- Editor com destaque de sintaxe ---------- */
const ed = $('#code'), hl = $('#hl'), gut = $('#gutter'), lineHl = $('#lineHl');
const LH = 21, PAD = 12;
const RE_TOK = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(^[ \t]*#[^\n]*)|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|\b(int|char|float|double|void|long|short|unsigned|signed|const|static|FILE|size_t)\b|\b(if|else|while|for|do|return|break|continue|switch|case|default|sizeof|struct|typedef)\b|\b(NULL|EOF|RAND_MAX|EXIT_SUCCESS|EXIT_FAILURE)\b|\b(0[xX][0-9a-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?[fFuUlL]?)\b|\b([A-Za-z_]\w*)(?=\s*\()/gm;
function highlight(src) {
  let out = '', last = 0, m;
  RE_TOK.lastIndex = 0;
  while ((m = RE_TOK.exec(src))) {
    if (m.index === RE_TOK.lastIndex) RE_TOK.lastIndex++;
    out += esc(src.slice(last, m.index));
    const t = esc(m[0]);
    if (m[1]) out += `<span class="tk-com">${t}</span>`;
    else if (m[2]) out += `<span class="tk-pre">${t}</span>`;
    else if (m[3]) out += `<span class="tk-str">${t.replace(/(%[-+ 0#]*\d*(?:\.\d+)?(?:hh|h|ll|l|L|z)?[diouxXeEfgGcsp%]|\\.)/g, '<span class="tk-fmt">$1</span>')}</span>`;
    else if (m[4]) out += `<span class="tk-type">${t}</span>`;
    else if (m[5]) out += `<span class="tk-kw">${t}</span>`;
    else if (m[6]) out += `<span class="tk-const">${t}</span>`;
    else if (m[7]) out += `<span class="tk-num">${t}</span>`;
    else if (m[8]) out += `<span class="tk-fn">${t}</span>`;
    else out += t;
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}
let marks = { err: new Set(), warn: new Set(), cur: 0 };
function renderEditor() {
  hl.innerHTML = highlight(ed.value) + '\n';
  const n = ed.value.split('\n').length;
  let g = '';
  for (let i = 1; i <= n; i++) g += `<div class="${marks.err.has(i) ? 'g-err' : marks.warn.has(i) ? 'g-warn' : marks.cur === i ? 'g-cur' : ''}">${marks.cur === i ? '▶' : i}</div>`;
  gut.innerHTML = g;
  syncScroll();
}
function syncScroll() {
  hl.style.transform = `translate(${-ed.scrollLeft}px, ${-ed.scrollTop}px)`;
  gut.scrollTop = ed.scrollTop;
  positionLineHl();
}
function positionLineHl() {
  const line = marks.cur || (marks.err.size ? [...marks.err][0] : 0);
  if (!line) { lineHl.style.display = 'none'; return; }
  lineHl.style.display = 'block';
  lineHl.classList.toggle('err', !marks.cur);
  lineHl.style.top = (PAD + (line - 1) * LH - ed.scrollTop) + 'px';
}
function setCurLine(line) {
  marks.cur = line; renderEditor();
  const top = PAD + (line - 1) * LH;
  if (top < ed.scrollTop + LH || top > ed.scrollTop + ed.clientHeight - LH * 2) ed.scrollTop = Math.max(0, top - ed.clientHeight / 2);
  syncScroll();
}
function clearMarks() { marks = { err: new Set(), warn: new Set(), cur: 0 }; renderEditor(); }
let saveTimer;
ed.addEventListener('input', () => {
  if (dbg) stopDebug('código alterado — depuração encerrada');
  marks.err.clear(); marks.warn.clear(); renderEditor();
  clearTimeout(saveTimer); saveTimer = setTimeout(() => { P.code = ed.value; save(); }, 400);
});
ed.addEventListener('scroll', syncScroll);
ed.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = ed.selectionStart, en = ed.selectionEnd;
    ed.setRangeText('    ', s, en, 'end'); ed.dispatchEvent(new Event('input'));
  } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
    // auto-indentação: mantém a indentação da linha atual (+4 após '{')
    e.preventDefault();
    const s = ed.selectionStart, before = ed.value.slice(0, s);
    const line = before.slice(before.lastIndexOf('\n') + 1);
    let ind = line.match(/^\s*/)[0]; if (/\{\s*$/.test(line)) ind += '    ';
    ed.setRangeText('\n' + ind, s, ed.selectionEnd, 'end'); ed.dispatchEvent(new Event('input'));
  }
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runAll(); }
  if (e.key === 'F10' && dbg) { e.preventDefault(); debugStep(); }
});

/* ---------- Exemplos e desafios ---------- */
let current = { type: 'ex', id: EXAMPLES[0].id };
function buildSelect() {
  const sel = $('#exSelect');
  let h = '';
  MODULES.forEach(m => {
    h += `<optgroup label="Módulo ${m.n} · ${m.title}">`;
    EXAMPLES.filter(e => e.mod === m.id).forEach(e => h += `<option value="ex:${e.id}">${esc(e.title)}</option>`);
    h += '</optgroup>';
  });
  h += '<optgroup label="🏆 Desafios com autocorreção">';
  CHALLENGES.forEach(c => h += `<option value="ch:${c.id}">${P.chal[c.id] ? '✓ ' : ''}Desafio: ${esc(c.title)}</option>`);
  h += '</optgroup>';
  sel.innerHTML = h;
  sel.value = `${current.type}:${current.id}`;
}
function loadItem(type, id) {
  stopDebug();
  const item = type === 'ex' ? EXAMPLES.find(e => e.id === id) : CHALLENGES.find(c => c.id === id);
  if (!item) return;
  current = { type, id };
  ed.value = item.code; ed.scrollTop = 0;
  $('#stdin').value = item.stdin || '';
  $('#exSelect').value = `${type}:${id}`;
  P.code = ed.value; P.sel = current; save();
  showChallenge();
  clearMarks();
  termClear();
  termLine(`Carregado: ${item.title}. Clique em "Compilar & Executar" ou "Passo a Passo".`, 'info');
  renderMem(null);
  if (hasGsap && !reduced) gsap.fromTo('.editor', { opacity: .4 }, { opacity: 1, duration: .5 });
}
function showChallenge(result) {
  const box = $('#chalBox');
  if (current.type !== 'ch') { box.classList.remove('show'); return; }
  const c = CHALLENGES.find(x => x.id === current.id);
  const st = result ? (result[0] ? '<span class="result-badge bg-success text-dark ms-2">✓ APROVADO</span>' : `<span class="result-badge bg-danger ms-2">✗ ainda não</span> <span class="small text-muted2">${esc(result[1])}</span>`)
    : (P.chal[c.id] ? '<span class="result-badge bg-success text-dark ms-2">✓ já concluído</span>' : '');
  box.innerHTML = `<b class="text-warning"><i class="bi bi-trophy me-1"></i>${esc(c.title)}</b>${st}<div class="mt-1">${esc(c.goal)}</div>`;
  box.classList.add('show');
}

/* ---------- Terminal ---------- */
const term = $('#term');
function termClear() { term.innerHTML = ''; }
function termLine(text, cls) { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text + '\n'; term.appendChild(s); term.scrollTop = term.scrollHeight; }
function termCmd(cmd) { termLine(cmd, 'cmd'); }
function termOut(raw) {
  // marcadores internos: \u0001W...\u0002 = aviso em tempo de execução, \u0001I...\u0002 = eco do stdin
  const parts = raw.split(/(\u0001[WI][^\u0002]*\u0002)/);
  for (const p of parts) {
    if (!p) continue;
    const s = document.createElement('span');
    if (p[0] === '\u0001') { s.className = p[1] === 'W' ? 'warn' : 'inp'; s.textContent = p[1] === 'W' ? '\n' + p.slice(2, -1) + '\n' : p.slice(2, -1); }
    else s.textContent = p;
    term.appendChild(s);
  }
  term.scrollTop = term.scrollHeight;
}
function srcLine(n) { return (ed.value.split('\n')[n - 1] || '').trim(); }

/* ---------- Compilação / execução ---------- */
let dbg = null, autoTimer = null;
function compilePhase() {
  stopDebug(); clearMarks(); termClear();
  termCmd('gcc -Wall main.c -o main');
  const c = CLab.compile(ed.value);
  if (current.type === 'ex') { P.runs[current.id] = true; save(); updateProgress(); }   // exemplo explorado (inclui os de erro proposital)
  c.warnings.forEach(w => { marks.warn.add(w.line); termLine(`main.c:${w.line}: aviso: ${w.message}`, 'warn'); termLine(`    ${w.line} | ${srcLine(w.line)}`, 'src'); });
  if (c.errors.length) {
    c.errors.forEach(e => { marks.err.add(e.line); termLine(`main.c:${e.line}: erro: ${e.message}`, 'err'); termLine(`    ${e.line} | ${srcLine(e.line)}`, 'src'); });
    termLine(`\ncompilação interrompida: ${c.errors.length} erro(s). Nenhum executável foi gerado.`, 'err');
    renderEditor();
    renderMem(null, 'erro de compilação');
    return null;
  }
  renderEditor();
  return c;
}
function newMachine(c) { return new CLab.Machine(c.prog, { fs: VFS, stdin: $('#stdin').value }); }
function runAll() {
  const c = compilePhase(); if (!c) return;
  const m = newMachine(c);
  termCmd('./main');
  const g = m.run();
  let code, err;
  try { let r; while (!(r = g.next()).done); code = r.value; }
  catch (e) { [code, err] = classify(e); }
  endExec(m, code, err, 0);
  const r = term.getBoundingClientRect();
  if (!$('#termPanel').classList.contains('floating') && r.top > window.innerHeight - 80) term.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
}
function classify(e) {
  if (e instanceof CLab.ExitSignal) return [e.code, null];
  if (e instanceof CLab.RuntimeErr) return [e.code, e];
  console.error(e); return [1, { message: 'Erro interno do simulador: ' + e.message, line: 0 }];
}
function endExec(m, code, err, outPos) {
  termOut(m.out.slice(outPos));
  for (const h of m.handles.values()) if (h.open) termLine(`\naviso: o arquivo "${h.name}" (aberto na linha ${h.line}) não foi fechado com fclose()`, 'warn');
  if (err) { termLine(`\n[linha ${err.line}] ${err.message}`, 'err'); if (err.line) { marks.err.add(err.line); } }
  marks.cur = 0; renderEditor();
  termLine(`\n[Processo finalizado com código de retorno ${code}]`, code === 0 ? 'ok' : 'err');
  const snap = err || !m.finalSnapshot ? m.snapshot() : m.finalSnapshot;
  renderMem(snap, err ? `estado no momento do erro (linha ${err.line})` : 'estado final de main()');
  renderFS(m.fsChanged, m);
  save();
  // progresso
  if (current.type === 'ch') {
    const c = CHALLENGES.find(x => x.id === current.id);
    const plain = m.out.replace(/\u0001[WI][^\u0002]*\u0002/g, '');
    const res = err ? [false, 'o programa terminou com erro'] : c.check(plain, VFS, ed.value);
    if (res[0]) { P.chal[c.id] = true; buildSelect(); }
    showChallenge(res);
  }
  save(); updateProgress();
}

/* ---------- Depurador passo a passo ---------- */
function setDebugUI(on) {
  $('#debugBar').classList.toggle('show', on);
  $('#btnDebug').classList.toggle('active', on);
}
function debugStart() {
  const c = compilePhase(); if (!c) return;
  const m = newMachine(c);
  termCmd('./main   # modo passo a passo');
  dbg = { m, g: m.run(), outPos: 0 };
  setDebugUI(true);
  debugStep();
}
function debugStep() {
  if (!dbg) return;
  const d = dbg;
  let r;
  try { r = d.g.next(); }
  catch (e) { const [code, err] = classify(e); finishDebug(code, err); return; }
  if (r.done) { finishDebug(r.value, null); return; }
  termOut(d.m.out.slice(d.outPos)); d.outPos = d.m.out.length;
  $('#dbgLine').textContent = r.value.line;
  setCurLine(r.value.line);
  renderMem(d.m.snapshot(), `passo a passo · próxima linha: ${r.value.line}`);
  renderFS(d.m.fsChanged, d.m); d.m.fsChanged = new Set();
  d.m.lastWrite = null;
}
function finishDebug(code, err) {
  const d = dbg; stopAuto(); dbg = null; setDebugUI(false);
  endExec(d.m, code, err, d.outPos);
}
function stopDebug(msg) {
  stopAuto();
  if (!dbg) return;
  dbg = null; setDebugUI(false); marks.cur = 0; renderEditor();
  termLine(`\n[${msg || 'depuração interrompida pelo usuário'}]`, 'info');
}
function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; $('#btnAuto').innerHTML = '<i class="bi bi-play"></i> Auto'; } }
function toggleAuto() {
  if (autoTimer) return stopAuto();
  $('#btnAuto').innerHTML = '<i class="bi bi-pause"></i> Pausar';
  autoTimer = setInterval(() => { if (!dbg) return stopAuto(); debugStep(); }, 550);
}
function debugContinue() {
  if (!dbg) return;
  stopAuto();
  const d = dbg;
  try { let r; while (!(r = d.g.next()).done); finishDebug(r.value, null); }
  catch (e) { const [code, err] = classify(e); finishDebug(code, err); }
}

/* ---------- Visualizador de memória ---------- */
function varRow(v) {
  const cls = [v.changed && !v.elems?.length ? 'flash' : '', v.shadowed ? 'shadow' : ''].join(' ');
  const tags = (v.param ? '<span class="tag tag-param">param</span>' : '') + (v.shadowed ? '<span class="tag tag-shadow">sombreada</span>' : '') + (v.uninit ? '<span class="tag tag-lixo">lixo</span>' : '') + (v.kind === 'ptr' ? '<span class="tag tag-ptr">ponteiro</span>' : '');
  let val = esc(v.value);
  if (v.kind === 'ptr' && v.target) val += ` <span class="arrow">→ ${esc(v.target)}</span>${v.targetValue !== undefined ? ` <span class="text-muted2">(*${esc(v.name)} = ${esc(v.targetValue)})</span>` : ''}`;
  let h = `<tr class="${cls}"><td class="addr">${v.addr}</td><td class="vname">${esc(v.name)}${tags}</td><td class="vtype">${esc(v.type)}</td><td class="val">${val}</td></tr>`;
  if (v.elems) v.elems.forEach(e => h += `<tr class="sub ${e.changed ? 'flash' : ''}"><td class="addr">${e.addr}</td><td class="vname">${esc(e.label)}</td><td></td><td class="val">${esc(e.value)}</td></tr>`);
  return h;
}
function renderMem(snap, label) {
  $('#memLabel').textContent = label || (snap ? '' : 'aguardando execução');
  const st = $('#memStack'), pt = $('#memPtr');
  if (!snap) {
    st.innerHTML = `<div class="mem-empty"><i class="bi bi-memory fs-2 d-block mb-2"></i>Execute ou use <b>Passo a Passo</b> para ver a pilha (stack), as variáveis globais e o heap.</div>`;
    pt.innerHTML = `<div class="mem-empty"><i class="bi bi-signpost-split fs-2 d-block mb-2"></i>Ponteiros aparecem aqui como "bilhetes" apontando para as "caixas".</div>`;
    $('#ptrCount').textContent = 0; return;
  }
  let h = '';
  const table = rows => `<table class="mem-table"><tbody>${rows}</tbody></table>`;
  if (!snap.frames.length) h += `<div class="mem-empty small">Nenhum frame ativo na pilha (main já retornou).</div>`;
  snap.frames.forEach(f => {
    h += `<div class="frame ${f.active ? 'active' : 'suspended'}"><div class="frame-head"><span><i class="bi bi-stack me-1"></i>${esc(f.name)}</span><span>${f.active ? 'frame ativo' : 'suspenso (aguardando retorno)'}</span></div>`;
    h += f.vars.length ? table(f.vars.map(varRow).join('')) : '<div class="mem-empty small py-2">sem variáveis locais</div>';
    h += '</div>';
  });
  if (snap.globals.length) h += `<div class="frame"><div class="frame-head"><span><i class="bi bi-globe2 me-1"></i>.data · variáveis globais</span><span>vivem o programa todo</span></div>${table(snap.globals.map(varRow).join(''))}</div>`;
  if (snap.heap.length) h += `<div class="frame"><div class="frame-head"><span><i class="bi bi-boxes me-1"></i>heap (malloc)</span></div>${table(snap.heap.map(b => `<tr><td class="addr">${b.addr}</td><td class="vname">bloco</td><td class="vtype">${b.size} bytes</td><td class="val">alocado na linha ${b.line}</td></tr>`).join(''))}</div>`;
  st.innerHTML = h;

  // Ponteiros em ação
  const ptrs = [];
  snap.frames.forEach(f => f.vars.forEach(v => (v.kind === 'ptr' || v.kind === 'file') && ptrs.push({ ...v, where: f.name })));
  snap.globals.forEach(v => (v.kind === 'ptr' || v.kind === 'file') && ptrs.push({ ...v, where: 'global' }));
  $('#ptrCount').textContent = ptrs.length;
  pt.innerHTML = ptrs.length ? ptrs.map(p => {
    const raw = p.value.replace(' ⚠ lixo', '');
    const left = `<div class="pbox ticket"><small>${esc(p.type)} ${esc(p.name)} @ ${p.addr} · ${esc(p.where)}</small><b class="text-info">${esc(raw.split(' ')[0])}</b></div>`;
    let right;
    if (p.kind === 'file') right = `<div class="pbox" style="border-color:var(--pink)"><small>arquivo</small><b style="color:var(--pink)">${esc(raw.includes('"') ? raw.slice(raw.indexOf('"')) : 'NULL')}</b></div>`;
    else if (p.uninit) right = `<div class="pbox bad"><small>destino desconhecido</small><b>⚠ ponteiro selvagem (lixo)</b></div>`;
    else if (raw === 'NULL') right = `<div class="pbox"><small>não aponta para nada</small><b class="text-muted2">∅ NULL</b></div>`;
    else if (p.targetBad) right = `<div class="pbox bad"><small>endereço ${esc(raw)}</small><b>⚠ inválido / destruído</b></div>`;
    else right = `<div class="pbox box"><small>${esc(p.target)} (a caixa)</small><b class="text-success">${esc(p.targetValue ?? '?')}</b></div>`;
    return `<div class="ptr-viz ${p.changed ? 'flash' : ''}">${left}<span class="parrow"><small>*${esc(p.name)}</small><i class="bi bi-arrow-right"></i></span>${right}</div>`;
  }).join('') + `<div class="small text-muted2 mt-2"><b>Leitura:</b> o bilhete tracejado guarda um <i>endereço</i>; a caixa verde é a variável apontada. <code>*ptr = valor</code> altera a caixa, não o bilhete.</div>`
    : `<div class="mem-empty">Nenhum ponteiro vivo neste momento.<br><small>Experimente o exemplo "Ponteiros: &amp; e * na prática" no modo Passo a Passo.</small></div>`;
}

/* ---------- Sistema de arquivos virtual ---------- */
let fileModal, curFile = null;
function renderFS(changed, m) {
  const names = Object.keys(VFS).sort();
  const list = $('#fsList');
  list.innerHTML = names.length ? names.map(n => {
    const c = VFS[n], lines = c ? c.split('\n').length - (c.endsWith('\n') ? 1 : 0) : 0;
    return `<div class="fs-item ${changed && changed.has(n) ? 'fs-flash' : ''}" data-f="${esc(n)}"><i class="bi bi-file-earmark-text"></i><span>${esc(n)}</span><span class="meta">${c.length} B · ${lines} linha(s)</span></div>`;
  }).join('') : '<div class="mem-empty small">Diretório vazio. Rode um exemplo com fopen(..., "w").</div>';
  list.querySelectorAll('.fs-item').forEach(el => el.addEventListener('click', () => openFile(el.dataset.f)));
  if (m) {
    const hs = [...m.handles.values()];
    $('#fsHandles').innerHTML = hs.length ? 'FILE* nesta execução: ' + hs.map(h => `<span class="${h.open ? 'text-warning' : 'text-success'}">${esc(h.name)} ("${h.mode}", ${h.open ? 'aberto · pos ' + h.pos : 'fechado'})</span>`).join(' · ') : 'FILE* abertos: nenhum';
  }
  if (curFile && fileModal && $('#fileModal').classList.contains('show') && changed && changed.has(curFile)) showFileContent();
}
function showFileContent() {
  const c = VFS[curFile] ?? '';
  $('#fmName').textContent = curFile;
  $('#fmMeta').textContent = `${c.length} bytes · ${c.split('\n').length - (c.endsWith('\n') ? 1 : 0)} linha(s) · ↵ = '\\n' gravado no arquivo`;
  const lines = c.split('\n');
  if (c.endsWith('\n')) lines.pop();
  $('#fmView').innerHTML = c.length ? lines.map((l, i) => `<div class="fl"><span class="n">${i + 1}</span><span>${esc(l)}${i < lines.length - 1 || c.endsWith('\n') ? '<span class="nl">↵</span>' : ''}</span></div>`).join('') : '<div class="fl text-muted2">&nbsp;(arquivo vazio — 0 bytes)</div>';
}
function openFile(name) {
  curFile = name;
  showFileContent(); setFileEdit(false);
  fileModal.show();
}
function setFileEdit(on) {
  $('#fmView').classList.toggle('d-none', on); $('#fmEdit').classList.toggle('d-none', !on);
  $('#fmSave').classList.toggle('d-none', !on); $('#fmEditBtn').classList.toggle('d-none', on);
  if (on) $('#fmEdit').value = VFS[curFile] ?? '';
}

/* ---------- Simulado ---------- */
let quiz = null;
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function buildQuizFilter() {
  const f = $('#quizFilter');
  f.innerHTML = `<button class="btn btn-ghost" data-q="mix"><i class="bi bi-shuffle me-1"></i>Simulado misto (10)</button>` +
    MODULES.map(m => `<button class="btn btn-ghost" data-q="${m.id}">Mód. ${m.n} · ${m.title.split(' ')[0]}</button>`).join('') +
    `<button class="btn btn-ghost" data-q="wrong"><i class="bi bi-arrow-repeat me-1"></i>Revisar erros</button>`;
  f.querySelectorAll('button').forEach(b => b.addEventListener('click', () => startQuiz(b.dataset.q)));
}
function startQuiz(mode) {
  let list;
  if (mode === 'mix') list = shuffle(QUESTIONS).slice(0, 10);
  else if (mode === 'wrong') list = QUESTIONS.filter(q => P.quiz[q.id] === false);
  else list = shuffle(QUESTIONS.filter(q => q.mod === mode));
  $$('#quizFilter button').forEach(b => b.classList.toggle('active', b.dataset.q === mode));
  if (!list.length) { $('#quizCard').innerHTML = `<div class="text-center py-4"><i class="bi bi-emoji-smile fs-1 text-success"></i><p class="mt-2 mb-0">Nenhuma questão errada para revisar. Excelente!</p></div>`; return; }
  quiz = { mode, list, i: 0, score: 0 };
  renderQuestion();
}
function renderQuestion() {
  const q = quiz.list[quiz.i], m = modById(q.mod);
  const opts = shuffle(q.o.map((o, idx) => ({ text: o[0], why: o[1], ok: !!o[2], idx })));
  const card = $('#quizCard');
  card.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2 mini-stats">
      <span style="color:${m.color}">Módulo ${m.n} · ${m.title}</span><span>Questão ${quiz.i + 1}/${quiz.list.length} · acertos ${quiz.score}</span>
    </div>
    <div class="progress mb-3"><div class="progress-bar bg-info" style="width:${(quiz.i / quiz.list.length) * 100}%"></div></div>
    <h3 class="h5 mb-3 lh-base">${q.q}</h3>
    ${q.code ? `<div class="q-code mb-3">${highlight(q.code)}</div>` : ''}
    <div id="qOpts">${opts.map((o, i) => `<button class="q-opt" data-i="${i}"><span class="letter">${'ABCD'[i]}</span><span class="${/[;(){}=*&]/.test(o.text) ? 'mono small' : ''}">${esc(o.text)}</span><div class="why">${o.ok ? '✓ ' : '✗ '}${o.why}</div></button>`).join('')}</div>
    <div class="d-flex justify-content-between align-items-center mt-3"><span id="qFeedback" class="fw-semibold"></span><button class="btn btn-clab d-none" id="qNext">${quiz.i + 1 < quiz.list.length ? 'Próxima <i class="bi bi-arrow-right"></i>' : 'Ver resultado'}</button></div>`;
  card.querySelectorAll('.q-opt').forEach(b => b.addEventListener('click', () => {
    const o = opts[+b.dataset.i];
    card.querySelectorAll('.q-opt').forEach((x, i) => { x.disabled = true; x.classList.add('reveal'); if (opts[i].ok) x.classList.add('right'); });
    if (!o.ok) b.classList.add('wrong'); else quiz.score++;
    P.quiz[q.id] = o.ok; save(); updateProgress();
    $('#qFeedback').innerHTML = o.ok ? '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Correto!</span>' : '<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Incorreto — leia as explicações abaixo de cada alternativa.</span>';
    $('#qNext').classList.remove('d-none');
  }));
  card.querySelector('#qNext').addEventListener('click', () => { quiz.i++; quiz.i < quiz.list.length ? renderQuestion() : renderResult(); });
  if (hasGsap && !reduced) gsap.from('#quizCard .q-opt', { y: 12, opacity: 0, stagger: .06, duration: .35 });
}
function renderResult() {
  const pct = Math.round(quiz.score / quiz.list.length * 100);
  const msg = pct >= 80 ? 'Pronto para a prova! 🚀' : pct >= 60 ? 'Bom caminho — revise os erros.' : 'Volte ao laboratório e refaça os exemplos do módulo.';
  $('#quizCard').innerHTML = `<div class="text-center py-3">
    <div class="stat-num" style="font-size:3rem;color:${pct >= 60 ? 'var(--green)' : 'var(--red)'}">${pct}%</div>
    <p class="mb-1">${quiz.score} de ${quiz.list.length} acertos</p><p class="text-muted2">${msg}</p>
    <div class="d-flex justify-content-center gap-2 flex-wrap"><button class="btn btn-clab" id="qAgain"><i class="bi bi-arrow-repeat me-1"></i>Refazer</button><button class="btn btn-ghost" id="qWrong">Revisar erros</button></div></div>`;
  $('#qAgain').onclick = () => startQuiz(quiz.mode);
  $('#qWrong').onclick = () => startQuiz('wrong');
}

/* ---------- Animações (GSAP + ScrollTrigger) ---------- */
const HERO_CODE = String.raw`#include <stdio.h>

int main() {
    int x = 10;
    int *p = &x;     // p guarda o endereço
    *p = 25;         // altera x via ponteiro
    printf("x = %d\n", x);
    return 0;
}`;
function heroAnimations() {
  const code = $('#heroCode');
  code.innerHTML = highlight(HERO_CODE).split('\n').map(l => `<span class="ln">${l || ' '}</span>`).join('');
  // glifos flutuantes
  const glyphs = ['*p', '&x', '{ }', '->', 'int', '0x7ffd', 'NULL', '[i]', '%d', '/* */', 'FILE*', '++'];
  const gbox = $('#glyphs');
  glyphs.forEach((g, i) => { const s = document.createElement('span'); s.className = 'floating-glyph'; s.textContent = g; s.style.left = (5 + (i * 83) % 90) + '%'; s.style.top = (8 + (i * 37) % 80) + '%'; gbox.appendChild(s); });
  if (!hasGsap || reduced) return;
  gsap.registerPlugin(ScrollTrigger);
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.hero-anim', { y: 30, opacity: 0, duration: .8, stagger: .12 })
    .from('#heroWin', { y: 40, opacity: 0, rotateX: 8, duration: 1 }, '-=.6')
    .from('#heroCode .ln', { opacity: 0, x: -12, stagger: .08, duration: .3 }, '-=.4')
    .to('#hmXv', { duration: .1, onStart: () => { $('#hmXv').textContent = '25'; $('#hmOut').textContent = '$ x = 25'; } }, '+=.3')
    .fromTo('#hmX', { boxShadow: '0 0 0 0 rgba(63,185,80,.0)' }, { boxShadow: '0 0 0 4px rgba(63,185,80,.55)', duration: .4, yoyo: true, repeat: 1 });
  $$('.floating-glyph').forEach((g, i) => gsap.to(g, { y: (i % 2 ? -1 : 1) * (20 + i * 3), x: (i % 3 - 1) * 15, duration: 4 + i % 4, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
  // parallax do hero vinculado ao scroll
  gsap.to('.hero-glow.g1', { yPercent: 40, scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('#heroWin', { y: -60, scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.scroll-cue', { opacity: 0, scrollTrigger: { trigger: '#inicio', start: 'top top', end: '20% top', scrub: true } });
  // dashboard
  gsap.from('.stat-card', { y: 40, opacity: 0, stagger: .1, duration: .7, scrollTrigger: { trigger: '#dashboard', start: 'top 85%' } });
  // trilha: linha de progresso desenhada pelo scroll + cards entrando
  gsap.fromTo('.track-progress', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#track', start: 'top 70%', end: 'bottom 70%', scrub: true } });
  $$('.track-item').forEach((it, i) => {
    gsap.from(it.querySelector('.mod-card'), { x: i % 2 ? 60 : -60, opacity: 0, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: it, start: 'top 85%' } });
    gsap.from(it.querySelector('.track-node'), { scale: 0, rotate: -90, duration: .6, ease: 'back.out(2)', scrollTrigger: { trigger: it, start: 'top 85%' } });
  });
  gsap.from('.lab-head', { y: 30, opacity: 0, duration: .7, scrollTrigger: { trigger: '#lab', start: 'top 80%' } });
  gsap.from('#lab .panel', { y: 40, opacity: 0, stagger: .1, duration: .7, scrollTrigger: { trigger: '#lab', start: 'top 70%' } });
  gsap.from('#simulado .q-card', { y: 40, opacity: 0, duration: .7, scrollTrigger: { trigger: '#simulado', start: 'top 75%' } });
}

/* ---------- Inicialização ---------- */
function init() {
  modModal = new bootstrap.Modal('#modModal');
  fileModal = new bootstrap.Modal('#fileModal');
  conceptModal = new bootstrap.Modal('#conceptModal');
  $('#cBack').onclick = () => swapModal(conceptModal, modModal);
  $('#cAll').onclick = () => { $('#cBack').classList.add('d-none'); openGlossary(); };
  $('#cLab').onclick = () => { const ex = GLOSSARY[curConcept]?.ex; conceptModal.hide(); if (ex) { loadItem('ex', ex); goTo('#lab'); } };
  $('#navGloss').onclick = e => { e.preventDefault(); $('#cBack').classList.add('d-none'); openGlossary(); conceptModal.show(); };
  makeFloatable($('#termPanel'));
  makeFloatable($('#memPanel'));
  $('#hsEx').textContent = EXAMPLES.length; $('#hsQ').textContent = QUESTIONS.length; $('#hsC').textContent = CHALLENGES.length;
  buildTrack(); buildSelect(); buildQuizFilter();
  // restaura último código editado
  if (P.sel && (P.sel.type === 'ex' ? EXAMPLES : CHALLENGES).some(x => x.id === P.sel.id)) current = P.sel;
  const item = (current.type === 'ex' ? EXAMPLES : CHALLENGES).find(x => x.id === current.id);
  ed.value = P.code || item.code; $('#stdin').value = item.stdin || '';
  $('#exSelect').value = `${current.type}:${current.id}`;
  showChallenge(); renderEditor(); renderMem(null); renderFS();
  termLine('C-Lab pronto. Escolha um exemplo ou escreva seu código e pressione Ctrl+Enter.', 'info');
  startQuiz('mix');
  updateProgress();

  $('#btnRun').onclick = runAll;
  $('#btnDebug').onclick = () => dbg ? stopDebug() : debugStart();
  $('#btnStep').onclick = debugStep;
  $('#btnCont').onclick = debugContinue;
  $('#btnAuto').onclick = toggleAuto;
  $('#btnStop').onclick = () => stopDebug();
  $('#btnClear').onclick = termClear;
  $('#btnLoad').onclick = () => { const [t, id] = $('#exSelect').value.split(':'); loadItem(t, id); };
  $('#modOpen').onclick = () => { modModal.hide(); loadItem('ex', MODAL_CONTENT[curMod].example); goTo('#lab'); };
  $('#modQuiz').onclick = () => { modModal.hide(); startQuiz(curMod); goTo('#simulado'); };
  $('#btnNewFile').onclick = () => {
    let n = 1; while (VFS[`entrada${n}.txt`] !== undefined) n++;
    VFS[`entrada${n}.txt`] = ''; save(); renderFS(new Set([`entrada${n}.txt`]));
    openFile(`entrada${n}.txt`); setFileEdit(true);
  };
  $('#btnWipeFs').onclick = () => { if (confirm('Apagar todos os arquivos do Diretório Local?')) { Object.keys(VFS).forEach(k => delete VFS[k]); save(); renderFS(); } };
  $('#fmEditBtn').onclick = () => setFileEdit(true);
  $('#fmSave').onclick = () => { VFS[curFile] = $('#fmEdit').value; save(); setFileEdit(false); showFileContent(); renderFS(new Set([curFile])); };
  $('#fmDel').onclick = () => { delete VFS[curFile]; save(); fileModal.hide(); renderFS(); };
  // link ativo na navbar
  const links = $$('.navbar .nav-link');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  ['inicio', 'trilha', 'lab', 'simulado'].forEach(id => io.observe(document.getElementById(id)));
  $$('.navbar .nav-link').forEach(l => l.addEventListener('click', () => { const c = bootstrap.Collapse.getInstance('#nav'); if (c) c.hide(); }));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderEditor);
  heroAnimations();
}
document.addEventListener('DOMContentLoaded', init);
})();
