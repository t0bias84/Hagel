import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { en } from '@/translations/en';
import { sv } from '@/translations/sv';

const GeneralSettings = ({ settings, updateNestedState, setLanguage }) => {
  const { language } = useLanguage();
  const { setTheme } = useTheme();
  const t = language === 'en' ? en : sv;

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    updateNestedState('interface', 'theme', newTheme);
    setTheme(newTheme);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="space-y-2">
          <label className="text-white">Tema</label>
          <select
            value={settings.interface.theme}
            onChange={handleThemeChange}
            className="w-full p-2 rounded-lg bg-dark-700 text-white border border-dark-600"
          >
            <option value="dark">Mörkt</option>
            <option value="light">Ljust</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-white">Språk</label>
          <select
            value={settings.interface.language}
            onChange={(e) => {
                updateNestedState('interface', 'language', e.target.value);
                setLanguage(e.target.value);
            }}
            className="w-full p-2 rounded-lg bg-dark-700 text-white border border-dark-600"
          >
            <option value="sv">Svenska</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-white">Måttenhet</label>
          <select
            value={settings.interface.measurementUnit}
            onChange={(e) => updateNestedState('interface', 'measurementUnit', e.target.value)}
            className="w-full p-2 rounded-lg bg-dark-700 text-white border border-dark-600"
          >
            <option value="metric">Metrisk (mm, gram)</option>
            <option value="imperial">Imperial (tum, grain)</option>
          </select>
        </div>
      </div>
    </div>
.
  );
};

export default GeneralSettings;
