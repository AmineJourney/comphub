import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppLanguage } from "../types/i18n.types";

interface LanguageStore {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "language-storage",
    },
  ),
);
