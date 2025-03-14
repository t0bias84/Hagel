// Fil: LoadListPage.jsx
import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [loading, setLoading] = useState(true);
  const [loads, setLoads] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // UI-state
  const [activeTab, setActiveTab] = useState("mine"); // "mine", "favorites", "official", "all"
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [sortField, setSortField] = useState("");
  const [allTags, setAllTags] = useState([]);

  // Om du har ett riktigt userId i localStorage t.ex.:
  // const currentUserId = localStorage.getItem("userId");
  // men här kör vi en dummy:
  const currentUserId = "currentUser";

  const navigate = useNavigate();

  // 1) Hämta laddningar från /api/loads
  useEffect(() => {
    async function fetchLoads() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const token = localStorage.getItem("token");
        const resp = await fetch("http://localhost:8000/api/loads", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Kollar auth
          },
        });
        if (!resp.ok) {
          throw new Error("Kunde inte hämta laddningar.");
        }
        const data = await resp.json();

        // Samla unika taggar (om du använder "ld.source" som tag-lista)
        const tagSet = new Set();
        data.forEach((ld) => {
          if (ld.source) {
            ld.source.split(",").forEach((tg) => tagSet.add(tg.trim()));
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
  function getFilteredLoads() {
    let filtered = [...loads];

    // Flik: mine / favorites / official / all
    filtered = filtered.filter((ld) => {
      if (activeTab === "mine") {
        // Dina egna => ownerId === currentUserId
        return ld.ownerId === currentUserId && !ld.isOfficial;
      } else if (activeTab === "favorites") {
        return ld.isFavorite === true;
      } else if (activeTab === "official") {
        return ld.isOfficial === true;
      } else {
        // all
        return true;
      }
    });

    // Tagg-filter
    if (tagFilter.trim().length > 0) {
      filtered = filtered.filter((ld) => {
        const tags = ld.source ? ld.source.toLowerCase().split(",") : [];
        return tags.map((x) => x.trim()).includes(tagFilter.toLowerCase());
      });
    }

    // Sortering
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

    return filtered;
  }

  const finalLoads = getFilteredLoads();

  // 3) Radera laddning
  const handleDelete = async (loadId) => {
    if (!loadId) {
      setError("Ogiltigt laddnings-ID (saknas).");
      return;
    }
    const ok = window.confirm("Är du säker på att du vill ta bort denna laddning?");
    if (!ok) return;

    try {
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");
      const resp = await fetch(`http://localhost:8000/api/loads/${loadId}`, {
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

  // 5) Dela (fiktivt)
  const handleShare = (ld) => {
    alert(`Dela laddning: ${ld.name}`);
  };

  // 6) PatternAnalysis (fiktivt)
  const handlePatternAnalysis = (ld) => {
    alert(`Skickar "${ld.name}" till Pattern Analysis (fiktivt).`);
  };

  // 7) Penetration => navigera till /penetration-test/<loadId>
  //    (Sen i PenetrationTestPage kan du anropa t.ex. /api/loads/{loadId}/penetration_flex)
  const handlePenetrationAnalysis = (ld) => {
    // Du kan ta bort alerten om du vill
    alert(`Skickar "${ld.name}" till Penetration Analysis (fiktivt).`);
    navigate(`/penetration-test/${ld._id}`);
  };

  // 8) Forum (fiktivt)
  const handleForumPost = (ld) => {
    alert(`Skapar forumtråd om laddning: ${ld.name} (fiktivt).`);
  };

  // Hjälp-funktion för primer
  function getPrimerDisplay(ld) {
    if (ld.primerObject?.name) {
      return ld.primerObject.name;
    }
    if (ld.primerId && ld.primerId.startsWith("inHull:")) {
      return "Inbyggd primer";
    }
    return "(ej vald)";
  }

  return (
    <div className="p-4 max-w-6xl mx-auto text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Laddningar</h1>

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
        {["mine", "favorites", "official", "all"].map((tabKey) => {
          const label =
            tabKey === "mine"
              ? "Mina Laddningar"
              : tabKey === "favorites"
              ? "Favoriter"
              : tabKey === "official"
              ? "Officiella"
              : "Alla Laddningar";
          return (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`px-4 py-2 rounded ${
                activeTab === tabKey ? "bg-green-700" : "bg-military-700"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Filter + Sort */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Tag-filter */}
        <div className="relative">
          <button
            onClick={() => setShowTagDropdown(!showTagDropdown)}
            className="inline-flex items-center px-3 py-2 rounded bg-military-700 hover:bg-military-600 transition-colors"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span>{tagFilter ? `Tag: ${tagFilter}` : "Filtrera på tagg"}</span>
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
                  <li className="px-3 py-1 text-sm text-gray-500">
                    Inga taggar
                  </li>
                )}
                {/* “Ingen filter” */}
                <li
                  className="px-3 py-1 hover:bg-military-700 cursor-pointer text-sm text-red-400"
                  onClick={() => {
                    setTagFilter("");
                    setShowTagDropdown(false);
                  }}
                >
                  (Rensa taggfilter)
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm">Sortera på:</span>
          <select
            className="rounded bg-military-700 border-military-600 px-2 py-1 text-sm"
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
          >
            <option value="">Ingen sortering</option>
            <option value="hull">Hylsa</option>
            <option value="primer">Tändhatt</option>
            <option value="powder">Krutsort</option>
            <option value="wad">Förladdning</option>
            <option value="shotMaterial">Hageltyp</option>
          </select>
        </div>
      </div>

      {/* Lista / Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-lg">Laddar...</span>
        </div>
      ) : finalLoads.length === 0 ? (
        <p className="text-gray-400 mt-4">Inga laddningar att visa.</p>
      ) : (
        <div className="space-y-3">
          {finalLoads.map((ld) => {
            // Style
            let cardClasses = "p-3 rounded flex items-center justify-between";
            if (ld.isOfficial) {
              cardClasses += " border-2 border-yellow-600 bg-military-800";
            } else if (ld.isFavorite) {
              cardClasses += " bg-green-800";
            } else {
              cardClasses += " bg-military-800";
            }

            // Hämta expansions-data
            const hullTxt = ld.hullObject?.name || "(ej vald)";

            // Bestäm primer-text via hjälpfunktion
            const primerTxt = getPrimerDisplay(ld);

            const powderTxt = ld.powderObject?.name || "(ej vald)";
            const wadTxt = ld.wadObject?.name || "(ej vald)";

            // Shot / slug
            let shotDesc = "(ej hagel)";
            if (ld.shotLoads && ld.shotLoads.length > 0) {
              const s = ld.shotLoads[0];
              shotDesc = `${s.material} ${s.weight_g} g`;
              if (s.shotSize) shotDesc += ` (${s.shotSize})`;
            }
            if (ld.slug) {
              // Om den råkar ha en slug definierad
              shotDesc = `Slug: ${ld.slug.name || "(namnlös)"} ${
                ld.slug.weight_g || 28
              }g`;
            }

            // Taggar
            const tagArr = ld.source
              ? ld.source.split(",").map((x) => x.trim())
              : [];

            return (
              <div key={ld._id} className={cardClasses}>
                <div className="flex-1 mr-4">
                  <h2 className="font-semibold text-lg">{ld.name}</h2>
                  <p className="text-xs text-gray-300 mt-1">
                    <span className="mr-2">
                      <strong>Hylsa:</strong> {hullTxt}
                    </span>
                    <span className="mr-2">
                      <strong>Tändhatt:</strong> {primerTxt}
                    </span>
                    <span className="mr-2">
                      <strong>Krut:</strong> {powderTxt}
                      {ld.powderCharge ? ` (${ld.powderCharge}g)` : ""}
                    </span>
                    <span className="mr-2">
                      <strong>Förladd:</strong> {wadTxt}
                    </span>
                    <span className="mr-2">
                      <strong>Hagel/Slug:</strong> {shotDesc}
                    </span>
                  </p>
                  {/* Taggar */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tagArr.map((tg, idx) => (
                      <span
                        key={idx}
                        className="inline-block bg-gray-700 text-xs text-gray-200 px-2 py-1 rounded"
                      >
                        {tg}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Knappar */}
                <div className="flex items-center gap-2">
                  {/* Dela */}
                  <button
                    onClick={() => handleShare(ld)}
                    className="p-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                    title="Dela laddning"
                  >
                    <Share2 className="h-4 w-4 text-white" />
                  </button>

                  {/* PatternAnalysis (fiktivt) */}
                  <button
                    onClick={() => handlePatternAnalysis(ld)}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
                    title="Pattern Analysis"
                  >
                    <ArrowRightCircle className="h-4 w-4 text-white" />
                  </button>

                  {/* Penetration => navigera */}
                  <button
                    onClick={() => handlePenetrationAnalysis(ld)}
                    className="p-2 bg-orange-600 hover:bg-orange-500 rounded transition-colors"
                    title="Penetration Analysis"
                  >
                    <ArrowUpCircle className="h-4 w-4 text-white" />
                  </button>

                  {/* Forum */}
                  <button
                    onClick={() => handleForumPost(ld)}
                    className="p-2 bg-purple-600 hover:bg-purple-500 rounded transition-colors"
                    title="Posta i forum"
                  >
                    <MessageSquarePlus className="h-4 w-4 text-white" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(ld._id)}
                    className="p-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                    title="Redigera laddning"
                  >
                    <Edit3 className="h-4 w-4 text-white" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(ld._id)}
                    className="p-2 bg-red-600 hover:bg-red-500 rounded transition-colors"
                    title="Radera laddning"
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
