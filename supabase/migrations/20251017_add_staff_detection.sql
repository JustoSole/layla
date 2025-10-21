-- Migración: Detección automática de staff en reviews
-- Fecha: 2025-10-17

-- 1. Agregar columna staff_mentions a reviews (JSONB array)
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS staff_mentions jsonb DEFAULT '[]'::jsonb;

-- 2. Crear tabla de miembros del staff (auto-detectados y normalizados)
CREATE TABLE IF NOT EXISTS public.staff_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  external_place_id uuid NOT NULL,
  
  -- Nombre normalizado (sin duplicados: "María" es la forma canónica de María/Mari/Marí)
  normalized_name text NOT NULL,
  
  -- Rol más común detectado en menciones
  primary_role text,
  
  -- Variaciones de nombre detectadas (para fuzzy matching)
  name_variations text[] DEFAULT ARRAY[]::text[],
  
  -- Estadísticas agregadas (se actualizan automáticamente)
  total_mentions integer NOT NULL DEFAULT 0,
  positive_mentions integer NOT NULL DEFAULT 0,
  neutral_mentions integer NOT NULL DEFAULT 0,
  negative_mentions integer NOT NULL DEFAULT 0,
  
  -- Fechas
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT staff_members_pkey PRIMARY KEY (id),
  CONSTRAINT staff_members_external_place_id_fkey 
    FOREIGN KEY (external_place_id) REFERENCES public.external_places(id) ON DELETE CASCADE,
  
  -- Un nombre normalizado por negocio (evita duplicados)
  CONSTRAINT staff_members_unique_name_per_place 
    UNIQUE (external_place_id, normalized_name)
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_staff_members_place 
  ON public.staff_members(external_place_id);

CREATE INDEX IF NOT EXISTS idx_staff_members_name 
  ON public.staff_members(normalized_name);

CREATE INDEX IF NOT EXISTS idx_staff_members_last_seen 
  ON public.staff_members(external_place_id, last_seen_at DESC);

-- 3. Crear tabla de menciones individuales (denormalizada para detalle)
CREATE TABLE IF NOT EXISTS public.staff_mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  staff_member_id uuid NOT NULL,
  
  -- Datos de la mención específica
  detected_name text NOT NULL, -- Nombre tal cual apareció en la review
  role text, -- Rol mencionado (puede ser null)
  sentiment text NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  evidence_span text NOT NULL, -- Cita donde se menciona
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT staff_mentions_pkey PRIMARY KEY (id),
  CONSTRAINT staff_mentions_review_id_fkey 
    FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE,
  CONSTRAINT staff_mentions_staff_member_id_fkey 
    FOREIGN KEY (staff_member_id) REFERENCES public.staff_members(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_staff_mentions_review 
  ON public.staff_mentions(review_id);

CREATE INDEX IF NOT EXISTS idx_staff_mentions_staff_member 
  ON public.staff_mentions(staff_member_id);

CREATE INDEX IF NOT EXISTS idx_staff_mentions_sentiment 
  ON public.staff_mentions(staff_member_id, sentiment);

-- 4. Vista agregada para estadísticas de staff (usa en dashboard)
CREATE OR REPLACE VIEW public.staff_performance_stats AS
SELECT 
  sm.id as staff_member_id,
  sm.external_place_id,
  sm.normalized_name as name,
  sm.primary_role as role,
  sm.name_variations,
  sm.total_mentions,
  sm.positive_mentions,
  sm.neutral_mentions,
  sm.negative_mentions,
  
  -- Tasa positiva (% de menciones positivas)
  CASE 
    WHEN sm.total_mentions > 0 
    THEN ROUND((sm.positive_mentions::numeric / sm.total_mentions::numeric) * 100, 0)
    ELSE 0 
  END as positive_rate,
  
  -- Última mención
  sm.last_seen_at as last_mention_date,
  sm.first_seen_at,
  
  -- Conteo de reviews únicas donde aparece
  (
    SELECT COUNT(DISTINCT review_id) 
    FROM public.staff_mentions 
    WHERE staff_member_id = sm.id
  ) as unique_reviews_count,
  
  sm.created_at,
  sm.updated_at
FROM public.staff_members sm
ORDER BY sm.total_mentions DESC, sm.positive_rate DESC;

-- 5. Función para normalizar nombres (fuzzy matching básico)
CREATE OR REPLACE FUNCTION public.normalize_staff_name(detected_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text;
BEGIN
  -- 1. Trim y lowercase
  normalized := LOWER(TRIM(detected_name));
  
  -- 2. Remover prefijos comunes
  normalized := REGEXP_REPLACE(normalized, '^(el |la |los |las |sr |sra |señor |señora |don |doña |chef |mesero |mesera )', '', 'i');
  
  -- 3. Remover acentos para matching (opcional, puedes quitar esto si prefieres mantener acentos)
  -- normalized := UNACCENT(normalized); -- Requiere extensión unaccent
  
  -- 4. Capitalizar primera letra de cada palabra
  normalized := INITCAP(TRIM(normalized));
  
  RETURN normalized;
END;
$$;

-- 6. Trigger function para sincronizar staff_mentions desde reviews.staff_mentions
CREATE OR REPLACE FUNCTION public.sync_staff_mentions_from_review()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  mention jsonb;
  normalized_name text;
  staff_id uuid;
  sentiment_val text;
BEGIN
  -- Solo procesar si staff_mentions cambió y no es null/vacío
  IF NEW.staff_mentions IS NULL OR jsonb_array_length(NEW.staff_mentions) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Iterar sobre cada mención de staff en el array
  FOR mention IN SELECT * FROM jsonb_array_elements(NEW.staff_mentions)
  LOOP
    -- Normalizar nombre
    normalized_name := public.normalize_staff_name(mention->>'detected_name');
    sentiment_val := mention->>'sentiment';
    
    -- Ignorar si no hay nombre válido
    IF normalized_name IS NULL OR normalized_name = '' THEN
      CONTINUE;
    END IF;
    
    -- 1. Buscar o crear staff_member
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
      -- Actualizar role si el nuevo tiene valor y el existente no
      primary_role = COALESCE(EXCLUDED.primary_role, public.staff_members.primary_role),
      
      -- Agregar variación si no existe
      name_variations = (
        SELECT ARRAY(
          SELECT DISTINCT unnest(
            public.staff_members.name_variations || EXCLUDED.name_variations
          )
        )
      ),
      
      -- Incrementar contadores
      total_mentions = public.staff_members.total_mentions + 1,
      positive_mentions = public.staff_members.positive_mentions + 
        CASE WHEN sentiment_val = 'positive' THEN 1 ELSE 0 END,
      neutral_mentions = public.staff_members.neutral_mentions + 
        CASE WHEN sentiment_val = 'neutral' THEN 1 ELSE 0 END,
      negative_mentions = public.staff_members.negative_mentions + 
        CASE WHEN sentiment_val = 'negative' THEN 1 ELSE 0 END,
      
      -- Actualizar última mención
      last_seen_at = GREATEST(public.staff_members.last_seen_at, COALESCE(NEW.posted_at, now())),
      updated_at = now()
    RETURNING id INTO staff_id;
    
    -- 2. Crear registro individual de mención
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
    ON CONFLICT DO NOTHING; -- Evitar duplicados si el trigger se ejecuta múltiples veces
    
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- 7. Activar trigger en reviews (después de INSERT o UPDATE)
DROP TRIGGER IF EXISTS trigger_sync_staff_mentions ON public.reviews;

CREATE TRIGGER trigger_sync_staff_mentions
AFTER INSERT OR UPDATE OF staff_mentions ON public.reviews
FOR EACH ROW
WHEN (NEW.staff_mentions IS NOT NULL AND jsonb_array_length(NEW.staff_mentions) > 0)
EXECUTE FUNCTION public.sync_staff_mentions_from_review();

-- 8. Comentarios para documentación
COMMENT ON TABLE public.staff_members IS 
  'Miembros del staff detectados automáticamente en reviews. Se normalizan y deduplicán con fuzzy matching.';

COMMENT ON TABLE public.staff_mentions IS 
  'Menciones individuales de staff en reviews. Cada review puede tener múltiples menciones.';

COMMENT ON VIEW public.staff_performance_stats IS 
  'Vista agregada con estadísticas de desempeño de staff para dashboards.';

COMMENT ON COLUMN public.reviews.staff_mentions IS 
  'Array JSONB con menciones de staff detectadas por IA: [{detected_name, role, sentiment, evidence_span}]';

COMMENT ON FUNCTION public.normalize_staff_name(text) IS 
  'Normaliza nombres de staff para fuzzy matching (remueve prefijos, capitaliza, etc.)';

COMMENT ON FUNCTION public.sync_staff_mentions_from_review() IS 
  'Trigger function que sincroniza staff_members y staff_mentions cuando se actualiza reviews.staff_mentions';

