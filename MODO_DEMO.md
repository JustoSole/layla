# 🎬 Modo Demo - Guía Rápida

## ✅ Ya está activado!

El modo demo está **activo** por defecto. Verás datos de ejemplo en:
- 📊 **Competencia**: 5 competidores con métricas realistas
- 🎯 **Campañas**: 4 campañas con estadísticas completas
- 💬 **Feedback**: 8 comentarios de clientes (positivos, neutrales y críticos)

## 🔄 Cómo cambiar entre Demo y Producción

### Archivo: `src/config/demo.ts`

```typescript
export const DEMO_MODE = {
  enabled: true,  // ← Cambiar a false para usar datos reales
  // ...
};
```

**Modo Demo (datos ficticios):** `enabled: true`  
**Modo Producción (API real):** `enabled: false`

## 📊 Datos Mock Incluidos

### Competidores (5)
- La Parrilla del Centro - 4.7★ (892 reviews) ✅ ACTIVO
- El Buen Sabor - 4.5★ (634 reviews) ✅ ACTIVO
- Restaurante Don José - 4.3★ (421 reviews) ✅ ACTIVO
- Casa de Comidas María - 4.2★ (305 reviews) ✅ ACTIVO
- El Rincón Gourmet - 3.9★ (187 reviews) ⏸ INACTIVO

### Campañas (4)
1. **QR en Mesas - Cena**: 342 visitas → 127 ratings → 89 redirects + 38 feedback
2. **Email Post-Visita**: 218 visitas → 98 ratings → 76 redirects + 22 feedback
3. **Cartel en Entrada**: 156 visitas → 54 ratings → 41 redirects + 13 feedback
4. **Ticket de Compra**: 89 visitas → 23 ratings → 18 redirects + 5 feedback (PAUSADA)

### Feedback (8 items)
- ⭐⭐⭐⭐⭐ 3 comentarios muy positivos
- ⭐⭐⭐⭐ 2 comentarios positivos
- ⭐⭐⭐ 1 comentario neutral
- ⭐⭐ 2 comentarios negativos (con flags críticos)
- ⭐ 1 comentario muy negativo (crítico)

### Staff Dashboard (9 miembros)
**Top Performers:**
- Carlos Rodríguez (Chef) - 92% positivo, 38 menciones 🏆
- María García (Mesera Principal) - 91% positivo, 45 menciones 🏆
- Sofía Torres (Sommelier) - 89% positivo, 19 menciones 🏆

**Rendimiento Bueno:**
- Ana Martínez (Bartender) - 88% positivo
- José Fernández (Mesero) - 82% positivo
- Patricia Ruiz (Mesera) - 81% positivo
- Laura Sánchez (Hostess) - 79% positivo

**Necesitan Atención:**
- Diego López (Mesero) - 68% positivo ⚠️
- Roberto Gómez (Ayudante) - 50% positivo ⚠️

**Estadísticas Generales:**
- 236 menciones totales
- 197 positivas (83% promedio)
- Menciones detalladas con contexto y sentiment

## 🎯 Qué muestra esto

✨ **Ranking Competitivo**: Visualiza tu posición vs competencia  
📈 **Health Score**: Métricas de salud del negocio  
🎯 **Plan de Acción**: Recomendaciones basadas en gaps  
📊 **Conversión de Campañas**: Funnel completo de visitas a reviews  
💬 **Feedback Crítico**: Issues que requieren atención inmediata  
⚡ **Métricas en Tiempo Real**: Tasas de respuesta, tiempo promedio, etc.  
👥 **Desempeño del Staff**: Menciones automáticas por empleado con sentiment analysis  
🏆 **Top Performers**: Ranking de empleados mejor valorados  
⚠️ **Staff de Riesgo**: Detecta empleados con menciones negativas

## 🚀 Cómo ver los datos

1. Abre la aplicación: `npm run dev`
2. Navega a cualquier sección:
   - **Competencia**: Ver ranking y comparativas
   - **Campañas**: Ver campañas y feedback capturado
   - **Staff** (en menú Insights): Ver desempeño del equipo
3. Los datos se cargarán automáticamente en ~600ms
4. Revisa la consola del navegador para ver logs de confirmación
5. En Staff Dashboard, haz click en "Ver menciones" para ver detalles de cada empleado

## 💡 Tips

- Los mocks están en `src/mocks/`
- Puedes modificar los datos editando:
  - `competitorMockData.ts` (competidores y métricas)
  - `campaignMockData.ts` (campañas y feedback)
  - `staffMockData.ts` (empleados y menciones)
- El delay de red (600ms) simula una llamada API real
- Los datos son coherentes entre sí (reviews, ratings, etc.)
- Las menciones de staff incluyen extractos reales de reseñas

## ⚙️ Control Granular

Si solo quieres activar mocks para ciertos componentes:

```typescript
// src/config/demo.ts
export const USE_MOCK_COMPETITORS = true;  // Solo competidores
export const USE_MOCK_CAMPAIGNS = false;    // Campañas reales
export const USE_MOCK_FEEDBACK = false;     // Feedback real
export const USE_MOCK_STAFF = false;        // Staff real
```

Luego cambia `DEMO_MODE.enabled = false` para usar configuración granular.

## 🎭 Resumen de Datos Mock

| Sección | Cantidad | Detalles |
|---------|----------|----------|
| **Competidores** | 5 | 4 activos, 1 inactivo |
| **Campañas** | 4 | 3 activas, 1 pausada |
| **Feedback** | 8 | 5 positivos, 1 neutral, 2 críticos |
| **Staff** | 9 | 3 top performers, 2 necesitan atención |
| **Menciones Staff** | 20+ | Con extractos reales y sentiment |

