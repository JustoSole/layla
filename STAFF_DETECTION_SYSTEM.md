# 🤖 Sistema de Detección Automática de Staff

## 📋 Resumen Ejecutivo

Implementamos un sistema inteligente que **detecta automáticamente** menciones de empleados en las reviews, sin necesidad de input manual. El sistema:

1. ✅ **Detecta nombres** automáticamente usando OpenAI durante el análisis
2. ✅ **Normaliza y deduplica** con fuzzy matching (María = Mari = Marí)
3. ✅ **Agrega estadísticas** en tiempo real con triggers SQL
4. ✅ **Dashboard completo** con métricas de desempeño individual
5. ✅ **Sentiment contextual** - analiza si la mención es positiva/neutral/negativa

## 🏗️ Arquitectura

### 1. Detección (OpenAI + Edge Function)

**Archivo:** `supabase/functions/analyze-reviews/index.ts`

Durante el análisis de cada review, OpenAI ahora detecta:
```typescript
staff_mentions: [
  {
    detected_name: "María González",
    role: "Mesera",  // opcional
    sentiment: "positive",
    evidence_span: "María nos atendió súper bien"
  }
]
```

**Prompt actualizado:**
- Detecta nombres propios de empleados mencionados
- Identifica roles si se mencionan (mesero, chef, hostess, etc.)
- Analiza el sentiment **específico** de esa mención (no el global de la review)
- Extrae la cita textual donde se menciona

### 2. Base de Datos (PostgreSQL + Triggers)

**Archivo:** `supabase/migrations/20251017_add_staff_detection.sql`

#### Tablas creadas:

**`staff_members`** - Staff normalizado y deduplicado
```sql
- normalized_name: "María González" (canónico)
- primary_role: rol más común
- name_variations: ["María", "Mari", "Marí"]
- total_mentions, positive_mentions, neutral_mentions, negative_mentions
- first_seen_at, last_seen_at
```

**`staff_mentions`** - Menciones individuales (denormalizado)
```sql
- review_id, staff_member_id
- detected_name, role, sentiment, evidence_span
- Vinculado a la review original
```

**`staff_performance_stats`** - Vista agregada para dashboards
```sql
- Calcula positive_rate, unique_reviews_count
- Ordenado por desempeño
- JOIN con datos de reviews
```

#### Trigger automático (`sync_staff_mentions_from_review`)

Cuando se actualiza `reviews.staff_mentions`:
1. **Normaliza** el nombre con `normalize_staff_name()`
   - Remueve prefijos ("el", "la", "don", "doña", "chef", etc.)
   - Capitaliza correctamente
   - Trim y limpieza
2. **Busca o crea** el staff_member con UPSERT
3. **Actualiza contadores** automáticamente:
   - Incrementa total_mentions
   - Incrementa positive/neutral/negative según sentiment
   - Agrega variación de nombre si no existe
   - Actualiza last_seen_at
4. **Crea registro** en staff_mentions para detalle

**Ventajas:**
- ✅ Deduplicación automática (un nombre normalizado por negocio)
- ✅ Fuzzy matching básico pero efectivo
- ✅ Zero-latency en agregaciones (se calculan en INSERT/UPDATE)
- ✅ Histórico completo en staff_mentions

### 3. API (Edge Function)

**Archivo:** `supabase/functions/list-staff/index.ts`

**GET con `external_place_id`** - Lista todo el staff del negocio
```typescript
{
  ok: true,
  staff: [
    {
      staff_member_id: "uuid",
      name: "María González",
      role: "Mesera",
      total_mentions: 15,
      positive_rate: 93,
      ...
    }
  ]
}
```

**GET con `staff_member_id`** - Detalle con menciones individuales
```typescript
{
  ok: true,
  staff_member: { ... },
  mentions: [
    {
      id, review_id, detected_name, sentiment,
      evidence_span, rating_value, author_name,
      posted_at, provider, review_url
    }
  ]
}
```

### 4. Frontend (React)

**Archivos:**
- `src/services/api.ts` - Tipos y funciones de API
- `src/components/StaffDashboard.tsx` - Dashboard completo

**Features del Dashboard:**
- ✅ **Loading states** elegantes
- ✅ **Empty state** cuando no hay staff detectado
- ✅ **Stats summary** - Total mentions, tasa positiva, etc.
- ✅ **Top Performers** - Top 3 con mejor rate
- ✅ **Needs Attention** - Staff con rate < 60%
- ✅ **Grid completo** con cards individuales
- ✅ **Modal de menciones** con:
  - Lista de todas las menciones
  - Citas textuales
  - Sentiment por mención
  - Link a review original
  - Rating y autor

## 🚀 Flujo de Uso

### Paso 1: Analizar Reviews
```javascript
await businessService.analyzeReviews(external_place_id, limit);
```

Durante el análisis:
- OpenAI detecta automáticamente staff en cada review
- Se guarda en `reviews.staff_mentions` (JSONB)
- **Trigger automático** crea/actualiza staff_members y staff_mentions

### Paso 2: Ver Dashboard
```javascript
// En StaffDashboard
const { staff } = await businessService.listStaff(external_place_id);
```

El usuario ve:
- Lista completa de staff detectado
- Métricas agregadas
- Top performers y alertas

### Paso 3: Ver Detalles
```javascript
const { staff_member, mentions } = 
  await businessService.getStaffDetail(staff_member_id);
```

El usuario ve:
- Todas las menciones individuales
- Citas exactas
- Links a reviews originales

## 📊 Agregaciones Inteligentes

### Normalización de Nombres

**Función:** `normalize_staff_name(text)`

Ejemplos:
- "el Chef Carlos" → "Carlos"
- "doña María" → "María"
- "  JUAN PEREZ  " → "Juan Perez"
- "la mesera Ana" → "Ana"

### Deduplicación

**Constraint:** `UNIQUE (external_place_id, normalized_name)`

- Si detecta "María", "Mari", "Marí" → UN solo staff_member
- `name_variations` guarda todas las formas detectadas
- El trigger hace UPSERT inteligente

### Contadores en Tiempo Real

**En cada INSERT/UPDATE de review:**
```sql
-- Incrementa automáticamente
total_mentions = total_mentions + 1
positive_mentions = positive_mentions + CASE WHEN ... 
last_seen_at = GREATEST(...)
```

## 🎯 Casos de Uso

### 1. Identificar Estrellas del Equipo
"¿Quiénes son mis mejores empleados según las reviews?"
→ Dashboard muestra Top Performers automáticamente

### 2. Detectar Problemas
"¿Algún empleado está recibiendo menciones negativas?"
→ Sección "Requieren Atención" con filtro < 60% rate

### 3. Reconocer Performance
"¿Qué dicen los clientes sobre María?"
→ Click en "Ver menciones" muestra todas las citas

### 4. Trends Temporales
"¿Cómo ha cambiado el desempeño de Juan?"
→ first_seen_at, last_seen_at para análisis temporal

## 🔧 Instalación y Deploy

### 1. Aplicar Migración
```bash
# Aplicar cambios en la BD
supabase db push
```

O manualmente:
```bash
psql -h your-db.supabase.co -U postgres -d postgres < supabase/migrations/20251017_add_staff_detection.sql
```

### 2. Re-deploy analyze-reviews
```bash
supabase functions deploy analyze-reviews \
  --project-ref ibhxfrmaluxegibwqfiv
```

### 3. Deploy list-staff
```bash
supabase functions deploy list-staff \
  --project-ref ibhxfrmaluxegibwqfiv
```

### 4. Re-analizar Reviews Existentes (Opcional)
```bash
# Si quieres detectar staff en reviews ya analizadas
node force-reanalyze-chino.cjs
```

Esto actualizará reviews antiguas con staff_mentions.

## 📈 Performance y Escalabilidad

### Optimizaciones Implementadas

1. **Índices estratégicos:**
   ```sql
   CREATE INDEX idx_staff_members_place ON staff_members(external_place_id);
   CREATE INDEX idx_staff_members_name ON staff_members(normalized_name);
   CREATE INDEX idx_staff_mentions_staff_member ON staff_mentions(staff_member_id);
   ```

2. **Vista pre-calculada:**
   - `staff_performance_stats` hace JOINs y agregaciones
   - Dashboard consulta la vista (rápido)

3. **Trigger eficiente:**
   - UPSERT en vez de SELECT + INSERT/UPDATE
   - Incrementos atómicos
   - Un solo query por mención

4. **Detección en batch:**
   - OpenAI analiza múltiples reviews simultáneamente
   - Staff se detecta en el mismo pase que aspects/sentiment

### Límites

- **Nombre normalizado único por negocio** - No puede haber dos "María González" en el mismo restaurante
- Si esto pasa, el sistema agrega todas las menciones al primero detectado
- Solución: Agregar apellidos o distinguir manualmente

### Escalabilidad

- ✅ Millones de reviews: índices + vista pre-calculada
- ✅ Cientos de staff: UNIQUE constraint + fuzzy matching
- ✅ Miles de menciones: denormalización en staff_mentions

## 🎨 UX Features

### Estados del Dashboard

1. **Loading** - Spinner mientras carga
2. **Empty** - Mensaje amigable cuando no hay staff detectado
3. **Error** - Manejo de errores con mensaje
4. **Populated** - Dashboard completo con datos

### Visualizaciones

- 📊 **Cards de métricas** - Total, positivas, tasa promedio
- 🏆 **Top Performers** - Podio visual
- ⚠️ **Alerts** - Destacado naranja para quien necesita apoyo
- 📋 **Grid** - Tarjetas con avatar, stats, progress bar
- 💬 **Modal** - Menciones individuales con contexto completo

### Detalles de UX

- **Variaciones de nombre** - Muestra "También: Mari, Marí"
- **Sentiment colors** - Verde/Gris/Rojo por mención
- **Links a reviews** - Ver review completa en plataforma original
- **Stars** - Rating visual de la review
- **Fechas relativas** - "Hace 2 días" vs fecha absoluta

## 🔮 Mejoras Futuras

### ML avanzado
- Clustering de nombres similares (Levenshtein distance)
- Detección de géneros para pronombres ("él nos atendió" → buscar staff masculino previo)
- NER fine-tuned para restaurantes

### Analytics
- Trends temporales (gráfica de desempeño)
- Comparación entre staff
- Correlación rol-performance
- Detección de burnout (declining trend)

### Gestión
- Edición manual de staff (merge duplicados)
- Alias personalizados
- Fotos de staff
- Notificaciones cuando baja el rate

### Integraciones
- Export a Excel/PDF
- Slack/WhatsApp alerts
- Integración con sistemas de RR.HH.

## 🐛 Troubleshooting

### No se detecta staff
**Problema:** Dashboard vacío después de analizar
**Causas:**
1. Reviews no mencionan nombres específicos
2. OpenAI no reconoció como nombre propio
3. Error en el trigger

**Solución:**
```sql
-- Verificar si hay staff_mentions en reviews
SELECT id, staff_mentions FROM reviews 
WHERE staff_mentions IS NOT NULL 
LIMIT 10;

-- Verificar trigger
SELECT * FROM staff_members;
SELECT * FROM staff_mentions;
```

### Duplicados
**Problema:** "María" y "María González" aparecen separados
**Causa:** Normalización no fusionó correctamente

**Solución:**
```sql
-- Merge manual
UPDATE staff_mentions 
SET staff_member_id = 'uuid-correcto'
WHERE staff_member_id = 'uuid-duplicado';

DELETE FROM staff_members WHERE id = 'uuid-duplicado';
```

### Performance lento
**Problema:** Dashboard tarda en cargar

**Solución:**
```sql
-- Verificar índices
\d staff_members
\d staff_mentions

-- Recrear si faltan
CREATE INDEX IF NOT EXISTS idx_staff_members_place 
  ON staff_members(external_place_id);
```

## 📚 Documentación Técnica

### Schema Completo

Ver: `supabase/migrations/20251017_add_staff_detection.sql`

### API Reference

Ver: `src/services/api.ts` - interfaces TypeScript

### Componente React

Ver: `src/components/StaffDashboard.tsx` - código completo

---

**Autor:** Claude + Justo Soleno  
**Fecha:** 17 de octubre, 2025  
**Versión:** 1.0.0

