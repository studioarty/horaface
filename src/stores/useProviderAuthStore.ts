import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { TimeRecord } from '@/types';
import type { Holiday } from '@/lib/api';

interface ProviderAuthStore {
  user: any | null;
  loading: boolean;
  initialized: boolean;
  login: (name: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginWithFace: (providerId: string, providerName: string, hourlyRate?: number) => Promise<{ success: boolean }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  fetchMyRecords: () => Promise<{ records: TimeRecord[], holidays: Holiday[] }>;
}

export const useProviderAuthStore = create<ProviderAuthStore>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  login: async (name: string, pin: string) => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .ilike('name', name)
        .eq('pin', pin)
        .eq('active', true)
        .single();
        
      if (error || !data) {
        return { success: false, error: 'Credenciais inválidas ou prestador inativo.' };
      }

      const userData = {
        id: data.id,
        name: data.name,
        hourlyRate: data.hourly_rate ? parseFloat(data.hourly_rate) : 0,
        role: 'provider',
        chatPermissionType: data.chat_permission_type || 'none',
        chatAllowedProviders: data.chat_allowed_providers ? JSON.parse(data.chat_allowed_providers) : []
      };

      localStorage.setItem('providerUserSession', JSON.stringify(userData));
      set({ user: userData });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Erro ao conectar ao banco de dados.' };
    }
  },

  loginWithFace: async (providerId: string, providerName: string, hourlyRate: number = 0) => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('chat_permission_type, chat_allowed_providers')
        .eq('id', providerId)
        .single();
        
      const chatPermissionType = (!error && data) ? (data.chat_permission_type || 'none') : 'none';
      const chatAllowedProviders = (!error && data && data.chat_allowed_providers) ? JSON.parse(data.chat_allowed_providers) : [];

      const userData = {
        id: providerId,
        name: providerName,
        hourlyRate: hourlyRate,
        role: 'provider',
        chatPermissionType,
        chatAllowedProviders
      };
      localStorage.setItem('providerUserSession', JSON.stringify(userData));
      set({ user: userData });
      return { success: true };
    } catch (err) {
      const userData = {
        id: providerId,
        name: providerName,
        hourlyRate: hourlyRate,
        role: 'provider',
        chatPermissionType: 'none',
        chatAllowedProviders: []
      };
      localStorage.setItem('providerUserSession', JSON.stringify(userData));
      set({ user: userData });
      return { success: true };
    }
  },

  logout: () => {
    localStorage.removeItem('providerUserSession');
    set({ user: null });
  },

  checkAuth: async () => {
    const session = localStorage.getItem('providerUserSession');
    if (!session) {
      set({ loading: false, initialized: true });
      return;
    }
    try {
      set({ user: JSON.parse(session), loading: false, initialized: true });
    } catch (err) {
      localStorage.removeItem('providerUserSession');
      set({ user: null, loading: false, initialized: true });
    }
  },

  fetchMyRecords: async () => {
    const { user } = get();
    if (!user) return { records: [], holidays: [] };
    
    // Fetch directly using Supabase
    const { data: recordsData, error: recordsError } = await supabase
      .from("time_records")
      .select("*")
      .eq("provider_id", user.id)
      .order("check_in", { ascending: false })
      .limit(300);

    const { data: holidaysData, error: holError } = await supabase
      .from("holidays")
      .select("*")
      .order("target_date", { ascending: true });
      
    if (recordsError) {
      console.error("fetchMyRecords error:", recordsError);
    }
    
    const records = (recordsData || []).map((row: any) => ({
      id: row.id,
      providerId: row.provider_id,
      checkIn: row.check_in,
      checkOut: row.check_out || null,
      status: (row.check_out ? "completed" : "active") as "completed" | "active",
      date: new Date(row.check_in).toISOString().split("T")[0],
    }));

    const holidays = (holidaysData || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      targetDate: row.target_date,
      isRoutine: row.is_routine || false,
    }));

    return { records, holidays };
  }
}));

// Setup initial auth check
useProviderAuthStore.getState().checkAuth();
