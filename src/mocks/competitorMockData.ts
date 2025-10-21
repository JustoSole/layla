// Mock data para CompetitorBenchmark con métricas más impresionantes
export const mockCompetitors = [
  {
    id: 'comp-1',
    external_place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    name: 'La Parrilla del Centro',
    googleUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4',
    tripadvisorUrl: 'https://www.tripadvisor.com/Restaurant-123',
    rating: 4.7,
    totalReviews: 2847, // Números más impresionantes
    isActive: true,
    rank: 1
  },
  {
    id: 'comp-2',
    external_place_id: 'ChIJrTLr-GyuEmsRBfy61i59si0',
    name: 'El Buen Sabor',
    googleUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJrTLr-GyuEmsRBfy61i59si0',
    tripadvisorUrl: 'https://www.tripadvisor.com/Restaurant-456',
    rating: 4.5,
    totalReviews: 1923,
    isActive: true,
    rank: 2
  },
  {
    id: 'comp-3',
    external_place_id: 'ChIJkW0VZz2uEmsR8cQZkf3fGh8',
    name: 'Restaurante Don José',
    googleUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJkW0VZz2uEmsR8cQZkf3fGh8',
    rating: 4.3,
    totalReviews: 1654,
    isActive: true,
    rank: 3
  },
  {
    id: 'comp-4',
    external_place_id: 'ChIJM8KLZj6uEmsR9kQZkf3fGh9',
    name: 'Casa de Comidas María',
    googleUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJM8KLZj6uEmsR9kQZkf3fGh9',
    tripadvisorUrl: 'https://www.tripadvisor.com/Restaurant-789',
    rating: 4.2,
    totalReviews: 1289,
    isActive: true,
    rank: 4
  },
  {
    id: 'comp-5',
    external_place_id: 'ChIJP9KLZj6uEmsR9kQZkf3fGh0',
    name: 'El Rincón Gourmet',
    googleUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJP9KLZj6uEmsR9kQZkf3fGh0',
    rating: 3.9,
    totalReviews: 743,
    isActive: false,
    rank: 5
  },
  {
    id: 'comp-6',
    external_place_id: 'ChIJX1KLZj6uEmsR9kQZkf3fGh1',
    name: 'Asado Premium',
    googleUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJX1KLZj6uEmsR9kQZkf3fGh1',
    tripadvisorUrl: 'https://www.tripadvisor.com/Restaurant-101',
    rating: 4.1,
    totalReviews: 987,
    isActive: true,
    rank: 6
  }
];

// Mock data para el negocio actual con números más impresionantes
export const mockCurrentBusiness = {
  id: 'my-business-1',
  external_place_id: 'ChIJXYZ123456789',
  name: 'local1',
  rating: 3.8, // Rating realista que muestra oportunidad de mejora
  totalReviews: 1456, // Cantidad significativa de reviews
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // Métricas adicionales para mostrar valor del sistema
  rank: 5, // 5to lugar entre competidores (espacio para crecer)
  monthlyGrowth: 15, // % crecimiento mensual en reviews
  responseRate: 62, // % de respuestas (oportunidad de mejora)
  avgResponseTime: 2.8, // días promedio de respuesta
  criticalIssues: 5, // Issues que requieren atención
  staffMentions: 47, // Menciones automáticas del staff detectadas
  competitorGap: 0.9 // Diferencia con el líder (4.7 - 3.8)
};

// Función helper para generar métricas extendidas realistas
export const generateExtendedMetrics = (baseRating: number, totalReviews: number) => {
  // Reviews por mes: basado en total de reviews (asumiendo 18 meses de antigüedad promedio)
  const reviewsPerMonth = Number(((totalReviews / 18) * (0.85 + Math.random() * 0.3)).toFixed(1));
  
  // Negativas: inversamente proporcional al rating
  // 5.0★ = ~2%, 4.5★ = ~8%, 4.0★ = ~15%, 3.5★ = ~25%
  const negativePercent = Math.round(Math.max(0, (5 - baseRating) * 12 + (Math.random() * 5 - 2)));
  
  // Tasa de respuesta: correlacionado con calidad (mejores negocios responden más)
  const baseResponseRate = baseRating >= 4.5 ? 85 : baseRating >= 4.0 ? 65 : 45;
  const responseRate = Math.round(baseResponseRate + (Math.random() * 20 - 10));
  
  // Tiempo promedio de respuesta
  const avgResponseTime = responseRate > 80 ? '< 1 día' : 
                         responseRate > 60 ? '1-2 días' : 
                         responseRate > 40 ? '3-5 días' : 
                         '> 1 semana';
  
  // Delta de rating (tendencia reciente)
  const ratingDelta = Number((Math.random() * 0.3 - 0.15).toFixed(1));
  
  // Nivel de confianza basado en volumen
  const confidenceLevel = totalReviews > 500 ? 'alta' : 
                         totalReviews > 200 ? 'media' : 
                         'baja';
  
  // Topics principales (más variados)
  const allTopics = ['comida', 'servicio', 'ambiente', 'precio', 'limpieza', 'rapidez'];
  const numTopics = Math.min(3, Math.floor(totalReviews / 150) + 1);
  const topics = allTopics.slice(0, numTopics);
  
  return {
    reviewsPerMonth,
    negativePercent,
    responseRate,
    avgResponseTime,
    ratingDelta,
    confidenceLevel,
    topics,
    priceLevel: 'moderate',
    distance: `${(Math.random() * 2.5).toFixed(1)} km`,
    category: 'Restaurante'
  };
};

