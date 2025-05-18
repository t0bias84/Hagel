import React, { useState, useEffect } from "react";
import { Menu, X, Moon, Sun, LogOut, Settings, Bell } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import Sidebar from "./Sidebar";
import ChatManager from '../chat/ChatManager';

/**
 * ModernLayout
 * ============
 * Ett modernt, responsivt layout-komponent:
 * - En topbar med logga, språk, mörker/vitt tema-knapp m.m.
 * - En sidebar som kan öppnas/stängas i mobil-läge.
 * - En main-sektion för barnkomponenter (children).
 * - En footer med social links (valfritt).
 */
const ModernLayout = ({ children }) => {
  // Local state för att toggla "öppen" sidebar i mobil-läge
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Ändra standardvärdet till true för dark mode
  const [darkMode, setDarkMode] = useState(true);

  // Lägg till useEffect för att sätta dark mode som standard
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;

  // Byt tema-läge (ex. body-klass "dark" / "light" eller liknande)
  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="fixed top-0 right-0 left-64 h-16 bg-dark-800 border-b border-dark-700 z-10">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-white text-xl font-semibold">
              {t.common.appName}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-white hover:bg-dark-700 transition-colors duration-200"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-lg text-white hover:bg-dark-700 transition-colors duration-200"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <Sidebar />

      <main className="ml-64 pt-16 min-h-screen relative z-0">
        <div className="p-6">
          {children}
        </div>
      </main>
      
      <ChatManager />
    </div>
  );
};

export default ModernLayout;
