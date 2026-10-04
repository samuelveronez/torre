# Torre de Controle

Validação navegável do MVP pessoal, inspirada no visual do GSA. React, TypeScript e Vite.

`npm install`, `npm run dev` e `npm run build`.

Veja [escopo](ESCOPO.md) e [design system](DESIGN_SYSTEM.md).

Esta versão usa Supabase Auth e PostgreSQL para tarefas, reservas, jornada e tema. O usuário entra com e-mail e senha; uma conta nova exige confirmação por e-mail. Google Tasks e calendário ainda não estão conectados. As demonstrações antigas do localStorage não são importadas para a conta.

Projeto: [Torre de Controle](https://supabase.com/dashboard/project/nvxwqrpztecrvrxoddxf), na região São Paulo. As seis tabelas `torre_` têm RLS por usuário. O cliente usa apenas a chave pública publishable. Nunca adicionar chaves secretas ao frontend.

Criar uma conta pela tela inicial, confirmar o e-mail e entrar. O envio de confirmação usa as configurações padrão do Supabase; configurar Site URL e Redirect URLs no painel de Auth antes de usar links de confirmação em produção. Nenhuma conta ou senha foi criada pelo agente.

GitHub Pages: publicar a pasta `docs` da branch `main`. Após `npm run build`, atualizar `docs` com o conteúdo de `dist`. A publicação atual usa esse modo para não exigir permissão de criação de workflows.
