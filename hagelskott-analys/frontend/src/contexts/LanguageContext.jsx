import React, { createContext, useState, useContext, useEffect } from 'react';
import { en } from '../translations/en';
import { sv } from '../translations/sv';

// Språkkontext
const LanguageContext = createContext();

// Hook för att använda språk
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Provider komponent
export const LanguageProvider = ({ children }) => {
  // Hämta språkpreferens från localStorage, default till 'en'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  // Uppdatera localStorage när språket ändras
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Hämta t (translations) baserat på valt språk
  const t = language === 'en' ? en : sv;

  // Funktion för att byta språk
  const toggleLanguage = () => {
    setLanguage(prevLang => (prevLang === 'en' ? 'sv' : 'en'));
  };

  // Exponera hela API:t
  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}; 