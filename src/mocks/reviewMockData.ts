// Mock data para reviews individuales - DEMO MODE
import { ReviewData } from '../types/schema';

export const mockReviewsData: ReviewData[] = [
  {
    id: 'rev-001',
    external_place_id: 'mock-business-id',
    author_name: 'María González',
    rating_value: 5,
    review_text: 'Excelente experiencia! La atención de Carlos fue excepcional, muy atento y profesional. La comida llegó rápido y el sabor superó nuestras expectativas. Definitivamente volveremos.',
    provider: 'google',
    posted_at: '2025-08-19T19:30:00Z', // Ayer - dentro de últimos 7 días
    owner_answer: 'Muchas gracias María por tu comentario! Nos alegra saber que Carlos te brindó una excelente atención. Te esperamos pronto nuevamente.',
    owner_posted_at: '2025-08-20T10:15:00Z', // Hoy - respuesta rápida
    images: [
      { image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300', thumb_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=150' }
    ],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Servicio', sentiment: 'positive', confidence: 0.95, evidence_spans: ['atención excepcional', 'muy atento y profesional'] },
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.92, evidence_spans: ['Carlos fue excepcional'] },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.88, evidence_spans: ['comida llegó rápido', 'sabor superó expectativas'] }
    ],
    overall_score: 4.8,
    overall_sentiment_confidence: 0.91,
    gap_to_five: 0.2,
    gap_reasons: ['Ambiente podría ser más acogedor'],
    critical_flags: [],
    executive_summary: 'Cliente muy satisfecho con el servicio de Carlos y calidad de comida.',
    action_items: ['Continuar con el excelente servicio de Carlos', 'Mantener calidad de comida'],
    language: 'es'
  },
  {
    id: 'rev-002',
    external_place_id: 'mock-business-id',
    author_name: 'Roberto Silva',
    rating_value: 4,
    review_text: 'Muy buena comida y precios razonables. La mesera Sofía nos atendió muy bien, aunque tuvimos que esperar un poco para que nos tomen el pedido. El lugar es acogedor.',
    provider: 'google',
    posted_at: '2025-08-18T20:45:00Z', // Hace 2 días - dentro de últimos 7 días
    owner_answer: null,
    owner_posted_at: null,
    images: [],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.89, evidence_spans: ['muy buena comida'] },
      { aspect: 'Precios', sentiment: 'positive', confidence: 0.85, evidence_spans: ['precios razonables'] },
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.82, evidence_spans: ['Sofía nos atendió muy bien'] },
      { aspect: 'Tiempo de espera', sentiment: 'negative', confidence: 0.78, evidence_spans: ['esperar un poco para que nos tomen el pedido'] }
    ],
    overall_score: 4.1,
    overall_sentiment_confidence: 0.84,
    gap_to_five: 0.9,
    gap_reasons: ['Reducir tiempo de espera para tomar pedido'],
    critical_flags: [],
    executive_summary: 'Experiencia positiva con área de mejora en tiempos de atención.',
    action_items: ['Capacitar staff sobre tiempos de respuesta', 'Optimizar proceso de toma de pedidos'],
    language: 'es'
  },
  {
    id: 'rev-003',
    external_place_id: 'mock-business-id',
    author_name: 'Ana Martín',
    rating_value: 2,
    review_text: 'Muy decepcionada con la experiencia. Diego, el mesero, fue bastante descortés y el pedido tardó más de 45 minutos. La comida estaba fría cuando llegó. No creo que vuelva.',
    provider: 'google',
    posted_at: '2025-08-16T21:15:00Z', // Hace 4 días - CRÍTICA reciente
    owner_answer: null, // Sin responder - aparecerá como crítica pendiente
    owner_posted_at: null,
    images: [],
    sentiment: 'negative',
    aspects: [
      { aspect: 'Personal', sentiment: 'negative', confidence: 0.94, evidence_spans: ['Diego fue bastante descortés'] },
      { aspect: 'Tiempo de espera', sentiment: 'negative', confidence: 0.91, evidence_spans: ['tardó más de 45 minutos'] },
      { aspect: 'Temperatura comida', sentiment: 'negative', confidence: 0.87, evidence_spans: ['comida estaba fría cuando llegó'] }
    ],
    overall_score: 2.1,
    overall_sentiment_confidence: 0.91,
    gap_to_five: 2.9,
    gap_reasons: ['Mejorar actitud del personal', 'Reducir tiempos de cocina', 'Servir comida caliente'],
    critical_flags: ['staff_complaint', 'service_delay', 'food_quality', 'pending_response'],
    executive_summary: 'Experiencia muy negativa que requiere atención inmediata del staff y procesos.',
    action_items: ['Hablar urgentemente con Diego sobre atención al cliente', 'Revisar tiempos de cocina', 'Responder inmediatamente al cliente'],
    language: 'es'
  },
  {
    id: 'rev-004',
    external_place_id: 'mock-business-id',
    author_name: 'Luis Rodríguez',
    rating_value: 5,
    review_text: 'Increíble! María, la mesera, fue súper atenta durante toda la cena. La comida exquisita y el ambiente perfecto para una cita romántica. 100% recomendado.',
    provider: 'tripadvisor',
    posted_at: '2025-08-15T22:00:00Z', // Hace 5 días - dentro de últimos 7 días
    owner_answer: 'Muchas gracias Luis! María se emocionará al leer tu comentario. Nos alegra haber sido parte de tu cita especial.',
    owner_posted_at: '2025-08-16T11:00:00Z',
    images: [
      { image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300', thumb_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=150' }
    ],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.96, evidence_spans: ['María fue súper atenta'] },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.93, evidence_spans: ['comida exquisita'] },
      { aspect: 'Ambiente', sentiment: 'positive', confidence: 0.89, evidence_spans: ['ambiente perfecto para una cita romántica'] }
    ],
    overall_score: 4.9,
    overall_sentiment_confidence: 0.93,
    gap_to_five: 0.1,
    gap_reasons: [],
    critical_flags: [],
    executive_summary: 'Experiencia excelente, cliente muy satisfecho con servicio de María.',
    action_items: ['Felicitar a María por su excelente servicio', 'Mantener calidad actual'],
    language: 'es'
  },
  {
    id: 'rev-005',
    external_place_id: 'mock-business-id',
    author_name: 'Carmen López',
    rating_value: 3,
    review_text: 'La comida está bien, nada extraordinario. El servicio fue correcto pero sin destacar. Los precios son un poco elevados para lo que ofrecen.',
    provider: 'google',
    posted_at: '2025-08-10T19:45:00Z', // Hace 10 días - últimos 30 días
    owner_answer: null,
    owner_posted_at: null,
    images: [],
    sentiment: 'neutral',
    aspects: [
      { aspect: 'Comida', sentiment: 'neutral', confidence: 0.81 },
      { aspect: 'Servicio', sentiment: 'neutral', confidence: 0.79 },
      { aspect: 'Precios', sentiment: 'negative', confidence: 0.84 }
    ],
    overall_score: 3.2,
    overall_sentiment_confidence: 0.81,
    gap_to_five: 1.8,
    gap_reasons: ['Mejorar relación calidad-precio', 'Elevar nivel de servicio'],
    critical_flags: [],
    executive_summary: 'Experiencia promedio con oportunidad de mejora en valor percibido.',
    action_items: ['Revisar estructura de precios', 'Capacitar staff para servicio excepcional'],
    language: 'es'
  },
  {
    id: 'rev-006',
    external_place_id: 'mock-business-id',
    author_name: 'Pedro Gómez',
    rating_value: 1,
    review_text: 'Pésima experiencia. Roberto, el ayudante, fue muy maleducado cuando le hicimos una consulta. La comida tardó 1 hora y cuando llegó estaba horrible. No volveremos NUNCA.',
    provider: 'google',
    posted_at: '2025-08-05T20:30:00Z', // Hace 15 días - CRÍTICA sin responder
    owner_answer: null, // Sin responder - crítica pendiente
    owner_posted_at: null,
    images: [],
    sentiment: 'negative',
    aspects: [
      { aspect: 'Personal', sentiment: 'negative', confidence: 0.98, evidence_spans: ['Roberto fue muy maleducado'] },
      { aspect: 'Tiempo de espera', sentiment: 'negative', confidence: 0.95, evidence_spans: ['tardó 1 hora'] },
      { aspect: 'Comida', sentiment: 'negative', confidence: 0.92, evidence_spans: ['estaba horrible'] }
    ],
    overall_score: 1.2,
    overall_sentiment_confidence: 0.95,
    gap_to_five: 3.8,
    gap_reasons: ['Capacitar personal en atención al cliente', 'Mejorar procesos de cocina', 'Controlar calidad de comida'],
    critical_flags: ['staff_complaint', 'service_delay', 'food_quality', 'customer_lost', 'pending_response'],
    executive_summary: 'Experiencia muy negativa que requiere acción inmediata y seguimiento.',
    action_items: ['Hablar urgentemente con Roberto', 'Revisar procesos de cocina', 'Responder inmediatamente al cliente', 'Plan de recuperación del cliente'],
    language: 'es'
  },
  {
    id: 'rev-007',
    external_place_id: 'mock-business-id',
    author_name: 'Claudia Torres',
    rating_value: 4,
    review_text: 'Buena experiencia en general. José, el mesero, muy atento y simpático. La pasta estaba deliciosa, aunque el postre podría mejorar. Lugar agradable para ir en familia.',
    provider: 'google',
    posted_at: '2025-08-01T19:00:00Z', // Hace 19 días - últimos 30 días
    owner_answer: 'Gracias Claudia! Le pasamos tu felicitación a José. Tomaremos nota sobre el postre para mejorarlo.',
    owner_posted_at: '2025-08-02T12:00:00Z',
    images: [],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.91 },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.85 },
      { aspect: 'Postres', sentiment: 'negative', confidence: 0.79 },
      { aspect: 'Ambiente', sentiment: 'positive', confidence: 0.87 }
    ],
    overall_score: 4.0,
    overall_sentiment_confidence: 0.86,
    gap_to_five: 1.0,
    gap_reasons: ['Mejorar calidad de postres'],
    critical_flags: [],
    executive_summary: 'Experiencia positiva con área específica de mejora en postres.',
    action_items: ['Felicitar a José', 'Revisar recetas de postres', 'Mantener ambiente familiar'],
    language: 'es'
  },
  {
    id: 'rev-008',
    external_place_id: 'mock-business-id',
    author_name: 'Fernando Castro',
    rating_value: 5,
    review_text: 'Espectacular! Patricia nos recibió con una sonrisa y nos hizo sentir como en casa. La comida impecable, especialmente el plato del día. Carlos, el chef, se merece un reconocimiento.',
    provider: 'tripadvisor',
    posted_at: '2025-07-28T20:15:00Z', // Hace 23 días - últimos 30 días
    owner_answer: 'Fernando, muchas gracias por tus palabras! Patricia y Carlos estarán muy contentos. Tu comentario nos motiva a seguir mejorando cada día.',
    owner_posted_at: '2025-07-29T09:30:00Z',
    images: [
      { image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300', thumb_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200&h=150' }
    ],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.95 },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.94 },
      { aspect: 'Recepción', sentiment: 'positive', confidence: 0.92 }
    ],
    overall_score: 4.9,
    overall_sentiment_confidence: 0.94,
    gap_to_five: 0.1,
    gap_reasons: [],
    critical_flags: [],
    executive_summary: 'Experiencia excelente destacando trabajo de Patricia y Carlos.',
    action_items: ['Reconocer trabajo de Patricia y Carlos', 'Mantener calidad del plato del día'],
    language: 'es'
  },
  // Más reviews para hacer el sistema más impresionante
  {
    id: 'rev-009',
    external_place_id: 'mock-business-id',
    author_name: 'Alejandro Morales',
    rating_value: 5,
    review_text: 'Increíble experiencia! Patricia nos recibió con una sonrisa y Carlos preparó el mejor bife de mi vida. El servicio de José fue impecable durante toda la cena.',
    provider: 'google',
    posted_at: '2025-08-17T20:30:00Z', // Hace 3 días
    owner_answer: 'Alejandro, muchas gracias! Patricia, Carlos y José estarán muy contentos con tu comentario.',
    owner_posted_at: '2025-08-18T09:00:00Z',
    images: [],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.94, evidence_spans: ['Patricia nos recibió con una sonrisa', 'servicio de José impecable'] },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.96, evidence_spans: ['Carlos preparó el mejor bife de mi vida'] },
      { aspect: 'Servicio', sentiment: 'positive', confidence: 0.92, evidence_spans: ['servicio impecable durante toda la cena'] }
    ],
    overall_score: 4.9,
    overall_sentiment_confidence: 0.95,
    gap_to_five: 0.1,
    gap_reasons: [],
    critical_flags: [],
    executive_summary: 'Cliente extremadamente satisfecho con todo el equipo.',
    action_items: ['Felicitar a Patricia, Carlos y José por excelente trabajo'],
    language: 'es'
  },
  {
    id: 'rev-010',
    external_place_id: 'mock-business-id',
    author_name: 'Gabriela Herrera',
    rating_value: 2,
    review_text: 'Muy decepcionada. Roberto tardó 20 minutos en atendernos y cuando llegó fue bastante antipático. La comida estaba fría y el ambiente ruidoso.',
    provider: 'google',
    posted_at: '2025-08-14T19:45:00Z', // Hace 6 días
    owner_answer: null,
    owner_posted_at: null,
    images: [],
    sentiment: 'negative',
    aspects: [
      { aspect: 'Personal', sentiment: 'negative', confidence: 0.91, evidence_spans: ['Roberto fue bastante antipático'] },
      { aspect: 'Tiempo de espera', sentiment: 'negative', confidence: 0.89, evidence_spans: ['tardó 20 minutos en atendernos'] },
      { aspect: 'Temperatura comida', sentiment: 'negative', confidence: 0.85, evidence_spans: ['comida estaba fría'] },
      { aspect: 'Ambiente', sentiment: 'negative', confidence: 0.78, evidence_spans: ['ambiente ruidoso'] }
    ],
    overall_score: 2.3,
    overall_sentiment_confidence: 0.88,
    gap_to_five: 2.7,
    gap_reasons: ['Mejorar actitud de Roberto', 'Capacitar en tiempos de atención', 'Controlar temperatura de comida', 'Reducir ruido ambiente'],
    critical_flags: ['staff_complaint', 'service_delay', 'food_quality', 'pending_response'],
    executive_summary: 'Experiencia muy negativa que requiere acción inmediata con Roberto y procesos.',
    action_items: ['Hablar urgentemente con Roberto sobre actitud', 'Capacitar en tiempos de servicio', 'Responder inmediatamente'],
    language: 'es'
  },
  {
    id: 'rev-011',
    external_place_id: 'mock-business-id',
    author_name: 'Ricardo Vega',
    rating_value: 4,
    review_text: 'Buena experiencia en general. María nos atendió muy bien y la comida estaba rica. Solo el postre podría mejorar, pero volveremos sin dudas.',
    provider: 'tripadvisor',
    posted_at: '2025-08-12T21:00:00Z', // Hace 8 días
    owner_answer: 'Gracias Ricardo! María se alegrará mucho. Tomaremos nota sobre el postre para mejorarlo.',
    owner_posted_at: '2025-08-13T10:30:00Z',
    images: [],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.88, evidence_spans: ['María nos atendió muy bien'] },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.84, evidence_spans: ['comida estaba rica'] },
      { aspect: 'Postres', sentiment: 'negative', confidence: 0.76, evidence_spans: ['postre podría mejorar'] }
    ],
    overall_score: 4.1,
    overall_sentiment_confidence: 0.83,
    gap_to_five: 0.9,
    gap_reasons: ['Mejorar calidad de postres'],
    critical_flags: [],
    executive_summary: 'Experiencia positiva con oportunidad específica de mejora en postres.',
    action_items: ['Felicitar a María', 'Revisar recetas de postres'],
    language: 'es'
  },
  {
    id: 'rev-012',
    external_place_id: 'mock-business-id',
    author_name: 'Valeria Sánchez',
    rating_value: 5,
    review_text: 'Espectacular! Sofía nos asesoró perfecto con los vinos y Carlos superó nuestras expectativas con el plato especial. José muy atento toda la noche.',
    provider: 'google',
    posted_at: '2025-08-09T20:15:00Z', // Hace 11 días
    owner_answer: 'Valeria, qué alegría! Sofía, Carlos y José estarán muy contentos con tu comentario. Gracias por elegirnos.',
    owner_posted_at: '2025-08-10T08:45:00Z',
    images: [
      { image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300', thumb_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=150' }
    ],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.95, evidence_spans: ['Sofía nos asesoró perfecto', 'José muy atento toda la noche'] },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.92, evidence_spans: ['Carlos superó nuestras expectativas'] },
      { aspect: 'Vinos', sentiment: 'positive', confidence: 0.89, evidence_spans: ['asesoró perfecto con los vinos'] }
    ],
    overall_score: 4.8,
    overall_sentiment_confidence: 0.92,
    gap_to_five: 0.2,
    gap_reasons: [],
    critical_flags: [],
    executive_summary: 'Experiencia excepcional con múltiples miembros del equipo destacados.',
    action_items: ['Reconocer trabajo excepcional de Sofía, Carlos y José'],
    language: 'es'
  },
  {
    id: 'rev-013',
    external_place_id: 'mock-business-id',
    author_name: 'Eduardo Luna',
    rating_value: 3,
    review_text: 'Comida aceptable pero nada del otro mundo. Diego nos atendió correctamente, aunque sin mucha onda. Los precios un poco salados para lo que ofrecen.',
    provider: 'google',
    posted_at: '2025-08-07T19:30:00Z', // Hace 13 días
    owner_answer: null,
    owner_posted_at: null,
    images: [],
    sentiment: 'neutral',
    aspects: [
      { aspect: 'Comida', sentiment: 'neutral', confidence: 0.82, evidence_spans: ['comida aceptable pero nada del otro mundo'] },
      { aspect: 'Personal', sentiment: 'neutral', confidence: 0.79, evidence_spans: ['Diego nos atendió correctamente, aunque sin mucha onda'] },
      { aspect: 'Precios', sentiment: 'negative', confidence: 0.86, evidence_spans: ['precios un poco salados para lo que ofrecen'] }
    ],
    overall_score: 3.2,
    overall_sentiment_confidence: 0.82,
    gap_to_five: 1.8,
    gap_reasons: ['Mejorar relación calidad-precio', 'Capacitar a Diego en calidez del servicio'],
    critical_flags: [],
    executive_summary: 'Experiencia promedio con oportunidades de mejora en valor y calidez.',
    action_items: ['Revisar estructura de precios', 'Coaching a Diego en atención al cliente'],
    language: 'es'
  },
  {
    id: 'rev-014',
    external_place_id: 'mock-business-id',
    author_name: 'Martín Rojas',
    rating_value: 5,
    review_text: '¡Qué lugar increíble! Patricia nos recibió de maravilla, Carlos cocinó como un chef estrella y María fue súper atenta. Una experiencia memorable.',
    provider: 'tripadvisor',
    posted_at: '2025-08-04T21:45:00Z', // Hace 16 días
    owner_answer: 'Martín, nos emociona tu comentario! Patricia, Carlos y María se sentirán muy orgullosos. ¡Esperamos verte pronto!',
    owner_posted_at: '2025-08-05T09:15:00Z',
    images: [],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.96, evidence_spans: ['Patricia nos recibió de maravilla', 'María fue súper atenta'] },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.94, evidence_spans: ['Carlos cocinó como un chef estrella'] },
      { aspect: 'Experiencia general', sentiment: 'positive', confidence: 0.98, evidence_spans: ['experiencia memorable'] }
    ],
    overall_score: 4.9,
    overall_sentiment_confidence: 0.96,
    gap_to_five: 0.1,
    gap_reasons: [],
    critical_flags: [],
    executive_summary: 'Experiencia extraordinaria mencionando múltiples miembros del equipo.',
    action_items: ['Reconocer y felicitar a Patricia, Carlos y María por trabajo excepcional'],
    language: 'es'
  },
  {
    id: 'rev-015',
    external_place_id: 'mock-business-id',
    author_name: 'Lucía Torres',
    rating_value: 1,
    review_text: 'Pésimo servicio. Diego tardó 45 minutos en traer la entrada y Roberto fue muy descortés cuando preguntamos por nuestro pedido. No volveremos jamás.',
    provider: 'google',
    posted_at: '2025-08-02T20:00:00Z', // Hace 18 días
    owner_answer: null,
    owner_posted_at: null,
    images: [],
    sentiment: 'negative',
    aspects: [
      { aspect: 'Personal', sentiment: 'negative', confidence: 0.95, evidence_spans: ['Diego tardó 45 minutos', 'Roberto fue muy descortés'] },
      { aspect: 'Tiempo de espera', sentiment: 'negative', confidence: 0.93, evidence_spans: ['tardó 45 minutos en traer la entrada'] },
      { aspect: 'Servicio', sentiment: 'negative', confidence: 0.97, evidence_spans: ['pésimo servicio'] }
    ],
    overall_score: 1.1,
    overall_sentiment_confidence: 0.95,
    gap_to_five: 3.9,
    gap_reasons: ['Capacitar urgentemente a Diego y Roberto', 'Mejorar procesos de cocina', 'Implementar control de tiempos'],
    critical_flags: ['staff_complaint', 'service_delay', 'customer_lost', 'pending_response'],
    executive_summary: 'Experiencia crítica con dos empleados mencionados negativamente. Requiere acción inmediata.',
    action_items: ['Reunión urgente con Diego y Roberto', 'Plan de capacitación en servicio', 'Responder inmediatamente al cliente'],
    language: 'es'
  },
  {
    id: 'rev-016',
    external_place_id: 'mock-business-id',
    author_name: 'Pablo Díaz',
    rating_value: 4,
    review_text: 'Muy buena experiencia. José nos atendió con una sonrisa y Carlos preparó una parrillada espectacular. Solo el wifi andaba lento, pero volveremos.',
    provider: 'google',
    posted_at: '2025-07-30T19:20:00Z', // Hace 21 días
    owner_answer: 'Pablo, gracias por tu comentario! José y Carlos estarán muy contentos. Ya estamos mejorando el wifi.',
    owner_posted_at: '2025-07-31T08:30:00Z',
    images: [],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.91, evidence_spans: ['José nos atendió con una sonrisa'] },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.94, evidence_spans: ['Carlos preparó una parrillada espectacular'] },
      { aspect: 'Infraestructura', sentiment: 'negative', confidence: 0.75, evidence_spans: ['wifi andaba lento'] }
    ],
    overall_score: 4.2,
    overall_sentiment_confidence: 0.87,
    gap_to_five: 0.8,
    gap_reasons: ['Mejorar velocidad de wifi'],
    critical_flags: [],
    executive_summary: 'Experiencia muy positiva con oportunidad menor de mejora técnica.',
    action_items: ['Felicitar a José y Carlos', 'Mejorar infraestructura wifi'],
    language: 'es'
  },
  {
    id: 'rev-017',
    external_place_id: 'mock-business-id',
    author_name: 'Isabella Méndez',
    rating_value: 5,
    review_text: 'Perfecto para una cena romántica! Sofía nos recomendó el vino ideal y Patricia estuvo súper atenta sin ser intrusiva. Carlos, un genio en la cocina.',
    provider: 'tripadvisor',
    posted_at: '2025-07-26T21:30:00Z', // Hace 25 días
    owner_answer: 'Isabella, nos alegra haber sido parte de tu cena especial! Sofía, Patricia y Carlos estarán encantados con tu comentario.',
    owner_posted_at: '2025-07-27T09:00:00Z',
    images: [
      { image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300', thumb_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200&h=150' }
    ],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.95, evidence_spans: ['Sofía nos recomendó el vino ideal', 'Patricia estuvo súper atenta sin ser intrusiva'] },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.96, evidence_spans: ['Carlos, un genio en la cocina'] },
      { aspect: 'Ambiente', sentiment: 'positive', confidence: 0.92, evidence_spans: ['perfecto para una cena romántica'] }
    ],
    overall_score: 4.9,
    overall_sentiment_confidence: 0.94,
    gap_to_five: 0.1,
    gap_reasons: [],
    critical_flags: [],
    executive_summary: 'Experiencia excepcional destacando el trabajo coordinado del equipo.',
    action_items: ['Reconocer el excelente trabajo de Sofía, Patricia y Carlos'],
    language: 'es'
  },
  {
    id: 'rev-018',
    external_place_id: 'mock-business-id',
    author_name: 'Andrés Silva',
    rating_value: 3,
    review_text: 'Está bien pero sin más. La comida correcta, Diego nos atendió normal, los precios están en línea con otros lugares. Nada que destacar.',
    provider: 'google',
    posted_at: '2025-07-24T18:45:00Z', // Hace 27 días
    owner_answer: null,
    owner_posted_at: null,
    images: [],
    sentiment: 'neutral',
    aspects: [
      { aspect: 'Comida', sentiment: 'neutral', confidence: 0.79, evidence_spans: ['comida correcta'] },
      { aspect: 'Personal', sentiment: 'neutral', confidence: 0.77, evidence_spans: ['Diego nos atendió normal'] },
      { aspect: 'Precios', sentiment: 'neutral', confidence: 0.81, evidence_spans: ['precios están en línea con otros lugares'] }
    ],
    overall_score: 3.1,
    overall_sentiment_confidence: 0.79,
    gap_to_five: 1.9,
    gap_reasons: ['Elevar experiencia más allá de lo básico', 'Capacitar a Diego para destacar en servicio'],
    critical_flags: [],
    executive_summary: 'Experiencia promedio sin elementos diferenciadores.',
    action_items: ['Buscar formas de destacar la experiencia', 'Coaching a Diego para brindar servicio memorable'],
    language: 'es'
  },
  {
    id: 'rev-019',
    external_place_id: 'mock-business-id',
    author_name: 'Carolina Paz',
    rating_value: 5,
    review_text: '¡Excelente! María fue súper profesional y Carlos cocinó el mejor risotto que probé en años. José muy atento con las bebidas. Todo perfecto.',
    provider: 'google',
    posted_at: '2025-07-22T20:10:00Z', // Hace 29 días
    owner_answer: 'Carolina, tu comentario nos llena de alegría! María, Carlos y José se sentirán muy orgullosos. ¡Gracias por elegirnos!',
    owner_posted_at: '2025-07-23T08:15:00Z',
    images: [],
    sentiment: 'positive',
    aspects: [
      { aspect: 'Personal', sentiment: 'positive', confidence: 0.94, evidence_spans: ['María fue súper profesional', 'José muy atento con las bebidas'] },
      { aspect: 'Comida', sentiment: 'positive', confidence: 0.97, evidence_spans: ['Carlos cocinó el mejor risotto que probé en años'] },
      { aspect: 'Servicio', sentiment: 'positive', confidence: 0.95, evidence_spans: ['todo perfecto'] }
    ],
    overall_score: 4.9,
    overall_sentiment_confidence: 0.95,
    gap_to_five: 0.1,
    gap_reasons: [],
    critical_flags: [],
    executive_summary: 'Experiencia excepcional con múltiples aspectos destacados por el cliente.',
    action_items: ['Felicitar a María, Carlos y José por trabajo excepcional'],
    language: 'es'
  },
  {
    id: 'rev-020',
    external_place_id: 'mock-business-id',
    author_name: 'Sebastián Moreno',
    rating_value: 2,
    review_text: 'Decepcionante. Roberto muy maleducado desde que llegamos y Diego tardó eternamente en tomar el pedido. La comida llegó tibia. No lo recomiendo.',
    provider: 'tripadvisor',
    posted_at: '2025-07-20T21:00:00Z', // Hace 31 días
    owner_answer: null,
    owner_posted_at: null,
    images: [],
    sentiment: 'negative',
    aspects: [
      { aspect: 'Personal', sentiment: 'negative', confidence: 0.96, evidence_spans: ['Roberto muy maleducado', 'Diego tardó eternamente'] },
      { aspect: 'Tiempo de espera', sentiment: 'negative', confidence: 0.92, evidence_spans: ['tardó eternamente en tomar el pedido'] },
      { aspect: 'Temperatura comida', sentiment: 'negative', confidence: 0.88, evidence_spans: ['comida llegó tibia'] }
    ],
    overall_score: 2.0,
    overall_sentiment_confidence: 0.92,
    gap_to_five: 3.0,
    gap_reasons: ['Capacitar urgentemente a Roberto en atención al cliente', 'Mejorar tiempos de servicio de Diego', 'Controlar temperatura de platos'],
    critical_flags: ['staff_complaint', 'service_delay', 'food_quality', 'pending_response'],
    executive_summary: 'Experiencia muy negativa con dos empleados mencionados. Acción urgente requerida.',
    action_items: ['Reunión inmediata con Roberto y Diego', 'Plan de mejora de servicio', 'Responder al cliente'],
    language: 'es'
  }
];

// Reviews stats para dashboard (basado en 20 reviews agosto 2025)
export const mockReviewStats = {
  total_reviews: mockReviewsData.length, // 20 reviews
  avg_rating: 3.8, // Promedio más alto con más data
  last_7_days: 6,  // rev-001 a rev-011 (dentro de últimos 7 días)
  last_30_days: 20, // todas las 20 reviews están en julio-agosto 2025
  low_rating_count: 5, // ratings ≤3: rev-003, rev-006, rev-010, rev-013, rev-015, rev-018, rev-020
  pending_responses: 8, // muchas sin responder para mostrar oportunidades
  critical_count: 5, // negativas sin responder: rev-003, rev-006, rev-010, rev-015, rev-020
  sentiment_breakdown: {
    positive: 12, // mayoría positivas
    neutral: 3,   // algunas neutrales
    negative: 5   // algunas negativas para mostrar áreas de mejora
  }
};

// Helper para filtrar reviews por fecha (base: 20/08/2025)
export const getReviewsByDateRange = (days: number) => {
  // Fecha base actual: 20 de agosto de 2025
  const baseDate = new Date('2025-08-20T12:00:00Z');
  const cutoffDate = new Date(baseDate);
  cutoffDate.setDate(baseDate.getDate() - days);
  
  return mockReviewsData.filter(review => {
    const reviewDate = new Date(review.posted_at);
    return reviewDate >= cutoffDate;
  });
};

// Helper para obtener reviews críticas
export const getCriticalReviews = () => {
  return mockReviewsData.filter(review => 
    review.critical_flags && review.critical_flags.length > 0
  );
};

// Helper para obtener reviews sin respuesta
export const getPendingReviews = () => {
  return mockReviewsData.filter(review => !review.owner_answer);
};
