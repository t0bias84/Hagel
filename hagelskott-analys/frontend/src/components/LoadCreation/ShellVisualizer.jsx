import React, { useState, useMemo, useCallback } from "react";
import { 
  Trash2, 
  AlertCircle, 
  ZoomIn, 
  ZoomOut, 
  RotateCw 
} from "lucide-react";
import { Alert } from "@/components/ui/alert";

/**
 * ShellVisualizer
 * ===============
 * Komponent som visualiserar en hagelhylsa med valda komponenter
 * (t.ex. primer, powder, wad, shot, spacer, closure).
 *
 * Props:
 * - components: Array av komponentobjekt, ex.:
 *    [
 *      { id, name, type, weight, height, manufacturer, details, ... },
 *    ]
 * - gauge: Sträng, ex. "12", "20", ".410" (används för volymberäkning).
 * - shellLength: Num, hylsans längd i mm.
 * - onRemoveComponent: Funktion som anropas när användaren vill ta bort en komponent.
 * - onComponentClick: Funktion som anropas när man klickar på en komponent.
 */
const ShellVisualizer = ({
  components = [],
  gauge = "12",
  shellLength = 70,
  onRemoveComponent,
  onComponentClick
}) => {
  // Zoomfaktor och rotation (i grader)
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Aktuellt vald komponent (visa i "sidopanelen")
  const [selectedComponent, setSelectedComponent] = useState(null);

  /**
   * gaugeToDiameter
   * ---------------
   * Enkel uppslagstabell för att approximera diametern (mm) beroende på kaliber (gauge).
   * Du kan lägga till fler gauge-nycklar eller justera värdena för mer exakthet.
   */
  const gaugeToDiameter = {
    "12": 18.53,
    "20": 15.63,
    "16": 16.81,
    "28": 14.0,
    ".410": 10.41,
  };

  /**
   * shellVolume
   * -----------
   * Approximerad volym i cm³, givet diameter och hylslängd (cylinder).
   * (Volym i mm³ -> cm³ genom att dela på 1000)
   */
  const shellVolume = useMemo(() => {
    const diameter = gaugeToDiameter[gauge] ?? 18.53;
    const volumeMm3 = Math.PI * Math.pow(diameter / 2, 2) * shellLength;
    return volumeMm3 / 1000;
  }, [gauge, shellLength]);

  /**
   * sortedComponents
   * ----------------
   * Returnerar komponenter i en fördefinierad ordning:
   * primer -> powder -> wad -> shot -> spacer -> closure.
   */
  const sortedComponents = useMemo(() => {
    const order = ["primer", "powder", "wad", "shot", "spacer", "closure"];
    return [...components].sort(
      (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
    );
  }, [components]);

  /**
   * totalHeight
   * -----------
   * Summerar totalhöjden (height) hos alla komponenter (i mm).
   */
  const totalHeight = useMemo(() => {
    return components.reduce((sum, comp) => sum + (comp.height || 0), 0);
  }, [components]);

  // Är hylsan överfylld?
  const isOverfilled = totalHeight > shellLength;

  /**
   * Zoom/rotation-hantering
   * -----------------------
   */
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.2, 2));
  }, []);
  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  }, []);
  const handleRotate = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  /**
   * componentColors
   * ---------------
   * Färgklasser beroende på typ, för tydlig åtskillnad i UI.
   */
  const componentColors = {
    primer: "bg-stone-700 hover:bg-stone-600",
    powder: "bg-amber-700 hover:bg-amber-600",
    wad: "bg-zinc-500 hover:bg-zinc-400",
    shot: "bg-slate-600 hover:bg-slate-500",
    spacer: "bg-gray-400 hover:bg-gray-300",
    closure: "bg-orange-700 hover:bg-orange-600",
  };

  /**
   * handleClickComponent
   * --------------------
   * När användaren klickar på en "stapel" i hylsan.
   * Sätter "selectedComponent" och anropar ev. onComponentClick.
   */
  const handleClickComponent = (component) => {
    setSelectedComponent(component);
    onComponentClick?.(component);
  };

  /**
   * handleRemove
   * ------------
   * När man trycker på papperskorgsikonen för att ta bort en komponent.
   */
  const handleRemove = (e, component) => {
    e.stopPropagation();
    onRemoveComponent?.(component.id);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      {/* Header med titel & verktygsknappar */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Hylsvisualisering</h2>
        <div className="flex gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Zooma in"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Zooma ut"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Rotera"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Varning om överfylld hylsa */}
      {isOverfilled && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2">
            Varning: Hylsan är överfylld med{" "}
            <strong>{(totalHeight - shellLength).toFixed(1)} mm</strong>
          </span>
        </Alert>
      )}

      {/* Layout: Visualisering (vänster) + Info (höger) */}
      <div className="flex gap-6">
        {/* Visualiseringsyta */}
        <div
          className="relative w-48 h-[400px]"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
          }}
        >
          {/* Hylsans "skal" */}
          <div className="absolute inset-0 border-2 border-gray-300 bg-gray-50 rounded-lg overflow-hidden">
            {components.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm p-2 text-center">
                Lägg till komponenter för att fylla hylsan
              </div>
            ) : (
              <div className="absolute bottom-0 w-full h-full flex flex-col-reverse">
                {sortedComponents.map((component, index) => {
                  // Höjd i procent av total hylslängd
                  const heightPercent = ((component.height || 0) / shellLength) * 100;
                  // Plocka en färgklass
                  const colorClass =
                    componentColors[component.type] || "bg-gray-300";

                  return (
                    <div
                      key={index}
                      className={`relative transition-all duration-200 cursor-pointer ${colorClass}`}
                      style={{ height: `${heightPercent}%` }}
                      onClick={() => handleClickComponent(component)}
                    >
                      <div className="flex justify-between items-center px-3 py-2 text-white text-sm">
                        <div className="flex-1 truncate">
                          <p className="font-semibold">{component.name}</p>
                          {component.weight && (
                            <p className="text-xs opacity-90">
                              {component.weight.toFixed(1)} g
                            </p>
                          )}
                        </div>

                        {/* Ta bort-knapp (papperskorg) */}
                        <button
                          className="ml-2 text-white/70 hover:text-white"
                          onClick={(e) => handleRemove(e, component)}
                          title="Ta bort komponent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* En "fylld-mätare" på högerkanten, färgad beroende på fyllnadsgrad */}
          <div className="absolute right-0 top-0 h-full w-1.5 bg-gray-200">
            <div
              className={`transition-all duration-300 ${
                isOverfilled
                  ? "bg-red-500"
                  : totalHeight > shellLength * 0.9
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{
                height: `${Math.min((totalHeight / shellLength) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Panel: Hylsinfo & detaljer om vald komponent */}
        <div className="flex-1 space-y-4">
          {/* Hylsinfo */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Hylsdata</h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-700">Kaliber:</span>{" "}
                {gauge}
              </div>
              <div>
                <span className="font-medium text-gray-700">Längd:</span>{" "}
                {shellLength} mm
              </div>
              <div>
                <span className="font-medium text-gray-700">Fyllnadsgrad:</span>{" "}
                {((totalHeight / shellLength) * 100).toFixed(0)}%
              </div>
              <div>
                <span className="font-medium text-gray-700">Volym:</span>{" "}
                {shellVolume.toFixed(1)} cm³
              </div>
            </div>
          </div>

          {/* Detaljer om vald komponent */}
          {selectedComponent && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                {selectedComponent.name}
              </h3>
              <div className="text-sm space-y-1 text-blue-900/90">
                <p>
                  <span className="font-medium">Typ:</span>{" "}
                  {selectedComponent.type}
                </p>
                {selectedComponent.manufacturer && (
                  <p>
                    <span className="font-medium">Tillverkare:</span>{" "}
                    {selectedComponent.manufacturer}
                  </p>
                )}
                {selectedComponent.weight != null && (
                  <p>
                    <span className="font-medium">Vikt:</span>{" "}
                    {selectedComponent.weight} g
                  </p>
                )}
                {selectedComponent.height != null && (
                  <p>
                    <span className="font-medium">Höjd:</span>{" "}
                    {selectedComponent.height} mm
                  </p>
                )}
                {selectedComponent.details && (
                  <p>
                    <span className="font-medium">Detaljer:</span>{" "}
                    {selectedComponent.details}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShellVisualizer;
