import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Label from "@/components/ui/label";
import { Camera, AlertCircle, Loader2, CheckCircle } from "lucide-react";

/**
 * Exempel på CHOKE_OPTIONS
 */
const CHOKE_OPTIONS = [
  { value: "Cylinder", label: "Cylinder" },
  { value: "Improved Cylinder", label: "Improved Cylinder" },
  { value: "Modified", label: "Modified" },
  { value: "Improved Modified", label: "Improved Modified" },
  { value: "Full", label: "Full" },
  { value: "Extra Full", label: "Extra Full" },
  { value: "Custom", label: "Custom" },
];

export default function ShotUploadForm() {
  const navigate = useNavigate();

  // Samma stater du tidigare använt
  const [firearms, setFirearms] = useState([]);
  const [allLoads, setAllLoads] = useState([]);

  const [selectedFirearm, setSelectedFirearm] = useState("");
  const [selectedChoke, setSelectedChoke] = useState("Modified");
  const [ammoType, setAmmoType] = useState("factory");

  // Fabriksladdad data
  const [factoryData, setFactoryData] = useState({
    manufacturer: "",
    modelName: "",
    gauge: "12",
    hullLength: "70",
  });

  // Handladdad => ex. "selectedLoadId"
  const [selectedLoadId, setSelectedLoadId] = useState("");

  // Skjutförhållanden
  const [distance, setDistance] = useState("");
  const [temperature, setTemperature] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [windDirection, setWindDirection] = useState("");
  const [weatherNotes, setWeatherNotes] = useState("");

  // Bild
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // UI-laddning
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Hämta firearms + loads
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem("token") || "";

        // Hämta firearms
        // valfritt om du behöver
        const firearmsResp = await fetch(
          `${import.meta.env.VITE_API_URL}/api/components?ctype=firearm`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!firearmsResp.ok) {
          throw new Error("Kunde inte hämta firearms.");
        }
        const firearmsData = await firearmsResp.json();
        setFirearms(firearmsData);

        // Hämta loads
        const loadsResp = await fetch(
          `${import.meta.env.VITE_API_URL}/api/loads`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!loadsResp.ok) {
          throw new Error("Kunde inte hämta loads.");
        }
        const loadsData = await loadsResp.json();
        setAllLoads(loadsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Du måste vara inloggad.");
      if (!imageFile) throw new Error("Välj en bild.");

      // Bygg FormData
      const formData = new FormData();
      formData.append("file", imageFile);

      // Bygg ammo
      let ammoObject = {};
      if (ammoType === "factory") {
        ammoObject = {
          type: "factory",
          manufacturer: factoryData.manufacturer || "",
          modelName: factoryData.modelName || "",
          gauge: parseInt(factoryData.gauge) || 12,
          hullLength: parseFloat(factoryData.hullLength) || 70,
        };
      } else {
        // Handload => ex. load_id
        ammoObject = {
          type: "handload",
          load_id: selectedLoadId || "",
        };
      }

      // Bygg shotgun
      let shotgunObject = {};
      if (!selectedFirearm) {
        // Ingen firearm vald => generisk
        shotgunObject = {
          manufacturer: "Generic",
          model: "Standard 12ga",
          gauge: 12,
          barrelLength: 70.0,
          choke: selectedChoke,
        };
      } else {
        shotgunObject = {
          firearm_id: selectedFirearm,
          choke: selectedChoke,
        };
      }

      // Bygg metadata
      const metaObj = {
        shotgun: shotgunObject,
        ammunition: ammoObject,
        distance: distance ? parseInt(distance) : undefined,
        weather: {
          temperature: temperature ? parseFloat(temperature) : undefined,
          wind_speed: windSpeed ? parseFloat(windSpeed) : undefined,
          wind_direction: windDirection || undefined,
          notes: weatherNotes || "",
        },
      };

      formData.append("metadata", JSON.stringify(metaObj));

      // OBS: anropa nya endpointen => /api/analysis/upload
      const url = `${import.meta.env.VITE_API_URL}/api/analysis/upload`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP-fel: ${resp.status}`);
      }

      const result = await resp.json();
      setSuccessMessage("Analysen är uppladdad och sparad!");

      // Rensa form
      setPreview(null);
      setImageFile(null);
      setSelectedFirearm("");
      setSelectedChoke("Modified");
      setAmmoType("factory");
      setFactoryData({
        manufacturer: "",
        modelName: "",
        gauge: "12",
        hullLength: "70",
      });
      setSelectedLoadId("");
      setDistance("");
      setTemperature("");
      setWindSpeed("");
      setWindDirection("");
      setWeatherNotes("");

      // Navigera till ex. /analysis/<id>
      setTimeout(() => {
        if (result.id) {
          navigate(`/analysis/${result.id}`);
        }
      }, 1500);
    } catch (err) {
      setError(err.message || "Ett fel uppstod.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Ny analys</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert variant="default" className="mb-4 flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vapen */}
            <div>
              <Label className="block mb-1">Vapen</Label>
              <select
                className="w-full border p-2 rounded"
                value={selectedFirearm}
                onChange={(e) => setSelectedFirearm(e.target.value)}
              >
                <option value="">-- Ingen vald (generisk) --</option>
                {firearms.map((fw) => (
                  <option key={fw._id} value={fw._id}>
                    {fw.name} - {fw.manufacturer}
                  </option>
                ))}
              </select>
            </div>

            {/* Choke */}
            <div>
              <Label className="block mb-1">Choke</Label>
              <select
                className="w-full border p-2 rounded"
                value={selectedChoke}
                onChange={(e) => setSelectedChoke(e.target.value)}
              >
                {CHOKE_OPTIONS.map((ch) => (
                  <option key={ch.value} value={ch.value}>
                    {ch.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ammunition */}
            <div>
              <Label className="block mb-1">Ammunitionstyp</Label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="factory"
                    checked={ammoType === "factory"}
                    onChange={(e) => setAmmoType(e.target.value)}
                  />
                  <span className="ml-2">Fabriksladdad</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="handload"
                    checked={ammoType === "handload"}
                    onChange={(e) => setAmmoType(e.target.value)}
                  />
                  <span className="ml-2">Handladdad</span>
                </label>
              </div>
            </div>

            {/* Om factory => tillverkare, modellName, gauge, hullLength */}
            {ammoType === "factory" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block mb-1">Tillverkare</Label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded"
                    value={factoryData.manufacturer}
                    onChange={(e) =>
                      setFactoryData((prev) => ({ ...prev, manufacturer: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="block mb-1">Modell</Label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded"
                    value={factoryData.modelName}
                    onChange={(e) =>
                      setFactoryData((prev) => ({ ...prev, modelName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="block mb-1">Kaliber</Label>
                  <input
                    type="number"
                    className="w-full border p-2 rounded"
                    value={factoryData.gauge}
                    onChange={(e) =>
                      setFactoryData((prev) => ({ ...prev, gauge: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="block mb-1">Hylslängd (mm)</Label>
                  <input
                    type="number"
                    className="w-full border p-2 rounded"
                    value={factoryData.hullLength}
                    onChange={(e) =>
                      setFactoryData((prev) => ({ ...prev, hullLength: e.target.value }))
                    }
                  />
                </div>
              </div>
            ) : (
              // Handload => välj befintlig load
              <div>
                <Label className="block mb-1">Välj en handladdning</Label>
                <select
                  className="w-full border p-2 rounded"
                  value={selectedLoadId}
                  onChange={(e) => setSelectedLoadId(e.target.value)}
                >
                  <option value="">-- Ingen vald --</option>
                  {allLoads.map((ld) => (
                    <option key={ld._id} value={ld._id}>
                      {ld.name} (Krut: {ld.powder_type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Bild */}
            <div>
              <Label className="block mb-1">Bild på hagelsvärm</Label>
              <div className="border-dashed border-2 p-4 flex flex-col items-center">
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    className="max-h-64 object-contain mb-2"
                  />
                ) : (
                  <Camera className="h-10 w-10 text-gray-400 mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            {/* Avstånd, temperatur, vind ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block mb-1">Avstånd (m)</Label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                />
              </div>
              <div>
                <Label className="block mb-1">Temperatur (°C)</Label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>
              <div>
                <Label className="block mb-1">Vind (m/s)</Label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(e.target.value)}
                />
              </div>
              <div>
                <Label className="block mb-1">Vindriktning</Label>
                <input
                  type="text"
                  className="w-full border p-2 rounded"
                  value={windDirection}
                  onChange={(e) => setWindDirection(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="block mb-1">Övriga anteckningar</Label>
              <textarea
                rows="3"
                className="w-full border p-2 rounded"
                value={weatherNotes}
                onChange={(e) => setWeatherNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded flex items-center"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLoading ? "Laddar..." : "Ladda upp och analysera"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
