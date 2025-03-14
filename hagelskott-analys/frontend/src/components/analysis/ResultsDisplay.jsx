import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
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
  Clock,
  Info
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Palett (justera om du vill)
 */
const COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

/**
 * ResultsDisplay
 * ==============
 * - Visar stats + zoner + densitetsprofil.
 * - Varningar för “blown_pattern” om du vill.
 * - Avancerad info (75% diameter, ring confidence, etc.) när showAdvancedStats = true.
 *
 * Props:
 *  - analysisData (object)
 *  - showWeatherData (bool)
 *  - showTiming (bool)
 *  - showAdvancedStats (bool)
 *  - className (string)
 */
export default function ResultsDisplay({
  analysisData,
  showWeatherData = true,
  showTiming = true,
  showAdvancedStats = false,
  className = ""
}) {
  // Säker data
  const safeData = analysisData || {};
  const meta = safeData.metadata || {};

  // 1) Zonanalys
  const zoneAnalysis = safeData.zoneAnalysis || {};
  const zonePieData = useMemo(() => {
    const zones = Object.keys(zoneAnalysis);
    if (!zones.length) return [];
    return zones.map((z) => ({
      name: z,
      value: zoneAnalysis[z]?.hits || 0
    }));
  }, [zoneAnalysis]);

  // 2) Densitetsdata (BarChart)
  const densityChartData = safeData.densityData || safeData.density_zones || [];

  // 3) Väder
  const weatherData = meta.conditions?.weather || {};

  // 4) Tid
  const dateTimeObj = formatDateTime(meta.timestamp);

  // 5) Kolla blown_pattern
  const blownPattern = safeData.blown_pattern || false;

  // 6) ev. 75% diameter
  const diameter75 = safeData.diameter_75pct || 0; // eller meta.advancedStats?.diameter75

  // 7) Minimalt fallback
  if (!meta && !densityChartData.length && !zonePieData.length) {
    return (
      <Alert variant="default" className={`mt-4 ${className}`}>
        <AlertDescription>
          Ingen data att visa i <strong>ResultsDisplay</strong>.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* A) 4 stat-rutor */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 1) Antal träffar */}
        <StatCard
          icon={<Target className="h-6 w-6 text-blue-600" />}
          bg="bg-blue-100"
          label="Träffar"
          value={meta.hitCount || 0}
        />
        {/* 2) Täckning => patternDensity * 100% */}
        <StatCard
          icon={<Crosshair className="h-6 w-6 text-green-600" />}
          bg="bg-green-100"
          label="Täckning"
          value={`${((meta.patternDensity || 0) * 100).toFixed(1)}%`}
        />
        {/* 3) Spridning (cm) */}
        <StatCard
          icon={<Ruler className="h-6 w-6 text-yellow-600" />}
          bg="bg-yellow-100"
          label="Spridning"
          value={`${(meta.spread || 0).toFixed(1)} cm`}
        />
        {/* 4) Effekt => patternEfficiency (0..1) => 0..100% */}
        <StatCard
          icon={<Target className="h-6 w-6 text-purple-600" />}
          bg="bg-purple-100"
          label="Effekt"
          value={`${((meta.patternEfficiency || 0) * 100).toFixed(1)}%`}
        />
      </div>

      {/* B) Om “blown_pattern” => varning */}
      {blownPattern && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>
            <strong>Varning:</strong> Mönstret verkar ha en lucka i mitten (“blown pattern”).
          </AlertDescription>
        </Alert>
      )}

      {/* C) Avancerad info */}
      {showAdvancedStats && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Info className="h-5 w-5 inline-block mr-1 text-gray-500" />
              Avancerad Statistik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <AdvancedStat label="75% diameter" value={diameter75} unit="cm" />
              {/* Ex. ringConfidence om du vill */}
              {safeData.ring?.confidence && (
                <AdvancedStat
                  label="Ring Confidence"
                  value={safeData.ring.confidence}
                  unit=""
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* D) Diagram => densitet + zoner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* D1) Densitets-bar */}
        <Card>
          <CardHeader>
            <CardTitle>Densitetsprofil</CardTitle>
          </CardHeader>
          <CardContent>
            {densityChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={densityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="distance" />
                    <YAxis />
                    <RechartTooltip />
                    <Bar dataKey="density">
                      {densityChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Ingen densitetsdata</p>
            )}
          </CardContent>
        </Card>

        {/* D2) Zon-Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Zone-fördelning</CardTitle>
          </CardHeader>
          <CardContent>
            {zonePieData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={zonePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {zonePieData.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={COLORS[idx % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartTooltip />
                  </PieChart>
                </ResponsiveContainer>
                {/* Liten custom-legend => badges */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {zonePieData.map((zone, idx) => (
                    <div key={zone.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[idx % COLORS.length]
                        }}
                      />
                      <span className="bg-white text-gray-700 px-2 py-0.5 rounded">
                        {zone.name}: {zone.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Ingen zoneAnalysis-data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* E) Väder + Tid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {showWeatherData && Object.keys(weatherData).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Väder</CardTitle>
            </CardHeader>
            <CardContent>
              <WeatherDisplay weatherData={weatherData} />
            </CardContent>
          </Card>
        )}
        {showTiming && dateTimeObj && (
          <Card>
            <CardHeader>
              <CardTitle>Tidpunkt</CardTitle>
            </CardHeader>
            <CardContent>
              <DateTimeDisplay datetime={dateTimeObj} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   DEL-KOMPONENTER
------------------------------------------------------------------*/

/** StatCard */
function StatCard({ icon, bg, label, value }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between pt-6">
        <div className={`p-2 rounded-lg ${bg}`}>
          {icon}
        </div>
        <div className="text-right ml-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** WeatherDisplay */
function WeatherDisplay({ weatherData }) {
  const { temperature, wind_speed, humidity, light_conditions } = weatherData || {};
  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      {temperature !== undefined && (
        <div className="flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-gray-400" />
          <span>{temperature}°C</span>
        </div>
      )}
      {wind_speed !== undefined && (
        <div className="flex items-center gap-2">
          <Wind className="h-5 w-5 text-gray-400" />
          <span>{wind_speed} m/s</span>
        </div>
      )}
      {humidity !== undefined && (
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-gray-400" />
          <span>{humidity}%</span>
        </div>
      )}
      {light_conditions && (
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-gray-400" />
          <span>{light_conditions}</span>
        </div>
      )}
    </div>
  );
}

/** DateTimeDisplay */
function DateTimeDisplay({ datetime }) {
  const { date, time } = datetime;
  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-gray-400" />
        <span>{date}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-gray-400" />
        <span>{time}</span>
      </div>
    </div>
  );
}

/** AdvancedStat */
function AdvancedStat({ label, value, unit }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold">
        {Number(value).toFixed(2)}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}

/** formatDateTime */
function formatDateTime(timestamp) {
  if (!timestamp) return null;
  const dateObj = new Date(timestamp);
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
}
