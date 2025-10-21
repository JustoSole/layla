# Mock Data - Guía de Uso

## 📦 Archivos disponibles

- `competitorMockData.ts` - Datos mock para CompetitorBenchmark
- `campaignMockData.ts` - Datos mock para Campaigns

## 🚀 Cómo usar

### Para CompetitorBenchmark.tsx

Opción 1 - Mock directo (desarrollo/demo):

```typescript
import { mockCompetitors, generateExtendedMetrics } from '../mocks/competitorMockData';

// En el componente, después de loadCompetitors o en desarrollo:
useEffect(() => {
  // Modo DEMO - comentar cuando tengas datos reales
  setManagedCompetitors(mockCompetitors);
  setLoadingCompetitors(false);
}, []);
```

Opción 2 - Fallback cuando no hay datos:

```typescript
import { mockCompetitors } from '../mocks/competitorMockData';

useEffect(() => {
  const loadCompetitors = async () => {
    // ... código existente ...
    
    if (response?.ok && response.list) {
      setManagedCompetitors(response.list);
    } else {
      // Usar mock data si no hay datos reales
      setManagedCompetitors(mockCompetitors);
    }
  };
  
  loadCompetitors();
}, [currentBusiness?.external_place_id]);
```

### Para Campaigns.tsx

Opción 1 - Mock directo (desarrollo/demo):

```typescript
import { mockCampaigns, mockFeedbackItems, getFilteredFeedback } from '../mocks/campaignMockData';

// En el componente:
useEffect(() => {
  // Modo DEMO - comentar cuando tengas datos reales
  setCampaigns(mockCampaigns);
  setLoading(false);
}, [currentBusiness?.id]);

// Para el feedback:
const handleViewFeedback = async (campaign: Campaign) => {
  setSelectedCampaign(campaign);
  setShowFeedbackModal(true);
  setFeedbackLoading(true);

  // Modo DEMO
  setTimeout(() => {
    const data = getFilteredFeedback(campaign.id, feedbackFilter);
    setFeedbackItems(data);
    setFeedbackLoading(false);
  }, 500);
};
```

Opción 2 - Fallback cuando no hay datos:

```typescript
import { mockCampaigns } from '../mocks/campaignMockData';

useEffect(() => {
  const fetchCampaigns = async () => {
    try {
      const data = await loadCampaigns(currentBusiness.id);
      setCampaigns(data.length > 0 ? data : mockCampaigns); // Usar mock si está vacío
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setCampaigns(mockCampaigns); // Usar mock en caso de error
    }
  };
  
  fetchCampaigns();
}, [currentBusiness?.id]);
```

## 🎯 Datos incluidos

### Competidores (5 negocios)
- La Parrilla del Centro (4.7★, 892 reviews) - ACTIVO
- El Buen Sabor (4.5★, 634 reviews) - ACTIVO  
- Restaurante Don José (4.3★, 421 reviews) - ACTIVO
- Casa de Comidas María (4.2★, 305 reviews) - ACTIVO
- El Rincón Gourmet (3.9★, 187 reviews) - INACTIVO

### Campañas (4 campañas)
- QR en Mesas - Cena: 342 visitas, 127 ratings, 89 redirects, 38 feedback
- Email Post-Visita: 218 visitas, 98 ratings, 76 redirects, 22 feedback
- Cartel en Entrada: 156 visitas, 54 ratings, 41 redirects, 13 feedback
- Ticket de Compra: 89 visitas, 23 ratings, 18 redirects, 5 feedback (PAUSADA)

### Feedback (8 items)
- 3 con rating 5★ (positivos)
- 2 con rating 4★ (positivos)
- 1 con rating 3★ (neutral)
- 2 con rating 2★ (negativos, críticos)
- 1 con rating 1★ (muy negativo, crítico)

Mix de estados: 4 resueltos, 4 pendientes
Incluye feedback crítico con flags de problemas reales

## ✅ Ventajas

- ✨ **Datos realistas** con métricas coherentes
- 🎨 **Muestra todas las variantes** (activos/inactivos, críticos/normales, etc)
- 🚀 **Fácil de activar/desactivar** para demos
- 📊 **Estadísticas calculadas automáticamente**
- 🔧 **TypeScript completo** con tipos correctos

## 🎬 Modo Demo Rápido

Para activar todo en modo demo, simplemente busca los comentarios `// Modo DEMO` en los archivos y descomenta/comenta según necesites.

