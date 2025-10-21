## Guía técnica: APIs, Edge Functions, Auth y Flujos de Datos

Esta guía describe, con foco en mantenibilidad y extensión, cómo la app se autentica, cómo orquesta llamadas a Edge Functions y cómo persiste/consulta datos en Supabase.

### Mapa de carpetas relevantes
- `src/services/api.ts`: capa de llamadas a Edge Functions (client API).
- `src/lib/dataLayer.ts`: lecturas directas a BD y transformaciones para UI.
- `src/contexts/AuthContext.tsx`: sesión y login Google.
- `src/contexts/BusinessContext.tsx`: selección, persistencia y carga del negocio actual.
- `supabase/functions/*`: Edge Functions (`onboard`, `link-business`, ingestas, análisis).
- `supabase/schema.sql`: definición de tablas/índices/constraints.

---

## Autenticación (Google OAuth via Supabase)

Archivo clave: `src/contexts/AuthContext.tsx`.

- Inicio de sesión: `signInWithGoogle()` llama a `supabase.auth.signInWithOAuth` con `redirectTo = window.location.origin`.
- Estado: `getSession()` y `onAuthStateChange` actualizan `user`/`session` y controlan el loading inicial.
- Rutas (`src/App.tsx`):
  - con sesión y negocio → `/dashboard`.
  - con sesión sin negocio → `/onboarding`.
  - sin sesión → `LandingPage`.

Buenas prácticas adoptadas:
- Persistencia de sesión activada en `src/lib/supabase.ts` (autoRefresh/persistSession/detectSessionInUrl).
- Limpieza de `localStorage` al hacer `signOut()`.

---

## Negocio actual: selección, re-vinculación y datos

Archivo: `src/contexts/BusinessContext.tsx`.

Responsabilidades:
- Persistir el negocio activo en `localStorage` (`reputacionlocal_business`).
- Si hay usuario y no hay negocio en memoria, cargar su negocio primario desde BD (`loadUserPrimaryBusiness`).
- Re-vincular en background el negocio activo al usuario con `linkBusiness(external_place_id)`; la función es idempotente.
- Cuando cambia el negocio, cargar sus datos completos (`loadCompleteBusinessData`) para Dashboard/Reports.

Data Layer (`src/lib/dataLayer.ts`):
- `loadRealBusinesses(limit)`: lista de `external_places` + conteos de `reviews`.
- `loadCompleteBusinessData(external_place_id)`: `{ business, reviews, analysis, stats }`.
- `loadUserPrimaryBusiness(userId)`: join `businesses ↔ external_places` con conteos reales.

Convenciones:
- Los objetos que vuelven al UI se normalizan con helpers (`transformBusinessForUI`, `transformReviewForUI`).
- `external_place_id` es la clave que recorre todo el flujo.

---

## Edge Functions

### onboard
Ruta: `supabase/functions/onboard/index.ts` (import map en `supabase/functions/onboard/deno.json`).

Propósito:
- Obtener datos del lugar (DataForSEO) por `place_id` o `cid` y materializarlos en `public.external_places`.
- Guardar `google_ratings` y, cuando aplica, información de TripAdvisor.

Request (JSON): `{ place_id?, cid?, location_name?, language_code?, tripadvisor_url_path?, mode? }`
Response (JSON): `{ ok, external_place_id, business_info }
`

Side effects (BD):
- Upsert de `external_places` (clave: `google_place_id`).
- Update parcial de `external_places.google_ratings`.

Idempotencia:
- Si el lugar existe, se actualiza; si no, se inserta (mismo `google_place_id`).

### link-business
Ruta: `supabase/functions/link-business/index.ts` (import map en `supabase/functions/link-business/deno.json`).

Propósito:
- Vincular `external_place_id` con el `auth.user` y asegurar una fila de `subscriptions` en `trial` si falta.

Auth:
- Header `Authorization: Bearer <jwt>` validado con `admin.auth.getUser(token)`.

Request (JSON): `{ external_place_id, plan? = 'trial'|'pro' }`
Response (JSON): `{ ok, business_id, external_place_id }`

Side effects (BD):
- Inserta si falta en `public.businesses (owner_user_id, external_place_id, plan)`.
- Inserta si falta `public.subscriptions (user_id, status='trial', trial_ends_at)`.

Idempotencia:
- Volver a llamar no duplica filas; simplemente no hace cambios si ya existen.

### analyze-reviews
Ruta: `supabase/functions/analyze-reviews/index.ts`.

Propósito:
- Analizar reseñas pendientes y completar campos NLP en `public.reviews`.
- Nuevos campos que persiste: `overall_score`, `overall_sentiment_confidence`, `gap_to_five`, `gap_reasons`, `critical_flags`, `executive_summary`, `action_items`, además de enriquecer `aspects` con `severity` y `gap_to_five_contrib`.

Request (JSON): `{ external_place_id: uuid, limit?: number }`
Response (JSON): `{ ok, analyzed, total_reviews_found, processed_reviews }`

Detalles:
- Usa OpenAI Responses API con schema estricto y prompts adaptados a gastronomía.
- Controla rate limits (headers `x-ratelimit-*`, backoff exponencial) y normaliza rangos numéricos.
- Sólo procesa reseñas con campos faltantes; tras ejecutar se recomienda `SELECT refresh_review_aspect_insights(...)`.

---

## Capa de servicios Frontend (`src/services/api.ts`)

Patrón:
- `invokeFunction(name, payload)` centraliza invocaciones a Edge, logueando request/response y propagando errores como `Error(message)`.

API expuesta:
- `businessService.getPlaceSuggestions(input, ...)` → `google-places-autocomplete`.
- `businessService.onboard(params)` / `onboardByPlaceId` / `onboardByCid`.
- `businessService.linkBusiness(external_place_id, plan?)`.
- `ingestGoogleReviews*`, `ingestTripAdvisorReviews*`, `analyzeReviews`.

Ejemplo de uso (onboarding simple):
```ts
const onboard = await businessService.onboardByPlaceId(placeId, 'Argentina', 'es', tripadvisorUrl);
await businessService.linkBusiness(onboard.external_place_id);
```

---

## Esquema de BD (resumen operativo)

Archivo: `supabase/schema.sql`.

Tablas y columnas clave:
- `public.external_places`
  - `id (uuid)` PK
  - Identificadores: `google_place_id`, `google_cid`, `feature_id`, `tripadvisor_url_path`
  - Atributos: `name`, `address`, `phone`, `url`, `category`, `business_info_raw jsonb`
  - Agregados: `google_ratings jsonb`, `tripadvisor_ratings jsonb`

- `public.reviews`
  - `id (uuid)` PK, `external_place_id (fk)`
  - `provider`, `rating_value`, `review_text`, `posted_at`
  - NLP opcional: `sentiment`, `aspects jsonb`
  - Único: `(external_place_id, provider, provider_review_id)`

- `public.businesses`
  - `id (uuid)` PK
  - `owner_user_id (fk → auth.users.id)`, `external_place_id (fk → external_places.id)`
  - `plan text`, timestamps

- `public.subscriptions`
  - `id (uuid)` PK, `user_id (fk → auth.users.id)`
  - `status ('trial'|'active'|'past_due'|'canceled')`, `trial_ends_at`, `current_period_end`

Índices útiles:
- Uniqueness parcial en `external_places` por IDs de proveedores.
- `idx_businesses_external_place`, `idx_reviews_external_place` para lecturas por lugar.

---

## Flujos end‑to‑end

### Login
1) Click “Iniciar sesión” → Google OAuth.
2) `AuthContext` define `user` y cierra el loading.
3) Ruteo: con negocio → `/dashboard`; sin negocio → `/onboarding`.

### Onboarding
1) Autocomplete y selección de lugar.
2) `onboard` materializa/actualiza `external_places` y responde `external_place_id`.
3) Frontend lanza ingestas (Google/TripAdvisor) + NLP en background (`useOnboarding` → `businessService.ingest*` + `analyzeReviews` con retry/backoff)
   - Rate limit: `analyze-reviews` aplica reintentos exponenciales y limita el batch (`ANALYZE_DEFAULT_LIMIT`, máx. `ANALYZE_MAX_LIMIT`).
4) `linkBusiness(external_place_id)` vincula con el usuario y crea `trial` si falta.
5) `BusinessContext.setCurrentBusiness(...)` persiste en `localStorage` y dispara `loadCompleteBusinessData`.

### Dashboard/Reports
1) Con el `external_place_id`, `dataLayer` consulta negocio, reviews y análisis.
2) Se calculan KPIs/series para UI.

---

## Despliegue y entorno

CLI (ejemplos):
```bash
# Desplegar funciones (requiere login en CLI y project-ref)
supabase functions deploy onboard --project-ref <project_ref>
supabase functions deploy link-business --project-ref <project_ref>
```

Import maps: cada función Deno tiene su `deno.json` con:
```json
{ "imports": { "std/": "https://deno.land/std@0.224.0/", "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.45.4" } }
```

Troubleshooting rápido:
- Error "Relative import path not prefixed" → falta/incorrecto `deno.json` en la función.
- 401 desde `link-business` → falta header `Authorization` (usar cliente `supabase.functions.invoke`, que lo agrega).
- RLS: usar el cliente autenticado para lecturas de usuario; para funciones de servicio usar `admin` dentro de Edge.

---

## Extensiones sugeridas
- Selector multi‑negocio cuando el usuario tiene >1 fila en `businesses`.
- Telemetría de ingestas en `raw_ingestions`.
- Cron para refrescar periódicamente `google_ratings`.
