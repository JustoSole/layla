#!/usr/bin/env node
/**
 * Script para diagnosticar y forzar análisis de reviews en Supabase REMOTO
 * Uso: node force-analyze-remote.cjs <external_place_id> <SUPABASE_ANON_KEY> [limit]
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ibhxfrmaluxegibwqfiv.supabase.co';
const external_place_id = process.argv[2] || 'eeaf6ccc-dd99-4f41-b1a7-3fc3170ef542';
const SUPABASE_ANON_KEY = process.argv[3];
const limit = parseInt(process.argv[4]) || 20;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: Debes proporcionar el SUPABASE_ANON_KEY');
  console.error('Uso: node force-analyze-remote.cjs <external_place_id> <SUPABASE_ANON_KEY> [limit]');
  console.error('\nEjemplo:');
  console.error('  node force-analyze-remote.cjs eeaf6ccc-dd99-4f41-b1a7-3fc3170ef542 eyJhbGc... 20');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('\n🔍 DIAGNÓSTICO DE REVIEWS (REMOTO)\n');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`External Place ID: ${external_place_id}\n`);

  // 1. Verificar external_place
  const { data: place, error: placeError } = await supabase
    .from('external_places')
    .select('id, name, google_place_id')
    .eq('id', external_place_id)
    .single();

  if (placeError) {
    console.error('❌ Error consultando external_place:', placeError.message);
    if (placeError.code === 'PGRST116') {
      console.error('\n⚠️  El external_place_id NO EXISTE en la base de datos remota');
    }
    return false;
  }

  console.log('✅ External Place encontrado:');
  console.log(`   Nombre: ${place.name}`);
  console.log(`   Google Place ID: ${place.google_place_id || 'N/A'}`);

  // 2. Contar reviews totales
  const { count: totalCount, error: countError } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('external_place_id', external_place_id);

  if (countError) {
    console.error('\n❌ Error contando reviews:', countError.message);
    return false;
  }

  console.log(`\n📊 Total reviews: ${totalCount || 0}`);

  if (!totalCount || totalCount === 0) {
    console.log('\n⚠️  No hay reviews para analizar. Primero debes ingestar reviews.');
    return false;
  }

  // 3. Contar reviews sin análisis
  const { data: unanalyzed, error: unanalyzedError } = await supabase
    .from('reviews')
    .select('id, provider, review_text, sentiment, aspects')
    .eq('external_place_id', external_place_id)
    .or('sentiment.is.null,aspects.is.null')
    .limit(5);

  if (unanalyzedError) {
    console.error('\n❌ Error consultando reviews sin análisis:', unanalyzedError.message);
    return false;
  }

  const unanalyzedCount = unanalyzed?.length || 0;
  console.log(`🔍 Reviews sin análisis (muestra): ${unanalyzedCount}`);

  if (unanalyzedCount > 0) {
    console.log('\n📝 Ejemplos de reviews sin análisis:');
    unanalyzed.forEach((r, i) => {
      console.log(`\n  ${i+1}. ID: ${r.id}`);
      console.log(`     Provider: ${r.provider}`);
      console.log(`     Tiene texto: ${r.review_text ? 'Sí (' + r.review_text.length + ' chars)' : 'No'}`);
      console.log(`     Sentiment: ${r.sentiment || 'NULL'}`);
      console.log(`     Aspects: ${r.aspects ? 'Sí' : 'NULL'}`);
    });
  } else {
    console.log('\n✅ Todas las reviews ya tienen análisis');
  }

  return totalCount > 0;
}

async function forceAnalyze() {
  console.log('\n🚀 FORZANDO ANÁLISIS\n');
  console.log(`Límite: ${limit} reviews\n`);

  try {
    console.log('⏳ Llamando a analyze-reviews...');
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('analyze-reviews', {
      body: { external_place_id, limit }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (error) {
      console.error(`\n❌ Error en función (${duration}s):`, error);
      return;
    }

    console.log(`\n✅ Análisis completado en ${duration}s:`);
    console.log(`   Reviews analizadas: ${data.analyzed || 0}`);
    console.log(`   Reviews encontradas: ${data.total_reviews_found || 0}`);
    
    if (data.processed_reviews && data.processed_reviews.length > 0) {
      console.log('\n📊 Primeras reviews procesadas:');
      data.processed_reviews.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i+1}. Sentiment: ${r.sentiment}, Aspects: ${r.aspects_count}`);
      });
    }

  } catch (err) {
    console.error('\n❌ Error invocando función:', err.message);
  }
}

// Ejecutar
(async () => {
  const hasData = await diagnose();
  
  if (hasData) {
    console.log('\n' + '='.repeat(60));
    await forceAnalyze();
  }
})();

