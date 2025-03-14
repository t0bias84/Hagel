import React from "react";
import { Link } from "react-router-dom";
import { Camera, Edit, Trash2 } from "lucide-react";

/**
 * ComponentList
 * =============
 * Tar emot en lista med komponent-objekt (array) och en onDelete-funktion.
 * Visar dem i en grid. Varje komponent har:
 *   - Bild (eller placeholder om ingen bild-URL)
 *   - Namn (länkad till detaljsida /components/:id)
 *   - Edit-länk (till /components/edit/:id)
 *   - Delete-knapp (kör onDelete med id:t)
 */
const ComponentList = ({ components, onDelete }) => {
  // Översättningstabell för "type"
  const componentTypes = {
    primer: "Tändhattar",
    powder: "Krut",
    wad: "Förladdning",
    shot: "Hagel",
    hull: "Hylsor",
    spacer: "Mellanlägg",
    slug: "Slugs",
    // ... utöka vid behov
  };

  // Om du vill hämta bas-URL från en .env-variabel, gör så här:
  // const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  // Eller hårdkoda direkt om du vet att det är så:
  const BASE_URL = "http://127.0.0.1:8000";

  // Helper-funktion: returnerar en fullständig bild-URL
  // genom att prefixa BASE_URL om den är relativ
  const getImageSrc = (comp) => {
    if (!comp.image?.url) {
      // Saknas bild-url helt
      return null;
    }

    const url = comp.image.url;

    // Om url redan är en full adress (ex. "http://127.0.0.1:8000/uploads/…")
    // använder vi den direkt
    if (url.startsWith("http")) {
      return url;
    }

    // Annars prefixar vi baseURL
    // ex. url = "/uploads/components/filnamn.png"
    // => "http://127.0.0.1:8000/uploads/components/filnamn.png"
    return `${BASE_URL}${url}`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {components.map((component) => {
        // Bygg full bild-url (eller null om ingen)
        const imageSrc = getImageSrc(component);

        return (
          <div
            key={component._id}
            className="relative bg-military-800 rounded-lg shadow p-4 hover:bg-military-700 transition-colors"
          >
            <div className="flex items-start gap-4">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={component.name}
                  className="w-20 h-20 rounded object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-military-700 rounded flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  {/* Namn -> detaljsida */}
                  <Link
                    to={`/components/${component._id}`}
                    className="font-semibold text-gray-100 hover:text-blue-400 line-clamp-1"
                    title={component.name}
                  >
                    {component.name}
                  </Link>

                  <div className="flex items-center gap-2">
                    {/* Edit -> /components/edit/:id */}
                    <Link
                      to={`/components/edit/${component._id}`}
                      className="p-1 text-gray-300 hover:text-blue-400 transition-colors"
                      aria-label="Redigera komponent"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>

                    {/* Delete-knapp */}
                    <button
                      onClick={() => onDelete(component._id)}
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                      aria-label="Ta bort komponent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Tillverkare */}
                <p className="text-sm text-gray-400">
                  {component.manufacturer || "Ingen tillverkare angiven"}
                </p>

                {/* Taggar / metadata */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {/* Typ-tag */}
                  <span className="px-2 py-1 text-xs font-medium bg-military-700 rounded text-gray-100">
                    {componentTypes[component.type] || component.type}
                  </span>

                  {/* Kaliber */}
                  {component.caliber && (
                    <span className="px-2 py-1 text-xs font-medium bg-military-700 rounded text-gray-100">
                      Kaliber {component.caliber}
                    </span>
                  )}

                  {/* Vikt i properties */}
                  {component.properties?.weight && (
                    <span className="px-2 py-1 text-xs font-medium bg-military-700 rounded text-gray-100">
                      {component.properties.weight} g
                    </span>
                  )}
                </div>

                {/* Beskrivning */}
                {component.description && (
                  <p className="text-sm text-gray-200 mt-2 line-clamp-2">
                    {component.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ComponentList;
