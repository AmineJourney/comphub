import { Globe } from "lucide-react";
import { useI18n } from "../../hooks/useI18n";
import { Button } from "../../components/ui/button";
import type { AppLanguage } from "../../types/i18n.types";

const languages: AppLanguage[] = ["en", "fr"];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1">
      <Globe className="ml-1 h-4 w-4 text-gray-500" />
      {languages.map((value) => (
        <Button
          key={value}
          type="button"
          variant={language === value ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs uppercase"
          onClick={() => setLanguage(value)}
          aria-label={
            value === "en" ? t("common.english") : t("common.french")
          }
        >
          {value}
        </Button>
      ))}
    </div>
  );
}
