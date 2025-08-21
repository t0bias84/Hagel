// Fil: LoadListPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Trash2,
  Edit3,
  CheckCircle,
  AlertCircle,
  Share2,
  MessageSquarePlus,
  ArrowRightCircle,
  ArrowUpCircle,
  Filter,
  Zap,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";
import LoadCard from "./LoadCard";

/**
 * LoadListPage
 * =============
 * - Hämtar laddningar (inkl. expansion av hullObject, primerObject, etc.)
 * - Visar i "kort" med flikar (Mina/Favoriter/Officiella/Alla)
 * - Filtrering via tagg
 * - Sortering på komponenttyp
 * - Knappar för att Radera, Redigera, Dela, Skicka till analyser, Forum
 */
export default function LoadListPage() {
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;
  
  const [loading, setLoading] = useState(true);
  const [loads, setLoads] = useState([]);
  const [filteredLoads, setFilteredLoads] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // UI-state
  const [activeTab, setActiveTab] = useState("all"); // "mine", "favorites", "official", "all", "top"
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [sortField, setSortField] = useState("");
  const [allTags, setAllTags] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGauge, setSelectedGauge] = useState("12"); // Default till kaliber 12

  // Kaliberlista
  const gauges = ["12", "16", "20", "28", ".410"];

  const navigate = useNavigate();

  // Hämta inloggad användare
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const token = localStorage.getItem("token");
        const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!resp.ok) throw new Error("Kunde inte hämta användarinformation");
        const userData = await resp.json();
        setCurrentUser(userData);
      } catch (err) {
        console.error("Fel vid hämtning av användarinfo:", err);
      }
    }
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const loadFavorites = () => {
      const savedFavorites = localStorage.getItem('favoriteLoads');
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
    };
    loadFavorites();
  }, []);

  const toggleFavorite = (loadId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(loadId)) {
        newFavorites.delete(loadId);
      } else {
        newFavorites.add(loadId);
      }
      localStorage.setItem('favoriteLoads', JSON.stringify([...newFavorites]));
      return newFavorites;
    });
  };

  // 1) Hämta laddningar från /api/loads
  useEffect(() => {
    async function fetchLoads() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const token = localStorage.getItem("token");
        const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/loads/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!resp.ok) {
          throw new Error("Kunde inte hämta laddningar.");
        }
        const data = await resp.json();

        // Samla unika taggar
        const tagSet = new Set();
        data.forEach((ld) => {
          if (ld.tags && Array.isArray(ld.tags)) {
            ld.tags.forEach((tag) => tagSet.add(tag));
          }
        });

        setAllTags(Array.from(tagSet));
        setLoads(data);
      } catch (err) {
        setError(err.message || "Ett oväntat fel inträffade.");
      } finally {
        setLoading(false);
      }
    }
    fetchLoads();
  }, []);

  // 2) Filtrering & Sortering
  const finalLoads = useMemo(() => {
    let filtered = [...loads];

    // Flik: mine / favorites / official / all / top
    filtered = filtered.filter((ld) => {
      if (activeTab === "mine") {
        return currentUser && ld.ownerId === currentUser.id && !ld.isOfficial;
      } else if (activeTab === "favorites") {
        return favorites.has(ld._id);
      } else if (activeTab === "official") {
        return ld.isOfficial === true;
      } else if (activeTab === "top") {
        return ld.gauge === selectedGauge;
      } else {
        return true;
      }
    });

    // Om vi är på topplistan, sortera efter antal upvotes
    if (activeTab === "top") {
      filtered.sort((a, b) => {
        const aVotes = (a.votes?.upvotes || 0) - (a.votes?.downvotes || 0);
        const bVotes = (b.votes?.upvotes || 0) - (b.votes?.downvotes || 0);
        return bVotes - aVotes;
      });
      // Begränsa till top 10
      filtered = filtered.slice(0, 10);
    }

    // Tagg-filter
    if (tagFilter.trim().length > 0) {
      filtered = filtered.filter((ld) => {
        return ld.tags && Array.isArray(ld.tags) && ld.tags.includes(tagFilter);
      });
    }

    // Övrig sortering (om inte topplista)
    if (activeTab !== "top" && sortField) {
      if (sortField === "hull") {
        filtered.sort((a, b) => {
          const aH = a.hullObject?.name || "";
          const bH = b.hullObject?.name || "";
          return aH.localeCompare(bH);
        });
      } else if (sortField === "primer") {
        filtered.sort((a, b) => {
          const aP = a.primerObject?.name || "";
          const bP = b.primerObject?.name || "";
          return aP.localeCompare(bP);
        });
      } else if (sortField === "powder") {
        filtered.sort((a, b) => {
          const aPow = a.powderObject?.name || "";
          const bPow = b.powderObject?.name || "";
          return aPow.localeCompare(bPow);
        });
      } else if (sortField === "wad") {
        filtered.sort((a, b) => {
          const aW = a.wadObject?.name || "";
          const bW = b.wadObject?.name || "";
          return aW.localeCompare(bW);
        });
      } else if (sortField === "shotMaterial") {
        const getMat = (ld) => ld.shotLoads?.[0]?.material || "";
        filtered.sort((a, b) => getMat(a).localeCompare(getMat(b)));
      }
    }

    return filtered;
  }, [loads, activeTab, currentUser, favorites, selectedGauge, tagFilter, sortField]);

  // 3) Radera laddning
  const handleDelete = async (loadId) => {
    if (!loadId) {
      setError("Ogiltigt laddnings-ID (saknas).");
      return;
    }
    const ok = window.confirm(t.loads.actions.deleteConfirm);
    if (!ok) return;

    try {
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/loads/${loadId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) {
        throw new Error("Kunde inte ta bort laddningen.");
      }
      // Uppdatera listan lokalt
      setLoads((prev) => prev.filter((ld) => ld._id !== loadId));
      setSuccess("Laddningen har tagits bort.");
    } catch (err) {
      setError(err.message);
    }
  };

  // 4) Redigera laddning
  const handleEdit = (loadId) => {
    if (!loadId) {
      setError("Ogiltigt laddnings-ID (saknas).");
      return;
    }
    navigate(`/load-creation/edit/${loadId}`);
  };

  // 5) Dela
  const handleShare = async (ld) => {
    try {
      const shareData = {
        title: `Hagelladdning: ${ld.name}`,
        text: `Kolla in denna hagelladdning: ${ld.name}\n${ld.description || ""}`,
        url: `${window.location.origin}/loads/${ld._id}`,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Kopiera länk till urklipp
        await navigator.clipboard.writeText(shareData.url);
        setSuccess("Länk kopierad till urklipp!");
      }
    } catch (err) {
      setError("Kunde inte dela laddningen: " + err.message);
    }
  };

  // 6) PatternAnalysis
  const handlePatternAnalysis = (ld) => {
    navigate(`/analysis/pattern/${ld._id}`);
  };

  // 7) Penetration
  const handlePenetrationAnalysis = (ld) => {
    navigate(`/analysis/penetration/${ld._id}`);
  };

  // 8) Forum
  const handleForumPost = (ld) => {
    navigate(`/forum/new?loadId=${ld._id}`);
  };

  // Lägg till handleRecoilAnalysis efter handlePenetrationAnalysis
  const handleRecoilAnalysis = (ld) => {
    navigate(`/analysis/recoil/${ld._id}`);
  };

  // Hjälp-funktion för primer
  function getPrimerDisplay(ld) {
    if (ld.primerObject?.name) {
      return ld.primerObject.name;
    }
    if (ld.primerId && ld.primerId.startsWith("inHull:")) {
      return t.loads.display.inbuiltPrimer;
    }
    return t.loads.display.noPrimer;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{t.loads.title}</h1>

      {/* Error / success */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default" className="mb-4">
          <CheckCircle className="h-5 w-5" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {["mine", "favorites", "official", "top", "all"].map((tabKey) => {
          const label =
            tabKey === "mine"
              ? t.loads.mine
              : tabKey === "favorites"
              ? t.loads.favorites
              : tabKey === "official"
              ? t.loads.official
              : tabKey === "top"
              ? t.loads.topList
              : t.loads.all;
          return (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`px-4 py-2 rounded ${
                activeTab === tabKey ? "bg-red-700 hover:bg-red-600" : "bg-military-700 hover:bg-military-600"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Kaliberval för topplistan */}
      {activeTab === "top" && (
        <div className="flex items-center gap-4 mb-4 p-4 bg-military-800 rounded">
          <span className="text-gray-300">{t.loads.selectGauge}</span>
          <div className="flex gap-2">
            {gauges.map((gauge) => (
              <button
                key={gauge}
                onClick={() => setSelectedGauge(gauge)}
                className={`px-3 py-1 rounded ${
                  selectedGauge === gauge 
                    ? "bg-red-700 text-white" 
                    : "bg-military-700 text-gray-300 hover:bg-military-600"
                }`}
              >
                {gauge}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter + Sort */}
      {activeTab !== "top" && (
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Tag-filter */}
          <div className="relative">
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="inline-flex items-center px-3 py-2 rounded bg-military-700 hover:bg-military-600 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              <span>{tagFilter ? `Tag: ${tagFilter}` : t.loads.filterByTag}</span>
            </button>
            {showTagDropdown && (
              <div className="absolute left-0 mt-1 w-48 bg-military-800 border border-military-600 rounded shadow-lg z-20">
                <ul className="max-h-48 overflow-auto">
                  {allTags.map((tg) => (
                    <li
                      key={tg}
                      className="px-3 py-1 hover:bg-military-700 cursor-pointer text-sm"
                      onClick={() => {
                        setTagFilter(tg);
                        setShowTagDropdown(false);
                      }}
                    >
                      {tg}
                    </li>
                  ))}
                  {allTags.length === 0 && (
                    <li className="px-3 py-1 text-sm text-gray-500">{t.common.noResults}</li>
                  )}
                  {/* "Ingen filter" */}
                  <li
                    className="px-3 py-1 hover:bg-military-700 cursor-pointer text-sm text-red-400"
                    onClick={() => {
                      setTagFilter("");
                      setShowTagDropdown(false);
                    }}
                  >
                    {t.loads.clearTagFilter}
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm">{t.loads.sortBy}</span>
            <select
              className="rounded bg-military-700 border-military-600 px-2 py-1 text-sm"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="">{t.loads.noSorting}</option>
              <option value="hull">{t.loads.components.hull}</option>
              <option value="primer">{t.loads.components.primer}</option>
              <option value="powder">{t.loads.components.powder}</option>
              <option value="wad">{t.loads.components.wad}</option>
              <option value="shotMaterial">{t.loads.components.shotType}</option>
            </select>
          </div>
        </div>
      )}

      {/* Lista / Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-lg">{t.common.loading}</span>
        </div>
      ) : finalLoads.length === 0 ? (
        <p className="text-gray-400 mt-4">
          {activeTab === "top" 
            ? `${t.loads.display.noLoadsForGauge} ${selectedGauge}`
            : t.loads.display.noLoads}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {finalLoads.map((load) => (
            <LoadCard
              key={load._id}
              load={load}
              currentUser={currentUser}
              isFavorite={favorites.has(load._id)}
              onToggleFavorite={toggleFavorite}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onShare={handleShare}
              onGoToForum={handleForumPost}
              onGoToPattern={handlePatternAnalysis}
              onGoToPenetration={handlePenetrationAnalysis}
              onGoToRecoil={handleRecoilAnalysis}
            />
          ))}
        </div>
      )}
    </div>
  );
}

