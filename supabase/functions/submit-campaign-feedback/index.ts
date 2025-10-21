import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackPayload {
  short_code: string;
  rating_value: number;
  selected_aspects?: string[];
  aspect_details?: Record<string, string[]>;
  ces_score?: number;
  nps_score?: number;
  review_text?: string;
  customer_email?: string;
  customer_phone?: string;
}

function detectDevice(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function getTimeOfDay(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function getDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const payload: FeedbackPayload = await req.json();
    const { 
      short_code, 
      rating_value, 
      selected_aspects, 
      aspect_details,
      ces_score,
      nps_score,
      review_text,
      customer_email,
      customer_phone
    } = payload;

    // Validate required fields
    if (!short_code || !rating_value) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: short_code, rating_value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Find and validate campaign
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('review_campaigns')
      .select(`
        id,
        business_id,
        status,
        businesses!inner(external_place_id)
      `)
      .eq('short_code', short_code)
      .eq('status', 'active')
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const external_place_id = (campaign.businesses as any).external_place_id;

    if (!external_place_id) {
      console.error('Business has no external_place_id');
      return new Response(
        JSON.stringify({ error: 'Invalid campaign configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extract context metadata
    const userAgent = req.headers.get('user-agent');
    const now = new Date();
    const context_metadata = {
      device_type: detectDevice(userAgent),
      user_agent: userAgent,
      day_of_week: getDayOfWeek(),
      time_of_day: getTimeOfDay(now.getHours()),
      submitted_at: now.toISOString(),
      is_weekend: [0, 6].includes(now.getDay())
    };

    // 3. Insert review into reviews table
    const { data: review, error: reviewError } = await supabaseClient
      .from('reviews')
      .insert({
        external_place_id: external_place_id,
        provider: 'campaign',
        provider_review_id: null,
        campaign_id: campaign.id,
        rating_value: rating_value,
        review_text: review_text || null,
        selected_aspects: selected_aspects || null,
        aspect_details: aspect_details || null,
        ces_score: ces_score || null,
        nps_score: nps_score || null,
        customer_email: customer_email || null,
        customer_phone: customer_phone || null,
        resolution_status: 'pending',
        context_metadata: context_metadata,
        posted_at: now.toISOString(),
        author_name: customer_email ? customer_email.split('@')[0] : 'Anonymous'
      })
      .select('id')
      .single();

    if (reviewError) {
      console.error('Error inserting review:', reviewError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit feedback', details: reviewError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Increment campaign counter
    const counterType = 'internal_feedback_count';
    const { error: counterError } = await supabaseClient
      .rpc('increment_campaign_counter', {
        p_campaign_id: campaign.id,
        p_counter_name: counterType
      });

    if (counterError) {
      console.error('Error incrementing counter:', counterError);
      // Non-critical, continue
    }

    // 5. Trigger NLP analysis if there's text
    if (review_text && review_text.trim().length > 10) {
      try {
        const analyzeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-reviews`;
        const analyzeResponse = await fetch(analyzeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            external_place_id: external_place_id,
            review_ids: [review.id],
            batch_size: 1
          })
        });

        if (!analyzeResponse.ok) {
          console.warn('NLP analysis failed, will be processed in next batch');
        }
      } catch (analyzeError) {
        console.error('Error triggering analysis:', analyzeError);
        // Non-critical, the review will be analyzed in the next batch
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        review_id: review.id,
        message: 'Feedback submitted successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

