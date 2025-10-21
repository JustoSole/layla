# 🚀 Supabase CLI Cheatsheet

## 📦 Setup Inicial

```bash
# Instalar CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link proyecto
supabase link --project-ref ibhxfrmaluxegibwqfiv
```

## 🔑 Variables de Entorno

### Para funciones REMOTAS (Dashboard)
```
Settings → Edge Functions → Secrets
- OPENAI_API_KEY
- OPENAI_MODEL
```

### Para funciones LOCALES (.env.local)
```bash
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini-2024-07-18
SUPABASE_URL=https://ibhxfrmaluxegibwqfiv.supabase.co
SECRET_KEY=eyJhbGc... # service_role key
```

## 🚢 Deploy

```bash
# Deploy normal
npx supabase functions deploy analyze-reviews --project-ref ibhxfrmaluxegibwqfiv

# Deploy forzado (si dice "No change found")
npx supabase functions deploy analyze-reviews \
  --project-ref ibhxfrmaluxegibwqfiv \
  --use-api
```

## 📊 Logs

```bash
# Ver logs
npx supabase functions logs analyze-reviews --project-ref ibhxfrmaluxegibwqfiv

# Logs en tiempo real
npx supabase functions logs analyze-reviews \
  --project-ref ibhxfrmaluxegibwqfiv \
  --follow

# Últimos 100 logs
npx supabase functions logs analyze-reviews \
  --project-ref ibhxfrmaluxegibwqfiv \
  --limit 100
```

**Dashboard:** https://supabase.com/dashboard/project/ibhxfrmaluxegibwqfiv/logs/edge-functions

## 🔐 Secrets

```bash
# Listar
npx supabase secrets list --project-ref ibhxfrmaluxegibwqfiv

# Setear
npx supabase secrets set OPENAI_API_KEY=sk-... \
  --project-ref ibhxfrmaluxegibwqfiv
```

## 🧪 Testing

### Con curl
```bash
curl -X POST \
  https://ibhxfrmaluxegibwqfiv.supabase.co/functions/v1/analyze-reviews \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"external_place_id":"ChIJ...", "limit":5}'
```

### Con Node.js (recomendado)
```javascript
// test.cjs
const fetch = require('node-fetch');
fetch('https://ibhxfrmaluxegibwqfiv.supabase.co/functions/v1/analyze-reviews', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ external_place_id: 'ChIJ...', limit: 5 })
}).then(r => r.json()).then(console.log);
```

## 🗄️ Database

```bash
# Query directa
npx supabase db remote query \
  "SELECT * FROM reviews LIMIT 5;" \
  --project-ref ibhxfrmaluxegibwqfiv

# Estado
npx supabase status
```

## 📂 Estructura

```
project/
├── supabase/
│   ├── functions/
│   │   ├── analyze-reviews/
│   │   │   ├── index.ts       # Código de la función
│   │   │   └── deno.json      # Dependencias
│   │   └── _shared/
│   │       └── db.ts          # Cliente Supabase
│   └── config.toml            # Config del proyecto
└── .env.local                 # Variables locales (NO commitear)
```

## ⚡ Workflow Rápido

```bash
# 1. Editar código
# 2. Deploy
npx supabase functions deploy analyze-reviews \
  --project-ref ibhxfrmaluxegibwqfiv --use-api

# 3. Ver logs
npx supabase functions logs analyze-reviews \
  --project-ref ibhxfrmaluxegibwqfiv --follow

# 4. Test
node test-script.cjs
```

## 🔧 Troubleshooting

### "OPENAI_API_KEY no configurado"
→ Dashboard → Settings → Edge Functions → Secrets → Add

### "504 Gateway Timeout"
→ Función tarda >150s. Reducir batch size o procesar en chunks.

### "No change found" al deploy
→ Usar `--use-api`

### Imports de Deno no resuelven
→ Verificar `deno.json`:
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.45.4"
  }
}
```

## 🔧 Edge Functions

### Estructura de una función
```typescript
// supabase/functions/mi-funcion/index.ts
import { admin, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req: Request) => {
  // Manejar CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Tu lógica aquí
    const { param1, param2 } = await req.json();
    
    // Query a BD
    const { data, error } = await admin
      .from("tabla")
      .select("*")
      .eq("campo", param1);
    
    if (error) throw error;
    
    // Response
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
```

### Llamar desde frontend
```typescript
// React/JavaScript
const { data, error } = await supabase.functions.invoke('mi-funcion', {
  body: { param1: 'valor', param2: 123 }
});
```

### Llamar desde Node.js
```javascript
const https = require('https');
const data = JSON.stringify({ param1: 'valor' });

const req = https.request({
  hostname: 'TU_PROJECT.supabase.co',
  path: '/functions/v1/mi-funcion',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
  }
}, (res) => {
  res.on('data', d => process.stdout.write(d));
});

req.write(data);
req.end();
```

## 🤖 Supabase MCP (Model Context Protocol)

### Comandos disponibles vía MCP

```typescript
// Listar proyectos
mcp_supabase_list_projects()

// Obtener proyecto
mcp_supabase_get_project({ id: "ibhxfrmaluxegibwqfiv" })

// Listar tablas
mcp_supabase_list_tables({ 
  project_id: "ibhxfrmaluxegibwqfiv",
  schemas: ["public"]
})

// Ejecutar SQL
mcp_supabase_execute_sql({
  project_id: "ibhxfrmaluxegibwqfiv",
  query: "SELECT * FROM reviews LIMIT 5;"
})

// Ver logs
mcp_supabase_get_logs({
  project_id: "ibhxfrmaluxegibwqfiv",
  service: "edge-function" // o "postgres", "auth", "storage"
})

// Listar Edge Functions
mcp_supabase_list_edge_functions({
  project_id: "ibhxfrmaluxegibwqfiv"
})

// Deploy Edge Function
mcp_supabase_deploy_edge_function({
  project_id: "ibhxfrmaluxegibwqfiv",
  name: "mi-funcion",
  entrypoint_path: "index.ts",
  files: [{ name: "index.ts", content: "..." }]
})

// Buscar en docs
mcp_supabase_search_docs({
  graphql_query: `{
    searchDocs(query: "edge functions", limit: 5) {
      nodes {
        title
        href
        content
      }
    }
  }`
})
```

### MCP desde Cursor/Claude
El asistente ya tiene acceso al MCP. Solo pedí:
- "Lista las tablas de mi proyecto"
- "Ejecuta este SQL: SELECT ..."
- "Muéstrame los logs recientes"
- "Busca en la documentación sobre rate limits"

## 📊 Schema de la BD

Ver schema completo en: `supabase/schema.sql`

Tablas principales:
- `external_places` - Negocios onboardeados
- `businesses` - Link usuario ↔ negocio
- `reviews` - Reviews con análisis (sentiment, aspects, gap_to_five)
- `business_competitors_fixed` - Competidores (max 4)
- `review_aspect_insights` - Agregaciones de aspectos
- `subscriptions` - Estado de suscripciones

## 📚 Links

- **CLI Docs:** https://supabase.com/docs/guides/cli
- **Edge Functions:** https://supabase.com/docs/guides/functions
- **Dashboard:** https://supabase.com/dashboard/project/ibhxfrmaluxegibwqfiv
- **SQL Editor:** https://supabase.com/dashboard/project/ibhxfrmaluxegibwqfiv/editor
- **Logs:** https://supabase.com/dashboard/project/ibhxfrmaluxegibwqfiv/logs/edge-functions

---

**Project:** ibhxfrmaluxegibwqfiv  
**Region:** sa-east-1  
**Functions:** analyze-reviews, ingest-google-reviews, onboard  
**Schema:** Ver `supabase/schema.sql` para estructura completa

