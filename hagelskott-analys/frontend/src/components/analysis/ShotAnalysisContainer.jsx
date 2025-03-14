import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Button from "@/components/common/Button";

import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  Download,
  Share2,
  Printer,
  Camera,
  Settings,
  Info,
  List as ListIcon,
  Eye,
  EyeOff
} from "lucide-react";

import ShotPatternVisualization from "./ShotPatternVisualization";
import ResultsDisplay from "./ResultsDisplay";
import DebugScript from "./DebugScript";

export default function ShotAnalysisContainer() {
  const { id: shotId } = useParams();
  const navigate = useNavigate();

  const [analysisData, setAnalysisData] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [fetchUrl, setFetchUrl] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toggles
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [showHitsList, setShowHitsList] = useState(false);
  const [hideHits, setHideHits] = useState(false);

  // Känslighet + pixPerCm
  const [sensitivity, setSensitivity] = useState(0.5);
  const [pixPerCm, setPixPerCm] = useState(1.0);

  const [refreshKey, setRefreshKey] = useState(0);
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const fetchAnalysisData = useCallback(async () => {
    if (!shotId) return;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Ingen auth-token (ej inloggad?).");
      }
      const url = `${baseUrl}/api/analysis/results/${shotId}`;
      setFetchUrl(url);
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(()=>{});
        throw new Error(errData?.detail || `HTTP-fel: ${resp.status}`);
      }
      const json = await resp.json();
      setRawData(json);
      const formatted = formatAnalysisData(json);
      setAnalysisData(formatted);
    } catch (err) {
      setError(err.message || "Oväntat fel.");
    } finally {
      setLoading(false);
    }
  },[shotId, baseUrl]);

  const formatAnalysisData = useCallback((raw)=>{
    if (!raw) return null;
    const results= raw.analysis_results;
    if (!results) {
      return {
        _id: raw._id||null,
        hits:[],
        ring:null,
        distribution:{},
        zoneAnalysis:{},
        clusters:[],
        closestHits:[],
        outerHits:[],
        densityData:[],
        imageUrl: raw.image_url||null,
        metadata:{
          shotgun: raw.metadata?.shotgun||{},
          ammunition: raw.metadata?.ammunition||{},
          conditions: raw.metadata?.conditions||{},
          distance: raw.metadata?.distance??"Okänt",
          patternDensity:0,
          hitCount:0,
          spread:0,
          patternEfficiency:0,
          timestamp: raw.created_at
        }
      };
    }
    const hits= results.individual_pellets||[];
    const ring= results.ring||null;
    const distribution= results.distribution||{};
    const zoneAnalysis= results.zone_analysis||{};
    const clusters= results.clusters||[];
    const closestHits= results.closest_hits||[];
    const outerHits= results.outer_hits||[];
    const densityData= results.density_zones||[]; 

    const meta={
      shotgun: raw.metadata?.shotgun||{},
      ammunition: raw.metadata?.ammunition||{},
      conditions: raw.metadata?.conditions||{},
      distance: raw.metadata?.distance??"Okänt",
      patternDensity: results.pattern_density??0,
      hitCount: results.hit_count??0,
      spread: results.spread??0,
      patternEfficiency: results.pattern_efficiency??0,
      timestamp: raw.created_at
    };
    // om du vill läsa image_path:
    let imageUrl = raw.image_url||null;
    if (!imageUrl && raw.image_path) {
      imageUrl= raw.image_path;
    }
    return {
      _id: raw._id||null,
      user_id: raw.user_id,
      hits,
      ring,
      distribution,
      zoneAnalysis,
      clusters,
      closestHits,
      outerHits,
      densityData,
      imageUrl,
      metadata: meta
    };
  },[]);

  useEffect(()=>{
    fetchAnalysisData();
  },[fetchAnalysisData, refreshKey]);

  const handleRefresh = ()=> setRefreshKey(prev=>prev+1);
  const handleBack = ()=> navigate("/analysis");
  const handleDownload = ()=> alert("Ej implementerat");
  const handleShare = ()=> alert("Ej implementerat");
  const handlePrint = ()=> window.print();
  const handleToggleAdvancedStats = ()=> setShowAdvancedStats(prev=>!prev);
  const toggleHitsList = ()=> setShowHitsList(prev=>!prev);
  const toggleHideHits= ()=> setHideHits(prev=>!prev);

  const handleUpdateHits = async(updatedHits)=>{
    if (!analysisData?._id) return;
    try{
      const token= localStorage.getItem("token");
      if (!token) {
        alert("Ingen auth-token => hits-uppdatering omöjlig.");
        return;
      }
      const oldHits= analysisData.hits||[];
      const oldSet= new Set(oldHits.map(h=>`${h.x},${h.y}`));
      const newSet= new Set(updatedHits.map(h=>`${h.x},${h.y}`));
      const addedHits= updatedHits.filter(h=> !oldSet.has(`${h.x},${h.y}`));
      const removedHits= oldHits.filter(h=> !newSet.has(`${h.x},${h.y}`));

      if (!addedHits.length && !removedHits.length) return;
      const patchUrl= `${baseUrl}/api/analysis/results/${analysisData._id}/hits`;
      const resp= await fetch(patchUrl,{
        method:"PATCH",
        headers:{
          Authorization:`Bearer ${token}`,
          "Content-Type":"application/json"
        },
        body: JSON.stringify({ addedHits, removedHits })
      });
      if (!resp.ok){
        const errData= await resp.json().catch(()=>{});
        throw new Error(errData?.detail||`PATCH-hits fel: ${resp.status}`);
      }
      await fetchAnalysisData();
    }catch(err){
      alert("Kunde inte uppdatera hagelträffar => "+err.message);
    }
  };

  const handleUpdateRing= async(updatedRing)=>{
    if (!analysisData?._id) return;
    try{
      const token= localStorage.getItem("token");
      if (!token){
        alert("Ingen auth-token => ring-uppdatering omöjlig");
        return;
      }
      const patchUrl= `${baseUrl}/api/analysis/results/${analysisData._id}/ring`;
      const body={
        centerX: updatedRing.centerX,
        centerY: updatedRing.centerY,
        radiusPx: updatedRing.radiusPx
      };
      const resp= await fetch(patchUrl,{
        method:"PATCH",
        headers:{
          Authorization:`Bearer ${token}`,
          "Content-Type":"application/json"
        },
        body: JSON.stringify(body)
      });
      if (!resp.ok){
        const errData= await resp.json().catch(()=>{});
        throw new Error(errData?.detail|| `PATCH-ring fel: ${resp.status}`);
      }
      await fetchAnalysisData();
    }catch(err){
      alert("Kunde inte uppdatera ring => "+err.message);
    }
  };

  // EX: reAnalyze
  const handleReAnalyze = async()=>{
    if (!analysisData?._id) return;
    if (sensitivity<=0) {
      alert("Sätt en rimlig sensitivity (>0).");
      return;
    }
    try {
      const token= localStorage.getItem("token");
      if (!token) {
        alert("Ingen auth => ej reAnalyze");
        return;
      }
      const patchUrl= `${baseUrl}/api/analysis/results/${analysisData._id}/reanalyze`;
      const resp= await fetch(patchUrl,{
        method:"PATCH",
        headers:{
          Authorization:`Bearer ${token}`,
          "Content-Type":"application/json"
        },
        body: JSON.stringify({ sensitivity, pixPerCm })
      });
      if(!resp.ok){
        const errData= await resp.json().catch(()=>{});
        throw new Error(errData?.detail|| `reAnalyze fel: ${resp.status}`);
      }
      const updatedDoc= await resp.json();
      const formatted= formatAnalysisData(updatedDoc);
      setAnalysisData(formatted);
      setRawData(updatedDoc);
      console.log("reAnalyze OK =>", updatedDoc);
    } catch(err){
      alert("Kunde inte reAnalyze => "+err.message);
    }
  };

  // “KALIBRERA 10 CM”: user anger “pixeldist” -> pixPerCm = pixeldist / 10
  const [calibrateMode, setCalibrateMode] = useState(false);

  // ex. spara en state: “calibPoints” => klicka 2 punkter i bilden => räkna px-dist => pixDist/10 => pixPerCm
  const [calibPoints, setCalibPoints] = useState([]);

  const handleCalibClick = useCallback((e)=> {
    if(!calibrateMode) return;
    // men i practice vill du räkna offset, pan/scale etc. => se addHit-liknande logik
    // spara i calibPoints
    const container= e.currentTarget.getBoundingClientRect();
    const offsetX= (e.clientX - container.left);
    const offsetY= (e.clientY - container.top);
    // och ev. pan/scale
    setCalibPoints(prev=> [...prev, {x:offsetX, y:offsetY}]);
  },[calibrateMode]);

  useEffect(()=>{
    if (calibPoints.length===2) {
      // räkna dist
      const dx= (calibPoints[1].x- calibPoints[0].x);
      const dy= (calibPoints[1].y- calibPoints[0].y);
      const dist= Math.sqrt(dx*dx + dy*dy);
      const newPpc= dist/10.0; // 10 cm
      setPixPerCm(newPpc);
      alert(`Kalibrering klart => pixPerCm=${newPpc.toFixed(2)}. Klicka ReAnalyze!`);
      setCalibrateMode(false);
      setCalibPoints([]);
    }
  },[calibPoints]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-500">Laddar analysdata...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Fel vid laddning av analys</AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1"/>
              Försök igen
            </Button>
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1"/>
              Tillbaka
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  if (!analysisData){
    return (
      <Alert variant="default" className="m-4">
        <AlertTitle>Ingen analysdata</AlertTitle>
        <AlertDescription>
          Kunde inte hitta analys för <strong>{shotId}</strong>
          <div className="mt-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1"/>
              Tillbaka
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  console.log("analysisData =>", analysisData);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Topp-rad */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1"/>
            Tillbaka
          </Button>
          <h1 className="text-2xl font-bold">Analysresultat</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1"/>
            Exportera
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1"/>
            Dela
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1"/>
            Skriv ut
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* METADATA col */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5"/>
              <span>Analysinställningar</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Känslighet */}
            <div>
              <label className="block text-sm font-medium mb-1">Känslighet (0.1..10)</label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={sensitivity}
                onChange={(e)=> setSensitivity(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-sm text-gray-600">Nuvarande: {sensitivity.toFixed(1)}</p>
              <Button variant="default" onClick={handleReAnalyze} className="mt-2">
                Re-analysera
              </Button>
            </div>

            {/* Kalibrering */}
            <div>
              <label className="block text-sm font-medium mb-1">Kalibrering (10 cm)</label>
              <p className="text-xs text-gray-500 mb-2">
                Klicka “Starta kalibrering” och klicka två punkter i bilden med 10 cm mellan.
              </p>
              <Button
                variant={calibrateMode?"destructive":"default"}
                onClick={()=> {
                  setCalibrateMode(!calibrateMode);
                  setCalibPoints([]);
                }}
              >
                {calibrateMode? "Avbryt kalibrering":"Starta kalibrering"}
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                pixPerCm: {pixPerCm.toFixed(2)}
              </p>
            </div>

            {/* Info */}
            <div className="text-sm space-y-1 pt-2 border-t">
              <p><strong>Träffar:</strong> {analysisData.metadata.hitCount}</p>
              <p><strong>Spridning (cm):</strong> {analysisData.metadata.spread.toFixed(1)}</p>
              <p><strong>Effekt%:</strong> {(analysisData.metadata.patternEfficiency*100).toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Visualization + results */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center w-full">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5"/>
                  <span>Träffmönster</span>
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleToggleAdvancedStats}>
                    <Info className="h-4 w-4 mr-1"/>
                    {showAdvancedStats?"Dölj avancerat":"Visa avancerat"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={toggleHitsList}>
                    <ListIcon className="h-4 w-4 mr-1"/>
                    {showHitsList? "Dölj träfflista":"Redigera träffar"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={toggleHideHits}>
                    {hideHits? <EyeOff className="h-4 w-4 mr-1"/> : <Eye className="h-4 w-4 mr-1"/>}
                    {hideHits? "Visa träffar":"Göm träffar"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Om calibrateMode => onClick => handleCalibClick */}
              <div onClick={handleCalibClick}>
                <ShotPatternVisualization
                  imageUrl={analysisData.imageUrl}
                  analysisData={{
                    hits: hideHits?[]: analysisData.hits,
                    ring: analysisData.ring,
                    metadata: {
                      image_dimensions: analysisData.metadata?.image_dimensions||{}
                    }
                  }}
                  showAdvancedStats={showAdvancedStats}
                  onHitsChange={handleUpdateHits}
                  onRingChange={handleUpdateRing}
                />
              </div>

              {/* Debug */}
              <DebugScript
                analysisData={analysisData}
                fetchUrl={fetchUrl}
                rawData={rawData}
                routeProps={{ shotId }}
              />

              {/* Hits-list */}
              {showHitsList && (
                <div className="mt-4 bg-gray-50 border p-3 rounded">
                  <h4 className="font-medium mb-2">Träfflista ({analysisData.hits.length})</h4>
                  <p className="text-xs text-gray-500 mb-2">
                    Klicka i “Ta bort träff”-läget i bilden eller radera här:
                  </p>
                  {analysisData.hits.length===0? (
                    <p className="text-sm text-gray-500">Inga träffar.</p>
                  ): (
                    <ul className="space-y-1 text-sm">
                      {analysisData.hits.map((hit,i)=>(
                        <li key={i} className="flex justify-between items-center">
                          <span>• X:{hit.x.toFixed(1)}% / Y:{hit.y.toFixed(1)}%</span>
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={()=>{
                              const newHits= analysisData.hits.filter((_,idx)=> idx!==i);
                              handleUpdateHits(newHits);
                            }}
                          >
                            Ta bort
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ResultsDisplay */}
          <ResultsDisplay
            analysisData={analysisData}
            showWeatherData
            showTiming
            showAdvancedStats={showAdvancedStats}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center py-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1"/>
          Tillbaka
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1"/>
            Uppdatera
          </Button>
          <Button variant="default" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1"/>
            Exportera rapport
          </Button>
        </div>
      </div>
    </div>
  );
}
