/* =====================================================================
 *  CONTEÚDO DIDÁTICO — módulos, exemplos executáveis, desafios e questões
 * ===================================================================== */
const MODULES = [
  { id: 'fund', n: 'I', icon: 'bi-cpu', title: 'Fundamentos & Operadores', color: '#d2a8ff',
    desc: 'Estrutura de um programa, tipos primitivos, printf/scanf, operadores aritméticos, divisão inteira, casting, incremento pré/pós e sizeof.' },
  { id: 'ptr', n: 'II', icon: 'bi-signpost-split', title: 'Ponteiros & Endereçamento', color: '#58a6ff',
    desc: 'int *p, operador & (endereço), * (derreferência), ponteiro para ponteiro e passagem por valor vs. por referência.' },
  { id: 'vet', n: 'III', icon: 'bi-grid-3x2-gap', title: 'Vetores & Aritmética de Ponteiros', color: '#3fb950',
    desc: 'v[i] ≡ *(v + i), vetor como parâmetro, busca de menor/maior, inversão com dois ponteiros e sizeof de vetores.' },
  { id: 'esc', n: 'IV', icon: 'bi-bounding-box', title: 'Escopo & Shadowing', color: '#f0883e',
    desc: 'Variáveis locais x globais, tempo de vida, blocos { }, sombreamento de nomes e erros de compilação de escopo.' },
  { id: 'arq', n: 'V', icon: 'bi-file-earmark-code', title: 'Arquivos & Buffers', color: '#f778ba',
    desc: 'FILE *fp, fopen e modos, validação de NULL, fprintf, fgets com sizeof(buffer), feof e fclose.' },
];

const EXAMPLES = [
  { id: 'fund-op', mod: 'fund', title: 'Operadores, divisão inteira e casting', code: String.raw`#include <stdio.h>

int main() {
    int a = 17, b = 5;
    float media;

    printf("a + b = %d\n", a + b);
    printf("a / b = %d  (divisao inteira!)\n", a / b);
    printf("a %% b = %d  (resto da divisao)\n", a % b);

    media = (float) a / b;      // cast ANTES da divisao
    printf("(float) a / b = %.2f\n", media);
    media = (float) (a / b);    // cast DEPOIS: ja perdeu a parte decimal
    printf("(float)(a / b) = %.2f\n", media);

    int x = 5;
    int y = x++;   // pos-incremento: usa o valor, depois soma
    int z = ++x;   // pre-incremento: soma, depois usa
    printf("x = %d, y = %d, z = %d\n", x, y, z);

    printf("sizeof: int=%d char=%d float=%d double=%d\n",
           sizeof(int), sizeof(char), sizeof(float), sizeof(double));
    return 0;
}
` },
  { id: 'fund-scanf', mod: 'fund', title: 'Entrada com scanf (use o campo stdin)', stdin: '8.5 7 Maria', code: String.raw`#include <stdio.h>

int main() {
    float nota1;
    int nota2;
    char nome[20];

    printf("Digite nota1, nota2 e nome: ");
    scanf("%f %d %s", &nota1, &nota2, nome);   // nome ja e um endereco (sem &)

    float media = (nota1 + nota2) / 2;
    printf("Aluno(a): %s\n", nome);
    printf("Media: %.2f\n", media);

    if (media >= 7.0) {
        printf("Situacao: APROVADO\n");
    } else if (media >= 5.0) {
        printf("Situacao: EXAME\n");
    } else {
        printf("Situacao: REPROVADO\n");
    }
    return 0;
}
` },
  { id: 'ptr-basico', mod: 'ptr', title: 'Ponteiros: & e * na prática', code: String.raw`#include <stdio.h>

int main() {
    int x = 10;      // a "caixa": guarda um valor
    int *p;          // o "bilhete": vai guardar um endereco
    p = &x;          // & = "endereco de"

    printf("Valor de x:     %d\n", x);
    printf("Endereco de x:  %p\n", &x);
    printf("Conteudo de p:  %p\n", p);
    printf("Valor via *p:   %d\n", *p);

    *p = 25;         // derreferencia: altera x ATRAVES de p
    printf("Apos *p = 25 -> x = %d\n", x);

    int **pp = &p;   // ponteiro para ponteiro
    **pp = 99;
    printf("Apos **pp = 99 -> x = %d\n", x);
    return 0;
}
` },
  { id: 'ptr-ref', mod: 'ptr', title: 'Passagem por valor x por referência', code: String.raw`#include <stdio.h>

void dobraPorValor(int n) {
    n = n * 2;              // altera apenas a COPIA
    printf("  dentro de dobraPorValor:      n  = %d\n", n);
}

void dobraPorReferencia(int *n) {
    *n = *n * 2;            // altera a variavel ORIGINAL da main
    printf("  dentro de dobraPorReferencia: *n = %d\n", *n);
}

void troca(int *a, int *b) {
    int aux = *a;
    *a = *b;
    *b = aux;
}

int main() {
    int num = 7;

    dobraPorValor(num);
    printf("Apos por valor:      num = %d\n", num);

    dobraPorReferencia(&num);
    printf("Apos por referencia: num = %d\n", num);

    int x = 1, y = 2;
    troca(&x, &y);
    printf("Apos troca: x = %d, y = %d\n", x, y);
    return 0;
}
` },
  { id: 'vet-arit', mod: 'vet', title: 'v[i] ≡ *(v + i) e menor/maior', code: String.raw`#include <stdio.h>
#define TAM 5

int main() {
    int v[TAM] = {42, 7, 19, 3, 88};
    int *p = v;     // nome do vetor = endereco do 1o elemento

    for (int i = 0; i < TAM; i++) {
        printf("v[%d]=%2d | *(v+%d)=%2d | &v[%d]=%p\n",
               i, v[i], i, *(v + i), i, &v[i]);
    }

    int menor = v[0], maior = v[0];
    for (int i = 1; i < TAM; i++) {
        if (*(p + i) < menor) menor = *(p + i);
        if (*(p + i) > maior) maior = *(p + i);
    }
    printf("Menor = %d, Maior = %d\n", menor, maior);
    printf("sizeof(v) = %d bytes -> %d elementos\n",
           sizeof(v), sizeof(v) / sizeof(v[0]));
    return 0;
}
` },
  { id: 'vet-inv', mod: 'vet', title: 'Inversão de vetor com dois ponteiros', code: String.raw`#include <stdio.h>

void imprime(int *v, int n) {
    for (int i = 0; i < n; i++) printf("%d ", v[i]);
    printf("\n");
}

void inverte(int *v, int n) {
    int *ini = v;            // aponta para o primeiro
    int *fim = v + n - 1;    // aponta para o ultimo
    while (ini < fim) {
        int aux = *ini;
        *ini = *fim;
        *fim = aux;
        ini++;               // avanca 4 bytes (sizeof(int))
        fim--;
    }
}

int main() {
    int dados[6] = {10, 20, 30, 40, 50, 60};
    printf("Original:  ");
    imprime(dados, 6);
    inverte(dados, 6);
    printf("Invertido: ");
    imprime(dados, 6);
    return 0;
}
` },
  { id: 'esc-shadow', mod: 'esc', title: 'Global, local e shadowing', code: String.raw`#include <stdio.h>

int contador = 100;     // GLOBAL: existe durante todo o programa

void incrementa() {
    contador++;             // usa a global
    int local = 1;          // nasce e morre a cada chamada
    local++;
    printf("  incrementa(): contador=%d local=%d\n", contador, local);
}

int main() {
    incrementa();
    incrementa();

    int contador = 5;       // LOCAL sombreia (shadowing) a global
    printf("main: contador = %d\n", contador);

    {
        int contador = 50;  // sombreia a local da main neste bloco
        printf("bloco interno: contador = %d\n", contador);
    }                       // aqui o contador=50 e destruido

    printf("main de novo: contador = %d\n", contador);
    return 0;
}
` },
  { id: 'esc-erro', mod: 'esc', title: 'Erro de compilação: fora do escopo', code: String.raw`#include <stdio.h>

void calcula() {
    int resultado = 42;     // local de calcula()
}

int main() {
    calcula();
    for (int i = 0; i < 3; i++) {
        int quadrado = i * i;   // local do bloco do for
    }
    printf("%d\n", quadrado);    // ERRO: quadrado morreu no fim do for
    printf("%d\n", resultado);   // ERRO: resultado pertence a calcula()
    return 0;
}
` },
  { id: 'arq-escrita', mod: 'arq', title: 'Gravar arquivo com fprintf ("w")', code: String.raw`#include <stdio.h>

int main() {
    FILE *fp;
    fp = fopen("notas.txt", "w");   // "w" cria OU ZERA o arquivo

    if (fp == NULL) {               // sempre valide o ponteiro!
        printf("Erro ao abrir o arquivo!\n");
        return 1;
    }

    char *nomes[3] = {"Ana", "Bruno", "Carla"};
    float notas[3] = {8.5, 6.0, 9.25};

    for (int i = 0; i < 3; i++) {
        fprintf(fp, "%s;%.2f\n", nomes[i], notas[i]);
    }

    fclose(fp);                     // libera o recurso e grava tudo
    printf("notas.txt gravado! Clique nele no painel Diretorio Local.\n");
    return 0;
}
` },
  { id: 'arq-leitura', mod: 'arq', title: 'Ler arquivo com fgets e sizeof(buffer)', code: String.raw`#include <stdio.h>

int main() {
    FILE *fp = fopen("notas.txt", "r");
    char buffer[32];
    int linha = 1;

    if (fp == NULL) {
        printf("Arquivo nao encontrado. Rode o exemplo de escrita antes!\n");
        return 1;
    }

    // fgets le no maximo sizeof(buffer)-1 caracteres por vez
    while (fgets(buffer, sizeof(buffer), fp) != NULL) {
        printf("Linha %d: %s", linha, buffer);
        linha++;
    }

    fclose(fp);
    printf("Total de linhas: %d\n", linha - 1);
    return 0;
}
` },
  { id: 'arq-append', mod: 'arq', title: 'Modo "a": acrescentar ao final (log)', code: String.raw`#include <stdio.h>

int main() {
    FILE *log = fopen("log.txt", "a");   // "a" NAO apaga: acrescenta
    if (log == NULL) {
        printf("Falha ao abrir log.txt\n");
        return 1;
    }
    int execucao = 1;
    fprintf(log, "Programa executado - registro %d\n", execucao);
    fclose(log);

    printf("Rode varias vezes e veja log.txt crescer!\n");
    return 0;
}
` },
];

/* Desafios com autocorreção: check(out, fs, src) -> [ok, mensagem] */
const CHALLENGES = [
  { id: 'd-fund', mod: 'fund', title: 'Média com cast correto', goal: 'Faça o programa imprimir exatamente "Media = 7.50" corrigindo a divisão inteira.',
    code: String.raw`#include <stdio.h>

int main() {
    int soma = 15, qtd = 2;
    float media = soma / qtd;   // BUG: divisao inteira!
    printf("Media = %.2f\n", media);
    return 0;
}
`, check: (out) => [/Media = 7\.50/.test(out), 'Esperado na saída: "Media = 7.50"'] },
  { id: 'd-ptr', mod: 'ptr', title: 'Zerar via ponteiro', goal: 'Implemente zera(int *n) para que, após a chamada, x valha 0. Use derreferência.',
    code: String.raw`#include <stdio.h>

void zera(int *n) {
    // escreva aqui
}

int main() {
    int x = 42;
    zera(&x);
    printf("x = %d\n", x);
    return 0;
}
`, check: (out, fs, src) => [/x = 0\b/.test(out) && /\*\s*n\s*=/.test(src), 'Esperado "x = 0" usando *n = ...'] },
  { id: 'd-vet', mod: 'vet', title: 'Soma com aritmética de ponteiros', goal: 'Some os elementos usando *(v + i) (sem colchetes no laço) e imprima "Soma = 150".',
    code: String.raw`#include <stdio.h>

int main() {
    int v[5] = {10, 20, 30, 40, 50};
    int soma = 0;
    for (int i = 0; i < 5; i++) {
        // some usando *(v + i)
    }
    printf("Soma = %d\n", soma);
    return 0;
}
`, check: (out, fs, src) => [/Soma = 150\b/.test(out) && /\*\s*\(\s*v\s*\+\s*i\s*\)/.test(src), 'Esperado "Soma = 150" usando *(v + i)'] },
  { id: 'd-esc', mod: 'esc', title: 'Corrija o erro de escopo', goal: 'O código não compila. Mova a declaração de total para que o programa imprima "total = 10".',
    code: String.raw`#include <stdio.h>

int main() {
    for (int i = 1; i <= 4; i++) {
        int total = 0;
        total += i;
    }
    printf("total = %d\n", total);
    return 0;
}
`, check: (out) => [/total = 10\b/.test(out), 'Esperado "total = 10"'] },
  { id: 'd-arq', mod: 'arq', title: 'Tabuada em arquivo', goal: 'Grave em "tabuada.txt" as 10 linhas da tabuada do 7 no formato "7 x 1 = 7" ... "7 x 10 = 70".',
    code: String.raw`#include <stdio.h>

int main() {
    FILE *fp = fopen("tabuada.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    // use um for e fprintf aqui

    fclose(fp);
    return 0;
}
`, check: (out, fs) => {
      const c = (fs['tabuada.txt'] || '').trim().split('\n');
      const ok = c.length === 10 && c.every((l, i) => l.trim() === `7 x ${i + 1} = ${7 * (i + 1)}`);
      return [ok, 'tabuada.txt deve conter 10 linhas "7 x i = r"'];
    } },
];

/* Conteúdo das modais: dicas, comparação visual e mini-desafio */
const MODAL_CONTENT = {
  fund: {
    tips: [['Divisão entre dois <code>int</code> descarta a parte decimal: <code>7/2 == 3</code>.', 'divint'], ['Para média real, faça cast de um operando: <code>(float) soma / n</code>.', 'cast'], ['<code>x++</code> devolve o valor antigo; <code>++x</code> devolve o novo.', 'incremento'], ['No <code>scanf</code>, variáveis comuns precisam de <code>&amp;</code>; vetores de char (strings) não.', 'scanf'], ['<code>%d</code> int · <code>%f</code> float/double · <code>%c</code> char · <code>%s</code> string · <code>%p</code> endereço.', 'formato']],
    compare: { left: { title: 'int / int', code: 'int a = 7, b = 2;\nfloat r = a / b;\n// r == 3.00', note: 'Divisão inteira acontece ANTES da atribuição.' }, right: { title: '(float) int / int', code: 'int a = 7, b = 2;\nfloat r = (float)a / b;\n// r == 3.50', note: 'Cast promove a operação para ponto flutuante.' } },
    mini: { q: 'Qual a saída de: <code>int x = 3; int y = x++ + 2; printf("%d %d", x, y);</code>', opts: ['3 5', '4 5', '4 6', '3 6'], ans: 1, exp: 'x++ usa 3 na soma (y = 3 + 2 = 5) e só depois incrementa x para 4.' },
    example: 'fund-op' },
  ptr: {
    tips: [['Ponteiro é uma variável que guarda um <b>endereço</b>.', 'ponteiro'], ['<code>&amp;x</code> → endereço de x. <code>*p</code> → conteúdo do endereço guardado em p.', 'enderecoderef'], ['Na declaração, <code>*</code> indica tipo ponteiro; numa expressão, <code>*</code> derreferencia.', 'doisasteriscos'], ['Para uma função alterar a variável da main, passe o endereço: <code>f(&amp;x)</code> e use <code>*param</code>.', 'referencia'], ['Ponteiro não inicializado aponta para lixo → <i>segmentation fault</i>.', 'segfault']],
    compare: { left: { title: 'A caixa (variável)', code: 'int x = 10;\n// [ x | 10 ] @ 0x7ffd4a3c', note: 'Guarda o VALOR diretamente.' }, right: { title: 'O bilhete (ponteiro)', code: 'int *p = &x;\n// [ p | 0x7ffd4a3c ] ──► x', note: 'Guarda o ENDEREÇO de x. *p = 25 altera x.' } },
    mini: { q: 'Após <code>int a = 5; int *p = &a; *p = *p + 3;</code> quanto vale <code>a</code>?', opts: ['5', '8', 'O endereço de a + 3', 'Erro de compilação'], ans: 1, exp: '*p é o próprio a. *p = *p + 3 equivale a a = a + 3 → 8.' },
    example: 'ptr-ref' },
  vet: {
    tips: [['O nome do vetor é o endereço do primeiro elemento: <code>v == &amp;v[0]</code>.', 'nomevetor'], ['<code>v[i]</code> é exatamente <code>*(v + i)</code>.', 'indice'], ['<code>p + 1</code> avança <code>sizeof(*p)</code> bytes (4 para int).', 'aritmetica'], ['Vetor passado a função vira ponteiro: <code>sizeof</code> dentro da função dá 8, não o tamanho do vetor.', 'decay'], ['Índices válidos: <code>0</code> a <code>n-1</code>. Fora disso: comportamento indefinido.', 'limites']],
    compare: { left: { title: 'Notação de índice', code: 'for (i = 0; i < n; i++)\n    soma += v[i];', note: 'Mais legível.' }, right: { title: 'Aritmética de ponteiros', code: 'for (i = 0; i < n; i++)\n    soma += *(v + i);', note: 'Mesma coisa! O compilador traduz v[i] para isto.' } },
    mini: { q: 'Com <code>int v[] = {4, 8, 15, 16};</code> o que vale <code>*(v + 2)</code>?', opts: ['6', '8', '15', 'endereço de v[2]'], ans: 2, exp: '*(v + 2) ≡ v[2] = 15. Os índices começam em 0.' },
    example: 'vet-arit' },
  esc: {
    tips: [['Variável local existe só dentro do bloco <code>{ }</code> onde foi declarada.', 'escopo'], ['Ao sair do bloco/função, a local é destruída (a pilha é liberada).', 'pilha'], ['Global: declarada fora de funções, vive o programa inteiro e começa com 0.', 'global'], ['Local não inicializada contém <b>lixo</b> de memória.', 'lixo'], ['Shadowing: uma local com o mesmo nome esconde a global/externa naquele bloco.', 'shadowing']],
    compare: { left: { title: 'Global', code: 'int total = 0;  // fora de funções\nvoid soma() { total++; }', note: 'Visível em todas as funções. Inicia com 0.' }, right: { title: 'Local', code: 'void soma() {\n    int total = 0;  // nasce aqui\n    total++;\n}  // morre aqui', note: 'Recriada a cada chamada.' } },
    mini: { q: 'Com <code>int x = 1;</code> global e, na main, <code>int x = 2; { int x = 3; } printf("%d", x);</code> — o que imprime?', opts: ['1', '2', '3', 'Erro de compilação'], ans: 1, exp: 'O x = 3 morreu ao fechar o bloco. O x visível na main é o local (2), que sombreia o global.' },
    example: 'esc-shadow' },
  arq: {
    tips: [['<code>"w"</code> cria ou <b>apaga</b> o conteúdo; <code>"a"</code> acrescenta; <code>"r"</code> só lê (falha se não existir).', 'modos'], ['Sempre teste <code>if (fp == NULL)</code> logo após o <code>fopen</code>.', 'nullcheck'], ['<code>fgets(buf, sizeof(buf), fp)</code> lê até <code>sizeof-1</code> caracteres e mantém o <code>\\n</code>.', 'fgets'], ['<code>fgets</code> devolve <code>NULL</code> no fim do arquivo — use isso como condição do while.', 'fimarquivo'], ['Feche com <code>fclose(fp)</code> para liberar o recurso do SO.', 'fclose']],
    compare: { left: { title: 'Modo "w"', code: 'fp = fopen("a.txt", "w");\n// conteúdo anterior APAGADO', note: 'Ideal para gerar um arquivo novo.' }, right: { title: 'Modo "a"', code: 'fp = fopen("a.txt", "a");\n// escreve no FINAL', note: 'Ideal para logs/históricos.' } },
    mini: { q: 'O que <code>fopen("dados.txt", "r")</code> retorna se o arquivo não existir?', opts: ['Um arquivo vazio', 'NULL', '0x1', 'Encerra o programa'], ans: 1, exp: 'Em modo "r" o arquivo precisa existir; se não existir, fopen retorna NULL — por isso validamos fp.' },
    example: 'arq-escrita' },
};

/* Banco de questões: cada alternativa tem sua própria explicação */
const QUESTIONS = [
  // ---- Fundamentos
  { mod: 'fund', q: 'Qual o valor de <code>r</code> após <code>int a = 9, b = 2; float r = a / b;</code>?', o: [
    ['4.5', 'Seria o caso com cast: (float)a / b. Aqui ambos são int.'],
    ['4.0', 'Correto: 9/2 entre inteiros dá 4; depois é convertido para 4.0.', true],
    ['5.0', 'Divisão inteira trunca (descarta a parte decimal), não arredonda.'],
    ['Erro de compilação', 'É válido: o int resultante é convertido implicitamente para float.']] },
  { mod: 'fund', q: 'Qual a saída de <code>printf("%d", 17 % 5);</code>?', o: [
    ['3', 'Isso seria 17/5 (divisão inteira).'],
    ['2', 'Correto: % devolve o resto. 17 = 5·3 + 2.', true],
    ['3.4', '% trabalha apenas com inteiros e devolve o resto.'],
    ['0', '17 não é múltiplo de 5, então o resto não é zero.']] },
  { mod: 'fund', q: 'Após <code>int i = 5; int j = ++i * 2;</code>, quais os valores de i e j?', o: [
    ['i=5, j=10', 'O ++ altera i de qualquer forma.'],
    ['i=6, j=10', 'Isso aconteceria com pós-incremento (i++).'],
    ['i=6, j=12', 'Correto: pré-incremento soma primeiro (i=6) e usa 6 na conta.', true],
    ['i=5, j=12', 'Se j usou 6, então i foi incrementado.']] },
  { mod: 'fund', q: 'Por que <code>scanf("%d", idade);</code> (sem &) é um erro?', o: [
    ['scanf não aceita int', 'scanf lê int com %d normalmente.'],
    ['scanf precisa do endereço para gravar o valor; sem & ele recebe o valor (lixo) e tenta escrever nele', 'Correto: passagem por referência — scanf precisa saber ONDE gravar.', true],
    ['Falta o \\n no formato', 'O \\n não é necessário no scanf.'],
    ['Não é erro, & é opcional', 'Para variáveis comuns o & é obrigatório (exceto strings/vetores).']] },
  { mod: 'fund', q: 'Em uma arquitetura típica de 64 bits, qual é o <code>sizeof(char)</code>?', o: [
    ['1', 'Correto: char sempre ocupa 1 byte, por definição do padrão C.', true],
    ['2', 'Seria um short em arquiteturas comuns.'],
    ['4', 'Esse é o tamanho típico de int/float.'],
    ['8', 'Esse é o tamanho de double e de ponteiros em 64 bits.']] },
  { mod: 'fund', q: 'O que imprime <code>printf("%.1f", (float)7 / 2);</code>?', o: [
    ['3', '%.1f imprime com 1 casa decimal.'],
    ['3.0', 'O cast acontece antes: 7.0/2 = 3.5.'],
    ['3.5', 'Correto: (float)7 vira 7.0 e a divisão passa a ser real.', true],
    ['4.0', 'Não há arredondamento para inteiro aqui.']] },
  // ---- Ponteiros
  { mod: 'ptr', q: 'Dado <code>int x = 10; int *p = &x;</code>, o que é <code>p</code>?', o: [
    ['O valor 10', 'O valor 10 é obtido com *p (derreferência).'],
    ['O endereço de memória de x', 'Correto: p guarda &x, o endereço onde x está.', true],
    ['Uma cópia de x', 'Ponteiro não copia o valor; ele aponta para o original.'],
    ['O endereço de p', 'O endereço do próprio p seria &p.']] },
  { mod: 'ptr', q: 'Após <code>int a = 3, b = 7; int *p = &a; p = &b; *p = 0;</code>, quais os valores?', o: [
    ['a=0, b=7', 'p foi redirecionado para b antes de *p = 0.'],
    ['a=3, b=0', 'Correto: p passou a apontar para b; *p = 0 zera b.', true],
    ['a=0, b=0', '*p altera somente a variável apontada no momento.'],
    ['a=3, b=7', '*p = 0 altera o conteúdo de quem p aponta (b).']] },
  { mod: 'ptr', q: 'Qual função consegue alterar a variável <code>n</code> da main?', code: 'void f1(int x) { x = 0; }\nvoid f2(int *x) { *x = 0; }\nvoid f3(int *x) { x = 0; }', o: [
    ['f1(n)', 'f1 recebe uma cópia; a alteração some ao final da função.'],
    ['f2(&n)', 'Correto: f2 recebe o endereço e altera o original via *x.', true],
    ['f3(&n)', 'f3 zera o PONTEIRO local (vira NULL), não o valor apontado.'],
    ['Nenhuma', 'f2 altera, pois usa derreferência.']] },
  { mod: 'ptr', q: 'O que acontece em <code>int *p; *p = 5;</code>?', o: [
    ['p passa a valer 5', '*p = 5 tenta escrever no endereço que p guarda, não em p.'],
    ['Comportamento indefinido: p não foi inicializado e aponta para lixo', 'Correto: ponteiro "selvagem" — pode causar segmentation fault.', true],
    ['Erro de compilação', 'Compila (talvez com aviso); o problema ocorre em tempo de execução.'],
    ['p aponta para NULL automaticamente', 'Locais não são inicializadas automaticamente em C.']] },
  { mod: 'ptr', q: 'Com <code>int x = 4; int *p = &x; int **pp = &p;</code>, qual expressão vale 4?', o: [
    ['*pp', '*pp é o conteúdo de pp, ou seja, p (um endereço).'],
    ['**pp', 'Correto: **pp → *p → x = 4.', true],
    ['&pp', '&pp é o endereço do próprio pp.'],
    ['pp', 'pp guarda o endereço de p.']] },
  { mod: 'ptr', q: 'Na função <code>void troca(int *a, int *b)</code>, qual a chamada correta para trocar x e y?', o: [
    ['troca(x, y);', 'Passa valores int onde a função espera endereços.'],
    ['troca(*x, *y);', 'x e y não são ponteiros; *x é inválido.'],
    ['troca(&x, &y);', 'Correto: passa os endereços para que a função altere os originais.', true],
    ['troca(&&x, &&y);', '&& é o operador lógico E, não endereço duplo.']] },
  // ---- Vetores
  { mod: 'vet', q: 'Para <code>int v[5];</code>, a expressão <code>*(v + 3)</code> equivale a:', o: [
    ['v[3]', 'Correto: v[i] é definido como *(v + i).', true],
    ['v + 3', 'v + 3 é o endereço de v[3], não o valor.'],
    ['*v + 3', 'Isso é v[0] + 3 (precedência: * antes do +).'],
    ['v[4]', 'Índices começam em 0: o deslocamento 3 é v[3].']] },
  { mod: 'vet', q: 'Se <code>int *p = v;</code> e v começa em 0x1000, qual o endereço de <code>p + 2</code>?', o: [
    ['0x1002', 'Isso seria verdade para char (1 byte).'],
    ['0x1008', 'Correto: avança 2 × sizeof(int) = 8 bytes.', true],
    ['0x1004', 'Seria p + 1.'],
    ['0x1010', 'Seria p + 4.']] },
  { mod: 'vet', q: 'Com <code>int v[10];</code> em main, quanto vale <code>sizeof(v) / sizeof(v[0])</code>?', o: [
    ['40', 'sizeof(v) sozinho dá 40 bytes.'],
    ['10', 'Correto: 40 bytes ÷ 4 bytes por elemento = 10 elementos.', true],
    ['4', 'Esse é sizeof(v[0]).'],
    ['2', 'Seria o caso se v tivesse decaído para ponteiro (8/4) dentro de uma função.']] },
  { mod: 'vet', q: 'Qual inicialização está correta para buscar o MENOR valor de v (n > 0)?', o: [
    ['menor = 0;', 'Falha se todos os valores forem positivos (0 nunca é substituído).'],
    ['menor = v[0];', 'Correto: começa com um elemento real e compara a partir de v[1].', true],
    ['menor = v[n];', 'v[n] está fora dos limites.'],
    ['menor = n;', 'n é a quantidade, não um elemento.']] },
  { mod: 'vet', q: 'No algoritmo de inversão com <code>ini</code> e <code>fim</code>, qual a condição do laço?', o: [
    ['while (ini != NULL)', 'ini nunca vira NULL nesse algoritmo.'],
    ['while (ini < fim)', 'Correto: para quando os ponteiros se encontram no meio.', true],
    ['while (ini <= n)', 'Compara ponteiro com inteiro — sem sentido.'],
    ['while (*ini < *fim)', 'Compara os VALORES, e não as posições.']] },
  { mod: 'vet', q: 'Em <code>void f(int v[])</code>, o parâmetro v é na verdade:', o: [
    ['Uma cópia do vetor inteiro', 'C nunca copia vetores na passagem de parâmetro.'],
    ['Um ponteiro int* para o primeiro elemento', 'Correto: o vetor "decai" para ponteiro; alterações afetam o original.', true],
    ['Um vetor de tamanho fixo', 'O tamanho se perde; por isso passamos n separadamente.'],
    ['Uma referência C++', 'C não tem referências como C++.']] },
  // ---- Escopo
  { mod: 'esc', q: 'O que acontece ao compilar?', code: 'int main() {\n    if (1) {\n        int y = 5;\n    }\n    printf("%d", y);\n}', o: [
    ['Imprime 5', 'y deixou de existir ao fechar o bloco do if.'],
    ['Imprime lixo', 'Nem chega a executar: o compilador recusa.'],
    ["Erro: 'y' não foi declarado neste escopo", 'Correto: y é local do bloco do if.', true],
    ['Imprime 0', 'y não é visível fora do bloco.']] },
  { mod: 'esc', q: 'Uma variável global <code>int g;</code> sem inicialização vale:', o: [
    ['Lixo de memória', 'Isso vale para locais, não para globais.'],
    ['0', 'Correto: variáveis globais (e static) são zeradas automaticamente.', true],
    ['-1', 'Não existe essa convenção.'],
    ['Erro de compilação', 'É válido declarar sem inicializar.']] },
  { mod: 'esc', q: 'Com <code>int x = 10;</code> global e <code>void f() { int x = 3; x++; }</code>, após chamar f() quanto vale o x global?', o: [
    ['4', 'Esse é o x local, que morre ao final de f.'],
    ['10', 'Correto: o x local sombreia o global; o global não é tocado.', true],
    ['11', 'O x++ foi aplicado ao local.'],
    ['3', 'Esse é o valor inicial do local.']] },
  { mod: 'esc', q: 'Qual é o tempo de vida de uma variável local (não static)?', o: [
    ['Todo o programa', 'Isso descreve globais e static.'],
    ['Do ponto da declaração até o fim do bloco onde foi declarada', 'Correto: é alocada na pilha e liberada ao sair do bloco.', true],
    ['Até o próximo free()', 'free() é para memória do heap (malloc).'],
    ['Até a próxima chamada de função', 'Chamadas de outras funções não destroem as locais de quem chamou.']] },
  { mod: 'esc', q: 'Por que é perigoso retornar o endereço de uma variável local (<code>return &local;</code>)?', o: [
    ['Não compila', 'Compila (com aviso).'],
    ['A variável é destruída ao final da função; o ponteiro fica "pendurado" (dangling)', 'Correto: a área de pilha pode ser reutilizada a qualquer momento.', true],
    ['Retorna sempre NULL', 'Retorna um endereço, mas que já não é válido.'],
    ['Não há perigo', 'É um erro clássico de comportamento indefinido.']] },
  { mod: 'esc', q: 'O <code>i</code> declarado em <code>for (int i = 0; i < 3; i++)</code> pode ser usado após o laço?', o: [
    ['Sim, vale 3', 'Isso vale apenas se i fosse declarado ANTES do for.'],
    ['Não: o escopo de i é o próprio for', 'Correto: (C99) i existe só dentro do for.', true],
    ['Sim, vale 2', 'Ele nem é visível fora do laço.'],
    ['Sim, vale 0', 'Ele nem é visível fora do laço.']] },
  // ---- Arquivos
  { mod: 'arq', q: 'Qual modo de <code>fopen</code> apaga o conteúdo existente do arquivo?', o: [
    ['"r"', '"r" apenas lê e exige que o arquivo exista.'],
    ['"a"', '"a" acrescenta ao final, preservando o conteúdo.'],
    ['"w"', 'Correto: "w" cria o arquivo ou o trunca (zera) se já existir.', true],
    ['"r+"', '"r+" lê/escreve sem truncar.']] },
  { mod: 'arq', q: 'Qual o laço de leitura linha a linha mais seguro?', o: [
    ['while (!feof(fp)) { fgets(buf, 100, fp); ... }', 'Clássico bug: feof só fica verdadeiro APÓS uma leitura falhar — a última linha é processada duas vezes.'],
    ['while (fgets(buf, sizeof(buf), fp) != NULL) { ... }', 'Correto: para exatamente quando não há mais o que ler e respeita o tamanho do buffer.', true],
    ['while (fp != NULL) { fgets(buf, sizeof(buf), fp); }', 'fp continua não-nulo no fim do arquivo: laço infinito.'],
    ['for (;;) fgets(buf, sizeof(buf), fp);', 'Não tem condição de parada.']] },
  { mod: 'arq', q: 'Com <code>char buffer[10];</code>, quantos caracteres úteis <code>fgets(buffer, sizeof(buffer), fp)</code> lê no máximo?', o: [
    ['10', 'Um byte é reservado para o \\0.'],
    ['9', 'Correto: lê até sizeof-1 = 9 e acrescenta o terminador \\0.', true],
    ['11', 'Ultrapassaria o buffer.'],
    ['Até o fim da linha, sem limite', 'O limite é justamente o 2º argumento — por isso é seguro.']] },
  { mod: 'arq', q: 'Por que testar <code>if (fp == NULL)</code> após o fopen?', o: [
    ['Por estilo apenas', 'Sem o teste, usar fp NULL causa falha de segmentação.'],
    ['fopen retorna NULL quando falha (arquivo inexistente em "r", sem permissão etc.)', 'Correto: usar um FILE* NULL em fprintf/fgets derruba o programa.', true],
    ['Para fechar o arquivo', 'Quem fecha é o fclose.'],
    ['Para saber se o arquivo está vazio', 'Arquivo vazio ainda retorna um ponteiro válido.']] },
  { mod: 'arq', q: 'Qual função grava texto formatado em um arquivo?', o: [
    ['printf', 'printf escreve na saída padrão (tela).'],
    ['fprintf', 'Correto: fprintf(fp, "formato", ...) é o printf para arquivos.', true],
    ['fgets', 'fgets LÊ uma linha.'],
    ['fopen', 'fopen apenas abre o arquivo.']] },
  { mod: 'arq', q: 'O que acontece se esquecermos <code>fclose(fp)</code>?', o: [
    ['Erro de compilação', 'O compilador não verifica isso.'],
    ['O recurso do SO fica preso e dados em buffer podem não ser gravados', 'Correto: fclose descarrega o buffer e libera o descritor.', true],
    ['O arquivo é apagado', 'O arquivo não é apagado.'],
    ['Nada, nunca faz diferença', 'Em programas maiores pode esgotar descritores e perder dados.']] },
];

/* =====================================================================
 *  GLOSSÁRIO DE CONCEITOS — aberto pela 💡 de cada dica
 *  Campos: mod, title, resumo (html), analogia, code, saida, table {head, rows}, prova (pegadinha), ex (exemplo do lab)
 * ===================================================================== */
const GLOSSARY = {
  /* ---------- Módulo I ---------- */
  formato: { mod: 'fund', title: 'Especificadores de formato (%d, %f, %c, %s, %p)',
    resumo: 'São marcadores dentro da string do <code>printf</code>/<code>scanf</code> que dizem <b>qual tipo de dado</b> vai ocupar aquele lugar e <b>como</b> ele deve ser exibido ou lido. Cada <code>%</code> consome um argumento, na ordem.',
    analogia: 'Pense em um formulário com campos rotulados: "Nome: ___  Idade: ___". O <code>%s</code> e o <code>%d</code> são os rótulos que dizem que tipo de informação cabe em cada espaço.',
    table: { head: ['Especificador', 'Tipo', 'Exemplo', 'Saída'], rows: [
      ['%d / %i', 'int', 'printf("%d", 42);', '42'],
      ['%f', 'float / double', 'printf("%f", 3.14);', '3.140000'],
      ['%.2f', 'float com 2 casas', 'printf("%.2f", 3.14159);', '3.14'],
      ['%c', 'char', "printf(\"%c\", 'A');", 'A'],
      ['%s', 'string (char*)', 'printf("%s", "Maria");', 'Maria'],
      ['%p', 'endereço (ponteiro)', 'printf("%p", &x);', '0x7ffd4a3c'],
      ['%lf', 'double no scanf', 'scanf("%lf", &d);', '—'],
      ['%5d', 'largura mínima 5', 'printf("[%5d]", 42);', '[   42]'],
      ['%%', 'o próprio símbolo %', 'printf("50%%");', '50%'] ] },
    code: String.raw`int idade = 20;
float altura = 1.75;
char inicial = 'M';
char nome[] = "Maria";
printf("%s (%c) tem %d anos e %.2f m\n", nome, inicial, idade, altura);`,
    saida: 'Maria (M) tem 20 anos e 1.75 m',
    prova: 'Usar <code>%d</code> com um <code>float</code> (ou <code>%f</code> com um <code>int</code>) não converte o valor: imprime lixo. O tipo do especificador precisa casar com o tipo da variável.', ex: 'fund-op' },
  divint: { mod: 'fund', title: 'Divisão inteira', resumo: 'Quando os <b>dois</b> operandos de <code>/</code> são inteiros, o C faz divisão inteira: o resultado é truncado (a parte decimal é descartada, sem arredondar). O operador <code>%</code> devolve o resto dessa divisão.',
    analogia: 'Dividir 7 balas entre 2 crianças: cada uma recebe 3 balas inteiras (<code>7/2</code>) e sobra 1 (<code>7%2</code>). Ninguém recebe "meia bala".',
    table: { head: ['Expressão', 'Resultado', 'Por quê'], rows: [['7 / 2', '3', 'int / int → trunca'], ['7 % 2', '1', 'resto'], ['7.0 / 2', '3.5', 'um operando é double'], ['-7 / 2', '-3', 'trunca em direção a zero']] },
    code: String.raw`int a = 7, b = 2;
float r = a / b;     // 3.00 — a divisão já aconteceu entre ints!
printf("%.2f\n", r);`, saida: '3.00',
    prova: 'Atribuir o resultado a um <code>float</code> <b>não</b> salva a conta: <code>float r = 7/2;</code> dá 3.0, porque a divisão inteira acontece antes da atribuição.', ex: 'fund-op' },
  cast: { mod: 'fund', title: 'Cast (conversão explícita de tipo)', resumo: 'Cast é escrever o tipo entre parênteses antes de um valor — <code>(float) x</code> — para convertê-lo naquele ponto da expressão. Converter <b>um</b> operando já basta para a operação inteira virar de ponto flutuante.',
    analogia: 'É como trocar a régua antes de medir: se você converte para "régua com milímetros" antes da conta, não perde a precisão; se converte depois, os milímetros já foram jogados fora.',
    table: { head: ['Expressão', 'Resultado'], rows: [['(float) 7 / 2', '3.5 ✓ cast antes'], ['(float) (7 / 2)', '3.0 ✗ cast depois'], ['(int) 3.99', '3 (trunca)']] },
    code: String.raw`int soma = 15, qtd = 2;
float media = (float) soma / qtd;
printf("%.2f\n", media);`, saida: '7.50',
    prova: 'A posição dos parênteses muda tudo: <code>(float)(soma/qtd)</code> converte um resultado que já foi truncado.', ex: 'fund-op' },
  incremento: { mod: 'fund', title: 'Pré e pós-incremento (++x e x++)', resumo: 'Os dois somam 1 à variável. A diferença é o <b>valor que a expressão devolve</b>: <code>x++</code> (pós) devolve o valor antigo e depois incrementa; <code>++x</code> (pré) incrementa primeiro e devolve o novo.',
    analogia: '<code>x++</code> = "me mostre o número da senha e depois chame a próxima". <code>++x</code> = "chame a próxima e me mostre o número novo".',
    table: { head: ['Código (x começa em 5)', 'y', 'x depois'], rows: [['y = x++;', '5', '6'], ['y = ++x;', '6', '6'], ['y = x-- ;', '5', '4']] },
    code: String.raw`int x = 5;
int y = x++;   // y recebe 5, x vira 6
int z = ++x;   // x vira 7, z recebe 7
printf("%d %d %d\n", x, y, z);`, saida: '7 5 7',
    prova: 'Sozinho numa linha (<code>x++;</code> ou <code>++x;</code>) não há diferença. Ela só aparece quando o valor é usado na mesma expressão.', ex: 'fund-op' },
  scanf: { mod: 'fund', title: 'scanf e o operador &', resumo: '<code>scanf</code> precisa saber <b>onde</b> gravar o que o usuário digitou, então recebe o <b>endereço</b> da variável (<code>&amp;idade</code>). Um vetor de <code>char</code> já é um endereço (o nome do vetor aponta para o 1º elemento), por isso <code>scanf("%s", nome)</code> vai sem <code>&amp;</code>.',
    analogia: 'Para alguém entregar uma encomenda na sua casa, você passa o <b>endereço</b>, não uma foto da casa. O <code>&amp;</code> é o endereço da variável.',
    table: { head: ['Variável', 'Chamada correta'], rows: [['int idade;', 'scanf("%d", &idade);'], ['float nota;', 'scanf("%f", &nota);'], ['double d;', 'scanf("%lf", &d);'], ['char nome[20];', 'scanf("%s", nome);  (sem &)']] },
    code: String.raw`int idade;
char nome[20];
scanf("%d %s", &idade, nome);`,
    prova: 'Esquecer o <code>&amp;</code> compila (com aviso), mas o scanf usa o valor-lixo da variável como endereço → <i>segmentation fault</i>. No lab, use o campo <b>stdin</b> para testar.', ex: 'fund-scanf' },

  /* ---------- Módulo II ---------- */
  ponteiro: { mod: 'ptr', title: 'O que é um ponteiro', resumo: 'Ponteiro é uma variável comum cujo <b>valor é um endereço de memória</b>. O tipo (<code>int *</code>, <code>char *</code>) diz o que existe naquele endereço — e, por isso, quantos bytes ler e quanto andar na aritmética.',
    analogia: 'A variável é uma <b>caixa</b> com um valor dentro. O ponteiro é um <b>bilhete</b> com o endereço da caixa escrito nele. O bilhete não contém o valor — ele diz onde encontrá-lo.',
    table: { head: ['Declaração', 'Guarda'], rows: [['int x = 10;', 'o valor 10'], ['int *p = &x;', 'o endereço de x (ex.: 0x7ffd4a3c)'], ['int **pp = &p;', 'o endereço de p']] },
    code: String.raw`int x = 10;
int *p = &x;
printf("%p %d\n", p, *p);`, saida: '0x7ffd4a3c 10',
    prova: 'Todo ponteiro ocupa o mesmo tamanho (8 bytes em 64 bits), seja <code>char*</code> ou <code>double*</code>. O que muda é o tipo apontado.', ex: 'ptr-basico' },
  enderecoderef: { mod: 'ptr', title: '& (endereço) e * (derreferência)', resumo: 'São operadores opostos. <code>&amp;x</code> pergunta "<b>onde</b> está x?" e devolve o endereço. <code>*p</code> diz "<b>vá até</b> o endereço guardado em p" e acessa o valor de lá — tanto para ler quanto para escrever.',
    analogia: '<code>&amp;</code> = pegar o endereço da casa. <code>*</code> = ir até a casa e abrir a porta. <code>*p = 25</code> é entrar na casa e trocar o que está lá dentro.',
    table: { head: ['Expressão', 'Significa', 'Valor (x=10 em 0x7ffd4a3c)'], rows: [['x', 'o valor de x', '10'], ['&x', 'endereço de x', '0x7ffd4a3c'], ['p', 'o que p guarda', '0x7ffd4a3c'], ['*p', 'valor no endereço de p', '10'], ['*&x', 'cancela: é x', '10']] },
    code: String.raw`int x = 10;
int *p = &x;
*p = 25;            // altera x através de p
printf("%d\n", x);`, saida: '25',
    prova: '<code>*</code> e <code>&amp;</code> se anulam: <code>*&amp;x</code> é o próprio <code>x</code>. Observe o painel "Ponteiros em ação" no modo Passo a Passo.', ex: 'ptr-basico' },
  doisasteriscos: { mod: 'ptr', title: 'Os dois papéis do *', resumo: 'O mesmo símbolo tem dois significados conforme o lugar. Na <b>declaração</b>, <code>int *p</code> diz que p é "ponteiro para int". Numa <b>expressão</b>, <code>*p</code> derreferencia. E entre dois valores, <code>a * b</code> é multiplicação.',
    analogia: 'É como a palavra "manga": fruta ou parte da camisa — o contexto da frase decide.',
    table: { head: ['Onde aparece', 'Papel'], rows: [['int *p;', 'declara ponteiro'], ['*p = 5;', 'derreferencia (acessa o valor)'], ['y = *p * 2;', '1º derreferencia, 2º multiplica'], ['void f(int *n)', 'parâmetro é ponteiro']] },
    code: String.raw`int x = 3;
int *p = &x;        // * de declaração
int y = *p * 2;     // * de derreferência e * de multiplicação
printf("%d\n", y);`, saida: '6',
    prova: 'Em <code>int *a, b;</code> só <code>a</code> é ponteiro; <code>b</code> é int. O <code>*</code> pertence ao nome, não ao tipo.', ex: 'ptr-basico' },
  referencia: { mod: 'ptr', title: 'Passagem por valor x por referência', resumo: 'Em C, argumentos são sempre <b>copiados</b> para a função (por valor). Para que a função altere a variável original, passamos uma cópia do seu <b>endereço</b>; dentro da função, <code>*param</code> chega à variável da main. Isso é chamado de passagem "por referência".',
    analogia: 'Por valor: você entrega uma <b>fotocópia</b> do documento — rabiscar a cópia não muda o original. Por referência: você entrega o <b>endereço da gaveta</b> onde está o original.',
    table: { head: ['Função', 'Chamada', 'Altera a main?'], rows: [['void f(int n)', 'f(x)', 'não — mexe na cópia'], ['void f(int *n)', 'f(&x)', 'sim — via *n'], ['void troca(int *a, int *b)', 'troca(&x, &y)', 'sim — troca os dois']] },
    code: String.raw`void dobra(int *n) {
    *n = *n * 2;
}
int main() {
    int x = 7;
    dobra(&x);
    printf("%d\n", x);
}`, saida: '14',
    prova: 'Dentro da função, <code>n = 0;</code> muda só a cópia do ponteiro; <code>*n = 0;</code> muda a variável original. É exatamente o que <code>scanf</code> faz com o <code>&amp;</code>.', ex: 'ptr-ref' },
  segfault: { mod: 'ptr', title: 'Ponteiro selvagem e segmentation fault', resumo: 'Um ponteiro local não inicializado contém <b>lixo</b>: um endereço aleatório. Derreferenciá-lo (ou derreferenciar <code>NULL</code>) acessa memória que não pertence ao programa, e o sistema operacional o encerra com <i>Segmentation fault</i>.',
    analogia: 'É seguir um bilhete com um endereço rabiscado ao acaso: você pode bater na casa de um estranho — e o SO chama a polícia.',
    table: { head: ['Situação', 'Resultado'], rows: [['int *p; *p = 5;', 'endereço aleatório → falha'], ['int *p = NULL; *p = 5;', 'acesso a 0x0 → falha'], ['int *p = &x; *p = 5;', 'correto']] },
    code: String.raw`int *p = NULL;      // boa prática: inicializar com NULL
if (p != NULL) {
    *p = 5;
}`,
    prova: 'Inicialize ponteiros com <code>NULL</code> ou com um endereço válido, e teste antes de usar. No lab, tente rodar <code>int *p; *p = 5;</code>.', ex: 'ptr-basico' },

  /* ---------- Módulo III ---------- */
  nomevetor: { mod: 'vet', title: 'O nome do vetor é um endereço', resumo: 'Em quase toda expressão, o nome de um vetor se converte no endereço do seu primeiro elemento: <code>v</code> vale o mesmo que <code>&amp;v[0]</code>. Por isso podemos fazer <code>int *p = v;</code> sem <code>&amp;</code>.',
    analogia: 'O nome de uma rua aponta para o início dela (o nº 0). Para chegar a outras casas, você anda a partir daí.',
    table: { head: ['Expressão', 'Valor'], rows: [['v', 'endereço de v[0]'], ['&v[0]', 'endereço de v[0]'], ['*v', 'v[0]'], ['sizeof(v)', 'tamanho TOTAL (na função onde foi declarado)']] },
    code: String.raw`int v[3] = {5, 6, 7};
int *p = v;          // sem &
printf("%d %d\n", *p, p == &v[0]);`, saida: '5 1',
    prova: 'Um vetor não pode receber outro com <code>=</code> (<code>v = w;</code> é erro). Copie elemento a elemento ou use <code>strcpy</code> para strings.', ex: 'vet-arit' },
  indice: { mod: 'vet', title: 'v[i] é o mesmo que *(v + i)', resumo: 'O operador de índice é só uma forma abreviada de aritmética de ponteiros: <code>v[i]</code> é <b>definido</b> como <code>*(v + i)</code>. As duas formas geram o mesmo acesso à memória.',
    analogia: '"Terceira casa da rua" e "ande 3 casas a partir do início e entre" são a mesma instrução.',
    table: { head: ['Índice', 'Ponteiro', 'Elemento'], rows: [['v[0]', '*v', '1º'], ['v[2]', '*(v + 2)', '3º'], ['&v[2]', 'v + 2', 'endereço do 3º']] },
    code: String.raw`int v[4] = {4, 8, 15, 16};
printf("%d %d\n", v[2], *(v + 2));`, saida: '15 15',
    prova: 'Cuidado com a precedência: <code>*v + 2</code> é <code>v[0] + 2</code>, enquanto <code>*(v + 2)</code> é <code>v[2]</code>.', ex: 'vet-arit' },
  aritmetica: { mod: 'vet', title: 'Aritmética de ponteiros', resumo: 'Somar 1 a um ponteiro avança <b>um elemento</b>, não um byte: o endereço aumenta <code>sizeof(*p)</code> bytes. Subtrair dois ponteiros do mesmo vetor dá a distância em elementos.',
    analogia: 'Andar "uma casa" numa rua de casas largas cobre mais metros do que numa rua de casas estreitas: o "passo" depende do tamanho de cada elemento.',
    table: { head: ['Tipo de p', 'p começa em', 'p + 1'], rows: [['char *', '0x1000', '0x1001'], ['int *', '0x1000', '0x1004'], ['double *', '0x1000', '0x1008']] },
    code: String.raw`int v[3] = {10, 20, 30};
int *p = v;
p++;                     // avança 4 bytes
printf("%d\n", *p);`, saida: '20',
    prova: 'No algoritmo de inversão, <code>ini++</code> e <code>fim--</code> andam elemento a elemento, e <code>ini &lt; fim</code> compara posições na memória.', ex: 'vet-inv' },
  decay: { mod: 'vet', title: 'Vetor como parâmetro (decaimento)', resumo: 'Ao passar um vetor para uma função, o C passa apenas o <b>endereço do primeiro elemento</b>. O parâmetro <code>int v[]</code> é, na prática, <code>int *v</code>: o tamanho se perde e a função altera o vetor original.',
    analogia: 'Você não manda o prédio inteiro pelo correio — manda o endereço dele. Quem recebe pode reformar o prédio original, mas não sabe quantos andares ele tem.',
    table: { head: ['Onde', 'sizeof(v) para int v[10]'], rows: [['na main (onde foi declarado)', '40'], ['dentro de void f(int v[])', '8 (tamanho de um ponteiro)']] },
    code: String.raw`void zera(int v[], int n) {   // n é obrigatório
    for (int i = 0; i < n; i++) v[i] = 0;
}`,
    prova: 'Por isso toda função que recebe vetor também recebe o tamanho (<code>int n</code>). Vetores são sempre "por referência".', ex: 'vet-inv' },
  limites: { mod: 'vet', title: 'Limites do vetor (0 a n-1)', resumo: 'Um vetor de <code>n</code> elementos tem índices de <code>0</code> a <code>n-1</code>. O C <b>não verifica</b> os limites: acessar <code>v[n]</code> lê ou sobrescreve outra região da memória — comportamento indefinido.',
    analogia: 'Uma estante com 5 prateleiras numeradas de 0 a 4. Pedir a prateleira 5 é enfiar a mão na estante do vizinho.',
    table: { head: ['int v[5]', 'Válido?'], rows: [['v[0]', '✓ primeiro'], ['v[4]', '✓ último'], ['v[5]', '✗ fora dos limites'], ['for (i = 0; i <= 5; i++)', '✗ erro clássico do <=']] },
    code: String.raw`int v[5] = {1, 2, 3, 4, 5};
for (int i = 0; i < 5; i++)    // < e não <=
    printf("%d ", v[i]);`, saida: '1 2 3 4 5',
    prova: 'O laço com <code>i &lt;= n</code> é o erro mais cobrado em prova. O simulador mostra um aviso quando você sai dos limites.', ex: 'vet-arit' },

  /* ---------- Módulo IV ---------- */
  escopo: { mod: 'esc', title: 'Escopo de variáveis', resumo: 'Escopo é a <b>região do código</b> onde um nome pode ser usado. Uma variável declarada dentro de <code>{ }</code> só é visível do ponto da declaração até o fechamento daquele bloco — inclusive blocos de <code>if</code>, <code>for</code> e <code>while</code>.',
    analogia: 'Uma regra combinada dentro de uma sala vale só naquela sala. Saindo dela, ninguém sabe do que você está falando.',
    table: { head: ['Declarada em', 'Visível em'], rows: [['fora de funções', 'todo o arquivo (global)'], ['corpo de uma função', 'só nessa função'], ['bloco { } / for (int i...)', 'só nesse bloco']] },
    code: String.raw`for (int i = 0; i < 3; i++) {
    int quadrado = i * i;
}
printf("%d", quadrado);   // ERRO: fora do escopo`,
    prova: 'Usar uma variável fora do seu escopo é <b>erro de compilação</b> ("não foi declarado neste escopo"), não de execução. Veja o exemplo "Erro de compilação" no lab.', ex: 'esc-erro' },
  pilha: { mod: 'esc', title: 'Tempo de vida e a pilha (stack)', resumo: 'Variáveis locais vivem na <b>pilha</b>. Ao entrar numa função, um "frame" é empilhado com suas locais; ao sair, o frame é desempilhado e elas deixam de existir. Por isso uma local é recriada (do zero) a cada chamada.',
    analogia: 'Uma pilha de pratos: cada chamada de função coloca um prato em cima; ao retornar, o prato é retirado com tudo o que estava nele.',
    table: { head: ['Momento', 'Pilha'], rows: [['main() rodando', '[ main ]'], ['main chama f()', '[ f ] sobre [ main ]'], ['f() retorna', '[ main ] — locais de f sumiram']] },
    code: String.raw`void conta() {
    int n = 0;     // recriado a cada chamada
    n++;
    printf("%d ", n);
}
// conta(); conta();  imprime: 1 1`, saida: '1 1',
    prova: 'Nunca retorne o endereço de uma local (<code>return &amp;n;</code>): o frame é destruído e o ponteiro fica pendurado. Acompanhe os frames no painel de memória.', ex: 'esc-shadow' },
  global: { mod: 'esc', title: 'Variáveis globais', resumo: 'Declaradas fora de qualquer função, ficam na área de dados (<code>.data</code>), existem durante <b>todo</b> o programa, são visíveis em todas as funções abaixo da declaração e começam com <b>0</b> se não forem inicializadas.',
    analogia: 'O quadro de avisos do corredor: todas as salas veem e qualquer um pode alterá-lo — prático, mas fica difícil saber quem mudou o quê.',
    table: { head: ['', 'Local', 'Global'], rows: [['Onde fica', 'pilha', '.data'], ['Vida', 'até o fim do bloco', 'programa inteiro'], ['Valor inicial', 'lixo', '0'], ['Visível em', 'seu bloco', 'todas as funções']] },
    code: String.raw`int contador;          // começa em 0
void inc() { contador++; }
int main() { inc(); inc(); printf("%d", contador); }`, saida: '2',
    prova: 'Prefira passar valores por parâmetro; globais tornam o fluxo do programa difícil de rastrear.', ex: 'esc-shadow' },
  lixo: { mod: 'esc', title: 'Lixo de memória (variável não inicializada)', resumo: 'Uma variável <b>local</b> declarada sem valor inicial assume o que estiver naquela posição da pilha — sobras de usos anteriores. Esse valor imprevisível é chamado de "lixo".',
    analogia: 'Alugar um armário sem limpá-lo: dentro ainda estão as coisas do inquilino anterior.',
    table: { head: ['Declaração', 'Valor inicial'], rows: [['int x; (local)', 'lixo (imprevisível)'], ['int x; (global)', '0'], ['int soma = 0;', '0 ✓'], ['int v[5] = {0};', 'todos 0 ✓']] },
    code: String.raw`int soma;              // ERRADO: começa com lixo
for (int i = 1; i <= 3; i++) soma += i;

int total = 0;         // CERTO`,
    prova: 'Acumuladores (<code>soma</code>, <code>contador</code>) sempre começam em 0. O painel de memória marca variáveis com lixo em amarelo.', ex: 'esc-shadow' },
  shadowing: { mod: 'esc', title: 'Shadowing (sombreamento)', resumo: 'Quando um bloco interno declara uma variável com o <b>mesmo nome</b> de uma externa (ou global), a interna "faz sombra": dentro daquele bloco, o nome se refere à interna. A externa continua existindo e volta a ser visível quando o bloco termina.',
    analogia: 'Dois alunos chamados "Ana", um em cada sala. Dentro da sala 2, "Ana" significa a Ana da sala 2 — a outra continua existindo na sala 1.',
    table: { head: ['Onde', 'contador vale'], rows: [['global', '100'], ['main (int contador = 5)', '5'], ['bloco interno (int contador = 50)', '50'], ['main, após o bloco', '5']] },
    code: String.raw`int x = 1;            // global
int main() {
    int x = 2;        // sombreia a global
    { int x = 3; }    // sombreia a da main
    printf("%d", x);
}`, saida: '2',
    prova: 'Alterar a variável sombreada não altera a global. O painel de memória risca as variáveis sombreadas.', ex: 'esc-shadow' },

  /* ---------- Módulo V ---------- */
  modos: { mod: 'arq', title: 'Modos de abertura do fopen', resumo: '<code>fopen(nome, modo)</code> abre um arquivo e devolve um <code>FILE*</code>. O modo define o que se pode fazer e o que acontece com o conteúdo que já existe.',
    analogia: '"w" é pegar um caderno e arrancar todas as folhas antes de escrever. "a" é continuar escrevendo na última página. "r" é só ler.',
    table: { head: ['Modo', 'Se existe', 'Se não existe', 'Uso'], rows: [['"r"', 'lê do início', 'retorna NULL', 'leitura'], ['"w"', 'APAGA o conteúdo', 'cria', 'escrita do zero'], ['"a"', 'escreve no final', 'cria', 'log / histórico'], ['"r+"', 'lê e escreve', 'NULL', 'atualização'], ['"w+"', 'apaga, lê e escreve', 'cria', '—'], ['"a+"', 'lê, escreve no final', 'cria', '—']] },
    code: String.raw`FILE *fp = fopen("notas.txt", "w");`,
    prova: 'Abrir com "w" um arquivo que você queria ler apaga os dados. Rode o exemplo de log ("a") várias vezes e veja o arquivo crescer.', ex: 'arq-append' },
  nullcheck: { mod: 'arq', title: 'Validar o ponteiro: if (fp == NULL)', resumo: 'Se o <code>fopen</code> falhar (arquivo inexistente em "r", sem permissão, caminho errado), ele retorna <code>NULL</code>. Qualquer <code>fprintf</code>/<code>fgets</code> com <code>NULL</code> derruba o programa, então testamos logo após abrir.',
    analogia: 'Antes de entrar no carro, confirme que a chave abriu a porta. Sem isso, você bate a cara no vidro.',
    code: String.raw`FILE *fp = fopen("dados.txt", "r");
if (fp == NULL) {
    printf("Erro ao abrir!\n");
    return 1;      // encerra com código de erro
}`,
    prova: 'O teste vem <b>imediatamente</b> após o fopen e antes de qualquer uso de fp. Apague o arquivo no Diretório Local e rode o exemplo de leitura para ver o desvio.', ex: 'arq-leitura' },
  fgets: { mod: 'arq', title: 'fgets e o buffer', resumo: '<code>fgets(buffer, tamanho, fp)</code> lê uma linha do arquivo para dentro de um vetor de char. Para no <code>\\n</code> (que é guardado), no fim do arquivo ou após <code>tamanho - 1</code> caracteres, e sempre acrescenta o <code>\\0</code>. Usar <code>sizeof(buffer)</code> garante que nunca transborda.',
    analogia: 'O buffer é um balde de tamanho fixo. O fgets enche até a borda (menos um espaço para a tampa <code>\\0</code>) e nunca derrama.',
    table: { head: ['Linha no arquivo', 'char buf[8]', 'buf recebe'], rows: [['"Ana\\n"', 'cabe', '"Ana\\n\\0"'], ['"Bernardo\\n"', 'não cabe', '"Bernard\\0" (resto na próxima leitura)']] },
    code: String.raw`char buffer[64];
fgets(buffer, sizeof(buffer), fp);
printf("%s", buffer);    // o \n já vem da linha`,
    prova: 'Como o <code>\\n</code> fica no buffer, use <code>printf("%s", buffer)</code> sem outro <code>\\n</code>. Diminua o buffer do exemplo de leitura e veja as linhas se partirem.', ex: 'arq-leitura' },
  fimarquivo: { mod: 'arq', title: 'Laço de leitura até o fim do arquivo', resumo: '<code>fgets</code> retorna o próprio buffer quando lê algo e <code>NULL</code> quando não há mais nada. Por isso a forma segura é colocar a leitura <b>na condição</b>: <code>while (fgets(...) != NULL)</code>.',
    analogia: 'Tirar cartas de um baralho enquanto houver carta — a verificação acontece no ato de tirar, e não antes.',
    table: { head: ['Laço', 'Resultado'], rows: [['while (fgets(buf, sizeof(buf), fp) != NULL)', '✓ para no momento certo'], ['while (!feof(fp)) { fgets(...); }', '✗ processa a última linha 2 vezes'], ['while (fp != NULL)', '✗ laço infinito']] },
    code: String.raw`while (fgets(buffer, sizeof(buffer), fp) != NULL) {
    printf("%s", buffer);
}`,
    prova: '<code>feof</code> só fica verdadeiro <b>depois</b> que uma leitura falha — por isso <code>while(!feof(fp))</code> é a pegadinha clássica.', ex: 'arq-leitura' },
  fclose: { mod: 'arq', title: 'fclose: liberar o arquivo', resumo: 'O C grava em um buffer na memória e só descarrega para o disco em certos momentos. <code>fclose(fp)</code> descarrega o que faltar, libera o descritor do sistema operacional e invalida o ponteiro.',
    analogia: 'Devolver o livro na biblioteca: enquanto não devolve, ninguém mais pega — e as anotações só entram no registro na devolução.',
    code: String.raw`FILE *fp = fopen("saida.txt", "w");
if (fp == NULL) return 1;
fprintf(fp, "ok\n");
fclose(fp);        // depois disso, não use mais fp`,
    prova: 'Cada <code>fopen</code> bem-sucedido precisa de um <code>fclose</code>. O simulador avisa no terminal quando um arquivo ficou aberto, e usar fp após fechar é erro.', ex: 'arq-escrita' },
};
