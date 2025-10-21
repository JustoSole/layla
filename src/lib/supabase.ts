import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase usando variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ibhxfrmaluxegibwqfiv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ✅ Validación de variables de entorno (solo warning, no error)
if (!supabaseAnonKey) {
  console.warn('⚠️ Supabase not configured - some features will be disabled');
  console.warn('For full functionality, create environment variables:');
  console.warn('VITE_SUPABASE_URL=https://ibhxfrmaluxegibwqfiv.supabase.co');
  console.warn('VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard');
}

console.log('🔑 Supabase client configured with:', { 
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  anonKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
});

// Crear clientes solo si tenemos las variables necesarias
export const supabase = supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Cliente específico para desarrollo que bypass autenticación
export const supabaseDev = supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    })
  : null;
