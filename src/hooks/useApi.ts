import { useState } from 'react';

// Hook básico para compatibilidad con Dashboard
export const useBusinessSetup = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const setupBusiness = async (cid: string, tripAdvisorUrl?: string) => {
    setLoading(true);
    setProgress(0);
    
    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // TODO: Implementar llamada real a la API cuando sea necesario
      console.log('🔧 setupBusiness llamado con:', { cid, tripAdvisorUrl });
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Retornar datos simulados por ahora
      return {
        business: {
          business_info: {
            name: 'Negocio Demo',
            rating: 4.2,
            cid: cid
          }
        },
        googleReviews: {
          inserted: 0,
          rating_summary: {
            average: 4.2,
            total_reviews: 0
          }
        },
        tripAdvisorReviews: null
      };
      
    } catch (error) {
      console.error('❌ Error in setupBusiness:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    progress,
    setupBusiness
  };
};

// Export por defecto para mantener compatibilidad
export default {
  useBusinessSetup
};


