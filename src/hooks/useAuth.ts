import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getProfile, upsertProfile } from '../lib/db';
import type { UserProfile, UserRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Flag untuk skip loadProfile saat signUp sedang berjalan (fix race condition)
  const signingUpRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (u: User) => {
      try {
        // Skip kalau signUp sedang berjalan — biar tidak overwrite profile dengan null
        if (signingUpRef.current) return;
        const p = await getProfile(u.id);
        if (mounted && !signingUpRef.current) setProfile(p);
      } catch (e) {
        console.error('loadProfile:', e);
      }
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) await loadProfile(session.user);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    loading,
    resetPassword: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?type=recovery`,
      });
      if (error) throw error;
    },
    updatePassword: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (
      email: string,
      password: string,
      role: UserRole,
      workUnitBina?: string,
      npsnBinaList?: string[]
    ): Promise<{ userId: string } | null> => {
      // Set flag SEBELUM signUp → supaya listener onAuthStateChange skip loadProfile
      signingUpRef.current = true;

      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user) {
          await upsertProfile({
            id: data.user.id,
            role,
            email,
            workUnitBina: (role === 'pengawas' || role === 'kepala_sekolah') ? workUnitBina : undefined,
            npsnBina: (role === 'kepala_sekolah' && npsnBinaList && npsnBinaList.length > 0)
              ? npsnBinaList[0]
              : undefined,
          });

          // Khusus pengawas: simpan daftar NPSN ke pengawas_sekolah
          if (role === 'pengawas' && npsnBinaList && npsnBinaList.length > 0) {
            const rows = npsnBinaList
              .map((n) => n.trim())
              .filter((n) => n.length > 0)
              .map((npsn) => ({ pengawas_id: data.user!.id, npsn }));
            if (rows.length > 0) {
              const { error: errPS } = await supabase.from('pengawas_sekolah').insert(rows);
              if (errPS) console.error('Insert pengawas_sekolah:', errPS);
            }
          }

          // ⚡ Reload profile SEGERA setelah upsert selesai
          const freshProfile = await getProfile(data.user.id);
          if (freshProfile) setProfile(freshProfile);

          return { userId: data.user.id };
        }
        return null;
      } finally {
        // Lepas flag setelah semua selesai
        signingUpRef.current = false;
      }
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
    },
  };
}
