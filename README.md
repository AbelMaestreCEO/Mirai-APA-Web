# Mirai APA — Instrucciones de Despliegue

## Estructura del proyecto

```
mirai-apa-web/
├── public/              ← Cloudflare Pages sirve esto como frontend
│   ├── index.html
│   ├── css/
│   └── js/
├── workers/
│   └── index.js         ← Worker standalone (si usas Workers separado)
├── functions/
│   └── api/
│       └── [[...route]].js  ← API dentro de Pages (recomendado)
├── schema/
│   └── init.sql
├── wrangler.toml
└── package.json
```

---

## Opción A — Cloudflare Pages (RECOMENDADO, todo junto)

Esta opción sirve el frontend Y el backend desde el mismo proyecto Pages.

### 1. Crear recursos en Cloudflare

```bash
# Crear bucket R2
wrangler r2 bucket create mirai-apa

# Crear base de datos D1
wrangler d1 create mirai-apa-db
# → Copia el database_id que te devuelve y ponlo en wrangler.toml
```

### 2. Inicializar la base de datos

```bash
wrangler d1 execute mirai-apa-db --file=./schema/init.sql
```

### 3. Desplegar en Pages

```bash
wrangler pages deploy public --project-name=mirai-apa-web
```

### 4. Vincular R2 y D1 al proyecto Pages

Ve a: **Cloudflare Dashboard → Pages → mirai-apa-web → Settings → Functions**

Añade los bindings:
- R2: nombre `R2_BUCKET` → bucket `mirai-apa`
- D1: nombre `DB` → database `mirai-apa-db`

---

## Opción B — Worker separado + Pages

Usa esto si quieres el Worker en su propia URL (`mirai-apa-web.workers.dev`).

```bash
# Desplegar el Worker
wrangler deploy

# Desplegar el frontend en Pages
wrangler pages deploy public --project-name=mirai-apa-web
```

Cambia `API_BASE_URL` en `public/js/api/client.js` a la URL de tu Worker.

---

## Desarrollo local

```bash
npm install

# Frontend + API juntos (Pages)
wrangler pages dev public --compatibility-date=2024-01-01

# Solo el Worker
wrangler dev
```

---

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| 404 en Pages | `index.html` no está en `public/` | Mover archivos a `public/` |
| `{"error":"Not Found"}` en Worker | Ruta incorrecta en `wrangler.toml` | Verificar `main = "workers/index.js"` |
| `env.R2_BUCKET is undefined` | Binding mal nombrado | Verificar que `binding = "R2_BUCKET"` en `wrangler.toml` |
| `env.DB is undefined` | Binding mal nombrado | Verificar que `binding = "DB"` en `wrangler.toml` |
