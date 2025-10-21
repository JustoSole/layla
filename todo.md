# 🚀 Plan de Desarrollo - Features de Retención y Engagement

**Objetivo:** Transformar el producto de análisis pasivo a plataforma de gestión activa, incrementando DAU/MAU de 5% a 35%+ en 90 días.

**Enfoque:** In-app features primero. Sin dependencias de notificaciones externas (push/email) hasta tener infraestructura.

***tecnica** Desasrollar de forma eficente y sencilla, no sobrecolijizar y reutlizar donde sea posible. siempore validar que este bien y respetar el disneo de la app. 

---

## 📋 Priorización de Features

### ⚡ **Fase 1: Quick Wins - Valor Inmediato (Semana 1-2)**
*Features que podemos implementar YA con la infraestructura actual*

#### 1.1 Sistema de Notificaciones Internas (In-App)
**Problema:** Usuario no sabe qué reviews nuevas llegaron sin revisar manualmente  
**Solución:** Badge + panel de notificaciones dentro de la app

**Tareas:**
- [ ] Crear tabla `notifications` en Supabase
  ```sql
  CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    type TEXT NOT NULL, -- 'critical_review', 'gap_opportunity', 'milestone', 'alert'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Trigger automático: cuando llega review ≤3★ → INSERT notification
- [ ] Componente `<NotificationBell />` en navbar (con contador)
- [ ] Panel desplegable con últimas 10 notificaciones
- [ ] Marcar como leída al hacer click

**Tiempo estimado:** 1 día  
**Impacto:** Alto - Usuario siempre sabe qué necesita atención

---

#### 1.2 Daily Digest (Visible al abrir la app)
**Problema:** Usuario entra y no sabe qué pasó desde su última visita  
**Solución:** Hero section "Tu día en 30 segundos"

**Tareas:**
- [ ] Componente `<DailyDigest />` en Dashboard
- [ ] Mostrar automáticamente:
  - Nuevas reviews (últimas 24h) con badges por tipo
  - Cambio en rating (rolling 7 días vs 7 días anteriores)
  - Reviews críticas sin responder
- [ ] Calcular métricas rolling en tiempo real (sin pre-cómputo)
- [ ] "Última actualización: hace 5 min" con refresh manual

**Tiempo estimado:** 1.5 días  
**Impacto:** Muy Alto - Hook inmediato al entrar

---

#### 1.3 Action Center (Central de Tareas Priorizadas)
**Problema:** Usuario no sabe qué hacer primero  
**Solución:** Lista de acciones priorizadas automáticamente

**Tareas:**
- [ ] Algoritmo de priorización:
  1. Reviews ≤3★ sin responder (crítico)
  2. Reviews con critical_flags (emergencia)
  3. Gap opportunities cluster (>=2 mencionan mismo tema)
  4. Reviews >4★ sin agradecer (engagement)
  5. Staff con menciones negativas recurrentes
- [ ] Componente `<ActionCenter />` 
- [ ] Cada acción con:
  - Título descriptivo
  - Tiempo estimado
  - Impacto esperado (alto/medio/bajo)
  - CTA directo (responder/revisar/contactar)
- [ ] Estado "completado" / "pospuesto"
- [ ] Progress: "3 de 5 acciones completadas hoy"

**Tiempo estimado:** 2 días  
**Impacto:** Muy Alto - Gamification + claridad

---

### 🔄 **Fase 2: Engagement Loops (Semana 3-4)**
*Features que generan hábitos de uso diario*

#### 2.1 Rolling Metrics & Comparisons
**Problema:** Métricas estáticas no muestran progreso  
**Solución:** Todo se compara vs baseline o período anterior

**Tareas:**
- [ ] Función `calculateRollingMetrics(externalPlaceId, days)`
  - Rolling 7 días
  - Rolling 30 días
  - Baseline (primeros 30 días del negocio)
- [ ] Componente `<MetricCard />` con delta visual
  ```tsx
  <MetricCard
    label="Rating promedio"
    current="4.6★"
    previous="4.4★"
    delta="+0.2"
    trend="up"
    context="vs últimos 7 días"
  />
  ```
- [ ] Dashboard principal: reemplazar todos los números estáticos por comparativos
- [ ] Micro-copy interpretativo: "Mejoraste +0.2★ desde que empezaste"

**Tiempo estimado:** 2 días  
**Impacto:** Alto - Feedback de progreso

---

#### 2.2 Review-Level Action Tracking
**Problema:** No se sabe qué se hizo con cada review  
**Solución:** Estado y timeline por review

**Tareas:**
- [ ] Agregar campos a reviews:
  - `user_viewed_at` TIMESTAMPTZ
  - `user_flagged` BOOLEAN
  - `user_action_notes` TEXT
  - `user_action_taken_at` TIMESTAMPTZ
- [ ] Componente `<ReviewActionTimeline />`
  ```
  ⏰ Recibida: hace 3 horas
  👁️ Vista: hace 1 hora
  ✍️ Respondida: hace 30 min
  ✅ Acción tomada: "Llamamos al cliente - Resuelto"
  ```
- [ ] Botones de acción rápida:
  - "Marcar como vista"
  - "Agregar nota interna"
  - "Respondida"
- [ ] Filtros: "Vistas / No vistas", "Con acción / Sin acción"

**Tiempo estimado:** 2 días  
**Impacto:** Medio - Accountability interno

---

#### 2.3 Progress Dashboard (Gamification Básica)
**Problema:** No hay celebración de logros  
**Solución:** Dashboard de progreso y milestones

**Tareas:**
- [ ] Componente `<ProgressDashboard />`
- [ ] Métricas acumuladas (desde registro):
  - Reviews respondidas totales
  - Response rate histórico
  - Rating journey (inicio → actual → meta)
  - Días con 100% response rate
- [ ] Milestones:
  - "Primera review respondida" ✅
  - "10 reviews respondidas" 
  - "Alcanzaste 4.5★" 
  - "30 días consecutivos usando la app"
- [ ] Visual: progress bars, badges simples

**Tiempo estimado:** 2.5 días  
**Impacto:** Medio - Motivación

---

### 📊 **Fase 3: Análisis Temporal (Semana 5-6)**
*La base fundacional para detección de tendencias*

#### 3.1 Daily Snapshots (Pre-cómputo Diario)
**Problema:** Cálculos pesados en tiempo real  
**Solución:** Snapshot diario automático

**Tareas:**
- [ ] Crear tabla `daily_snapshots`
  ```sql
  CREATE TABLE daily_snapshots (
    id UUID PRIMARY KEY,
    external_place_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    -- Métricas rolling
    rolling_7d_avg_rating NUMERIC,
    rolling_7d_review_count INT,
    rolling_7d_sentiment_score NUMERIC,
    rolling_30d_avg_rating NUMERIC,
    rolling_30d_review_count INT,
    -- Deltas
    rating_delta_vs_prev_7d NUMERIC,
    review_count_delta_vs_prev_7d INT,
    -- Top aspects
    top_improving_aspects JSONB,
    top_declining_aspects JSONB,
    -- Acciones
    critical_reviews_pending INT,
    gap_opportunities_count INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(external_place_id, snapshot_date)
  );
  ```
- [ ] Edge Function `compute-daily-snapshots`
  - Corre automáticamente cada día a las 6am (Supabase cron)
  - Calcula métricas para todos los negocios
  - Guarda en daily_snapshots
- [ ] Usar snapshots para comparaciones (más rápido que calcular on-the-fly)

**Tiempo estimado:** 2 días  
**Impacto:** Alto - Performance + habilitador de features futuras

---

#### 3.2 Aspect Evolution Tracking
**Problema:** No se sabe si un aspecto mejoró o empeoró  
**Solución:** Timeline de sentimiento por aspecto

**Tareas:**
- [ ] Crear tabla `aspect_timeline`
  ```sql
  CREATE TABLE aspect_timeline (
    id UUID PRIMARY KEY,
    external_place_id UUID NOT NULL,
    aspect TEXT NOT NULL,
    sub_aspect TEXT,
    period DATE NOT NULL, -- Primer día de semana/mes
    granularity TEXT NOT NULL, -- 'weekly' | 'monthly'
    positive_count INT,
    neutral_count INT,
    negative_count INT,
    sentiment_score NUMERIC, -- -1 a +1
    mention_count INT,
    top_evidence TEXT[],
    UNIQUE(external_place_id, aspect, sub_aspect, period, granularity)
  );
  ```
- [ ] Edge Function `compute-aspect-timeline`
  - Procesa reviews agrupadas por semana/mes
  - Calcula sentimiento agregado por aspecto
- [ ] Componente `<AspectTrendChart />`
  - Gráfico de línea: sentimiento del aspecto en el tiempo
  - Detección de cambios >20% (alertas visuales)
  - "Servicio mejoró +30% este mes"

**Tiempo estimado:** 3 días  
**Impacto:** Muy Alto - Insight accionable

---

#### 3.3 Smart Alerts (Detección de Anomalías)
**Problema:** Cambios significativos pasan desapercibidos  
**Solución:** Algoritmo de detección de anomalías

**Tareas:**
- [ ] Crear tabla `alerts`
  ```sql
  CREATE TABLE alerts (
    id UUID PRIMARY KEY,
    external_place_id UUID NOT NULL,
    type TEXT NOT NULL, -- 'aspect_drop', 'rating_spike', 'volume_change'
    severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    data JSONB,
    dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Algoritmo de detección (corre diario):
  - Aspect sentiment bajó >20% (alerta)
  - Rating bajó >0.3★ en 7 días (crítico)
  - Volumen de reviews bajó >50% (alerta)
  - Nuevo tema negativo emergente (detectar clustering)
- [ ] Componente `<AlertsPanel />` en Dashboard
- [ ] Notificación interna cuando se crea alerta

**Tiempo estimado:** 2.5 días  
**Impacto:** Alto - Proactividad

---

#### 4.2 Staff Dashboard V2

poner que se puedan agarar miebors al staff para el matching luego a la hora de detectarlos asi es mas robusto

**Tareas:**
- [ ] Tendencia temporal por empleado:
  - Gráfico: menciones positivas/negativas en el tiempo
  - "María: +5 menciones este mes vs mes pasado"
- [ ] Ranking interno:
  - Top performers (más menciones positivas)
  - Requires attention (menciones negativas recurrentes)
- [ ] Export individual:
  - PDF con todas las menciones del empleado
  - Para evaluaciones de desempeño
- [ ] Acción sugerida:
  - "Reconocer a María (5 menciones positivas)"
  - "Coaching para Juan (3 menciones sobre lentitud)"

**Tiempo estimado:** 3 días  
**Impacto:** Alto - Valor diferencial

---

#### 4.3 Insights V3 (Auto-Generated)
**Problema:** Insights son estáticos  
**Solución:** AI genera insights personalizados semanales

**Tareas:**
- [ ] Edge Function `generate-weekly-insights`
- [ ] Análisis automático:
  - Aspectos con mayor cambio (positivo/negativo)
  - Patterns: "Sábados tienen peor rating que resto de semana"
  - Correlaciones: "Cuando 'María' está, rating +0.3★"
  - Benchmarking: "Tu 'limpieza' mejoró más rápido que competidores"
- [ ] Componente `<WeeklyInsights />`:
  - 3-5 insights priorizados
  - Cada uno con recomendación accionable
  - "Por qué esto importa" (contexto)
- [ ] Guardar histórico de insights

**Tiempo estimado:** 3 días  
**Impacto:** Muy Alto - "Wow factor"

---

## 🎯 Métricas de Éxito

### North Star Metric
**DAU/MAU Ratio**: De 5% a 35%+ en 90 días

### Input Metrics (Lo que medimos día a día)
- [ ] Notificaciones in-app: >50% click-through rate
- [ ] Daily digest: >70% de usuarios lo ven
- [ ] Action Center: >60% completa al menos 1 acción/día
- [ ] Avg session duration: >5 minutos
- [ ] Login frequency: 4+ veces/semana

### Output Metrics (El resultado)
- [ ] Response rate: >80%
- [ ] Reviews generadas (campaigns): 10+/mes por negocio

### Retention
- [ ] D1 retention: >60%
- [ ] D7 retention: >40%
- [ ] D30 retention: >30%
- [ ] Monthly churn: <8%

---

## 📅 Cronograma Resumido

| Semana | Features | Tiempo Dev | Impacto |
|--------|----------|------------|---------|
| 1-2 | Notificaciones internas + Daily Digest + Action Center | 4.5 días | ⭐⭐⭐⭐⭐ |
| 3-4 | Rolling Metrics + Review Tracking + Progress Dashboard | 6.5 días | ⭐⭐⭐⭐ |
| 5-6 | Daily Snapshots + Aspect Timeline + Smart Alerts | 7.5 días | ⭐⭐⭐⭐⭐ |
| 7-8 | Campaigns V2 + Staff V2 + AI Insights | 9 días | ⭐⭐⭐⭐ |

**Total: 8 semanas | ~27 días de desarrollo**

---

## 🔧 Stack Técnico Requerido

### Backend
- ✅ Supabase (ya tienes)
  - Nuevas tablas: notifications, daily_snapshots, aspect_timeline, alerts
  - RLS policies para cada tabla
  - Triggers automáticos
- ✅ Edge Functions (ya tienes infraestructura)
  - `compute-daily-snapshots` (cron diario)
  - `compute-aspect-timeline` (cron semanal)
  - `generate-weekly-insights` (cron semanal)
  - `detect-anomalies` (cron diario)
- ⚠️ pg_cron extension (habilitar en Supabase)
  ```sql
  SELECT cron.schedule(
    'daily-snapshots',
    '0 6 * * *', 
    $$SELECT net.http_post(...)$$
  );
  ```

### Frontend
- ✅ React + TypeScript (ya tienes)
- ✅ TailwindCSS (ya tienes)
- ✅ Recharts para gráficos (ya tienes)
- 🆕 Componentes nuevos:
  - NotificationBell
  - DailyDigest
  - ActionCenter
  - MetricCard (con deltas)
  - ReviewActionTimeline
  - ProgressDashboard
  - AspectTrendChart
  - AlertsPanel
  - WeeklyInsights

### No Requerido (descartado por ahora)
- ❌ Push notifications (Firebase/OneSignal)
- ❌ Email service (Resend/SendGrid)
- ❌ SMS service (Twilio)
- ❌ WhatsApp API

---

## 🚦 Decisiones de Diseño

### Principios
1. **In-app first**: Todo valor visible SIN salir de la app
2. **Instant feedback**: Métricas calculadas on-the-fly cuando sea posible
3. **Progressive enhancement**: Features funcionan sin JS (SSR/SSG cuando viable)
4. **Mobile-friendly**: Todo debe verse bien en móvil (responsive)
5. **Performance**: <2s para cargar Dashboard completo

### Patrones de UI
- **Micro-copy interpretativo**: Cada métrica con contexto humano
- **Visual hierarchy**: Lo más urgente arriba, siempre
- **Color coding**:
  - 🔴 Rojo: Crítico (review ≤2★, alerta severa)
  - 🟠 Naranja: Atención (review 3★, cambio -20%)
  - 🟢 Verde: Positivo (review ≥4★, mejora)
  - 🔵 Azul: Informativo (milestone, insight)
- **Empty states**: Siempre mostrar qué hacer cuando no hay datos
- **Loading states**: Skeletons, no spinners genéricos

---

## ✅ Checklist de Implementación

### Pre-desarrollo
- [ ] Crear branch `feature/retention-v1`
- [ ] Revisar schema actual de Supabase
- [ ] Documentar APIs existentes
- [ ] Setup de ambiente de testing

### Durante desarrollo
- [ ] Tests unitarios para cálculos críticos (rolling metrics, alerts)
- [ ] Tests de integración para Edge Functions
- [ ] Cypress E2E para flujos principales
- [ ] Documentar cada componente nuevo (Storybook opcional)

### Pre-deploy
- [ ] Performance audit (Lighthouse >90)
- [ ] Accessibility audit (WCAG AA mínimo)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile testing (iOS Safari, Chrome Android)
- [ ] Security review (RLS policies correctas)

### Post-deploy
- [ ] Monitoring (Sentry para errores)
- [ ] Analytics (eventos de uso de nuevas features)
- [ ] User feedback (in-app survey después de 7 días)
- [ ] Iterar basado en datos reales

---

## 🎓 Referencias Técnicas

### Algoritmos Clave

**1. Rolling Metrics**
```typescript
function calculateRolling7Days(reviews: Review[]): Metrics {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = reviews.filter(r => 
    new Date(r.posted_at).getTime() > cutoff
  );
  
  return {
    avg_rating: avg(recent.map(r => r.rating_value)),
    review_count: recent.length,
    sentiment_score: avg(recent.map(r => r.overall_score || 0)),
  };
}
```

**2. Anomaly Detection (Simple)**
```typescript
function detectAnomalies(timeline: DataPoint[]): Alert[] {
  const alerts = [];
  
  for (let i = 1; i < timeline.length; i++) {
    const current = timeline[i];
    const previous = timeline[i - 1];
    const delta = current.value - previous.value;
    const percentChange = (delta / previous.value) * 100;
    
    if (Math.abs(percentChange) > 20) {
      alerts.push({
        type: delta > 0 ? 'spike' : 'drop',
        severity: Math.abs(percentChange) > 40 ? 'critical' : 'high',
        message: `${current.metric} ${delta > 0 ? 'subió' : 'bajó'} ${Math.abs(percentChange).toFixed(0)}%`,
      });
    }
  }
  
  return alerts;
}
```

**3. Action Prioritization**
```typescript
function prioritizeActions(business: Business): Action[] {
  const actions = [];
  
  // 1. Critical reviews (urgency = 10)
  business.reviews
    .filter(r => r.rating_value <= 3 && !r.owner_answer)
    .forEach(r => actions.push({
      priority: 10,
      type: 'respond',
      review: r,
      estimated_time: '5 min',
      impact: 'high',
    }));
  
  // 2. Gap clusters (urgency = 7)
  const gapClusters = detectClusters(
    business.reviews.filter(r => r.gap_to_five)
  );
  gapClusters.forEach(cluster => actions.push({
    priority: 7,
    type: 'improve',
    data: cluster,
    estimated_time: '15 min',
    impact: 'high',
  }));
  
  // 3. Staff recognition (urgency = 3)
  business.staff
    .filter(s => s.positive_mentions_7d >= 3)
    .forEach(s => actions.push({
      priority: 3,
      type: 'celebrate',
      staff: s,
      estimated_time: '2 min',
      impact: 'medium',
    }));
  
  return actions.sort((a, b) => b.priority - a.priority);
}
```

---

## 💬 Preguntas Frecuentes

**Q: ¿Por qué no push notifications?**  
A: Requiere configurar Firebase/OneSignal + generar certificados + manejar permisos del browser. Es complejo y el usuario debe aceptar permisos. In-app notifications dan 80% del valor con 20% del esfuerzo.

**Q: ¿Daily snapshots no va a ser lento?**  
A: Con cron job, el cálculo se hace 1 vez al día en background. Queries después son instantáneos (simple SELECT). Mucho más rápido que calcular on-the-fly.

**Q: ¿Qué pasa si un negocio tiene 10,000 reviews?**  
A: Daily snapshots + índices en DB aseguran performance. Aspect timeline solo procesa 1 vez por semana. Frontend solo carga últimos 90 días.

**Q: ¿Cuándo agregamos email/push?**  
A: Fase 5 (semana 9-10), después de validar que in-app features generan engagement. Primero probar el concepto, luego agregar canales.

---

## 🎯 Criterio de Éxito del Plan

Este plan es exitoso si al final de 8 semanas:

✅ **DAU/MAU subió de 5% a >25%** (target 35%, pero 25% ya es victoria)  
✅ **70%+ de usuarios activos usan Action Center** al menos 1 vez/semana  
✅ **Response rate promedio >75%** (vs ~40% actual)  
✅ **Churn mensual <10%** (vs ~15-20% estimado actual)  
✅ **NPS de features nuevas ≥40**  

Si logramos esto, tenemos PMF sólido para escalar.

---

**Última actualización:** Octubre 2025  
**Autor:** Plan basado en análisis de industria + limitaciones técnicas actuales  
**Status:** Ready to implement 🚀

