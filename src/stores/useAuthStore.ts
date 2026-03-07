import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthUser {
  id: string;
  email: string;
  username: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

let state: AuthState = { user: null, loading: true, initialized: false };
const subs = new Set<() => void>();

function emit() {
  subs.forEach((fn) => fn());
}

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => { subs.delete(cb); };
}

function getSnapshot() {
  return state;
}

function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.user_metadata?.full_name || user.email!.split("@")[0],
  };
}

function setUser(user: AuthUser | null) {
  state = { ...state, user, loading: false, initialized: true };
  emit();
}

function setLoading(loading: boolean) {
  state = { ...state, loading };
  emit();
}

// Initialize auth listener
let initDone = false;
function initAuth() {
  if (initDone) return;
  initDone = true;

  let mounted = true;

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (mounted && session?.user) {
      setUser(mapUser(session.user));
    } else if (mounted) {
      state = { ...state, loading: false, initialized: true };
      emit();
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (!mounted) return;
    if (event === "SIGNED_IN" && session?.user) {
      setUser(mapUser(session.user));
    } else if (event === "SIGNED_OUT") {
      setUser(null);
    } else if (event === "TOKEN_REFRESHED" && session?.user) {
      setUser(mapUser(session.user));
    }
  });
}

// Auth actions
async function sendOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

async function verifyOtpAndSetPassword(email: string, token: string, password: string, username: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;

  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    password,
    data: { username },
  });
  if (updateError) throw updateError;
  return updateData.user;
}

async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

interface AuthStoreAPI extends AuthState {
  sendOtp: typeof sendOtp;
  verifyOtpAndSetPassword: typeof verifyOtpAndSetPassword;
  signIn: typeof signIn;
  signOut: typeof signOut;
  setLoading: typeof setLoading;
  mapUser: typeof mapUser;
}

export function useAuthStore(): AuthStoreAPI;
export function useAuthStore<T>(selector: (s: AuthStoreAPI) => T): T;
export function useAuthStore<T>(selector?: (s: AuthStoreAPI) => T) {
  initAuth();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const api: AuthStoreAPI = {
    ...snap,
    sendOtp,
    verifyOtpAndSetPassword,
    signIn,
    signOut,
    setLoading,
    mapUser,
  };

  return selector ? selector(api) : api;
}
