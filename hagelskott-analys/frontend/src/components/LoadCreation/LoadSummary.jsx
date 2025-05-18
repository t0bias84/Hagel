import React, { useState } from "react";
import { Loader2, Save, ChevronRight, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * LoadSummary
 * ===========
 * Shows a summary of a shotgun load (or rifle load if desired)
 * and enables save functionality + optional pattern analysis for shot.
 *
 * Props:
 *  - components: array of components (primer, powder, wad, shot etc.)
 *  - caliber: selected caliber
 *  - shellLength: selected shell length (e.g. 70mm, 76mm)
 *  - onSave: async function that receives the entire load and returns
 *            the saved object (including ID)
 *  - disabled: bool indicating if the save button should be inactive
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
      distance: 40,
      targetType: "standard",
      measurementUnit: "metric",
    },
  });

  /**
   * validateLoad()
   * --------------
   * Checks that necessary fields are filled in before saving.
   */
  const validateLoad = () => {
    if (!components || components.length === 0) {
      throw new Error("Load must contain at least one component");
    }
    if (!caliber) {
      throw new Error("Caliber must be specified");
    }
    if (!shellLength) {
      throw new Error("Shell length must be specified");
    }
  };

  /**
   * handleSave()
   * -----------
   * Attempts to save the load by calling onSave (Async).
   * If analysisRequested is true, we send a POST to e.g.
   * /api/analysis/request to initiate pattern analysis.
   */
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      validateLoad();

      const doc = {
        name: loadData.name || "Unnamed load",
        purpose: loadData.purpose || "",
        notes: loadData.notes || "",
        caliber,
        shellLength,
        components: components.map((c) => ({
          id: c._id,
          type: c.type,
          weight: c.weight || null,
          height: c.height || null,
        })),
      };

      const savedLoad = await onSave(doc);

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
          throw new Error("Could not initialize pattern analysis");
        }
      }

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
      setError(err.message || "An unknown error occurred while saving");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Load Summary</h2>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Load data form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Load name
          </label>
          <input
            type="text"
            value={loadData.name}
            onChange={(e) =>
              setLoadData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ex: Clay pigeons 24g"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Purpose/usage area
          </label>
          <input
            type="text"
            value={loadData.purpose}
            onChange={(e) =>
              setLoadData((prev) => ({ ...prev, purpose: e.target.value }))
            }
            placeholder="Ex: Clay pigeons, hunting, practice"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            value={loadData.notes}
            onChange={(e) =>
              setLoadData((prev) => ({ ...prev, notes: e.target.value }))
            }
            rows={4}
            placeholder="Additional notes..."
            className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Visar valda komponenter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Components</h3>
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
              Send to Pattern Analysis
            </span>
          </label>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={disabled || loading}
            className={`inline-flex items-center px-4 py-2 border border-transparent 
                       rounded-md shadow-sm text-sm font-medium text-white 
                       ${
                         disabled || loading
                           ? "bg-gray-400 cursor-not-allowed"
                           : "bg-blue-600 hover:bg-blue-700"
                       }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Saving...
              </>
            ) : (
              <>
                <Save className="-ml-1 mr-2 h-5 w-5" />
                Save load
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadSummary;
