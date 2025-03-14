// Fil: PenetrationTestPage.jsx
// ============================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import PenetrationChart from "./PenetrationChart";

import {
  computePenetrationShots,
  getAllLethalDistances,
  yardToMeter,
  ftLbsToJoule
} from "./penetrationUtils";

import { getPelletCount } from "@/utils/shotCalculator"; 
// shotCalculator => beräknar pellets ~ ex. baserat på densitet, storlek, grams

export default function PenetrationTestPage() {
  const navigate = useNavigate();

  // 1) State
  const [muzzle, setMuzzle] = useState("1300");
  const [shotSize, setShotSize] = useState("4");
  const [shotType, setShotType] = useState("steel");
  const [shotLoad, setShotLoad] = useState(28);
  const [pelletCount, setPelletCount] = useState(0);
  const [useMetric, setUseMetric] = useState(false);

  // Data
  const [dataPoints, setDataPoints] = useState([]);
  const [lethalObj, setLethalObj] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sätt denna = false om du vill anropa servern.
  const LOCAL_MODE = true;

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

        if(LOCAL_MODE) {
          // Lokalt: generera
          const muzzle_fps = parseFloat(muzzle) || 1200;
          const arr = computePenetrationShots(
            muzzle_fps, shotSize, shotType,
            60, // maxDist yard
            2   // steg
          );
          // Nu addera energi för "per hagel" och "total"
          const final = arr.map(row => {
            // per hagel => row.energy_ftlbs
            // Här i koden har row.energy_ftlbs ~ i "approximateEnergy"
            const e = row.energy_ftlbs;
            const tot = e * pelletCount;
            return {
              ...row,
              energy_pellet_ftlbs: e,
              total_energy_ftlbs: tot
            };
          });
          setDataPoints(final);
          // lethal
          const lethal = getAllLethalDistances(final);
          setLethalObj(lethal);
        } else {
          // Avancerat: anropa server
          const muzzle_fps = parseFloat(muzzle) || 1300;
          const qs = new URLSearchParams({
            muzzle: muzzle_fps.toString(),
            shotSize: shotSize.trim(),
            shotType: shotType.trim().toLowerCase()
          });
          const token = localStorage.getItem("token") || "";
          const url = `/api/loads/penetration-flex-params?${qs.toString()}`;
          console.log("GET", url);

          const resp = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if(!resp.ok) {
            throw new Error("HTTP " + resp.status + " - kunde ej hämta ballistik");
          }
          const json = await resp.json();
          const raw = json.dataPoints || [];
          // Samma operation: append totalEnergy
          const final = raw.map(row => {
            const e = row.energy_ftlbs ?? 0;
            const tot = e * pelletCount;
            return {
              distance_yd: row.distance_yd,
              velocity_fps: row.velocity_fps,
              penetration_in: row.penetration_in,
              energy_pellet_ftlbs: e,
              total_energy_ftlbs: tot
            };
          });
          setDataPoints(final);
          const lethal = getAllLethalDistances(final);
          setLethalObj(lethal);
        }
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
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500"/>
        <span className="ml-2 text-gray-100">Laddar data...</span>
      </div>
    );
  }
  if(error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-5 w-5"/>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 text-gray-100">

      {/* Titel + Tillbaka */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Penetrationsanalys</h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-military-700 hover:bg-military-600 px-3 py-2 rounded"
        >
          Tillbaka
        </button>
      </div>

      {/* Filter */}
      <div className="bg-military-700 p-4 rounded mb-4">
        <h2 className="text-lg font-semibold mb-3">Välj parametrar</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Muzzle */}
          <div>
            <label className="block text-xs text-gray-300 mb-1">
              Muzzle (fps)
            </label>
            <input
              type="number"
              className="w-full bg-military-800 border border-military-600 rounded px-2 py-1 text-sm"
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
      </div>

      {/* Dödlig-avstånd */}
      {Object.keys(lethalObj).length>0 && (
        <div className="bg-military-700 p-2 rounded mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">Dödlig på avstånd (penetrationskrav):</span>
          <span className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-200">
            And/Duck { (useMetric
              ? yardToMeter(lethalObj.duck||0).toFixed(0)+" m"
              : (lethalObj.duck||0).toFixed(0)+" yd") }
          </span>
          <span className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-200">
            Rådjur { (useMetric
              ? yardToMeter(lethalObj.roe||0).toFixed(0)+" m"
              : (lethalObj.roe||0).toFixed(0)+" yd") }
          </span>
          <span className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-200">
            Vildsvin { (useMetric
              ? yardToMeter(lethalObj.boar||0).toFixed(0)+" m"
              : (lethalObj.boar||0).toFixed(0)+" yd") }
          </span>
        </div>
      )}

      {/* Chart + Table */}
      {dataPoints.length>0 ? (
        <div className="bg-military-800 p-3 rounded mb-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-2">
            Resultat (Per Hagel & Totalt)
          </h3>
          <div className="bg-military-900 p-4 rounded mb-4">
            <PenetrationChart
              data={dataPoints.map(dp => ({
                distance_yd: dp.distance_yd,
                velocity_fps: dp.velocity_fps,
                penetration_in: dp.penetration_in
              }))}
              isMetric={useMetric}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700 text-left">
                  <th className="p-2">Distans</th>
                  <th className="p-2">Hastighet</th>
                  <th className="p-2">Penetration</th>
                  <th className="p-2">Energi/hagel</th>
                  <th className="p-2">Tot. energi (laddn)</th>
                </tr>
              </thead>
              <tbody>
                {dataPoints.map((row, i) => {
                  const ePel = row.energy_pellet_ftlbs;
                  const eTot = row.total_energy_ftlbs;
                  const ePelStr = displayEnergy(ePel);
                  const eTotStr = displayEnergy(eTot);
                  // Skriv ut dist, velocity, pen
                  return (
                    <tr key={i} className="border-b border-military-600">
                      <td className="p-2">
                        { useMetric
                          ? yardToMeter(row.distance_yd).toFixed(1) + " m"
                          : row.distance_yd.toFixed(0) + " yd"
                        }
                      </td>
                      <td className="p-2">
                        { useMetric
                          ? (row.velocity_fps*0.3048).toFixed(0) + " m/s"
                          : row.velocity_fps.toFixed(0) + " fps"
                        }
                      </td>
                      <td className="p-2">
                        { useMetric
                          ? (row.penetration_in*25.4).toFixed(2)+" mm"
                          : row.penetration_in.toFixed(2)+" in"
                        }
                      </td>
                      <td className="p-2">{ ePelStr }</td>
                      <td className="p-2">{ eTotStr }</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-military-800 p-3 rounded">
          <p className="text-sm text-gray-300">
            Ingen penetration beräknad.
          </p>
        </div>
      )}

      {/* Info-ruta */}
      <div className="bg-gray-800 p-4 rounded text-sm border border-gray-700">
        <div className="flex items-center mb-2 text-yellow-400">
          <Info className="h-4 w-4 mr-1"/>
          <span className="font-semibold">Beräkningsmetod & Begränsningar</span>
        </div>
        <p className="text-gray-200 mb-2">
          Denna modul gör en enkel exponentiell avtagning av hastighet (v(d)) beroende på hagelstorlek.
          Penetrationsformeln är <em>ungefärlig</em> och baserar sig på diameter, hastighet och materialfaktor.
          Målet är att stål #3–#4 i ~1300 fps ska räcka för <strong>and på ~40 m</strong>, bly #1–#2 för
          <strong>rådjur ~30–40 m</strong>, etc.
        </p>
        <p className="text-gray-200">
          De forensiska källorna visar hur hagel tappar fart. I verkligheten påverkar även
          luftfuktighet, vinkel, hageldeformation m.m.
          <strong> Använd siffrorna som en grov vägledning, ej en exakt sanning.</strong>
        </p>
      </div>
    </div>
  );
}
