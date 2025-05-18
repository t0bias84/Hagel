import React, { useState } from 'react';
import { Loader2, AlertCircle, Info, Calculator } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from 'recharts';

// Lista över vanliga hagelgevär med vikter
const commonShotguns = [
  { name: "Beretta 686 Silver Pigeon I", weight: 3.4 },
  { name: "Browning B525", weight: 3.5 },
  { name: "Beretta A400 Xcel", weight: 3.5 },
  { name: "Winchester SX4", weight: 3.2 },
  { name: "Remington 870", weight: 3.2 },
  { name: "Benelli M2", weight: 3.25 },
  { name: "Beretta DT11", weight: 3.8 },
  { name: "Perazzi MX8", weight: 3.7 },
  { name: "Browning Cynergy", weight: 3.4 },
  { name: "Caesar Guerini Summit", weight: 3.6 },
  { name: "Blaser F3", weight: 3.5 },
  { name: "Krieghoff K-80", weight: 3.8 },
  { name: "Beretta 694", weight: 3.5 },
  { name: "Browning Maxus", weight: 3.3 },
  { name: "Benelli 828U", weight: 3.3 },
  { name: "Beretta 1301 Comp Pro", weight: 3.2 },
  { name: "Winchester SX4 Sporting", weight: 3.3 },
  { name: "Browning A5", weight: 3.4 },
  { name: "Benelli Montefeltro", weight: 3.1 },
  { name: "Beretta A300 Ultima", weight: 3.3 }
];

// Referensvärden för rekyl
const recoilReferences = {
  light: {
    example: "24g hagel, 2.0g krut (Lätt jaktladdning)",
    energy: "10-15 J",
    description: "Lämplig för nybörjare och längre skjutpass"
  },
  moderate: {
    example: "28g hagel, 2.2g krut (Standard sportladdning)",
    energy: "15-25 J",
    description: "Balanserad rekyl, lämplig för de flesta skyttar"
  },
  heavy: {
    example: "36g hagel, 2.5g krut (Tung jaktladdning)",
    energy: ">25 J",
    description: "Kraftig rekyl, kräver god skjutteknik"
  }
};

const RecoilVisualizer = ({ results }) => {
  if (!results) return null;

  const recoilEnergy = (results.recoilEnergy * 1.35582).toFixed(2);
  const recoilVelocity = (results.recoilVelocity * 0.3048).toFixed(2);
  const recoilImpulse = (results.recoilImpulse * 4.44822).toFixed(2);

  // Skapa data för energimätaren
  const energyData = [{
    name: 'Rekylenergi',
    value: parseFloat(recoilEnergy),
    fill: '#22c55e'
  }];

  // Definiera färger baserat på rekylbedömning
  const getRecoilColor = (rating) => {
    switch (rating.toLowerCase()) {
      case 'lätt': return '#22c55e';
      case 'måttlig': return '#eab308';
      case 'kraftig': return '#ef4444';
      default: return '#22c55e';
    }
  };

  return (
    <div className="space-y-6">
      {/* Energimätare */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="100%"
            barSize={10}
            data={energyData}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, Math.max(parseFloat(recoilEnergy), 50)]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background
              dataKey="value"
              cornerRadius={30}
              fill={getRecoilColor(results.rating)}
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-current text-gray-100 text-xl font-bold"
            >
              {recoilEnergy} J
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      {/* Rekyldata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-military-800 p-4 rounded-lg text-center">
          <p className="text-gray-400 text-sm mb-1">Rekylhastighet</p>
          <p className="text-gray-100 text-2xl font-bold">{recoilVelocity}</p>
          <p className="text-gray-400 text-sm">m/s</p>
        </div>
        <div className="bg-military-800 p-4 rounded-lg text-center">
          <p className="text-gray-400 text-sm mb-1">Rekylimpuls</p>
          <p className="text-gray-100 text-2xl font-bold">{recoilImpulse}</p>
          <p className="text-gray-400 text-sm">Ns</p>
        </div>
        <div className="bg-military-800 p-4 rounded-lg text-center">
          <p className="text-gray-400 text-sm mb-1">Bedömning</p>
          <p className="text-gray-100 text-2xl font-bold" style={{ color: getRecoilColor(results.rating) }}>
            {results.rating}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function RecoilAnalysis({ loadData }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [gunWeight, setGunWeight] = useState("");
  const [selectedGun, setSelectedGun] = useState("");
  const [muzzleVelocity, setMuzzleVelocity] = useState("");

  const handleGunSelect = (value) => {
    const selected = commonShotguns.find(gun => gun.name === value);
    if (selected) {
      setSelectedGun(value);
      setGunWeight(selected.weight.toString());
    }
  };

  const calculateRecoil = async () => {
    if (!loadData || !gunWeight || !muzzleVelocity) {
      setError("Vänligen fyll i både vapenvikt och mynningshastighet");
      return;
    }

    if (!loadData.shotWeight || !loadData.powderWeight) {
      setError("Laddningen saknar nödvändig information om hagel- eller krutvikt");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analysis/results/recoil`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shot_weight: parseFloat(loadData.shotWeight),
          powder_weight: parseFloat(loadData.powderWeight),
          gun_weight: parseFloat(gunWeight),
          muzzle_velocity: parseFloat(muzzleVelocity) * 3.28084 // Konvertera m/s till fps
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Kunde inte beräkna rekyl");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!loadData) {
    return (
      <Alert className="m-4 bg-military-700 border-military-600">
        <Info className="h-5 w-5" />
        <AlertDescription>
          <h3 className="font-semibold mb-2">Hur man använder rekylanalysen</h3>
          <p className="text-sm">
            För att beräkna rekylen behöver du först skapa en laddning med följande information:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>Hagelvikt (gram)</li>
            <li>Krutvikt (gram)</li>
          </ul>
          <p className="text-sm mt-2">
            Gå till "Laddningar" i menyn och skapa en ny laddning eller välj en befintlig för att analysera dess rekyl.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Laddningsdata */}
      <div className="bg-military-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">
          Laddningsdata
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Hagelvikt:</p>
            <p className="text-gray-100 font-medium">{loadData.shotWeight} g</p>
          </div>
          <div>
            <p className="text-gray-400">Krutvikt:</p>
            <p className="text-gray-100 font-medium">{loadData.powderWeight} g</p>
          </div>
        </div>
      </div>

      {/* Vapendata */}
      <div className="bg-military-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Vapendata
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Välj hagelgevär
            </label>
            <Select onValueChange={handleGunSelect} value={selectedGun}>
              <SelectTrigger className="w-full bg-military-800 border-military-600 text-gray-100">
                <SelectValue placeholder="Välj hagelgevär" />
              </SelectTrigger>
              <SelectContent className="bg-military-800 border-military-600">
                {commonShotguns.map((gun) => (
                  <SelectItem key={gun.name} value={gun.name} className="text-gray-100 hover:bg-military-700">
                    {gun.name} ({gun.weight} kg)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Vapenvikt (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={gunWeight}
                onChange={(e) => setGunWeight(e.target.value)}
                className="w-full px-3 py-2 bg-military-800 border border-military-600 rounded text-gray-100"
                placeholder="3.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Mynningshastighet (m/s)
              </label>
              <input
                type="number"
                step="1"
                value={muzzleVelocity}
                onChange={(e) => setMuzzleVelocity(e.target.value)}
                className="w-full px-3 py-2 bg-military-800 border border-military-600 rounded text-gray-100"
                placeholder="400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Beräkningsknapp */}
      <div className="flex justify-center">
        <button
          onClick={calculateRecoil}
          disabled={loading}
          className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Beräknar...
            </>
          ) : (
            <>
              <Calculator className="h-5 w-5 mr-2" />
              Beräkna rekyl
            </>
          )}
        </button>
      </div>

      {/* Felmeddelande */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Resultat */}
      {results && (
        <div className="bg-military-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Rekylanalys
          </h3>
          <RecoilVisualizer results={results} />
        </div>
      )}

      {/* Referensvärden */}
      <div className="bg-military-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Info className="h-5 w-5" />
          Referensvärden för rekyl
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-military-800 p-4 rounded-lg">
            <h4 className="text-green-500 font-semibold mb-2">Lätt rekyl</h4>
            <p className="text-sm text-gray-300 mb-1">Exempel: {recoilReferences.light.example}</p>
            <p className="text-sm text-gray-300 mb-1">Energi: {recoilReferences.light.energy}</p>
            <p className="text-xs text-gray-400">{recoilReferences.light.description}</p>
          </div>
          <div className="bg-military-800 p-4 rounded-lg">
            <h4 className="text-yellow-500 font-semibold mb-2">Måttlig rekyl</h4>
            <p className="text-sm text-gray-300 mb-1">Exempel: {recoilReferences.moderate.example}</p>
            <p className="text-sm text-gray-300 mb-1">Energi: {recoilReferences.moderate.energy}</p>
            <p className="text-xs text-gray-400">{recoilReferences.moderate.description}</p>
          </div>
          <div className="bg-military-800 p-4 rounded-lg">
            <h4 className="text-red-500 font-semibold mb-2">Kraftig rekyl</h4>
            <p className="text-sm text-gray-300 mb-1">Exempel: {recoilReferences.heavy.example}</p>
            <p className="text-sm text-gray-300 mb-1">Energi: {recoilReferences.heavy.energy}</p>
            <p className="text-xs text-gray-400">{recoilReferences.heavy.description}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Obs: Rekylvärdena är ungefärliga och kan variera beroende på vapnets vikt, mynningshastighet och andra faktorer. 
          Använd dessa värden som riktlinjer snarare än exakta gränser.
        </p>
      </div>
    </div>
  );
} 