import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * En enkel presentational-komponent för att visa en "kort"-vy av en komponent.
 * @param {object} props
 * @param {object} props.component - Ett objekt som beskriver en komponent (ex: { _id, name, manufacturer, details, height, type }).
 * @param {function} props.onClick - Callback när användaren klickar på kortet.
 * @param {boolean} props.isSelected - Markerar om kortet är aktivt/valt.
 */
const ComponentCard = ({ component, onClick, isSelected }) => {
  return (
    <div
      onClick={() => onClick(component)}
      className={`p-4 border rounded-lg cursor-pointer transition-colors 
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
    >
      <div className="flex justify-between">
        <h3 className="font-medium text-gray-900">{component.name}</h3>
        <span className="text-sm text-gray-500">{component.manufacturer}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{component.details}</p>
      {component.height > 0 && (
        <p className="text-xs text-gray-500 mt-1">Height: {component.height} mm</p>
      )}
    </div>
  );
};

/**
 * Möjliga användningsområden (Load Purposes).
 * Du kan utöka listan med egna.
 */
const LOAD_PURPOSES = [
  { id: 'clay', label: 'Clay Dove' },
  { id: 'dove', label: 'Dove Hunt' },
  { id: 'duck', label: 'Duck Hunt' },
  { id: 'roe',  label: 'Roe Hunt' },
  { id: 'boar', label: 'Boar' }
];

/**
 * Olika kategorier (typer) av komponenter som kan finnas i hagelladdning.
 */
const CATEGORIES = [
  { name: 'Primer',   type: 'primer', showQuantity: false },
  { name: 'Powder',   type: 'powder', showQuantity: true  },
  { name: 'Wad',       type: 'wad',    showQuantity: false },
  { name: 'Shot',      type: 'shot',   showQuantity: true  },
  { name: 'Spacer',    type: 'spacer', showQuantity: false },
  { name: 'Closure',   type: 'closure',showQuantity: false },
];

/**
 * ComponentSelection
 * ==================
 * En komponent som listar möjliga komponenter från backend,
 * och låter användaren:
 *  - Söka efter komponenter (via searchTerm)
 *  - Filtrera på användningsområden (selectedPurposes)
 *  - Välja en kategori och klicka på en enskild komponent
 *  - Ange vikt (g) för "powder" eller "shot"
 *  - Lägg till vald komponent i sin laddning (onAddComponent)
 */
const ComponentSelection = ({ onAddComponent, caliber, shellLength }) => {
  // Strukturerat objekt: { primer: [...], powder: [...], ... }
  const [components, setComponents] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Söksträng i input
  const [searchTerm, setSearchTerm] = useState('');
  
  // Användningsområden som användaren klickat i
  const [selectedPurposes, setSelectedPurposes] = useState([]);

  // Den aktuella, "aktiva" komponenten som användaren valt att lägga till
  const [selectedComponent, setSelectedComponent] = useState(null);

  // För "powder" och "shot" behöver vi kunna ange kvantitet (t.ex. gram)
  const [quantity, setQuantity] = useState('');

  /**
   * Hämtar alla komponenter via /api/components.
   * Grupperar dem i state efter component.type (ex: "primer", "powder", etc.)
   */
  useEffect(() => {
    const fetchComponents = async () => {
      try {
        setError(null);
        setLoading(true);

        const res = await fetch('http://localhost:8000/api/components');
        if (!res.ok) throw new Error('Kunde inte hämta komponenter');
        
        const data = await res.json();

        // Gruppera komponenter efter "type".
        const grouped = data.reduce((acc, comp) => {
          if (!acc[comp.type]) acc[comp.type] = [];
          acc[comp.type].push(comp);
          return acc;
        }, {});
        
        // Sortera varje grupp alfabetiskt
        for (const typeKey in grouped) {
          grouped[typeKey].sort((a, b) => a.name.localeCompare(b.name));
        }

        setComponents(grouped);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComponents();
  }, []);

  /**
   * Lägger till en vald komponent i laddningen.
   * Kallar sedan "onAddComponent" (prop) från parent.
   */
  const handleAddComponent = () => {
    if (!selectedComponent) return;

    // Gör en kopia, lägg till "weight" om typ = shot/powder
    let newCompData = {
      ...selectedComponent,
      height: selectedComponent.height || 0
    };

    if (selectedComponent.type === 'powder' || selectedComponent.type === 'shot') {
      const weight = parseFloat(quantity) || 0;
      newCompData.weight = weight;
      
      // Om API:et eller logik i förälder vill veta volym, etc.
      if (selectedComponent.density) {
        newCompData.volume = weight / selectedComponent.density;
      }
    }

    onAddComponent?.(newCompData);

    // Återställ val
    setSelectedComponent(null);
    setQuantity('');
  };

  /**
   * Filtrerar fram de "användningsområden" (selectedPurposes) som stämmer
   * med en komponents attribut (ex: comp.supportedPurposes).
   * Här antar vi att en komponent kan ha "supportedPurposes: ['dove','duck', ...]" i backend.
   */
  const doesMatchPurpose = (component) => {
    if (selectedPurposes.length === 0) return true; // Inget filter
    if (!component.supportedPurposes) return false; // Om ingen info
    // Kolla om minst ett av valda syften finns i comp.supportedPurposes
    return selectedPurposes.some(sp => component.supportedPurposes.includes(sp));
  };

  /**
   * Filtrerar också på searchTerm, kollar i name, manufacturer, details, etc.
   */
  const doesMatchSearchTerm = (component) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    const { name = '', manufacturer = '', details = '' } = component;
    return (
      name.toLowerCase().includes(term) ||
      manufacturer.toLowerCase().includes(term) ||
      details.toLowerCase().includes(term)
    );
  };

  /**
   * Rensar sökfält
   */
  const clearSearch = () => {
    setSearchTerm('');
  };

  /**
   * Render
   */
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Sökfält + Rensa-knapp */}
      <div className="flex gap-2 items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="text-gray-500 hover:text-gray-800 transition"
            aria-label="Clear search"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Användningsområden (filter) */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Usage area</h3>
        <div className="flex flex-wrap gap-2">
          {LOAD_PURPOSES.map(purpose => (
            <button
              key={purpose.id}
              onClick={() => {
                const isActive = selectedPurposes.includes(purpose.id);
                const newPurposes = isActive
                  ? selectedPurposes.filter(p => p !== purpose.id)
                  : [...selectedPurposes, purpose.id];
                setSelectedPurposes(newPurposes);
              }}
              className={`px-3 py-1 rounded-full text-sm transition-colors border
                ${selectedPurposes.includes(purpose.id)
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-gray-100 text-gray-700 border-gray-200'}
              `}
            >
              {purpose.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visar alla kategorier och deras komponenter */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map(category => {
          const compList = components[category.type] || [];
          
          // Filtrera
          const filteredComps = compList.filter(c =>
            doesMatchSearchTerm(c) && doesMatchPurpose(c)
          );

          return (
            <div key={category.type}>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                {category.name}
              </h3>
              {filteredComps.length > 0 ? (
                <div className="space-y-2">
                  {filteredComps.map(component => (
                    <ComponentCard
                      key={component._id}
                      component={component}
                      onClick={setSelectedComponent}
                      isSelected={selectedComponent?._id === component._id}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No matching components</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Fast "footer" för vald komponent + ev. kvantitet */}
      {selectedComponent && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-800">
                {selectedComponent.name}
              </span>
              {(selectedComponent.type === 'powder' || selectedComponent.type === 'shot') && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-24 px-3 py-1.5 border rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="Gram"
                    step="0.1"
                  />
                  <span className="text-sm text-gray-600">g</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedComponent(null)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddComponent}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComponentSelection;
