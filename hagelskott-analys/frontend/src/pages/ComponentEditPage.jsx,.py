import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft, Camera } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";


export default function ComponentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [componentData, setComponentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // För ny bild (uppladdning) & förhandsvisning
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Hämta befintlig komponent-data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:8000/api/components/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error("Kunde inte hämta komponent.");
        }
        const data = await res.json();
        setComponentData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Hantera filändring
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      // Skapa en förhandsvisning
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(f);
    }
  };

  // PUT/uppdatera vid submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!componentData) return;

    try {
      setError(null);
      const token = localStorage.getItem("token");

      // Använd FormData för att kunna skicka bild + övriga fält
      const formData = new FormData();
      formData.append("name", componentData.name);
      formData.append("type", componentData.type);
      formData.append("manufacturer", componentData.manufacturer || "");
      formData.append("description", componentData.description || "");
      formData.append("caliber", componentData.caliber || "");
      formData.append("category", componentData.category || "");
      // Om du har "properties" som JSON
      formData.append("properties", JSON.stringify(componentData.properties || {}));
      // isAvailable etc. om ni använder det
      if (componentData.isAvailable !== undefined) {
        formData.append("isAvailable", componentData.isAvailable);
      }
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch(`http://localhost:8000/api/components/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
          // Inget "Content-Type": "application/json" här, eftersom vi skickar FormData
        },
        body: formData
      });
      if (!res.ok) {
        throw new Error("Kunde inte uppdatera komponenten.");
      }

      // Tillbaka till listan eller annan vy
      navigate("/upload-components");
    } catch (err) {
      setError(err.message);
    }
  };

  // Render-scenarier
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-200">Laddar komponent...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Gå tillbaka
        </button>
      </div>
    );
  }

  if (!componentData) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center text-gray-300">
        Ingen komponentdata
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-military-900 text-gray-100">
      <div className="container mx-auto p-6 max-w-3xl">
        {/* Tillbaka-knapp */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm text-gray-300 hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka
        </button>

        <h1 className="text-2xl font-bold mb-6">
          Redigera komponent: {componentData.name}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Namn */}
          <div>
            <label className="block text-sm font-medium mb-1">Namn</label>
            <input
              type="text"
              value={componentData.name || ""}
              onChange={(e) =>
                setComponentData({ ...componentData, name: e.target.value })
              }
              className="w-full bg-military-700 border border-military-600 rounded py-2 px-3 text-gray-100"
              required
            />
          </div>

          {/* Typ */}
          <div>
            <label className="block text-sm font-medium mb-1">Typ</label>
            <input
              type="text"
              value={componentData.type || ""}
              onChange={(e) =>
                setComponentData({ ...componentData, type: e.target.value })
              }
              className="w-full bg-military-700 border border-military-600 rounded py-2 px-3 text-gray-100"
              required
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-sm font-medium mb-1">Kategori</label>
            <input
              type="text"
              value={componentData.category || ""}
              onChange={(e) =>
                setComponentData({ ...componentData, category: e.target.value })
              }
              className="w-full bg-military-700 border border-military-600 rounded py-2 px-3 text-gray-100"
            />
          </div>

          {/* Tillverkare */}
          <div>
            <label className="block text-sm font-medium mb-1">Tillverkare</label>
            <input
              type="text"
              value={componentData.manufacturer || ""}
              onChange={(e) =>
                setComponentData({ ...componentData, manufacturer: e.target.value })
              }
              className="w-full bg-military-700 border border-military-600 rounded py-2 px-3 text-gray-100"
            />
          </div>

          {/* Kaliber */}
          <div>
            <label className="block text-sm font-medium mb-1">Kaliber</label>
            <input
              type="text"
              value={componentData.caliber || ""}
              onChange={(e) =>
                setComponentData({ ...componentData, caliber: e.target.value })
              }
              className="w-full bg-military-700 border border-military-600 rounded py-2 px-3 text-gray-100"
            />
          </div>

          {/* Beskrivning */}
          <div>
            <label className="block text-sm font-medium mb-1">Beskrivning</label>
            <textarea
              rows={3}
              value={componentData.description || ""}
              onChange={(e) =>
                setComponentData({ ...componentData, description: e.target.value })
              }
              className="w-full bg-military-700 border border-military-600 rounded py-2 px-3 text-gray-100"
            />
          </div>

          {/* Bild */}
          <div>
            <label className="block text-sm font-medium mb-1">Bild</label>
            <div className="flex items-center gap-4">
              <div className="relative w-32 h-32 bg-military-700 rounded overflow-hidden">
                {/* Om vi har en ny fil-preview */}
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Ny bild"
                    className="w-full h-full object-cover"
                  />
                ) : componentData.image?.url ? (
                  <img
                    src={componentData.image.url}
                    alt={componentData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <div className="text-sm text-gray-400">
                Klicka för att välja ny bild
              </div>
            </div>
          </div>

          {/* Egenskaper / properties (om ni vill redigera dem) */}
          {componentData.properties && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Egenskaper (JSON)
              </label>
              <textarea
                rows={4}
                value={JSON.stringify(componentData.properties, null, 2)}
                onChange={(e) => {
                  try {
                    const val = JSON.parse(e.target.value);
                    setComponentData({ ...componentData, properties: val });
                    // Rensa eventuellt error om det uppstod pga JSON
                  } catch (jsonErr) {
                    setError("Ogiltig JSON i egenskaper.");
                  }
                }}
                className="w-full bg-military-700 border border-military-600 rounded py-2 px-3 text-gray-100 font-mono text-xs"
              />
              {error && error.startsWith("Ogiltig JSON") && (
                <p className="text-red-300 text-sm mt-1">{error}</p>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-military-700 rounded text-gray-100 hover:bg-military-600"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Spara ändringar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
