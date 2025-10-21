# Data Contracts: Review Insights (Gastronomía)

## 1. Tablas y columnas relevantes

### `public.reviews`
- `overall_score numeric` · Score 0-1 del tono general de la reseña.
- `overall_sentiment_confidence numeric` · Confianza 0-1 del modelo.
- `gap_to_five boolean` · `true` si el cliente quedó cerca de 5★ pero menciona mejoras.
- `gap_reasons text[]` · Lista corta de motivos que impidieron la calificación perfecta.
- `critical_flags text[]` · Banderas severas (`higiene`, `intoxicacion`, `trato_agresivo`, `fraude`, `seguridad`, `queja_recurrente`).
- `executive_summary text` · Resumen ejecutivo (<=260 caracteres).
- `action_items text[]` · Bullets accionables (1-3 ítems).
- `aspects jsonb` · Cada elemento incluye `{ aspect, sub_aspect?, sentiment, evidence_spans: string[], severity?, gap_to_five_contrib? }`. Si un subtema se menciona varias veces en una reseña, todas las evidencias se consolidan en el array `evidence_spans`.

### `public.review_aspect_insights`
Agregado calculado vía `refresh_review_aspect_insights(external_place_id)`.
Campos clave:
- `aspect text`, `sentiment text`.
- `mention_count int`, `avg_severity numeric`, `gap_impact numeric`.

## 2. Edge Function `analyze-reviews`
- Devuelve análisis estructurado usando OpenAI con esquema actualizado.
- Guarda todos los campos anteriores en `public.reviews`.
- Normaliza `severity` (1-3) y `gap_to_five_contrib` (0-1).
- Sólo procesa reseñas con campos faltantes (sentiment/aspects/gap/summary/etc.).

### Prompt: Taxonomía gastronómica
- Aspectos básicos: `servicio`, `comida`, `bebida`, `postres`, `precio`, `relacion_calidad_precio`, `ambiente`, `musica`, `limpieza`, `higiene`, `tiempos`, `tiempo_de_espera`, `porciones`, `emplatado`, `atencion`, `delivery`, `reservas`, `accesibilidad`, `estacionamiento`, `promociones`.
- Bandera crítica automática para higiene/intoxicación.
- Gap analysis: identifica barreras a 5★ y genera `action_items`.

## 3. Pipeline de Aggregation
1. Ejecutar `analyzeReviews` (Edge) para poblar campos por reseña.
2. Invocar `SELECT refresh_review_aspect_insights('<external_place_id>'::uuid);` para recalcular agregados.
3. Consumir `review_aspect_insights` desde el frontend para dashboards (fortalezas, debilidades, gap-to-five).

## 4. Integra con Frontend
- `src/types/schema.ts` expone los campos nuevos en `Review` y `AnalysisData`.
- Próximas tareas (ver plan) conectarán Dashboard/Reports con la tabla agregada.

## 5. Testing rápido
- Después de correr `analyzeReviews`, verificar:
  ```sql
  select overall_score, gap_to_five, critical_flags, executive_summary
  from public.reviews
  where external_place_id = '<uuid>' and overall_score is not null
  limit 5;
  ```
- Recalcular agregados:
  ```sql
  select refresh_review_aspect_insights('<uuid>'::uuid);
  select * from public.review_aspect_insights where external_place_id = '<uuid>';
  ```

## 6. Estandarización de Campos de Rating (2025-01-17)

### Nomenclatura Oficial
**Campos en `BusinessData` (schema.ts):**
- `rating_value` → Valor del rating (0-5)
- `rating_votes_count` → Total de votos/reviews
- `google_ratings` → Objeto con rating de Google
- `tripadvisor_ratings` → Objeto con rating de TripAdvisor

**Campos en `Business` interface (contexto):**
- `rating` → Valor del rating consolidado
- `totalReviews` → Total de reviews
- `rating_votes_count` → Alias de totalReviews (compatibilidad con schema)
- `votes_count` → **DEPRECATED** (usar rating_votes_count)

### Estructura Interna de `google_ratings` / `tripadvisor_ratings`
```typescript
{
  rating_value: number,      // 0-5
  rating_votes: number,       // Total votos
  rating_distribution: {      // Distribución por estrellas
    "5": number,
    "4": number,
    "3": number,
    "2": number,
    "1": number
  }
}
```

### Helpers de Validación
```typescript
import { safeRating, safeCount } from '../types/schema';

const rating = safeRating(business.rating_value);  // Siempre 0-5
const votes = safeCount(business.rating_votes_count);  // Siempre >= 0
```

### ⚠️ NO USAR
- ❌ `rating_summary` (no existe en el schema)
- ❌ Acceso directo a `.average` o `.total_reviews`
- ❌ Campo `votes_count` (deprecado, usar `rating_votes_count`)

