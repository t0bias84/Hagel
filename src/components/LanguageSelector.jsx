import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export function LanguageSelector() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      onClick={toggleLanguage}
      variant="ghost"
      title={language === 'en' ? 'Byt till svenska' : 'Switch to English'}
      className="text-xl"
    >
      {language === 'en' ? '🇸🇪' : '🇬🇧'}
    </Button>
  );
} 