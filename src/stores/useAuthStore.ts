import { useSyncExternalStore } from "react";
import { loginAdmin, setupAdmin } from "@/lib/api";

interface AuthUser {
  id: string;
  username: string;
  role: string;
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

function setUser(user: AuthUser | null) {
  state = { ...state, user, loading: false, initialized: true };
  if (user) {
    localStorage.setItem("auth-user", JSON.stringify(user));
  } else {
    localStorage.removeItem("auth-user");
    localStorage.removeItem("auth-token");
  }
  emit();
}

function setLoading(loading: boolean) {
  state = { ...state, loading };
  emit();
}

let initDone = false;
function initAuth() {
  if (initDone) return;
  initDone = true;

  const storedUser = localStorage.getItem("auth-user");
  const storedToken = localStorage.getItem("auth-token");

  if (storedUser && storedToken) {
    try {
      setUser(JSON.parse(storedUser));
    } catch {
      setUser(null);
    }
  } else {
    setUser(null);
  }
}

async function signIn(username: string, pass: string) {
  setLoading(true);
  try {
    const res = await loginAdmin(username, pass);
    if (res.error) throw new Error(res.error);
    if (res.token && res.user) {
      localStorage.setItem("auth-token", res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error("Falha no login");
  } finally {
    setLoading(false);
  }
}

async function signOut() {
  setUser(null);
}

interface AuthStoreAPI extends AuthState {
  signIn: typeof signIn;
  signOut: typeof signOut;
  setLoading: typeof setLoading;
  setupRoot: () => Promise<any>;
}

export function useAuthStore(): AuthStoreAPI;
export function useAuthStore<T>(selector: (s: AuthStoreAPI) => T): T;
export function useAuthStore<T>(selector?: (s: AuthStoreAPI) => T) {
  initAuth();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const api: AuthStoreAPI = {
    ...snap,
    signIn,
    signOut,
    setLoading,
    setupRoot: async () => await setupAdmin()
  };

  return selector ? selector(api) : api;
}
