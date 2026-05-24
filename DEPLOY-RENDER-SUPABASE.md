# Deploy Render — Supabase PostgreSQL

Produção em **https://fitpro-academia.onrender.com** ainda pode servir **build antigo** (MySQL) até você:

1. Publicar o código novo no GitHub (branch ligada ao Render)
2. Ajustar variáveis no painel Render
3. Fazer **Clear build cache & deploy**

## Diagnóstico rápido

| Teste | Deploy antigo (MySQL) | Deploy novo (Supabase) |
|-------|----------------------|-------------------------|
| `GET /api/health` | **404** HTML | **200** JSON `dialect: postgres` |
| `POST /api/auth/login` | 503 com `DB_DATABASE` | 200 `ok: true` ou erro Supabase moderno |

## 1. Variáveis no Render (Environment)

**Definir** (copiar do seu `.env` local ou Supabase Dashboard → Settings → API):

| Variável | Origem |
|----------|--------|
| `DATABASE_URL` | Supabase → Database → Connection string (pooler, porta **5432**) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://SEU_REF.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon public |
| `JWT_SECRET` | string longa (32+ chars); manter se já existir |

**Remover** (se existirem):

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `MYSQL_URL`, `MYSQL_HOST`, `MYSQL_DATABASE`, `MYSQL_PUBLIC_URL`
- `DB_DIALECT` (opcional; o app força postgres)

## 2. Publicar código

O Render faz deploy do repositório Git. Garanta que `main` no GitHub contém:

- `app/api/health/route.ts`
- `lib/db-config.ts`, `lib/db.ts`, `lib/db-errors.ts`
- `render.yaml` com `healthCheckPath: /api/health`
- `data/supabase_fitpro_schema.sql`

```powershell
cd c:\Academia
git add .
git commit -m "feat: Supabase PostgreSQL em produção (remove MySQL)"
git push origin main
```

## 3. Rebuild sem cache (painel)

Render Dashboard → **fitpro-academia** → **Manual Deploy** → **Clear build cache & deploy**

Ou via API (com chave em https://dashboard.render.com/u/settings#api-keys):

```powershell
$env:RENDER_API_KEY = "rnd_sua_chave"
npm run render:deploy
```

O script `scripts/render-deploy-supabase.mjs`:

- Remove variáveis MySQL legadas
- Define `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_*` a partir do `.env` local
- Dispara deploy com `clearCache: clear`

## 4. Validar produção

```powershell
curl.exe -sS "https://fitpro-academia.onrender.com/api/health"
```

Esperado:

```json
{
  "ok": true,
  "dialect": "postgres",
  "activeDatabase": "supabase-postgresql",
  "env": { "DB_HOST": null, "DB_DATABASE": null, "MYSQL_URL": null }
}
```

Login:

```powershell
$body = '{"email":"master@academia.com","password":"Master@123"}'
Invoke-RestMethod -Uri "https://fitpro-academia.onrender.com/api/auth/login" -Method POST -ContentType "application/json" -Body $body
```

## 5. Logs

Render Dashboard → **fitpro-academia** → **Logs** (build e runtime).

Se `db:bootstrap` for necessário na base Supabase de produção, rode **localmente** com o mesmo `DATABASE_URL` de produção (cuidado: altera a base real):

```powershell
npm run db:bootstrap
```

## Mensagem antiga removida

O texto *"A base de dados não existe… DB_DATABASE"* **não existe** no código atual. Se ainda aparecer em produção, o Render está servindo **commit antigo** ou **cache de build** — repita o passo 3.
