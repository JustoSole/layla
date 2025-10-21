const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ibhxfrmaluxegibwqfiv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaHhmcm1hbHV4ZWdpYndxZml2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA1NTE3OSwiZXhwIjoyMDczNjMxMTc5fQ.A6a_U-teOK6ZNxlYn7LUy2Xdtq0bpI0ivizznyC3YD0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CHINO_ID = 'eeaf6ccc-dd99-4f41-b1a7-3fc3170ef542';

(async () => {
  console.log('\n🔄 Preparando re-análisis de Chinofino...\n');
  
  // 1. Limpiar aspects para forzar re-análisis
  console.log('⚙️  Limpiando campo aspects...');
  
  const { data: updateData, error: updateError } = await supabase
    .from('reviews')
    .update({ 
      aspects: null,
      sentiment: null,
      overall_score: null,
      overall_sentiment_confidence: null,
      gap_to_five: null,
      gap_reasons: null,
      critical_flags: null,
      executive_summary: null,
      action_items: null
    })
    .eq('external_place_id', CHINO_ID)
    .select('id');
  
  if (updateError) {
    console.error('❌ Error limpiando aspects:', updateError);
    console.error('   Code:', updateError.code);
    console.error('   Details:', updateError.details);
    console.error('   Hint:', updateError.hint);
    process.exit(1);
  }
  
  console.log(`   ${updateData?.length || 0} reviews limpiadas`);
  
  console.log('✅ Campo aspects limpiado\n');
  
  // 2. Llamar a analyze-reviews
  console.log('🚀 Llamando a analyze-reviews con el nuevo código (con sub_aspect)...\n');
  console.log('   Analizando hasta 100 reviews...');
  console.log('   Esto puede tardar 2-3 minutos...\n');
  
  const startTime = Date.now();
  
  const { data, error } = await supabase.functions.invoke('analyze-reviews', {
    body: {
      external_place_id: CHINO_ID,
      limit: 100
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
  
  // 3. Verificar que ahora tienen sub_aspect
  console.log('\n🔍 Verificando que ahora tienen sub_aspect...\n');
  
  const { data: verifyData } = await supabase
    .from('reviews')
    .select('aspects')
    .eq('external_place_id', CHINO_ID)
    .not('aspects', 'is', null)
    .limit(1);
  
  if (verifyData && verifyData.length > 0 && verifyData[0].aspects) {
    const aspects = verifyData[0].aspects;
    const withSubAspect = aspects.filter(a => a.sub_aspect).length;
    
    console.log(`   ✅ Sample verificado:`);
    console.log(`      Total aspects: ${aspects.length}`);
    console.log(`      Con sub_aspect: ${withSubAspect}`);
    
    if (withSubAspect > 0) {
      console.log(`\n      🎉 Ejemplo de sub_aspect: "${aspects.find(a => a.sub_aspect)?.sub_aspect}"`);
    }
  }
  
  console.log('\n✅ ¡Listo! Ahora ve a Insights para ver los sub-temas inteligentes 🎯');
  console.log('   URL: http://localhost:5173/insights\n');
})();
