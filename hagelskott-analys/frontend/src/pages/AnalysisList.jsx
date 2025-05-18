import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Calendar,
  ArrowUpDown,
  ChevronRight,
  Loader2,
  Trash2
} from "lucide-react";

// Om du använder en card-komponent som i ditt exempel
import { Card, CardContent } from "@/components/ui/card";

/**
 * AnalysisList
 * ============ 
 * En lista över sparade hagelsvärmsanalyser i mer horisontellt snitt.
 * Visar info om "laddningen" (ammo), datum, träffar m.m.
 * Tillåter även radering av analyser direkt i listan.
 */
export default function AnalysisList() {
  // 1) States
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sök
  const [searchTerm, setSearchTerm] = useState("");

  // Filter
  const [filters, setFilters] = useState({
    dateRange: "all",
    gauge: "all",
    minHits: "",
    maxHits: ""
  });

  // Sortering
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });

  // 2) Hämta analyser från backend
  useEffect(() => {
    async function fetchAnalyses() {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token") || "";
        // Viktigt: Byt "/api/analysis" -> "/api/analysis/results" 
        // (eller endpoint du HAR i din backend)
        const resp = await fetch(
          `${import.meta.env.VITE_API_URL}/api/analysis/results`, 
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!resp.ok) {
          throw new Error("Kunde inte hämta analyser (felstatus)");
        }
        const data = await resp.json();

        // Sortera på datum nyaste först
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setAnalyses(data);
      } catch (err) {
        setError(err.message || "Ett oväntat fel uppstod.");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyses();
  }, []);

  // 3) Hantering för radering av analys
  async function handleDeleteAnalysis(analysisId) {
    if (!analysisId) return;
    const confirmRemove = window.confirm("Vill du verkligen ta bort denna analys?");
    if (!confirmRemove) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/api/analysis/results/${analysisId}`, 
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || `Kunde inte radera analys: ${resp.status}`);
      }

      // Ta bort lokalt
      setAnalyses((prev) => prev.filter((a) => a._id !== analysisId));
    } catch (err) {
      alert("Fel vid radering: " + err.message);
      console.error("[AnalysisList] handleDeleteAnalysis error:", err);
    } finally {
      setLoading(false);
    }
  }

  // 4) Sort-hantering
  function handleSort(key) {
    // Om man klickar på samma key igen => toggle asc/desc
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  }

  // 5) Filtrering & sortering
  function getFilteredAndSortedAnalyses() {
    let filtered = [...analyses];

    // Sök
    if (searchTerm.trim() !== "") {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((analysis) => {
        const shotgun = analysis.metadata?.shotgun || {};
        const ammo = analysis.metadata?.ammunition || {};
        const manufacturer = shotgun.manufacturer || "";
        const model = shotgun.model || "";
        const ammoType = ammo.type || "";
        // Ex: sök i manufacturer, model, ammoType
        return (
          manufacturer.toLowerCase().includes(lower) ||
          model.toLowerCase().includes(lower) ||
          ammoType.toLowerCase().includes(lower)
        );
      });
    }

    // Datumfilter
    if (filters.dateRange !== "all") {
      const now = new Date();
      const cutoff = new Date(now);
      switch (filters.dateRange) {
        case "week":
          cutoff.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoff.setMonth(now.getMonth() - 1);
          break;
        case "year":
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }
      filtered = filtered.filter(
        (a) => new Date(a.created_at) >= cutoff
      );
    }

    // Kaliber
    if (filters.gauge !== "all") {
      filtered = filtered.filter(
        (a) => a.metadata?.shotgun?.gauge === filters.gauge
      );
    }

    // Min/Max träffar
    if (filters.minHits.trim() !== "") {
      const min = parseInt(filters.minHits, 10) || 0;
      filtered = filtered.filter(
        (a) => a.analysis_results?.hit_count >= min
      );
    }
    if (filters.maxHits.trim() !== "") {
      const max = parseInt(filters.maxHits, 10) || 999999;
      filtered = filtered.filter(
        (a) => a.analysis_results?.hit_count <= max
      );
    }

    // Sortera
    filtered.sort((a, b) => {
      let comp = 0;
      switch (sortConfig.key) {
        case "date":
          comp = new Date(b.created_at) - new Date(a.created_at);
          break;
        case "hits":
          comp =
            (a.analysis_results?.hit_count || 0) -
            (b.analysis_results?.hit_count || 0);
          break;
        case "pattern":
          comp =
            (a.analysis_results?.pattern_density || 0) -
            (b.analysis_results?.pattern_density || 0);
          break;
        default:
          comp = 0;
      }
      return sortConfig.direction === "desc" ? comp : -comp;
    });

    return filtered;
  }

  const finalList = getFilteredAndSortedAnalyses();

  // 6) Formatering av datum
  function formatDate(dateString) {
    if (!dateString) return "Okänd tid";
    return new Date(dateString).toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  // 7) Render
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Toppsektion */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-50">Analyshistorik</h1>
        <Link
          to="/upload"
          className="
            px-4 py-2 bg-red-600 text-white rounded-md 
            hover:bg-red-700 transition-colors
            focus:outline-none focus:ring-2 
            focus:ring-offset-2 focus:ring-red-500
          "
        >
          Ny analys
        </Link>
      </div>

      {/* Sök & filter-kort */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sökfält */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Sök (t.ex. 'handload', 'Benelli')..."
                className="
                  w-full pl-9 pr-3 py-2 rounded-md border 
                  border-gray-300 focus:border-green-500 focus:ring-1 
                  focus:ring-green-500 transition-colors
                "
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Datumfilter */}
            <select
              className="
                rounded-md border border-gray-300 py-2 
                focus:border-green-500 focus:ring-green-500
              "
              value={filters.dateRange}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateRange: e.target.value }))
              }
            >
              <option value="all">Alla datum</option>
              <option value="week">Senaste veckan</option>
              <option value="month">Senaste månaden</option>
              <option value="year">Senaste året</option>
            </select>

            {/* Kaliber-filter */}
            <select
              className="
                rounded-md border border-gray-300 py-2 
                focus:border-green-500 focus:ring-green-500
              "
              value={filters.gauge}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, gauge: e.target.value }))
              }
            >
              <option value="all">Alla kalibrar</option>
              <option value="12">12 ga</option>
              <option value="16">16 ga</option>
              <option value="20">20 ga</option>
              <option value="28">28 ga</option>
              <option value="410">.410</option>
            </select>

            {/* Min/Max träffar */}
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min träffar"
                className="
                  w-1/2 rounded-md border border-gray-300 
                  py-2 px-2 focus:border-green-500 focus:ring-green-500
                "
                value={filters.minHits}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, minHits: e.target.value }))
                }
              />
              <input
                type="number"
                placeholder="Max träffar"
                className="
                  w-1/2 rounded-md border border-gray-300 
                  py-2 px-2 focus:border-green-500 focus:ring-green-500
                "
                value={filters.maxHits}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, maxHits: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visar listan eller fel/loading */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      ) : finalList.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            Inga analyser matchade dina filter
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Sorteringsknappar */}
          <div className="flex gap-4 items-center text-sm mb-2">
            {/* Datum */}
            <button
              onClick={() => handleSort("date")}
              className="flex items-center gap-1 text-gray-200 hover:text-red-400"
            >
              <Calendar className="h-4 w-4" />
              <span>Datum</span>
              {sortConfig.key === "date" && <ArrowUpDown className="h-4 w-4" />}
            </button>

            {/* Träffar */}
            <button
              onClick={() => handleSort("hits")}
              className="flex items-center gap-1 text-gray-200 hover:text-red-400"
            >
              <span>Träffar</span>
              {sortConfig.key === "hits" && <ArrowUpDown className="h-4 w-4" />}
            </button>

            {/* Täckning */}
            <button
              onClick={() => handleSort("pattern")}
              className="flex items-center gap-1 text-gray-200 hover:text-red-400"
            >
              <span>Täckning</span>
              {sortConfig.key === "pattern" && <ArrowUpDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Lista av analyser – layout i flex-rader */}
          {finalList.map((analysis) => {
            const shotgun = analysis.metadata?.shotgun || {};
            const ammo = analysis.metadata?.ammunition || {};
            const results = analysis.analysis_results || {};
            const hitCount = results.hit_count || 0;
            const density = results.pattern_density || 0;
            const loadType = ammo.type === "factory" ? "Fabrik" : "Handladdning";

            // Ge en "titel" utifrån ammunitionstyp + ev. manufacturer
            const loadTitle = ammo.manufacturer
              ? `${loadType} - ${ammo.manufacturer}`
              : loadType;

            return (
              <div
                key={analysis._id}
                className="flex items-center gap-4 bg-military-800 p-4 rounded shadow-sm hover:shadow-md transition-shadow border border-military-600"
              >
                {/* Länka in i mitten: Info-del (namn, kaliber, datum) */}
                <Link
                  to={`/analysis/${analysis._id}`}
                  className="flex-1 flex items-center gap-4"
                >
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-gray-100">
                      {loadTitle}
                    </span>
                    <span className="text-sm text-gray-100">
                      Kaliber: {shotgun.gauge ?? "??"} • {shotgun.manufacturer ?? ""} {shotgun.model ?? ""}
                    </span>
                    <span className="text-sm text-gray-100">
                      {formatDate(analysis.created_at)}
                    </span>
                  </div>

                  {/* Höger info: hits + density */}
                  <div className="ml-auto text-right">
                    <p className="font-semibold text-gray-700">{hitCount} träffar</p>
                    <p className="text-sm text-gray-500">
                      {density.toFixed(1)}% täckning
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>

                {/* Radera-knapp */}
                <button
                  onClick={() => handleDeleteAnalysis(analysis._id)}
                  title="Radera analys"
                  className="
                    flex-shrink-0 p-2 rounded hover:bg-red-100 
                    focus:outline-none focus:ring-1 focus:ring-red-400
                  "
                >
                  <Trash2 className="h-5 w-5 text-red-600" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
