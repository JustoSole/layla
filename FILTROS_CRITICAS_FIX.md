# Fix: Filtro de Reseñas Críticas - Usar Análisis NLP

## Problema Identificado

El sistema estaba clasificando como "críticas sin responder" TODAS las reseñas con rating ≤ 3★ que no tenían respuesta, en lugar de usar la clasificación de sentimiento del análisis NLP. Esto mostraba muchas reseñas que no eran realmente críticas.

## Solución Implementada

Se actualizó la lógica en todos los componentes para usar el campo `sentiment` del análisis NLP en lugar del `rating_value`:

### ✅ Antes (incorrecto):
```javascript
// Tomaba TODAS las reseñas ≤3★ sin respuesta
const critical = reviews.filter(r => (r.rating_value || 0) <= 3 && !r.owner_answer).length;
```

### ✅ Después (correcto):
```javascript
// Toma SOLO las reseñas clasificadas como negativas por NLP sin respuesta
const critical = reviews.filter(r => r.sentiment === 'negative' && !r.owner_answer).length;
```

## Archivos Modificados

1. **Dashboard.tsx** (línea 68)
   - Cambió filtro de críticas sin responder para usar `sentiment === 'negative'`

2. **ReviewsManager.tsx** (línea 94-104)
   - Actualizó función `isUrgent()` para usar sentiment en lugar de rating
   - Una review es urgente si:
     - Es negativa según NLP Y no está respondida
     - O ha excedido el SLA de 48h Y no está respondida

3. **DailyDigest.tsx** (línea 60-63)
   - Cambió clasificación de sentimiento para usar análisis NLP
   - Positivas: `sentiment === 'positive'`
   - Negativas: `sentiment === 'negative'`
   - Neutras: `sentiment === 'neutral'` o sin sentiment

4. **Navigation.tsx** (línea 69-77)
   - Actualizó contador de críticas pendientes (`pendingCount`) para usar sentiment
   - Corrigió error de TypeScript: cambió `currentBusiness?.id` por `currentBusiness?.external_place_id`

5. **Campaigns.tsx** (línea 138-141)
   - Actualizó filtro de feedback crítico para usar sentiment
   - Mantiene `critical_flags` como backup

6. **Playbook.tsx** (línea 36-39)
   - Actualizó contador de respuestas pendientes para usar sentiment

## Impacto

### Antes:
- **Todas** las reseñas 1★, 2★ y 3★ sin responder se marcaban como "críticas"
- Muchos falsos positivos (ej: 3★ con comentarios neutros o positivos)

### Después:
- **Solo** las reseñas clasificadas como `sentiment: 'negative'` por el análisis NLP se marcan como "críticas"
- Clasificación más precisa basada en el contenido real del texto
- Menos ruido, más foco en reseñas que realmente requieren atención urgente

## Ventajas del Nuevo Sistema

1. **Mayor precisión**: El NLP analiza el contenido del texto, no solo el rating numérico
2. **Menos falsos positivos**: Una reseña de 3★ con comentarios constructivos no se marca como crítica
3. **Priorización correcta**: Los usuarios ven solo las reseñas que realmente necesitan atención inmediata
4. **Consistencia**: Todos los componentes usan la misma lógica de clasificación

## Testing Recomendado

- [ ] Verificar que el Dashboard muestre el conteo correcto de críticas
- [ ] Verificar que el filtro "Urgentes" en ReviewsManager muestre solo reseñas negativas
- [ ] Verificar que el badge en Navigation muestre el número correcto
- [ ] Verificar que DailyDigest clasifique correctamente por sentiment
- [ ] Verificar que el filtro de Campaigns funcione correctamente

## Notas Adicionales

- El sistema sigue usando `critical_flags` como campo complementario en algunos componentes
- Las reseñas sin análisis NLP (`sentiment === null`) no se marcarán como críticas
- El SLA de 48h sigue siendo un factor de urgencia independiente del sentiment

