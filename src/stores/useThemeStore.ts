import { create } from 'zustand';

interface ThemeState {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    setTheme: (theme: 'dark' | 'light') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    theme: (localStorage.getItem('ponto-theme') as 'dark' | 'light') || 'dark',
    toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('ponto-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        return { theme: newTheme };
    }),
    setTheme: (theme) => {
        localStorage.setItem('ponto-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
    }
}));

// Initialization on load
if (typeof document !== 'undefined') {
    const t = (localStorage.getItem('ponto-theme') as 'dark' | 'light') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
}
