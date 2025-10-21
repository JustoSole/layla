-- Migración: Mejoras en deduplicación de staff (Fases 1 y 2)
-- Fecha: 2025-10-19
-- Objetivo: Consolidar duplicados (Tomás/Tomas/Tomi) y filtrar no-nombres

-- ============================================================================
-- FASE 1: QUICK WINS
-- ============================================================================

-- 1.1. Habilitar extensión unaccent (para quitar acentos)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1.2. Habilitar extensión fuzzystrmatch (para Levenshtein distance)
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- 1.3. Función mejorada de normalización con unaccent y más prefijos
CREATE OR REPLACE FUNCTION public.normalize_staff_name(detected_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text;
  word_count integer;
BEGIN
  -- Validar input
  IF detected_name IS NULL OR TRIM(detected_name) = '' THEN
    RETURN NULL;
  END IF;
  
  -- 1. Trim y lowercase
  normalized := LOWER(TRIM(detected_name));
  
  -- 2. Remover prefijos comunes (expandido)
  normalized := REGEXP_REPLACE(normalized, 
    '^(el |la |los |las |sr |sra |señor |señora |don |doña |chef |mesero |mesera |mozo |moza |camarero |camarera |cocinero |cocinera |hostess |recepcionista |cajero |cajera )', 
    '', 'i');
  
  -- 3. Trim de nuevo después de remover prefijos
  normalized := TRIM(normalized);
  
  -- 4. FASE 1: Quitar acentos para matching uniforme (Tomás = Tomas)
  normalized := UNACCENT(normalized);
  
  -- 5. Capitalizar primera letra de cada palabra
  normalized := INITCAP(normalized);
  
  -- 6. FASE 1: Validar que no sea un rol común (blacklist)
  IF normalized IN (
    'Mesero', 'Mesera', 'Mozo', 'Moza', 'Camarero', 'Camarera', 
    'Chef', 'Cocinero', 'Cocinera', 'Hostess', 'Host',
    'Recepcionista', 'Cajero', 'Cajera', 'Gerente', 'Manager',
    'Dueno', 'Duena', 'Propietario', 'Propietaria',
    'Personal', 'Atencion', 'Servicio', 'Staff',
    'Chico', 'Chica', 'Chicos', 'Chicas', 'Chicxs', 'Muchachos'
  ) THEN
    RETURN NULL; -- No es un nombre real, es un rol genérico
  END IF;
  
  -- 7. FASE 1: Filtrar frases genéricas (más de 3 palabras)
  word_count := ARRAY_LENGTH(STRING_TO_ARRAY(normalized, ' '), 1);
  IF word_count > 3 THEN
    RETURN NULL; -- Muy largo, probablemente es una frase
  END IF;
  
  -- 8. FASE 1: Filtrar frases descriptivas (contienen palabras clave)
  IF normalized ~ '(Que |Quien|Del |Nos |Atendia|Atendio|Salon|Delivery)' THEN
    RETURN NULL; -- Es una frase descriptiva, no un nombre
  END IF;
  
  RETURN normalized;
END;
$$;

COMMENT ON FUNCTION public.normalize_staff_name(text) IS 
  'Normaliza nombres de staff con unaccent, blacklist de roles y filtros de frases genéricas (Fases 1 y 2)';

-- ============================================================================
-- FASE 2: FUZZY MATCHING CON LEVENSHTEIN
-- ============================================================================

-- 2.1. Función auxiliar para buscar staff similar (Levenshtein distance <= 2)
CREATE OR REPLACE FUNCTION public.find_similar_staff(
  p_external_place_id uuid,
  p_normalized_name text,
  p_max_distance integer DEFAULT 2
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  similar_staff_id uuid;
BEGIN
  -- Buscar staff existente con nombre similar usando Levenshtein
  -- Prioridad: distancia menor primero
  SELECT id INTO similar_staff_id
  FROM public.staff_members
  WHERE external_place_id = p_external_place_id
    AND LEVENSHTEIN(normalized_name, p_normalized_name) <= p_max_distance
  ORDER BY LEVENSHTEIN(normalized_name, p_normalized_name) ASC
  LIMIT 1;
  
  RETURN similar_staff_id;
END;
$$;

COMMENT ON FUNCTION public.find_similar_staff(uuid, text, integer) IS 
  'Busca staff con nombre similar usando Levenshtein distance (Fase 2 - Fuzzy matching)';

-- 2.2. Trigger function mejorado con fuzzy matching
CREATE OR REPLACE FUNCTION public.sync_staff_mentions_from_review()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  mention jsonb;
  normalized_name text;
  staff_id uuid;
  similar_staff_id uuid;
  sentiment_val text;
BEGIN
  -- Solo procesar si staff_mentions cambió y no es null/vacío
  IF NEW.staff_mentions IS NULL OR jsonb_array_length(NEW.staff_mentions) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Iterar sobre cada mención de staff en el array
  FOR mention IN SELECT * FROM jsonb_array_elements(NEW.staff_mentions)
  LOOP
    -- Normalizar nombre (ahora con unaccent y filtros)
    normalized_name := public.normalize_staff_name(mention->>'detected_name');
    sentiment_val := mention->>'sentiment';
    
    -- FASE 1: Ignorar si normalize_staff_name devolvió NULL
    -- (significa que es un rol, frase genérica, o nombre inválido)
    IF normalized_name IS NULL OR normalized_name = '' THEN
      CONTINUE;
    END IF;
    
    -- FASE 2: Buscar staff similar antes de crear nuevo
    similar_staff_id := public.find_similar_staff(
      NEW.external_place_id, 
      normalized_name, 
      2 -- threshold: distancia <= 2 (Tomas vs Tomi = 2)
    );
    
    -- Si encontramos similar, usar ese; sino crear nuevo
    IF similar_staff_id IS NOT NULL THEN
      -- Usar el staff existente similar
      staff_id := similar_staff_id;
      
      -- Actualizar contadores del staff existente
      UPDATE public.staff_members
      SET
        -- Agregar variación si no existe
        name_variations = (
          SELECT ARRAY(
            SELECT DISTINCT unnest(
              name_variations || ARRAY[mention->>'detected_name']::text[]
            )
          )
        ),
        
        -- Incrementar contadores
        total_mentions = total_mentions + 1,
        positive_mentions = positive_mentions + 
          CASE WHEN sentiment_val = 'positive' THEN 1 ELSE 0 END,
        neutral_mentions = neutral_mentions + 
          CASE WHEN sentiment_val = 'neutral' THEN 1 ELSE 0 END,
        negative_mentions = negative_mentions + 
          CASE WHEN sentiment_val = 'negative' THEN 1 ELSE 0 END,
        
        -- Actualizar role si el nuevo tiene valor y el existente no
        primary_role = COALESCE(primary_role, mention->>'role'),
        
        -- Actualizar última mención
        last_seen_at = GREATEST(last_seen_at, COALESCE(NEW.posted_at, now())),
        updated_at = now()
      WHERE id = staff_id;
      
    ELSE
      -- No hay similar, crear nuevo staff member
      INSERT INTO public.staff_members (
        external_place_id,
        normalized_name,
        primary_role,
        name_variations,
        total_mentions,
        positive_mentions,
        neutral_mentions,
        negative_mentions,
        first_seen_at,
        last_seen_at
      ) VALUES (
        NEW.external_place_id,
        normalized_name,
        mention->>'role',
        ARRAY[mention->>'detected_name']::text[],
        1,
        CASE WHEN sentiment_val = 'positive' THEN 1 ELSE 0 END,
        CASE WHEN sentiment_val = 'neutral' THEN 1 ELSE 0 END,
        CASE WHEN sentiment_val = 'negative' THEN 1 ELSE 0 END,
        COALESCE(NEW.posted_at, now()),
        COALESCE(NEW.posted_at, now())
      )
      ON CONFLICT (external_place_id, normalized_name) 
      DO UPDATE SET
        -- Por si acaso hay race condition, actualizar como antes
        primary_role = COALESCE(EXCLUDED.primary_role, public.staff_members.primary_role),
        name_variations = (
          SELECT ARRAY(
            SELECT DISTINCT unnest(
              public.staff_members.name_variations || EXCLUDED.name_variations
            )
          )
        ),
        total_mentions = public.staff_members.total_mentions + 1,
        positive_mentions = public.staff_members.positive_mentions + 
          CASE WHEN sentiment_val = 'positive' THEN 1 ELSE 0 END,
        neutral_mentions = public.staff_members.neutral_mentions + 
          CASE WHEN sentiment_val = 'neutral' THEN 1 ELSE 0 END,
        negative_mentions = public.staff_members.negative_mentions + 
          CASE WHEN sentiment_val = 'negative' THEN 1 ELSE 0 END,
        last_seen_at = GREATEST(public.staff_members.last_seen_at, COALESCE(NEW.posted_at, now())),
        updated_at = now()
      RETURNING id INTO staff_id;
    END IF;
    
    -- Crear registro individual de mención
    INSERT INTO public.staff_mentions (
      review_id,
      staff_member_id,
      detected_name,
      role,
      sentiment,
      evidence_span
    ) VALUES (
      NEW.id,
      staff_id,
      mention->>'detected_name',
      mention->>'role',
      sentiment_val,
      mention->>'evidence_span'
    )
    ON CONFLICT DO NOTHING;
    
  END LOOP;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_staff_mentions_from_review() IS 
  'Trigger mejorado con fuzzy matching (Levenshtein), blacklist de roles y filtros de frases genéricas';

-- ============================================================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================================================

-- Índice GIN para búsqueda en name_variations
CREATE INDEX IF NOT EXISTS idx_staff_members_name_variations 
  ON public.staff_members USING GIN (name_variations);

-- Índice para búsqueda por normalized_name con trigram (mejora fuzzy search)
CREATE INDEX IF NOT EXISTS idx_staff_members_name_trgm 
  ON public.staff_members USING GIN (normalized_name gin_trgm_ops);

-- ============================================================================
-- FUNCIÓN AUXILIAR: Merge manual de staff duplicados (para UI futura)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.merge_staff_members(
  p_keep_id uuid,
  p_merge_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  merged_count integer := 0;
  merge_id uuid;
BEGIN
  -- Validar que keep_id exista
  IF NOT EXISTS (SELECT 1 FROM public.staff_members WHERE id = p_keep_id) THEN
    RAISE EXCEPTION 'Staff member % does not exist', p_keep_id;
  END IF;
  
  -- Iterar sobre cada ID a fusionar
  FOREACH merge_id IN ARRAY p_merge_ids
  LOOP
    -- Saltar si es el mismo que el que queremos mantener
    IF merge_id = p_keep_id THEN
      CONTINUE;
    END IF;
    
    -- Actualizar menciones para apuntar al staff correcto
    UPDATE public.staff_mentions
    SET staff_member_id = p_keep_id
    WHERE staff_member_id = merge_id;
    
    merged_count := merged_count + 1;
  END LOOP;
  
  -- Consolidar name_variations en el staff que mantenemos
  UPDATE public.staff_members
  SET name_variations = (
    SELECT ARRAY_AGG(DISTINCT v ORDER BY v)
    FROM (
      SELECT UNNEST(name_variations) as v 
      FROM public.staff_members 
      WHERE id = ANY(p_merge_ids) OR id = p_keep_id
    ) x
  )
  WHERE id = p_keep_id;
  
  -- Re-calcular estadísticas del staff que mantenemos
  UPDATE public.staff_members sm
  SET 
    total_mentions = (SELECT COUNT(*) FROM public.staff_mentions WHERE staff_member_id = p_keep_id),
    positive_mentions = (SELECT COUNT(*) FROM public.staff_mentions WHERE staff_member_id = p_keep_id AND sentiment = 'positive'),
    neutral_mentions = (SELECT COUNT(*) FROM public.staff_mentions WHERE staff_member_id = p_keep_id AND sentiment = 'neutral'),
    negative_mentions = (SELECT COUNT(*) FROM public.staff_mentions WHERE staff_member_id = p_keep_id AND sentiment = 'negative'),
    first_seen_at = (SELECT MIN(created_at) FROM public.staff_mentions WHERE staff_member_id = p_keep_id),
    last_seen_at = (SELECT MAX(created_at) FROM public.staff_mentions WHERE staff_member_id = p_keep_id),
    updated_at = now()
  WHERE id = p_keep_id;
  
  -- Eliminar staff duplicados (ON DELETE CASCADE eliminará mentions automáticamente)
  DELETE FROM public.staff_members 
  WHERE id = ANY(p_merge_ids) AND id != p_keep_id;
  
  RETURN json_build_object(
    'ok', true,
    'kept_id', p_keep_id,
    'merged_count', merged_count,
    'message', format('Successfully merged %s staff members into %s', merged_count, p_keep_id)
  );
END;
$$;

COMMENT ON FUNCTION public.merge_staff_members(uuid, uuid[]) IS 
  'Fusiona múltiples staff members en uno solo (útil para corregir duplicados manualmente desde UI)';

-- ============================================================================
-- VISTA: Detectar posibles duplicados para sugerir en UI
-- ============================================================================

CREATE OR REPLACE VIEW public.staff_duplicate_suggestions AS
SELECT 
  s1.id as staff_id_1,
  s1.normalized_name as name_1,
  s1.total_mentions as mentions_1,
  s2.id as staff_id_2,
  s2.normalized_name as name_2,
  s2.total_mentions as mentions_2,
  LEVENSHTEIN(s1.normalized_name, s2.normalized_name) as distance,
  s1.external_place_id
FROM public.staff_members s1
JOIN public.staff_members s2 
  ON s1.external_place_id = s2.external_place_id
  AND s1.id < s2.id -- Evitar duplicar pares (A-B y B-A)
WHERE LEVENSHTEIN(s1.normalized_name, s2.normalized_name) BETWEEN 1 AND 3
ORDER BY s1.external_place_id, distance ASC;

COMMENT ON VIEW public.staff_duplicate_suggestions IS 
  'Vista para sugerir posibles duplicados de staff en UI (distance 1-3)';

-- ============================================================================
-- FINALIZACIÓN
-- ============================================================================

-- Re-crear el trigger con la nueva función
DROP TRIGGER IF EXISTS trigger_sync_staff_mentions ON public.reviews;

CREATE TRIGGER trigger_sync_staff_mentions
AFTER INSERT OR UPDATE OF staff_mentions ON public.reviews
FOR EACH ROW
WHEN (NEW.staff_mentions IS NOT NULL AND jsonb_array_length(NEW.staff_mentions) > 0)
EXECUTE FUNCTION public.sync_staff_mentions_from_review();

-- Log de migración
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada: Staff deduplication improvements (Phases 1 & 2)';
  RAISE NOTICE '   - UNACCENT extension enabled';
  RAISE NOTICE '   - FUZZYSTRMATCH extension enabled';
  RAISE NOTICE '   - normalize_staff_name() updated with blacklist and phrase filters';
  RAISE NOTICE '   - find_similar_staff() function added (Levenshtein distance <= 2)';
  RAISE NOTICE '   - sync_staff_mentions_from_review() trigger updated with fuzzy matching';
  RAISE NOTICE '   - merge_staff_members() function added for manual merges';
  RAISE NOTICE '   - staff_duplicate_suggestions view created for UI';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Expected improvements:';
  RAISE NOTICE '   - Tomás + Tomas + Tomi → consolidated into 1 staff member';
  RAISE NOTICE '   - Generic roles (Mesero, Camarero) filtered out';
  RAISE NOTICE '   - Generic phrases (La chica que nos atendió) filtered out';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  To apply to existing data, re-analyze reviews with new logic.';
END $$;

