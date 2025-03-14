import React, { useState } from "react";
import { Menu, X, Moon, Sun, Globe } from "lucide-react"; 
// Exempel-ikoner: du kan byta ut mot valfria

import Sidebar from "./Sidebar";

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
  // Local state för att toggla “öppen” sidebar i mobil-läge
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // För att toggla ljus/mörk tema (valfritt, beroende på hur du hanterar tema)
  const [darkMode, setDarkMode] = useState(true);

  // Byt tema-läge (ex. body-klass “dark” / “light” eller liknande)
  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  // Exempel: klick för att toggla sidebar i mobil
  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* TOP BAR / HEADER */}
      <header className="flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-800 shadow transition-colors z-10">
        {/* Vänster sektion: “Hamburger + Logo” */}
        <div className="flex items-center gap-2">
          {/* Hamburger icon (visas i mobil) */}
          <button
            onClick={handleSidebarToggle}
            className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            ) : (
              <Menu className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            )}
          </button>
          {/* Logga / Projekt-namn */}
          <div className="text-lg font-bold text-gray-800 dark:text-gray-100">
            MyApp
          </div>
        </div>

        {/* Höger sektion: Exempel med språk & temaväxlare */}
        <div className="flex items-center gap-4">
          {/* Språk-knapp (demo) */}
          <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <Globe className="h-5 w-5 text-gray-800 dark:text-gray-200" />
          </button>
          {/* Tema-knapp */}
          <button
            onClick={handleThemeToggle}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            ) : (
              <Moon className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            )}
          </button>
          {/* Ev. en användar-avatar el. profilmeny här */}
        </div>
      </header>

      {/* MAIN CONTAINER: SIDEBAR + CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          className="hidden md:flex"
        />

        {/* SIDEBAR i mobil-läge (overlay). En “backdrop” om du vill. */}
        <div
          className={`fixed inset-0 z-20 bg-black bg-opacity-40 transition-opacity md:hidden ${
            sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setSidebarOpen(false)}
        ></div>
        <div
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 transform transition-transform md:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto focus:outline-none p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* FOOTER (valfritt) */}
      <footer className="bg-white dark:bg-gray-800 text-center py-3 shadow-inner">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © 2023 MyCompany. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default ModernLayout;
