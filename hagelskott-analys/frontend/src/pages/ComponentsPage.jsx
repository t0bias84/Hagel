import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  AlertCircle,
  Search,
  Camera,
  XCircle,
  Loader2,
  Edit,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { fieldDefinitions } from "@/config/fieldDefinitions";

export default function ComponentsPage() {
  const navigate = useNavigate();

  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Nytt formulär ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Filtrering & sök
  const [selectedType, setSelectedType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Ny komponent “default”
  const [newComponent, setNewComponent] = useState({
    name: "",
    type: "powder",
    category: "Ammunition",
    manufacturer: "",
    description: "",
    caliber: "",
    image: null,      // fil
    properties: {},
  });

  // Exempeltyper
  const componentTypes = [
    { id: "primer", name: "Tändhattar", category: "Ammunition" },
    { id: "powder", name: "Krut", category: "Ammunition" },
    { id: "wad", name: "Förladdning", category: "Ammunition" },
    { id: "shot", name: "Hagel", category: "Ammunition" },
    { id: "hull", name: "Hylsor", category: "Ammunition" },
    { id: "firearm", name: "Vapen", category: "Utrustning" },
  ];

  // Gruppera typer efter category
  const groupedTypes = useMemo(() => {
    return componentTypes.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    }, {});
  }, [componentTypes]);

  // ================== Hämtar komponenter ==================
  const fetchComponents = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/components", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Kunde inte hämta komponenter");

      const data = await res.json();
      // Sortera
      data.sort((a, b) => a.name.localeCompare(b.name));
      setComponents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  // ================== Bilduppladdning ==================
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Ladda upp en preview
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);

      // Sätt filen i newComponent
      setNewComponent((prev) => ({ ...prev, image: file }));
    }
  };

  // ================== Skapa ny komponent (POST) ==================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", newComponent.name);
      formData.append("type", newComponent.type);
      formData.append("manufacturer", newComponent.manufacturer);
      formData.append("description", newComponent.description);
      formData.append("caliber", newComponent.caliber);
      formData.append("category", newComponent.category);

      // Skicka med "properties" i JSON
      formData.append("properties", JSON.stringify(newComponent.properties || {}));

      // Ev. bild
      if (newComponent.image) {
        formData.append("file", newComponent.image);
      }

      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/components", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Kunde inte spara komponenten");

      // Hämta lista igen
      await fetchComponents();
      setShowAddForm(false);

      // Nollställ formulär
      setNewComponent({
        name: "",
        type: "powder",
        category: "Ammunition",
        manufacturer: "",
        description: "",
        caliber: "",
        image: null,
        properties: {},
      });
      setImagePreview(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // ================== Radera ==================
  const handleDelete = async (id) => {
    if (!window.confirm("Vill du verkligen ta bort?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/api/components/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Kunde inte ta bort komponenten");
      setComponents((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // ================== Redigera (navigate) ==================
  const handleEdit = (id) => {
    navigate(`/components/edit/${id}`);
  };

  // ================== Filtrering + sök ==================
  const filteredComponents = useMemo(() => {
    return components.filter((comp) => {
      if (selectedType !== "all" && comp.type !== selectedType) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const bigString =
          (comp.name + comp.manufacturer + comp.description).toLowerCase();
        return bigString.includes(term);
      }
      return true;
    });
  }, [components, selectedType, searchTerm]);

  const clearSearch = () => setSearchTerm("");

  // Dynamiska property-fält
  const dynamicFields = useMemo(() => {
    const def = fieldDefinitions[newComponent.type];
    if (!def) return null;
    return def.fields || [];
  }, [newComponent.type]);

  // ================== Render ==================
  return (
    <div className="min-h-screen bg-military-900 text-gray-100">
      <div className="container mx-auto p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Komponenter</h1>
          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-military-600 text-white rounded hover:bg-military-500 transition"
          >
            <Plus className="h-4 w-4" />
            Ny komponent
          </button>
        </div>

        {/* Felmeddelande */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Laddar... */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-300 mb-4">
            <Loader2 className="h-5 w-5 animate-spin text-green-400" />
            <span>Laddar komponenter...</span>
          </div>
        )}

        {/* Filtersektion */}
        <div className="bg-military-800 rounded-md p-4 mb-6 flex flex-col sm:flex-row gap-4">
          {/* Sökfält */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Sök..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 w-full rounded bg-military-700 border border-military-600 text-gray-100 placeholder-gray-400 py-2"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Välj typ */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full sm:w-auto rounded bg-military-700 border border-military-600 text-gray-100 py-2 px-3"
          >
            <option value="all">Alla typer</option>
            {Object.entries(groupedTypes).map(([cat, types]) => (
              <optgroup key={cat} label={cat}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Formulär för ny komponent */}
        {showAddForm && (
          <div className="bg-military-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Lägg till ny komponent</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Namn */}
                <div>
                  <label className="block text-sm font-medium mb-1">Namn</label>
                  <input
                    type="text"
                    required
                    value={newComponent.name}
                    onChange={(e) =>
                      setNewComponent({ ...newComponent, name: e.target.value })
                    }
                    className="w-full rounded bg-military-700 border border-military-600 text-gray-100 py-2 px-3"
                  />
                </div>

                {/* Typ */}
                <div>
                  <label className="block text-sm font-medium mb-1">Typ</label>
                  <select
                    value={newComponent.type}
                    onChange={(e) =>
                      setNewComponent({ ...newComponent, type: e.target.value })
                    }
                    className="w-full rounded bg-military-700 border border-military-600 text-gray-100 py-2 px-3"
                  >
                    {Object.entries(groupedTypes).map(([cat, types]) => (
                      <optgroup key={cat} label={cat}>
                        {types.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori</label>
                  <input
                    type="text"
                    value={newComponent.category}
                    onChange={(e) =>
                      setNewComponent({ ...newComponent, category: e.target.value })
                    }
                    className="w-full rounded bg-military-700 border border-military-600 text-gray-100 py-2 px-3"
                  />
                </div>

                {/* Tillverkare */}
                <div>
                  <label className="block text-sm font-medium mb-1">Tillverkare</label>
                  <input
                    type="text"
                    value={newComponent.manufacturer}
                    onChange={(e) =>
                      setNewComponent({ ...newComponent, manufacturer: e.target.value })
                    }
                    className="w-full rounded bg-military-700 border border-military-600 text-gray-100 py-2 px-3"
                  />
                </div>

                {/* Kaliber */}
                <div>
                  <label className="block text-sm font-medium mb-1">Kaliber</label>
                  <input
                    type="text"
                    value={newComponent.caliber}
                    onChange={(e) =>
                      setNewComponent({ ...newComponent, caliber: e.target.value })
                    }
                    className="w-full rounded bg-military-700 border border-military-600 text-gray-100 py-2 px-3"
                  />
                </div>

                {/* Beskrivning */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Beskrivning</label>
                  <textarea
                    rows={3}
                    value={newComponent.description}
                    onChange={(e) =>
                      setNewComponent({ ...newComponent, description: e.target.value })
                    }
                    className="w-full rounded bg-military-700 border border-military-600 text-gray-100 py-2 px-3"
                  />
                </div>

                {/* Bilduppladdning */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Produktbild</label>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-32 h-32 bg-military-700 rounded overflow-hidden">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Förhandsgranskning"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <p className="text-sm text-gray-400">
                      Klicka för att välja bild (max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamiska fields (properties) */}
              {dynamicFields && dynamicFields.length > 0 && (
                <div className="mt-4 p-4 bg-military-700 rounded">
                  <h4 className="font-semibold mb-2">Ytterligare egenskaper</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {dynamicFields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-xs font-medium mb-1">
                          {field.label}
                        </label>
                        <input
                          type={field.type || "text"}
                          step={field.step || undefined}
                          value={newComponent.properties[field.name] || ""}
                          onChange={(e) =>
                            setNewComponent((prev) => ({
                              ...prev,
                              properties: {
                                ...prev.properties,
                                [field.name]: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded bg-military-600 border border-military-500 text-gray-100 py-1 px-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setImagePreview(null);
                  }}
                  className="px-4 py-2 bg-military-700 rounded hover:bg-military-600 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
                >
                  Spara
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista av befintliga komponenter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComponents.map((comp) => (
            <div
              key={comp._id}
              className="bg-military-800 rounded p-4 hover:bg-military-700 transition-colors"
            >
              <div className="flex items-start gap-4">
                {comp.image?.url ? (
                  <img
                    src={comp.image.url}
                    alt={comp.name}
                    className="w-20 h-20 rounded object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-military-700 rounded flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-semibold">{comp.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(comp._id)}
                        className="text-blue-400 p-1 hover:text-blue-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(comp._id)}
                        className="text-red-400 p-1 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">{comp.manufacturer || "—"}</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="px-2 py-1 text-xs bg-military-700 rounded">
                      {comp.type}
                    </span>
                    {comp.caliber && (
                      <span className="px-2 py-1 text-xs bg-military-700 rounded">
                        Kaliber {comp.caliber}
                      </span>
                    )}
                  </div>
                  {comp.description && (
                    <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                      {comp.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Om vi inte laddar & inga filter-resultat */}
        {!loading && filteredComponents.length === 0 && (
          <p className="text-center text-gray-400 mt-6">
            Inga komponenter matchade din sökning.
          </p>
        )}
      </div>
    </div>
  );
}

