# 📊 Flujo de Datos - Sistema de Auditoría GMB

## Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PASO 1: SCRAPING BASE                            │
│                    (YA COMPLETADO)                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ pipeline_completo.py
                              ▼
        ┌──────────────────────────────────────────┐
        │ base_datos_gastronomica_consolidada.json │ ← 2,500-3,000 negocios
        │                                          │
        │ Campos disponibles:                      │
        │ • titulo, categoria, direccion           │
        │ • telefono, emails, whatsapp            │
        │ • url, dominio, place_id                │
        │ • rating, cantidad_reviews               │
        │ • lat, lon, verificado                  │
        └──────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                    PASO 2: ENRIQUECIMIENTO GMB                      │
│                    (NUEVO - A CREAR)                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ enriquecer_gmb_data.py
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
    ┌──────────────┐                  ┌──────────────┐
    │ DataForSEO   │                  │ DataForSEO   │
    │ my_business  │ $0.05            │ google       │ $0.05
    │ _info        │◄────────────────►│ _reviews     │
    └──────────────┘                  └──────────────┘
            │                                   │
            └─────────────────┬─────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ restaurantes_gmb_enriquecidos.json        │
        │                                           │
        │ Por cada restaurante:                     │
        │ ├─ datos_base (del scraping original)    │
        │ ├─ gmb_info (perfil completo GMB)        │
        │ │  ├─ description, categories, photos    │
        │ │  ├─ rating_distribution                │
        │ │  └─ place_topics (aspectos)            │
        │ ├─ reviews_sample (últimas 30)           │
        │ └─ analisis_automatico                   │
        │    ├─ completitud_score: 76/100          │
        │    ├─ gestion_reviews_score: 38/100      │
        │    ├─ health_score_total: 68/100         │
        │    ├─ response_rate_pct: 33.3%           │
        │    ├─ main_strength: "food"              │
        │    ├─ main_problem: "wait_time"          │
        │    └─ elegible_auditoria: true/false     │
        └───────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                    PASO 3: SELECCIÓN MANUAL                         │
│                    (NUEVO - A CREAR)                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ seleccionar_candidatos.py
                              │ (Interfaz CLI interactiva)
                              ▼
        ┌───────────────────────────────────────────┐
        │ FILTROS AUTOMÁTICOS:                      │
        │ • rating >= 4.0                           │
        │ • reviews >= 50                           │
        │ • elegible_auditoria = true               │
        │ • tiene email O whatsapp                  │
        │ • NO es cadena grande                     │
        │ ────────────────────────────────          │
        │ 2,500 → 800 elegibles                     │
        └───────────────────────────────────────────┘
                              │
                              │ Usuario revisa c/u
                              │ y marca para auditoría
                              ▼
        ┌───────────────────────────────────────────┐
        │ candidatos_auditoria.json                 │
        │                                           │
        │ Campos de control:                        │
        │ • marcado_para_auditoria: true/false      │
        │ • prioridad: alta/media/baja              │
        │ • notas: "..."                            │
        │                                           │
        │ Tracking:                                 │
        │ • auditoria_generada: false               │
        │ • pdf_path: null                          │
        │ • enviado_email: false                    │
        │ • respondio: false                        │
        │ ────────────────────────────────          │
        │ 800 elegibles → 50-100 seleccionados      │
        └───────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                    PASO 4: GENERACIÓN DE PDFs                       │
│                    (NUEVO - A CREAR)                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ generar_auditoria_pdf.py
                              │ (solo marcados = true)
                              ▼
        ┌───────────────────────────────────────────┐
        │ PROCESAMIENTO POR RESTAURANTE:            │
        │                                           │
        │ 1. Cargar datos GMB completos             │
        │ 2. Calcular scores y análisis             │
        │ 3. Generar descripción optimizada (LLM)   │
        │ 4. Preparar contexto para template        │
        │ 5. Renderizar HTML                        │
        │ 6. Generar PDF con Playwright             │
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ leads_gastronomicos/reportes/             │
        │                                           │
        │ ├─ restaurante-la-fontana/                │
        │ │  ├─ auditoria.pdf (4 páginas)           │
        │ │  └─ metadata.json                       │
        │ ├─ cafe-tortoni/                          │
        │ │  ├─ auditoria.pdf                       │
        │ │  └─ metadata.json                       │
        │ └─ ...                                    │
        │                                           │
        │ 50 PDFs generados                         │
        └───────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                    PASO 5: ENVÍO (FUTURO)                           │
│                    (Implementar después)                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ enviar_auditorias.py
                              ▼
        ┌───────────────────────────────────────────┐
        │ CANALES:                                  │
        │ • Email (PDF adjunto)                     │
        │ • WhatsApp Business API                   │
        │ • Tracking de aperturas y respuestas      │
        └───────────────────────────────────────────┘
```

---

## 🔢 Volumetría Estimada

### Escenario Real:
```
Base inicial:               2,500 restaurantes (scraping ya hecho)
├─ Enriquecimiento GMB:     2,500 × $0.10 = $250
│  └─ Elegibles:            ~800 (32%)
│     ├─ Rating < 4.0:      -30%
│     ├─ Reviews < 50:      -25%
│     ├─ Sin contacto:      -10%
│     └─ Cadenas:           -3%
│
├─ Selección manual:        800 → 100 marcados (12.5%)
│  └─ Criterio:             Mejor health score + tiene email/WhatsApp
│
└─ Generación PDF:          100 × $0.02 (OpenAI) = $2
   └─ PDFs finales:         100 auditorías

INVERSIÓN TOTAL:            $252
COSTO POR AUDITORÍA:        $2.52
AUDITORÍAS GENERADAS:       100
```

### Escenario Conservador (Fase MVP):
```
Base inicial:               100 restaurantes (muestra)
├─ Enriquecimiento GMB:     100 × $0.10 = $10
│  └─ Elegibles:            ~30
│
├─ Selección manual:        30 → 10 marcados
│
└─ Generación PDF:          10 × $0.02 = $0.20
   └─ PDFs finales:         10 auditorías

INVERSIÓN TOTAL:            $10.20
COSTO POR AUDITORÍA:        $1.02
AUDITORÍAS GENERADAS:       10
```

---

## 📋 Checklist de Implementación

### Sprint 1: Enriquecimiento (3-4 días)
- [ ] Crear `enriquecer_gmb_data.py`
  - [ ] Función `obtener_gmb_info(place_id)`
  - [ ] Función `obtener_reviews(place_id)`
  - [ ] Función `calcular_scores()`
  - [ ] Sistema de retry y manejo de errores
  - [ ] Guardado incremental (cada 10)
  - [ ] Logs detallados
- [ ] Probar con 10 restaurantes
- [ ] Ejecutar batch completo (2,500)
- [ ] Validar `restaurantes_gmb_enriquecidos.json`

### Sprint 2: Selección (1-2 días)
- [ ] Crear `seleccionar_candidatos.py`
  - [ ] Filtros automáticos
  - [ ] Interfaz CLI (mostrar resumen)
  - [ ] Marcar para auditoría (s/n)
  - [ ] Asignar prioridad
  - [ ] Guardar progreso
- [ ] Seleccionar 50-100 candidatos

### Sprint 3: Template PDF (2-3 días)
- [ ] Crear `templates/auditoria_template.html`
  - [ ] Página 1: Health Score
  - [ ] Página 2: Checklist
  - [ ] Página 3: Reviews
  - [ ] Página 4: Plan de Acción
- [ ] Reutilizar estilos de `generar_reporte.py`
- [ ] Probar renderizado

### Sprint 4: Generador (2-3 días)
- [ ] Crear `generar_auditoria_pdf.py`
  - [ ] Cargar candidatos seleccionados
  - [ ] Calcular todos los scores
  - [ ] Generar descripción optimizada (OpenAI)
  - [ ] Preparar contexto
  - [ ] Render HTML + PDF
  - [ ] Actualizar tracking
- [ ] Generar 3-5 PDFs de prueba
- [ ] Validar calidad
- [ ] Batch completo

### Sprint 5: Validación y Ajustes (1-2 días)
- [ ] Revisar PDFs generados
- [ ] Ajustar template según feedback
- [ ] Documentar proceso
- [ ] Preparar para envío manual

---

## 🎯 Decisiones Pendientes

1. **Scope del MVP:**
   - ¿Empezamos con 10, 100 o 2,500 restaurantes?
   - Recomendación: **Empezar con 100 para validar**

2. **Descripción optimizada:**
   - ¿Incluimos generación con OpenAI? (+$0.02/auditoría)
   - Recomendación: **SÍ, suma mucho valor**

3. **Gráficos:**
   - ¿Incluimos gráficos de distribución de ratings?
   - Recomendación: **SÍ, hace el PDF más profesional**

4. **Benchmarks:**
   - ¿Usamos benchmarks genéricos o calculamos del compset?
   - Recomendación: **Genéricos para MVP, compset en v2**

5. **OpenAI para análisis:**
   - ¿Solo descripción o también resumen de problemas?
   - Recomendación: **Solo descripción en MVP**

---

**¿Todo claro? ¿Arrancamos con el Sprint 1 (enriquecer_gmb_data.py)?**

