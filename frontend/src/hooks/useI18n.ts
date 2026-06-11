import { useMemo } from "react";
import { useLanguageStore } from "../stores/languageStore";
import { getMessage } from "../i18n/messages";

export function useI18n() {
  const { language, setLanguage } = useLanguageStore();

  return useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string, params?: Record<string, string | number>) => {
        let value = getMessage(language, key);
        if (!params) return value;

        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replaceAll(`{{${paramKey}}}`, String(paramValue));
        }

        return value;
      },
      formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", options).format(
          new Date(value),
        ),
      locale: language === "fr" ? "fr-FR" : "en-US",
    }),
    [language, setLanguage],
  );
}
