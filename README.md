# C-Lab · Laboratório de Programação Estruturada em C

Abra `index.html` no navegador (requer internet para Bootstrap, GSAP e Bootstrap Icons via CDN).

## Estrutura
```
c-lab/
├── index.html          # marcação: hero, trilha, laboratório, simulado e modais
├── css/
│   └── style.css       # design system dark (IDE), editor, terminal, memória, quiz
└── js/
    ├── content.js      # módulos, exemplos, desafios (autocorreção), dicas e questões
    ├── interpreter.js  # interpretador de C: tokenizer, parser, análise de escopo e máquina virtual
    └── app.js          # interface: editor, terminal, painel de RAM, FS virtual, trilha, simulado, GSAP
```

## Como estender
- **Novo exemplo:** adicione um objeto em `EXAMPLES` (`content.js`) com `id`, `mod`, `title`, `code` (e `stdin` opcional).
- **Nova questão:** adicione em `QUESTIONS` — cada alternativa é `[texto, explicação, true?]`.
- **Novo desafio:** adicione em `CHALLENGES` com uma função `check(saida, arquivos, codigo)` que retorna `[ok, mensagem]`.
- **Nova função da biblioteca C:** implemente em `BUILTINS` (`interpreter.js`) e registre o cabeçalho em `HEADERS`.

O progresso, o código e os arquivos virtuais ficam salvos no `localStorage` do navegador.
