-- =====================================================
-- Migration: Add Campaign Feedback System
-- Description: Extend reviews table for campaign feedback
--              and create review_campaigns table
-- Date: 2025-10-18
-- =====================================================

-- 1. Create review_campaigns table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.review_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Campaign configuration
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  short_code text UNIQUE NOT NULL,
  
  -- Stats (updated via triggers/functions)
  views_count integer DEFAULT 0,
  ratings_captured integer DEFAULT 0,
  redirected_count integer DEFAULT 0,
  internal_feedback_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for review_campaigns
CREATE INDEX idx_campaigns_business ON public.review_campaigns(business_id);
CREATE INDEX idx_campaigns_short_code ON public.review_campaigns(short_code);
CREATE INDEX idx_campaigns_status ON public.review_campaigns(status) WHERE status = 'active';

-- 2. Modify reviews table to support campaign feedback
-- =====================================================

-- Drop existing provider constraint
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_provider_check;

-- Add new constraint that includes 'campaign'
ALTER TABLE public.reviews 
  ADD CONSTRAINT reviews_provider_check 
  CHECK (provider IN ('google', 'tripadvisor', 'campaign'));

-- Make provider_review_id nullable (not needed for campaign feedback)
ALTER TABLE public.reviews 
  ALTER COLUMN provider_review_id DROP NOT NULL;

-- Add campaign-specific columns
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.review_campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS selected_aspects text[];
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS aspect_details jsonb;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS ces_score smallint CHECK (ces_score >= 1 AND ces_score <= 5);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS nps_score smallint CHECK (nps_score >= 0 AND nps_score <= 10);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS resolution_status text CHECK (resolution_status IN ('pending', 'resolved', 'ignored'));
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS context_metadata jsonb;

-- Indexes for campaign feedback
CREATE INDEX IF NOT EXISTS idx_reviews_campaign ON public.reviews(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON public.reviews(provider);
CREATE INDEX IF NOT EXISTS idx_reviews_resolution ON public.reviews(resolution_status) WHERE provider = 'campaign' AND resolution_status IS NOT NULL;

-- 3. RLS Policies
-- =====================================================

-- Enable RLS on review_campaigns
ALTER TABLE public.review_campaigns ENABLE ROW LEVEL SECURITY;

-- Users can view their own campaigns
CREATE POLICY "Users view own campaigns"
  ON public.review_campaigns FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
    )
  );

-- Users can create campaigns for their businesses
CREATE POLICY "Users create own campaigns"
  ON public.review_campaigns FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
    )
  );

-- Users can update their own campaigns
CREATE POLICY "Users update own campaigns"
  ON public.review_campaigns FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
    )
  );

-- Users can delete their own campaigns
CREATE POLICY "Users delete own campaigns"
  ON public.review_campaigns FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
    )
  );

-- Public can submit campaign feedback (INSERT into reviews)
CREATE POLICY "Public submit campaign feedback"
  ON public.reviews FOR INSERT
  WITH CHECK (provider = 'campaign');

-- 4. Helper Functions
-- =====================================================

-- Function to increment campaign counters
CREATE OR REPLACE FUNCTION increment_campaign_counter(
  p_campaign_id uuid,
  p_counter_name text
)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.review_campaigns SET %I = %I + 1, updated_at = now() WHERE id = $1',
    p_counter_name,
    p_counter_name
  ) USING p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at on review_campaigns
CREATE OR REPLACE FUNCTION update_review_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_review_campaigns_updated_at
  BEFORE UPDATE ON public.review_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_review_campaigns_updated_at();

-- 5. Grant permissions
-- =====================================================

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION increment_campaign_counter(uuid, text) TO anon, authenticated;

-- Done!
COMMENT ON TABLE public.review_campaigns IS 'Campaign metadata for review request campaigns';
COMMENT ON TABLE public.reviews IS 'Unified table for all reviews: public (Google/TripAdvisor) and internal (campaign feedback)';

