import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get short_code from URL or body
    const url = new URL(req.url);
    const short_code = url.searchParams.get('short_code');

    if (!short_code) {
      return new Response(
        JSON.stringify({ error: 'Missing short_code parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch campaign with business info
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('review_campaigns')
      .select(`
        id,
        name,
        status,
        short_code,
        businesses!inner(
          id,
          external_places!inner(
            name,
            logo,
            main_image,
            address,
            category
          )
        )
      `)
      .eq('short_code', short_code)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if campaign is active
    if (campaign.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Campaign is not active' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment views counter (use service role key for this)
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: counterError } = await supabaseService
      .rpc('increment_campaign_counter', {
        p_campaign_id: campaign.id,
        p_counter_name: 'views_count'
      });

    if (counterError) {
      console.error('Error incrementing views counter:', counterError);
      // Non-critical, continue
    }

    // Extract business info
    const business = (campaign.businesses as any);
    const externalPlace = business.external_places;

    const response = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        short_code: campaign.short_code
      },
      business: {
        name: externalPlace.name,
        logo: externalPlace.logo,
        main_image: externalPlace.main_image,
        address: externalPlace.address,
        category: externalPlace.category
      }
    };

    return new Response(
      JSON.stringify(response),
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

