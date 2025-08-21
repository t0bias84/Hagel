import React, { useState, useEffect, useMemo } from "react";
import { Loader2, AlertCircle, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import HoverTooltip from "./form/HoverTooltip";
import CollapsibleSection from "./form/CollapsibleSection";
import GroupedComponents from "./form/GroupedComponents";
import { getComponents } from "@/services/componentsService";
import { saveShotshellLoad } from "@/services/loadsService";
import { useLoadCreationStore } from "@/store/loadCreationStore";
import { useToast } from "@/hooks/use-toast";

const tagSuggestions = [
  "duvjakt",
  "gåsjakt",
  "lerduvor",
  "andjakt",
  "rådjursjakt",
  "självförsvar",
  "övning",
];
function gramsToGrains(g) {
  return g * 15.432;
}
function grainsToGrams(gr) {
  return gr / 15.432;
}

export default function ShotgunLoadCreation() {
  const { toast } = useToast();
  const [hoverComp, setHoverComp] = useState(null);

  const {
    // State
    caliber, shellLength, allComponents, openSections,
    selectedHull, hullHasPrimer, overridePrimer, selectedPrimer,
    selectedPowder, powderChargeValue, powderChargeUnit,
    selectedWad, shotType, selectedShot, selectedSlug,
    slugWeightValue, slugWeightUnit, duplexA, duplexAvalue, duplexAunit,
    duplexB, duplexBvalue, duplexBunit, shotWeightValue, shotWeightUnit,
    useFiller, fillerPosition, fillerQuantity, crimpType,
    loadName, loadPurpose, tags, newTag,
    isLoading, error,
    // Actions
    setField, toggleSection, setAllComponents, selectHull,
    selectPrimer, selectPowder, selectWad, selectShot, selectSlug,
    setDuplexA, setDuplexB, handleShotTypeChange, toggleTag, addTag, resetForm,
    setLoading, setError
  } = useLoadCreationStore();


  /** Hämta /api/components */
  useEffect(() => {
    const fetchAllComponents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getComponents();
        setAllComponents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllComponents();
  }, [setAllComponents, setLoading, setError]);

  // -- Filter-funktioner (kolla gauge, length mm) --
  const { hulls, primers, powders, wads, shotsFiltered, slugsFiltered } = useMemo(() => {
    const isGaugeMatch = (compGauge, selectedGauge) => {
        const normalize = (s) => String(s).replace(" ga", "").trim();
        return normalize(compGauge || "") === normalize(selectedGauge);
    };
    const isLengthMatch = (compLengthMm, userShellLength) => {
        const desired = parseFloat(userShellLength);
        if (!compLengthMm) return false;
        const rounded = Math.round(compLengthMm);
        return Math.abs(rounded - desired) <= 1;
    };

    const hulls = allComponents.filter((c) => {
        if (c.type !== "hull") return false;
        const g = c.properties?.gauge;
        let lengthMm = c.properties?.length_mm;
        if (!lengthMm && c.properties?.length_in) {
            lengthMm = c.properties.length_in * 25.4;
        }
        return isGaugeMatch(g, caliber) && isLengthMatch(lengthMm, shellLength);
    });
    const primers = allComponents.filter((c) => c.type === "primer");
    const powders = allComponents.filter((c) => c.type === "powder");
    const wads = allComponents.filter((c) => {
        if (c.type !== "wad") return false;
        return isGaugeMatch(c.properties?.gauge || "", caliber);
    });
    const shotsFiltered = allComponents.filter((c) => c.type === "shot");
    const slugsFiltered = allComponents.filter((c) => c.type === "slug");

    return { hulls, primers, powders, wads, shotsFiltered, slugsFiltered };
  }, [allComponents, caliber, shellLength]);


  /** Krutmängd */
  function handlePowderUnitChange(newUnit) {
    if (newUnit === powderChargeUnit) return;
    let oldVal = parseFloat(powderChargeValue) || 0;
    let converted = 0;
    if (newUnit === "gr" && powderChargeUnit === "g") {
      converted = gramsToGrains(oldVal);
    } else if (newUnit === "g" && powderChargeUnit === "gr") {
      converted = grainsToGrams(oldVal);
    }
    setField('powderChargeValue', converted.toFixed(2));
    setField('powderChargeUnit', newUnit);
  }
  const powderLabel = selectedPowder
    ? `Krut vald: ${selectedPowder.name} (${powderChargeValue || "?"} ${powderChargeUnit})`
    : "";


  /** Slug */
  function handleSlugWeightUnitChange(newUnit) {
    if (newUnit === slugWeightUnit) return;
    let oldVal = parseFloat(slugWeightValue) || 0;
    let converted = 0;
    if (newUnit === "gr" && slugWeightUnit === "g") {
      converted = gramsToGrains(oldVal);
    } else if (newUnit === "g" && slugWeightUnit === "gr") {
      converted = grainsToGrams(oldVal);
    }
    setField('slugWeightValue', converted.toFixed(2));
    setField('slugWeightUnit', newUnit);
  }

  /** Duplex */
  function handleDuplexAunitChange(newUnit) {
    if (newUnit === duplexAunit) return;
    let oldVal = parseFloat(duplexAvalue) || 0;
    let converted = 0;
    if (newUnit === "gr" && duplexAunit === "g") {
      converted = gramsToGrains(oldVal);
    } else if (newUnit === "g" && duplexAunit === "gr") {
      converted = grainsToGrams(oldVal);
    }
    setField('duplexAvalue', converted.toFixed(2));
    setField('duplexAunit', newUnit);
  }
  function handleDuplexBunitChange(newUnit) {
    if (newUnit === duplexBunit) return;
    let oldVal = parseFloat(duplexBvalue) || 0;
    let converted = 0;
    if (newUnit === "gr" && duplexBunit === "g") {
      converted = gramsToGrains(oldVal);
    } else if (newUnit === "g" && duplexBunit === "gr") {
      converted = grainsToGrams(oldVal);
    }
    setField('duplexBvalue', converted.toFixed(2));
    setField('duplexBunit', newUnit);
  }

  /** Single shot */
  function handleShotWeightUnitChange(newUnit) {
    if (newUnit === shotWeightUnit) return;
    let oldVal = parseFloat(shotWeightValue) || 0;
    let converted = 0;
    if (newUnit === "gr" && shotWeightUnit === "g") {
      converted = gramsToGrains(oldVal);
    } else if (newUnit === "g" && shotWeightUnit === "gr") {
      converted = grainsToGrams(oldVal);
    }
    setField('shotWeightValue', converted.toFixed(2));
    setField('shotWeightUnit', newUnit);
  }

  const isShotSectionComplete = useMemo(() => {
    if (shotType === "slug") {
      return selectedSlug && slugWeightValue;
    } else if (shotType === "duplex") {
      return duplexA && duplexB && duplexAvalue && duplexBvalue;
    } else {
      return selectedShot && shotWeightValue;
    }
  }, [shotType, selectedSlug, slugWeightValue, duplexA, duplexB, duplexAvalue, duplexBvalue, selectedShot, shotWeightValue]);

  /** Spara laddning */
  async function handleSaveLoad() {
    try {
      setError(null);
      setLoading(true);
      
      if (!loadName.trim()) throw new Error("Du måste ange ett namn på laddningen.");
      if (!selectedHull?._id) throw new Error("Du måste välja en giltig hylsa.");

      const components = [{ id: selectedHull._id, type: "hull" }];
      if (selectedPrimer?._id) components.push({ id: selectedPrimer._id, type: "primer" });
      if (selectedPowder?._id) components.push({ id: selectedPowder._id, type: "powder", weight: parseFloat(powderChargeValue) });
      if (selectedWad?._id) components.push({ id: selectedWad._id, type: "wad" });

      if (shotType === "slug" && selectedSlug?._id) {
          components.push({ id: selectedSlug._id, type: "slug", weight: parseFloat(slugWeightValue) });
      } else if (shotType === "duplex" && duplexA?._id && duplexB?._id) {
          components.push({ id: duplexA._id, type: "shot", weight: parseFloat(duplexAvalue) });
          components.push({ id: duplexB._id, type: "shot", weight: parseFloat(duplexBvalue) });
      } else if (selectedShot?._id) {
          components.push({ id: selectedShot._id, type: "shot", weight: parseFloat(shotWeightValue) });
      }

      const doc = {
        name: loadName.trim(),
        description: loadPurpose.trim(),
        isPublic: true,
        gauge: caliber,
        shellLength: parseFloat(shellLength),
        components: components,
        tags: tags,
        crimp: { type: crimpType },
      };

      await saveShotshellLoad(doc);
      toast({
        title: "Success!",
        description: "Din laddning har sparats.",
      });
      resetForm();

    } catch (err) {
      setError(err.message); // Still set the error for the Alert component
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-military-900 text-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Skapa Hagelladdning</h1>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-gray-300" />}
        </div>

        {/* The error alert can remain as an alternative display for critical errors */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* (1) Hull */}
        <CollapsibleSection
          title="(1) Kaliber & Hylslängd"
          isOpen={openSections.hull}
          onToggle={() => toggleSection('hull')}
          selected={!!selectedHull}
          selectedText={selectedHull ? `Hylsa vald: ${selectedHull.name}` : ""}
        >
          <div className="grid grid-cols-2 gap-3 text-xs mb-2">
            <div>
              <p className="text-[10px] text-gray-300 mb-1">Kaliber</p>
              <select
                className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100"
                value={caliber}
                onChange={(e) => setField('caliber', e.target.value)}
              >
                <option value="12">12 ga</option>
                <option value="16">16 ga</option>
                <option value="20">20 ga</option>
                <option value="28">28 ga</option>
                <option value=".410">.410</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] text-gray-300 mb-1">Hylslängd</p>
              <select
                className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100"
                value={shellLength}
                onChange={(e) => setField('shellLength', e.target.value)}
              >
                <option value="65">65 mm</option>
                <option value="70">70 mm</option>
                <option value="76">76 mm (3'')</option>
                <option value="89">89 mm (3.5'')</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Matchande hylsor visas nedan.
          </p>
          <GroupedComponents comps={hulls} onSelect={selectHull} onHover={setHoverComp} />
        </CollapsibleSection>

        {/* (2) Primer */}
        <CollapsibleSection
          title="(2) Tändhatt"
          isOpen={openSections.primer}
          onToggle={() => toggleSection('primer')}
          selected={!!selectedPrimer}
          selectedText={
            hullHasPrimer && !overridePrimer
              ? `Inbyggd: ${selectedPrimer?.name || ""}`
              : selectedPrimer
              ? `Vald: ${selectedPrimer.name}`
              : ""
          }
        >
          {hullHasPrimer && (
            <label className="inline-flex items-center space-x-2 text-xs mb-3">
              <input
                type="checkbox"
                checked={overridePrimer}
                onChange={(e) => {
                  setField('overridePrimer', e.target.checked);
                  if (!e.target.checked && selectedHull) {
                      const pStr = selectedHull.properties?.primer || "";
                      selectPrimer({
                        _id: `inHull:${selectedHull._id}`,
                        name: `Inbyggd primer: ${pStr}`,
                        manufacturer: selectedHull.manufacturer,
                      });
                  } else {
                    setField('selectedPrimer', null);
                  }
                }}
              />
              <span>Välj annan tändhatt?</span>
            </label>
          )}
          {(!hullHasPrimer || overridePrimer) && (
            <GroupedComponents comps={primers} onSelect={selectPrimer} onHover={setHoverComp} />
          )}
        </CollapsibleSection>

        {/* (3) Krut */}
        <CollapsibleSection
          title="(3) Krut"
          isOpen={openSections.powder}
          onToggle={() => toggleSection('powder')}
          selected={!!selectedPowder}
          selectedText={powderLabel}
        >
          <div className="mt-1 mb-3 flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-gray-300 mb-1 font-semibold">
                Mängd krut
              </p>
              <input
                type="text"
                className="w-full rounded bg-military-700 border-2 border-white p-2 text-gray-100 text-xs"
                placeholder="ex: 1.65"
                value={powderChargeValue}
                onChange={(e) => setField('powderChargeValue', e.target.value)}
              />
            </div>
            <div>
              <p className="text-[10px] text-gray-300 mb-1 font-semibold">Enhet</p>
              <select
                className="rounded bg-military-700 border-2 border-white p-1 text-gray-100 text-xs"
                value={powderChargeUnit}
                onChange={(e) => handlePowderUnitChange(e.target.value)}
              >
                <option value="g">gram</option>
                <option value="gr">grain</option>
              </select>
            </div>
          </div>
          <GroupedComponents
            comps={powders}
            onSelect={selectPowder}
            onHover={setHoverComp}
          />
        </CollapsibleSection>

        {/* (4) Wad */}
        <CollapsibleSection
          title="(4) Förladdning (Wad)"
          isOpen={openSections.wad}
          onToggle={() => toggleSection('wad')}
          selected={!!selectedWad}
          selectedText={selectedWad ? selectedWad.name : ""}
        >
          <GroupedComponents
            comps={wads}
            onSelect={selectWad}
            onHover={setHoverComp}
          />
        </CollapsibleSection>

        {/* (5) Shot/Slug */}
        <CollapsibleSection
          title="(5) Hagel / Slug"
          isOpen={openSections.shot}
          onToggle={() => toggleSection('shot')}
          selected={isShotSectionComplete}
          selectedText={isShotSectionComplete ? "Hagel / Slug klart" : ""}
        >
          <label className="block text-[10px] font-medium text-gray-300 mb-1">
            Typ
          </label>
          <select
            className="mb-2 w-full rounded bg-military-700 border-military-600 p-2 text-gray-100 text-xs"
            value={shotType}
            onChange={(e) => handleShotTypeChange(e.target.value)}
          >
            <option value="lead">Bly</option>
            <option value="steel">Stål</option>
            <option value="tungsten">Tungsten</option>
            <option value="bismuth">Vismut</option>
            <option value="slug">Slug</option>
            <option value="duplex">Duplex</option>
          </select>

          {/* Slug */}
          {shotType === "slug" && (
            <>
              <div className="mt-2 space-y-2">
                <p className="text-[10px] text-gray-200">
                  Ange slug-vikt (obligatoriskt)
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-300 mb-1 font-semibold">Slugvikt</p>
                    <input
                      type="text"
                      className="w-full rounded bg-military-700 border-2 border-white p-2 text-gray-100 text-xs"
                      placeholder="28"
                      value={slugWeightValue}
                      onChange={(e) => setField('slugWeightValue', e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-300 mb-1 font-semibold">Enhet</p>
                    <select
                      className="rounded bg-military-700 border-2 border-white p-1 text-gray-100 text-xs"
                      value={slugWeightUnit}
                      onChange={(e) => handleSlugWeightUnitChange(e.target.value)}
                    >
                      <option value="g">g</option>
                      <option value="gr">gr</option>
                    </select>
                  </div>
                </div>
              </div>
              <GroupedComponents
                comps={slugsFiltered}
                onSelect={selectSlug}
                onHover={setHoverComp}
              />
              {selectedSlug && (
                <div className="mt-2 space-y-2">
                  <p className="text-[10px] text-gray-200">
                    Vald slug: {selectedSlug.name}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Duplex */}
          {shotType === "duplex" && (
            <div className="mt-2 space-y-4">
              <p className="text-[10px] text-gray-200 mb-1">
                Ange vikter först (obligatoriskt), välj sedan hagel
              </p>
              <div>
                <p className="text-[10px] text-gray-300 mb-1">Duplex A</p>
                <div className="mt-2 flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    className="w-20 rounded bg-military-700 border-2 border-white p-1 text-gray-100 text-xs"
                    placeholder="14"
                    value={duplexAvalue}
                    onChange={(e) => setField('duplexAvalue', e.target.value)}
                  />
                  <select
                    value={duplexAunit}
                    onChange={(e) => handleDuplexAunitChange(e.target.value)}
                    className="rounded bg-military-700 border-2 border-white p-1 text-gray-100 text-xs"
                  >
                    <option value="g">g</option>
                    <option value="gr">gr</option>
                  </select>
                </div>
                <GroupedComponents
                  comps={shotsFiltered}
                  onSelect={setDuplexA}
                  onHover={setHoverComp}
                />
              </div>

              <div>
                <p className="text-[10px] text-gray-300 mb-1">Duplex B</p>
                <div className="mt-2 flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    className="w-20 rounded bg-military-700 border-2 border-white p-1 text-gray-100 text-xs"
                    placeholder="14"
                    value={duplexBvalue}
                    onChange={(e) => setField('duplexBvalue', e.target.value)}
                  />
                  <select
                    value={duplexBunit}
                    onChange={(e) => handleDuplexBunitChange(e.target.value)}
                    className="rounded bg-military-700 border-2 border-white p-1 text-gray-100 text-xs"
                  >
                    <option value="g">g</option>
                    <option value="gr">gr</option>
                  </select>
                </div>
                <GroupedComponents
                  comps={shotsFiltered}
                  onSelect={setDuplexB}
                  onHover={setHoverComp}
                />
              </div>
            </div>
          )}

          {/* Single shot */}
          {["lead", "steel", "tungsten", "bismuth"].includes(shotType) && (
            <>
              <div className="mt-2">
                <p className="text-[10px] text-gray-200 mb-1">
                  Ange hagelvikt (obligatoriskt) och välj hagel
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-300 mb-1 font-semibold">
                      Hagelvikt
                    </p>
                    <input
                      type="text"
                      className="w-full rounded bg-military-700 border-2 border-white p-1 text-gray-100 text-xs"
                      placeholder="28"
                      value={shotWeightValue}
                      onChange={(e) => setField('shotWeightValue', e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-300 mb-1 font-semibold">
                      Enhet
                    </p>
                    <select
                      value={shotWeightUnit}
                      onChange={(e) => handleShotWeightUnitChange(e.target.value)}
                      className="rounded bg-military-700 border-2 border-white p-1 text-gray-100 text-xs"
                    >
                      <option value="g">g</option>
                      <option value="gr">gr</option>
                    </select>
                  </div>
                </div>
              </div>
              <GroupedComponents
                comps={shotsFiltered.filter((c) => {
                  const mat = (c.properties?.material || "").toLowerCase();
                  return mat === shotType;
                })}
                onSelect={selectShot}
                onHover={setHoverComp}
              />
              {selectedShot && (
                <div className="mt-2">
                  <p className="text-[10px] text-gray-200">
                    Valt hagel: {selectedShot.name}
                  </p>
                </div>
              )}
            </>
          )}
        </CollapsibleSection>

        {/* (6) Filler */}
        <CollapsibleSection
          title="(6) Filler / Buffer"
          isOpen={openSections.filler}
          onToggle={() => toggleSection('filler')}
        >
          <label className="inline-flex items-center mb-2 text-xs">
            <input
              type="checkbox"
              className="mr-2"
              checked={useFiller}
              onChange={(e) => setField('useFiller', e.target.checked)}
            />
            <span className="text-gray-200">Använd filler/buffer?</span>
          </label>
          {useFiller && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-300 mb-1">Position</p>
                <select
                  className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100 text-xs"
                  value={fillerPosition}
                  onChange={(e) => setField('fillerPosition', e.target.value)}
                >
                  <option value="underWad">Under förladdning</option>
                  <option value="inWad">I förladdning</option>
                  <option value="aboveShot">Ovanför hagel</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] text-gray-300 mb-1">Material / Mängd</p>
                <input
                  type="text"
                  placeholder="Ex: 1g plastkulor"
                  className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100 text-xs"
                  value={fillerQuantity}
                  onChange={(e) => setField('fillerQuantity', e.target.value)}
                />
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* (7) Crimp */}
        <CollapsibleSection
          title="(7) Crimp"
          isOpen={openSections.crimp}
          onToggle={() => toggleSection('crimp')}
        >
          <select
            className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100 text-xs"
            value={crimpType}
            onChange={(e) => setField('crimpType', e.target.value)}
          >
            <option value="star">Stjärncrimp</option>
            <option value="roll">Rullcrimp (overshotcard)</option>
          </select>
        </CollapsibleSection>

        {/* (8) Namn & Övrigt */}
        <CollapsibleSection
          title="(8) Namn & Övrigt att notera"
          isOpen={openSections.naming}
          onToggle={() => toggleSection('naming')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-300 mb-1">Laddningens Namn</p>
              <input
                type="text"
                className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100 text-xs"
                value={loadName}
                onChange={(e) => setField('loadName', e.target.value)}
              />
            </div>
            <div>
              <p className="text-[10px] text-gray-300 mb-1">Övrigt att notera</p>
              <input
                type="text"
                className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100 text-xs"
                value={loadPurpose}
                onChange={(e) => setField('loadPurpose', e.target.value)}
              />
            </div>
          </div>

          {/* Taggar */}
          <div className="mt-4">
            <p className="text-[10px] text-gray-300 mb-1">
              Klicka för att lägga till/ta bort tagg
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {tagSuggestions.map((t) => {
                const selected = tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`px-2 py-1 text-xs rounded border ${
                      selected
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-military-700 border-military-600 text-gray-100"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-gray-300 mb-1">Dina taggar</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  onClick={() => toggleTag(tag)}
                  className="bg-military-700 border border-military-600 text-xs text-gray-200 px-2 py-1 rounded cursor-pointer hover:bg-military-600"
                  title="Klicka för att ta bort"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100 text-xs"
                placeholder="Lägg till ny tagg..."
                value={newTag}
                onChange={(e) => setField('newTag', e.target.value)}
              />
              <button
                onClick={addTag}
                className="bg-military-700 border border-military-600 text-xs text-gray-100 px-2 py-1 rounded hover:bg-military-600"
              >
                Lägg till
              </button>
            </div>
          </div>
        </CollapsibleSection>

        {/* Spara-knapp */}
        <div className="flex justify-end mt-2 mb-4">
          <button
            onClick={handleSaveLoad}
            disabled={isLoading}
            className={`
              flex items-center gap-2 px-4 py-2 rounded shadow 
              bg-blue-600 hover:bg-blue-500 text-sm
              ${isLoading ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Spara laddning</span>
          </button>
        </div>
      </div>

      {/* Tooltip */}
      <HoverTooltip comp={hoverComp} />
    </div>
  );
}
