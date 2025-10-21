/**
 * Mock Data - Exportaciones centralizadas
 * 
 * Importa todo desde aquí:
 * import { mockCompetitors, mockCampaigns, ... } from '../mocks';
 */

// Competitor mocks
export {
  mockCompetitors,
  mockCurrentBusiness,
  generateExtendedMetrics
} from './competitorMockData';

// Campaign mocks
export {
  mockCampaigns,
  mockFeedbackItems,
  getFeedbackByCampaign,
  getFilteredFeedback
} from './campaignMockData';

// Staff mocks
export {
  mockStaffMembers,
  mockStaffMentions,
  getMockStaffMentions,
  getStaffStats
} from './staffMockData';

// Review mocks
export {
  mockReviewsData,
  mockReviewStats,
  getReviewsByDateRange,
  getCriticalReviews,
  getPendingReviews
} from './reviewMockData';

