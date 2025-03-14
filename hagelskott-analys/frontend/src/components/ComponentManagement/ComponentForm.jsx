import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera } from 'lucide-react';

/**
 * ComponentForm
 * =============
 * Ett formulär för att skapa eller uppdatera en komponent (t.ex. primer, powder, etc.).
 *
 * Props:
 *  - onSubmit: async-funktion som tar emot ett FormData-objekt och sköter POST/PUT
 *  - initialData: existerande data (vid redigering) eller null för ny komponent
 *
 * Användning:
 *  <ComponentForm
 *    onSubmit={handleSubmit}
 *    initialData={someDataOrNull}
 *  />
 */
const ComponentForm = ({ onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState(
    initialData || {
      name: '',
      type: 'primer',
      manufacturer: '',
      description: '',
      caliber: '12',
      image: null,
      properties: {
        weight: '',
        height: '',
        diameter: '',
        material: '',
        burnRate: '',
        density: ''
      }
    }
  );
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Om initialData skulle uppdateras externt (t.ex. när man byter komponent att redigera)
   * kan vi uppdatera formData här:
   */
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData?.image && typeof initialData.image === 'string') {
        setImagePreview(initialData.image); // Om en URL
      }
    }
  }, [initialData]);

  /**
   * handleInputChange
   * -----------------
   * Uppdaterar state för enkla textfält samt fält inbäddade i "properties".
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Om fältet heter t.ex. "properties.weight" => splitta
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  /**
   * handleImageUpload
   * -----------------
   * Hanterar vald fil och visar en förhandsgranskning.
   */
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Bilden får max vara 5MB i storlek.');
      return;
    }

    // Läs in filen som en data-URL för förhandsgranskning:
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);

    // Spara filen i vårt form-data-objekt
    setFormData((prev) => ({
      ...prev,
      image: file
    }));
  };

  /**
   * handleSubmit
   * ------------
   * Bygger upp ett FormData-objekt och anropar props.onSubmit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const formDataToSend = new FormData();

      // Loopar över top-level keys i vårt "formData":
      for (const [key, value] of Object.entries(formData)) {
        if (key === 'properties' && typeof value === 'object') {
          // Egenskaper serialiseras till JSON
          formDataToSend.append(key, JSON.stringify(value));
        } else if (key === 'image' && value) {
          // Fil
          formDataToSend.append('image', value);
        } else {
          // Vanliga strängar
          formDataToSend.append(key, value);
        }
      }

      await onSubmit(formDataToSend);
    } catch (err) {
      setError(err?.message || 'Ett oväntat fel uppstod vid sparande.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Felmeddelande */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Textfält & Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Namn */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Namn
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Ex: 'Federal 209A'"
            required
          />
        </div>

        {/* Typ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Typ av komponent
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
          >
            <option value="primer">Tändhatt</option>
            <option value="powder">Krut</option>
            <option value="wad">Förladdning</option>
            <option value="shot">Hagel</option>
            <option value="hull">Hylsa</option>
            <option value="spacer">Mellanlägg</option>
            <option value="slug">Slug</option>
            <option value="firearm">Vapen</option>
            {/* ... lägg till fler om du vill */}
          </select>
        </div>

        {/* Tillverkare */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tillverkare
          </label>
          <input
            type="text"
            name="manufacturer"
            value={formData.manufacturer}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Ex: 'Federal'"
          />
        </div>

        {/* Kaliber (om relevant) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kaliber (om tillämpligt)
          </label>
          <input
            type="text"
            name="caliber"
            value={formData.caliber}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Ex: '12', '20' eller '.308'"
          />
        </div>

        {/* Beskrivning (hela col-span-2 i orginalet, men vi anpassar */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beskrivning
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Ev. övrig info"
          />
        </div>
      </div>

      {/* Bilduppladdning */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Produktbild
        </label>
        <div className="flex items-center space-x-4">
          <div className="relative w-32 h-32 bg-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Förhandsgranskning"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Camera className="w-10 h-10" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <div className="text-xs text-gray-500">
            Klicka för att ladda upp en bild (max 5MB)
          </div>
        </div>
      </div>

      {/* Egenskaper (properties) */}
      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Egenskaper</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vikt */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Vikt (g)
            </label>
            <input
              type="number"
              name="properties.weight"
              value={formData.properties.weight}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring focus:ring-blue-200"
              step="0.1"
              placeholder="Ex: 28"
            />
          </div>
          {/* Höjd */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Höjd (mm)
            </label>
            <input
              type="number"
              name="properties.height"
              value={formData.properties.height}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring focus:ring-blue-200"
              step="0.1"
              placeholder="Ex: 70"
            />
          </div>
          {/* Diameter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Diameter (mm)
            </label>
            <input
              type="number"
              name="properties.diameter"
              value={formData.properties.diameter}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring focus:ring-blue-200"
              step="0.1"
              placeholder="Ex: 18.5"
            />
          </div>
          {/* Material */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Material
            </label>
            <input
              type="text"
              name="properties.material"
              value={formData.properties.material}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="Ex: stål, bly, mässing..."
            />
          </div>
          {/* Bränn-hastighet / burnRate */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Bränn-hastighet
            </label>
            <input
              type="text"
              name="properties.burnRate"
              value={formData.properties.burnRate}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="Ex: 'snabb', 'medium', 'långsam'..."
            />
          </div>
          {/* Densitet */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Densitet (g/cm³)
            </label>
            <input
              type="number"
              name="properties.density"
              value={formData.properties.density}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring focus:ring-blue-200"
              step="0.01"
              placeholder="Ex: 1.13"
            />
          </div>
        </div>
      </div>

      {/* Knappar */}
      <div className="flex justify-end gap-4 mt-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
        >
          Avbryt
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          {initialData ? 'Uppdatera' : 'Skapa'} komponent
        </button>
      </div>
    </form>
  );
};

export default ComponentForm;
