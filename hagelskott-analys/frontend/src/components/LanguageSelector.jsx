import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "sv" : "en");
  };

  return (
    <button
      onClick={toggleLanguage}
      className="
        p-2 rounded-lg
        bg-dark-600
        hover:bg-dark-400
        transition-all duration-200 ease-in-out
        border border-dark-500
        text-dark-50
        flex items-center gap-2
      "
      aria-label="Toggle language"
    >
      <Globe className="h-5 w-5" />
      <span className="text-sm font-medium">{language.toUpperCase()}</span>
    </button>
  );
} 