// Fil: PenetrationTestPage.jsx
// ============================
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";

import PenetrationChart from "./PenetrationChart";

import {
  computePenetrationShots,
  getAllLethalDistances,
  yardToMeter,
  ftLbsToJoule
} from "./penetrationUtils";

import { getPelletCount } from "@/utils/shotCalculator";
import { getPenetrationData } from "@/services/loadsService";
// shotCalculator => beräknar pellets ~ ex. baserat på densitet, storlek, grams

export default function PenetrationTestPage() {
  const navigate = useNavigate();
  const { loadId } = useParams();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;

  // State för laddningar
  const [loads, setLoads] = useState([]);
  const [selectedLoadId, setSelectedLoadId] = useState(loadId || "");
  const [selectedLoad, setSelectedLoad] = useState(null);

  // 1) State
  const [muzzle, setMuzzle] = useState("1300");
  const [shotSize, setShotSize] = useState("4");
  const [shotType, setShotType] = useState("steel");
  const [shotLoad, setShotLoad] = useState(28);
  const [pelletCount, setPelletCount] = useState(0);
  const [useMetric, setUseMetric] = useState(false);
  const [visibleLines, setVisibleLines] = useState({
    penetration: true,
    velocity: true,
    energy: false,
  });

  // Data
  const [dataPoints, setDataPoints] = useState([]);
  const [lethalObj, setLethalObj] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Hämta alla laddningar
  useEffect(() => {
    const fetchLoads = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/loads`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch loads");
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

  // 2. När loadId eller loads ändras, uppdatera selectedLoad
  useEffect(() => {
    if (selectedLoadId && loads.length > 0) {
      const load = loads.find(l => l._id === selectedLoadId);
      if (load) {
        setSelectedLoad(load);
        // Uppdatera formuläret med laddningens data
        setMuzzle(load.muzzleVelocity?.toString() || "1300");
        setShotSize(load.shotSize || "4");
        setShotType(load.shotType || "steel");
        setShotLoad(load.shotWeight || 28);
      }
    }
  }, [selectedLoadId, loads]);

  // 2) Räkna pelletCount
  useEffect(() => {
    try {
      const cnt = getPelletCount(shotSize, shotType, shotLoad);
      setPelletCount(cnt);
    } catch {
      setPelletCount(0);
    }
  }, [shotSize, shotType, shotLoad]);

  // 3) Hämta / generera data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError("");
        setDataPoints([]);
        setLethalObj({});

        const params = {
          muzzle: parseFloat(muzzle) || 1300,
          shotSize: shotSize.trim(),
          shotType: shotType.trim().toLowerCase(),
          shotLoadGram: shotLoad,
        };

        const json = await getPenetrationData(params);
        const raw = json.dataPoints || [];

        const final = raw.map(row => {
            const e_j = row.energy_per_hagel_j ?? 0;
            const tot_j = e_j * pelletCount;
            return {
                ...row,
                total_energy_j: tot_j,
            };
        });

        setDataPoints(final);
        const lethal = getAllLethalDistances(final);
        setLethalObj(lethal);
      } catch(err) {
        console.error(err);
        setError(err.message || "Något gick fel");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [muzzle, shotSize, shotType, shotLoad, pelletCount]);

  // 4) Display
  function displayEnergy(value) {
    if(value<=0) return "0";
    return useMetric
      ? (ftLbsToJoule(value).toFixed(1) + " J")
      : (value.toFixed(1) + " ft-lbs");
  }

  if(loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-military-500"></div>
      </div>
    );
  }
  if(error) {
    return (
      <div className="p-4">
        <div className="bg-red-500 text-white p-4 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Titel + Tillbaka */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t.penetrationAnalysis.title}</h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-military-700 hover:bg-military-600 px-3 py-2 rounded"
        >
          {t.navigation.back}
        </button>
      </div>

      {/* Laddningsväljare */}
      <div className="bg-military-700 p-4 rounded mb-4">
        <h2 className="text-lg font-semibold mb-3">{t.penetrationAnalysis.loadSelector.title}</h2>
        <select 
          value={selectedLoadId} 
          onChange={(e) => {
            setSelectedLoadId(e.target.value);
            navigate(`/penetration-test/${e.target.value}`, { replace: true });
          }}
          className="w-full bg-military-800 border border-military-600 rounded px-3 py-2 text-sm"
        >
          <option value="">{t.penetrationAnalysis.loadSelector.placeholder}</option>
          {loads.map(load => (
            <option key={load._id} value={load._id}>
              {load.name}
            </option>
          ))}
        </select>
      </div>

      {/* Filter */}
      <div className="bg-military-700 p-4 rounded mb-4">
        <h2 className="text-lg font-semibold mb-3">Parametrar</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Muzzle */}
          <div>
            <label className="block text-xs text-gray-300 mb-1">
              Muzzle Velocity: <span className="font-bold text-white">{muzzle} fps</span>
            </label>
            <input
              type="range"
              min="900"
              max="1700"
              step="10"
              className="w-full h-2 bg-military-600 rounded-lg appearance-none cursor-pointer"
              value={muzzle}
              onChange={(e) => setMuzzle(e.target.value)}
            />
          </div>
          {/* ShotSize */}
          <div>
            <label className="block text-xs text-gray-300 mb-1">
              Shot Size (#1,#2,#3,etc)
            </label>
            <input
              type="text"
              className="w-full bg-military-800 border border-military-600 rounded px-2 py-1 text-sm"
              value={shotSize}
              onChange={(e) => setShotSize(e.target.value)}
            />
          </div>
          {/* shotType */}
          <div>
            <label className="block text-xs text-gray-300 mb-1">
              Shot Type
            </label>
            <select
              className="w-full bg-military-800 border border-military-600 rounded px-2 py-1 text-sm"
              value={shotType}
              onChange={(e) => setShotType(e.target.value)}
            >
              <option value="lead">Bly</option>
              <option value="steel">Stål</option>
              <option value="tungsten">Tungsten</option>
              <option value="hevi">Hevi-Shot</option>
            </select>
          </div>
          {/* shotLoad */}
          <div>
            <label className="block text-xs text-gray-300 mb-1">
              ShotLoad (g)
            </label>
            <input
              type="number"
              className="w-full bg-military-800 border border-military-600 rounded px-2 py-1 text-sm"
              value={shotLoad}
              onChange={(e) => setShotLoad(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <label className="inline-flex items-center text-xs text-gray-300">
            <input
              type="checkbox"
              className="mr-2"
              checked={useMetric}
              onChange={(e) => setUseMetric(e.target.checked)}
            />
            Visa metrisk (SI)
          </label>
          <div className="text-sm text-gray-100">
            Antal hagel (ber): <strong>{pelletCount}</strong>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-300">
            <span className="font-semibold">Visa i graf:</span>
            {Object.keys(visibleLines).map((key) => (
                <label key={key} className="inline-flex items-center">
                    <input
                        type="checkbox"
                        className="mr-1"
                        checked={visibleLines[key]}
                        onChange={() => setVisibleLines(prev => ({...prev, [key]: !prev[key]}))}
                    />
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
            ))}
        </div>
      </div>

      {/* Dödlig-avstånd */}
      {Object.keys(lethalObj).length>0 && (
        <div className="bg-military-700 p-2 rounded mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">{t.penetrationAnalysis.lethalDistances.title}:</span>
          <span className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-200">
            {t.penetrationAnalysis.lethalDistances.duck} { (useMetric
              ? yardToMeter(lethalObj.duck||0).toFixed(0)+" m"
              : (lethalObj.duck||0).toFixed(0)+" yd") }
          </span>
          <span className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-200">
            {t.penetrationAnalysis.lethalDistances.roe} { (useMetric
              ? yardToMeter(lethalObj.roe||0).toFixed(0)+" m"
              : (lethalObj.roe||0).toFixed(0)+" yd") }
          </span>
          <span className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-200">
            {t.penetrationAnalysis.lethalDistances.boar} { (useMetric
              ? yardToMeter(lethalObj.boar||0).toFixed(0)+" m"
              : (lethalObj.boar||0).toFixed(0)+" yd") }
          </span>
        </div>
      )}

      {/* Penetrationschart */}
      <div className="bg-military-700 p-4 rounded">
        <h2 className="text-lg font-semibold mb-3">{t.penetrationAnalysis.data.title}</h2>
        <PenetrationChart
          dataPoints={dataPoints}
          lethalObj={lethalObj}
          useMetric={useMetric}
          visibleLines={visibleLines}
        />
      </div>

      {/* Info-ruta */}
      <div className="bg-military-700 p-4 rounded">
        <h2 className="text-lg font-semibold mb-3">{t.penetrationAnalysis.info.title}</h2>
        <div className="space-y-2 text-sm text-gray-300">
          <p>{t.penetrationAnalysis.info.description1}</p>
          <p>{t.penetrationAnalysis.info.description2}</p>
          <p>{t.penetrationAnalysis.info.description3}</p>
          <p className="text-yellow-400 mt-4">{t.penetrationAnalysis.info.warning}</p>
        </div>
      </div>
    </div>
  );
}
