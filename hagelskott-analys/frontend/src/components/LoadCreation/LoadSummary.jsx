import React, { useState } from "react";
import { Loader2, Save, ChevronRight, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * LoadSummary
 * ===========
 * Visar en sammanfattning av en hagelladdning (eller kul-laddning om du så vill)
 * samt möjliggör spar-funktionalitet + eventuell pattern analysis för hagel.
 *
 * Props:
 *  - components: array av komponenter (primer, powder, wad, shot m.m.)
 *  - caliber: vald kaliber
 *  - shellLength: vald hylslängd (ex. 70mm, 76mm)
 *  - onSave: asynk funk. som tar emot hela laddningen och returnerar
 *            det sparade objektet (inkl. ID)
 *  - disabled: bool som anger om spar-knappen ska vara inaktiv
 */
const LoadSummary = ({ components, caliber, shellLength, onSave, disabled }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [loadData, setLoadData] = useState({
    name: "",
    purpose: "",
    notes: "",
    analysisRequested: false,
    patternAnalysisSettings: {
      distance: 40,          // Avstånd i meter
      targetType: "standard", 
      measurementUnit: "metric", 
    },
  });

  /**
   * validateLoad()
   * --------------
   * Kontrollerar att nödvändiga fält är ifyllda innan man sparar.
   */
  const validateLoad = () => {
    // Måste finnas ett namn
    if (!loadData.name.trim()) {
      setError("Namn på laddning krävs");
      return false;
    }
    // Minst en komponent måste väljas
    if (!components || components.length === 0) {
      setError("Minst en komponent krävs");
      return false;
    }
    // Krav på vissa typpar av komponenter (ex. hagel-laddning)
    const requiredTypes = ["primer", "powder", "wad", "shot"];
    const missingTypes = requiredTypes.filter(
      (reqType) => !components.some((c) => c.type === reqType)
    );
    if (missingTypes.length > 0) {
      setError(`Saknar nödvändiga komponenter: ${missingTypes.join(", ")}`);
      return false;
    }

    return true;
  };

  /**
   * handleSave()
   * -----------
   * Försöker spara laddningen genom att anropa onSave (Async).
   * Om analysisRequested är true skickar vi en POST till t.ex. 
   * /api/analysis/request för att initiera pattern analysis.
   */
  const handleSave = async () => {
    // Validera innan vi sparar
    if (!validateLoad()) return;

    setLoading(true);
    setError(null);

    try {
      // Spara laddningen (vi förväntar oss att onSave returnerar laddningsobjekt inkl. ID)
      const savedLoad = await onSave({
        ...loadData,
        components,
        caliber,
        shellLength,
      });

      // Om användaren vill göra pattern analysis
      if (loadData.analysisRequested) {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:8000/api/analysis/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            loadId: savedLoad.id,
            settings: loadData.patternAnalysisSettings,
          }),
        });

        if (!response.ok) {
          throw new Error("Kunde inte initiera hagelsvärmsanalys");
        }
      }

      // Nollställ formuläret
      setLoadData({
        name: "",
        purpose: "",
        notes: "",
        analysisRequested: false,
        patternAnalysisSettings: {
          distance: 40,
          targetType: "standard",
          measurementUnit: "metric",
        },
      });
    } catch (err) {
      setError(err.message || "Ett okänt fel uppstod vid sparandet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Sammanfattning av laddning</h2>

      {/* Felmeddelande */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {/* Grundinfo: Namn, syfte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Namn på laddning */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Namn på laddning
            </label>
            <input
              type="text"
              value={loadData.name}
              onChange={(e) => setLoadData({ ...loadData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                         focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Duvjakt #1"
            />
          </div>

          {/* Syfte */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Syfte</label>
            <input
              type="text"
              value={loadData.purpose}
              onChange={(e) => setLoadData({ ...loadData, purpose: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                         focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Duvjakt"
            />
          </div>
        </div>

        {/* Visar valda komponenter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Komponenter</h3>
          <div className="space-y-2">
            {components.map((component, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-gray-50 
                           rounded-md text-sm text-gray-700"
              >
                <div>
                  <p className="font-medium">{component.name}</p>
                  <p className="text-xs text-gray-500">
                    {component.weight
                      ? `${component.weight} g`
                      : component.height
                      ? `${component.height} mm`
                      : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Valfritt: mät- och analysinställningar */}
        <div className="border-t pt-4">
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              checked={loadData.analysisRequested}
              onChange={(e) =>
                setLoadData((prev) => ({
                  ...prev,
                  analysisRequested: e.target.checked,
                }))
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Skicka till Pattern Analysis
            </span>
          </label>

          {loadData.analysisRequested && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Avstånd */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Avstånd (m)
                </label>
                <input
                  type="number"
                  value={loadData.patternAnalysisSettings.distance}
                  onChange={(e) =>
                    setLoadData((prev) => ({
                      ...prev,
                      patternAnalysisSettings: {
                        ...prev.patternAnalysisSettings,
                        distance: parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                             focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Måltyp */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Måltyp
                </label>
                <select
                  value={loadData.patternAnalysisSettings.targetType}
                  onChange={(e) =>
                    setLoadData((prev) => ({
                      ...prev,
                      patternAnalysisSettings: {
                        ...prev.patternAnalysisSettings,
                        targetType: e.target.value,
                      },
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                             focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="clay">Lerduvemål</option>
                  <option value="game">Viltmål</option>
                </select>
              </div>

              {/* Enhet */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Enhet
                </label>
                <select
                  value={loadData.patternAnalysisSettings.measurementUnit}
                  onChange={(e) =>
                    setLoadData((prev) => ({
                      ...prev,
                      patternAnalysisSettings: {
                        ...prev.patternAnalysisSettings,
                        measurementUnit: e.target.value,
                      },
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                             focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="metric">Metrisk (mm, cm, m)</option>
                  <option value="imperial">Imperial (inch, yard)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Anteckningar */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Anteckningar</label>
          <textarea
            rows={3}
            value={loadData.notes}
            onChange={(e) =>
              setLoadData((prev) => ({ ...prev, notes: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm
                       focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: Laddad i 20°C, test i lätt vind..."
          />
        </div>

        {/* Spara-knapp */}
        <button
          onClick={handleSave}
          disabled={disabled || loading}
          className={`w-full flex items-center justify-center px-4 py-2 border border-transparent 
                      rounded-md shadow-sm text-sm font-medium text-white 
                      ${
                        disabled || loading
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sparar...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Spara laddning
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LoadSummary;
