# Deploy do Live Replay Commerce

## Opcao recomendada

Publique primeiro no GitHub e depois conecte o repositorio a uma plataforma de hospedagem.

Para a aplicacao ficar usavel em producao, configure servicos persistentes:

- Banco: Turso/LibSQL remoto, Supabase Postgres ou outro banco gerenciado.
- Videos/uploads: Supabase Storage, Cloudflare R2, S3 ou equivalente.
- Variaveis de ambiente: configurar no painel da plataforma, nunca commitar `.env`.

## Por que Vercel precisa de ajustes

O projeto atual usa:

- `data/local.db` para banco local.
- `uploads/` para arquivos enviados localmente.
- Backend Express em `server.ts`.

Em Vercel, arquivos gravados em disco durante runtime nao sao persistentes. Portanto, upload local e SQLite local nao devem ser usados como armazenamento definitivo em producao.

## Variaveis de ambiente

Use `.env.example` como referencia:

```env
GEMINI_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
JWT_SECRET=
APP_URL=
```

Em producao:

- `JWT_SECRET` deve ser forte e diferente do exemplo.
- `APP_URL` deve ser a URL publica da aplicacao.
- `SUPABASE_URL` e `SUPABASE_ANON_KEY` devem ser configurados se os videos forem enviados para Supabase Storage.

## Publicar no GitHub

Se voce tiver GitHub CLI instalado e autenticado:

```bash
gh auth login
gh repo create live-replay-commerce --private --source=. --remote=origin --push
```

Se preferir pelo site:

1. Crie um repositorio vazio no GitHub.
2. Copie a URL do repositorio.
3. Rode:

```bash
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git branch -M main
git push -u origin main
```

## Deploy manual em servidor Node

Em uma VPS, Render, Railway ou Fly.io:

```bash
npm install
npm run build
npm start
```

Build command:

```bash
npm run build
```

Start command:

```bash
npm start
```

Porta esperada:

```text
3000
```

Se a plataforma fornece `PORT` dinamico, ajuste `server.ts` para usar `process.env.PORT`.

## Checklist antes de publicar

- `.env` nao esta commitado.
- `node_modules/` nao esta commitado.
- `dist/` nao esta commitado.
- `data/` nao esta commitado.
- `uploads/` nao esta commitado.
- Variaveis de ambiente configuradas na hospedagem.
- Storage persistente configurado para videos.
- Banco persistente configurado para usuarios, lives, produtos, timeline, comentarios e pedidos.

