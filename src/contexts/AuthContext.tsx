import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// 🔧 MODO DESARROLLO: Bypasear autenticación para desarrollo rápido
const DEV_MODE_BYPASS_AUTH = false; // ← Cambiar a false cuando quieras auth real
const DEV_USER_EMAIL = 'solenojusto1@gmail.com';

// Usuario mock para desarrollo
const createDevUser = (): User => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: DEV_USER_EMAIL,
  app_metadata: {},
  user_metadata: {
    email: DEV_USER_EMAIL,
    full_name: 'Justo Soleno (Dev)',
    avatar_url: null
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  role: 'authenticated',
  updated_at: new Date().toISOString()
} as User);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 🔧 MODO DESARROLLO: Bypass de autenticación
    if (import.meta.env.DEV && DEV_MODE_BYPASS_AUTH) {
      console.log('🔓 DEV MODE: Auth bypassed, usando usuario fijo:', DEV_USER_EMAIL);
      const devUser = createDevUser();
      const devSession = {
        user: devUser,
        access_token: 'dev-token',
        refresh_token: 'dev-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer'
      } as Session;
      
      setUser(devUser);
      setSession(devSession);
      setLoading(false);
      return () => {}; // No cleanup needed
    }

    // 🔐 PRODUCCIÓN: Autenticación real
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        if (import.meta.env.DEV) console.log('🔐 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          if (isMounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          if (import.meta.env.DEV) console.log('✅ Initial session loaded:', !!session?.user);
        }
      } catch (error) {
        console.error('❌ Error getting initial session:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (import.meta.env.DEV) console.log('🔐 Auth state changed:', event, !!session?.user);
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Solo setear loading false si ya pasamos la carga inicial
          if (event !== 'INITIAL_SESSION') {
            setLoading(false);
          }
        }
      }
    );

    // Iniciar la carga de sesión
    getInitialSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    // 🔧 MODO DESARROLLO: Simular login exitoso
    if (import.meta.env.DEV && DEV_MODE_BYPASS_AUTH) {
      console.log('🔓 DEV MODE: Login simulado exitoso');
      return { error: null };
    }

    // 🔐 PRODUCCIÓN: Login real
    try {
      setLoading(true);
      if (import.meta.env.DEV) console.log('🔐 Starting Google sign-in...');
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`
        }
      });
      if (import.meta.env.DEV) console.log('✅ Google sign-in initiated:', !!result);
      return { error: result.error };
    } catch (error) {
      console.error('❌ Error signing in with Google:', error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    // 🔧 MODO DESARROLLO: No hacer nada (siempre logueado en dev)
    if (import.meta.env.DEV && DEV_MODE_BYPASS_AUTH) {
      console.log('🔓 DEV MODE: Sign out ignorado (siempre logueado en dev)');
      return { error: null };
    }

    // 🔐 PRODUCCIÓN: Logout real
    try {
      setLoading(true);
      if (import.meta.env.DEV) console.log('🔐 Signing out...');
      const result = await supabase.auth.signOut();
      
      // Limpiar datos del business también (evitamos dependencia circular)
      localStorage.removeItem('reputacionlocal_business');
      
      if (import.meta.env.DEV) console.log('✅ Signed out successfully');
      return { error: result.error };
    } catch (error) {
      console.error('❌ Error signing out:', error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
