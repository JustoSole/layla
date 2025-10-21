## Auditoría UX/UI Post‑Onboarding — ReputacionLocal (es-AR)

Fecha: 24 Sep 2025

### Executive summary
- **Foco**: acelerar tiempo a valor (<2 min) para pymes gastronómicas en Argentina, priorizando “Responder críticas urgentes” y “Pedir reseñas”.
- **Hallazgo clave**: el producto ya orienta a la acción con tarjetas y CTAs, pero falta reforzar el “momento A‑ha” con explicación del Score y accesos directos persistentes.
- **Nudges críticos**: indicadores de urgencia y CTA sticky en Reviews; tooltip “¿Cómo se calcula?” en Salud Reputacional; microcopy en tono “vos”.
- **Fricciones**: falta de estado de foco visible/aria en varios botones; contraste borderline en badges; navegación de imágenes con mejor accesibilidad.
- **Mobile**: CTAs importantes sin versión sticky; áreas táctiles <44px en algunos elementos.
- **Copy**: tono cercano ya presente, pero inconsistente (vos/usted). Normalizar a “vos”.
- **Telemetría**: faltan eventos de activación (primera respuesta, copia de plantilla, abrir enlace de reseñas, filtros guardados).
- **Impacto estimado**: +15–25% conversión “ver dashboard”→“primera acción”; −30–50% tiempo a primera acción; +10–20% uso semanal del gestor.
- **Confianza**: Alta para UI/Flows; Media para prioridades precisas de negocio (sin datos reales en esta revisión).

### Métricas y objetivos (AARRR/PLG)
- **Activación (ver dashboard → primera acción)**: objetivo < 2 min; baseline sin instrumentar.
- **% primera acción**: objetivo ≥ 45% en primer día; baseline N/D.
- **Retención semanal (uso gestor de reseñas)**: objetivo ≥ 40%; baseline N/D.
- **% críticas urgentes sin responder (48h)**: objetivo ≤ 10%; baseline N/D.
- **Tasa de reseñas positivas nuevas (4–5★/semana)**: +20% vs baseline.

### Matriz Heurísticas Nielsen y comportamiento
- **Visibilidad del estado del sistema**: bien en loaders/toasts, falta `aria-live` y foco visible.
- **Control y libertad**: sin deshacer en acciones de filtros; falta “Limpiar filtros” persistente en mobile.
- **Consistencia y estándares**: variaciones en tono vos/usted; toasts vs alerts nativos.
- **Prevención de errores**: Settings sin validación de URL; prefiltros no persistidos.
- **Reconocimiento vs recuerdo**: faltan presets de filtros y chips reutilizables.
- **Accesibilidad**: contrastes borderline en badges; navegación carrusel con teclado.
- **Fogg (Señales/ability/trigger)**: señales presentes, falta trigger persistente (sticky) y reducción de pasos (prefiltro).

### Funnel post‑onboarding (supuesto con rutas actuales)
1. Ver `Dashboard` (ruta `/dashboard`).
2. Detectar estado: críticas urgentes o necesidad de más reseñas.
3. Primera acción:
   - Responder crítica (ruta `/reviews` o `/review/:id`).
   - Pedir reseñas (abrir/copy link Google reviews).
4. Acciones de continuidad: benchmarking (`/competitors`), reportes (`/reports`), configuración (`/settings`).
5. Resultado: reducir críticas sin responder, aumentar reseñas 4–5★.

Nota de gaps del funnel:
- Falta prefiltrado directo desde Dashboard hacia Reviews (reduce pasos).
- Faltan triggers persistentes en mobile (sticky CTA) según estado (urgentes vs pedir reseñas).
- Sin instrumentación actual para medir time-to-value y % primera acción.

### Hallazgos por pantalla

#### Navigation
- Título: Badge de urgentes visible pero sin etiqueta accesible
- Severidad: P1
- Impacto esperado: Mejora activación hacia `/reviews` (click-through +10–15%).
- Esfuerzo estimado: Bajo.
- Evidencia: `src/components/Navigation.tsx` ~L100–L126. Badge en rojo sin aria-label.
- Recomendación:
  - Agregar `aria-label`/`role="status"` al badge y texto oculto con número de urgentes.
  - En mobile, agregar CTA “Responder urgentes” en el menú, sticky si hay >0.
- Criterios de aceptación:
  - GIVEN hay urgentes, WHEN foco en el badge, THEN lector de pantalla anuncia “X reseñas urgentes sin responder”.

#### Dashboard
- Título: Falta tooltip “¿Cómo se calcula?” en Salud Reputacional
- Severidad: P1
- Impacto esperado: A‑ha moment; +10–15% comprensión y clics a acciones.
- Esfuerzo estimado: Bajo.
- Evidencia: `src/components/Dashboard.tsx` ~L317–L395. Score y breakdown sin tooltip/explicación contextual.
- Recomendación:
  - Agregar ícono “i” con tooltip explicativo y link a ayuda breve.
  - Microcopy: “Rating + Actividad + Momentum + Gestión”.
- Criterios:
  - WHEN usuario hover/foco en “i”, THEN se muestra explicación y se puede cerrar con Esc.

- Título: Nudge “Pedir reseñas” bien ubicado, falta toast accesible de copiado
- Severidad: P2
- Impacto esperado: +10–15% clicks “copiar/abrir”; mayor confianza percibida.
- Esfuerzo estimado: Bajo.
- Evidencia: `Dashboard.tsx` ~L721–L759. Muestra toast, sin `role="status"`/`aria-live`.
- Recomendación: `aria-live="polite" role="status"` en toast; botón secundario “Copiar y abrir”.
- Criterios: WHEN copiar, THEN lector anuncia “Enlace copiado”.

- Título: CTAs “Responder Ahora” y “Ver todas” llevan a `/reviews` sin filtros
- Severidad: P2
- Impacto esperado: −30–40% tiempo a primera respuesta (≤ 2 min).
- Esfuerzo estimado: Medio.
- Evidencia: `Dashboard.tsx` ~L219–L244 y ~L570–L636.
- Recomendación: Pasar estado/filtros (ej. `?filter=urgent` / `?rating=<=3`).
- Criterios: WHEN click “Responder Ahora”, THEN ReviewsManager abre con filtro “urgent”.

#### ReviewsManager
- Título: Prioriza urgentes correctamente, falta CTA sticky de acción rápida
- Severidad: P1
- Impacto esperado: +15–25% tasa de respuesta en primera sesión; −20% tiempo.
- Esfuerzo estimado: Medio.
- Evidencia: `src/components/ReviewsManager.tsx` ~L416–L507 (banda de urgentes) y lista ~L595–L716.
- Recomendación:
  - Sticky footer en mobile con “Responder siguiente” y “Copiar y abrir”.
  - Atajos de teclado: `R` responder, `C` copiar y abrir, `J/K` navegar.
- Criterios: WHEN scroll en mobile, THEN aparece sticky con acciones; accesible por teclado.

- Título: “Copiar y abrir” sin feedback accesible universal
- Severidad: P1
- Impacto esperado: +20% uso de acción rápida; menos dudas.
- Esfuerzo estimado: Bajo.
- Evidencia: `ReviewsManager.tsx` ~L701–L709 y toast ~L935–L939.
- Recomendación: `aria-live` en toast y disabled state si no hay URL.
- Criterios: WHEN copiar, THEN toast anuncia “Plantilla copiada”.

- Título: Falta “Guardar vista de filtros”
- Severidad: P2
- Impacto esperado: +10–15% frecuencia semanal; retorno más rápido al flujo.
- Esfuerzo estimado: Medio.
- Evidencia: Filtros básicos ~L522–L591 sin persistencia.
- Recomendación: Guardar presets (localStorage) y chips con vistas guardadas.
- Criterios: WHEN guardar preset, THEN aparece chip para aplicar en 1 click.

#### ReviewDetail
- Título: Plantillas listas OK; mejorar nudge “Copiar y abrir” y accesibilidad del carrusel
- Severidad: P1
- Impacto esperado: −25–35% tiempo a publicar respuesta.
- Esfuerzo estimado: Medio.
- Evidencia: `src/components/ReviewDetail.tsx` ~L614–L623 (CTA) y ~L434–L466 (controles).
- Recomendación:
  - Botón primario “Copiar y abrir reseña” que combina acciones con toast `aria-live`.
  - Controles del carrusel con `aria-label`, focus visible y navegación con flechas.
- Criterios: WHEN usar teclado, THEN se puede navegar imágenes y el foco es visible.

- Título: Temas detectados OK; faltan tags de urgencia visibles por SR
- Severidad: P2
- Impacto esperado: Priorización más clara para SR.
- Esfuerzo estimado: Bajo.
- Evidencia: `ReviewDetail.tsx` ~L471–L526.
- Recomendación: Añadir `aria-label` en badges de sentimiento/urgencia.
- Criterios: SR anuncia “Urgencia: Alta/Media/Baja”.

#### CompetitorBenchmark
- Título: Insight claro; faltan CTA de retorno al flujo de reseñas
- Severidad: P3
- Impacto/Esfuerzo: Flujo de ida y vuelta; Esfuerzo Bajo.
- Evidencia: `src/components/CompetitorBenchmark.tsx` ~L126–L159, ~L315–L478.
- Recomendación: Agregar “Volver a reseñas” y nudge “Pedir reseñas” contextual.
- Criterios: CTA visible en mobile y desktop.

#### Reports
- Título: Acciones simuladas con `alert`; reemplazar por toasts accesibles y confirmaciones
- Severidad: P2
- Impacto esperado: +Confianza; menos fricción en descarga/compartir.
- Esfuerzo estimado: Medio.
- Evidencia: `src/components/Reports.tsx` ~L51–L63.
- Recomendación: Componentes de toast no bloqueantes y confirmación inline.
- Criterios: WHEN “Programar”, THEN aparece confirmación con fecha.

#### Settings
- Título: Edición de URLs sin validación visual ni ayuda breve
- Severidad: P1
- Impacto esperado: −errores de configuración; menos soporte.
- Esfuerzo estimado: Medio.
- Evidencia: `src/components/Settings.tsx` ~L361–L385 y ~L498–L523.
- Recomendación:
  - Validación: formato URL, dominio permitido y feedback inline (iconos ✓/! y color). 
  - Microcopy de ayuda: “pegá el link de tu perfil de Google/TripAdvisor”.
- Criterios: WHEN URL inválida, THEN botón guardar deshabilitado y error visible.

### Copy propuesto (vos)
- Botones
  - “Responder Ahora” → “Responder ahora”
  - “Ver todas” → “Ver todas las críticas”
  - “Copiar y abrir” → “Copiar y abrir reseña”
  - “Pedir más reseñas” → “Pedir reseñas”
  - “Ver estrategia” → “Cómo mejorar”
- Vacíos
  - Reviews sin resultados: “No encontramos reseñas con esos filtros. Probá cambiarlos.”
  - Sin urgentes: “¡Todo al día! Te recomendamos pedir más reseñas.”
- Toasts
  - Copiado: “¡Listo! Copiamos el texto al portapapeles.”
  - Enlace copiado: “¡Listo! Copiamos tu link de reseñas.”
  - Programación: “Activamos el envío mensual del reporte.”
  - Settings (ayuda de URL): “Pegá el link de tu perfil oficial. Si no lo encontrás, te ayudamos.”
  - Reports (confirmación): “Listo, te enviamos el reporte el primer día del mes.”

### Accesibilidad (WCAG 2.2 AA)
- Foco visible: añadir estilos focus en todos los botones/links clave.
- Roles/ARIALive:
  - Toasts con `role="status"` y `aria-live="polite"`.
  - Badges de estado con `aria-label` descriptivo (“2 urgentes sin responder”).
- Contraste:
  - Badges rojos/amarillos/azules: asegurar ≥4.5:1; elevar tonos y fondos (ej. rojo #B91C1C en texto + #FEE2E2 fondo).
  - Links azules: usar #1D4ED8 sobre blanco, hover #1E40AF.
- Carrusel imágenes:
  - Flechas con `aria-label` (“Anterior/Siguiente”), foco accesible, y navegación con teclas.
- Teclado:
  - Atajos en ReviewsManager (R/C/J/K) y `Esc` para cerrar panel.

### Responsive y mobile
- Sticky CTAs:
  - ReviewsManager: footer sticky con “Responder siguiente” y “Copiar y abrir reseña”.
  - Dashboard: nudge “Pedir reseñas” sticky si hay 0 urgentes.
- Hit areas ≥44px: chequear chips/filtros (`ReviewsManager.tsx` ~L526–L545) y badges.
- Breakpoints:
  - xs/sm: simplificar tarjetas, ocultar columnas no críticas; agrandar tipografía 14–16px.
  - md: dos columnas máximo; paneles laterales como overlays.
  - Safe areas (iOS): sticky footers con padding inferior compatible (`env(safe-area-inset-bottom)`).
  - Sticky CTA z-index 50+ para no quedar detrás de toasts.

### Growth loops y nudges
- Nudges condicionales:
  - Si urgentes > 0: banner persistente “Responder urgentes (X)”.
  - Si urgentes = 0: “Pedir reseñas” con botón “Copiar link”.
- Triggers y frecuencia:
  - Primer login del día: mostrar nudge correspondiente.
  - Si no hubo respuesta en 48h: recordatorio en Dashboard.
- Plantillas por rating/tema (restaurantes): servicio, espera, temperatura, higiene, precio.
 - Deep link WhatsApp/QR para pedir reseñas en salón: link corto + QR listo para imprimir.

### Telemetría/analítica (eventos sugeridos)
- Lista de eventos
  - `dashboard_viewed`: on mount Dashboard; props: `business_id`, `has_tripadvisor`, `device`.
  - `cta_urgent_click`: click “Responder ahora”; props: `urgent_count`.
  - `cta_low_rating_click`: click “≤3★”; props: `count`.
  - `review_filter_applied`: aplicar filtro en Reviews; props: `filter`, `topics`, `search_len`.
  - `review_quick_copy_open`: “Copiar y abrir”; props: `platform`, `rating`.
  - `review_detail_copy`: botón “Copiar”; props: `length`.
  - `review_detail_open_link`: “Ir a la reseña”; props: `platform`.
  - `review_preset_saved`: guardar vista; props: `filters`.
  - `review_first_action`: primera acción post-onboarding (cualquiera de las anteriores), funnel KPI.
  - `request_reviews_opened`: abrir link Google; props: `place_id`.
  - `request_reviews_copied`: copiar link; props: `place_id`.
- Ejemplo payload
```json
{
  "event": "review_quick_copy_open",
  "business_id": "abc_123",
  "platform": "Google",
  "rating": 2,
  "device": "mobile"
}
```

#### Tabla resumida de eventos (cuándo y props)

| nombre | cuándo disparar | props | ejemplo breve |
|---|---|---|---|
| dashboard_viewed | al montar Dashboard | business_id, has_tripadvisor, device | `{ "business_id":"abc", "device":"mobile" }` |
| cta_urgent_click | click “Responder ahora” | urgent_count, from | `{ "urgent_count":2, "from":"dashboard" }` |
| cta_low_rating_click | click banner ≤3★ | count, from | `{ "count":3, "from":"dashboard" }` |
| review_filter_applied | aplicar filtro en Reviews | filter, topics, search_len | `{ "filter":"urgent", "topics":["servicio"] }` |
| review_quick_copy_open | “Copiar y abrir” | platform, rating, review_id | `{ "platform":"Google", "rating":2 }` |
| review_detail_copy | botón Copiar en detalle | length, review_id | `{ "length":180 }` |
| review_detail_open_link | “Ir a la reseña” | platform, review_id | `{ "platform":"Google" }` |
| review_preset_saved | guardar preset filtros | filters | `{ "filters":{"filter":"urgent"} }` |
| review_first_action | primera acción tras onboarding | action, minutes_since_dashboard | `{ "action":"respond_urgent", "minutes_since_dashboard":1.3 }` |
| request_reviews_opened | abrir enlace de reseñas | place_id, from | `{ "from":"dashboard" }` |
| request_reviews_copied | copiar enlace reseñas | place_id, from | `{ "from":"dashboard" }` |

Nota: enviar `device` (desktop/mobile), `plan` (trial/premium) y `has_tripadvisor` como props comunes de contexto.

### Roadmap priorizado
- P0 (quick wins)
  - Tooltip “¿Cómo se calcula?” + aria en toast de copiado (Dashboard).
  - Prefiltro al navegar a Reviews desde urgentes y ≤3★.
  - Aria/role en badges y toasts; foco visible global.
  - Reemplazar `alert` por toasts no bloqueantes en Reports (consistencia accesible).
- P1 (2–3 sprints)
  - Sticky footer mobile en ReviewsManager con acciones rápidas.
  - Guardar vista de filtros (presets) + chips aplicables.
  - Validación y ayuda de URLs en Settings.
  - Accesibilidad del carrusel en ReviewDetail.
  - Deep links/QR para pedir reseñas y material imprimible.
- P2 (exploración)
  - Atajos de teclado en Reviews y navegación tipo “bandeja de entrada”.
  - Nudge inteligente por momentum competitivo.
  - Sistema de scoring explicable con doc de ayuda.

### Checklist de QA UX/UI
- [ ] Tooltip con foco/keyboard y cierre con Esc.
- [ ] Toasts con `role="status"` y `aria-live`.
- [ ] Prefiltros aplicados al entrar desde Dashboard.
- [ ] Sticky footer visible en xs/sm y oculto en desktop.
- [ ] Áreas táctiles ≥44px; sin tap targets solapados.
- [ ] Contraste ≥4.5:1 en badges y links.
- [ ] Carrusel navegable con teclado; `aria-label` en botones.
- [ ] Validación de URL con mensajes claros y bloqueo de guardar.
- [ ] Copys normalizados a “vos”.
- [ ] Eventos de telemetría disparan en los puntos definidos.
 - [ ] Safe area iOS respetada en sticky CTA.

### Riesgos y mitigaciones
- Riesgo: exceso de señales visuales (banner + sticky) en mobile.
  - Mitigación: mostrar solo un nudge a la vez según estado (urgentes vs pedir reseñas).
- Riesgo: prefiltros inconsistentes si no hay parámetros reales.
  - Mitigación: fallback seguro a “all” y mostrar chip “Filtro aplicado”.
- Riesgo: accesibilidad parcial si faltan atributos en componentes de librería.
  - Mitigación: auditoría de roles y foco completa antes de release.
 - Riesgo: confusión por cambios de severidad vs prioridad P0.
   - Mitigación: mantener roadmap P0/P1 independiente de severidad y justificar impacto en métricas.

### Apéndice: referencias a archivos
- `src/App.tsx` ~L58–L107: rutas protegidas y estructura de layout.
- `src/components/Navigation.tsx` ~L100–L126: nav items con badge de urgentes.
- `src/components/Dashboard.tsx` ~L317–L395: Salud Reputacional; ~L721–L759: nudge “Pedir reseñas”; ~L570–L636: urgentes CTA.
- `src/components/ReviewsManager.tsx` ~L416–L507: banda de urgentes; ~L522–L591: filtros; ~L701–L709: “Copiar y abrir”; ~L935–L939: toast.
- `src/components/ReviewDetail.tsx` ~L408–L469: carrusel de imágenes; ~L614–L623: CTA “Ir a la reseña”; ~L471–L526: análisis/urgencia.
- `src/components/CompetitorBenchmark.tsx` ~L126–L159 y ~L315–L478: hero + plan.
- `src/components/Reports.tsx` ~L51–L63: acciones con `alert`.
- `src/components/Settings.tsx` ~L361–L385 (edición URL), ~L498–L523 (edición competidor).

### Snippets sugeridos (UI/UX)
- Tooltip “¿Cómo se calcula?”
```tsx
<button aria-describedby="health-tip">¿Cómo se calcula?</button>
<div role="tooltip" id="health-tip">Rating + Actividad + Momentum + Gestión</div>
```
- Toast accesible
```tsx
<div role="status" aria-live="polite">¡Listo! Copiamos tu link de reseñas.</div>
```
- Prefiltro hacia Reviews
```ts
navigate('/reviews?filter=urgent');
```
