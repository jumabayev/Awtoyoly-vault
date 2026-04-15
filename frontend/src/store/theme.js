import { create } from 'zustand';

const getInitialTheme = () => {
  const stored = localStorage.getItem('vault_theme');
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const useThemeStore = create((set) => ({
  theme: getInitialTheme(),

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('vault_theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return { theme: newTheme };
    });
  },

  initTheme: () => {
    const theme = getInitialTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
}));

export default useThemeStore;
