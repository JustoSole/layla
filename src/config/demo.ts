/**
 * Configuración de modo DEMO
 * 
 * Cambia estas variables para activar/desactivar mock data
 */

// Usar mock data para competidores
export const USE_MOCK_COMPETITORS = false;

// Usar mock data para campañas
export const USE_MOCK_CAMPAIGNS = false;

// Usar mock data para feedback
export const USE_MOCK_FEEDBACK = false;

// Usar mock data para staff
export const USE_MOCK_STAFF = false;

// Delay simulado de red (ms)
export const MOCK_NETWORK_DELAY = 600;

/**
 * Helper para activar TODO el modo demo de una vez
 */
export const DEMO_MODE = {
  enabled: true, // 🎯 Cambiar a true para activar modo demo completo
  
  get competitors() {
    return this.enabled || USE_MOCK_COMPETITORS;
  },
  
  get campaigns() {
    return this.enabled || USE_MOCK_CAMPAIGNS;
  },
  
  get feedback() {
    return this.enabled || USE_MOCK_FEEDBACK;
  },
  
  get staff() {
    return this.enabled || USE_MOCK_STAFF;
  }
};

