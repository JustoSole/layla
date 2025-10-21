// Mock data para Campaigns
export const mockCampaigns = [
  {
    id: 'camp-1',
    business_id: 'my-business-1',
    name: 'QR en Mesas - Cena',
    short_code: 'abc123',
    status: 'active' as const,
    views_count: 2847,
    ratings_captured: 1124,
    redirected_count: 892,
    internal_feedback_count: 267,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días atrás
    updated_at: new Date().toISOString()
  },
  {
    id: 'camp-2',
    business_id: 'my-business-1',
    name: 'Email Post-Visita',
    short_code: 'xyz789',
    status: 'active' as const,
    views_count: 1923,
    ratings_captured: 847,
    redirected_count: 623,
    internal_feedback_count: 189,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 días atrás
    updated_at: new Date().toISOString()
  },
  {
    id: 'camp-3',
    business_id: 'my-business-1',
    name: 'Cartel en Entrada',
    short_code: 'def456',
    status: 'active' as const,
    views_count: 1456,
    ratings_captured: 567,
    redirected_count: 423,
    internal_feedback_count: 134,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'camp-4',
    business_id: 'my-business-1',
    name: 'Ticket de Compra',
    short_code: 'ghi789',
    status: 'paused' as const,
    views_count: 743,
    ratings_captured: 234,
    redirected_count: 176,
    internal_feedback_count: 58,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock feedback data
export const mockFeedbackItems = [
  {
    id: 'fb-1',
    campaign_id: 'camp-1',
    business_id: 'my-business-1',
    rating_value: 5,
    review_text: 'Excelente experiencia! La comida estuvo deliciosa y el servicio fue muy atento. Definitivamente volveremos.',
    selected_aspects: ['comida', 'servicio', 'ambiente'],
    sentiment: 'positive',
    executive_summary: 'Cliente muy satisfecho con la comida y el servicio, planea volver',
    ces_score: 5,
    nps_score: 10,
    customer_email: 'maria.gonzalez@email.com',
    customer_phone: null,
    critical_flags: [],
    resolution_status: 'resolved',
    resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'fb-2',
    campaign_id: 'camp-1',
    business_id: 'my-business-1',
    rating_value: 2,
    review_text: 'Tardaron mucho en atendernos y la comida llegó fría. Esperaba más por el precio.',
    selected_aspects: ['servicio', 'comida', 'tiempo_espera'],
    sentiment: 'negative',
    executive_summary: 'Servicio lento, comida fría, no cumplió expectativas de precio-calidad',
    ces_score: 2,
    nps_score: 3,
    customer_email: 'carlos.rodriguez@email.com',
    customer_phone: '+54 9 11 2345-6789',
    critical_flags: ['servicio_lento', 'comida_fria', 'insatisfaccion_precio'],
    resolution_status: 'pending',
    resolved_at: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // Hace 2 horas
  },
  {
    id: 'fb-3',
    campaign_id: 'camp-2',
    business_id: 'my-business-1',
    rating_value: 4,
    review_text: 'Muy buena comida y ambiente agradable. Solo mejoraría la velocidad del servicio en horas pico.',
    selected_aspects: ['comida', 'ambiente', 'servicio'],
    sentiment: 'positive',
    executive_summary: 'Experiencia positiva general, sugiere mejorar velocidad en horas pico',
    ces_score: 4,
    nps_score: 8,
    customer_email: 'ana.martinez@email.com',
    customer_phone: null,
    critical_flags: [],
    resolution_status: 'resolved',
    resolved_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'fb-4',
    campaign_id: 'camp-1',
    business_id: 'my-business-1',
    rating_value: 1,
    review_text: 'Pésima experiencia. El mesero fue grosero y encontré un cabello en mi plato. No volveré.',
    selected_aspects: ['servicio', 'higiene', 'comida'],
    sentiment: 'negative',
    executive_summary: 'Experiencia muy negativa: mal servicio, problema de higiene, cliente perdido',
    ces_score: 1,
    nps_score: 0,
    customer_email: 'jorge.lopez@email.com',
    customer_phone: '+54 9 11 8765-4321',
    critical_flags: ['servicio_grosero', 'problema_higiene', 'cliente_perdido'],
    resolution_status: 'pending',
    resolved_at: null,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // Hace 30 minutos
  },
  {
    id: 'fb-5',
    campaign_id: 'camp-2',
    business_id: 'my-business-1',
    rating_value: 5,
    review_text: 'Increíble! Fue para celebrar nuestro aniversario y todo estuvo perfecto.',
    selected_aspects: ['comida', 'servicio', 'ambiente', 'experiencia_general'],
    sentiment: 'positive',
    executive_summary: 'Celebración especial, experiencia perfecta en todos los aspectos',
    ces_score: 5,
    nps_score: 10,
    customer_email: null,
    customer_phone: null,
    critical_flags: [],
    resolution_status: 'resolved',
    resolved_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'fb-6',
    campaign_id: 'camp-3',
    business_id: 'my-business-1',
    rating_value: 3,
    review_text: 'Regular. La comida estaba bien pero nada excepcional. Relación precio-calidad justa.',
    selected_aspects: ['comida', 'precio'],
    sentiment: 'neutral',
    executive_summary: 'Experiencia promedio, sin destacarse positiva ni negativamente',
    ces_score: 3,
    nps_score: 6,
    customer_email: 'lucia.fernandez@email.com',
    customer_phone: null,
    critical_flags: [],
    resolution_status: 'pending',
    resolved_at: null,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // Hace 12 horas
  },
  {
    id: 'fb-7',
    campaign_id: 'camp-1',
    business_id: 'my-business-1',
    rating_value: 2,
    review_text: 'Nos cobraron de más en la cuenta y tardaron en solucionarlo. La comida estaba bien pero la experiencia se arruinó.',
    selected_aspects: ['servicio', 'precio', 'atencion_al_cliente'],
    sentiment: 'negative',
    executive_summary: 'Error en facturación, demora en resolución, experiencia arruinada pese a buena comida',
    ces_score: 2,
    nps_score: 4,
    customer_email: 'roberto.diaz@email.com',
    customer_phone: '+54 9 11 5555-1234',
    critical_flags: ['error_facturacion', 'demora_resolucion'],
    resolution_status: 'pending',
    resolved_at: null,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // Hace 6 horas
  },
  {
    id: 'fb-8',
    campaign_id: 'camp-2',
    business_id: 'my-business-1',
    rating_value: 4,
    review_text: 'Muy recomendable. Las pastas caseras son espectaculares. Solo le falta un poco más de variedad en postres.',
    selected_aspects: ['comida', 'menu'],
    sentiment: 'positive',
    executive_summary: 'Experiencia positiva, destaca pastas caseras, sugiere más variedad en postres',
    ces_score: 4,
    nps_score: 8,
    customer_email: 'sofia.torres@email.com',
    customer_phone: null,
    critical_flags: [],
    resolution_status: 'resolved',
    resolved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Helper para obtener feedback por campaña
export const getFeedbackByCampaign = (campaignId: string) => {
  return mockFeedbackItems.filter(item => item.campaign_id === campaignId);
};

// Helper para obtener feedback filtrado
export const getFilteredFeedback = (
  campaignId: string,
  filter: 'all' | 'pending' | 'resolved' | 'critical'
) => {
  let items = getFeedbackByCampaign(campaignId);
  
  switch (filter) {
    case 'pending':
      return items.filter(f => f.resolution_status === 'pending');
    case 'resolved':
      return items.filter(f => f.resolution_status === 'resolved');
    case 'critical':
      return items.filter(f => f.sentiment === 'negative' || (f.critical_flags && f.critical_flags.length > 0));
    default:
      return items;
  }
};

