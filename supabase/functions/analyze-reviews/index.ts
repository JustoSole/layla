// supabase/functions/analyze-reviews/index.ts
import { admin, corsHeaders } from "../_shared/db.ts";
/** === OpenAI: Chat Completions API + Structured Outputs ===
 * Docs (oficial):
 * - Chat Completions: https://platform.openai.com/docs/api-reference/chat/create
 * - Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
 * - Rate limits: https://platform.openai.com/docs/guides/rate-limits
 * - Batch API (si luego lo usás): https://platform.openai.com/docs/api-reference/batch
 */ const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini-2024-07-18";
const OPENAI_MAX_RETRIES = Number(Deno.env.get("OPENAI_MAX_RETRIES") ?? "5");
const OPENAI_BACKOFF_BASE_MS = Number(Deno.env.get("OPENAI_BACKOFF_BASE_MS") ?? "500");
const OPENAI_BACKOFF_MAX_MS = Number(Deno.env.get("OPENAI_BACKOFF_MAX_MS") ?? "8000");
// Pacing objetivo (basado en tier 2: 5000 RPM, 2M TPM)
// Usamos 80% del límite para dejar margen de seguridad
const OPENAI_TARGET_RPM = Number(Deno.env.get("OPENAI_TARGET_RPM") ?? "4000");
const OPENAI_TARGET_TPM = Number(Deno.env.get("OPENAI_TARGET_TPM") ?? "1600000");
// Límites y tamaños (optimizados para Tier 2 - balance velocidad/calidad)
const DEFAULT_ANALYZE_LIMIT = Number(Deno.env.get("ANALYZE_DEFAULT_LIMIT") ?? "10");
const MAX_ANALYZE_LIMIT = Number(Deno.env.get("ANALYZE_MAX_LIMIT") ?? "500");
const ANALYZE_BATCH_SIZE = Math.max(1, Number(Deno.env.get("ANALYZE_BATCH_SIZE") ?? "5"));
const MAX_PER_PROVIDER_RATIO = Math.max(0.1, Math.min(0.9, Number(Deno.env.get("ANALYZE_PROVIDER_RATIO") ?? "0.5")));
const MAX_REVIEW_TEXT_LENGTH = Number(Deno.env.get("ANALYZE_MAX_REVIEW_LENGTH") ?? "1200");
const MAX_OUTPUT_TOKENS = Number(Deno.env.get("ANALYZE_MAX_OUTPUT_TOKENS") ?? "4096"); // Aumentado para 5 análisis completos
const POST_BATCH_DELAY_MS = Number(Deno.env.get("ANALYZE_POST_BATCH_DELAY_MS") ?? "50");
// DEBUG mínimo sin exponer toda la key
console.log('🤖 OpenAI Config:', {
  hasApiKey: !!OPENAI_API_KEY,
  keyPrefix: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 7) + '...' : 'MISSING',
  model: OPENAI_MODEL
});
// === JSON Schemas (Structured Outputs) ===
const analysisItemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    review_id: {
      type: "string"
    },
    language: {
      type: "string"
    },
    sentiment: {
      type: "string",
      enum: [
        "positive",
        "neutral",
        "negative"
      ]
    },
    overall_score: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    overall_sentiment_confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    gap_to_five: {
      type: "boolean"
    },
    gap_reasons: {
      type: "array",
      items: {
        type: "string"
      }
    },
    critical_flags: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "higiene",
          "intoxicacion",
          "trato_agresivo",
          "fraude",
          "seguridad",
          "queja_recurrente"
        ]
      }
    },
    executive_summary: {
      type: "string"
    },
    action_items: {
      type: "array",
      items: {
        type: "string"
      }
    },
    staff_mentions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          detected_name: {
            type: "string"
          },
          role: {
            type: "string"
          },
          sentiment: {
            type: "string",
            enum: [
              "positive",
              "neutral",
              "negative"
            ]
          },
          evidence_span: {
            type: "string"
          }
        },
        required: [
          "detected_name",
          "role",
          "sentiment",
          "evidence_span"
        ]
      }
    },
    aspects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          aspect: {
            type: "string"
          },
          sub_aspect: {
            type: "string"
          },
          sentiment: {
            type: "string",
            enum: [
              "positive",
              "neutral",
              "negative"
            ]
          },
          evidence_spans: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Array de citas textuales (≤20 palabras cada una) donde se menciona este aspecto. Si el mismo subtema aparece múltiples veces, incluir todas las evidencias aquí."
          },
          severity: {
            type: "number",
            minimum: 1,
            maximum: 3
          },
          gap_to_five_contrib: {
            type: "number",
            minimum: 0,
            maximum: 1
          }
        },
        required: [
          "aspect",
          "sub_aspect",
          "sentiment",
          "evidence_spans",
          "severity",
          "gap_to_five_contrib"
        ]
      }
    }
  },
  required: [
    "review_id",
    "language",
    "sentiment",
    "overall_score",
    "overall_sentiment_confidence",
    "gap_to_five",
    "gap_reasons",
    "critical_flags",
    "executive_summary",
    "action_items",
    "staff_mentions",
    "aspects"
  ]
};
const batchResponseSchema = {
  name: "ReviewsBatchAnalysis",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      analyses: {
        type: "array",
        items: analysisItemSchema
      }
    },
    required: [
      "analyses"
    ]
  },
  strict: true
};
// === Prompt del sistema (ABSA restaurantes) ===
const SYSTEM_PROMPT = `
Sos un analista gastronómico especializado en Argentina. Analizás reviews de restaurantes argentinos.

CONTEXTO: Argentina, español rioplatense. Entendé modismos locales:

REGLA CRÍTICA - ANÁLISIS GRAMATICAL (Argentina):
Distinción entre SUSTANTIVO (persona) vs ADJETIVO (tamaño):

CASO 1 - SUSTANTIVO = STAFF (persona del personal):
Cuando "chico/chica/chicos/chicas" actúa como SUSTANTIVO (con artículo, es el sujeto):
  ✓ "el chico muy atento" → servicio/personal
  ✓ "la chica que nos atendió" → servicio/personal
  ✓ "los chicos son re copados" → servicio/personal
  ✓ "las chicas del lugar" → servicio/personal
  ✓ "un chico nos atendió" → servicio/personal

CASO 2 - ADJETIVO = TAMAÑO (modifica un sustantivo de objeto/lugar):
Cuando "chico/chica" actúa como ADJETIVO (describe/modifica otro sustantivo):
  ✓ "porción chica" → comida/porciones (ADJETIVO modifica "porción")
  ✓ "el plato chico" → comida/porciones (ADJETIVO modifica "plato")
  ✓ "lugar chico" → ambiente/espacio (ADJETIVO modifica "lugar")
  ✓ "local muy chico" → ambiente/espacio (ADJETIVO modifica "local")
  ✓ "es chico el lugar" → ambiente/espacio (ADJETIVO predicativo)

CLAVE: Si hay un SUSTANTIVO (porción/plato/lugar/local) + chico/chica → es TAMAÑO
        Si NO hay sustantivo y "el/la/los/las chico/a/s" es el sujeto → es STAFF

Otros modismos:
- "copado", "genial", "bárbaro", "re bueno" = muy positivo
- "piola", "zafó", "safable" = aceptable/pasable
- "una bosta", "malísimo", "horrible" = muy negativo
- "rico" = sabroso/delicioso

CAMPOS REQUERIDOS:
- language: código ISO (mayormente 'es' para español)
- sentiment: global (positive/neutral/negative)
- overall_score: 0-1 (0=muy crítico, 1=muy entusiasta)
- overall_sentiment_confidence: 0-1 (certeza del análisis)
- gap_to_five: true si rating ≥4★ o positivo PERO menciona mejoras concretas
- gap_reasons: mejoras específicas mencionadas (máximo 3)
- critical_flags: problemas graves (higiene, intoxicacion, trato_agresivo, fraude, seguridad, queja_recurrente)
- executive_summary: resumen ejecutivo ≤260 caracteres
- action_items: 1-3 acciones concretas recomendadas para mejora

Staff mentions (array) - Detecta empleados mencionados por nombre:
- detected_name: nombre exacto como aparece (ej: "María", "Juan Pérez", "el Chef Carlos")
- role: rol/puesto si se menciona (mesero, hostess, chef, bartender, gerente, etc). Si no se menciona, usar string vacío ""
- sentiment: positivo/neutral/negativo EN ESE CONTEXTO específico
- evidence_span: cita exacta <=25 palabras donde se menciona
IMPORTANTE: Solo incluir personas reales del staff mencionadas por nombre (no "el mesero" o "la cajera" sin nombre).
Detecta variaciones: María/Mari/Marí, Juan/Juanito, etc.

Aspects (array):
- aspect: CATEGORIA PRINCIPAL (servicio, comida, precio, ambiente, limpieza, porciones, etc)
- sub_aspect: DESCRIPTOR ESPECÍFICO en snake_case que agrega valor diferenciador
- sentiment: del aspecto
- evidence_spans: ARRAY de citas (<=20 palabras cada una). Si el mismo sub_aspect aparece múltiples veces en la reseña, NO crear entradas duplicadas - en su lugar, agregar TODAS las menciones/evidencias en este array
- severity: 1-3 (severidad general del aspecto, considerando todas las menciones)
- gap_to_five_contrib: 0-1 (contribución general considerando todas las menciones)

REGLAS CRÍTICAS PARA SUB-ASPECTOS:

0. NO DUPLICAR SUB-ASPECTOS: Si el mismo sub_aspect se menciona varias veces en una reseña, crear UNA SOLA entrada en el array aspects con TODAS las evidencias en evidence_spans. Por ejemplo:
   ✓ CORRECTO: {aspect: "servicio", sub_aspect: "personal", evidence_spans: ["el chico muy atento", "la chica que nos atendió súper amable"], sentiment: "positive"}
   ✗ INCORRECTO: DOS entradas separadas del mismo servicio/personal

1. CONSOLIDA sinónimos y conceptos similares en UN SOLO sub-aspecto GENERAL:
   ✓ "atención", "amabilidad", "trato", "cordialidad", "los chicos" → personal
   ✓ "rápido", "lento", "espera", "demora", "eficiente" → velocidad
   ✓ "rico", "sabroso", "delicioso", "mal sabor" → sabor
   ✗ NO crear sub-aspectos ultra-específicos: "atencion_buena", "trato_amable", "velocidad_rapida" (redundante)

2. INTERPRETÁ CONTEXTO usando ANÁLISIS GRAMATICAL (Argentina):
   
   PRIORIDAD: Detectá si "chico/chica" es SUSTANTIVO o ADJETIVO:
   
   ✓ SUSTANTIVO (sujeto de la oración) → STAFF (persona)
     "el chico", "la chica", "los chicos", "las chicas", "un chico nos atendió"
     → aspect: servicio, sub_aspect: personal
   
   ✓ ADJETIVO (modifica otro sustantivo) → TAMAÑO (objeto/lugar/comida)
     "porción chica", "el plato chico", "lugar chico", "local chico"
     → aspect: comida/porciones O ambiente/espacio (según qué modifica)
   
   Otros términos de tamaño:
   ✓ "porción grande/abundante/generosa" → comida/porciones
   ✓ "lugar grande/amplio/espacioso" → ambiente/espacio
   ✓ "porción pequeña/chica/escasa" → comida/porciones
   ✓ "lugar pequeño/chico/reducido" → ambiente/espacio

3. EVITÁ fragmentación innecesaria:
   ✓ CORRECTO: servicio + personal (menciones: 35)
   ✗ INCORRECTO: servicio + atencion (18), servicio + atencion_amable (5), servicio + trato (9)
   
4. USÁS sub-aspectos GENERALES, NO ultra-específicos:
   ✓ SÍ: servicio + velocidad (incluye rápido Y lento, el sentiment indica si es positivo/negativo)
   ✓ SÍ: servicio + personal (incluye amabilidad, trato, atención)
   ✓ SÍ: comida + porciones (incluye grande Y chico, el sentiment indica satisfacción)
   ✗ NO: servicio + velocidad_rapida, servicio + velocidad_lenta (redundante con sentiment)

5. VOCABULARIO ESTANDARIZADO (sub-aspectos GENERALES y CONSOLIDADOS):
   
   SERVICIO:
   - personal (trato, amabilidad, cordialidad, "el/la chico/a", "los/las chicos/as", atento, mala onda)
   - velocidad (rápido, lento, demora, eficiente, espera larga)
   - profesionalismo (experiencia, conocimiento, capacitación)
   
   COMIDA:
   - sabor (rico, delicioso, sabroso, mal sabor, insípido)
   - temperatura (frío, caliente, tibio)
   - frescura (fresco, pasado, viejo)
   - presentacion (visual, plato, montaje)
   - calidad (ingredientes, productos, calidad general)
   - porciones (grande, chica, abundante, escasa - la COMIDA, NO el personal)
   
   AMBIENTE:
   - ruido (ruidoso, bullicio, tranquilo, música alta)
   - iluminacion (luz, oscuro, luminoso, tenue)
   - decoracion (estilo, deco, lindo, feo)
   - limpieza (limpio, sucio, descuidado)
   - espacio (amplio, chico, grande, pequeño - el LUGAR, NO el personal)
   
   PRECIO:
   - valor (relación calidad-precio, vale la pena, caro, barato, accesible, costoso)

6. Si NO hay sub-aspecto claro útil, déjalo vacío o usá "general"

RECORDÁ: Priorizá CONSOLIDACIÓN sobre fragmentación. Es mejor tener pocos sub-aspectos con muchas menciones que muchos sub-aspectos con pocas menciones cada uno.
`.trim();
// === Utilidades ===
function sleep(ms) {
  return new Promise((r)=>setTimeout(r, ms));
}
function sanitizeReviewText(text) {
  // Sanitizar texto para evitar problemas con JSON
  return text.replace(/\\/g, '\\\\') // Escapar backslashes primero
  .replace(/"/g, '\\"') // Escapar comillas dobles
  .replace(/\n/g, ' ') // Reemplazar saltos de línea con espacio
  .replace(/\r/g, ' ') // Reemplazar retornos de carro
  .replace(/\t/g, ' ') // Reemplazar tabs
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u001F]/g, '') // Remover caracteres de control (intencional)
  .trim();
}
function truncateReviewText(text) {
  const sanitized = sanitizeReviewText(text);
  if (sanitized.length <= MAX_REVIEW_TEXT_LENGTH) return sanitized;
  return sanitized.slice(0, MAX_REVIEW_TEXT_LENGTH) + "...";
}
function normalizeProvider(p) {
  if (!p) return "unknown";
  const lower = p.toLowerCase();
  if (lower.includes("google")) return "google";
  if (lower.includes("trip")) return "tripadvisor";
  return lower;
}
function buildProviderBuckets(reviews) {
  const groups = {};
  for (const r of reviews){
    const key = normalizeProvider(r.provider);
    (groups[key] ??= []).push(r);
  }
  return {
    preferredMaxPerProvider: Math.max(1, Math.round(ANALYZE_BATCH_SIZE * MAX_PER_PROVIDER_RATIO)),
    groups
  };
}
function takeBatch(b, batchSize) {
  const result = [];
  const providers = Object.keys(b.groups).filter((k)=>b.groups[k].length > 0);
  if (!providers.length) return result;
  const gQ = b.groups["google"] ?? [];
  const tQ = b.groups["tripadvisor"] ?? [];
  const gQuota = Math.min(gQ.length, Math.round(batchSize * MAX_PER_PROVIDER_RATIO));
  const tQuota = Math.min(tQ.length, Math.round(batchSize * (1 - MAX_PER_PROVIDER_RATIO)));
  if (gQuota > 0) result.push(...gQ.splice(0, gQuota));
  if (tQuota > 0) result.push(...tQ.splice(0, tQuota));
  const ordered = providers.filter((p)=>p !== "google" && p !== "tripadvisor").sort((a, b2)=>b.groups[b2].length - b.groups[a].length);
  const fillQueues = [
    gQ,
    tQ,
    ...ordered.map((p)=>b.groups[p])
  ];
  for (const q of fillQueues){
    while(result.length < batchSize && q.length > 0)result.push(q.shift());
    if (result.length >= batchSize) break;
  }
  return result;
}
// === Estimación de tokens para pacing (aprox 4 chars/token) ===
function estTokensFromChars(chars) {
  return Math.ceil(chars / 4);
}
function estimateBatchTokens(batch) {
  const sys = SYSTEM_PROMPT.length;
  const userPayload = JSON.stringify({
    analyses: batch.map((i)=>({
        review_id: i.id,
        text: truncateReviewText(i.text)
      }))
  }).length;
  const overhead = 1200; // margen por schema/serialización
  return estTokensFromChars(sys + userPayload + overhead) + MAX_OUTPUT_TOKENS;
}
// === Respeta sugerencias de rate limit por respuesta (headers) ===
async function respectRateLimitHints(res) {
  const remReq = Number(res.headers.get("x-ratelimit-remaining-requests"));
  const resetReq = Number(res.headers.get("x-ratelimit-reset-requests"));
  if (Number.isFinite(remReq) && remReq <= 1) {
    const waitMs = Number.isFinite(resetReq) ? Math.max(resetReq * 1000, OPENAI_BACKOFF_BASE_MS) : OPENAI_BACKOFF_BASE_MS;
    console.warn(`⏱️ Requests casi agotados. Esperando ${waitMs}ms`);
    await sleep(waitMs);
  }
  const remTok = Number(res.headers.get("x-ratelimit-remaining-tokens"));
  const resetTok = Number(res.headers.get("x-ratelimit-reset-tokens"));
  if (Number.isFinite(remTok) && remTok <= 1000) {
    const waitMs = Number.isFinite(resetTok) ? Math.max(resetTok * 1000, OPENAI_BACKOFF_BASE_MS) : OPENAI_BACKOFF_BASE_MS;
    console.warn(`⏱️ Tokens casi agotados. Esperando ${waitMs}ms`);
    await sleep(waitMs);
  }
}
// === Backoff exponencial con jitter y soporte de Retry-After ===
function calculateBackoff(attempt, retryAfterHeader) {
  if (retryAfterHeader) {
    const s = Number(retryAfterHeader);
    if (Number.isFinite(s)) return Math.min(s * 1000, OPENAI_BACKOFF_MAX_MS);
  }
  const exp = OPENAI_BACKOFF_BASE_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 250;
  return Math.min(exp + jitter, OPENAI_BACKOFF_MAX_MS);
}
// === Llamada a OpenAI con pacing proactivo (RPM/TPM) ===
async function callOpenAIBatch(batch, attempt = 0) {
  // Pacing previo para no golpear la ventana
  const est = estimateBatchTokens(batch);
  const minMsByTPM = Math.ceil(est / OPENAI_TARGET_TPM * 60_000);
  const minMsByRPM = Math.ceil(1 / OPENAI_TARGET_RPM * 60_000);
  const preWait = Math.max(minMsByTPM, minMsByRPM);
  if (preWait > 0) await sleep(preWait);
  const body = {
    model: OPENAI_MODEL,
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: batchResponseSchema
    },
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: `Analizá TODAS las siguientes ${batch.length} reviews y devolvé UN análisis por cada una en el array 'analyses':\n\n` + JSON.stringify({
          analyses: batch.map((it)=>({
              review_id: it.id,
              text: truncateReviewText(it.text)
            }))
        })
      }
    ]
  };
  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (response.status === 429 || response.status === 503) {
      if (attempt >= OPENAI_MAX_RETRIES) {
        const detail = await response.text();
        throw new Error(`OpenAI rate limit tras ${OPENAI_MAX_RETRIES} reintentos: ${detail}`);
      }
      const delay = calculateBackoff(attempt, response.headers.get("retry-after"));
      console.warn(`⚠️ Rate limit (${response.status}). Retry ${attempt + 1}/${OPENAI_MAX_RETRIES} en ${delay}ms`);
      await sleep(delay);
      return callOpenAIBatch(batch, attempt + 1);
    }
    if (!response.ok) {
      const t = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${t}`);
    }
    const data = await response.json();
    // Chat Completions API siempre devuelve en choices[0].message.content
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error("❌ Respuesta OpenAI sin contenido:", JSON.stringify(data));
      throw new Error("No content received from OpenAI");
    }
    await respectRateLimitHints(response);
    // Parse JSON con mejor manejo de errores
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      console.error("❌ Error parseando JSON de OpenAI:");
      console.error("Content (primeros 500 chars):", content.substring(0, 500));
      console.error("Parse error:", parseErr);
      throw new Error(`JSON parsing failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }
    if (!parsed || !Array.isArray(parsed.analyses)) {
      console.error("❌ Estructura inválida:", JSON.stringify(parsed).substring(0, 200));
      throw new Error("Respuesta OpenAI inválida: falta 'analyses'");
    }
    for (const item of parsed.analyses){
      if (item.overall_score !== undefined) {
        item.overall_score = Math.min(1, Math.max(0, Number(item.overall_score)));
      }
      if (item.overall_sentiment_confidence !== undefined) {
        item.overall_sentiment_confidence = Math.min(1, Math.max(0, Number(item.overall_sentiment_confidence)));
      }
      if (Array.isArray(item.aspects)) {
        item.aspects = item.aspects.map((aspect)=>({
            ...aspect,
            severity: aspect.severity !== undefined ? Math.min(3, Math.max(1, Number(aspect.severity))) : undefined,
            gap_to_five_contrib: aspect.gap_to_five_contrib !== undefined ? Math.min(1, Math.max(0, Number(aspect.gap_to_five_contrib))) : undefined
          }));
      }
    }
    if (POST_BATCH_DELAY_MS > 0) {
      await sleep(POST_BATCH_DELAY_MS);
    }
    return parsed;
  } catch (err) {
    if (attempt < OPENAI_MAX_RETRIES) {
      const delay = calculateBackoff(attempt);
      console.warn(`⚠️ Error OpenAI (intento ${attempt + 1}). Reintento en ${delay}ms`, err);
      await sleep(delay);
      return callOpenAIBatch(batch, attempt + 1);
    }
    throw err;
  }
}
// === Handler principal ===
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    if (!OPENAI_API_KEY) {
      return new Response("OPENAI_API_KEY no configurado", {
        status: 500,
        headers: corsHeaders
      });
    }
    const { external_place_id, limit } = await req.json();
    if (!external_place_id) {
      return new Response("external_place_id requerido", {
        status: 400,
        headers: corsHeaders
      });
    }
    // 1) Traer reseñas sin análisis previos (sentiment/aspects null)
    const rawLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(parseInt(String(limit), 10), 1), MAX_ANALYZE_LIMIT) : DEFAULT_ANALYZE_LIMIT;
    // Máx 5 lotes por invocación para no saturar
    const parsedLimit = Math.min(rawLimit, ANALYZE_BATCH_SIZE * 5);
    const { data: reviews, error } = await admin.from("reviews").select("id, provider, review_text, original_review_text, sentiment, aspects, overall_score, overall_sentiment_confidence, gap_to_five, gap_reasons, critical_flags, executive_summary, action_items, staff_mentions").eq("external_place_id", external_place_id).or("sentiment.is.null,aspects.is.null,overall_score.is.null,overall_sentiment_confidence.is.null,gap_to_five.is.null,gap_reasons.is.null,critical_flags.is.null,executive_summary.is.null,action_items.is.null,staff_mentions.is.null").order("posted_at", {
      ascending: false,
      nullsFirst: false
    }).limit(parsedLimit);
    if (error) throw error;
    const pending = [];
    for (const row of reviews ?? []){
      const already = row.sentiment && row.aspects && row.overall_score !== null && row.overall_sentiment_confidence !== null && row.gap_to_five !== null && row.gap_reasons !== null && row.critical_flags !== null && row.executive_summary !== null && row.action_items !== null && row.staff_mentions !== null;
      if (already) continue;
      const textRaw = (row.review_text || row.original_review_text || "").trim();
      if (!textRaw) continue;
      pending.push({
        id: row.id,
        provider: normalizeProvider(row.provider),
        text: textRaw
      });
    }
    if (pending.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        analyzed: 0,
        total_reviews_found: 0,
        processed_reviews: []
      }), {
        headers: {
          ...corsHeaders,
          "content-type": "application/json"
        }
      });
    }
    
    console.log(`📊 Encontradas ${pending.length} reviews pendientes de análisis`);
    
    const buckets = buildProviderBuckets(pending);
    let updated = 0;
    let iterations = 0;
    const processed_reviews = [];
    const debugSteps: string[] = [];
    
    while(true){
      iterations++;
      const batch = takeBatch(buckets, ANALYZE_BATCH_SIZE);
      debugSteps.push(`Iter${iterations}: takeBatch returned ${batch.length}`);
      console.log(`🔄 takeBatch retornó ${batch.length} reviews`);
      if (batch.length === 0) {
        debugSteps.push(`Iter${iterations}: Batch vacío, break`);
        console.log('⚠️  Batch vacío, saliendo del loop');
        break;
      }
      
      console.log(`🔄 Procesando batch de ${batch.length} reviews`);
      debugSteps.push(`Iter${iterations}: Procesando ${batch.length} reviews`);
      
      try {
        const ai = await callOpenAIBatch(batch);
        debugSteps.push(`Iter${iterations}: OpenAI retornó ${ai?.analyses?.length || 0} análisis (esperaba ${batch.length})`);
        console.log(`✅ OpenAI respondió con ${ai?.analyses?.length || 0} análisis`);
        
        const analyses = Array.isArray(ai?.analyses) ? ai.analyses : [];
        const map = new Map();
        for (const it of analyses)if (it?.review_id) map.set(String(it.review_id), it);
        
        console.log(`📝 Mapeadas ${map.size} análisis por review_id`);
        
        // DEBUG: Si OpenAI no retornó todos los análisis, loguear
        if (analyses.length < batch.length) {
          debugSteps.push(`⚠️ OpenAI NO retornó todos los análisis: ${analyses.length}/${batch.length}`);
          console.warn(`⚠️ OpenAI retornó menos análisis de los esperados: ${analyses.length}/${batch.length}`);
        }
        
        let saved_this_batch = 0;
        for (const review of batch){
          const analysis = map.get(review.id);
          if (!analysis) {
            debugSteps.push(`⚠️ review ${review.id.substring(0,8)} NO tiene analysis en map`);
            console.warn(`⚠️  No se encontró análisis para review ${review.id}`);
            continue;
          }
          const { sentiment = null, aspects = null, language = null, overall_score = null, overall_sentiment_confidence = null, gap_to_five = null, gap_reasons = null, critical_flags = null, executive_summary = null, action_items = null, staff_mentions = null } = analysis;
          const { error: updErr } = await admin.from("reviews").update({
            sentiment: sentiment ?? null,
            aspects: aspects ?? null,
            language: language ?? null,
            overall_score: overall_score ?? null,
            overall_sentiment_confidence: overall_sentiment_confidence ?? null,
            gap_to_five: gap_to_five ?? null,
            gap_reasons: gap_reasons ?? null,
            critical_flags: critical_flags ?? null,
            executive_summary: executive_summary ?? null,
            action_items: action_items ?? null,
            staff_mentions: staff_mentions ?? null
          }).eq("id", review.id);
          if (updErr) {
            debugSteps.push(`❌ Error guardando ${review.id.substring(0,8)}: ${updErr.message || 'unknown'}`);
            console.error(`❌ Error update ${review.id}:`, updErr);
            continue;
          }
          updated++;
          saved_this_batch++;
          processed_reviews.push({
            review_id: review.id,
            sentiment: sentiment ?? null,
            aspects_count: Array.isArray(aspects) ? aspects.length : 0,
            gap_to_five: gap_to_five ?? null,
            overall_score: overall_score ?? null
          });
          console.log(`✅ Analyzed ${review.id}: ${sentiment} (${Array.isArray(aspects) ? aspects.length : 0} aspects)`);
        }
        debugSteps.push(`Iter${iterations}: Guardadas ${saved_this_batch} reviews en BD`);
      } catch (batchErr) {
        console.error("❌ Error procesando batch:", batchErr);
        console.error("Stack:", batchErr instanceof Error ? batchErr.stack : 'No stack');
        // No hacer continue aquí - lanzar el error para que el usuario lo vea
        throw batchErr;
      }
    }
    console.log(`🏁 Finalizando: ${updated} analizadas de ${pending.length} encontradas`);
    
    // DEBUG: Agregar info para diagnosticar
    const debugInfo = {
      iterations,
      buckets_providers: Object.keys(buckets.groups),
      buckets_sizes_after: Object.fromEntries(Object.entries(buckets.groups).map(([k, v]) => [k, v.length])),
      analyze_batch_size: ANALYZE_BATCH_SIZE,
      steps: debugSteps
    };
    
    return new Response(JSON.stringify({
      ok: true,
      analyzed: updated,
      total_reviews_found: pending.length,
      processed_reviews,
      debug: debugInfo
    }), {
      headers: {
        ...corsHeaders,
        "content-type": "application/json"
      }
    });
  } catch (e) {
    console.error("Error in analyze-reviews function:", e);
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return new Response(JSON.stringify({
      ok: false,
      error: msg
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
