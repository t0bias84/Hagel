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
  Zap
} from "lucide-react";
import { useAuth } from "../../App"; // justera om du har AuthContext på annat ställe

export default function Sidebar({
  isOpen = true,
  onClose = () => {},
  className = ""
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // admin-check om du vill

  // Kolla om route är aktiv
  const isActive = (path) => location.pathname === path;

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
    onClose();
  };

  // Hjälpfunktion för navigering + stäng menyn i mobil-läge
  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  // "Skapa ny laddning" CTA-knapp
  const handleCreateLoad = () => {
    navigate("/load-creation");
    onClose();
  };

  // Exempel på navigerings-arrayer – Du bestämmer själv vilka endpoints/rutter du vill ha.
  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutGrid }
  ];

  // Här byter vi endast `path: "/analysis/penetration"` till `path: "/penetration-test"`
  const analysisItems = [
    { name: "Mönsteranalys", path: "/analysis", icon: BarChart2 },
    { name: "Penetrationsanalys", path: "/penetration-test", icon: Target },
    { name: "Rekylanalys", path: "/analysis/recoil", icon: Zap }
  ];

  const extraItems = [
    { name: "Visa laddningar", path: "/load-list", icon: Eye },
    { name: "Forum", path: "/forum", icon: MessageSquare },
    { name: "Quiz", path: "/quiz", icon: ClipboardCheck }
  ];

  const userItems = [
    { name: "Inställningar", path: "/settings", icon: Settings }
  ];

  return (
    <aside
      className={`
        flex flex-col w-64 h-full bg-gradient-to-b from-gray-200 to-gray-300 text-gray-800
        border-r border-gray-300 shadow-lg
        transition-transform duration-300 ease-in-out
        ${className}
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static
      `}
    >
      {/* === Här tar vi bort rubriken helt === */}
      {/* I stället lägger vi CTA-knappen "Skapa ny laddning" högst upp */}
      <div className="p-5 border-b border-gray-300 bg-gray-100">
        <button
          onClick={handleCreateLoad}
          className="
            w-full px-4 py-3 rounded-md
            bg-red-700 text-white font-semibold text-sm
            hover:bg-red-600 transition
            flex items-center justify-center gap-2
          "
        >
          <Plus className="w-5 h-5" />
          Skapa ny laddning
        </button>
      </div>

      {/* Innehåll med navigering */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {/* Huvud-länkar */}
        <div>
          <h2 className="mb-3 text-sm uppercase text-gray-500 tracking-wide">
            Huvud
          </h2>
          <nav>
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`
                        flex items-center w-full px-3 py-2 rounded-md transition-colors
                        ${
                          active
                            ? "bg-gray-400 text-gray-900 font-semibold"
                            : "hover:bg-gray-300 hover:text-gray-900"
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      <span className="text-sm">{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Analyser */}
        <div>
          <h2 className="mb-3 text-sm uppercase text-gray-500 tracking-wide">
            Analyser
          </h2>
          <nav>
            <ul className="space-y-2">
              {analysisItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`
                        flex items-center w-full px-3 py-2 rounded-md
                        ${
                          active
                            ? "bg-gray-400 text-gray-900 font-semibold"
                            : "hover:bg-gray-300 hover:text-gray-900"
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      <span className="text-sm">{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Övrigt */}
        <div>
          <h2 className="mb-3 text-sm uppercase text-gray-500 tracking-wide">
            Övrigt
          </h2>
          <nav>
            <ul className="space-y-2">
              {extraItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`
                        flex items-center w-full px-3 py-2 rounded-md transition-colors
                        ${
                          active
                            ? "bg-gray-400 text-gray-900 font-semibold"
                            : "hover:bg-gray-300 hover:text-gray-900"
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      <span className="text-sm">{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Nederdel: Inställningar & Logout */}
      <div className="p-4 border-t border-gray-300 bg-gray-100">
        <nav className="space-y-2">
          {userItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`
                  flex items-center w-full px-3 py-2 rounded-md
                  ${
                    active
                      ? "bg-gray-400 text-gray-900 font-semibold"
                      : "hover:bg-gray-300 hover:text-gray-900"
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="text-sm">{item.name}</span>
              </button>
            );
          })}

          <button
            onClick={handleLogout}
            className="
              flex items-center w-full px-3 py-2 rounded-md
              hover:bg-gray-300 hover:text-gray-900 transition-colors
            "
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="text-sm">Logga ut</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
