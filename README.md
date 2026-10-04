# Torre de Controle

Validação navegável do MVP pessoal, inspirada no visual do GSA. React, TypeScript e Vite.

`npm install`, `npm run dev` e `npm run build`.

Veja [escopo](ESCOPO.md) e [design system](DESIGN_SYSTEM.md).

Esta versão usa dados fictícios e localStorage. Google Tasks, calendário e Supabase ainda não estão conectados. Não há sincronização entre dispositivos. O banco previsto para a fase funcional é PostgreSQL no Supabase com autenticação e RLS.

GitHub Pages: publicar a pasta `docs` da branch `main`. Após `npm run build`, atualizar `docs` com o conteúdo de `dist`. A publicação atual usa esse modo para não exigir permissão de criação de workflows.
