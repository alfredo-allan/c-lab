/* =====================================================================
 *  C-LAB INTERPRETER — subconjunto didático da linguagem C em JavaScript
 *  Pipeline: tokenize() -> Parser -> check() (análise semântica/escopo)
 *            -> Machine (execução com generators = passo a passo)
 * ===================================================================== */
const CLab = (() => {
'use strict';

/* ---------- Erros ---------- */
class CError extends Error { constructor(msg, line, kind = 'erro') { super(msg); this.line = line; this.kind = kind; } }
class RuntimeErr extends Error { constructor(msg, line, code = 139) { super(msg); this.line = line; this.code = code; } }
class ExitSignal { constructor(code) { this.code = code; } }

/* ---------- Sistema de tipos ---------- */
const BASE_SIZE = { char: 1, short: 2, int: 4, long: 8, float: 4, double: 8, void: 1, FILE: 216 };
const T = (b, p = 0, n = null) => ({ b, p, n });
const isArr = t => t.n != null;
const isPtr = t => t.n == null && t.p > 0;
const isFloatT = t => t.n == null && t.p === 0 && (t.b === 'float' || t.b === 'double');
function sizeOf(t) { if (isArr(t)) return t.n * sizeOf(T(t.b, t.p)); if (t.p > 0) return 8; return BASE_SIZE[t.b] || 4; }
const elemOf = t => isArr(t) ? T(t.b, t.p) : T(t.b, Math.max(0, t.p - 1));
const decay = t => isArr(t) ? T(t.b, t.p + 1) : t;
const typeStr = t => t.b + (t.p ? ' ' + '*'.repeat(t.p) : '') + (isArr(t) ? `[${t.n}]` : '');
const hex = a => '0x' + Math.trunc(a).toString(16);

/* ---------- Tokenizador + pré-processador simples ---------- */
const KEYWORDS = new Set(['int','char','float','double','void','long','short','unsigned','signed','const','static',
  'if','else','while','for','do','return','break','continue','sizeof','switch','case','default','struct','typedef']);
const OPS = ['<<=','>>=','...','->','++','--','<<','>>','<=','>=','==','!=','&&','||','+=','-=','*=','/=','%=','&=','|=','^=',
  '+','-','*','/','%','<','>','=','!','&','|','^','~','?',':',';',',','.','(',')','[',']','{','}'];
const ESC = { n: 10, t: 9, r: 13, '0': 0, '\\': 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11 };

function lex(src, startLine, onDirective) {
  const toks = []; let i = 0, line = startLine, lineStart = true; const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; lineStart = true; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '#' && lineStart && onDirective) {
      let j = i; while (j < n && src[j] !== '\n') j++;
      onDirective(src.slice(i, j).trim(), line); i = j; continue;
    }
    lineStart = false;
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const l0 = line; i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
      if (i >= n) throw new CError('comentário /* não foi fechado', l0);
      i += 2; continue;
    }
    const rest = src.slice(i, i + 64);
    let m;
    if ((m = /^0[xX][0-9a-fA-F]+[uUlL]*/.exec(rest))) { toks.push({ type: 'num', v: parseInt(m[0], 16), f: false, line }); i += m[0].length; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      m = /^(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?([fFlLuU]*)/.exec(src.slice(i));
      const isF = /[.eE]/.test(m[1] + (m[2] || '')) ;
      toks.push({ type: 'num', v: parseFloat(m[1] + (m[2] || '')), f: isF, fs: /[fF]/.test(m[3]), line });
      i += m[0].length; continue;
    }
    if (c === "'" || c === '"') {
      const q = c; let j = i + 1, s = '';
      while (j < n && src[j] !== q) {
        if (src[j] === '\n') throw new CError(`faltando caractere de fechamento ${q}`, line);
        if (src[j] === '\\') { const e = src[j + 1]; s += String.fromCharCode(e in ESC ? ESC[e] : e.charCodeAt(0)); j += 2; }
        else s += src[j++];
      }
      if (j >= n) throw new CError(`faltando caractere de fechamento ${q}`, line);
      if (q === "'") {
        if (s.length !== 1) throw new CError(`constante de caractere inválida '${s}'`, line);
        toks.push({ type: 'char', v: s.charCodeAt(0), line });
      } else toks.push({ type: 'str', v: s, line });
      i = j + 1; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      m = /^[A-Za-z_]\w*/.exec(src.slice(i, i + 128));
      toks.push({ type: KEYWORDS.has(m[0]) ? 'kw' : 'id', v: m[0], line }); i += m[0].length; continue;
    }
    const op = OPS.find(o => src.startsWith(o, i));
    if (!op) throw new CError(`caractere inesperado '${c}' no programa`, line);
    toks.push({ type: 'op', v: op, line }); i += op.length;
  }
  return toks;
}

function tokenize(src) {
  const includes = new Set(), macros = {}, errors = [];
  const raw = lex(src, 1, (dir, line) => {
    let m;
    if ((m = dir.match(/^#\s*include\s*[<"]([^>"]+)[>"]/))) includes.add(m[1].trim());
    else if ((m = dir.match(/^#\s*define\s+([A-Za-z_]\w*)\s+(.+)$/))) macros[m[1]] = lex(m[2].replace(/\/\/.*$/, '').trim(), line, null);
    else if (/^#\s*define\s+[A-Za-z_]\w*\s*$/.test(dir)) { /* define vazio: ignora */ }
    else throw new CError(`diretiva de pré-processador inválida: ${dir}`, line);
  });
  const toks = [];
  for (const t of raw) {
    if (t.type === 'id' && macros[t.v]) macros[t.v].forEach(mt => toks.push({ ...mt, line: t.line }));
    else toks.push(t);
  }
  return { toks, includes, macros };
}

/* ---------- Parser (descida recursiva) ---------- */
const TYPE_WORDS = new Set(['int','char','float','double','void','long','short','unsigned','signed','const','static','FILE','size_t']);
const ASSIGN_OPS = new Set(['=','+=','-=','*=','/=','%=','&=','|=','^=','<<=','>>=']);
const BIN_PREC = [['||'],['&&'],['|'],['^'],['&'],['==','!='],['<','>','<=','>='],['<<','>>'],['+','-'],['*','/','%']];

class Parser {
  constructor(toks) { this.t = toks; this.i = 0; }
  peek(o = 0) { return this.t[this.i + o] || { type: 'eof', v: 'fim do arquivo', line: this.t.length ? this.t[this.t.length - 1].line : 1 }; }
  next() { const t = this.peek(); this.i++; return t; }
  is(v, o = 0) { const t = this.peek(o); return (t.type === 'op' || t.type === 'kw') && t.v === v; }
  accept(v) { if (this.is(v)) { this.i++; return true; } return false; }
  expect(v) {
    if (this.accept(v)) return;
    const t = this.peek(), prev = this.t[this.i - 1];
    const line = (v === ';' || v === ')') && prev ? prev.line : t.line;
    throw new CError(`esperado '${v}' antes de '${t.v}'`, line);
  }
  isTypeStart(o = 0) { const t = this.peek(o); return (t.type === 'kw' || t.type === 'id') && TYPE_WORDS.has(t.v); }

  parseBaseType() {
    let b = null, longs = 0; const line = this.peek().line;
    if (this.is('struct') || this.is('typedef')) throw new CError('struct/typedef não são suportados neste simulador', line);
    while (this.isTypeStart()) {
      const v = this.next().v;
      if (v === 'long') longs++;
      else if (v === 'size_t') b = 'long';
      else if (!['const','static','signed','unsigned'].includes(v)) b = v;
    }
    if (b === null) b = longs ? 'long' : 'int';
    else if (longs && b === 'int') b = 'long';
    return { b };
  }
  stars() { let p = 0; while (this.accept('*')) { p++; this.accept('const'); } return p; }

  parseDeclarator(base) {
    const p = this.stars(); this.accept('const');
    const nt = this.peek();
    if (nt.type !== 'id') throw new CError(`esperado identificador antes de '${nt.v}'`, nt.line);
    this.i++;
    const d = { name: nt.v, type: T(base.b, p), line: nt.line };
    if (this.accept('[')) {
      if (this.is(']')) d.type.n = -1;
      else { const e = this.parseAssign(); const c = constEval(e); if (c === null) { d.sizeExpr = e; d.type.n = 0; } else d.type.n = c; }
      this.expect(']');
      if (this.is('[')) throw new CError('matrizes multidimensionais não são suportadas neste simulador (use vetores 1D)', nt.line);
    }
    if (this.accept('=')) {
      if (this.is('{')) {
        const line = this.next().line, items = [];
        if (!this.is('}')) do { if (this.is('}')) break; items.push(this.parseAssign()); } while (this.accept(','));
        this.expect('}');
        d.init = { k: 'initlist', items, line };
      } else d.init = this.parseAssign();
    }
    if (d.type.n === -1) {
      if (d.init && d.init.k === 'initlist') d.type.n = d.init.items.length;
      else if (d.init && d.init.k === 'str') d.type.n = d.init.v.length + 1;
      else throw new CError(`tamanho do vetor '${d.name}' é desconhecido`, d.line);
    }
    if (d.type.b === 'void' && d.type.p === 0) throw new CError(`variável '${d.name}' declarada como void`, d.line);
    return d;
  }

  parseProgram() {
    const funcs = {}, protos = {}, globals = [];
    while (this.peek().type !== 'eof') {
      const st = this.peek();
      if (!this.isTypeStart()) throw new CError(`esperado declaração ou função antes de '${st.v}'`, st.line);
      const save = this.i;
      const base = this.parseBaseType();
      const p = this.stars();
      const nt = this.peek();
      if (nt.type === 'id' && this.is('(', 1)) {
        this.i += 2;
        const params = [];
        if (this.is('void') && this.is(')', 1)) this.i++;
        if (!this.is(')')) do {
          const pb = this.parseBaseType(); let pp = this.stars(); let name = null;
          if (this.peek().type === 'id') name = this.next().v;
          if (this.accept('[')) { while (!this.is(']') && this.peek().type !== 'eof') this.i++; this.expect(']'); pp++; }
          params.push({ name, type: T(pb.b, pp) });
        } while (this.accept(','));
        this.expect(')');
        const fn = { name: nt.v, ret: T(base.b, p), params, line: nt.line };
        if (this.accept(';')) { protos[nt.v] = fn; continue; }
        if (funcs[nt.v]) throw new CError(`redefinição da função '${nt.v}'`, nt.line);
        fn.body = this.parseBlock();
        funcs[nt.v] = fn;
      } else {
        this.i = save;
        globals.push(this.parseDecl());
      }
    }
    return { funcs, protos, globals };
  }

  parseDecl() {
    const line = this.peek().line, base = this.parseBaseType(), decls = [];
    do decls.push(this.parseDeclarator(base)); while (this.accept(','));
    this.expect(';');
    return { k: 'decl', decls, line };
  }

  parseBlock() {
    const line = this.peek().line; this.expect('{');
    const items = [];
    while (!this.is('}')) {
      if (this.peek().type === 'eof') throw new CError("esperado '}' no fim da entrada (chave não fechada)", this.peek().line);
      items.push(this.parseStatement());
    }
    const endLine = this.next().line;
    return { k: 'block', items, line, endLine };
  }

  parseStatement() {
    const t = this.peek(), line = t.line;
    if (this.is('{')) return this.parseBlock();
    if (t.type === 'kw') {
      switch (t.v) {
        case 'if': { this.i++; this.expect('('); const c = this.parseExpr(); this.expect(')'); const th = this.parseStatement(); const el = this.accept('else') ? this.parseStatement() : null; return { k: 'if', c, th, el, line }; }
        case 'while': { this.i++; this.expect('('); const c = this.parseExpr(); this.expect(')'); return { k: 'while', c, body: this.parseStatement(), line }; }
        case 'do': { this.i++; const body = this.parseStatement(); const wl = this.peek().line; this.expect('while'); this.expect('('); const c = this.parseExpr(); this.expect(')'); this.expect(';'); return { k: 'do', c, body, line, wline: wl }; }
        case 'for': {
          this.i++; this.expect('(');
          let init = null;
          if (!this.accept(';')) {
            if (this.isTypeStart()) init = this.parseDecl();
            else { init = { k: 'expr', e: this.parseExpr(), line }; this.expect(';'); }
          }
          const c = this.is(';') ? null : this.parseExpr(); this.expect(';');
          const inc = this.is(')') ? null : this.parseExpr(); this.expect(')');
          return { k: 'for', init, c, inc, body: this.parseStatement(), line };
        }
        case 'return': { this.i++; const e = this.is(';') ? null : this.parseExpr(); this.expect(';'); return { k: 'return', e, line }; }
        case 'break': case 'continue': this.i++; this.expect(';'); return { k: t.v, line };
        case 'switch': { this.i++; this.expect('('); const e = this.parseExpr(); this.expect(')'); return { k: 'switch', e, body: this.parseBlock(), line }; }
        case 'case': { this.i++; const e = this.parseCond(); this.expect(':'); return { k: 'case', e, line }; }
        case 'default': this.i++; this.expect(':'); return { k: 'default', line };
        case 'else': throw new CError("'else' sem um 'if' correspondente", line);
      }
    }
    if (this.accept(';')) return { k: 'empty', line };
    if (this.isTypeStart()) return this.parseDecl();
    const e = this.parseExpr(); this.expect(';');
    return { k: 'expr', e, line };
  }

  parseExpr() { let e = this.parseAssign(); while (this.is(',')) { const line = this.next().line; e = { k: 'comma', a: e, b: this.parseAssign(), line }; } return e; }
  parseAssign() {
    const lhs = this.parseCond(); const t = this.peek();
    if (t.type === 'op' && ASSIGN_OPS.has(t.v)) { this.i++; return { k: 'assign', op: t.v, target: lhs, value: this.parseAssign(), line: t.line }; }
    return lhs;
  }
  parseCond() {
    const c = this.parseBin(0);
    if (this.is('?')) { const line = this.next().line; const a = this.parseExpr(); this.expect(':'); return { k: 'cond', c, a, b: this.parseCond(), line }; }
    return c;
  }
  parseBin(level) {
    if (level >= BIN_PREC.length) return this.parseUnary();
    let a = this.parseBin(level + 1);
    for (;;) {
      const t = this.peek();
      if (t.type === 'op' && BIN_PREC[level].includes(t.v)) { this.i++; a = { k: 'bin', op: t.v, a, b: this.parseBin(level + 1), line: t.line }; }
      else return a;
    }
  }
  parseTypeName() { const b = this.parseBaseType(); const p = this.stars(); return T(b.b, p); }
  parseUnary() {
    const t = this.peek(), line = t.line;
    if (t.type === 'op') {
      if (t.v === '++' || t.v === '--') { this.i++; return { k: 'pre', op: t.v, a: this.parseUnary(), line }; }
      if (['-','+','!','~','*','&'].includes(t.v)) { this.i++; return { k: 'un', op: t.v, a: this.parseUnary(), line }; }
      if (t.v === '(' && this.isTypeStart(1)) { this.i++; const ty = this.parseTypeName(); this.expect(')'); return { k: 'cast', t: ty, a: this.parseUnary(), line }; }
    }
    if (t.type === 'kw' && t.v === 'sizeof') {
      this.i++;
      if (this.is('(') && this.isTypeStart(1)) { this.i++; const ty = this.parseTypeName(); this.expect(')'); return { k: 'sizeofT', t: ty, line }; }
      return { k: 'sizeofE', a: this.parseUnary(), line };
    }
    return this.parsePostfix();
  }
  parsePostfix() {
    let e = this.parsePrimary();
    for (;;) {
      const t = this.peek();
      if (this.is('[')) { this.i++; const idx = this.parseExpr(); this.expect(']'); e = { k: 'idx', a: e, i: idx, line: t.line }; }
      else if (this.is('(')) {
        if (e.k !== 'id') throw new CError('chamada de função inválida', t.line);
        this.i++; const args = [];
        if (!this.is(')')) do args.push(this.parseAssign()); while (this.accept(','));
        this.expect(')');
        e = { k: 'call', name: e.name, args, line: e.line };
      }
      else if (this.is('++') || this.is('--')) { this.i++; e = { k: 'post', op: t.v, a: e, line: t.line }; }
      else if (this.is('.') || this.is('->')) throw new CError('structs (. e ->) não são suportadas neste simulador', t.line);
      else return e;
    }
  }
  parsePrimary() {
    const t = this.next();
    switch (t.type) {
      case 'num': return { k: 'num', v: t.v, t: t.f ? T(t.fs ? 'float' : 'double') : T('int'), line: t.line };
      case 'char': return { k: 'num', v: t.v, t: T('int'), isChar: true, line: t.line };
      case 'str': { let v = t.v; while (this.peek().type === 'str') v += this.next().v; return { k: 'str', v, line: t.line }; }
      case 'id': return { k: 'id', name: t.v, line: t.line };
    }
    if (t.type === 'op' && t.v === '(') { const e = this.parseExpr(); this.expect(')'); return e; }
    throw new CError(`expressão esperada antes de '${t.v}'`, t.line);
  }
}

function constEval(e) {
  if (e.k === 'num') return e.v;
  if (e.k === 'sizeofT') return sizeOf(e.t);
  if (e.k === 'bin') {
    const a = constEval(e.a), b = constEval(e.b); if (a === null || b === null) return null;
    switch (e.op) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return Math.trunc(a / b); case '%': return a % b; }
  }
  return null;
}

/* ---------- Biblioteca padrão simulada (cabeçalhos) ---------- */
const HEADERS = {
  'stdio.h': ['printf','scanf','puts','putchar','getchar','fopen','fclose','fprintf','fscanf','fgets','fputs','fputc','fgetc','feof','rewind','remove'],
  'string.h': ['strlen','strcpy','strncpy','strcat','strcmp'],
  'math.h': ['sqrt','pow','fabs','floor','ceil'],
  'stdlib.h': ['abs','malloc','calloc','free','exit','rand','srand','atoi','atof','system'],
  'ctype.h': ['toupper','tolower','isdigit','isalpha','isspace','isupper','islower'],
  'time.h': ['time'],
};
const FN_HEADER = {};
for (const h in HEADERS) HEADERS[h].forEach(f => FN_HEADER[f] = h);
const CONSTS = {
  NULL: { v: 0, t: T('void', 1) }, EOF: { v: -1, t: T('int') }, RAND_MAX: { v: 32767, t: T('int') },
  EXIT_SUCCESS: { v: 0, t: T('int') }, EXIT_FAILURE: { v: 1, t: T('int') }, true: { v: 1, t: T('int') }, false: { v: 0, t: T('int') },
};

/* ---------- Análise semântica: escopo, declarações, chamadas ---------- */
function check(prog, includes) {
  const errors = [], warnings = [];
  const globals = new Map();
  for (const g of prog.globals) for (const d of g.decls) {
    if (globals.has(d.name)) errors.push(new CError(`redeclaração da variável global '${d.name}'`, d.line));
    globals.set(d.name, d);
  }
  const declLine = {};
  for (const n in prog.protos) declLine[n] = prog.protos[n].line;
  for (const n in prog.funcs) if (!(n in declLine)) declLine[n] = prog.funcs[n].line;
  const warnedHeader = new Set();

  for (const fname in prog.funcs) {
    const fn = prog.funcs[fname];
    const scopes = [new Map()]; const reported = new Set();
    let loops = 0, switches = 0;
    fn.params.forEach(p => p.name && scopes[0].set(p.name, p));
    const lookup = n => { for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(n)) return true; return globals.has(n) || n in CONSTS; };

    const expr = e => {
      if (!e) return;
      switch (e.k) {
        case 'id':
          if (!lookup(e.name) && !reported.has(e.name)) {
            reported.add(e.name);
            errors.push(new CError(`'${e.name}' não foi declarado neste escopo (primeiro uso na função '${fname}')`, e.line));
          }
          return;
        case 'call': {
          const uf = prog.funcs[e.name] || prog.protos[e.name];
          if (uf) {
            if (declLine[e.name] > e.line) warnings.push(new CError(`declaração implícita da função '${e.name}' (use um protótipo antes de main)`, e.line, 'aviso'));
            if (e.args.length !== uf.params.length)
              errors.push(new CError(`${e.args.length > uf.params.length ? 'argumentos demais' : 'poucos argumentos'} para a função '${e.name}' (espera ${uf.params.length})`, e.line));
            if (!prog.funcs[e.name]) errors.push(new CError(`referência indefinida para '${e.name}' (protótipo sem implementação)`, e.line));
          } else if (FN_HEADER[e.name]) {
            const h = FN_HEADER[e.name];
            if (!includes.has(h) && !warnedHeader.has(e.name)) {
              warnedHeader.add(e.name);
              warnings.push(new CError(`declaração implícita da função '${e.name}' — inclua #include <${h}>`, e.line, 'aviso'));
            }
          } else errors.push(new CError(`referência indefinida para '${e.name}' (função não declarada)`, e.line));
          e.args.forEach(expr); return;
        }
        case 'bin': case 'comma': expr(e.a); expr(e.b); return;
        case 'assign': expr(e.target); expr(e.value); return;
        case 'un': case 'pre': case 'post': case 'cast': case 'sizeofE': expr(e.a); return;
        case 'idx': expr(e.a); expr(e.i); return;
        case 'cond': expr(e.c); expr(e.a); expr(e.b); return;
        case 'initlist': e.items.forEach(expr); return;
      }
    };
    const decl = s => {
      for (const d of s.decls) {
        expr(d.sizeExpr); expr(d.init);
        const top = scopes[scopes.length - 1];
        if (top.has(d.name)) errors.push(new CError(`redeclaração de '${d.name}' no mesmo escopo`, d.line));
        top.set(d.name, d);
      }
    };
    const stmt = (s, newScope = true) => {
      if (!s) return;
      switch (s.k) {
        case 'block': if (newScope) scopes.push(new Map()); s.items.forEach(x => stmt(x)); if (newScope) scopes.pop(); return;
        case 'decl': decl(s); return;
        case 'expr': expr(s.e); return;
        case 'if': expr(s.c); stmt(s.th); stmt(s.el); return;
        case 'while': case 'do': expr(s.c); loops++; stmt(s.body); loops--; return;
        case 'for': scopes.push(new Map()); if (s.init) s.init.k === 'decl' ? decl(s.init) : expr(s.init.e); expr(s.c); expr(s.inc); loops++; stmt(s.body); loops--; scopes.pop(); return;
        case 'switch': expr(s.e); switches++; stmt(s.body); switches--; return;
        case 'case': expr(s.e); return;
        case 'return':
          if (s.e && fn.ret.b === 'void' && fn.ret.p === 0) warnings.push(new CError(`'return' com valor em função void '${fname}'`, s.line, 'aviso'));
          expr(s.e); return;
        case 'break': if (!loops && !switches) errors.push(new CError("'break' fora de laço ou switch", s.line)); return;
        case 'continue': if (!loops) errors.push(new CError("'continue' fora de laço", s.line)); return;
      }
    };
    stmt(fn.body, false);
  }
  if (!prog.funcs.main) errors.push(new CError("referência indefinida para 'main' — todo programa C precisa de int main()", 1));
  errors.sort((a, b) => a.line - b.line); warnings.sort((a, b) => a.line - b.line);
  return { errors, warnings };
}

function compile(src) {
  try {
    const { toks, includes } = tokenize(src);
    const prog = new Parser(toks).parseProgram();
    const { errors, warnings } = check(prog, includes);
    return { prog, includes, errors, warnings };
  } catch (e) {
    if (e instanceof CError) return { prog: null, errors: [e], warnings: [] };
    throw e;
  }
}

/* ---------- Máquina virtual: memória, pilha, heap, arquivos ---------- */
const STACK_TOP = 0x7ffd4a40, GLOBAL_BASE = 0x601040, HEAP_BASE = 0x55a8c2a0, RODATA_BASE = 0x402010, FILE_BASE = 0x55a8b2a0;

class Machine {
  constructor(prog, opts = {}) {
    this.prog = prog; this.fs = opts.fs || {}; this.stdinText = opts.stdin || ''; this.stdinPos = 0;
    this.maxSteps = opts.maxSteps || 300000;
    this.out = ''; this.mem = new Map(); this.frames = []; this.globalScope = { vars: new Map(), sp: 0 };
    this.sp = STACK_TOP; this.gp = GLOBAL_BASE; this.hp = HEAP_BASE; this.rp = RODATA_BASE;
    this.strCache = new Map(); this.rodata = []; this.heap = new Map(); this.freed = new Set();
    this.handles = new Map(); this.nextHandle = FILE_BASE;
    this.steps = 0; this.lastWrite = null; this.fsChanged = new Set(); this.curLine = 0;
    this.seed = 1; this.warnings = []; this.warnSet = new Set(); this.finalSnapshot = null;
  }
  warn(msg) { const k = msg + '@' + this.curLine; if (!this.warnSet.has(k)) { this.warnSet.add(k); this.warnings.push({ msg, line: this.curLine }); this.out += `\u0001W[linha ${this.curLine}] aviso: ${msg}\u0002`; } }
  err(msg, code = 139) { return new RuntimeErr(msg, this.curLine, code); }

  /* --- memória --- */
  garbage(t) {
    if (isPtr(t)) return Math.random() < 0.5 ? 0 : 0x7ffd0000 + ((Math.random() * 0xfff0) | 0);
    if (isFloatT(t)) return Math.random() < 0.5 ? 0 : +(Math.random() * 1e-38).toExponential(3);
    if (t.b === 'char') return ((Math.random() * 200) | 0) - 100;
    return Math.random() < 0.3 ? 0 : (Math.random() * 32768) | 0;
  }
  conv(t, v) {
    v = Number(v); if (!isFinite(v) && !isFloatT(t)) v = 0;
    if (isPtr(t)) return Math.trunc(v) || 0;
    switch (t.b) {
      case 'char': { v = Math.trunc(v); if (v > 255 || v < -128) v = v & 0xff; return v > 127 ? v - 256 : v; }
      case 'short': { v = Math.trunc(v) & 0xffff; return v > 32767 ? v - 65536 : v; }
      case 'int': return Math.trunc(v) | 0;
      case 'long': return Math.trunc(v);
      case 'float': return Math.fround(v);
      default: return v;
    }
  }
  heapBlockOf(addr) { for (const b of this.heap.values()) if (addr >= b.addr && addr < b.addr + b.size) return b; return null; }
  segv(addr) {
    if (!addr) return this.err('Segmentation fault (core dumped) — tentativa de acessar o endereço NULL (0x0)');
    if (this.freed.has(addr) || [...this.freed].some(a => addr >= a && addr < a + 64))
      return this.err(`Segmentation fault (core dumped) — acesso a ${hex(addr)}, memória já liberada com free()`);
    return this.err(`Segmentation fault (core dumped) — acesso ao endereço inválido ${hex(addr)} (ponteiro não inicializado, fora dos limites ou variável já destruída)`);
  }
  cell(addr, create, t) {
    let c = this.mem.get(addr);
    if (!c) {
      const b = this.heapBlockOf(addr);
      if (!b) throw this.segv(addr);
      c = { v: b.zero ? 0 : this.garbage(t || T('int')), t: t || T('int'), uninit: !b.zero, owner: b, heap: true };
      this.mem.set(addr, c);
    }
    return c;
  }
  read(addr, t) { return this.cell(addr, false, t).v; }
  write(addr, t, v) {
    const c = this.cell(addr, true, t);
    if (c.ro) throw this.err(`Segmentation fault (core dumped) — tentativa de alterar uma string literal (memória somente leitura em ${hex(addr)})`);
    c.v = this.conv(t, v); c.t = t; c.uninit = false; this.lastWrite = addr;
    return c.v;
  }
  readStr(addr) {
    if (!addr) throw this.segv(0);
    let s = '';
    for (let i = 0; i < 100000; i++) { let c = this.read(addr + i, T('char')); if (c === 0) break; if (c < 0) c += 256; s += String.fromCharCode(c); }
    return s;
  }
  writeStr(addr, s) { for (let i = 0; i < s.length; i++) this.write(addr + i, T('char'), s.charCodeAt(i)); this.write(addr + s.length, T('char'), 0); }
  strAddr(node) {
    if (this.strCache.has(node)) return this.strCache.get(node);
    const addr = this.rp, s = node.v;
    const owner = { name: 'literal', lit: s };
    for (let i = 0; i <= s.length; i++) this.mem.set(addr + i, { v: i < s.length ? s.charCodeAt(i) : 0, t: T('char'), ro: true, owner });
    this.rodata.push({ addr, s }); this.rp += s.length + 1 + ((8 - (s.length + 1) % 8) % 8);
    this.strCache.set(node, addr); return addr;
  }

  /* --- escopos e variáveis --- */
  curScope() { return this.frames.length ? this.frames[this.frames.length - 1].scopes.at(-1) : this.globalScope; }
  pushScope() { const s = { vars: new Map(), sp: this.sp }; this.frames.at(-1).scopes.push(s); return s; }
  popScope() { const s = this.frames.at(-1).scopes.pop(); this.freeVars(s.vars); this.sp = s.sp; }
  freeVars(vars) {
    for (const sym of vars.values()) {
      const et = isArr(sym.type) ? elemOf(sym.type) : sym.type, es = sizeOf(et), n = isArr(sym.type) ? sym.type.n : 1;
      for (let i = 0; i < n; i++) this.mem.delete(sym.addr + i * es);
    }
  }
  allocVar(name, type, scope, region) {
    const size = Math.max(1, sizeOf(type));
    const et = isArr(type) ? elemOf(type) : type, es = sizeOf(et), align = Math.min(8, es) || 1;
    let addr;
    if (region === 'stack') {
      this.sp -= size; this.sp -= ((this.sp % align) + align) % align; addr = this.sp;
      if (STACK_TOP - this.sp > 512 * 1024) throw this.err('Stack overflow — a pilha estourou (recursão infinita ou vetor local grande demais)');
    } else { this.gp += ((align - this.gp % align) % align); addr = this.gp; this.gp += size; }
    const sym = { name, type, addr, region, line: this.curLine };
    const n = isArr(type) ? type.n : 1;
    for (let i = 0; i < n; i++) {
      const g = region === 'global';
      this.mem.set(addr + i * es, { v: g ? 0 : this.garbage(et), t: et, uninit: !g, owner: sym });
    }
    scope.vars.set(name, sym);
    return sym;
  }
  lookup(name) {
    const f = this.frames.at(-1);
    if (f) for (let i = f.scopes.length - 1; i >= 0; i--) { const s = f.scopes[i].vars.get(name); if (s) return s; }
    return this.globalScope.vars.get(name);
  }

  /* --- execução --- */
  *tick(line) {
    this.curLine = line;
    if (++this.steps > this.maxSteps) throw new RuntimeErr('Tempo limite excedido — possível laço infinito (o simulador interrompeu a execução)', line, 124);
    yield { line };
  }
  *run() {
    for (const g of this.prog.globals) yield* this.exec(g);
    const r = yield* this.callUser(this.prog.funcs.main, [], 0);
    return r.v;
  }
  *exec(s) {
    let r;
    switch (s.k) {
      case 'block':
        this.pushScope();
        for (const it of s.items) { r = yield* this.exec(it); if (r) { this.popScope(); return r; } }
        this.popScope(); return;
      case 'decl':
        yield* this.tick(s.line);
        for (const d of s.decls) {
          let type = d.type;
          if (d.sizeExpr) { const n = (yield* this.eval(d.sizeExpr)).v; if (n <= 0) throw this.err(`tamanho inválido (${n}) para o vetor '${d.name}'`); type = T(type.b, type.p, n); }
          const sym = this.allocVar(d.name, type, this.curScope(), this.frames.length ? 'stack' : 'global');
          if (d.init) yield* this.initVar(sym, d.init);
        }
        return;
      case 'expr': yield* this.tick(s.line); yield* this.eval(s.e); return;
      case 'empty': return;
      case 'if': {
        yield* this.tick(s.line);
        const c = yield* this.eval(s.c);
        if (c.v) return yield* this.exec(s.th);
        if (s.el) return yield* this.exec(s.el);
        return;
      }
      case 'while':
        for (;;) {
          yield* this.tick(s.line);
          if (!(yield* this.eval(s.c)).v) return;
          r = yield* this.exec(s.body);
          if (r) { if (r.k === 'break') return; if (r.k === 'return') return r; }
        }
      case 'do':
        for (;;) {
          r = yield* this.exec(s.body);
          if (r) { if (r.k === 'break') return; if (r.k === 'return') return r; }
          yield* this.tick(s.wline);
          if (!(yield* this.eval(s.c)).v) return;
        }
      case 'for': {
        this.pushScope();
        if (s.init) { if (s.init.k === 'decl') yield* this.exec(s.init); else { yield* this.tick(s.line); yield* this.eval(s.init.e); } }
        for (;;) {
          yield* this.tick(s.line);
          if (s.c && !(yield* this.eval(s.c)).v) break;
          r = yield* this.exec(s.body);
          if (r) { if (r.k === 'break') break; if (r.k === 'return') { this.popScope(); return r; } }
          if (s.inc) yield* this.eval(s.inc);
        }
        this.popScope(); return;
      }
      case 'return': {
        yield* this.tick(s.line);
        const v = s.e ? yield* this.eval(s.e) : null;
        return { k: 'return', v };
      }
      case 'break': case 'continue': yield* this.tick(s.line); return { k: s.k };
      case 'switch': {
        yield* this.tick(s.line);
        const v = (yield* this.eval(s.e)).v, items = s.body.items;
        let start = -1;
        for (let i = 0; i < items.length && start < 0; i++) if (items[i].k === 'case' && (yield* this.eval(items[i].e)).v === v) start = i;
        if (start < 0) start = items.findIndex(x => x.k === 'default');
        if (start < 0) return;
        this.pushScope();
        for (let i = start; i < items.length; i++) {
          if (items[i].k === 'case' || items[i].k === 'default') continue;
          r = yield* this.exec(items[i]);
          if (r) { this.popScope(); return r.k === 'break' ? undefined : r; }
        }
        this.popScope(); return;
      }
      case 'case': case 'default': return;
    }
    throw this.err('instrução não suportada: ' + s.k);
  }
  *initVar(sym, init) {
    const t = sym.type;
    if (isArr(t)) {
      const et = elemOf(t), es = sizeOf(et);
      if (init.k === 'initlist') {
        if (init.items.length > t.n) this.warn(`excesso de elementos no inicializador do vetor '${sym.name}'`);
        for (let i = 0; i < t.n; i++) this.write(sym.addr + i * es, et, i < init.items.length ? (yield* this.eval(init.items[i])).v : 0);
      } else if (init.k === 'str' && et.b === 'char' && et.p === 0) {
        for (let i = 0; i < t.n; i++) this.write(sym.addr + i, et, i < init.v.length ? init.v.charCodeAt(i) : 0);
      } else throw this.err(`inicializador inválido para o vetor '${sym.name}'`);
      return;
    }
    if (init.k === 'initlist') { this.write(sym.addr, t, init.items.length ? (yield* this.eval(init.items[0])).v : 0); return; }
    const v = yield* this.eval(init);
    this.typeWarn(t, v.t, sym.name);
    this.write(sym.addr, t, v.v);
  }
  typeWarn(dst, src, name) {
    if (isPtr(dst) && !isPtr(src) && src.n == null && src.p === 0) this.warn(`atribuindo um inteiro a ponteiro '${name || ''}' sem conversão (esqueceu o &?)`);
    else if (!isPtr(dst) && dst.n == null && isPtr(src)) this.warn(`atribuindo um endereço (ponteiro) à variável comum '${name || ''}' (esqueceu o *?)`);
  }
  *callUser(fn, args, line) {
    if (this.frames.length >= 300) throw new RuntimeErr('Stack overflow — recursão profunda demais (faltou o caso base?)', line, 139);
    const frame = { name: fn.name, fn, scopes: [], callLine: line };
    this.frames.push(frame);
    const sc = this.pushScope(); frame.spBase = sc.sp;
    fn.params.forEach((p, i) => {
      if (!p.name) return;
      const sym = this.allocVar(p.name, p.type, sc, 'stack'); sym.param = true;
      const a = args[i];
      if (a) { this.typeWarn(p.type, a.t, p.name); this.write(sym.addr, p.type, a.v); }
    });
    yield* this.tick(fn.line);
    let r;
    for (const st of fn.body.items) { r = yield* this.exec(st); if (r) break; }
    if (fn.name === 'main' && this.frames.length === 1) this.finalSnapshot = this.snapshot();
    while (frame.scopes.length) this.popScope();
    this.sp = frame.spBase; this.frames.pop();
    if (fn.ret.b === 'void' && fn.ret.p === 0) return { v: 0, t: T('void') };
    const rv = r && r.v;
    if (!rv && fn.name !== 'main') this.warn(`função '${fn.name}' terminou sem 'return' (valor devolvido é lixo)`);
    return { v: rv ? this.conv(fn.ret, rv.v) : (fn.name === 'main' ? 0 : this.garbage(T('int'))), t: fn.ret };
  }

  staticType(e) {
    switch (e.k) {
      case 'id': { const s = this.lookup(e.name); if (s) return s.type; if (CONSTS[e.name]) return CONSTS[e.name].t; return T('int'); }
      case 'idx': return elemOf(this.staticType(e.a));
      case 'un': if (e.op === '*') return elemOf(decay(this.staticType(e.a))); if (e.op === '&') { const t = this.staticType(e.a); return T(t.b, t.p + 1); } return this.staticType(e.a);
      case 'num': return e.t;
      case 'str': return T('char', 0, e.v.length + 1);
      case 'cast': return e.t;
      case 'call': { const f = this.prog.funcs[e.name]; return f ? f.ret : T('int'); }
      case 'assign': case 'pre': case 'post': return this.staticType(e.target || e.a);
      case 'cond': return this.staticType(e.a);
      case 'comma': return this.staticType(e.b);
      case 'sizeofT': case 'sizeofE': return T('long');
      case 'bin': {
        if (['==','!=','<','>','<=','>=','&&','||'].includes(e.op)) return T('int');
        const a = decay(this.staticType(e.a)), b = decay(this.staticType(e.b));
        if (isPtr(a)) return e.op === '-' && isPtr(b) ? T('long') : a;
        if (isPtr(b)) return b;
        if (a.b === 'double' || b.b === 'double') return T('double');
        if (a.b === 'float' || b.b === 'float') return T('float');
        return T('int');
      }
    }
    return T('int');
  }
  *lvalue(e) {
    switch (e.k) {
      case 'id': {
        const s = this.lookup(e.name);
        if (!s) throw this.err(`'${e.name}' não é uma variável válida aqui`);
        return { addr: s.addr, t: s.type, sym: s };
      }
      case 'un':
        if (e.op === '*') {
          const p = yield* this.eval(e.a);
          if (!isPtr(p.t)) throw this.err('operando inválido para * unário (o valor não é um ponteiro)');
          if (p.t.b === 'void' && p.t.p === 1) throw this.err('derreferência de ponteiro void* — faça um cast antes');
          return { addr: p.v, t: elemOf(p.t) };
        }
        break;
      case 'idx': {
        let base = yield* this.eval(e.a), i = yield* this.eval(e.i);
        if (isPtr(i.t) && !isPtr(base.t)) [base, i] = [i, base];
        if (!isPtr(base.t)) throw this.err('o valor indexado com [ ] não é vetor nem ponteiro');
        const et = elemOf(base.t), idx = Math.trunc(i.v);
        if (e.a.k === 'id') {
          const s = this.lookup(e.a.name);
          if (s && isArr(s.type) && (idx < 0 || idx >= s.type.n)) this.warn(`índice ${idx} fora dos limites do vetor '${s.name}' (válidos: 0 a ${s.type.n - 1}) — comportamento indefinido!`);
        }
        return { addr: base.v + idx * sizeOf(et), t: et };
      }
    }
    throw this.err('lvalue necessário: o lado esquerdo da atribuição precisa ser uma variável/posição de memória');
  }
  *eval(e) {
    switch (e.k) {
      case 'num': return { v: e.v, t: e.t };
      case 'str': return { v: this.strAddr(e), t: T('char', 1) };
      case 'id': {
        const s = this.lookup(e.name);
        if (!s) { if (CONSTS[e.name]) return CONSTS[e.name]; throw this.err(`'${e.name}' não declarado`); }
        if (isArr(s.type)) return { v: s.addr, t: decay(s.type) };
        return { v: this.read(s.addr), t: s.type };
      }
      case 'idx': { const lv = yield* this.lvalue(e); if (isArr(lv.t)) return { v: lv.addr, t: decay(lv.t) }; return { v: this.read(lv.addr, lv.t), t: lv.t }; }
      case 'un': {
        if (e.op === '*') { const lv = yield* this.lvalue(e); return { v: this.read(lv.addr, lv.t), t: lv.t }; }
        if (e.op === '&') { const lv = yield* this.lvalue(e.a); return { v: lv.addr, t: T(lv.t.b, lv.t.p + 1) }; }
        const a = yield* this.eval(e.a);
        if (e.op === '-') return { v: this.conv(a.t, -a.v), t: a.t };
        if (e.op === '+') return a;
        if (e.op === '!') return { v: a.v ? 0 : 1, t: T('int') };
        if (e.op === '~') return { v: ~a.v, t: T('int') };
        break;
      }
      case 'bin': {
        if (e.op === '&&') { if (!(yield* this.eval(e.a)).v) return { v: 0, t: T('int') }; return { v: (yield* this.eval(e.b)).v ? 1 : 0, t: T('int') }; }
        if (e.op === '||') { if ((yield* this.eval(e.a)).v) return { v: 1, t: T('int') }; return { v: (yield* this.eval(e.b)).v ? 1 : 0, t: T('int') }; }
        const a = yield* this.eval(e.a), b = yield* this.eval(e.b);
        return this.binop(e.op, a, b);
      }
      case 'assign': {
        const lv = yield* this.lvalue(e.target);
        if (isArr(lv.t)) throw this.err('não é possível atribuir a um vetor inteiro com = (use um laço ou strcpy)');
        let r = yield* this.eval(e.value);
        if (e.op !== '=') r = this.binop(e.op.slice(0, -1), { v: this.read(lv.addr, lv.t), t: lv.t }, r);
        else this.typeWarn(lv.t, r.t, e.target.name);
        return { v: this.write(lv.addr, lv.t, r.v), t: lv.t };
      }
      case 'pre': case 'post': {
        const lv = yield* this.lvalue(e.a);
        const old = this.read(lv.addr, lv.t), d = isPtr(lv.t) ? sizeOf(elemOf(lv.t)) : 1;
        const nv = this.write(lv.addr, lv.t, e.op === '++' ? old + d : old - d);
        return { v: e.k === 'pre' ? nv : old, t: lv.t };
      }
      case 'call': return yield* this.call(e);
      case 'cast': { const a = yield* this.eval(e.a); return { v: this.conv(e.t, a.v), t: e.t }; }
      case 'sizeofT': return { v: sizeOf(e.t), t: T('long') };
      case 'sizeofE': return { v: sizeOf(this.staticType(e.a)), t: T('long') };
      case 'cond': return (yield* this.eval(e.c)).v ? yield* this.eval(e.a) : yield* this.eval(e.b);
      case 'comma': yield* this.eval(e.a); return yield* this.eval(e.b);
    }
    throw this.err('expressão não suportada: ' + e.k);
  }
  binop(op, a, b) {
    const ap = isPtr(a.t), bp = isPtr(b.t);
    if (op === '+' || op === '-') {
      if (ap && !bp) return { v: a.v + (op === '+' ? 1 : -1) * Math.trunc(b.v) * sizeOf(elemOf(a.t)), t: a.t };
      if (bp && !ap && op === '+') return { v: b.v + Math.trunc(a.v) * sizeOf(elemOf(b.t)), t: b.t };
      if (ap && bp && op === '-') return { v: (a.v - b.v) / sizeOf(elemOf(a.t)), t: T('long') };
    }
    switch (op) {
      case '==': return { v: +(a.v === b.v), t: T('int') }; case '!=': return { v: +(a.v !== b.v), t: T('int') };
      case '<': return { v: +(a.v < b.v), t: T('int') };  case '>': return { v: +(a.v > b.v), t: T('int') };
      case '<=': return { v: +(a.v <= b.v), t: T('int') }; case '>=': return { v: +(a.v >= b.v), t: T('int') };
    }
    const fl = isFloatT(a.t) || isFloatT(b.t);
    const rt = fl ? ((a.t.b === 'double' || b.t.b === 'double') ? T('double') : T('float')) : ((a.t.b === 'long' || b.t.b === 'long') ? T('long') : T('int'));
    let v;
    switch (op) {
      case '+': v = a.v + b.v; break;
      case '-': v = a.v - b.v; break;
      case '*': v = fl || rt.b === 'long' ? a.v * b.v : Math.imul(a.v, b.v); break;
      case '/':
        if (!fl && Math.trunc(b.v) === 0) throw this.err('Floating point exception (core dumped) — divisão inteira por zero', 136);
        v = fl ? a.v / b.v : Math.trunc(a.v / b.v); break;
      case '%':
        if (fl) throw this.err("operandos inválidos para '%' (float/double) — o resto só existe para inteiros");
        if (Math.trunc(b.v) === 0) throw this.err('Floating point exception (core dumped) — resto de divisão por zero', 136);
        v = Math.trunc(a.v) % Math.trunc(b.v); break;
      case '&': v = a.v & b.v; break; case '|': v = a.v | b.v; break; case '^': v = a.v ^ b.v; break;
      case '<<': v = a.v << b.v; break; case '>>': v = a.v >> b.v; break;
      default: throw this.err('operador não suportado: ' + op);
    }
    return { v: this.conv(rt, v), t: rt };
  }
  *call(e) {
    const args = [];
    for (const a of e.args) args.push(yield* this.eval(a));
    const fn = this.prog.funcs[e.name];
    if (fn) return yield* this.callUser(fn, args, e.line);
    const b = BUILTINS[e.name];
    if (!b) throw this.err(`referência indefinida para '${e.name}'`);
    this.curLine = e.line;
    return b.call(this, args, e) || { v: 0, t: T('int') };
  }

  /* --- printf / scanf --- */
  format(fmt, args) {
    let out = '', ai = 0;
    const re = /^%([-+ 0#]*)(\*|\d+)?(?:\.(\*|\d+))?(hh|h|ll|l|L|z|j|t)?([diouxXeEfFgGcspn%])/;
    for (let i = 0; i < fmt.length; i++) {
      const ch = fmt[i];
      if (ch !== '%') { out += ch; continue; }
      const m = re.exec(fmt.slice(i));
      if (!m) { out += '%'; this.warn("especificador de formato inválido após '%' (para imprimir % use %%)"); continue; }
      i += m[0].length - 1;
      let [, flags, w, prec, , conv] = m;
      if (conv === '%') { out += '%'; continue; }
      if (w === '*') w = args[ai++]?.v; if (prec === '*') prec = args[ai++]?.v;
      const a = args[ai++];
      if (!a) { this.warn(`formato '%${conv}' sem argumento correspondente (valor impresso é lixo)`); out += '0'; continue; }
      const intConv = 'diouxXc'.includes(conv), flConv = 'eEfFgG'.includes(conv);
      if (intConv && isFloatT(a.t)) this.warn(`'%${conv}' espera um inteiro, mas recebeu ${a.t.b} — use %f`);
      if (flConv && !isFloatT(a.t)) this.warn(`'%${conv}' espera double/float, mas recebeu ${typeStr(a.t)} — use %d (ou faça um cast)`);
      if (conv === 's' && !isPtr(a.t)) this.warn("'%s' espera um char* (string), mas recebeu um valor numérico");
      let s, num = false;
      switch (conv) {
        case 'd': case 'i': s = String(Math.trunc(a.v)); num = true; break;
        case 'u': s = String(Math.trunc(a.v) >>> 0); num = true; break;
        case 'o': s = (Math.trunc(a.v) >>> 0).toString(8); break;
        case 'x': s = (Math.trunc(a.v) >>> 0).toString(16); break;
        case 'X': s = (Math.trunc(a.v) >>> 0).toString(16).toUpperCase(); break;
        case 'f': case 'F': s = Number(a.v).toFixed(prec !== undefined ? +prec : 6); num = true; break;
        case 'e': case 'E': { s = Number(a.v).toExponential(prec !== undefined ? +prec : 6).replace(/e([+-])(\d)$/, 'e$10$2'); if (conv === 'E') s = s.toUpperCase(); num = true; break; }
        case 'g': case 'G': s = String(Number(Number(a.v).toPrecision(prec ? +prec : 6))); num = true; break;
        case 'c': { let c = Math.trunc(a.v); if (c < 0) c += 256; s = String.fromCharCode(c); break; }
        case 's': s = a.v ? this.readStr(a.v) : '(null)'; if (prec !== undefined) s = s.slice(0, +prec); break;
        case 'p': s = a.v ? hex(a.v) : '(nil)'; break;
        default: s = '';
      }
      if (num && flags.includes('+') && !s.startsWith('-')) s = '+' + s;
      if (w && s.length < +w) {
        if (flags.includes('-')) s = s.padEnd(+w);
        else if (flags.includes('0') && num) { const neg = /^[+-]/.test(s) ? s[0] : ''; s = neg + s.slice(neg.length).padStart(+w - neg.length, '0'); }
        else s = s.padStart(+w);
      }
      out += s;
    }
    if (ai < args.length) this.warn('printf recebeu mais argumentos do que especificadores de formato');
    return out;
  }
  scan(src, pos, fmt, ptrs, echo) {
    let ai = 0, count = 0, p = pos;
    const skipWs = () => { while (p < src.length && /\s/.test(src[p])) p++; };
    for (let i = 0; i < fmt.length; i++) {
      const ch = fmt[i];
      if (/\s/.test(ch)) { skipWs(); continue; }
      if (ch !== '%') { if (src[p] === ch) { p++; continue; } break; }
      const m = /^%(\d+)?(hh|h|ll|l|L)?([dicfsue]|lf)/.exec(fmt.slice(i));
      if (!m) break;
      i += m[0].length - 1;
      const conv = m[3], width = m[1] ? +m[1] : Infinity;
      if (conv !== 'c') skipWs();
      if (p >= src.length) { if (count === 0) count = -1; break; }
      const ptr = ptrs[ai++];
      if (!ptr || !isPtr(ptr.t)) { this.warn('scanf/fscanf: argumento não é um endereço — esqueceu o & ?'); if (!ptr || !ptr.v) throw this.segv(ptr ? ptr.v : 0); }
      const rest = src.slice(p);
      let mm;
      if (conv === 'd' || conv === 'i' || conv === 'u') mm = /^[+-]?\d+/.exec(rest);
      else if (conv === 'f' || conv === 'e' || conv === 'lf') mm = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest);
      else if (conv === 's') mm = /^\S+/.exec(rest);
      else if (conv === 'c') mm = [rest[0]];
      if (!mm) break;
      let tok = mm[0]; if (tok.length > width) tok = tok.slice(0, width);
      p += tok.length;
      const et = elemOf(ptr.t);
      if (conv === 's') this.writeStr(ptr.v, tok);
      else if (conv === 'c') this.write(ptr.v, et, tok.charCodeAt(0));
      else this.write(ptr.v, et, parseFloat(tok));
      count++;
    }
    if (echo) { const consumed = src.slice(pos, p).trim(); if (consumed) this.out += `\u0001I${consumed}\u0002\n`; }
    return { count, pos: p };
  }

  /* --- arquivos --- */
  handle(v, fname) {
    if (!v) throw this.err(`Segmentation fault (core dumped) — ${fname}() recebeu FILE* NULL. Sempre verifique if (fp == NULL) após o fopen!`);
    const h = this.handles.get(v);
    if (!h) throw this.err(`Segmentation fault (core dumped) — ${fname}() recebeu um FILE* inválido (${hex(v)})`);
    if (!h.open) throw this.err(`${fname}() usado em arquivo já fechado com fclose() — uso após liberação`, 134);
    return h;
  }
  hWrite(h, s, fname) {
    if (h.mode[0] === 'r' && !h.mode.includes('+')) { this.warn(`${fname}(): '${h.name}' foi aberto em modo "r" (somente leitura) — nada foi gravado`); return -1; }
    let c = this.fs[h.name] ?? '';
    if (h.mode[0] === 'a') { c += s; h.pos = c.length; }
    else { c = c.slice(0, h.pos) + s + c.slice(h.pos + s.length); h.pos += s.length; }
    this.fs[h.name] = c; this.fsChanged.add(h.name);
    return s.length;
  }
  hReadable(h, fname) {
    if ((h.mode[0] === 'w' || h.mode[0] === 'a') && !h.mode.includes('+')) { this.warn(`${fname}(): '${h.name}' foi aberto em modo "${h.mode}" (somente escrita) — leitura falhou`); return false; }
    return true;
  }

  /* --- painel de memória --- */
  allSyms() {
    const list = [];
    for (const s of this.globalScope.vars.values()) list.push(s);
    for (const f of this.frames) for (const sc of f.scopes) for (const s of sc.vars.values()) list.push(s);
    return list;
  }
  ownerOf(addr) {
    if (!addr) return null;
    for (const s of this.allSyms()) {
      const size = sizeOf(s.type);
      if (addr >= s.addr && addr < s.addr + size) {
        if (isArr(s.type)) { const es = sizeOf(elemOf(s.type)); return { label: `${s.name}[${(addr - s.addr) / es}]`, sym: s }; }
        return { label: s.name, sym: s };
      }
    }
    for (const r of this.rodata) if (addr >= r.addr && addr <= r.addr + r.s.length) return { label: `literal "${r.s.length > 14 ? r.s.slice(0, 14) + '…' : r.s}"`.replace(/\n/g, '\\n'), ro: true };
    const b = this.heapBlockOf(addr); if (b) return { label: `heap+${addr - b.addr}`, heap: true };
    const h = this.handles.get(addr); if (h) return { label: `FILE "${h.name}"` };
    return { label: 'inválido', bad: true };
  }
  fmtScalar(t, v) {
    if (isPtr(t)) {
      if (t.b === 'FILE') { if (!v) return 'NULL'; const h = this.handles.get(v); return h ? `${hex(v)} → "${h.name}"${h.open ? '' : ' (fechado)'}` : hex(v); }
      return v ? hex(v) : 'NULL';
    }
    if (t.b === 'char') { const c = v < 0 ? v + 256 : v; const ch = c === 10 ? '\\n' : c === 0 ? '\\0' : c === 9 ? '\\t' : (c >= 32 ? String.fromCharCode(c) : null); return ch !== null ? `'${ch}' (${v})` : String(v); }
    if (t.b === 'float' || t.b === 'double') { const s = String(+v.toPrecision(t.b === 'float' ? 7 : 15)); return /^-?\d+$/.test(s) ? s + '.0' : s; }
    return String(v);
  }
  describe(s, ctx) {
    const t = s.type, d = { name: s.name, type: typeStr(t), addr: hex(s.addr), size: sizeOf(t), param: !!s.param, ...ctx };
    const lw = this.lastWrite;
    if (isArr(t)) {
      const et = elemOf(t), es = sizeOf(et);
      d.kind = 'arr'; d.elems = [];
      const cells = []; for (let i = 0; i < t.n; i++) cells.push(this.mem.get(s.addr + i * es) || { v: 0, uninit: true });
      d.changed = lw != null && lw >= s.addr && lw < s.addr + sizeOf(t);
      if (et.b === 'char' && et.p === 0) {
        let str = '', term = false;
        for (const c of cells) { if (c.v === 0) { term = true; break; } let ch = c.v < 0 ? c.v + 256 : c.v; str += ch === 10 ? '\\n' : ch < 32 ? '·' : String.fromCharCode(ch); }
        d.uninit = cells[0].uninit;
        d.value = d.uninit ? '?? (lixo)' : `"${str}"${term ? '' : ' (sem \\0!)'}`;
      } else d.value = '{' + cells.slice(0, 12).map(c => c.uninit ? '?' : this.fmtScalar(et, c.v)).join(', ') + (cells.length > 12 ? ', …' : '') + '}';
      const strPtr = et.b === 'char' && et.p === 1;
      const ev = c => { let s = this.fmtScalar(et, c.v); if (strPtr && c.v && !c.uninit) { try { s += ` → "${this.readStr(c.v)}"`; } catch (_) {} } return s; };
      if (strPtr) d.value = '{' + cells.map(c => c.uninit ? '?' : ev(c).replace(/^\S+ → /, '')).join(', ') + '}';
      if (t.n <= 16) cells.forEach((c, i) => d.elems.push({ label: `${s.name}[${i}]`, addr: hex(s.addr + i * es), value: c.uninit ? `${this.fmtScalar(et, c.v)} ⚠lixo` : ev(c), uninit: !!c.uninit, changed: lw === s.addr + i * es }));
      return d;
    }
    const c = this.mem.get(s.addr) || { v: 0 };
    d.changed = lw === s.addr; d.uninit = !!c.uninit;
    d.value = this.fmtScalar(t, c.v) + (c.uninit ? ' ⚠ lixo' : '');
    if (isPtr(t)) {
      d.kind = t.b === 'FILE' ? 'file' : 'ptr';
      if (d.kind === 'ptr' && c.v && !c.uninit) {
        const o = this.ownerOf(c.v);
        d.target = o ? o.label : '?';
        d.targetBad = !o || o.bad;
        if (o && !o.bad) {
          try {
            const tc = this.mem.get(c.v);
            const et = elemOf(t);
            d.targetValue = tc ? (et.b === 'char' && et.p === 0 && o.ro ? `"${this.readStr(c.v)}"` : this.fmtScalar(et.b === 'void' ? tc.t : et, tc.v)) : '?';
          } catch (_) { d.targetValue = '?'; }
        }
      }
    } else d.kind = 'val';
    return d;
  }
  snapshot() {
    const top = this.frames.length - 1;
    const frames = this.frames.map((f, fi) => {
      const vars = [], seen = new Set();
      for (let si = f.scopes.length - 1; si >= 0; si--)
        for (const s of [...f.scopes[si].vars.values()].reverse()) {
          vars.unshift(this.describe(s, { depth: si, shadowed: seen.has(s.name), suspended: fi !== top }));
          seen.add(s.name);
        }
      return { name: f.name + '()', active: fi === top, vars };
    }).reverse();
    const topNames = new Set();
    if (top >= 0) for (const sc of this.frames[top].scopes) for (const n of sc.vars.keys()) topNames.add(n);
    const globals = [...this.globalScope.vars.values()].map(s => this.describe(s, { shadowed: topNames.has(s.name) }));
    const heap = [...this.heap.values()].map(b => ({ addr: hex(b.addr), size: b.size, line: b.line }));
    const files = [...this.handles.values()].map(h => ({ name: h.name, mode: h.mode, open: h.open, pos: h.pos }));
    return { frames, globals, heap, files, line: this.curLine };
  }
}

/* ---------- Funções da biblioteca padrão ---------- */
const INT = v => ({ v, t: T('int') });
const DBL = v => ({ v, t: T('double') });
const BUILTINS = {
  printf(a) { if (!a.length) throw this.err('printf precisa de pelo menos 1 argumento'); const s = this.format(this.readStr(a[0].v), a.slice(1)); this.out += s; return INT(s.length); },
  puts(a) { const s = this.readStr(a[0].v); this.out += s + '\n'; return INT(s.length + 1); },
  putchar(a) { let c = a[0].v; if (c < 0) c += 256; this.out += String.fromCharCode(c); return INT(c); },
  scanf(a) {
    const r = this.scan(this.stdinText, this.stdinPos, this.readStr(a[0].v), a.slice(1), true);
    if (r.count === -1) this.warn('scanf: a entrada (stdin) acabou — preencha o campo "Entrada (stdin)" acima do terminal');
    this.stdinPos = r.pos; return INT(r.count);
  },
  getchar() { if (this.stdinPos >= this.stdinText.length) return INT(-1); return INT(this.stdinText.charCodeAt(this.stdinPos++)); },
  fopen(a) {
    const name = this.readStr(a[0].v), mode = this.readStr(a[1].v);
    if (!/^[rwa](\+?b?|b?\+?)$/.test(mode)) { this.warn(`modo de abertura inválido "${mode}" (use "r", "w", "a", "r+", "w+" ou "a+")`); return { v: 0, t: T('FILE', 1) }; }
    if (mode[0] === 'r' && !(name in this.fs)) return { v: 0, t: T('FILE', 1) };
    if (mode[0] === 'w') { this.fs[name] = ''; this.fsChanged.add(name); }
    if (mode[0] === 'a' && !(name in this.fs)) { this.fs[name] = ''; this.fsChanged.add(name); }
    const addr = this.nextHandle; this.nextHandle += 0x1e0;
    this.handles.set(addr, { name, mode, pos: mode[0] === 'a' ? this.fs[name].length : 0, open: true, eof: false, line: this.curLine });
    return { v: addr, t: T('FILE', 1) };
  },
  fclose(a) { const h = this.handle(a[0].v, 'fclose'); h.open = false; return INT(0); },
  fprintf(a) { const h = this.handle(a[0].v, 'fprintf'); const s = this.format(this.readStr(a[1].v), a.slice(2)); return INT(this.hWrite(h, s, 'fprintf')); },
  fputs(a) { const h = this.handle(a[1].v, 'fputs'); return INT(this.hWrite(h, this.readStr(a[0].v), 'fputs')); },
  fputc(a) { const h = this.handle(a[1].v, 'fputc'); let c = a[0].v; if (c < 0) c += 256; this.hWrite(h, String.fromCharCode(c), 'fputc'); return INT(c); },
  fgets(a) {
    const buf = a[0].v, n = Math.trunc(a[1].v), h = this.handle(a[2].v, 'fgets');
    if (!this.hReadable(h, 'fgets')) return { v: 0, t: T('char', 1) };
    const content = this.fs[h.name] ?? '';
    if (h.pos >= content.length) { h.eof = true; return { v: 0, t: T('char', 1) }; }
    let s = '';
    while (s.length < n - 1 && h.pos < content.length) { const ch = content[h.pos++]; s += ch; if (ch === '\n') break; }
    this.writeStr(buf, s);
    return { v: buf, t: T('char', 1) };
  },
  fgetc(a) {
    const h = this.handle(a[0].v, 'fgetc'); if (!this.hReadable(h, 'fgetc')) return INT(-1);
    const c = this.fs[h.name] ?? '';
    if (h.pos >= c.length) { h.eof = true; return INT(-1); }
    return INT(c.charCodeAt(h.pos++));
  },
  fscanf(a) {
    const h = this.handle(a[0].v, 'fscanf'); if (!this.hReadable(h, 'fscanf')) return INT(-1);
    const r = this.scan(this.fs[h.name] ?? '', h.pos, this.readStr(a[1].v), a.slice(2), false);
    h.pos = r.pos; if (r.count === -1) h.eof = true; return INT(r.count);
  },
  feof(a) { return INT(this.handle(a[0].v, 'feof').eof ? 1 : 0); },
  rewind(a) { const h = this.handle(a[0].v, 'rewind'); h.pos = 0; h.eof = false; return INT(0); },
  remove(a) { const n = this.readStr(a[0].v); if (!(n in this.fs)) return INT(-1); delete this.fs[n]; this.fsChanged.add(n); return INT(0); },
  strlen(a) { return { v: this.readStr(a[0].v).length, t: T('long') }; },
  strcpy(a) { this.writeStr(a[0].v, this.readStr(a[1].v)); return { v: a[0].v, t: T('char', 1) }; },
  strncpy(a) { const s = this.readStr(a[1].v), n = a[2].v; for (let i = 0; i < n; i++) this.write(a[0].v + i, T('char'), i < s.length ? s.charCodeAt(i) : 0); return { v: a[0].v, t: T('char', 1) }; },
  strcat(a) { const d = this.readStr(a[0].v); this.writeStr(a[0].v + d.length, this.readStr(a[1].v)); return { v: a[0].v, t: T('char', 1) }; },
  strcmp(a) { const x = this.readStr(a[0].v), y = this.readStr(a[1].v); return INT(x < y ? -1 : x > y ? 1 : 0); },
  sqrt(a) { return DBL(Math.sqrt(a[0].v)); }, pow(a) { return DBL(Math.pow(a[0].v, a[1].v)); },
  fabs(a) { return DBL(Math.abs(a[0].v)); }, floor(a) { return DBL(Math.floor(a[0].v)); }, ceil(a) { return DBL(Math.ceil(a[0].v)); },
  abs(a) { return INT(Math.abs(Math.trunc(a[0].v))); },
  atoi(a) { return INT(parseInt(this.readStr(a[0].v), 10) || 0); }, atof(a) { return DBL(parseFloat(this.readStr(a[0].v)) || 0); },
  rand() { this.seed = (this.seed * 1103515245 + 12345) % 2147483648; return INT(Math.floor(this.seed / 65536) % 32768); },
  srand(a) { this.seed = Math.trunc(a[0].v) >>> 0; return INT(0); },
  time() { return { v: Math.floor(Date.now() / 1000), t: T('long') }; },
  system() { return INT(0); },
  toupper(a) { const c = a[0].v; return INT(c >= 97 && c <= 122 ? c - 32 : c); }, tolower(a) { const c = a[0].v; return INT(c >= 65 && c <= 90 ? c + 32 : c); },
  isdigit(a) { return INT(+(a[0].v >= 48 && a[0].v <= 57)); }, isalpha(a) { const c = a[0].v | 32; return INT(+(c >= 97 && c <= 122)); },
  isspace(a) { return INT(+[32, 9, 10, 13, 11, 12].includes(a[0].v)); }, isupper(a) { return INT(+(a[0].v >= 65 && a[0].v <= 90)); }, islower(a) { return INT(+(a[0].v >= 97 && a[0].v <= 122)); },
  malloc(a) {
    const n = Math.trunc(a[0].v); if (n <= 0) return { v: 0, t: T('void', 1) };
    const addr = this.hp; this.heap.set(addr, { addr, size: n, line: this.curLine, zero: false, name: 'heap' });
    this.hp += n + 16 + ((16 - n % 16) % 16); return { v: addr, t: T('void', 1) };
  },
  calloc(a) { const r = BUILTINS.malloc.call(this, [{ v: a[0].v * a[1].v }]); if (r.v) this.heap.get(r.v).zero = true; return r; },
  free(a) {
    const p = a[0].v; if (!p) return INT(0);
    const b = this.heap.get(p);
    if (!b) throw this.err(this.freed.has(p) ? 'free(): double free detected — o mesmo bloco foi liberado duas vezes' : 'free(): ponteiro inválido (não veio de malloc)', 134);
    for (const k of [...this.mem.keys()]) if (k >= b.addr && k < b.addr + b.size) this.mem.delete(k);
    this.heap.delete(p); this.freed.add(p); return INT(0);
  },
  exit(a) { throw new ExitSignal(Math.trunc(a[0].v)); },
};

return { compile, Machine, CError, RuntimeErr, ExitSignal, hex };
})();
if (typeof module !== 'undefined') module.exports = CLab;
