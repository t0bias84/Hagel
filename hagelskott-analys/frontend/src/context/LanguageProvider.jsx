import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
  } from "react";
  
  /**
   * Språk som stöds: 
   * 'key': "Visningsnamn"
   */
  const SUPPORTED_LANGUAGES = {
    sv: "Svenska",
    en: "English",
    es: "Español",
    it: "Italiano",
    de: "Deutsch",
  };
  
  /**
   * Kontext för språk.
   */
  const LanguageContext = createContext();
  
  /**
   * Försöker auto-detektera webbläsarspråk och returnerar
   * en sträng som matchar med våra SUPPORTED_LANGUAGES (om möjligt).
   */
  const detectBrowserLanguage = () => {
    const userLang = navigator.language?.substr(0, 2).toLowerCase(); // t.ex. "sv", "en" m.m.
    return SUPPORTED_LANGUAGES[userLang] ? userLang : "sv"; // fallback "sv"
  };
  
  /**
   * LanguageProvider
   * ----------------
   * Hanterar dels:
   *  1) Avläsa/skriva 'language' till localStorage
   *  2) Växla språk med `changeLanguage(lang)`
   *  3) Möjlighet att auto-detektera webbläsarspråk
   *  4) Hook `useLanguage` för åtkomst
   */
  export const LanguageProvider = ({ children }) => {
    // Sätter ett standardspråk direkt, t.ex. "sv"
    // Du kan även välja att initialisera det med "detectBrowserLanguage()"
    const [language, setLanguage] = useState(() => {
      const stored = localStorage.getItem("language");
      if (stored && SUPPORTED_LANGUAGES[stored]) {
        return stored;
      }
      // Om inget sparat i localStorage => auto-detect
      return detectBrowserLanguage();
    });
  
    /**
     * Vid mount: om localStorage har ett språk som stödjs => 
     * använd det. Annars använder vi fallbacken från setState ovan.
     */
    useEffect(() => {
      const storedLanguage = localStorage.getItem("language");
      if (storedLanguage && SUPPORTED_LANGUAGES[storedLanguage]) {
        setLanguage(storedLanguage);
      }
    }, []);
  
    /**
     * changeLanguage
     * --------------
     * Tillåter oss att byta språk, spara i localStorage och uppdatera state.
     */
    const changeLanguage = useCallback((lang) => {
      if (SUPPORTED_LANGUAGES[lang]) {
        setLanguage(lang);
        localStorage.setItem("language", lang);
      } else {
        console.error(`Språket "${lang}" stöds inte.`);
      }
    }, []);
  
    /**
     * getLanguageLabel
     * ----------------
     * Returnerar "Svenska", "English" etc. för nuvarande language,
     * eller tom sträng om ogiltigt.
     */
    const getLanguageLabel = useCallback(() => {
      return SUPPORTED_LANGUAGES[language] || "";
    }, [language]);
  
    /**
     * toggleLanguage
     * --------------
     * Exempel-funktion för att växla mellan språk i en lista 
     * (t.ex. "sv" -> "en" -> "es" osv.). 
     * Kan vara användbar i en knapp "Nästa språk".
     */
    const toggleLanguage = useCallback(() => {
      const keys = Object.keys(SUPPORTED_LANGUAGES);
      const currentIndex = keys.indexOf(language);
      const nextIndex = (currentIndex + 1) % keys.length;
      const nextLang = keys[nextIndex];
      changeLanguage(nextLang);
    }, [language, changeLanguage]);
  
    const contextValue = {
      language,           // t.ex. "sv"
      changeLanguage,     // sätt explicit språk
      toggleLanguage,     // loopa genom språk
      getLanguageLabel,   // hämta displaytext: "Svenska" etc.
      SUPPORTED_LANGUAGES // lista över alla
    };
  
    return (
      <LanguageContext.Provider value={contextValue}>
        {children}
      </LanguageContext.Provider>
    );
  };
  
  /**
   * useLanguage
   * -----------
   * Hook för att konsumera vår context.
   * Returnerar: { language, changeLanguage, toggleLanguage, getLanguageLabel, SUPPORTED_LANGUAGES }
   */
  export const useLanguage = () => {
    return useContext(LanguageContext);
  };
  