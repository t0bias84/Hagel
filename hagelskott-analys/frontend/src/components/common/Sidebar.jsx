import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Settings,
  LogOut,
  BarChart2,
  MessageSquare,
  Eye,
  Plus,
  ClipboardCheck,
  Target,
  Zap,
  Users,
  Home,
  PlusCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";
import { Link } from "react-router-dom";
import Logo from './Logo';

export default function Sidebar({
  isOpen = true,
  onClose = () => {},
  className = ""
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;

  // Kolla om route är aktiv
  const isActive = (path) => location.pathname === path;

  // Logout
  const handleLogout = async () => {
    await logout();
    navigate("/login");
    onClose();
  };

  // Hjälpfunktion för navigering + stäng menyn i mobil-läge
  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  // Navigationslänkar
  const navigationItems = [
    { name: t.navigation?.home || "Home", path: "/", icon: Home },
    { name: t.navigation?.dashboard || "Dashboard", path: "/dashboard", icon: LayoutGrid }
  ];

  const analysisItems = [
    { name: t.navigation?.patternAnalysis || "Pattern Analysis", path: "/analysis", icon: BarChart2 },
    { name: t.navigation?.penetrationAnalysis || "Penetration Test", path: "/penetration-test", icon: Target },
    { name: t.navigation?.recoilAnalysis || "Recoil Analysis", path: "/analysis/recoil", icon: Zap }
  ];

  const extraItems = [
    { name: t.navigation?.loads || "My Loads", path: "/loads", icon: Eye },
    { name: t.navigation?.components || "Components", path: "/upload-components", icon: Plus },
    { name: t.navigation?.forum || "Forum", path: "/forum", icon: MessageSquare },
    { name: t.navigation?.quiz || "Quiz", path: "/quiz", icon: ClipboardCheck }
  ];

  const userItems = [
    { name: t.navigation?.settings || "Settings", path: "/settings", icon: Settings }
  ];

  // Lägg till admin-menyalternativ om användaren är admin
  const adminItems = user?.roles?.includes('admin') ? [
    { name: "User Management", path: "/admin/users", icon: Users }
  ] : [];

  return (
    <div className="h-screen bg-dark-900 text-white w-64 flex flex-col fixed left-0 top-0">
      <div className="p-4">
        <Logo className="w-32" />
      </div>

      <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
        {/* Skapa laddning-knapp */}
        <div className="pt-2">
          <Link
            to="/load-creation"
            className="flex items-center px-4 py-3 rounded-lg bg-dark-accent hover:bg-dark-accent/90 
                     text-white font-medium transition-all duration-200 transform hover:scale-[1.02]"
          >
            <PlusCircle className="w-5 h-5 mr-3" />
            <span>{t.navigation?.createLoad || "Create Load"}</span>
          </Link>
        </div>

        {/* Huvudnavigering */}
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`
                  flex items-center px-4 py-3 rounded-lg transition-colors duration-200
                  ${
                    location.pathname === item.path
                      ? "bg-dark-700 text-white"
                      : "text-white hover:bg-dark-800"
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Analyser */}
        <div className="space-y-2">
          <div className="px-4 text-xs font-semibold text-gray-400 uppercase">
            {t.navigation?.analysis || "Analysis"}
          </div>
          {analysisItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`
                  flex items-center px-4 py-3 rounded-lg transition-colors duration-200
                  ${
                    location.pathname === item.path
                      ? "bg-dark-700 text-white"
                      : "text-white hover:bg-dark-800"
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Extra funktioner */}
        <div className="space-y-2">
          <div className="px-4 text-xs font-semibold text-gray-400 uppercase">
            {t.navigation?.extra || "Extra"}
          </div>
          {extraItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`
                  flex items-center px-4 py-3 rounded-lg transition-colors duration-200
                  ${
                    location.pathname === item.path
                      ? "bg-dark-700 text-white"
                      : "text-white hover:bg-dark-800"
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Admin-sektion */}
        {adminItems.length > 0 && (
          <div className="space-y-2">
            <div className="px-4 text-xs font-semibold text-gray-400 uppercase">
              Admin
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`
                    flex items-center px-4 py-3 rounded-lg transition-colors duration-200
                    ${
                      location.pathname === item.path
                        ? "bg-dark-700 text-white"
                        : "text-white hover:bg-dark-800"
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Användarsektion */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-center mb-4">
          <div className="ml-3">
            <p className="text-white font-medium">{user?.username || "User"}</p>
            <p className="text-gray-200 text-sm">{user?.email || "exempel@email.com"}</p>
          </div>
        </div>

        {/* Inställningar och utloggning */}
        {userItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center px-4 py-2 text-white hover:bg-dark-800 rounded-lg transition-colors duration-200 mb-2"
            >
              <Icon className="w-5 h-5 mr-3" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-2 text-white hover:bg-dark-800 rounded-lg transition-colors duration-200"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>{t.auth?.logout || "Log out"}</span>
        </button>
      </div>
    </div>
  );
}
