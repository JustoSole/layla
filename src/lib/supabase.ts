import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase usando variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ibhxfrmaluxegibwqfiv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ✅ Validación de variables de entorno
if (!supabaseAnonKey) {
  console.error('❌ MISSING ENVIRONMENT VARIABLES:');
  console.error('Please create a .env file with:');
  console.error('VITE_SUPABASE_URL=https://ibhxfrmaluxegibwqfiv.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard');
  console.error('');
  console.error('Get your keys from: https://supabase.com/dashboard/project/ibhxfrmaluxegibwqfiv/settings/api');
  throw new Error('Missing required Supabase environment variables');
}

console.log('🔑 Supabase client configured with:', { 
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  anonKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Cliente específico para desarrollo que bypass autenticación
export const supabaseDev = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
})
