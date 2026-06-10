import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  localStorage.setItem("verita-theme", theme);
}

const initial = (localStorage.getItem("verita-theme") as Theme) || "dark";
apply(initial);

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initial,
  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    apply(next);
    set({ theme: next });
  },
  set: (t) => {
    apply(t);
    set({ theme: t });
  },
}));
