const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ibhxfrmaluxegibwqfiv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaHhmcm1hbHV4ZWdpYndxZml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNTUxNzksImV4cCI6MjA3MzYzMTE3OX0.LLojAAdkyKmbn5DSrdlqBP1J09xaBDlZ8rUziwXvApg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  console.log('\n🔍 Buscando "Chino Fino"...\n');
  
  // 1. Buscar el place
  const { data: places, error: placeError } = await supabase
    .from('external_places')
    .select('id, name, google_place_id')
    .ilike('name', '%chino%')
    .limit(5);
  
  if (placeError) {
    console.error('❌ Error buscando place:', placeError.message);
    process.exit(1);
  }
  
  if (!places || places.length === 0) {
    console.error('❌ No se encontró "Chino Fino"');
    process.exit(1);
  }
  
  console.log('📍 Lugares encontrados:');
  places.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (ID: ${p.id.substring(0, 20)}...)`);
  });
  
  const chinoFino = places[0];
  console.log(`\n✅ Usando: ${chinoFino.name}`);
  console.log(`📝 ID: ${chinoFino.id}\n`);
  
  // 2. Contar reviews totales y sin análisis
  const { count: totalCount } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('external_place_id', chinoFino.id);
  
  const { count: unanalyzedCount } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('external_place_id', chinoFino.id)
    .or('sentiment.is.null,aspects.is.null');
  
  console.log(`📊 Estado de reviews:`);
  console.log(`   Total: ${totalCount}`);
  console.log(`   Sin análisis completo: ${unanalyzedCount || totalCount}`);
  console.log('');
  
  // 3. Llamar a la Edge Function
  console.log('🚀 Llamando a analyze-reviews Edge Function...\n');
  console.log('   Esto puede tardar 1-2 minutos...\n');
  
  const startTime = Date.now();
  
  const { data, error } = await supabase.functions.invoke('analyze-reviews', {
    body: {
      external_place_id: chinoFino.id,
      limit: 100 // Analizar hasta 100 reviews
    }
  });
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (error) {
    console.error(`\n❌ Error (después de ${duration}s):`, error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
  
  console.log(`\n✅ Análisis completado en ${duration}s\n`);
  console.log('📊 Resultados:');
  console.log(`   Reviews analizadas: ${data.analyzed || 0}`);
  console.log(`   Reviews encontradas: ${data.total_reviews_found || 0}`);
  
  if (data.processed_reviews && data.processed_reviews.length > 0) {
    console.log(`\n📝 Detalle de las primeras 5:`);
    data.processed_reviews.slice(0, 5).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.sentiment || 'N/A'} | ${r.aspects_count || 0} aspectos | score: ${r.overall_score?.toFixed(2) || 'N/A'}`);
    });
  }
  
  console.log('\n✅ ¡Listo! Ahora ve a Insights para ver los sub-temas inteligentes 🎯');
  console.log('   URL: http://localhost:5173/insights\n');
})();

