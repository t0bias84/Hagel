import React, { useState, useEffect, useCallback, useMemo } from "react";
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

  const formatAnalysisData = useCallback((raw)=>{
    if (!raw) return null;
    
    // Kontrollera ingångsdata
    console.log("formatAnalysisData - raw:", raw);
    
    const results = raw.analysis_results || {};
    
    // Skydda mot potentiella null-värden med standardvärden
    const hits = Array.isArray(results.individual_pellets) ? results.individual_pellets : [];
    const ring = results.ring || null;
    const distribution = results.distribution || {};
    const zoneAnalysis = results.zone_analysis || {
      center: { hits: 0 },
      inner: { hits: 0 },
      outer: { hits: 0 }
    };
    const clusters = Array.isArray(results.clusters) ? results.clusters : [];
    const closestHits = Array.isArray(results.closest_hits) ? results.closest_hits : [];
    const outerHits = Array.isArray(results.outer_hits) ? results.outer_hits : [];
    const densityData = Array.isArray(results.density_zones) ? results.density_zones : [];

    // Säkra metadata
    const meta = {
      shotgun: (raw.metadata && raw.metadata.shotgun) || {},
      ammunition: (raw.metadata && raw.metadata.ammunition) || {},
      conditions: (raw.metadata && raw.metadata.conditions) || {},
      distance: (raw.metadata && raw.metadata.distance) || "Okänt",
      patternDensity: typeof results.pattern_density === 'number' ? results.pattern_density : 0,
      hitCount: typeof results.hit_count === 'number' ? results.hit_count : (Array.isArray(hits) ? hits.length : 0),
      spread: typeof results.spread === 'number' ? results.spread : 0,
      patternEfficiency: typeof results.pattern_efficiency === 'number' ? results.pattern_efficiency : 0,
      timestamp: raw.created_at
    };
    
    // Säker bildhantering
    let imageUrl = raw.image_url || null;
    if (!imageUrl && raw.image_path) {
      imageUrl = raw.image_path;
    }
    
    const formattedData = {
      _id: raw._id || null,
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
      metadata: meta,
      analysis_results: results
    };
    
    // Logga formaterad data för felsökning
    console.log("formatAnalysisData - formatted:", formattedData);
    
    return formattedData;
  },[]);

  const fetchAnalysisData = useCallback(async () => {
    if (!shotId) {
        setError("Inget skott-ID angivet.");
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Ingen autentiseringstoken hittades. Logga in igen.");
      }
      
      if (shotId === "recoil") {
        throw new Error("Ogiltig begäran: Rekylanalys hanteras separat.");
      }
      
      const url = `${baseUrl}/api/analysis/results/${shotId}`;
      setFetchUrl(url); // Store the URL for debugging/display
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!resp.ok) {
        let errorDetail = `HTTP-fel: ${resp.status}`;
        try {
            const errData = await resp.json();
            errorDetail = errData?.detail || errorDetail;
        } catch (jsonError) {
            // Ignore if response is not JSON
        }
        throw new Error(errorDetail);
      }
      const json = await resp.json();
      setRawData(json); // Store raw data if needed
      const formatted = formatAnalysisData(json);
      setAnalysisData(formatted);

    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Ett oväntat fel inträffade vid hämtning av analysdata.");
    } finally {
      setLoading(false);
    }
  }, [shotId, baseUrl, formatAnalysisData]); // Added formatAnalysisData dependency

  useEffect(()=>{
    fetchAnalysisData();
  },[fetchAnalysisData, refreshKey]);

  const handleRefresh = ()=> setRefreshKey(prev=>prev+1);
  const handleBack = ()=> navigate("/analysis");
  const handleDownload = ()=> alert("Nedladdning är ej implementerat.");
  const handleShare = ()=> alert("Delning är ej implementerat.");
  const handlePrint = ()=> window.print();
  const handleToggleAdvancedStats = ()=> setShowAdvancedStats(prev=>!prev);
  const toggleHitsList = ()=> setShowHitsList(prev=>!prev);
  const toggleHideHits= ()=> setHideHits(prev=>!prev);

  const handleUpdateHits = useCallback(async(updatedHits)=>{
    if (!analysisData?._id) return;
    try{
      const token= localStorage.getItem("token");
      if (!token) {
        throw new Error("Ingen autentiseringstoken. Kan ej uppdatera träffar.");
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
      console.error("Update hits error:", err);
      setError(`Kunde inte uppdatera hagelträffar: ${err.message}`);
    }
  },[analysisData, baseUrl, fetchAnalysisData]);

  const handleUpdateRing= useCallback(async(updatedRing)=>{
    if (!analysisData?._id) return;
    try{
      const token= localStorage.getItem("token");
      if (!token){
        throw new Error("Ingen autentiseringstoken. Kan ej uppdatera ring.");
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
      console.error("Update ring error:", err);
      setError(`Kunde inte uppdatera ring: ${err.message}`);
    }
  },[analysisData, baseUrl, fetchAnalysisData]);

  // EX: reAnalyze
  const handleReAnalyze = useCallback(async()=>{
    if (!analysisData?._id) return;
    if (sensitivity<=0 || pixPerCm<=0) {
      setError("Ange giltiga värden (> 0) för Känslighet och Pixlar/cm.");
      return;
    }
    setLoading(true); // Indicate re-analysis is in progress
    setError(null);
    try {
      const token= localStorage.getItem("token");
      if (!token) {
        throw new Error("Ingen autentiseringstoken. Kan ej omanalysera.");
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
        throw new Error(errData?.detail|| `Omanalys fel: ${resp.status}`);
      }
      const updatedDoc= await resp.json();
      const formatted= formatAnalysisData(updatedDoc);
      setAnalysisData(formatted);
      setRawData(updatedDoc);
      console.log("reAnalyze OK =>", updatedDoc);
    } catch(err){
      console.error("Re-analyze error:", err);
      setError(`Omanalys misslyckades: ${err.message}`);
    } finally {
      setLoading(false); // Ensure loading state is reset
    }
  },[analysisData, baseUrl, formatAnalysisData, sensitivity, pixPerCm]);

  // "KALIBRERA 10 CM": user anger "pixeldist" -> pixPerCm = pixeldist / 10
  const [calibrateMode, setCalibrateMode] = useState(false);

  // ex. spara en state: "calibPoints" => klicka 2 punkter i bilden => räkna px-dist => pixDist/10 => pixPerCm
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
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }
  if (error && !analysisData) {
    return (
      <div className="p-4 md:p-8">
        <Button onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Tillbaka till listan
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Fel vid Laddning av Analys</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (!analysisData){
    return (
      <div className="p-4 md:p-8">
        <Button onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Tillbaka till listan
        </Button>
        <Alert variant="warning">
          <AlertTitle>Ingen Analysdata</AlertTitle>
          <AlertDescription>
            Kunde inte hitta analysdata för det angivna skottet (ID: {shotId || 'Okänt'}). Det kan bero på att analysen inte slutförts eller att ID:t är ogiltigt.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  console.log("analysisData =>", analysisData);

  // Säkerställ att analysisData är komplett och valid
  const validatedAnalysisData = useMemo(() => {
    if (!analysisData) return null;
    
    // Skapa en kopia för att undvika att ändra original
    const validData = { ...analysisData };
    
    // Säkerställ att hits alltid är en array
    if (!validData.hits || !Array.isArray(validData.hits)) {
      console.warn("ShotAnalysisContainer: Sätter hits till tom array då den saknas eller inte är en array");
      validData.hits = [];
    }
    
    // Säkerställ att zoneAnalysis finns
    if (!validData.zoneAnalysis) {
      console.warn("ShotAnalysisContainer: Skapar tom zoneAnalysis då den saknas");
      validData.zoneAnalysis = {
        center: { hits: 0 },
        inner: { hits: 0 },
        outer: { hits: 0 }
      };
    }
    
    // Säkerställ att metadata finns
    if (!validData.metadata) {
      console.warn("ShotAnalysisContainer: Skapar tom metadata då den saknas");
      validData.metadata = {};
    }
    
    return validData;
  }, [analysisData]);

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Display persistent errors (e.g., from updates) even if main data loaded */}
      {error && (
          <Alert variant="destructive" className="mb-4">
              <AlertTitle>Fel</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
          </Alert>
      )}
      
      {/* Top Bar: Back, Title, Actions */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Tillbaka
        </Button>
        <h1 className="text-2xl font-bold text-center flex-1">
            Skottanalys #{analysisData._id ? analysisData._id.slice(-6) : shotId} 
            {analysisData.metadata.timestamp && ` (${new Date(analysisData.metadata.timestamp).toLocaleDateString()})`}
        </h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} title="Uppdatera data">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleDownload} title="Ladda ner data (CSV/JSON)">
            <Download className="h-4 w-4" />
          </Button>
           <Button variant="outline" onClick={handleShare} title="Dela analys">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handlePrint} title="Skriv ut sidan">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visualization & Controls */}
        <div className="lg:col-span-2 space-y-6">
           <Card>
             <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Träffbildsvisualisering</CardTitle>
                    <div className="flex items-center space-x-2">
                         <Button variant="ghost" size="icon" onClick={toggleHideHits} title={hideHits ? "Visa träffar" : "Dölj träffar"}>
                            {hideHits ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={toggleHitsList} title={showHitsList ? "Dölj träfflista" : "Visa träfflista"}>
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
             </CardHeader>
            <CardContent>
              {analysisData.imageUrl ? (
                <ShotPatternVisualization
                  imageUrl={analysisData.imageUrl}
                  hits={hideHits ? [] : (analysisData.hits || [])}
                  ring={analysisData.ring}
                  clusters={analysisData.clusters}
                  onHitsUpdate={handleUpdateHits} // Pass handler for interactive editing
                  onRingUpdate={handleUpdateRing} // Pass handler for interactive editing
                  pixPerCm={pixPerCm} // Pass for scaling
                  // Consider adding options here: showClusters, showZones, etc.
                />
              ) : (
                <Alert variant="default">
                  <AlertTitle>Bild saknas</AlertTitle>
                  <AlertDescription>Ingen bild tillgänglig för denna analys.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Optional Hits List */}
          {showHitsList && (
             <Card>
                <CardHeader><CardTitle>Träffkoordinater ({analysisData.hits?.length || 0})</CardTitle></CardHeader>
                <CardContent className="max-h-60 overflow-y-auto text-sm">
                    <ul>
                        {(analysisData.hits || []).map((hit, index) => (
                            <li key={index} className="font-mono">
                                {index + 1}: (x: {hit.x.toFixed(2)}, y: {hit.y.toFixed(2)})
                            </li>
                        ))}
                    </ul>
                </CardContent>
             </Card>
          )}
        </div>

        {/* Right Column: Results & Parameters */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                     <CardTitle>Analysresultat</CardTitle>
                     <Button variant="ghost" size="icon" onClick={handleToggleAdvancedStats} title={showAdvancedStats ? "Visa grundläggande" : "Visa avancerat"}>
                         <Settings className="h-4 w-4"/>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
              <ResultsDisplay
                results={analysisData.analysis_results}
                metadata={analysisData.metadata}
                showAdvanced={showAdvancedStats}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Parametrar & Omanalys</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <div>
                  <label htmlFor="sensitivity" className="block text-sm font-medium mb-1">Känslighet (bildanalys)</label>
                  <input
                    id="sensitivity"
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="1"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    className="w-full p-2 border rounded bg-background"
                  />
                   <p className="text-xs text-muted-foreground mt-1">Lägre värde = fler prickar detekteras.</p>
               </div>
                <div>
                  <label htmlFor="pixPerCm" className="block text-sm font-medium mb-1">Pixlar per cm (skala)</label>
                  <input
                    id="pixPerCm"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={pixPerCm}
                    onChange={(e) => setPixPerCm(parseFloat(e.target.value))}
                     className="w-full p-2 border rounded bg-background"
                  />
                   <p className="text-xs text-muted-foreground mt-1">Kalibrerar avståndsmått i analysen.</p>
               </div>
              <Button onClick={handleReAnalyze} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Omanalysera Träffbild
              </Button>
            </CardContent>
          </Card>

           {/* Debug Info (Consider removing or hiding in production) */}
           <DebugScript rawData={rawData} analysisData={analysisData} fetchUrl={fetchUrl} />

        </div>
      </div>
    </main>
  );
}
