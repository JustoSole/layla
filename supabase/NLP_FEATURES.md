# 🧠 NLP Features - ReputacionLocal

## 📋 Tabla de Contenidos

1. [Overview](#1-overview)
2. [Features Implementadas](#2-features-implementadas)
3. [Arquitectura Técnica](#3-arquitectura-técnica)
4. [Pipeline de Datos](#4-pipeline-de-datos)
5. [Limitaciones Conocidas](#5-limitaciones-conocidas)
6. [Mejoras Futuras](#6-mejoras-futuras)
7. [Ejemplos](#7-ejemplos)

---

## 1. Overview

### ¿Qué hace este sistema?

Sistema de análisis automático de reviews para restaurantes que extrae insights estructurados usando **NLP moderno** (OpenAI GPT-4o-mini) con **Structured Outputs**.

### Enfoque: ABSA + NER + Sentiment

- **ABSA** (Aspect-Based Sentiment Analysis): Analiza sentiment por aspecto específico
- **NER** (Named Entity Recognition): Detecta menciones de staff automáticamente
- **Multi-dimensional Sentiment**: Global + por aspecto + confidence scoring

### Por qué OpenAI + Structured Outputs

**Ventajas:**
- ✅ **Zero-shot learning** - No requiere training data
- ✅ **Multi-idioma** nativo (español, inglés, portugués...)
- ✅ **Structured Outputs** garantiza JSON válido (no más errores de parsing)
- ✅ **Contextual understanding** superior a regex/ML clásico
- ✅ **Mantenimiento bajo** - OpenAI mejora el modelo continuamente

**Trade-offs:**
- ⚠️ **Costo por request** (~$0.15 por 1000 reviews con gpt-4o-mini)
- ⚠️ **Latencia** (~2-5 segundos por batch de 5 reviews)
- ⚠️ **Rate limits** (4000 RPM en Tier 2)

**Decisión:** El trade-off vale la pena vs entrenar/mantener modelos propios.

---

## 2. Features Implementadas

### 2.1 Sentiment Analysis Global

**¿Qué detecta?**
- Sentiment global de la review: `positive`, `neutral`, `negative`
- Score numérico: `0-1` (0 = muy crítico, 1 = muy entusiasta)
- Confidence: `0-1` (qué tan seguro está el modelo)

**Ejemplo:**
```json
{
  "sentiment": "positive",
  "overall_score": 0.85,
  "overall_sentiment_confidence": 0.92
}
```

**Uso:** Dashboard principal, filtrado de reviews, agregaciones.

---

### 2.2 ABSA (Aspect-Based Sentiment Analysis)

**Concepto:**
En vez de analizar "la review es positiva", analiza **cada aspecto mencionado** con su propio sentiment.

**Estructura:**
```typescript
{
  aspect: string,           // "comida", "servicio", "precio", "ambiente"...
  sub_aspect: string,       // "temperatura", "velocidad", "sabor"...
  sentiment: "positive" | "neutral" | "negative",
  evidence_span: string,    // Cita textual <=20 palabras
  severity: 1-3,           // 1=leve, 2=moderado, 3=grave
  gap_to_five_contrib: 0-1 // ¿Cuánto impide una 5★?
}
```

**Aspectos principales detectados:**
- **Comida**: sabor, temperatura, presentación, frescura, porciones
- **Servicio**: velocidad, atención, amabilidad, profesionalismo
- **Ambiente**: música, decoración, limpieza, ruido, iluminación
- **Precio**: relación calidad-precio, caro, barato
- **Ubicación**: acceso, estacionamiento, zona
- **Limpieza**: baños, mesas, cocina (visible)
- **Bebidas**: vinos, cócteles, café

**Ventajas:**
- ✅ **Granularidad**: "Comida excelente pero servicio lento" se captura perfectamente
- ✅ **Evidence spans**: Cada aspecto tiene su cita, permite validación humana
- ✅ **Sub-aspectos dinámicos**: OpenAI detecta matices sin taxonomía fija

**Ejemplo real:**
```json
{
  "aspects": [
    {
      "aspect": "comida",
      "sub_aspect": "sabor_delicioso",
      "sentiment": "positive",
      "evidence_span": "la pasta estaba increíble",
      "severity": 1,
      "gap_to_five_contrib": 0.0
    },
    {
      "aspect": "servicio",
      "sub_aspect": "velocidad_lenta",
      "sentiment": "negative",
      "evidence_span": "tardaron 40 minutos en traer la comida",
      "severity": 2,
      "gap_to_five_contrib": 0.3
    }
  ]
}
```

**Uso:**
- Identificar fortalezas/debilidades específicas
- Priorizar mejoras (por severity)
- Comparar vs competidores por aspecto
- Trend analysis temporal

---

### 2.3 Gap-to-Five Detection

**Concepto:**
Detecta reviews de **4 estrellas o positivas que mencionan mejoras concretas**. Estas son las más valiosas para acción.

**¿Por qué importa?**
- Reviews de 5★ suelen ser genéricas ("Todo perfecto!")
- Reviews de 1-2★ suelen ser emocionales o casos extremos
- **Reviews de 4★ con feedback específico son oro** 🏆

**Estructura:**
```typescript
{
  gap_to_five: boolean,     // ¿Tiene potencial de mejora a 5★?
  gap_reasons: string[],    // Razones específicas (máx 3)
  // En aspects:
  gap_to_five_contrib: 0-1  // Contribución de cada aspecto
}
```

**Ejemplo:**
```json
{
  "gap_to_five": true,
  "gap_reasons": [
    "Servicio lento en hora pico",
    "Baño necesita mantenimiento",
    "Falta variedad vegetariana"
  ]
}
```

**Uso:**
- Dashboard "Quick Wins"
- Priorización de mejoras
- ROI estimado de cambios

---

### 2.4 Critical Flags

**Concepto:**
Detección automática de **problemas graves** que requieren atención inmediata.

**Flags detectados:**
```typescript
enum CriticalFlag {
  "higiene",           // Problemas de limpieza graves
  "intoxicacion",      // Menciones de intoxicación alimentaria
  "trato_agresivo",    // Staff agresivo o grosero
  "fraude",            // Cobros incorrectos, engaños
  "seguridad",         // Robos, inseguridad en zona
  "queja_recurrente"   // Mismo problema mencionado múltiples veces
}
```

**Ejemplo:**
```json
{
  "critical_flags": ["higiene", "trato_agresivo"],
  "executive_summary": "Problemas graves de limpieza en baños y mesero fue grosero con familia"
}
```

**Uso:**
- Alertas inmediatas (email/SMS)
- Dashboard de crisis
- Compliance (salud pública)
- Prevención de daño reputacional

**Sensibilidad:**
- Falsos positivos son aceptables (mejor prevenir)
- Se revisan manualmente antes de acción

---

### 2.5 Staff Mentions (NER)

**Concepto:**
Detección automática de **empleados mencionados por nombre** en reviews usando Named Entity Recognition implícito.

**Estructura:**
```typescript
{
  detected_name: string,    // "María", "Juan Pérez", "el Chef Carlos"
  role?: string,            // "Mesera", "Chef", "Hostess" (opcional)
  sentiment: "positive" | "neutral" | "negative",
  evidence_span: string     // Cita donde se menciona
}
```

**Features clave:**

1. **NER sin entrenamiento:**
   - OpenAI detecta nombres propios automáticamente
   - No requiere lista previa de empleados
   - Funciona en múltiples idiomas

2. **Fuzzy Matching en DB:**
   ```sql
   -- Normaliza: "el Chef Carlos" → "Carlos"
   normalize_staff_name('el Chef Carlos') → 'Carlos'
   normalize_staff_name('María')          → 'María'
   normalize_staff_name('Mari')           → 'Mari' (después se agrupa)
   ```

3. **Deduplicación automática:**
   - Trigger SQL sincroniza menciones → staff_members
   - UNIQUE constraint por (external_place_id, normalized_name)
   - `name_variations` guarda todas las formas detectadas

4. **Sentiment contextual:**
   - **NO es el sentiment global de la review**
   - Es el sentiment **específico** hacia ese empleado
   - Ejemplo: Review positiva puede mencionar un empleado negativo

**Ejemplo:**
```json
{
  "staff_mentions": [
    {
      "detected_name": "María González",
      "role": "Mesera",
      "sentiment": "positive",
      "evidence_span": "María nos atendió súper bien y fue muy atenta"
    },
    {
      "detected_name": "Juan",
      "role": "Mesero",
      "sentiment": "negative",
      "evidence_span": "Juan se olvidó de traer el agua dos veces"
    }
  ]
}
```

**Agregaciones automáticas:**
```sql
-- Vista staff_performance_stats
SELECT 
  name,
  total_mentions,
  positive_rate,
  last_mention_date
FROM staff_performance_stats
WHERE external_place_id = ?
ORDER BY total_mentions DESC;
```

**Uso:**
- Dashboard de desempeño de staff
- Identificar empleados destacados
- Detectar problemas de personal temprano
- Reconocimiento y coaching

**Limitaciones conocidas:**
- "María" y "María González" podrían ser la misma persona → se deduplican
- "El mesero" sin nombre → NO se detecta (por diseño)
- Nombres muy comunes → posibles false positives

---

### 2.6 Executive Summary & Action Items

**Concepto:**
Síntesis automática de cada review en **≤260 caracteres** + acción items.

**Estructura:**
```typescript
{
  executive_summary: string,  // <=260 chars
  action_items: string[]      // 1-3 bullets accionables
}
```

**Ejemplo:**
```json
{
  "executive_summary": "Cliente satisfecho con comida y ambiente, pero servicio lento en hora pico. Staff amable pero necesitan más personal o mejor organización.",
  "action_items": [
    "Evaluar staffing en hora pico (12-2pm)",
    "Implementar sistema de turnos en cocina",
    "Capacitar a meseros en técnicas de multitasking"
  ]
}
```

**Uso:**
- Dashboard principal (card de cada review)
- Reports semanales/mensuales
- To-do list automático para gerentes

---

### 2.7 Language Detection

**Automático:**
- OpenAI detecta el idioma de cada review
- Códigos ISO: `es`, `en`, `pt`, etc.

**Uso:**
- Filtrado por idioma
- Analytics por mercado
- Traducción automática (futuro)

---

## 3. Arquitectura Técnica

### 3.1 Stack

```
┌─────────────────────────────────────┐
│   Frontend (React + TypeScript)     │
│   - Dashboard                        │
│   - Filters & Visualizations         │
└────────────┬────────────────────────┘
             │ Supabase Client
             ↓
┌─────────────────────────────────────┐
│   Supabase Edge Functions (Deno)    │
│   - analyze-reviews                  │
│   - list-staff                       │
└────────────┬────────────────────────┘
             │
        ┌────┴────┐
        ↓         ↓
┌───────────┐ ┌──────────────┐
│  OpenAI   │ │  PostgreSQL  │
│  API      │ │  + Triggers  │
└───────────┘ └──────────────┘
```

### 3.2 Structured Outputs Schema

**OpenAI API v1 con `response_format`:**
```typescript
{
  model: "gpt-4o-mini-2024-07-18",
  temperature: 0,  // Determinístico
  response_format: {
    type: "json_schema",
    json_schema: batchResponseSchema
  },
  messages: [...]
}
```

**Ventajas vs JSON mode clásico:**
- ✅ **Schema enforcement**: OpenAI garantiza el schema
- ✅ **No más errores de parsing**: JSON siempre válido
- ✅ **Type safety**: El response cumple el schema

**Schema completo:** Ver `supabase/functions/analyze-reviews/index.ts` líneas 40-132

### 3.3 Batch Processing

**Estrategia:**
```typescript
const ANALYZE_BATCH_SIZE = 5;  // Reviews por llamada

// Procesa en lotes para:
// 1. Reducir requests (costo)
// 2. Mejorar throughput
// 3. Compartir contexto entre reviews
```

**Balanceo:**
- **Batch muy grande** (20+): 
  - ❌ Timeout risk
  - ❌ Contexto diluido
  - ✅ Menor costo
  
- **Batch pequeño** (1-2):
  - ✅ Más rápido
  - ✅ Menos timeout
  - ❌ Mayor costo

- **Batch óptimo** (5): 🎯
  - Balance perfecto
  - ~3 segundos/batch
  - $0.15 por 1000 reviews

### 3.4 Rate Limiting

**Implementación proactiva:**
```typescript
// Cálculo previo de tokens
const estTokens = estimateBatchTokens(batch);

// Pacing basado en límites del tier
const minMsByTPM = (estTokens / TARGET_TPM) * 60_000;
const minMsByRPM = (1 / TARGET_RPM) * 60_000;

// Espera ANTES de llamar
await sleep(Math.max(minMsByTPM, minMsByRPM));
```

**+ Backoff exponencial reactivo:**
```typescript
if (response.status === 429) {
  const delay = Math.min(
    BACKOFF_BASE * Math.pow(2, attempt),
    BACKOFF_MAX
  );
  await sleep(delay);
  return retry(batch, attempt + 1);
}
```

**Headers de respuesta:**
```typescript
// OpenAI devuelve headers útiles
'x-ratelimit-remaining-requests': '3999'
'x-ratelimit-remaining-tokens': '1590000'
'x-ratelimit-reset-requests': '2s'  // Tiempo hasta reset
```

**Tier 2 limits:**
- **RPM**: 5,000 requests/minuto (usamos 4,000 como margen)
- **TPM**: 2M tokens/minuto (usamos 1.6M como margen)
- **Promedio**: ~400 reviews/minuto

### 3.5 Database Schema

**Tabla principal:**
```sql
CREATE TABLE reviews (
  id uuid PRIMARY KEY,
  review_text text,
  
  -- NLP outputs
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  aspects jsonb,                    -- Array de AspectAnalysis
  overall_score numeric,
  overall_sentiment_confidence numeric,
  gap_to_five boolean,
  gap_reasons text[],
  critical_flags text[],
  executive_summary text,
  action_items text[],
  staff_mentions jsonb,             -- Array de StaffMention
  language text,
  
  -- Metadata
  provider text,                    -- 'google', 'tripadvisor'
  external_place_id uuid,
  posted_at timestamptz,
  ...
);
```

**Tablas auxiliares (Staff):**
```sql
-- Staff normalizado
CREATE TABLE staff_members (
  id uuid PRIMARY KEY,
  external_place_id uuid,
  normalized_name text,             -- "María" (canónico)
  name_variations text[],           -- ["María", "Mari", "Marí"]
  total_mentions int,
  positive_mentions int,
  neutral_mentions int,
  negative_mentions int,
  UNIQUE (external_place_id, normalized_name)
);

-- Menciones individuales
CREATE TABLE staff_mentions (
  id uuid PRIMARY KEY,
  review_id uuid REFERENCES reviews(id),
  staff_member_id uuid REFERENCES staff_members(id),
  detected_name text,
  sentiment text,
  evidence_span text
);

-- Vista agregada
CREATE VIEW staff_performance_stats AS
SELECT 
  sm.*,
  ROUND((positive_mentions::numeric / total_mentions) * 100) as positive_rate
FROM staff_members sm;
```

**Trigger automático:**
```sql
CREATE TRIGGER sync_staff_mentions
AFTER INSERT OR UPDATE OF staff_mentions ON reviews
FOR EACH ROW
EXECUTE FUNCTION sync_staff_mentions_from_review();
```

**Flujo:**
1. Review se analiza → `staff_mentions` JSONB se llena
2. Trigger detecta cambio
3. Para cada mención:
   - Normaliza nombre
   - UPSERT en `staff_members` (incrementa contadores)
   - INSERT en `staff_mentions` (detalle)

**Ventajas:**
- ✅ Zero-latency: Agregaciones se calculan en INSERT
- ✅ Consistency: Triggers garantizan sincronía
- ✅ Queryability: Vistas pre-calculadas

---

## 4. Pipeline de Datos

### 4.1 Flujo Completo

```
1. INGESTION
   ├── ingest-google-reviews (Edge Function)
   ├── ingest-tripadvisor-reviews (Edge Function)
   └── INSERT reviews (sin análisis)

2. ANALYSIS TRIGGER
   ├── User clicks "Analizar Reviews"
   └── analyze-reviews (Edge Function)
       ├── SELECT reviews WHERE sentiment IS NULL
       ├── Batch de 5 reviews
       ├── POST OpenAI API
       ├── Parse Structured Output
       └── UPDATE reviews SET sentiment, aspects, staff_mentions...

3. STAFF SYNC (Automático)
   └── Trigger sync_staff_mentions_from_review()
       ├── Para cada staff_mention en JSONB
       ├── Normaliza nombre
       ├── UPSERT staff_members
       └── INSERT staff_mentions

4. AGGREGATIONS
   ├── Vista staff_performance_stats (auto-calculada)
   ├── Vista review_aspect_insights (agregación de aspects)
   └── Dashboard queries

5. FRONTEND
   └── React components consumen vistas/tablas
```

### 4.2 Data Flow Diagram

```
┌──────────────────────────────────────────────────┐
│  EXTERNAL SOURCES                                 │
│  ├── Google Maps API (DataForSEO)                │
│  └── TripAdvisor Scraping (DataForSEO)           │
└────────────────┬─────────────────────────────────┘
                 │ Raw JSON
                 ↓
┌──────────────────────────────────────────────────┐
│  INGESTION (Edge Functions)                       │
│  ├── Parse & Normalize                            │
│  ├── Detect duplicates (provider_review_id)      │
│  └── INSERT reviews (review_text, rating, etc)   │
└────────────────┬─────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────┐
│  STORAGE: reviews table                           │
│  ├── sentiment: NULL  ← Sin analizar              │
│  └── aspects: NULL                                │
└────────────────┬─────────────────────────────────┘
                 │
                 ↓ (Manual trigger)
┌──────────────────────────────────────────────────┐
│  ANALYSIS (analyze-reviews)                       │
│  ├── SELECT pending reviews                       │
│  ├── Batch processing (5 at a time)              │
│  ├── OpenAI Structured Outputs                   │
│  │   ├── ABSA                                    │
│  │   ├── Gap detection                           │
│  │   ├── Staff NER                               │
│  │   └── Summaries                               │
│  └── UPDATE reviews (sentiment, aspects, etc)    │
└────────────────┬─────────────────────────────────┘
                 │
                 ↓ (Automatic trigger)
┌──────────────────────────────────────────────────┐
│  STAFF SYNC (PostgreSQL Trigger)                 │
│  ├── Parse staff_mentions JSONB                  │
│  ├── normalize_staff_name()                      │
│  ├── UPSERT staff_members                        │
│  └── INSERT staff_mentions                       │
└────────────────┬─────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────┐
│  AGGREGATIONS & VIEWS                             │
│  ├── staff_performance_stats                     │
│  ├── review_aspect_insights                      │
│  └── Custom analytics queries                    │
└────────────────┬─────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────┐
│  FRONTEND (React Dashboard)                       │
│  ├── list-staff → staff_performance_stats        │
│  ├── Dashboard → aggregations                    │
│  └── Real-time updates                           │
└──────────────────────────────────────────────────┘
```

### 4.3 Timing Example

**Para 100 reviews:**
```
Ingestion:      ~30 segundos (API externa)
Analysis:       ~60 segundos (20 batches × 3s)
Staff Sync:     <1 segundo (trigger automático)
Dashboard:      <100ms (queries optimizadas)
──────────────────────────────────────────
TOTAL:          ~90 segundos end-to-end
```

---

## 5. Limitaciones Conocidas

### 5.1 Fuzzy Matching Simple

**Problema:**
```sql
normalize_staff_name('María José')  → 'María José'
normalize_staff_name('Marijose')    → 'Marijose'
-- Son la misma persona pero 2 registros ❌
```

**Impacto:** ~5-10% de duplicados en nombres compuestos

**Workaround actual:** Merge manual en DB

**Solución futura:** Levenshtein distance + clustering ML

---

### 5.2 No Entity Linking

**Problema:**
- Detección de "María" es independiente por review
- No hay "María ID" compartido entre reviews
- No se conecta con RRHH externo

**Impacto:** Desambiguación manual si hay 2 Marías

**Solución futura:** Entity linking con conocimiento externo

---

### 5.3 Taxonomía de Aspectos No Fija

**Problema:**
```json
// Review 1: "comida" → "sabor_delicioso"
// Review 2: "comida" → "sabor_excelente"
// Review 3: "comida" → "muy_rico"
// Son sinónimos pero 3 sub_aspects diferentes
```

**Impacto:** 
- Dificulta agregaciones exactas
- Requiere normalización post-procesamiento

**Trade-off:** 
- ❌ Pierde flexibilidad si fijas taxonomía
- ✅ Ganas consistencia

**Decisión actual:** Flexibilidad > Consistencia (es un MVP)

---

### 5.4 No Confidence Score en Staff

**Problema:**
```json
{
  "detected_name": "Mari",  // ¿Es María? ¿Es Mariana?
  // ❌ Falta: "confidence": 0.6
}
```

**Impacto:** False positives en nombres ambiguos

**Solución futura:** Agregar `confidence` al schema

---

### 5.5 Paginación Faltante en Mentions

**Problema:**
```typescript
// list-staff retorna TODAS las menciones
// Staff con 500 menciones → payload gigante
```

**Impacto:** Latencia y UX en staff muy mencionado

**Solución:** Query param `limit` y `offset`

---

### 5.6 No Temporal Patterns

**Problema:**
- No detecta "María antes buena, ahora mala"
- No hay trend analysis automático

**Impacto:** Insights reactivos, no predictivos

**Solución futura:** Time-series analysis + ML

---

### 5.7 Cold Start Problem

**Problema:**
- Primera review de un negocio → poco contexto
- OpenAI no conoce staff previo

**Impacto:** Primeras detecciones pueden ser menos precisas

**Mitigación:** Mejora con más reviews (efecto de red)

---

## 6. Mejoras Futuras

### Prioridad 1 (ROI Alto, Complejidad Baja)

#### 6.1 Paginación en Staff Mentions
**Qué:** `?limit=10&offset=0` en `list-staff` endpoint
**Por qué:** Mejor UX, menos latencia
**Esfuerzo:** 2 horas
**ROI:** ⭐⭐⭐⭐⭐

#### 6.2 Confidence Scores
**Qué:** Agregar `confidence: number` a staff_mentions
**Por qué:** Filtrar menciones dudosas
**Esfuerzo:** 3 horas
**ROI:** ⭐⭐⭐⭐

#### 6.3 Taxonomía de Aspectos
**Qué:** Post-procesamiento que normaliza sub_aspects
**Por qué:** Mejores agregaciones
**Esfuerzo:** 4 horas
**ROI:** ⭐⭐⭐⭐

---

### Prioridad 2 (ROI Medio, Complejidad Media)

#### 6.4 Levenshtein para Staff Names
**Qué:** `pg_trgm` extension + similarity threshold
**Por qué:** Menos duplicados (María José vs Marijose)
**Esfuerzo:** 6 horas
**ROI:** ⭐⭐⭐

#### 6.5 Alertas Automáticas
**Qué:** Email/SMS cuando `critical_flags` detectado
**Por qué:** Response time crítico
**Esfuerzo:** 8 horas
**ROI:** ⭐⭐⭐⭐

#### 6.6 Temporal Analysis
**Qué:** Detectar trends (staff mejorando/empeorando)
**Por qué:** Insights predictivos
**Esfuerzo:** 10 horas
**ROI:** ⭐⭐⭐

---

### Prioridad 3 (ROI Bajo, Complejidad Alta)

#### 6.7 Entity Linking Avanzado
**Qué:** Conectar menciones con KB externo (RRHH)
**Por qué:** Desambiguación perfecta
**Esfuerzo:** 2 semanas
**ROI:** ⭐⭐

#### 6.8 ML Clustering de Staff
**Qué:** Entrenar modelo para agrupar variaciones
**Por qué:** Automático vs manual
**Esfuerzo:** 3 semanas
**ROI:** ⭐⭐

#### 6.9 Multi-Modal Analysis
**Qué:** Analizar fotos de reviews (platos, ambiente)
**Por qué:** Insights visuales
**Esfuerzo:** 1 mes
**ROI:** ⭐

---

## 7. Ejemplos

### 7.1 Input → Output Completo

**Input (review real):**
```
"Fuimos a cenar con mi familia y la experiencia fue mixta. 
La pasta que pedí estaba deliciosa, muy bien sazonada y la 
porción generosa. Sin embargo, tardaron casi 40 minutos en 
traer los platos y María, nuestra mesera, aunque amable, 
parecía algo desorganizada. El ambiente es bonito y tranquilo, 
perfecto para familias. Los precios me parecieron justos. 
Volveríamos pero esperamos que mejoren la velocidad del servicio."

Rating: 4/5 estrellas
Provider: Google
```

**Output (JSON estructurado):**
```json
{
  "review_id": "550e8400-e29b-41d4-a716-446655440000",
  "language": "es",
  "sentiment": "positive",
  "overall_score": 0.72,
  "overall_sentiment_confidence": 0.85,
  
  "gap_to_five": true,
  "gap_reasons": [
    "Servicio lento (40 minutos)",
    "Mesera desorganizada"
  ],
  
  "critical_flags": [],
  
  "executive_summary": "Experiencia mixta: comida excelente y ambiente familiar agradable, pero servicio lento (40min) y staff algo desorganizado. Cliente satisfecho pero con margen de mejora en velocidad.",
  
  "action_items": [
    "Revisar tiempos de cocina en hora pico",
    "Capacitar staff en gestión de mesas",
    "Evaluar necesidad de más meseros"
  ],
  
  "staff_mentions": [
    {
      "detected_name": "María",
      "role": "Mesera",
      "sentiment": "neutral",
      "evidence_span": "María, nuestra mesera, aunque amable, parecía algo desorganizada"
    }
  ],
  
  "aspects": [
    {
      "aspect": "comida",
      "sub_aspect": "sabor_delicioso",
      "sentiment": "positive",
      "evidence_span": "la pasta estaba deliciosa, muy bien sazonada",
      "severity": 1,
      "gap_to_five_contrib": 0.0
    },
    {
      "aspect": "comida",
      "sub_aspect": "porción_generosa",
      "sentiment": "positive",
      "evidence_span": "la porción generosa",
      "severity": 1,
      "gap_to_five_contrib": 0.0
    },
    {
      "aspect": "servicio",
      "sub_aspect": "velocidad_lenta",
      "sentiment": "negative",
      "evidence_span": "tardaron casi 40 minutos en traer los platos",
      "severity": 2,
      "gap_to_five_contrib": 0.4
    },
    {
      "aspect": "servicio",
      "sub_aspect": "organización",
      "sentiment": "negative",
      "evidence_span": "parecía algo desorganizada",
      "severity": 2,
      "gap_to_five_contrib": 0.2
    },
    {
      "aspect": "servicio",
      "sub_aspect": "amabilidad",
      "sentiment": "positive",
      "evidence_span": "aunque amable",
      "severity": 1,
      "gap_to_five_contrib": 0.0
    },
    {
      "aspect": "ambiente",
      "sub_aspect": "tranquilo_familiar",
      "sentiment": "positive",
      "evidence_span": "bonito y tranquilo, perfecto para familias",
      "severity": 1,
      "gap_to_five_contrib": 0.0
    },
    {
      "aspect": "precio",
      "sub_aspect": "relación_calidad_precio",
      "sentiment": "positive",
      "evidence_span": "Los precios me parecieron justos",
      "severity": 1,
      "gap_to_five_contrib": 0.0
    }
  ]
}
```

**Agregación en DB:**
```sql
-- Esta review crea/actualiza:

-- 1. staff_members
INSERT INTO staff_members (normalized_name, ...)
VALUES ('María', ...)
ON CONFLICT (external_place_id, normalized_name)
DO UPDATE SET
  total_mentions = total_mentions + 1,
  neutral_mentions = neutral_mentions + 1;

-- 2. staff_mentions
INSERT INTO staff_mentions (detected_name, sentiment, ...)
VALUES ('María', 'neutral', ...);

-- 3. Dashboard queries
SELECT * FROM staff_performance_stats 
WHERE name = 'María';
-- Resultado: total_mentions: 15, neutral_mentions: 3, positive_rate: 80%
```

---

### 7.2 Batch Processing Example

**Input: 3 reviews simultáneas**
```json
{
  "analyses": [
    {"review_id": "1", "text": "Comida excelente..."},
    {"review_id": "2", "text": "Servicio lento..."},
    {"review_id": "3", "text": "María fue increíble..."}
  ]
}
```

**OpenAI call:**
```typescript
POST https://api.openai.com/v1/chat/completions
{
  "model": "gpt-4o-mini-2024-07-18",
  "temperature": 0,
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "ReviewsBatchAnalysis",
      "schema": { ... }
    }
  },
  "messages": [
    {
      "role": "system",
      "content": "Analista gastronómico..."
    },
    {
      "role": "user",
      "content": JSON.stringify({
        analyses: [
          {review_id: "1", text: "..."},
          {review_id: "2", text: "..."},
          {review_id: "3", text: "..."}
        ]
      })
    }
  ]
}
```

**Output: 3 análisis completos**
```json
{
  "analyses": [
    {
      "review_id": "1",
      "sentiment": "positive",
      "aspects": [...]
    },
    {
      "review_id": "2",
      "sentiment": "negative",
      "aspects": [...]
    },
    {
      "review_id": "3",
      "sentiment": "positive",
      "staff_mentions": [{
        "detected_name": "María",
        "sentiment": "positive"
      }]
    }
  ]
}
```

**Timing:**
- Request: ~200ms
- OpenAI processing: ~2.5 segundos
- Response: ~100ms
- DB update: ~50ms per review
- **Total: ~3 segundos para 3 reviews**

**Cost:**
- Input tokens: ~1,500 (3 reviews × 500 tokens)
- Output tokens: ~2,000 (structured output)
- Cost: ~$0.0005 (gpt-4o-mini)
- **~$0.17 por 1000 reviews**

---

## 8. Referencias

### Documentación OpenAI
- [Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create)
- [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Rate Limits](https://platform.openai.com/docs/guides/rate-limits)

### Conceptos NLP
- [ABSA Overview](https://arxiv.org/abs/1709.00893)
- [Named Entity Recognition](https://en.wikipedia.org/wiki/Named-entity_recognition)
- [Sentiment Analysis](https://en.wikipedia.org/wiki/Sentiment_analysis)

### Código del Proyecto
- `supabase/functions/analyze-reviews/index.ts` - Análisis completo
- `supabase/functions/list-staff/index.ts` - API de staff
- `supabase/migrations/20251017_add_staff_detection.sql` - Schema SQL
- `src/components/StaffDashboard.tsx` - Frontend

---

**Última actualización:** Octubre 17, 2025  
**Versión:** 1.0.0  
**Autor:** ReputacionLocal Team

