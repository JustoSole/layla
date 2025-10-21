// Utilidades para análisis de Gap to Five Stars

export interface GapReason {
  text: string;
  count: number;
  avgCurrentRating: number;
  relatedAspect: string;
  percentage: number;
}

export interface QuickWin {
  category: string;
  issue: string;
  mentions: number;
  avgRating: number;
  potentialImpact: string;
  potentialImpactNumeric: number;
  effort: 'low' | 'medium' | 'high';
  reviews: any[];
  suggestedAction: string;
  priority: number;
}

export interface GapAnalysis {
  totalReviews: number;
  gapToFiveCount: number;
  gapPercentage: number;
  currentRating: number;
  potentialRating: number;
  potentialIncrease: number;
  topGapReasons: GapReason[];
  quickWins: QuickWin[];
}

/**
 * Analiza las reviews con gap_to_five para encontrar oportunidades
 */
export function analyzeGapToFive(reviews: any[]): GapAnalysis {
  // Buscar reviews con gap > 0 (pueden mejorar)
  const gapReviews = reviews.filter(r => 
    typeof r.gap_to_five === 'number' ? r.gap_to_five > 0 : r.gap_to_five === true
  );
  
  // Mapear todas las razones
  const reasonsMap = new Map<string, { 
    count: number; 
    ratings: number[]; 
    aspects: Set<string>;
  }>();
  
  gapReviews.forEach(review => {
    const reasons = review.gap_reasons || [];
    reasons.forEach((reason: string) => {
      if (!reasonsMap.has(reason)) {
        reasonsMap.set(reason, { count: 0, ratings: [], aspects: new Set() });
      }
      const data = reasonsMap.get(reason)!;
      data.count++;
      data.ratings.push(review.rating_value || review.rating || 4);
      
      // Relacionar con aspectos
      const aspects = review.aspects || [];
      aspects.forEach((asp: any) => {
        if (asp.gap_to_five_contrib && asp.gap_to_five_contrib > 0.2) {
          data.aspects.add(asp.aspect);
        }
      });
    });
  });
  
  // Top reasons
  const topGapReasons: GapReason[] = Array.from(reasonsMap.entries())
    .map(([text, data]) => ({
      text,
      count: data.count,
      avgCurrentRating: data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length,
      relatedAspect: Array.from(data.aspects)[0] || 'general',
      percentage: (data.count / gapReviews.length) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Calcular ratings
  const currentRating = calculateCurrentRating(reviews);
  const potentialRating = projectRatingIfGapsClosed(reviews, gapReviews);
  
  // Quick wins
  const quickWins = calculateQuickWins(topGapReasons, reviews, gapReviews);
  
  return {
    totalReviews: reviews.length,
    gapToFiveCount: gapReviews.length,
    gapPercentage: (gapReviews.length / reviews.length) * 100,
    currentRating,
    potentialRating,
    potentialIncrease: potentialRating - currentRating,
    topGapReasons,
    quickWins
  };
}

function calculateCurrentRating(reviews: any[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + (r.rating_value || r.rating || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

function projectRatingIfGapsClosed(allReviews: any[], gapReviews: any[]): number {
  if (allReviews.length === 0) return 0;
  
  // Simulación: si todos los gap reviews subieran a 5★
  const currentTotal = allReviews.reduce((sum, r) => sum + (r.rating_value || r.rating || 0), 0);
  const gapCurrentTotal = gapReviews.reduce((sum, r) => sum + (r.rating_value || r.rating || 0), 0);
  const gapPotentialTotal = gapReviews.length * 5;
  
  const projectedTotal = currentTotal - gapCurrentTotal + gapPotentialTotal;
  return Math.round((projectedTotal / allReviews.length) * 10) / 10;
}

function calculateQuickWins(
  reasons: GapReason[],
  allReviews: any[],
  gapReviews: any[]
): QuickWin[] {
  return reasons.map((reason) => {
    const relatedReviews = gapReviews.filter(r => 
      (r.gap_reasons || []).includes(reason.text)
    );
    
    const avgRating = reason.avgCurrentRating;
    const potentialImpactNumeric = ((5 - avgRating) * relatedReviews.length) / allReviews.length;
    
    // Estimar esfuerzo basado en el aspecto
    const effort = estimateEffort(reason.relatedAspect, reason.text);
    
    // Calcular prioridad (impacto / esfuerzo)
    const effortWeight = effort === 'low' ? 1 : effort === 'medium' ? 2 : 3;
    const priority = potentialImpactNumeric / effortWeight;
    
    return {
      category: reason.relatedAspect,
      issue: reason.text,
      mentions: reason.count,
      avgRating,
      potentialImpact: `+${potentialImpactNumeric.toFixed(2)}`,
      potentialImpactNumeric,
      effort,
      reviews: relatedReviews,
      suggestedAction: generateActionSuggestion(reason.text, reason.relatedAspect),
      priority
    };
  })
  .sort((a, b) => b.priority - a.priority)
  .slice(0, 5);
}

function estimateEffort(aspect: string, issue: string): 'low' | 'medium' | 'high' {
  const lowEffortKeywords = ['wifi', 'música', 'iluminación', 'señalización', 'menú', 'carta'];
  const highEffortKeywords = ['personal', 'capacitación', 'cocina', 'infraestructura', 'remodelación'];
  
  const combined = `${aspect} ${issue}`.toLowerCase();
  
  if (lowEffortKeywords.some(kw => combined.includes(kw))) return 'low';
  if (highEffortKeywords.some(kw => combined.includes(kw))) return 'high';
  return 'medium';
}

function generateActionSuggestion(issue: string, aspect: string): string {
  const suggestions: Record<string, string> = {
    'servicio': 'Revisar protocolos de atención y capacitar al personal',
    'tiempo': 'Optimizar procesos en horarios pico',
    'comida': 'Revisar calidad y consistencia de preparación',
    'precio': 'Evaluar relación calidad-precio y comunicar valor',
    'ambiente': 'Mejorar condiciones de confort y decoración',
    'limpieza': 'Reforzar protocolos de higiene y mantenimiento',
    'wifi': 'Mejorar velocidad y cobertura de internet',
    'estacionamiento': 'Facilitar información sobre opciones de estacionamiento'
  };
  
  const aspectLower = aspect.toLowerCase();
  for (const [key, suggestion] of Object.entries(suggestions)) {
    if (aspectLower.includes(key)) return suggestion;
  }
  
  return `Implementar mejoras relacionadas con "${issue}"`;
}

/**
 * Genera datos mock para desarrollo
 */
// ==========================================
// ANÁLISIS PROFUNDO DE ASPECTOS
// ==========================================

export interface SubTopic {
  name: string;
  count: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positivePercentage: number;
  keywords: string[];
  topPositiveCitations: string[];
  topNegativeCitations: string[];
  priority: 'strength' | 'quick_win' | 'mixed' | 'low_signal';
  insight: string;
}

export interface AspectDeepAnalysis {
  aspect: string;
  totalMentions: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  subTopics: SubTopic[];
  hasEnoughData: boolean;
  allEvidenceSpans: Array<{ text: string; sentiment: string; rating?: number }>;
}

/**
 * Extrae y agrupa evidence_spans por aspecto, incluyendo sub_aspect
 */
export function extractAspectEvidence(reviews: any[]): Map<string, Array<{ 
  text: string; 
  sentiment: string; 
  rating: number;
  sub_aspect?: string; 
}>> {
  const aspectMap = new Map<string, Array<{ 
    text: string; 
    sentiment: string; 
    rating: number;
    sub_aspect?: string;
  }>>();
  
  reviews.forEach(review => {
    const aspects = review.aspects || [];
    const rating = review.rating_value || review.rating || 5;
    
    aspects.forEach((asp: any) => {
      const aspectName = asp.aspect?.toLowerCase() || 'general';
      const evidences = Array.isArray(asp.evidence_spans) ? asp.evidence_spans : (asp.evidence_span ? [asp.evidence_span] : []); // Backward compatibility
      const sentiment = asp.sentiment || 'neutral';
      const subAspect = asp.sub_aspect; // ✨ Nuevo: clasificación inteligente de OpenAI
      
      if (!aspectMap.has(aspectName)) {
        aspectMap.set(aspectName, []);
      }
      
      // Agregar cada evidencia por separado (si hay múltiples menciones del mismo aspecto)
      evidences.forEach((evidence: string) => {
        if (!evidence || evidence.length < 5) return; // Skip empty or very short evidences
        
        aspectMap.get(aspectName)!.push({
          text: evidence,
          sentiment,
          rating,
          sub_aspect: subAspect
        });
      });
    });
  });
  
  return aspectMap;
}

/**
 * Normaliza sub_aspects para unificar sinónimos y variaciones
 * Basado en análisis de datos reales de Supabase
 */
export function normalizeSubAspect(subAspect: string): string {
  const normalized = subAspect.toLowerCase().trim();
  
  // 🔥 Mapa de sinónimos basado en DATOS REALES de la DB
  // Ordenado por impacto (frecuencia de uso)
  const synonyms: Record<string, string[]> = {
    // Sabor (46x total) - Más frecuente
    'sabor': ['sabor', 'sabores', 'sabores_equilibrados', 'sabor_baos', 'sabores_complejos', 'sabores_nuevos', 'sabores_autenticos'],
    
    // Atención (37x total)
    'atención': ['atención', 'atención_cálida', 'atención_buenisima', 'atención_rápida'],
    
    // Delicioso (34x total) - Variaciones de género
    'delicioso': ['delicioso', 'deliciosa'],
    
    // Ramen (35x total) - Plato específico con variantes
    'ramen': ['ramen', 'ramen_vegano', 'ramen_taiwan_beef', 'ramen_pollo', 'kuro_miso_ramen'],
    
    // Ruido (14x total) ⚠️ Duplicado reportado por usuario
    'ruido': ['ruido', 'ruidoso', 'ruidosa', 'acústica', 'escandaloso', 'escandalosa'],
    
    // Velocidad (13x total)
    'velocidad': ['velocidad', 'velocidad_lenta', 'velocidad_rapida', 'demora'],
    
    // Trato (13x total)
    'trato': ['trato', 'trato_amable', 'trato_a_delivery', 'trato_general', 'trato_personalizado', 'trato_cálido', 'trato_excepcional', 'trato_agresivo', 'trato_del_personal'],
    
    // Porciones (11x total)
    'porciones': ['porciones', 'porciones_pequeñas', 'porciones_abundantes', 'porciones_generosas'],
    
    // Calidad (11x total)
    'calidad': ['calidad', 'relación calidad-precio'],
    
    // Tamaño (10x total)
    'tamaño_pequeño': ['tamaño_pequeño', 'tamaño', 'pequeño', 'pequeña', 'chico', 'chica'],
    
    // Sabroso (8x total) - Variaciones de género
    'sabroso': ['sabroso', 'sabrosa'],
    
    // Variedad (8x total)
    'variedad': ['variedad', 'poca_variedad'],
    
    // Caldo (8x total)
    'caldo': ['caldo', 'caldo_exquisito', 'caldo_de_cerdo'],
    
    // Opciones veganas (7x total)
    'opciones_veganas': ['opciones_veganas', 'veganas', 'vegana', 'opciones'],
    
    // Baos (7x total)
    'baos': ['baos', 'bao', 'baos_veganos', 'bao_pollo_frito'],
    
    // Espacio (7x total)
    'espacio': ['espacio', 'espacio_entre_mesas', 'espacio_pequeño', 'espacio_incomodo', 'espacio_limitado', 'espacio_reducido'],
    
    // Tiempo de espera (3x total)
    'tiempo_espera': ['tiempo_de_espera', 'espera', 'esperando'],
    
    // Temperatura
    'temperatura': ['temperatura', 'frío', 'fría', 'caliente', 'calor'],
    
    // Picante (4x total)
    'picante': ['picante', 'nivel_picante'],
    
    // Fideos (4x total)
    'fideos': ['fideos', 'extra_fideos', 'fideos_duros'],
    
    // Precio
    'precio_alto': ['alto', 'caro', 'cara', 'costoso', 'costosa', 'excesivo', 'excesiva', 'elevado'],
    
    // Higiene
    'higiene': ['higiene', 'limpieza', 'pulcritud'],
    
    // Amabilidad
    'amabilidad': ['amabilidad', 'amable', 'cordial', 'cálido']
  };
  
  // Buscar coincidencia exacta o por inclusión
  for (const [canonical, variations] of Object.entries(synonyms)) {
    if (variations.some(v => normalized === v || normalized.includes(v))) {
      return canonical;
    }
  }
  
  // Si no hay coincidencia, devolver normalizado (snake_case)
  return normalized.replace(/\s+/g, '_');
}

/**
 * Detecta sub-temas usando clasificación inteligente de OpenAI (sub_aspect)
 * Con fallback a keywords para reviews antiguas sin sub_aspect
 */
export function detectSubTopics(
  evidences: Array<{ text: string; sentiment: string; rating: number; sub_aspect?: string }>, 
  minMentions = 3
): SubTopic[] {
  // ✨ ESTRATEGIA 1: Usar sub_aspect de OpenAI (preferido)
  const withSubAspect = evidences.filter(ev => ev.sub_aspect);
  const withoutSubAspect = evidences.filter(ev => !ev.sub_aspect);
  
  const subTopicsMap = new Map<string, {
    keywords: Set<string>;
    positive: number;
    negative: number;
    neutral: number;
    citations: Array<{ text: string; sentiment: string }>;
  }>();
  
  // Procesar evidencias con sub_aspect (clasificación inteligente)
  withSubAspect.forEach(ev => {
    // 🔄 Normalizar para unificar sinónimos (ej: "Ruidoso" y "Ruido" → "ruido")
    const groupName = normalizeSubAspect(ev.sub_aspect!);
    
    if (!subTopicsMap.has(groupName)) {
      subTopicsMap.set(groupName, {
        keywords: new Set(),
        positive: 0,
        negative: 0,
        neutral: 0,
        citations: []
      });
    }
    
    const group = subTopicsMap.get(groupName)!;
    
    if (ev.sentiment === 'positive') group.positive++;
    else if (ev.sentiment === 'negative') group.negative++;
    else group.neutral++;
    
    // Agregar cita única
    if (group.citations.length < 10 && !group.citations.find(c => c.text === ev.text)) {
      group.citations.push({ text: ev.text, sentiment: ev.sentiment });
    }
    
    // Extraer keywords del texto para mostrar
    const words = ev.text
      .toLowerCase()
      .replace(/[^a-záéíóúñü\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    words.slice(0, 3).forEach(w => group.keywords.add(w));
  });
  
  // ⚙️ FALLBACK: Para evidencias sin sub_aspect (reviews antiguas), usar keywords básicas
  if (withoutSubAspect.length > 0) {
    const semanticGroups: Record<string, string[]> = {
      'tamaño_pequeño': ['pequeña', 'pequeño', 'chica', 'chico', 'escasa', 'escaso', 'ínfima', 'ínfimo', 'tirando'],
      'tamaño_grande': ['grande', 'abundante', 'generosa', 'generoso', 'enorme'],
      'tamaño_adecuado': ['justa', 'justo', 'correcta', 'correcto', 'adecuada', 'adecuado'],
      'frío': ['fría', 'frío', 'helada', 'helado', 'tibia', 'tibio', 'congelada'],
      'caliente': ['caliente', 'quemando', 'hirviendo'],
      'delicioso': ['deliciosa', 'delicioso', 'rica', 'rico', 'exquisita', 'exquisito', 'sabrosa'],
      'insípido': ['insípida', 'insípido', 'sosa', 'soso', 'desabrida', 'falta'],
      'velocidad_lenta': ['lento', 'lenta', 'demora', 'tardó', 'espera', 'esperando'],
      'velocidad_rápida': ['rápido', 'rápida', 'ágil', 'inmediato'],
      'atención_amable': ['amable', 'cordial', 'atento', 'atenta'],
      'atención_descortés': ['grosero', 'grosera', 'maleducado', 'antipático'],
      'caro': ['caro', 'cara', 'costoso', 'costosa', 'excesivo'],
      'barato': ['barato', 'barata', 'económico', 'económica', 'accesible'],
      'ruido': ['ruidoso', 'ruidosa', 'ruido', 'escandaloso'],
      'limpio': ['limpio', 'limpia', 'pulcro', 'impecable'],
      'sucio': ['sucio', 'sucia', 'desaseado']
    };
    
    withoutSubAspect.forEach(ev => {
      const textLower = ev.text.toLowerCase();
      
      // Buscar coincidencia con grupos semánticos
      for (const [groupName, keywords] of Object.entries(semanticGroups)) {
        if (keywords.some(kw => textLower.includes(kw))) {
          
          if (!subTopicsMap.has(groupName)) {
            subTopicsMap.set(groupName, {
              keywords: new Set(),
              positive: 0,
              negative: 0,
              neutral: 0,
              citations: []
            });
          }
          
          const group = subTopicsMap.get(groupName)!;
          
          if (ev.sentiment === 'positive') group.positive++;
          else if (ev.sentiment === 'negative') group.negative++;
          else group.neutral++;
          
          if (group.citations.length < 10 && !group.citations.find(c => c.text === ev.text)) {
            group.citations.push({ text: ev.text, sentiment: ev.sentiment });
          }
          
          keywords.forEach(kw => {
            if (textLower.includes(kw)) group.keywords.add(kw);
          });
          
          break; // Solo asignar a un grupo
        }
      }
    });
  }
  
  // Convertir a SubTopic[]
  const subTopics: SubTopic[] = Array.from(subTopicsMap.entries())
    .map(([name, data]) => {
      const total = data.positive + data.negative + data.neutral;
      const positivePercentage = total > 0 ? (data.positive / total) * 100 : 0;
      
      // Determinar prioridad
      let priority: SubTopic['priority'] = 'low_signal';
      if (total >= 10 && positivePercentage >= 85) priority = 'strength';
      else if (total >= 5 && positivePercentage < 40) priority = 'quick_win';
      else if (total >= 5) priority = 'mixed';
      
      // Generar insight
      let insight = '';
      if (priority === 'strength') {
        insight = `Fortaleza destacada: potenciar en comunicación`;
      } else if (priority === 'quick_win') {
        insight = `Quick Win: problema recurrente, fácil de mejorar`;
      } else if (priority === 'mixed') {
        insight = `Opiniones divididas: analizar contexto`;
      }
      
      // Seleccionar mejores citas
      const positiveCitations = data.citations
        .filter(c => c.sentiment === 'positive')
        .slice(0, 3)
        .map(c => c.text);
      
      const negativeCitations = data.citations
        .filter(c => c.sentiment === 'negative')
        .slice(0, 3)
        .map(c => c.text);
      
      // Formatear nombre para mostrar (ej: "tamaño_pequeño" → "Tamaño pequeño")
      const displayName = name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return {
        name: displayName,
        count: total,
        positiveCount: data.positive,
        negativeCount: data.negative,
        neutralCount: data.neutral,
        positivePercentage,
        keywords: Array.from(data.keywords).slice(0, 5),
        topPositiveCitations: positiveCitations,
        topNegativeCitations: negativeCitations,
        priority,
        insight
      };
    })
    .filter(st => st.count >= minMentions)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 sub-temas
  
  // 📊 Agregar subtema "Otros" si hay menciones sin clasificar
  const classifiedCount = subTopics.reduce((sum, st) => sum + st.count, 0);
  const unclassifiedCount = evidences.length - classifiedCount;
  
  if (unclassifiedCount >= minMentions && subTopics.length > 0) {
    // Calcular sentimientos de las no clasificadas
    const classifiedEvidences = new Set<string>();
    Array.from(subTopicsMap.values()).forEach(group => {
      group.citations.forEach(c => classifiedEvidences.add(c.text));
    });
    
    const unclassifiedEvidences = evidences.filter(ev => 
      !classifiedEvidences.has(ev.text)
    );
    
    const unclassifiedPositive = unclassifiedEvidences.filter(e => e.sentiment === 'positive').length;
    const unclassifiedNegative = unclassifiedEvidences.filter(e => e.sentiment === 'negative').length;
    const unclassifiedNeutral = unclassifiedEvidences.filter(e => e.sentiment === 'neutral').length;
    const unclassifiedPosPercentage = unclassifiedCount > 0 ? (unclassifiedPositive / unclassifiedCount) * 100 : 0;
    
    subTopics.push({
      name: 'Otros aspectos',
      count: unclassifiedCount,
      positiveCount: unclassifiedPositive,
      negativeCount: unclassifiedNegative,
      neutralCount: unclassifiedNeutral,
      positivePercentage: unclassifiedPosPercentage,
      keywords: [],
      topPositiveCitations: unclassifiedEvidences
        .filter(e => e.sentiment === 'positive')
        .slice(0, 3)
        .map(e => e.text),
      topNegativeCitations: unclassifiedEvidences
        .filter(e => e.sentiment === 'negative')
        .slice(0, 3)
        .map(e => e.text),
      priority: 'low_signal',
      insight: 'Menciones variadas sin patrón recurrente claro'
    });
  }
  
  return subTopics;
}

/**
 * Genera análisis profundo de todos los aspectos
 */
export function generateAspectDeepAnalysis(reviews: any[]): AspectDeepAnalysis[] {
  const aspectEvidence = extractAspectEvidence(reviews);
  const analyses: AspectDeepAnalysis[] = [];
  
  // Ordenar aspectos por número de menciones
  const sortedAspects = Array.from(aspectEvidence.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10); // Top 10 aspectos
  
  sortedAspects.forEach(([aspect, evidences]) => {
    const total = evidences.length;
    const positive = evidences.filter(e => e.sentiment === 'positive').length;
    const negative = evidences.filter(e => e.sentiment === 'negative').length;
    const neutral = evidences.filter(e => e.sentiment === 'neutral').length;
    
    const hasEnoughData = total >= 5;
    
    const analysis: AspectDeepAnalysis = {
      aspect: aspect.charAt(0).toUpperCase() + aspect.slice(1),
      totalMentions: total,
      positivePercentage: total > 0 ? (positive / total) * 100 : 0,
      negativePercentage: total > 0 ? (negative / total) * 100 : 0,
      neutralPercentage: total > 0 ? (neutral / total) * 100 : 0,
      subTopics: hasEnoughData ? detectSubTopics(evidences) : [],
      hasEnoughData,
      allEvidenceSpans: evidences
    };
    
    analyses.push(analysis);
  });
  
  return analyses;
}

export function generateMockGapData(): GapAnalysis {
  return {
    totalReviews: 200,
    gapToFiveCount: 45,
    gapPercentage: 22.5,
    currentRating: 4.2,
    potentialRating: 4.6,
    potentialIncrease: 0.4,
    topGapReasons: [
      {
        text: 'Tiempo de espera en horario pico',
        count: 18,
        avgCurrentRating: 4.3,
        relatedAspect: 'servicio',
        percentage: 40
      },
      {
        text: 'Velocidad de WiFi',
        count: 12,
        avgCurrentRating: 4.4,
        relatedAspect: 'wifi',
        percentage: 26.7
      },
      {
        text: 'Variedad del menú vegetariano',
        count: 8,
        avgCurrentRating: 4.2,
        relatedAspect: 'comida',
        percentage: 17.8
      },
      {
        text: 'Ruido ambiental',
        count: 7,
        avgCurrentRating: 4.5,
        relatedAspect: 'ambiente',
        percentage: 15.6
      }
    ],
    quickWins: [
      {
        category: 'wifi',
        issue: 'Velocidad de WiFi',
        mentions: 12,
        avgRating: 4.4,
        potentialImpact: '+0.12',
        potentialImpactNumeric: 0.12,
        effort: 'low',
        reviews: [],
        suggestedAction: 'Mejorar velocidad y cobertura de internet',
        priority: 0.12
      },
      {
        category: 'servicio',
        issue: 'Tiempo de espera en horario pico',
        mentions: 18,
        avgRating: 4.3,
        potentialImpact: '+0.18',
        potentialImpactNumeric: 0.18,
        effort: 'medium',
        reviews: [],
        suggestedAction: 'Optimizar procesos en horarios pico - considerar personal extra 12-14hs',
        priority: 0.09
      },
      {
        category: 'comida',
        issue: 'Variedad del menú vegetariano',
        mentions: 8,
        avgRating: 4.2,
        potentialImpact: '+0.08',
        potentialImpactNumeric: 0.08,
        effort: 'low',
        reviews: [],
        suggestedAction: 'Ampliar opciones vegetarianas en carta',
        priority: 0.08
      }
    ]
  };
}

