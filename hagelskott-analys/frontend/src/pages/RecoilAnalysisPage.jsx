import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RecoilAnalysis from "@/components/analysis/RecoilAnalysis";

export default function RecoilAnalysisPage() {
  const { loadId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadData, setLoadData] = useState(null);

  useEffect(() => {
    const fetchLoadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/loads/${loadId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Kunde inte hämta laddningsdata");
        }

        const data = await response.json();
        
        // Extrahera relevant data för rekylberäkning
        let shotWeight = 0;
        let powderWeight = 0;

        // Kolla först i shotLoads för hagelvikt
        if (data.shotLoads && data.shotLoads.length > 0) {
          shotWeight = data.shotLoads.reduce((total, load) => total + (load.weight_g || 0), 0);
        }
        // Kolla i powderCharge för krutvikt
        if (data.powderCharge) {
          powderWeight = data.powderCharge;
        }
        
        if (shotWeight === 0 || powderWeight === 0) {
          throw new Error("Laddningen saknar nödvändiga komponenter (hagel/krut)");
        }

        setLoadData({
          name: data.name,
          description: data.description,
          shotWeight: shotWeight,
          powderWeight: powderWeight,
          created: data.created_at,
          updated: data.updated_at
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (loadId) {
      fetchLoadData();
    }
  }, [loadId]);

  const handleBack = () => {
    navigate("/load-list");
  };

  return (
    <div className="container mx-auto p-6">
      {/* Titel + Tillbaka */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Rekylanalys</h1>
          {loadData && (
            <p className="text-sm text-gray-400 mt-1">
              {loadData.name || "Namnlös laddning"}
            </p>
          )}
        </div>
        <button
          onClick={handleBack}
          className="bg-military-700 hover:bg-military-600 px-3 py-2 rounded text-gray-50"
        >
          <ArrowLeft className="h-4 w-4 inline mr-2" />
          Tillbaka till laddningar
        </button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : loadData ? (
        <div className="bg-military-800 p-4 rounded-lg border border-military-600">
          {/* Laddningsinformation */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">
              Laddningsinformation
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {loadData.components?.map((comp) => (
                <div key={comp.type} className="bg-military-700 p-3 rounded">
                  <p className="text-xs text-gray-400">{comp.type}</p>
                  <p className="text-sm font-medium text-gray-100">{comp.name}</p>
                  {comp.weight && (
                    <p className="text-xs text-gray-300">{comp.weight} gram</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rekylanalys */}
          <RecoilAnalysis loadData={loadData} />
        </div>
      ) : null}
    </div>
  );
} 