import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserSettings, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  settings: UserSettings | null;
  role: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, shopName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOADING_TIMEOUT = 10000; // 10 seconds max loading time

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Prevent multiple fetches and track initial load
  const initialLoadDone = useRef(false);
  const fetchingUser = useRef(false);

  useEffect(() => {
    let mounted = true;
    let loadingTimeout: ReturnType<typeof setTimeout>;

    // Set a maximum loading time to prevent infinite loading
    const setLoadingTimeout = () => {
      loadingTimeout = setTimeout(() => {
        if (mounted && loading) {
          console.warn('Auth loading timeout - forcing load complete');
          setLoading(false);
        }
      }, LOADING_TIMEOUT);
    };

    setLoadingTimeout();

    const getSession = async () => {
      if (fetchingUser.current) return;
      fetchingUser.current = true;

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            await fetchUserData(session.user.id);
          }

          initialLoadDone.current = true;
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          fetchingUser.current = false;
        }
        clearTimeout(loadingTimeout);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // Skip handling if this is the initial session event and we already loaded
        if (event === 'INITIAL_SESSION' && initialLoadDone.current) {
          return;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            await fetchUserData(session.user.id);
          } else {
            setSettings(null);
            setRole(null);
          }

          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Memoize fetchUserData to prevent multiple calls
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch settings with proper error handling
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsError) {
        // Log but don't throw - app can continue without settings
        console.warn('Could not fetch user settings:', settingsError.message);
      }

      if (settingsData) {
        setSettings(settingsData);
      }

      // Fetch user_roles with proper error handling
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (roleError) {
        // This is expected for owners who don't have a role entry
        console.warn('No user role found (normal for owners):', roleError.message);
      }

      // Set role if found, otherwise null (owner default)
      setRole(roleData || null);

    } catch (error) {
      console.error('Error fetching user data:', error);
      // Don't rethrow - allow app to continue
    }
  };

  const signUp = async (email: string, password: string, shopName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        },
      });

      if (error) return { error };

      if (data.user) {
        try {
          await supabase.from('user_settings').insert({
            user_id: data.user.id,
            shop_name: shopName,
          });
        } catch (insertError) {
          console.error('Error creating user settings:', insertError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
      setSession(null);
      setSettings(null);
      setRole(null);
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(newSettings)
        .eq('user_id', user.id);

      if (!error) {
        setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      }
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, settings, role, loading, signUp, signIn, signOut, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
