const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://jdlvlhuxhcajpmptzkaq.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbHZsaHV4aGNhanBtcHR6a2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MTIyODAsImV4cCI6MjA0ODI4ODI4MH0.4f0kNCq5cPJbH5kE9ym4nNR4PKB9-XwF7OyKB6Zki_o'
);

async function simpleCheck() {
  console.log('\n🔍 Query simple...\n');
  
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating_value, posted_at, sentiment, overall_score')
    .limit(10);
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  console.log(`✅ Reviews encontradas: ${data?.length || 0}`);
  
  if (data && data.length > 0) {
    console.log('\n📊 Muestra:');
    data.forEach((r, i) => {
      console.log(`  ${i+1}. Rating: ${r.rating_value}, Sentiment: ${r.sentiment}, Score: ${r.overall_score}, Date: ${r.posted_at?.slice(0,10)}`);
    });
  }
}

simpleCheck().catch(console.error);
