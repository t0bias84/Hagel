import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Camera, AlertCircle, Loader2, CheckCircle, UploadCloud, Lightbulb } from "lucide-react";
import { predefinedFirearms } from "@/data/firearms";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";

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
  const { language } = useLanguage(); // Hämta språk
  const t = language === "en" ? en : sv; // Hämta rätt översättningsobjekt

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // States
  const [apiFirearms, setApiFirearms] = useState([]);
  const [allLoads, setAllLoads] = useState([]);
  const [selectedFirearm, setSelectedFirearm] = useState("");
  const [selectedChoke, setSelectedChoke] = useState("Modified");
  const [ammoType, setAmmoType] = useState("factory");

  // Factory ammo state
  const [factoryData, setFactoryData] = useState({
    manufacturer: "",
    modelName: "",
    gauge: "12",
    hullLength: "70",
    shotWeight: "",
    shotSize: "",
  });

  // Handload state
  const [selectedLoadId, setSelectedLoadId] = useState("");

  // Conditions state
  const [distance, setDistance] = useState("");
  const [temperature, setTemperature] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [windDirection, setWindDirection] = useState("");
  const [weatherNotes, setWeatherNotes] = useState("");

  // Image state
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Kombinera standardvapen och API-hämtade vapen
  const availableFirearms = React.useMemo(() => {
    // Ta bort eventuella duplicerade ID:n, API-versionen prioriteras om samma _id finns
    const apiIds = new Set(apiFirearms.map(f => f._id));
    const uniquePredefined = predefinedFirearms.filter(pf => !apiIds.has(pf._id));
    return [...uniquePredefined, ...apiFirearms].sort((a, b) => {
      // Sortera alfabetiskt på tillverkare och sedan modell
      const manuA = a.manufacturer.toLowerCase();
      const manuB = b.manufacturer.toLowerCase();
      if (manuA < manuB) return -1;
      if (manuA > manuB) return 1;
      const modelA = a.model.toLowerCase();
      const modelB = b.model.toLowerCase();
      if (modelA < modelB) return -1;
      if (modelA > modelB) return 1;
      return 0;
    });
  }, [apiFirearms]);

  // Fetch firearms and loads on mount
  useEffect(() => {
    async function fetchData() {
      setIsFetchingInitialData(true);
      setError(null);
      try {
        const token = localStorage.getItem("token") || "";
        if (!token) throw new Error(t.upload.errors.noAuthToken || "Authentication token missing.");

        // Fetch firearms from API
        const firearmsResp = await fetch(
          `${API_URL}/api/components/?ctype=firearm`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!firearmsResp.ok) throw new Error(t.upload.errors.fetchFirearmsFailed || "Could not fetch firearms.");
        const firearmsData = await firearmsResp.json();
        setApiFirearms(Array.isArray(firearmsData) ? firearmsData : []);

        // Fetch loads from API
        const loadsResp = await fetch(
          `${API_URL}/api/loads/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!loadsResp.ok) throw new Error(t.upload.errors.fetchLoadsFailed || "Could not fetch loads.");
        const loadsData = await loadsResp.json();
        setAllLoads(Array.isArray(loadsData) ? loadsData : []);

      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError(`${t.upload.errors.loadDataFailed || "Could not load data"}: ${err.message}.`);
        setApiFirearms([]);
        setAllLoads([]);
      } finally {
        setIsFetchingInitialData(false);
      }
    }
    fetchData();
  }, [API_URL, t]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else if (file) {
        setError(t.upload.errors.invalidFileType || "Invalid file type. Please select an image file (e.g., JPG, PNG).");
        setImageFile(null);
        setPreview(null);
        e.target.value = null;
    } else {
        setImageFile(null);
        setPreview(null);
    }
  };

  const handleFactoryDataChange = (e) => {
    const { name, value } = e.target;
    setFactoryData(prev => ({ ...prev, [name]: value }));
  };

  const clearForm = useCallback(() => {
      setPreview(null);
      setImageFile(null);
      setSelectedFirearm("");
      setSelectedChoke("Modified");
      setAmmoType("factory");
      setFactoryData({ manufacturer: "", modelName: "", gauge: "12", hullLength: "70", shotWeight: "", shotSize: "" });
      setSelectedLoadId("");
      setDistance("");
      setTemperature("");
      setWindSpeed("");
      setWindDirection("");
      setWeatherNotes("");
      setError(null);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      setError(t.upload.errors.imageRequired || "You must upload an image of the pattern.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error(t.upload.errors.loginRequired || "You must be logged in to upload.");

      const formData = new FormData();
      formData.append("file", imageFile);

      let ammunitionObject = {};
      if (ammoType === "factory") {
        if (!factoryData.manufacturer || !factoryData.modelName) {
        }
        ammunitionObject = {
          type: "factory",
          manufacturer: factoryData.manufacturer || undefined,
          modelName: factoryData.modelName || undefined,
          gauge: factoryData.gauge ? parseInt(factoryData.gauge) : 12,
          hullLength: factoryData.hullLength ? parseFloat(factoryData.hullLength) : 70,
          shot_weight_grams: factoryData.shotWeight ? parseFloat(factoryData.shotWeight) : undefined,
          shot_size_eu: factoryData.shotSize || undefined,
        };
      } else {
        if (!selectedLoadId) {
          throw new Error(t.upload.errors.handloadRequired || "Please select a handload.");
        }
        ammunitionObject = {
          type: "handload",
          load_id: selectedLoadId,
        };
      }

      let shotgunObject = {};
      if (!selectedFirearm) {
        shotgunObject = {
            choke: selectedChoke
        };
        console.warn("Inget specifikt vapen valt, skickar endast choke.");
      } else {
        shotgunObject = {
          firearm_id: selectedFirearm,
          choke: selectedChoke,
        };
      }

      const metadataObject = {
        shotgun: shotgunObject,
        ammunition: ammunitionObject,
        distance: distance ? parseInt(distance) : undefined,
        conditions: {
          temperature_celsius: temperature ? parseFloat(temperature) : undefined,
          wind_speed_mps: windSpeed ? parseFloat(windSpeed) : undefined,
          wind_direction: windDirection || undefined,
          notes: weatherNotes || undefined,
        },
      };

      try {
          formData.append("metadata", JSON.stringify(metadataObject));
      } catch (stringifyError) {
          console.error("Error stringifying metadata:", stringifyError, metadataObject);
          throw new Error(t.upload.errors.metadataError || "Could not prepare metadata for upload.");
      }

      const url = `${API_URL}/api/analysis/upload`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!resp.ok) {
        let errorDetail = `${t.upload.errors.serverError || 'Server error'}: ${resp.status}`;
        try {
          const errData = await resp.json();
          errorDetail = errData.detail || errorDetail;
        } catch (jsonError) {
          errorDetail = `${errorDetail} - ${t.upload.errors.parseError || 'Could not parse error response from server.'}`;
          console.error("Non-JSON error response:", await resp.text());
        }
        throw new Error(errorDetail);
      }

      const result = await resp.json();
      setSuccessMessage(`${t.upload.successMessage || 'Analysis (ID: {id}) created! Redirecting...'}`.replace("{id}", result.id));
      clearForm();

      setTimeout(() => {
        if (result.id) {
          navigate(`/analysis/${result.id}`);
        } else {
            console.error("No ID received from server after upload.");
            setError(t.upload.errors.redirectFailed || "Upload succeeded, but could not redirect automatically.");
            setSuccessMessage(t.upload.successMessageNoRedirect || "Analysis uploaded! You can find it in the analysis list.");
        }
      }, 2000);

    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || (t.upload.errors.unknownUploadError || "An unexpected error occurred during upload."));
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingInitialData) {
    return (
        <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2 text-muted-foreground">{t.upload.loadingData || "Loading firearm and load data..."}</p>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 text-foreground">
      <h1 className="text-2xl font-semibold mb-4 text-foreground">{t.upload.title || "Upload New Shot Analysis"}</h1>

       {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.common.error || "Error"}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>{t.common.success || "Success!"}</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">{t.upload.imageSectionTitle || "1. Upload Image"}</CardTitle>
            <CardDescription className="text-muted-foreground">{t.upload.imageDescription || "Select a clear image of the target (.jpg, .png)."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Label htmlFor="image-upload" className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer ${preview ? 'border-primary' : 'border-border/50 hover:border-primary/80'} bg-card hover:bg-muted/50 transition-colors`}>
                {preview ? (
                    <img src={preview} alt={t.upload.imagePreviewAlt || "Preview"} className="max-h-full max-w-full object-contain rounded-lg" />
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <UploadCloud className="w-10 h-10 mb-3 text-gray-500 dark:text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">{t.upload.imageUploadClick || "Click to upload"}</span> {t.upload.imageUploadOrDrag || "or drag and drop"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t.upload.imageUploadHint || "PNG, JPG (max 10MB)"}</p>
                    </div>
                )}
                <Input id="image-upload" type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleImageChange} />
            </Label>
            {imageFile && <p className="text-sm text-muted-foreground">{t.upload.selectedFileLabel || "Selected file"}: {imageFile.name}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">{t.upload.firearmSectionTitle || "2. Firearm and Choke"}</CardTitle>
            <CardDescription className="text-muted-foreground">{t.upload.firearmDescription || "Select the firearm and choke used."}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firearm-select" className="text-foreground/90">{t.upload.firearmLabel || "Firearm (Optional)"}</Label>
              <Select value={selectedFirearm} onValueChange={setSelectedFirearm}>
                <SelectTrigger id="firearm-select">
                  <SelectValue placeholder={t.upload.firearmPlaceholder || "Select a saved firearm..."} />
                </SelectTrigger>
                <SelectContent portalled={false}>
                  {availableFirearms.length === 0 && <SelectItem value="no-firearms-available" disabled>{t.upload.noFirearmsFound || "No firearms defined"}</SelectItem>}
                  {availableFirearms.map((fw) => (
                    <SelectItem key={fw._id} value={fw._id}>
                      {fw.manufacturer} {fw.model} ({fw.gauge}ga, {fw.barrelLength}cm)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="choke-select" className="text-foreground/90">{t.upload.chokeLabel || "Choke"}</Label>
              <Select value={selectedChoke} onValueChange={setSelectedChoke}>
                <SelectTrigger id="choke-select">
                  <SelectValue placeholder={t.upload.chokePlaceholder || "Select choke..."} />
                </SelectTrigger>
                <SelectContent portalled={false}>
                  {CHOKE_OPTIONS.map((choke) => (
                    <SelectItem key={choke.value} value={choke.value}>
                      {choke.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">{t.upload.ammoSectionTitle || "3. Ammunition"}</CardTitle>
            <CardDescription className="text-muted-foreground">{t.upload.ammoDescription || "Provide information about the ammunition."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={ammoType} onValueChange={setAmmoType} className="flex space-x-4 mb-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="factory" id="factory-ammo" />
                <Label htmlFor="factory-ammo" className="text-foreground/90">{t.upload.ammoTypeFactory || "Fabriksladdad"}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="handload" id="handload-ammo" />
                <Label htmlFor="handload-ammo" className="text-foreground/90">{t.upload.ammoTypeHandload || "Handladdad (från dina sparade laddningar)"}</Label>
              </div>
            </RadioGroup>

            {ammoType === "factory" && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                 <h4 className="font-medium mb-2 text-foreground">{t.upload.factoryDataTitle || "Fabriksladdad Data"}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer" className="text-foreground/90">{t.upload.manufacturerLabel || "Tillverkare"}</Label>
                    <Input id="manufacturer" name="manufacturer" value={factoryData.manufacturer} onChange={handleFactoryDataChange} placeholder={t.upload.manufacturerPlaceholder || "ex. Gyttorp"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelName" className="text-foreground/90">{t.upload.modelNameLabel || "Modellnamn"}</Label>
                    <Input id="modelName" name="modelName" value={factoryData.modelName} onChange={handleFactoryDataChange} placeholder={t.upload.modelNamePlaceholder || "ex. Röda Rask"} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="shotWeight" className="text-foreground/90">{t.upload.shotWeightLabel || "Hagel Vikt (gram)"}</Label>
                    <Input id="shotWeight" name="shotWeight" type="number" step="0.1" value={factoryData.shotWeight} onChange={handleFactoryDataChange} placeholder={t.upload.shotWeightPlaceholder || "ex. 32"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shotSize" className="text-foreground/90">{t.upload.shotSizeLabel || "Hagel Storlek (EU)"}</Label>
                    <Input id="shotSize" name="shotSize" value={factoryData.shotSize} onChange={handleFactoryDataChange} placeholder={t.upload.shotSizePlaceholder || "ex. 7"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gauge" className="text-foreground/90">{t.upload.gaugeLabel || "Kaliber (Gauge)"}</Label>
                    <Input id="gauge" name="gauge" type="number" value={factoryData.gauge} onChange={handleFactoryDataChange} placeholder="12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hullLength" className="text-foreground/90">{t.upload.hullLengthLabel || "Hylslängd (mm)"}</Label>
                    <Input id="hullLength" name="hullLength" type="number" value={factoryData.hullLength} onChange={handleFactoryDataChange} placeholder="70" />
                  </div>
                </div>
              </div>
            )}

            {ammoType === "handload" && (
              <div className="space-y-2 p-4 border rounded-md bg-muted/20">
                 <h4 className="font-medium mb-2 text-foreground">{t.upload.handloadDataTitle || "Select Saved Handload"}</h4>
                 {allLoads.length > 0 ? (
                     <Select value={selectedLoadId} onValueChange={setSelectedLoadId}>
                       <SelectTrigger>
                         <SelectValue placeholder={t.upload.handloadPlaceholder || "Select a saved handload..."} />
                       </SelectTrigger>
                       <SelectContent portalled={false}>
                         {allLoads.map((load) => (
                           <SelectItem key={load._id} value={load._id}>
                             {load.name} ({load.components?.shot?.weight_grams || "?"}g, #{load.components?.shot?.size_eu || "?"})
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                 ) : (
                     <p className="text-sm text-foreground/80 mt-2 p-2 border rounded-md bg-background">
                         {t.upload.noHandloadsFound || "You have no saved handloads. Create one under Load Data."}
                     </p>
                 )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">{t.upload.conditionsSectionTitle || "4. Shooting Conditions (Optional)"}</CardTitle>
            <CardDescription className="text-muted-foreground">{t.upload.conditionsDescription || "Provide information about the conditions during the shot."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="distance" className="text-foreground/90">{t.upload.distanceLabel || "Avstånd (meter)"}</Label>
                    <Input id="distance" type="number" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder={t.upload.distancePlaceholder || "ex. 35"} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="temperature" className="text-foreground/90">{t.upload.temperatureLabel || "Temperatur (°C)"}</Label>
                    <Input id="temperature" type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder={t.upload.temperaturePlaceholder || "ex. 15"} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="windSpeed" className="text-foreground/90">{t.upload.windSpeedLabel || "Vindhastighet (m/s)"}</Label>
                    <Input id="windSpeed" type="number" step="0.1" value={windSpeed} onChange={(e) => setWindSpeed(e.target.value)} placeholder={t.upload.windSpeedPlaceholder || "ex. 3.5"} />
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                    <Label htmlFor="windDirection" className="text-foreground/90">{t.upload.windDirectionLabel || "Vindriktning"}</Label>
                    <Input id="windDirection" value={windDirection} onChange={(e) => setWindDirection(e.target.value)} placeholder={t.upload.windDirectionPlaceholder || "ex. NV eller 315°"} />
                </div>
             </div>
             <div className="space-y-2">
                <Label htmlFor="weatherNotes" className="text-foreground/90">{t.upload.weatherNotesLabel || "Övriga anteckningar om väder/förhållanden"}</Label>
                <Textarea id="weatherNotes" value={weatherNotes} onChange={(e) => setWeatherNotes(e.target.value)} placeholder={t.upload.weatherNotesPlaceholder || "ex. Lätt regn, mulet..."} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/10 border-primary/20">
          <CardHeader className="flex flex-row items-center space-x-3 pb-3">
             <Lightbulb className="w-5 h-5 text-primary" />
            <CardTitle className="text-foreground">{t.upload.tipsTitle || "Tips for Best Results"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>{t.upload.tip1 || "Use a clear, high-contrast target (e.g., white paper with black markings)."}</li>
              <li>{t.upload.tip2 || "Ensure the target is flat and perpendicular to the direction of the shot."}</li>
              <li>{t.upload.tip3 || "Photograph the target straight-on, avoiding angled shots."}</li>
              <li>{t.upload.tip4 || "Ensure good, even lighting without harsh shadows or glare."}</li>
              <li>{t.upload.tip5 || "If possible, include an object of known size (like a ruler) in the photo for scale calibration."}</li>
               <li>{t.upload.tip6 || "Use the highest resolution possible on your camera."}</li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !imageFile} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.common.loading || "Loading..."}
              </>
            ) : (
              t.upload.submitButton || "Starta Analys"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
