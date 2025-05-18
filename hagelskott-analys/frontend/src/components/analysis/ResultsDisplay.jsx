import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer
} from "recharts";
import {
  Target,
  Crosshair,
  Ruler,
  Thermometer,
  Wind,
  Droplets,
  Sun,
  Calendar,
  Clock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";

const COLORS = [
  "#B85C38", // dark-accent
  "#5C3D2E", // dark-secondary
  "#E0C097", // dark-highlight
  "#2D2424", // dark
  "#8B4513", // Mörkare kopparton
];

/**
 * En EXTREMT förenklad version av ResultsDisplay som klarar alla datastrukturer
 * utan att kasta TypeError.
 */
export default function ResultsDisplay({
  analysisData,
  showWeatherData = true,
  showTiming = true,
  showAdvancedStats = false,
  className = ""
}) {
  // State för intern felhantering
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  
  // Återställ fel om analysisData ändras
  useEffect(() => {
    setHasError(false);
    setErrorInfo(null);
  }, [analysisData]);
  
  // Egen error boundary
  useEffect(() => {
    const errorHandler = (event) => {
      // Kolla om felet kommer från denna komponent
      console.error("ResultsDisplay - Error detected:", event.error);
      
      // Om det är ett TypeError med "Cannot read properties of undefined (reading 'hits')"
      if (event.error && event.error.message && 
          event.error.message.includes("Cannot read properties of undefined") &&
          event.error.message.includes("'hits'")) {
        
        // Markera att vi har ett fel
        setHasError(true);
        setErrorInfo("Kunde inte läsa 'hits' från analysdata. Detta är ett problem med datastrukturen.");
        
        // Förhindra att felet bubblar upp
        event.preventDefault();
        event.stopPropagation();
        
        console.warn("ResultsDisplay - Hit property error caught and handled internally");
      }
    };
    
    // Lägg till event listener
    window.addEventListener('error', errorHandler);
    
    // Ta bort event listener
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);
  
  // Säker åtkomst till egenskaper
  const safeGet = (obj, path, defaultValue) => {
    try {
      if (!obj) return defaultValue;
      
      const keys = path.split('.');
      let result = obj;
      
      for (const key of keys) {
        if (result === undefined || result === null) return defaultValue;
        result = result[key];
      }
      
      return result === undefined || result === null ? defaultValue : result;
    } catch (err) {
      console.error(`Fel vid åtkomst av ${path}:`, err);
      return defaultValue;
    }
  };
  
  // Språkstöd
  const { language } = useLanguage();
  const t = language === "en" ? en : sv;
  
  // Loggning för debugging
  console.log("ResultsDisplay - Receiving analysisData:", analysisData);
  
  // Extra debuglogg för att identifiera problemet
  if (analysisData) {
    // Använd safeGet för debuglogg för att undvika error
    console.log("analysisData.hits:", safeGet(analysisData, 'hits', []));
    console.log("analysisData._id:", safeGet(analysisData, '_id', null));
    console.log("analysisData.zoneAnalysis:", safeGet(analysisData, 'zoneAnalysis', {}));
  }
  
  // Om det finns ett error, visa endast grundläggande statistik
  if (hasError) {
    return (
      <Alert variant="destructive" className={`mt-4 ${className}`}>
        <AlertDescription>
          <p className="mb-2">Ett fel uppstod vid rendering av analysresultat: {errorInfo}</p>
          <p>Kontakta support med detaljer om detta fel.</p>
        </AlertDescription>
      </Alert>
    );
  }
  
  // Om analysisData är null eller undefined
  if (!analysisData) {
    return (
      <Alert variant="default" className={`mt-4 ${className}`}>
        <AlertDescription>
          {t.analysis.noDataAvailable}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Skapa en trygg kopia av analysisData med garanterade defaultvärden
  const safeAnalysisData = {
    hits: Array.isArray(safeGet(analysisData, 'hits', [])) ? safeGet(analysisData, 'hits', []) : [],
    zoneAnalysis: safeGet(analysisData, 'zoneAnalysis', { center: { hits: 0 }, inner: { hits: 0 }, outer: { hits: 0 } }),
    metadata: safeGet(analysisData, 'metadata', {}),
    analysis_results: safeGet(analysisData, 'analysis_results', {})
  };
  
  // Försök beräkna egenskaper på ett säkert sätt med felhantering
  let hitCount = 0;
  let patternDensity = 0;
  let spread = 0;
  let patternEfficiency = 0;
  let blownPattern = false;
  
  try {
    // Använd den säkra datareferensen istället
    hitCount = extractSafeValue(safeAnalysisData, 'hit_count', 'hitCount', 'hits.length');
    patternDensity = extractSafeValue(safeAnalysisData, 'pattern_density', 'patternDensity');
    spread = extractSafeValue(safeAnalysisData, 'spread');
    patternEfficiency = extractSafeValue(safeAnalysisData, 'pattern_efficiency', 'patternEfficiency');
    
    // Flaggar
    blownPattern = extractSafeFlag(safeAnalysisData, 'blown_pattern');
  } catch (err) {
    console.error("Fel vid extrahering av analysdata:", err);
    // Sätt standardvärden om något går fel
    hitCount = 0;
    patternDensity = 0;
    spread = 0;
    patternEfficiency = 0;
    blownPattern = false;
  }
  
  // Titta efter väderobjekt
  const weatherData = extractWeatherData(analysisData, safeGet);
  
  // Extrahera tidpunkt om tillgänglig
  const timeData = extractTimeData(analysisData, safeGet);
  
  // Extrahera densitetsdata om tillgänglig
  const densityChartData = extractDensityData(analysisData, safeGet);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* A) 4 stat-rutor */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 1) Antal träffar */}
        <StatCard
          icon={<Target className="h-6 w-6 text-gray-100" />}
          bg="bg-dark-800"
          label={t.analysis.hits}
          value={hitCount}
          textColor="text-gray-100"
        />
        {/* 2) Täckning */}
        <StatCard
          icon={<Crosshair className="h-6 w-6 text-gray-100" />}
          bg="bg-dark-800"
          label={t.analysis.precision}
          value={`${(patternDensity * 100).toFixed(1)}%`}
          textColor="text-gray-100"
        />
        {/* 3) Spridning (cm) */}
        <StatCard
          icon={<Ruler className="h-6 w-6 text-gray-100" />}
          bg="bg-dark-800"
          label={t.analysis.grouping}
          value={`${spread.toFixed(1)} cm`}
          textColor="text-gray-100"
        />
        {/* 4) Effekt */}
        <StatCard
          icon={<Target className="h-6 w-6 text-gray-100" />}
          bg="bg-dark-800"
          label={t.analysis.statistics}
          value={patternEfficiency ? `${(patternEfficiency * 100).toFixed(1)}%` : "N/A"}
          textColor="text-gray-100"
        />
      </div>

      {/* B) Om "blown_pattern" => varning */}
      {blownPattern && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>
            <strong>Varning:</strong> Mönstret verkar ha en lucka i mitten ("blown pattern").
          </AlertDescription>
        </Alert>
      )}

      {/* C) Väder om showWeatherData */}
      {showWeatherData && weatherData && Object.keys(weatherData).length > 0 && (
        <div className="bg-dark-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-3 text-gray-100">Väderförhållanden</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Temperatur */}
            {weatherData.temperature !== undefined && (
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-gray-100" />
              <span className="text-sm text-gray-100">
                  {weatherData.temperature} °C
              </span>
            </div>
            )}
            {/* Vind */}
            {weatherData.wind !== undefined && (
            <div className="flex items-center gap-2">
              <Wind className="h-5 w-5 text-gray-100" />
              <span className="text-sm text-gray-100">
                  {weatherData.wind} m/s
              </span>
            </div>
            )}
            {/* Luftfuktighet */}
            {weatherData.humidity !== undefined && (
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-gray-100" />
              <span className="text-sm text-gray-100">
                  {weatherData.humidity} %
              </span>
            </div>
            )}
            {/* Ljusförhållanden */}
            {weatherData.light !== undefined && (
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-gray-100" />
              <span className="text-sm text-gray-100">
                  {weatherData.light}
              </span>
            </div>
            )}
          </div>
        </div>
      )}

      {/* D) Tid om showTiming */}
      {showTiming && timeData && (
        <div className="bg-dark-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-3 text-gray-100">Tidpunkt</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-100" />
              <span className="text-sm text-gray-100">{timeData.date || "Okänt datum"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-100" />
              <span className="text-sm text-gray-100">{timeData.time || "Okänd tid"}</span>
            </div>
          </div>
        </div>
      )}

      {/* E) Densitetsdata om den finns */}
      {densityChartData.length > 0 && (
        <Card className="bg-dark-800 border-dark-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Densitetsprofil</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={densityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                    <XAxis dataKey="distance" stroke="#e2e8f0" />
                    <YAxis stroke="#e2e8f0" />
                    <RechartTooltip contentStyle={{ backgroundColor: '#1a202c', border: 'none', color: '#e2e8f0' }} />
                  <Bar dataKey="density" fill="#B85C38" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
          </CardContent>
        </Card>
      )}

      {/* F) Täckningsanalys (enkel version utan att använda zoneData) */}
      <Card className="bg-dark-800 border-dark-700">
          <CardHeader>
          <CardTitle className="text-gray-100">Täckningsanalys</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="space-y-4">
            <div className="bg-dark-700 p-3 rounded mt-auto">
              <h4 className="text-sm font-semibold text-gray-100 mb-2">Täckningsanalys</h4>
              
              {/* Täckningsutvärdering med visuell indikator */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Dålig</span>
                  <span>Medel</span>
                  <span>Bra</span>
                  <span>Utmärkt</span>
                </div>
                <div className="h-2 w-full bg-dark-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-red-700" style={{ width: '25%' }} />
                  <div className="h-full bg-yellow-600" style={{ width: '25%' }} />
                  <div className="h-full bg-green-600" style={{ width: '25%' }} />
                  <div className="h-full bg-emerald-500" style={{ width: '25%' }} />
                </div>
                <div className="h-4 relative flex items-center justify-center">
                  <div 
                    className="absolute w-3 h-3 bg-white rounded transform -translate-y-0.5"
                        style={{
                      left: `${Math.min(Math.max(patternDensity * 100, 5), 95)}%`,
                      transform: 'translateX(-50%)' 
                        }}
                      />
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-300">
                {patternDensity > 0.7 ? (
                  <p>Utmärkt täckning! {(patternDensity * 100).toFixed(1)}% av ytan har träffar, vilket ger god effekt.</p>
                ) : patternDensity > 0.5 ? (
                  <p>Bra täckning på {(patternDensity * 100).toFixed(1)}%. För jakt på kortare håll är denna täckning tillfredställande.</p>
                ) : patternDensity > 0.3 ? (
                  <p>Medelmåttig täckning på {(patternDensity * 100).toFixed(1)}%. Överväg att testa en annan choke eller hagel för bättre resultat.</p>
                ) : (
                  <p>Låg täckning på {(patternDensity * 100).toFixed(1)}%. Undersök alternativ för bättre spridning.</p>
                )}
                
                {blownPattern && (
                  <p className="text-amber-400">Notera: Mönstret visar tecken på central lucka ("blown pattern"), vilket kan påverka träffsäkerheten.</p>
                )}
              </div>
            </div>

            {/* Jämförelsestatistik */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-dark-700 p-2 rounded">
                <div className="text-xs text-gray-400 mb-1">Träffbild</div>
                <div className="flex items-center">
                  <div className="h-2 flex-1 bg-dark-800 rounded-full overflow-hidden mr-2">
                    <div 
                      className="h-full bg-gradient-to-r from-red-600 via-yellow-500 to-green-500"
                      style={{ width: `${Math.min(spread > 0 ? (100 - (spread / 1.5)) : 0, 100)}%` }} 
                    />
                  </div>
                  <span className="text-sm text-gray-200">{spread.toFixed(1)} cm</span>
                </div>
              </div>
              
              <div className="bg-dark-700 p-2 rounded">
                <div className="text-xs text-gray-400 mb-1">Effektivitet</div>
                <div className="flex items-center">
                  <div className="h-2 flex-1 bg-dark-800 rounded-full overflow-hidden mr-2">
                    <div 
                      className="h-full bg-gradient-to-r from-red-600 via-yellow-500 to-green-500"
                      style={{ width: `${(patternEfficiency * 100)}%` }} 
                    />
                  </div>
                  <span className="text-sm text-gray-200">{(patternEfficiency * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
          </CardContent>
        </Card>
    </div>
  );
}

/* ------------------------------------------------------------------
   DEL-KOMPONENTER & HJÄLPMETODER
------------------------------------------------------------------*/

/** StatCard */
function StatCard({ icon, bg, label, value, textColor }) {
  return (
    <div className={`${bg} p-4 rounded flex items-center justify-between`}>
      <div className="flex items-center">
        {icon}
      </div>
      <div className="text-right ml-3">
        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        <p className={`text-sm ${textColor}`}>{label}</p>
      </div>
    </div>
  );
}

/** Extraherar ett säkert numeriskt värde från ett nestat objekt */
function extractSafeValue(data, ...possiblePaths) {
  if (!data) return 0;
  
  // Prova att söka direkt i objektet
  for (const path of possiblePaths) {
    // Hantera specialfall för hit.length
    if (path === 'hits.length') {
      try {
        if (data && data.hits && Array.isArray(data.hits)) {
          return data.hits.length;
        }
      } catch (err) {
        console.warn("Failed to read hits.length:", err);
      }
      continue;
    }
    
    try {
      if (data[path] !== undefined && data[path] !== null) {
        return Number(data[path]) || 0;
      }
    } catch (err) {
      console.warn(`Failed to read ${path}:`, err);
    }
  }
  
  // Prova att söka i metadata
  if (data.metadata) {
    for (const path of possiblePaths) {
      try {
        if (data.metadata[path] !== undefined && data.metadata[path] !== null) {
          return Number(data.metadata[path]) || 0;
        }
      } catch (err) {
        console.warn(`Failed to read metadata.${path}:`, err);
      }
    }
  }
  
  // Prova att söka i analysis_results
  if (data.analysis_results) {
    for (const path of possiblePaths) {
      try {
        if (data.analysis_results[path] !== undefined && data.analysis_results[path] !== null) {
          return Number(data.analysis_results[path]) || 0;
        }
      } catch (err) {
        console.warn(`Failed to read analysis_results.${path}:`, err);
      }
    }
  }
  
  return 0;
}

/** Extraherar en boolean flagga från ett nestat objekt */
function extractSafeFlag(data, ...possiblePaths) {
  if (!data) return false;
  
  // Prova att söka direkt i objektet
  for (const path of possiblePaths) {
    try {
      if (data[path] === true) {
        return true;
      }
    } catch (err) {
      console.warn(`Failed to read flag ${path}:`, err);
    }
  }
  
  // Prova att söka i metadata
  try {
    if (data.metadata) {
      for (const path of possiblePaths) {
        try {
          if (data.metadata[path] === true) {
            return true;
          }
        } catch (err) {
          console.warn(`Failed to read metadata flag ${path}:`, err);
        }
      }
    }
  } catch (err) {
    console.warn("Error accessing metadata:", err);
  }
  
  // Prova att söka i analysis_results
  try {
    if (data.analysis_results) {
      for (const path of possiblePaths) {
        try {
          if (data.analysis_results[path] === true) {
            return true;
          }
        } catch (err) {
          console.warn(`Failed to read analysis_results flag ${path}:`, err);
        }
      }
    }
  } catch (err) {
    console.warn("Error accessing analysis_results:", err);
  }
  
  return false;
}

/** Extraherar väderdata från ett komplext objekt */
function extractWeatherData(data, safeGetter) {
  if (!data) return {};
  
  // Prova att hitta väderdata på olika platser
  let weatherData = {};
  
  try {
    // Om safeGetter finns, använd den
    if (typeof safeGetter === 'function') {
      weatherData = safeGetter(data, 'weather', {}) || 
                   safeGetter(data, 'metadata.weather', {}) || 
                   safeGetter(data, 'analysis_results.weather', {});
    } else {
      // Legacy-mode
      // Direkt i objektet
      if (data.weather && typeof data.weather === 'object') {
        weatherData = data.weather;
      }
      // I metadata
      else if (data.metadata && data.metadata.weather && typeof data.metadata.weather === 'object') {
        weatherData = data.metadata.weather;
      }
      // I analysis_results
      else if (data.analysis_results && data.analysis_results.weather && typeof data.analysis_results.weather === 'object') {
        weatherData = data.analysis_results.weather;
      }
    }
    
    // Säkerställ att alla egenskaper är satta om de finns
    return {
      temperature: typeof weatherData.temperature === 'number' ? weatherData.temperature : undefined,
      wind: typeof weatherData.wind === 'number' ? weatherData.wind : undefined,
      humidity: typeof weatherData.humidity === 'number' ? weatherData.humidity : undefined,
      light: weatherData.light || undefined
    };
  } catch (err) {
    console.warn("Error extracting weather data:", err);
    return {};
  }
}

/** Extraherar tidsinformation från ett komplext objekt */
function extractTimeData(data, safeGetter) {
  if (!data) return null;
  
  try {
    // Prioritetsordning för datum
    let timestamp = null;
    
    if (typeof safeGetter === 'function') {
      timestamp = safeGetter(data, 'metadata.date_taken', null) || 
                 safeGetter(data, 'date_taken', null) || 
                 safeGetter(data, 'created_at', null) || 
                 safeGetter(data, 'analysis_results.created_at', null);
    } else {
      // Legacy-mode
      if (data.metadata && data.metadata.date_taken) {
        timestamp = data.metadata.date_taken;
      } else if (data.date_taken) {
        timestamp = data.date_taken;
      } else if (data.created_at) {
        timestamp = data.created_at;
      } else if (data.analysis_results && data.analysis_results.created_at) {
        timestamp = data.analysis_results.created_at;
      }
    }
    
    return formatDateTime(timestamp);
  } catch (err) {
    console.warn("Error extracting time data:", err);
    return null;
  }
}

/** Extraherar densitetsdata från ett komplext objekt */
function extractDensityData(data, safeGetter) {
  if (!data) return [];
  
  try {
    let densityData = [];
    
    if (typeof safeGetter === 'function') {
      densityData = safeGetter(data, 'densityData', []) || 
                   safeGetter(data, 'density_zones', []) || 
                   safeGetter(data, 'analysis_results.density_zones', []);
    } else {
      // Legacy-mode
      // Prova att hitta densitetsdata på olika platser
      if (data.densityData && Array.isArray(data.densityData)) {
        densityData = data.densityData;
      } else if (data.density_zones && Array.isArray(data.density_zones)) {
        densityData = data.density_zones;
      } else if (data.analysis_results && data.analysis_results.density_zones && Array.isArray(data.analysis_results.density_zones)) {
        densityData = data.analysis_results.density_zones;
      } else {
        return [];
      }
    }
    
    // Om densityData inte är en array, returnera tom array
    if (!Array.isArray(densityData)) {
      return [];
    }
    
    // Konvertera data till ett säkert format
    return densityData
      .filter(d => d !== null && typeof d === 'object')
      .map(d => {
        try {
          return {
            distance: Number(d.distance || 0),
            density: Number(d.density || 0)
          };
        } catch (err) {
          console.warn("Error formatting density data point:", err);
          return { distance: 0, density: 0 };
        }
      })
      .filter(d => d.distance !== undefined && d.density !== undefined);
  } catch (err) {
    console.warn("Error extracting density data:", err);
    return [];
  }
}

/** formatDateTime */
function formatDateTime(timestamp) {
  if (!timestamp) return null;
  
  try {
  const dateObj = new Date(timestamp);
    
    // Kontrollera att dateObj är ett giltigt datum
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
  return {
    date: dateObj.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }),
    time: dateObj.toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit"
    })
  };
  } catch (e) {
    console.error("Error formatting date:", e);
    return null;
  }
}
