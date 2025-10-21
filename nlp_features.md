# Conceptos de NLP para Análisis de Reviews - Aplicables a Gastronomía

Este documento describe todos los conceptos y técnicas de NLP utilizadas en el proyecto de reportes hoteleros con OpenAI, y cómo pueden ser aplicados a negocios gastronómicos (restaurantes, cafeterías, bares, etc.).

---

## 📋 Tabla de Contenidos

1. [Análisis Individual de Reviews](#1-análisis-individual-de-reviews)
2. [Análisis de Sentimiento por Aspecto (ABSA)](#2-análisis-de-sentimiento-por-aspecto-absa)
3. [Extracción de Puntos Clave](#3-extracción-de-puntos-clave)
4. [Detección de Criticidad](#4-detección-de-criticidad)
5. [Clasificación de Tipo de Cliente](#5-clasificación-de-tipo-de-cliente)
6. [Síntesis y Agregación de Insights](#6-síntesis-y-agregación-de-insights)
7. [Análisis de Distribución de Sentimientos](#7-análisis-de-distribución-de-sentimientos)
8. [Ranking de Aspectos](#8-ranking-de-aspectos)
9. [Generación de Recomendaciones Accionables](#9-generación-de-recomendaciones-accionables)
10. [Detección de Alertas Críticas](#10-detección-de-alertas-críticas)
11. [Análisis de Tendencias](#11-análisis-de-tendencias)
12. [Análisis de Gap (¿Por qué no 5 estrellas?)](#12-análisis-de-gap-por-qué-no-5-estrellas)
13. [Análisis de Aspectos Problemáticos Específicos](#13-análisis-de-aspectos-problemáticos-específicos)
14. [Generación de Plan de Acción](#14-generación-de-plan-de-acción)
15. [Resumen Ejecutivo Automatizado](#15-resumen-ejecutivo-automatizado)
16. [Implementación Técnica](#16-implementación-técnica)

---

## 1. Análisis Individual de Reviews

### Concepto
Procesar cada review individualmente para extraer información estructurada antes de agregar insights.

### Aplicación en Hoteles
```python
class ReviewAnalysis(BaseModel):
    review_id: str
    overall_sentiment: str  # positive, negative, neutral
    overall_score: float    # 1-10
    aspects: List[AspectAnalysis]
    key_points: List[str]
    is_critical: bool
    critical_issue: Optional[str]
    traveler_type: Optional[str]
```

### Adaptación para Gastronomía
```python
class ReviewAnalysisRestaurant(BaseModel):
    review_id: str
    overall_sentiment: str  # positive, negative, neutral
    overall_score: float    # 1-10
    aspects: List[AspectAnalysis]
    key_points: List[str]
    is_critical: bool
    critical_issue: Optional[str]  # Ej: intoxicación, higiene grave
    diner_type: Optional[str]      # familia, pareja, business, solo, grupo
```

### Features Clave para Gastronomía
- **Tipo de comensal**: familia con niños, pareja romántica, comida de negocios, grupos grandes
- **Momento del día**: desayuno, almuerzo, merienda, cena, after-hours
- **Ocasión**: cumpleaños, aniversario, casual, celebración
- **Aspectos críticos**: salud, higiene, alergias

---

## 2. Análisis de Sentimiento por Aspecto (ABSA)

### Concepto
**Aspect-Based Sentiment Analysis**: Identificar aspectos específicos mencionados y el sentimiento hacia cada uno.

### Aplicación en Hoteles
```python
class AspectAnalysis(BaseModel):
    aspect: str        # ubicacion, limpieza, servicio, wifi, desayuno, etc
    sentiment: str     # positive, negative, neutral
    score: float       # 1-10
    quote: Optional[str]  # Cita textual
```

**Aspectos hoteleros comunes:**
- Ubicación
- Limpieza
- Servicio/Personal
- WiFi/Conectividad
- Desayuno
- Habitaciones
- Confort
- Instalaciones
- Ruido
- Precio/Valor

### Adaptación para Gastronomía
```python
class AspectAnalysisRestaurant(BaseModel):
    aspect: str        # comida, servicio, ambiente, precio, etc
    sentiment: str     # positive, negative, neutral
    score: float       # 1-10
    quote: Optional[str]
    dish_mentioned: Optional[str]  # Plato específico si aplica
```

**Aspectos gastronómicos comunes:**
- **Comida**: sabor, presentación, temperatura, porciones, frescura
- **Servicio**: velocidad, amabilidad, conocimiento del menú, atención
- **Ambiente**: decoración, limpieza, música, iluminación, ruido
- **Precio**: relación calidad-precio, valor
- **Bebidas**: calidad, variedad, carta de vinos
- **Menú**: variedad, opciones vegetarianas/veganas, alergias
- **Cocina**: tiempo de espera, cocción de carnes, temperatura
- **Ubicación**: accesibilidad, estacionamiento, zona
- **Reservas**: facilidad, confirmación, gestión de mesas
- **Higiene**: limpieza visible, baños, mesas

### Prompt Adaptado para Gastronomía
```
Para cada review:
- Sentimiento general y score 1-10
- Aspectos mencionados con su propio sentiment:
  * negative: problema claro mencionado
  * neutral: sugerencia sin queja fuerte
  * positive: elogio
- Aspectos posibles: comida, sabor, servicio, velocidad, ambiente, 
  precio, porciones, bebidas, higiene, reservas, ubicacion, musica,
  decoracion, temperatura_platos, atencion_meseros, conocimiento_menu
- 2-3 puntos clave extraídos
- ¿Es crítico? (problemas graves: intoxicación, higiene extrema, alérgenos)
```

---

## 3. Extracción de Puntos Clave

### Concepto
Resumir cada review en 2-3 puntos clave accionables.

### Ejemplo Hoteles
```
Review: "Hotel excelente, ubicación perfecta y personal amable. 
         Pero el WiFi era muy lento y el desayuno repetitivo."

Key Points:
1. "Ubicación céntrica muy valorada"
2. "Personal recibe elogios por amabilidad"
3. "WiFi lento frustra a huéspedes"
```

### Ejemplo Gastronomía
```
Review: "La comida estuvo deliciosa, especialmente el risotto. 
         Servicio atento pero tardaron 45 minutos en traer los platos."

Key Points:
1. "Risotto destacado por sabor excepcional"
2. "Servicio atento y amable"
3. "Tiempo de espera excesivo (45 min)"
```

### Valor
- Permite identificar rápidamente lo más importante de cada review
- Facilita la lectura de gerentes ocupados
- Ayuda a priorizar acciones

---

## 4. Detección de Criticidad

### Concepto
Identificar reviews que mencionan problemas **críticos** que requieren atención inmediata.

### Criterios en Hoteles
- Problemas de seguridad
- Suciedad extrema
- Problemas de salud
- Robos o pérdidas

### Criterios en Gastronomía
```python
is_critical: bool
critical_issue: Optional[str]

# Problemas críticos en restaurantes:
- Intoxicación alimentaria
- Presencia de insectos/plagas
- Higiene extremadamente deficiente
- Alergias no respetadas
- Objetos extraños en comida
- Problemas de seguridad (incendio, accidentes)
- Discriminación o maltrato grave
```

### Ejemplo
```json
{
  "review_id": "rev_123",
  "overall_score": 1.0,
  "is_critical": true,
  "critical_issue": "Cliente reporta intoxicación después de consumir mariscos",
  "sentiment": "negative"
}
```

### Acción
Las reviews críticas deben:
1. Disparar alertas inmediatas
2. Priorizarse en respuesta
3. Investigarse internamente
4. Documentarse para auditoría

---

## 5. Clasificación de Tipo de Cliente

### Concepto
Identificar el tipo de cliente para entender necesidades específicas.

### En Hoteles
- Familia
- Pareja
- Business/Negocios
- Solo
- Grupo de amigos

### En Gastronomía
```python
diner_type: Optional[str]

# Tipos de comensales:
- familia_ninos: "Familia con niños pequeños"
- familia_adultos: "Familia multigeneracional"
- pareja_romantica: "Pareja en cita romántica"
- pareja_casual: "Pareja casual"
- business: "Comida de negocios"
- grupo_amigos: "Grupo de amigos"
- grupo_celebracion: "Celebración (cumpleaños, aniversario)"
- solo: "Comensal individual"
- turistas: "Turistas"
```

### Valor
- **Personalización**: Adaptar servicio según tipo de comensal
- **Marketing**: Crear campañas segmentadas
- **Menú**: Optimizar opciones (menú infantil, romántico, ejecutivo)
- **Horarios**: Identificar picos por tipo de cliente

### Ejemplo de Insights
```
"70% de reviews positivas vienen de parejas románticas"
→ Acción: Fortalecer marketing para citas, crear ambiente íntimo

"Familias mencionan falta de opciones para niños"
→ Acción: Crear menú infantil, agregar área kids-friendly
```

---

## 6. Síntesis y Agregación de Insights

### Concepto
Después de analizar reviews individuales, agregar datos para obtener insights del conjunto.

### Estructura de Síntesis
```python
class FinalSynthesis(BaseModel):
    executive_summary: str
    total_reviews: int
    sentiment_distribution: SentimentDistribution
    average_score: float
    top_strengths: List[str]
    aspects_ranking: List[AspectSummary]
    improvements: List[ImprovementAction]
    critical_alerts: List[CriticalAlert]
    positive_trends: List[str]
    negative_trends: List[str]
```

### Ejemplo para Restaurante
```json
{
  "executive_summary": "El restaurante mantiene calidad consistente en comida (8.7/10) pero servicio lento impacta experiencia. Oportunidad de mejorar tiempos sin sacrificar calidad.",
  "total_reviews": 245,
  "average_score": 8.2,
  "sentiment_distribution": {
    "positive": 180,
    "neutral": 45,
    "negative": 20
  },
  "top_strengths": [
    "Calidad excepcional de ingredientes",
    "Plato estrella: Risotto de hongos",
    "Ambiente acogedor y romántico"
  ]
}
```

---

## 7. Análisis de Distribución de Sentimientos

### Concepto
Visualizar cómo se distribuyen los sentimientos en las reviews.

### Métricas
```python
class SentimentDistribution(BaseModel):
    positive: int    # Reviews positivas
    neutral: int     # Reviews neutras
    negative: int    # Reviews negativas

# Cálculos adicionales:
positive_pct = positive / total * 100
negative_pct = negative / total * 100
neutral_pct = neutral / total * 100
```

### Aplicación Gastronomía
```
Total: 200 reviews
Positivas: 150 (75%)
Neutrales: 30 (15%)
Negativas: 20 (10%)

Interpretación:
- 75% de satisfacción general → Buen nivel
- 10% negativas → Identificar patrones comunes
- Meta: llevar negativas <5%
```

### Segmentación Útil
1. **Por tipo de comensal**: ¿Familias más satisfechas que parejas?
2. **Por momento**: ¿Mejor servicio en cenas que en almuerzos?
3. **Por día de semana**: ¿Fin de semana con más quejas?
4. **Por temporada**: ¿Verano vs invierno?

---

## 8. Ranking de Aspectos

### Concepto
Ordenar todos los aspectos por su score promedio para identificar fortalezas y debilidades.

### Estructura
```python
class AspectSummary(BaseModel):
    aspect: str
    avg_score: float    # 1-10
    mentions: int       # Cantidad de menciones
    sentiment: str      # Predominante: very_positive, positive, neutral, negative, very_negative
    top_quotes: List[str]
```

### Ejemplo Gastronomía
```json
{
  "aspects_ranking": [
    {
      "aspect": "Sabor de la comida",
      "avg_score": 9.2,
      "mentions": 187,
      "sentiment": "very_positive",
      "top_quotes": [
        "Mejor pasta de la ciudad",
        "Sabores auténticos italianos"
      ]
    },
    {
      "aspect": "Velocidad del servicio",
      "avg_score": 6.8,
      "mentions": 143,
      "sentiment": "neutral",
      "top_quotes": [
        "Tardaron 40 minutos en traer entrada",
        "Servicio lento pero vale la pena"
      ]
    },
    {
      "aspect": "Relación calidad-precio",
      "avg_score": 7.5,
      "mentions": 98,
      "sentiment": "positive",
      "top_quotes": [
        "Precio justo para la calidad",
        "Un poco caro pero vale la pena"
      ]
    }
  ]
}
```

### Visualización
```
📊 RANKING DE ASPECTOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Top Fortalezas:
1. Sabor de la comida ⭐ 9.2/10 (187 menciones)
2. Ambiente acogedor ⭐ 8.9/10 (132 menciones)
3. Calidad ingredientes ⭐ 8.7/10 (98 menciones)

⚠️ Áreas de Mejora:
1. Velocidad del servicio 🔴 6.8/10 (143 menciones)
2. Variedad del menú 🟡 7.2/10 (76 menciones)
3. Estacionamiento 🟡 7.5/10 (45 menciones)
```

---

## 9. Generación de Recomendaciones Accionables

### Concepto
Convertir insights en acciones **concretas y medibles**, no genéricas.

### Estructura
```python
class ImprovementAction(BaseModel):
    area: str                  # Área a mejorar
    priority: str              # critical, high, medium, low
    impact: str                # high, medium, low
    recommendation: str        # Recomendación ESPECÍFICA
    affected_reviews: int      # # de reviews que mencionan
    example_quotes: List[str]  # Citas de ejemplo
```

### Ejemplo Hoteles
```json
{
  "area": "WiFi",
  "priority": "high",
  "impact": "high",
  "recommendation": "Actualizar routers a WiFi 6, instalar repetidores en pisos 2 y 3, contratar plan de 500 Mbps",
  "affected_reviews": 47,
  "example_quotes": [
    "WiFi muy lento, no pude trabajar",
    "Conexión se caía constantemente"
  ]
}
```

### Ejemplo Gastronomía
```json
{
  "area": "Velocidad del servicio",
  "priority": "high",
  "impact": "high",
  "recommendation": "Implementar sistema POS con alertas de tiempo, capacitar en gestión de tiempos, contratar mesero adicional para fines de semana. Meta: <25 min entrada, <40 min plato principal",
  "affected_reviews": 67,
  "example_quotes": [
    "Tardaron 45 minutos en traer la comida",
    "Servicio muy lento, casi nos vamos"
  ]
}
```

### Características de Buenas Recomendaciones
✅ **Específicas**: No "Mejorar servicio", sino "Contratar 1 mesero adicional para viernes-sábado"
✅ **Medibles**: Incluir métricas objetivo
✅ **Accionables**: Pasos concretos a seguir
✅ **Con contexto**: Cuántas reviews afectadas, quotes reales
✅ **Priorizadas**: Según impacto y frecuencia

❌ **Evitar genéricas**: "Mejorar la experiencia del cliente"
❌ **Evitar vagas**: "Revisar procesos internos"

---

## 10. Detección de Alertas Críticas

### Concepto
Identificar problemas **urgentes** que requieren acción inmediata.

### Estructura
```python
class CriticalAlert(BaseModel):
    issue: str                    # Descripción del problema
    severity: str                 # critical, high, medium
    frequency: int                # Veces mencionado
    affected_reviews: List[str]   # IDs de reviews
    immediate_action: str         # Acción inmediata recomendada
```

### Ejemplo Gastronomía
```json
{
  "critical_alerts": [
    {
      "issue": "Múltiples reportes de intoxicación después de consumir mariscos",
      "severity": "critical",
      "frequency": 3,
      "affected_reviews": ["rev_445", "rev_447", "rev_450"],
      "immediate_action": "URGENTE: Suspender venta de mariscos, auditoría de proveedor, revisar cadena de frío, inspección sanitaria inmediata"
    },
    {
      "issue": "Presencia de cucarachas reportada en baño",
      "severity": "critical",
      "frequency": 2,
      "affected_reviews": ["rev_421", "rev_428"],
      "immediate_action": "Contratar fumigación profesional inmediata, auditoría completa de higiene, revisión de alcantarillas y desagües"
    },
    {
      "issue": "Mesero grosero con clientes",
      "severity": "high",
      "frequency": 5,
      "affected_reviews": ["rev_412", "rev_419", "rev_433", "rev_441", "rev_456"],
      "immediate_action": "Identificar empleado específico, capacitación urgente en servicio al cliente, seguimiento semanal, considerar acciones disciplinarias"
    }
  ]
}
```

### Niveles de Severidad en Gastronomía
- **Critical**: Salud, higiene grave, intoxicación, discriminación
- **High**: Servicio muy deficiente recurrente, problemas de calidad consistentes
- **Medium**: Incomodidades repetidas que afectan experiencia

---

## 11. Análisis de Tendencias

### Concepto
Identificar patrones que emergen o se deterioran en el tiempo.

### Tipos de Tendencias
```python
positive_trends: List[str]  # Tendencias positivas a mantener
negative_trends: List[str]  # Tendencias negativas a vigilar
```

### Ejemplo Gastronomía
```json
{
  "positive_trends": [
    "Platos veganos reciben cada vez más elogios (+30% menciones positivas vs mes anterior)",
    "Clientes destacan mejora en presentación de postres",
    "Aumento en menciones de 'mejor comida italiana de la zona'"
  ],
  "negative_trends": [
    "Incremento en quejas sobre ruido ambiental (+20% vs trimestre anterior)",
    "Comentarios sobre porciones pequeñas en aumento",
    "Repetición de quejas sobre estacionamiento limitado"
  ]
}
```

### Aplicación
- **Positivas**: Reforzar lo que funciona, invertir más, comunicarlo
- **Negativas**: Acción correctiva antes de que escale

### Análisis Temporal
```python
# Comparación mes a mes
def analyze_trend(reviews_current_month, reviews_previous_month):
    """
    Compara aspectos entre periodos para detectar cambios
    """
    aspects_current = extract_aspects(reviews_current_month)
    aspects_previous = extract_aspects(reviews_previous_month)
    
    trends = []
    for aspect in all_aspects:
        score_current = aspects_current[aspect]['avg_score']
        score_previous = aspects_previous[aspect]['avg_score']
        change = score_current - score_previous
        
        if abs(change) > 0.5:  # Cambio significativo
            direction = "mejora" if change > 0 else "deterioro"
            trends.append({
                "aspect": aspect,
                "direction": direction,
                "change": change,
                "description": f"{aspect} muestra {direction} de {abs(change):.1f} puntos"
            })
    
    return trends
```

---

## 12. Análisis de Gap (¿Por qué no 5 estrellas?)

### Concepto
**Análisis de brecha**: Identificar específicamente qué impide lograr calificaciones perfectas.

### Metodología en Hoteles
```python
def analyze_four_star_gap(reviews):
    """
    Analiza reviews <5★ para identificar:
    1. Barreras principales
    2. Aspectos fuertes (mantener)
    3. Factores WOW faltantes
    4. Quick wins (mejoras rápidas)
    """
```

### Estructura de Análisis
```json
{
  "main_barriers": [
    {
      "barrier": "WiFi lento",
      "description": "Impide que huéspedes business trabajen cómodamente",
      "frequency": "47 menciones (23% reviews <5★)",
      "severity": "high",
      "actionable_fix": "Upgrade a WiFi 6, 500 Mbps, repetidores"
    }
  ],
  "positive_aspects": [
    "Ubicación céntrica",
    "Personal amable"
  ],
  "missing_wow_factors": [
    "Servicios premium como spa o gym",
    "Opciones gastronómicas en hotel"
  ],
  "quick_wins": [
    "Mejorar variedad de desayuno (bajo costo, alto impacto)",
    "Actualizar colchones habitaciones piso 2"
  ]
}
```

### Adaptación para Gastronomía
```json
{
  "main_barriers": [
    {
      "barrier": "Tiempos de espera largos",
      "description": "Comensales hambrientos se frustran esperando >40 min",
      "frequency": "67 menciones (31% reviews <5★)",
      "severity": "high",
      "actionable_fix": "Contratar 1 mesero adicional fines de semana, implementar sistema alertas tiempos, optimizar proceso cocina-sala"
    },
    {
      "barrier": "Porciones pequeñas vs precio",
      "description": "Clientes sienten que no reciben valor por lo que pagan",
      "frequency": "43 menciones (20% reviews <5★)",
      "severity": "medium",
      "actionable_fix": "Aumentar 15% porciones platos principales o bajar precio $200, comunicar 'cocina gourmet' para ajustar expectativas"
    }
  ],
  "positive_aspects": [
    "Sabor excepcional de los platos (9.2/10)",
    "Ambiente romántico y acogedor (8.9/10)",
    "Calidad de ingredientes frescos (8.7/10)"
  ],
  "missing_wow_factors": [
    "Experiencias memorables: cocina abierta, chef que sale a saludar",
    "Detalles premium: pan casero, amuse-bouche de cortesía",
    "Maridaje profesional: sommelier, sugerencias de vino personalizadas",
    "Toques personalizados: recordar cumpleaños, preferencias clientes frecuentes"
  ],
  "quick_wins": [
    "Ofrecer pan casero con mantequilla de entrada (bajo costo, alto impacto)",
    "Implementar 'shot de bienvenida' de cortesía",
    "Mejorar iluminación zona entrada (primera impresión)",
    "Capacitar meseros en sugerencias de maridaje"
  ],
  "executive_summary": "El restaurante mantiene calidad excepcional en comida (9.2/10) y ambiente (8.9/10), pero tiempos de espera y percepción de valor impiden llegar a 5★ consistentemente. Abordar estas dos áreas puede convertir 31% de reviews 4★ en 5★, aumentando reputación y permitiendo ajuste de precios premium."
}
```

### Valor del Análisis de Gap
1. **Priorización clara**: Qué solucionar primero
2. **ROI estimado**: Impacto de cada mejora
3. **Quick wins**: Victorias rápidas para momentum
4. **Visión estratégica**: No solo problemas, sino aspiraciones (WOW factors)

---

## 13. Análisis de Aspectos Problemáticos Específicos

### Concepto
Profundizar en reviews negativas para extraer **problemas específicos**, no genéricos.

### Enfoque en Hoteles
```python
def analizar_aspectos_problematicos(reviews_sub_5_stars):
    """
    Analiza SOLO reviews <5★ para identificar:
    - Aspectos problemáticos ESPECÍFICOS
    - Sub-aspectos (no genéricos)
    - Severidad y frecuencia
    - Citas textuales
    """
```

### Especificidad es Clave
```
❌ MAL (genérico):
- "Servicio deficiente"
- "Problemas de limpieza"
- "Comida mala"

✅ BIEN (específico):
- "Tiempo de espera para hacer check-in >20 min"
- "Pelo en sábanas de habitación 302"
- "Carne de hamburguesa llegó cruda en el centro"
```

### Ejemplo Gastronomía
```json
{
  "total_reviews": 200,
  "sub5_reviews": 35,
  "pct_problematic": 17.5,
  "problematic_aspects": [
    {
      "aspect": "Cocción de carnes (punto de cocción incorrecto)",
      "mentions": 12,
      "severity": "Alta",
      "impact_score": 36,
      "example_quote": "Pedí término medio y llegó casi crudo, tuvieron que volver a cocinar",
      "action": "Capacitación intensiva a cocineros en puntos de cocción, uso de termómetro, checklist antes de servir"
    },
    {
      "aspect": "Temperatura de platos (comida tibia o fría)",
      "mentions": 9,
      "severity": "Alta",
      "impact_score": 27,
      "example_quote": "La pasta llegó tibia, se notaba que había estado esperando",
      "action": "Platos precalentados, coordinación cocina-meseros, campanas de calor para platos en espera"
    },
    {
      "aspect": "Conocimiento del menú por meseros",
      "mentions": 8,
      "severity": "Media",
      "impact_score": 16,
      "example_quote": "El mesero no sabía explicar los ingredientes del plato",
      "action": "Sesión de degustación semanal con equipo, fichas de menú con descripciones detalladas, capacitación continua"
    },
    {
      "aspect": "Variedad opciones vegetarianas",
      "mentions": 7,
      "severity": "Media",
      "impact_score": 14,
      "example_quote": "Solo había una opción vegetariana y era ensalada",
      "action": "Ampliar menú con 3 opciones vegetarianas principales, incluir proteínas vegetales interesantes"
    },
    {
      "aspect": "Ruido de cocina abierta",
      "mentions": 6,
      "severity": "Baja",
      "impact_score": 6,
      "example_quote": "El ruido de la cocina abierta no dejaba conversar",
      "action": "Evaluar paneles acústicos, música ambiental para amortiguar, reorganizar layout si es posible"
    }
  ]
}
```

### Fórmula de Impact Score
```python
impact_score = mentions * severity_multiplier

severity_multiplier = {
    "Alta": 3,
    "Media": 2,
    "Baja": 1
}
```

### Contexto Anti-Contradicción
**Importante**: El análisis debe evitar contradecir fortalezas identificadas.

Ejemplo:
```
Fortaleza: "Desayuno variado y abundante"

❌ Problema genérico contradictorio: "Calidad del desayuno"

✅ Problema específico compatible: "Variedad de frutas frescas en desayuno"
→ Mantiene la fortaleza general pero identifica sub-aspecto mejorable
```

---

## 14. Generación de Plan de Acción

### Concepto
Convertir todo el análisis en un **plan de acción ejecutable** con responsables, fechas y KPIs.

### Estructura
```python
class ActionItem(BaseModel):
    action: str        # Acción específica y medible
    reason: str        # Motivo con datos concretos
    owner: str         # Responsable
    due: str           # Fecha límite o periodicidad
    kpi: str           # KPI objetivo medible
    priority: str      # alta, media, baja
```

### Ejemplo Gastronomía
```json
{
  "actions": [
    {
      "action": "Contratar 1 mesero adicional para viernes y sábados noche",
      "reason": "67 reviews mencionan tiempos de espera >40 min, principalmente fines de semana",
      "owner": "Gerencia",
      "due": "2025-11-15",
      "kpi": "Reducir tiempo promedio de servicio a <25 min entrada, <40 min plato principal",
      "priority": "alta"
    },
    {
      "action": "Implementar capacitación intensiva en puntos de cocción de carnes",
      "reason": "12 reviews reportan problemas con término de cocción de carnes",
      "owner": "Chef de Cocina",
      "due": "2025-11-01",
      "kpi": "Reducir devoluciones de carnes por cocción a <2% de órdenes",
      "priority": "alta"
    },
    {
      "action": "Ampliar menú con 3 opciones vegetarianas principales",
      "reason": "7 reviews mencionan falta de variedad vegetariana, segmento en crecimiento",
      "owner": "Chef de Cocina",
      "due": "2025-12-01",
      "kpi": "Aumentar satisfacción de clientes vegetarianos a >8.5/10",
      "priority": "media"
    },
    {
      "action": "Responder 23 reviews pendientes en menos de 48 horas",
      "reason": "Tasa de respuesta actual 65%, objetivo >90% para mejorar reputación online",
      "owner": "Marketing/Gerencia",
      "due": "2025-10-31",
      "kpi": "Tasa de respuesta >90%",
      "priority": "alta"
    },
    {
      "action": "Instalar paneles acústicos en zona cerca de cocina abierta",
      "reason": "6 reviews mencionan ruido excesivo que impide conversación",
      "owner": "Gerencia Operativa",
      "due": "2025-12-15",
      "kpi": "Reducir menciones de ruido en reviews a <3%",
      "priority": "baja"
    }
  ]
}
```

### Características de un Buen Plan de Acción
✅ **Basado en datos reales**: Cada acción cita reviews/menciones concretas
✅ **Priorizado**: Según impacto y urgencia
✅ **Específico**: No vago ("mejorar servicio" ❌ → "contratar 1 mesero adicional" ✅)
✅ **Con responsable claro**: Gerencia, Chef, Marketing, Recepción, etc.
✅ **Con fecha límite**: Deadlines realistas
✅ **Con KPI medible**: Objetivo cuantificable
✅ **Sin jerga técnica**: Lenguaje natural, no "optimizar PTQ" sino "estar entre los 3 mejores"

### Consistencia con Análisis
**Crítico**: El plan de acción debe ser **consistente** con el análisis previo.

Ejemplo de consistencia en pricing:
```python
# Análisis de precios dice:
pricing_recommendation = "Bajar precios 10% para mejorar competitividad"

# Plan de acción DEBE reflejar esto:
{
  "action": "Ajustar precios a la baja 10% en platos principales",
  "reason": "Actualmente en posición #7 de 10 restaurantes similares en relación precio-calidad",
  "kpi": "Mejorar posición a top 3 en precio-calidad"
}

# NO debe contradecir:
❌ "Aumentar precios para incrementar márgenes" → INCONSISTENTE
```

---

## 15. Resumen Ejecutivo Automatizado

### Concepto
Generar un resumen ejecutivo claro, conversacional y sin jerga técnica para dueños/gerentes.

### Componentes
1. **Horizonte temporal** del informe
2. **Posición competitiva** vs negocios similares
3. **Fortalezas principales**
4. **Oportunidad de mejora concreta**

### Ejemplo Restaurante
```
Este informe analiza [Restaurante La Fontana] con base en las opiniones 
de comensales de los últimos 6 meses (245 reviews). Comparado con otros 
restaurantes italianos de la zona, La Fontana se encuentra en la posición 
#4 de 12 restaurantes similares, con una calificación de 4.3 sobre 5 
estrellas. Los comensales destacan especialmente la calidad excepcional 
de los ingredientes y el sabor de los platos, en particular el risotto 
de hongos que recibe elogios consistentes. La principal área de mejora 
es la velocidad del servicio, donde 67 reviews mencionan tiempos de 
espera superiores a 40 minutos. Abordar este aspecto puede elevar la 
satisfacción general y convertir más visitas en experiencias de 5 
estrellas, fortaleciendo la posición competitiva del restaurante.
```

### Reglas de Lenguaje Natural
```
❌ Evitar jerga técnica:
- "reviews" → "opiniones"
- "rating" → "calificación"
- "PTQ" → "posición entre restaurantes"
- "KPI" → "objetivo"
- "review response rate" → "responder opiniones de clientes"

✅ Usar lenguaje conversacional:
- "Este informe analiza..."
- "Los comensales destacan..."
- "Comparado con otros restaurantes..."
- "Hay oportunidad de mejorar..."
```

### Prompt Template
```python
prompt = f"""
Escribí un resumen ejecutivo claro (4-5 oraciones) para {restaurant_name}:

DATOS:
- Horizonte: Opiniones últimos 6 meses
- Calificación: {rating}/5 ({reviews_count} opiniones)
- Posición: #{position} de {total_competitors} restaurantes similares
- Principal fortaleza: {main_strength}
- Principal área de mejora: {main_issue}

REGLAS:
- NO uses términos técnicos (reviews, rating, KPI, PTQ)
- Usá lenguaje natural como si hablaras con el dueño
- Mencioná horizonte temporal, posición, fortaleza y oportunidad
- Sé específico pero conversacional
"""
```

---

## 16. Implementación Técnica

### Stack Tecnológico

#### Modelo de IA
- **OpenAI GPT-4o-mini**: Balance entre costo y calidad
- **Temperature: 0.0**: Para consistencia y reproducibilidad
- **Response format: json_object**: Garantiza outputs estructurados

#### Librerías Python
```python
# Core
from openai import OpenAI  # Cliente oficial (o requests para HTTP directo)
import requests            # Alternativa sin SDK
from pydantic import BaseModel, Field, ValidationError  # Validación de esquemas

# Procesamiento
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
```

#### Estructura de Código
```python
# 1. Definir esquemas Pydantic
class AspectAnalysis(BaseModel):
    aspect: str
    sentiment: str
    score: float
    quote: Optional[str]

class ReviewAnalysis(BaseModel):
    review_id: str
    overall_sentiment: str
    overall_score: float
    aspects: List[AspectAnalysis]
    key_points: List[str]
    is_critical: bool
    critical_issue: Optional[str]

# 2. Cliente OpenAI
class OpenAINLPAnalyzer:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model
        self.temperature = 0.0
    
    def _chat_completion_json(self, messages) -> dict:
        """Llamada HTTP a OpenAI API"""
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "response_format": {"type": "json_object"}
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)
    
    def analyze_batch(self, reviews: List[Dict], batch_num: int):
        """Analizar batch de reviews"""
        prompt = self._build_prompt(reviews)
        messages = [
            {"role": "system", "content": "Analista experto. Devuelve SOLO JSON válido."},
            {"role": "user", "content": prompt}
        ]
        parsed = self._chat_completion_json(messages)
        return BatchReviewsAnalysis.model_validate(parsed)

# 3. Procesamiento en batches
def analyze_all_reviews(reviews: List[Dict], batch_size: int = 10):
    analyzer = OpenAINLPAnalyzer(api_key=OPENAI_API_KEY)
    all_analyses = []
    
    for i in range(0, len(reviews), batch_size):
        batch = reviews[i:i+batch_size]
        batch_result = analyzer.analyze_batch(batch, i//batch_size + 1)
        all_analyses.extend(batch_result.reviews)
    
    return all_analyses

# 4. Síntesis final
def synthesize(all_analyses: List[ReviewAnalysis]):
    """Generar síntesis y recomendaciones"""
    # Agregar datos
    # Llamar a OpenAI para síntesis final
    # Retornar FinalSynthesis
    pass
```

### Procesamiento en Batches

#### ¿Por qué batches?
- **Límites de contexto**: OpenAI tiene límites de tokens
- **Costo**: Procesar todo junto puede ser muy costoso
- **Calidad**: Batches pequeños permiten análisis más detallado

#### Tamaño Óptimo
```python
# Para reviews completas con texto
batch_size = 10  # 10-15 reviews por batch

# Para reviews largas o análisis detallado
batch_size = 5

# Para síntesis de aspectos agregados
batch_size = 20  # Puede ser mayor
```

#### Flujo Completo
```
1. Preprocesar reviews
   ↓
2. Dividir en batches de 10-15
   ↓
3. Analizar cada batch individualmente
   ↓
4. Agregar resultados de todos los batches
   ↓
5. Generar síntesis final
   ↓
6. Generar plan de acción
```

### Manejo de Errores

#### Validación con Pydantic
```python
try:
    result = ReviewAnalysis.model_validate(parsed_json)
except ValidationError as e:
    # Aplicar coerción para corregir formato
    coerced = _coerce_to_schema(parsed_json, fallback_data)
    result = ReviewAnalysis.model_validate(coerced)
```

#### Fallbacks
```python
# Si OpenAI falla, usar análisis determinístico básico
def fallback_analysis(reviews):
    return {
        "executive_summary": "Análisis básico (IA no disponible)",
        "average_score": calculate_avg_rating(reviews),
        "sentiment_distribution": simple_sentiment_count(reviews),
        "recommendations": generate_basic_recommendations(reviews)
    }
```

### Costos Estimados

#### OpenAI GPT-4o-mini (Octubre 2025)
- Input: ~$0.15 / 1M tokens
- Output: ~$0.60 / 1M tokens

#### Ejemplo Restaurante (200 reviews)
```
Input tokens:
- 200 reviews × 200 tokens promedio = 40,000 tokens
- Prompts y contexto = 20,000 tokens
- Total input = 60,000 tokens → $0.009

Output tokens:
- Análisis individual = 30,000 tokens
- Síntesis = 5,000 tokens
- Plan de acción = 2,000 tokens
- Total output = 37,000 tokens → $0.022

COSTO TOTAL ≈ $0.031 por reporte completo
```

### Optimizaciones

#### 1. Caché de Análisis
```python
import hashlib
import json

def cache_key(review_text):
    return hashlib.md5(review_text.encode()).hexdigest()

# Guardar análisis previos
cache = {}
if cache_key(review) in cache:
    return cache[cache_key(review)]
```

#### 2. Procesamiento Paralelo
```python
from concurrent.futures import ThreadPoolExecutor

def analyze_batches_parallel(batches, max_workers=5):
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(analyze_batch, batches))
    return results
```

#### 3. Streaming para UX
```python
# Para aplicaciones web, mostrar progreso
def analyze_with_progress(reviews, callback):
    for i, batch in enumerate(batches):
        result = analyze_batch(batch)
        callback(f"Procesando batch {i+1}/{total_batches}...")
        yield result
```

---

## 🎯 Aplicación Completa para Gastronomía

### Pipeline Recomendado

```
┌─────────────────────────────────────────┐
│  1. RECOLECCIÓN DE REVIEWS             │
│     - Google Maps                       │
│     - TripAdvisor                       │
│     - Yelp                              │
│     - Facebook                          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  2. PREPROCESAMIENTO                   │
│     - Normalización de formato          │
│     - Filtrado de spam                  │
│     - Detección de idioma               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  3. ANÁLISIS INDIVIDUAL (Batches)      │
│     - Sentiment por aspecto             │
│     - Extracción de key points          │
│     - Detección de criticidad           │
│     - Clasificación de comensal         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  4. AGREGACIÓN Y SÍNTESIS              │
│     - Distribución de sentimientos      │
│     - Ranking de aspectos               │
│     - Identificación de tendencias      │
│     - Síntesis ejecutiva                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  5. ANÁLISIS AVANZADO                  │
│     - Gap analysis (4★→5★)             │
│     - Aspectos problemáticos            │
│     - Alertas críticas                  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  6. GENERACIÓN DE RECOMENDACIONES      │
│     - Acciones priorizadas              │
│     - Plan de acción con KPIs           │
│     - Quick wins                        │
│     - Resumen ejecutivo                 │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  7. ENTREGABLES                        │
│     - Dashboard interactivo             │
│     - Reporte PDF                       │
│     - Alertas automáticas               │
│     - API para integración              │
└─────────────────────────────────────────┘
```

### Aspectos Específicos para Gastronomía

#### Aspectos a Monitorear
```python
RESTAURANT_ASPECTS = [
    # Comida
    "sabor", "presentacion", "temperatura_platos", "frescura", 
    "porciones", "coccion_carnes", "sazón", "creatividad",
    
    # Servicio
    "velocidad_servicio", "amabilidad_meseros", "conocimiento_menu",
    "atencion_personalizada", "gestion_reservas",
    
    # Ambiente
    "decoracion", "limpieza", "musica", "iluminacion", "ruido",
    "comodidad_asientos", "temperatura_ambiente",
    
    # Bebidas
    "calidad_bebidas", "variedad_vinos", "cocteleria", "carta_bebidas",
    
    # Precio
    "relacion_calidad_precio", "precio_justo", "promociones",
    
    # Menú
    "variedad", "opciones_vegetarianas", "opciones_veganas",
    "menu_ninos", "manejo_alergias",
    
    # Logística
    "ubicacion", "estacionamiento", "accesibilidad", "facilidad_reserva",
    
    # Higiene
    "limpieza_visible", "banos_limpios", "mesas_limpias"
]
```

#### Tipos de Comensales
```python
DINER_TYPES = [
    "familia_ninos",
    "familia_adultos",
    "pareja_romantica",
    "pareja_casual",
    "business",
    "grupo_amigos",
    "grupo_celebracion",
    "solo",
    "turistas"
]
```

#### Alertas Críticas Específicas
```python
CRITICAL_ALERTS_RESTAURANT = [
    "intoxicacion_alimentaria",
    "presencia_plagas",
    "higiene_grave",
    "alergenos_no_respetados",
    "objeto_extrano_comida",
    "seguridad_fisica",
    "discriminacion",
    "maltrato_personal"
]
```

---

## 🚀 Casos de Uso Avanzados

### 1. Comparación con Competencia
```python
def compare_with_competitors(own_reviews, competitor_reviews):
    """
    Comparar aspectos con competidores directos
    """
    own_analysis = analyze_reviews(own_reviews)
    comp_analysis = analyze_reviews(competitor_reviews)
    
    comparison = []
    for aspect in RESTAURANT_ASPECTS:
        own_score = own_analysis['aspects'][aspect]['avg_score']
        comp_score = comp_analysis['aspects'][aspect]['avg_score']
        diff = own_score - comp_score
        
        comparison.append({
            "aspect": aspect,
            "own_score": own_score,
            "competitor_avg_score": comp_score,
            "difference": diff,
            "status": "ventaja" if diff > 0 else "oportunidad"
        })
    
    return comparison
```

### 2. Segmentación por Tipo de Comensal
```python
def analyze_by_diner_type(reviews):
    """
    Análisis segmentado por tipo de comensal
    """
    segments = {}
    
    for diner_type in DINER_TYPES:
        reviews_segment = [r for r in reviews if r['diner_type'] == diner_type]
        
        if reviews_segment:
            segments[diner_type] = {
                "count": len(reviews_segment),
                "avg_score": calculate_avg(reviews_segment),
                "top_concerns": extract_top_concerns(reviews_segment),
                "top_praises": extract_top_praises(reviews_segment)
            }
    
    return segments

# Ejemplo output:
{
  "familia_ninos": {
    "count": 45,
    "avg_score": 8.1,
    "top_concerns": ["Falta menú infantil", "Ruido molesta a niños"],
    "top_praises": ["Meseros pacientes con niños", "Espacio amplio"]
  },
  "pareja_romantica": {
    "count": 78,
    "avg_score": 9.2,
    "top_concerns": ["Mesas muy juntas", "Música a veces alta"],
    "top_praises": ["Ambiente íntimo", "Iluminación perfecta", "Platos para compartir"]
  }
}
```

### 3. Análisis Temporal (Tendencias)
```python
def analyze_trends_over_time(reviews_by_month):
    """
    Detectar mejoras o deterioros en el tiempo
    """
    trends = {}
    
    months = sorted(reviews_by_month.keys())
    for i in range(1, len(months)):
        prev_month = months[i-1]
        curr_month = months[i]
        
        prev_analysis = analyze_reviews(reviews_by_month[prev_month])
        curr_analysis = analyze_reviews(reviews_by_month[curr_month])
        
        for aspect in RESTAURANT_ASPECTS:
            prev_score = prev_analysis['aspects'][aspect]['avg_score']
            curr_score = curr_analysis['aspects'][aspect]['avg_score']
            change = curr_score - prev_score
            
            if abs(change) > 0.5:  # Cambio significativo
                if aspect not in trends:
                    trends[aspect] = []
                
                trends[aspect].append({
                    "month": curr_month,
                    "direction": "mejora" if change > 0 else "deterioro",
                    "change": change
                })
    
    return trends
```

### 4. Predicción de Churn (Clientes que no Volverán)
```python
def predict_churn_risk(review):
    """
    Identificar reviews de clientes que probablemente no vuelvan
    """
    churn_indicators = [
        "no volveré",
        "primera y última vez",
        "decepcionado",
        "esperaba más",
        "no lo recomiendo"
    ]
    
    text_lower = review['text'].lower()
    
    # Análisis con IA
    prompt = f"""
    Analiza si este cliente volverá al restaurante:
    
    Review: {review['text']}
    Rating: {review['rating']}/5
    
    Responde JSON:
    {{
      "churn_risk": "high/medium/low",
      "will_return": true/false,
      "reasoning": "Breve explicación",
      "recovery_action": "Acción específica para recuperar cliente"
    }}
    """
    
    analysis = call_openai(prompt)
    
    return {
        "review_id": review['id'],
        "churn_risk": analysis['churn_risk'],
        "will_return": analysis['will_return'],
        "reasoning": analysis['reasoning'],
        "recovery_action": analysis['recovery_action']
    }

# Uso:
high_risk_customers = [predict_churn_risk(r) for r in negative_reviews]

# Ejemplo output:
{
  "review_id": "rev_445",
  "churn_risk": "high",
  "will_return": false,
  "reasoning": "Cliente menciona 'no vuelvo más' y rating 1★. Experiencia muy negativa.",
  "recovery_action": "Contacto directo del gerente, descuento 30% próxima visita, garantía de mejora específica en el problema mencionado"
}
```

### 5. Generación Automática de Respuestas
```python
def generate_review_response(review, analysis):
    """
    Generar respuesta personalizada a review
    """
    prompt = f"""
    Genera una respuesta profesional y empática a esta review de restaurante:
    
    Review: {review['text']}
    Rating: {review['rating']}/5
    Sentiment: {analysis['overall_sentiment']}
    Aspectos mencionados: {analysis['aspects']}
    
    REGLAS:
    - Agradecer siempre, incluso en reviews negativas
    - Mencionar específicamente lo que el cliente mencionó
    - Si es positivo: reforzar fortalezas
    - Si es negativo: disculparse, explicar acción correctiva
    - Invitar a volver o a contactar directamente
    - Tono profesional pero cálido
    - Máximo 100 palabras
    
    Respuesta en español, sin comillas ni formateo extra.
    """
    
    response = call_openai(prompt)
    return response

# Ejemplo:
review = {
    "text": "Comida excelente pero tardaron 50 minutos en traer los platos",
    "rating": 3
}

response = generate_review_response(review, analysis)
# Output:
"""
Muchas gracias por tu visita y por compartir tu experiencia. Nos alegra 
mucho que hayas disfrutado la calidad de nuestra comida. Lamentamos 
sinceramente el tiempo de espera de 50 minutos, sabemos que esto afecta 
la experiencia. Estamos implementando mejoras en nuestro servicio para 
reducir estos tiempos. Te invitamos a darnos otra oportunidad para 
demostrarte que podemos ofrecerte una experiencia completa. Gracias por 
tu paciencia y comprensión.
"""
```

---

## 📊 Métricas y KPIs

### KPIs Clave para Restaurantes

```python
# Reputación
average_rating = sum(ratings) / len(ratings)
review_response_rate = reviews_responded / total_reviews * 100
positive_review_rate = positive_reviews / total_reviews * 100

# Aspectos
aspect_score = {aspect: avg_score for aspect in RESTAURANT_ASPECTS}
aspect_mentions = {aspect: count for aspect in RESTAURANT_ASPECTS}

# Criticidad
critical_alerts_count = len(critical_alerts)
sub_5_star_rate = reviews_below_5 / total_reviews * 100

# Tendencias
sentiment_trend = calculate_trend_last_3_months()
improvement_rate = (current_score - previous_score) / previous_score * 100

# Segmentación
satisfaction_by_diner_type = {type: avg_score for type in DINER_TYPES}
```

---

## 🎓 Conclusión

### Conceptos Clave Aplicables a Gastronomía

1. **ABSA (Aspect-Based Sentiment Analysis)**: Analizar sentimiento por aspecto específico
2. **Análisis de criticidad**: Detectar problemas urgentes
3. **Extracción de key points**: Resumir lo más importante
4. **Clasificación de clientes**: Segmentar por tipo de comensal
5. **Síntesis inteligente**: Agregar insights de múltiples reviews
6. **Gap analysis**: Identificar qué impide perfección
7. **Recomendaciones accionables**: Convertir insights en acciones con KPIs
8. **Alertas automáticas**: Detectar problemas críticos en tiempo real
9. **Análisis de tendencias**: Monitorear evolución temporal
10. **Generación de respuestas**: Automatizar engagement con clientes

### Ventajas de Usar OpenAI

✅ **Comprensión contextual**: Entiende matices y sarcasmo
✅ **Multiidioma**: Procesa reviews en múltiples idiomas
✅ **Escalabilidad**: Analiza miles de reviews rápidamente
✅ **Consistencia**: Análisis uniforme sin sesgos humanos
✅ **Accionabilidad**: Genera recomendaciones específicas, no genéricas
✅ **Flexibilidad**: Adaptable a cualquier tipo de negocio

### Próximos Pasos

1. **Implementar pipeline básico** con análisis individual y síntesis
2. **Agregar análisis de gap** para identificar barreras a 5★
3. **Implementar alertas críticas** para problemas urgentes
4. **Desarrollar dashboard** para visualizar insights
5. **Automatizar respuestas** a reviews
6. **Integrar con sistemas** de gestión (reservas, POS, CRM)

---

**Documento creado para:** Proyecto de Online Reputation Management para Gastronomía  
**Basado en:** Implementación real de análisis de reviews hoteleras con OpenAI GPT-4o-mini  
**Fecha:** Octubre 2025  
**Versión:** 1.0

