import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Search, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import RecoilAnalysis from "@/components/analysis/RecoilAnalysis";
import { en } from '@/translations/en';
import { sv } from '@/translations/sv';

export default function RecoilAnalysisSelectionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loads, setLoads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoad, setSelectedLoad] = useState(null);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;

  useEffect(() => {
    const fetchLoads = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/loads/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Could not fetch loads");
        }

        const data = await response.json();
        setLoads(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLoads();
  }, []);

  const filteredLoads = loads.filter((load) =>
    load.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLoadSelect = (loadId) => {
    navigate(`/analysis/recoil/${loadId}`);
  };

  const extractLoadData = (load) => {
    if (!load) return null;
    
    let shotWeight = 0;
    let powderWeight = 0;

    // Check first in shotLoads for shot weight
    if (load.shotLoads && load.shotLoads.length > 0) {
      shotWeight = load.shotLoads.reduce((total, l) => total + (l.weight_g || 0), 0);
    }
    // Check in powderCharge for powder weight
    if (load.powderCharge) {
      powderWeight = load.powderCharge.weight_g || 0;
    }
    
    if (shotWeight === 0 || powderWeight === 0) return null;

    return {
      shotWeight: shotWeight,
      powderWeight: powderWeight
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-900 rounded text-red-200 mb-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t.recoilAnalysis.title}</h1>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-military-700 hover:bg-military-600 px-3 py-2 rounded text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.navigation.back}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search loads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-military-800 border-military-600 text-gray-100"
            />
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4">
            {filteredLoads.map((load) => (
              <div
                key={load._id}
                onClick={() => handleLoadSelect(load._id)}
                className={`bg-military-800 p-4 rounded-lg border border-military-600 hover:bg-military-700 cursor-pointer transition-colors ${
                  selectedLoad?._id === load._id ? "ring-2 ring-green-500" : ""
                }`}
              >
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  {load.name || "Unnamed load"}
                </h3>
                <div className="text-sm text-gray-300">
                  <p>Gauge: {load.gauge || load.caliber}</p>
                  {load.shot_weight && (
                    <p>Shot weight: {load.shot_weight}g</p>
                  )}
                  {load.powder_weight && (
                    <p>Powder weight: {load.powder_weight}g</p>
                  )}
                </div>
              </div>
            ))}

            {filteredLoads.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p>No loads found. Create a load first to analyze recoil.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          {selectedLoad ? (
            <RecoilAnalysis loadData={extractLoadData(selectedLoad)} />
          ) : (
            <Alert className="bg-military-700 border-military-600">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select a load from the list to analyze its recoil
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
} 