// Mock data para StaffDashboard
import { StaffMember, StaffMentionDetail } from '../services/api';

// Staff members con métricas realistas
export const mockStaffMembers: StaffMember[] = [
  {
    staff_member_id: 'staff-1',
    name: 'María García',
    role: 'Mesera Principal',
    name_variations: ['María', 'Maria', 'Marita'],
    total_mentions: 156,
    positive_mentions: 142,
    neutral_mentions: 9,
    negative_mentions: 5,
    positive_rate: 91,
    last_mention_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // Hace 2 días
  },
  {
    staff_member_id: 'staff-2',
    name: 'Carlos Rodríguez',
    role: 'Chef',
    name_variations: ['Carlos', 'Carlitos'],
    total_mentions: 134,
    positive_mentions: 123,
    neutral_mentions: 7,
    negative_mentions: 4,
    positive_rate: 92,
    last_mention_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // Hace 1 día
  },
  {
    staff_member_id: 'staff-3',
    name: 'Ana Martínez',
    role: 'Bartender',
    name_variations: ['Ana', 'Anita'],
    total_mentions: 89,
    positive_mentions: 78,
    neutral_mentions: 7,
    negative_mentions: 4,
    positive_rate: 88,
    last_mention_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    staff_member_id: 'staff-4',
    name: 'José Fernández',
    role: 'Mesero',
    name_variations: ['José', 'Jose', 'Pepe'],
    total_mentions: 76,
    positive_mentions: 62,
    neutral_mentions: 9,
    negative_mentions: 5,
    positive_rate: 82,
    last_mention_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    staff_member_id: 'staff-5',
    name: 'Laura Sánchez',
    role: 'Hostess',
    name_variations: ['Laura', 'Lau'],
    total_mentions: 24,
    positive_mentions: 19,
    neutral_mentions: 4,
    negative_mentions: 1,
    positive_rate: 79,
    last_mention_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    staff_member_id: 'staff-6',
    name: 'Diego López',
    role: 'Mesero',
    name_variations: ['Diego'],
    total_mentions: 58,
    positive_mentions: 39,
    neutral_mentions: 11,
    negative_mentions: 8,
    positive_rate: 68,
    last_mention_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    staff_member_id: 'staff-7',
    name: 'Sofía Torres',
    role: 'Sommelier',
    name_variations: ['Sofía', 'Sofia', 'Sofi'],
    total_mentions: 67,
    positive_mentions: 60,
    neutral_mentions: 5,
    negative_mentions: 2,
    positive_rate: 89,
    last_mention_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    staff_member_id: 'staff-8',
    name: 'Roberto Gómez',
    role: 'Ayudante de cocina',
    name_variations: ['Roberto', 'Rober'],
    total_mentions: 43,
    positive_mentions: 22,
    neutral_mentions: 9,
    negative_mentions: 12,
    positive_rate: 50,
    last_mention_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    staff_member_id: 'staff-9',
    name: 'Patricia Ruiz',
    role: 'Mesera',
    name_variations: ['Patricia', 'Paty', 'Patri'],
    total_mentions: 16,
    positive_mentions: 13,
    neutral_mentions: 2,
    negative_mentions: 1,
    positive_rate: 81,
    last_mention_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Menciones detalladas por staff member
export const mockStaffMentions: Record<string, StaffMentionDetail[]> = {
  'staff-1': [ // María García - 45 menciones
    {
      id: 'mention-1-1',
      sentiment: 'positive',
      rating_value: 5,
      provider: 'google',
      posted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-1',
      author_name: 'Juan Pérez',
      evidence_span: 'María fue excepcional! Nos atendió con una sonrisa todo el tiempo y nos hizo sentir como en casa. Definitivamente volveremos por ella.',
      detected_name: 'María',
      role: 'Mesera Principal'
    },
    {
      id: 'mention-1-2',
      sentiment: 'positive',
      rating_value: 5,
      provider: 'google',
      posted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-2',
      author_name: 'Carmen Silva',
      evidence_span: 'La mesera María es súper atenta y profesional. Conoce el menú perfectamente y sus recomendaciones fueron acertadas.',
      detected_name: 'María',
      role: 'Mesera Principal'
    },
    {
      id: 'mention-1-3',
      sentiment: 'positive',
      rating_value: 5,
      provider: 'tripadvisor',
      posted_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://tripadvisor.com/review-1',
      author_name: 'Lucia M.',
      evidence_span: 'Marita (así le dicen de cariño) hizo que nuestra cena fuera especial. Atención de 10!',
      detected_name: 'Marita',
      role: 'Mesera Principal'
    },
    {
      id: 'mention-1-4',
      sentiment: 'neutral',
      rating_value: 3,
      provider: 'google',
      posted_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-3',
      author_name: 'Pedro Ramos',
      evidence_span: 'María nos atendió bien, aunque había mucha gente y se notaba el apuro.',
      detected_name: 'María',
      role: 'Mesera Principal'
    },
    {
      id: 'mention-1-5',
      sentiment: 'negative',
      rating_value: 2,
      provider: 'google',
      posted_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-4',
      author_name: 'Miguel A.',
      evidence_span: 'María se olvidó de traernos las bebidas y tuvimos que pedirlas dos veces.',
      detected_name: 'María',
      role: 'Mesera Principal'
    }
  ],
  'staff-2': [ // Carlos Rodríguez - Chef
    {
      id: 'mention-2-1',
      sentiment: 'positive',
      rating_value: 5,
      provider: 'google',
      posted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-5',
      author_name: 'Andrea López',
      evidence_span: 'El chef Carlos salió a saludarnos y nos explicó cada plato. La comida estuvo espectacular, se nota la pasión que le pone.',
      detected_name: 'Carlos',
      role: 'Chef'
    },
    {
      id: 'mention-2-2',
      sentiment: 'positive',
      rating_value: 5,
      provider: 'tripadvisor',
      posted_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://tripadvisor.com/review-2',
      author_name: 'Ricardo P.',
      evidence_span: 'Felicitamos a Carlitos por el risotto, el mejor que probé en mi vida. Un genio!',
      detected_name: 'Carlitos',
      role: 'Chef'
    },
    {
      id: 'mention-2-3',
      sentiment: 'positive',
      rating_value: 5,
      provider: 'google',
      posted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-6',
      author_name: 'Gabriela N.',
      evidence_span: 'Carlos tiene un talento increíble. Cada plato es una obra de arte. Volveremos!',
      detected_name: 'Carlos',
      role: 'Chef'
    }
  ],
  'staff-8': [ // Roberto Gómez - Necesita atención (50% positivo)
    {
      id: 'mention-8-1',
      sentiment: 'negative',
      rating_value: 2,
      provider: 'google',
      posted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-7',
      author_name: 'Fernando S.',
      evidence_span: 'Roberto fue poco amable cuando le pedimos algo adicional. Actitud mejorable.',
      detected_name: 'Roberto',
      role: 'Ayudante de cocina'
    },
    {
      id: 'mention-8-2',
      sentiment: 'negative',
      rating_value: 2,
      provider: 'google',
      posted_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-8',
      author_name: 'Silvia M.',
      evidence_span: 'Rober parecía de mal humor, nos trajo las cosas de mala gana.',
      detected_name: 'Rober',
      role: 'Ayudante de cocina'
    },
    {
      id: 'mention-8-3',
      sentiment: 'positive',
      rating_value: 4,
      provider: 'google',
      posted_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-9',
      author_name: 'Pablo R.',
      evidence_span: 'Roberto nos ayudó con unas sillas extras para los niños, muy servicial.',
      detected_name: 'Roberto',
      role: 'Ayudante de cocina'
    },
    {
      id: 'mention-8-4',
      sentiment: 'neutral',
      rating_value: 3,
      provider: 'google',
      posted_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-10',
      author_name: 'Teresa L.',
      evidence_span: 'Roberto cumplió con su trabajo, nada destacable.',
      detected_name: 'Roberto',
      role: 'Ayudante de cocina'
    }
  ],
  'staff-3': [ // Ana Martínez - Bartender
    {
      id: 'mention-3-1',
      sentiment: 'positive',
      rating_value: 5,
      provider: 'google',
      posted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-11',
      author_name: 'Marcos V.',
      evidence_span: 'Ana hace los mejores cócteles! Su Mojito es espectacular y es súper amable.',
      detected_name: 'Ana',
      role: 'Bartender'
    },
    {
      id: 'mention-3-2',
      sentiment: 'positive',
      rating_value: 5,
      provider: 'tripadvisor',
      posted_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://tripadvisor.com/review-3',
      author_name: 'Daniela F.',
      evidence_span: 'Anita nos preparó unos tragos increíbles, con mucha creatividad. Una genia!',
      detected_name: 'Anita',
      role: 'Bartender'
    }
  ],
  'staff-6': [ // Diego López - Necesita mejorar (68%)
    {
      id: 'mention-6-1',
      sentiment: 'negative',
      rating_value: 2,
      provider: 'google',
      posted_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-12',
      author_name: 'Laura C.',
      evidence_span: 'Diego tardó mucho en atendernos y cuando lo hizo fue medio cortante.',
      detected_name: 'Diego',
      role: 'Mesero'
    },
    {
      id: 'mention-6-2',
      sentiment: 'positive',
      rating_value: 4,
      provider: 'google',
      posted_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-13',
      author_name: 'Martín G.',
      evidence_span: 'Diego nos atendió bien, conoce bien el menú.',
      detected_name: 'Diego',
      role: 'Mesero'
    },
    {
      id: 'mention-6-3',
      sentiment: 'negative',
      rating_value: 2,
      provider: 'google',
      posted_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
      review_url: 'https://maps.google.com/review-14',
      author_name: 'Cecilia R.',
      evidence_span: 'Diego se equivocó dos veces con nuestro pedido.',
      detected_name: 'Diego',
      role: 'Mesero'
    }
  ]
};

// Helper para obtener menciones de un staff member
export const getMockStaffMentions = (staffMemberId: string): StaffMentionDetail[] => {
  return mockStaffMentions[staffMemberId] || [];
};

// Helper para calcular estadísticas generales
export const getStaffStats = () => {
  const totalMembers = mockStaffMembers.length;
  const totalMentions = mockStaffMembers.reduce((sum, s) => sum + s.total_mentions, 0);
  const totalPositive = mockStaffMembers.reduce((sum, s) => sum + s.positive_mentions, 0);
  const avgPositiveRate = totalMembers > 0 
    ? Math.round(mockStaffMembers.reduce((sum, s) => sum + s.positive_rate, 0) / totalMembers)
    : 0;
  
  return {
    totalMembers,
    totalMentions,
    totalPositive,
    avgPositiveRate
  };
};

