import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/database';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  department?: string | null;
  avatar?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(user: User, profile?: any): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username: profile?.username || user.user_metadata?.username || user.email!.split('@')[0],
    role: profile?.role || 'user',
    department: profile?.department || null,
    avatar: profile?.avatar || user.user_metadata?.avatar_url || null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (authUser: AuthUser) => {
    console.log('User logged in:', authUser);
    setUser(authUser);
  };

  const logout = async () => {
    console.log('Logging out user');
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    let mounted = true;

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        login(mapSupabaseUser(session.user, profile));
      }
      if (mounted) setLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          login(mapSupabaseUser(session.user, profile));
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          logout();
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          login(mapSupabaseUser(session.user, profile));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
