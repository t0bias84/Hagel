import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const manufacturerColors = {
  alliant: "bg-red-900",
  hodgdon: "bg-blue-900",
  vihtavuori: "bg-green-900",
  federal: "bg-indigo-900",
  cci: "bg-purple-900",
  cheddite: "bg-yellow-900",
  baschieri: "bg-orange-900",
  fiocchi: "bg-pink-900",
  remington: "bg-teal-900",
  claybuster: "bg-gray-800",
  unknown: "bg-military-800",
};
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

/** Tooltip nere i hörnet */
function HoverTooltip({ comp }) {
  if (!comp) return null;
  return (
    <div className="fixed bottom-4 right-4 w-64 bg-military-800 border border-military-600 text-gray-100 p-2 rounded shadow-lg text-xs z-50">
      <h3 className="font-semibold text-sm mb-1">{comp.name}</h3>
      {comp.manufacturer && <p className="text-[10px] text-gray-200 mb-1">{comp.manufacturer}</p>}
      {comp.description && <p className="mb-1">{comp.description}</p>}
      {comp.properties && (
        <div className="space-y-1">
          {Object.entries(comp.properties).map(([k, v]) => (
            <div key={k}>
              <span className="font-medium">{k}: </span>
              <span>{JSON.stringify(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  selectedText,
  selected = false,
  children,
  locked = false,
  lockedText = "",
}) {
  const bg = selected ? "bg-green-900" : "bg-military-800";
  return (
    <div className={`${bg} p-3 rounded mb-3 transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
          {selectedText && <p className="text-xs text-gray-200 mt-1">{selectedText}</p>}
        </div>
        {locked ? (
          <p className="text-[10px] text-gray-400">{lockedText}</p>
        ) : (
          <button onClick={onToggle} className="text-xs text-gray-300 hover:text-gray-100">
            {isOpen ? "Dölj" : "Visa"}
          </button>
        )}
      </div>
      {isOpen && !locked && <div>{children}</div>}
    </div>
  );
}

/** Kort för komponenter i en grid */
function SmallComponentCard({ comp, onSelect, onHover }) {
  const makerKey = (comp.manufacturer || "unknown").split(" ")[0].toLowerCase();
  const colorClass = manufacturerColors[makerKey] || manufacturerColors.unknown;

  return (
    <button
      onClick={() => onSelect(comp)}
      onMouseEnter={() => onHover(comp)}
      onMouseLeave={() => onHover(null)}
      className={`
        rounded border border-military-600 px-2 py-1 text-left text-xs
        hover:bg-military-600 transition-colors
        ${colorClass}
      `}
    >
      <p className="font-medium text-gray-100 truncate">{comp.name}</p>
      {comp.manufacturer && <p className="text-[10px] text-gray-200">{comp.manufacturer}</p>}
    </button>
  );
}

function GroupedComponents({ comps, onSelect, onHover }) {
  if (!comps || comps.length === 0) {
    return <p className="text-xs text-gray-400">Inga komponenter hittades.</p>;
  }
  const groups = {};
  comps.forEach((c) => {
    const maker = (c.manufacturer || "Okänd").toLowerCase();
    if (!groups[maker]) groups[maker] = [];
    groups[maker].push(c);
  });
  const sortedMakers = Object.keys(groups).sort();

  return (
    <div className="space-y-4">
      {sortedMakers.map((maker) => {
        const compsInGroup = groups[maker];
        return (
          <div key={maker}>
            <p className="text-xs font-bold text-gray-300 mb-2 capitalize">
              {maker === "okänd" ? "Okänd tillverkare" : maker}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {compsInGroup.map((comp) => (
                <SmallComponentCard
                  key={comp._id}
                  comp={comp}
                  onSelect={onSelect}
                  onHover={onHover}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ShotgunLoadCreation() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoverComp, setHoverComp] = useState(null);

  // (1) Kaliber & hylslängd
  const [caliber, setCaliber] = useState("12");
  const [shellLength, setShellLength] = useState("70");

  // Alla komponenter
  const [components, setComponents] = useState([]);

  // Collapsible states
  const [openSections, setOpenSections] = useState({
    hull: true,
    primer: false,
    powder: false,
    wad: false,
    shot: false,
    filler: true,
    crimp: true,
    naming: true,
  });

  // Hylsa
  const [selectedHull, setSelectedHull] = useState(null);
  const [hullHasPrimer, setHullHasPrimer] = useState(false);
  const [overridePrimer, setOverridePrimer] = useState(false);
  const [selectedPrimer, setSelectedPrimer] = useState(null);

  // Krut
  const [selectedPowder, setSelectedPowder] = useState(null);
  const [powderChargeValue, setPowderChargeValue] = useState("");
  const [powderChargeUnit, setPowderChargeUnit] = useState("g");

  // Wad
  const [selectedWad, setSelectedWad] = useState(null);

  // Single/dubbel/slug
  const [shotType, setShotType] = useState("lead");
  const [selectedShot, setSelectedShot] = useState(null);

  // Slug
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [slugWeightValue, setSlugWeightValue] = useState("");
  const [slugWeightUnit, setSlugWeightUnit] = useState("g");

  // Duplex
  const [duplexA, setDuplexA] = useState(null);
  const [duplexAvalue, setDuplexAvalue] = useState("");
  const [duplexAunit, setDuplexAunit] = useState("g");
  const [duplexB, setDuplexB] = useState(null);
  const [duplexBvalue, setDuplexBvalue] = useState("");
  const [duplexBunit, setDuplexBunit] = useState("g");

  // Single shot
  const [shotWeightValue, setShotWeightValue] = useState("");
  const [shotWeightUnit, setShotWeightUnit] = useState("g");

  // Filler
  const [useFiller, setUseFiller] = useState(false);
  const [fillerPosition, setFillerPosition] = useState("underWad");
  const [fillerQuantity, setFillerQuantity] = useState("");

  // Crimp
  const [crimpType, setCrimpType] = useState("star");

  // Namn/syfte/taggar
  const [loadName, setLoadName] = useState("");
  const [loadPurpose, setLoadPurpose] = useState("");
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");

  /** Hämta /api/components */
  useEffect(() => {
    setLoading(true);
    setError("");
    (async () => {
      try {
        const resp = await fetch("http://localhost:8000/api/components");
        if (!resp.ok) {
          throw new Error("Kunde inte hämta komponenter.");
        }
        const data = await resp.json();
        setComponents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // -- Filter-funktioner (kolla gauge, length mm) --
  function isGaugeMatch(compGauge, selectedGauge) {
    const normalize = (s) => s.replace(" ga", "").trim();
    return normalize(compGauge || "") === normalize(selectedGauge);
  }
  function isLengthMatch(compLengthMm, userShellLength) {
    const desired = parseFloat(userShellLength);
    if (!compLengthMm) return false;
    const rounded = Math.round(compLengthMm);
    return Math.abs(rounded - desired) <= 1;
  }

  // Hylsor
  const hulls = components.filter((c) => {
    if (c.type !== "hull") return false;
    const g = c.properties?.gauge;
    let lengthMm = c.properties?.length_mm;
    if (!lengthMm && c.properties?.length_in) {
      lengthMm = c.properties.length_in * 25.4;
    }
    return isGaugeMatch(g, caliber) && isLengthMatch(lengthMm, shellLength);
  });
  // Primers
  const primers = components.filter((c) => c.type === "primer");
  // Krut
  const powders = components.filter((c) => c.type === "powder");
  // Wad
  const wads = components.filter((c) => {
    if (c.type !== "wad") return false;
    return isGaugeMatch(c.properties?.gauge || "", caliber);
  });
  // Shots
  const shotsFiltered = components.filter((c) => c.type === "shot");
  const slugsFiltered = components.filter((c) => c.type === "slug");

  /** Välj hylsa */
  function selectHull(hull) {
    setSelectedHull(hull);
    // Om hylsan definierar t.ex. "primer" i properties => inbyggd
    const hasPrimerStr = hull.properties?.primer || "";
    if (hasPrimerStr.trim().length > 0) {
      setHullHasPrimer(true);
      // Sätt en "fejk" selectedPrimer:
      setSelectedPrimer({
        _id: null, // EJ 24 hex, expansionskoden hittar den inte => OK
        name: `Inbyggd primer: ${hasPrimerStr}`,
        manufacturer: hull.manufacturer,
      });
      setOverridePrimer(false);
      setOpenSections((prev) => ({ ...prev, hull: false, primer: false, powder: true }));
    } else {
      setHullHasPrimer(false);
      setSelectedPrimer(null);
      setOverridePrimer(false);
      setOpenSections((prev) => ({ ...prev, hull: false, primer: true }));
    }
  }

  /** Välj primer */
  function selectPrimerComp(p) {
    setSelectedPrimer(p);
    setOpenSections((prev) => ({ ...prev, primer: false, powder: true }));
  }

  /** Välj krut */
  function selectPowderComp(p) {
    setSelectedPowder(p);
    setOpenSections((prev) => ({ ...prev, powder: false, wad: true }));
  }
  /** Krutmängd */
  function handlePowderValueChange(val) {
    setPowderChargeValue(val);
  }
  function handlePowderUnitChange(newUnit) {
    if (newUnit === powderChargeUnit) return;
    let oldVal = parseFloat(powderChargeValue) || 0;
    let converted = 0;
    if (newUnit === "gr" && powderChargeUnit === "g") {
      converted = gramsToGrains(oldVal);
    } else if (newUnit === "g" && powderChargeUnit === "gr") {
      converted = grainsToGrams(oldVal);
    }
    setPowderChargeValue(converted.toFixed(2));
    setPowderChargeUnit(newUnit);
  }
  const powderLabel = selectedPowder
    ? `Krut vald: ${selectedPowder.name} (${powderChargeValue || "?"} ${powderChargeUnit})`
    : "";

  /** Välj wad */
  function selectWadComp(w) {
    setSelectedWad(w);
    setOpenSections((prev) => ({ ...prev, wad: false, shot: true }));
  }

  /** Shot/slug/duplex val */
  function handleShotTypeChange(val) {
    setShotType(val);
    setSelectedShot(null);
    setSelectedSlug(null);
    setSlugWeightValue("");
    setSlugWeightUnit("g");
    setDuplexA(null);
    setDuplexB(null);
    setDuplexAvalue("");
    setDuplexBvalue("");
    setDuplexAunit("g");
    setDuplexBunit("g");
    setShotWeightValue("");
    setShotWeightUnit("g");
  }

  /** Slug */
  function selectSlugModel(s) {
    setSelectedSlug(s);
    setOpenSections((prev) => ({ ...prev, shot: false }));
  }
  function handleSlugWeightChange(val) {
    setSlugWeightValue(val);
  }
  function handleSlugWeightUnitChange(newUnit) {
    if (newUnit === slugWeightUnit) return;
    let oldVal = parseFloat(slugWeightValue) || 0;
    let converted = 0;
    if (newUnit === "gr" && slugWeightUnit === "g") {
      converted = gramsToGrains(oldVal);
    } else if (newUnit === "g" && slugWeightUnit === "gr") {
      converted = grainsToGrams(oldVal);
    }
    setSlugWeightValue(converted.toFixed(2));
    setSlugWeightUnit(newUnit);
  }

  /** Duplex */
  function selectDuplexAcomp(c) {
    setDuplexA(c);
  }
  function selectDuplexBcomp(c) {
    setDuplexB(c);
  }
  function handleDuplexAvalueChange(v) {
    setDuplexAvalue(v);
  }
  function handleDuplexAunitChange(newUnit) {
    if (newUnit === duplexAunit) return;
    let oldVal = parseFloat(duplexAvalue) || 0;
    let converted = 0;
    if (newUnit === "gr" && duplexAunit === "g") {
      converted = gramsToGrains(oldVal);
    } else if (newUnit === "g" && duplexAunit === "gr") {
      converted = grainsToGrams(oldVal);
    }
    setDuplexAvalue(converted.toFixed(2));
    setDuplexAunit(newUnit);
  }
  function handleDuplexBvalueChange(v) {
    setDuplexBvalue(v);
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
    setDuplexBvalue(converted.toFixed(2));
    setDuplexBunit(newUnit);
  }

  /** Single shot */
  function selectShotModel(s) {
    setSelectedShot(s);
    setOpenSections((prev) => ({ ...prev, shot: false }));
  }
  function handleShotWeightValue(val) {
    setShotWeightValue(val);
  }
  function handleShotWeightUnitChange(newUnit) {
    if (newUnit === shotWeightUnit) return;
    let oldVal = parseFloat(shotWeightValue) || 0;
    let converted = 0;
    if (newUnit === "gr" && shotWeightUnit === "g") {
      converted = gramsToGrains(oldVal);
    } else if (newUnit === "g" && shotWeightUnit === "gr") {
      converted = grainsToGrams(oldVal);
    }
    setShotWeightValue(converted.toFixed(2));
    setShotWeightUnit(newUnit);
  }

  /** Taggar */
  function toggleTag(t) {
    if (tags.includes(t)) {
      setTags((prev) => prev.filter((x) => x !== t));
    } else {
      setTags((prev) => [...prev, t]);
    }
  }
  function addTag() {
    if (!newTag.trim()) return;
    if (!tags.includes(newTag.trim())) {
      setTags((prev) => [...prev, newTag.trim()]);
    }
    setNewTag("");
  }

  function isShotSectionComplete() {
    if (shotType === "slug") {
      return selectedSlug && slugWeightValue;
    } else if (shotType === "duplex") {
      return duplexA && duplexB && duplexAvalue && duplexBvalue;
    } else {
      return selectedShot && shotWeightValue;
    }
  }

  /** Spara laddning */
  async function handleSaveLoad() {
    try {
      setError("");
      setLoading(true);
      if (!loadName.trim()) throw new Error("Du måste ange ett namn.");

      // Bygg docs
      const doc = {
        name: loadName,
        description: loadPurpose,
        isPublic: true,
        gauge: caliber,
        shellLength: parseFloat(shellLength),
        hullId: null,    // <--- default
        primerId: null,  // <--- default
        powderId: selectedPowder?._id || null,
        powderCharge: 0,
        wadId: selectedWad?._id || null,
        shotLoads: null,
        slug: null,
        filler_g: useFiller ? parseFloat(fillerQuantity) || 0 : 0,
        crimp: {
          type: crimpType === "roll" ? "roll" : "star",
          overshotCard: crimpType === "roll" ? "paper" : null,
        },
        source: tags.join(", "),
        category: "shotshell",
      };

      // Om hylsa vald med 24-hex ID => sätt hullId
      if (selectedHull && selectedHull._id && selectedHull._id.length === 24) {
        doc.hullId = selectedHull._id; // <--- ADDED
      }

      // Kolla om primer override
      if (hullHasPrimer && !overridePrimer) {
        // intentionally doc.primerId = null
      } else if (selectedPrimer && selectedPrimer._id && selectedPrimer._id.length === 24) {
        doc.primerId = selectedPrimer._id; // <--- ADDED
      }

      // Krutmängd => gram
      const pcVal = parseFloat(powderChargeValue) || 0;
      if (pcVal > 0) {
        doc.powderCharge = (powderChargeUnit === "g")
          ? pcVal
          : grainsToGrams(pcVal);
      }

      // Hagel/slug
      if (shotType === "slug" && selectedSlug) {
        let slugVal = parseFloat(slugWeightValue) || 0;
        if (slugWeightUnit === "gr") {
          slugVal = grainsToGrams(slugVal);
        }
        doc.slug = {
          modelId: selectedSlug._id, // <--- expansionskoden kollar shotLoads[*].modelId, men här sätter vi i slug
          name: selectedSlug.name,
          weight_g: slugVal || 28,
        };
      }
      else if (shotType === "duplex" && duplexA && duplexB) {
        let aVal = parseFloat(duplexAvalue) || 0;
        if (duplexAunit === "gr") aVal = grainsToGrams(aVal);
        let bVal = parseFloat(duplexBvalue) || 0;
        if (duplexBunit === "gr") bVal = grainsToGrams(bVal);

        doc.shotLoads = [
          {
            material: duplexA.properties?.material || "steel",
            weight_g: aVal || 14,
            shotSize: duplexA.properties?.shotSize || "#4",
            modelId: (duplexA._id && duplexA._id.length === 24) ? duplexA._id : undefined, // <--- ADDED
          },
          {
            material: duplexB.properties?.material || "tungsten",
            weight_g: bVal || 14,
            shotSize: duplexB.properties?.shotSize || "#2",
            modelId: (duplexB._id && duplexB._id.length === 24) ? duplexB._id : undefined,
          },
        ];
      }
      else if (["lead", "steel", "tungsten", "bismuth"].includes(shotType) && selectedShot) {
        let singleVal = parseFloat(shotWeightValue) || 0;
        if (shotWeightUnit === "gr") singleVal = grainsToGrams(singleVal);

        doc.shotLoads = [
          {
            material: selectedShot.properties?.material || shotType,
            weight_g: singleVal || 28,
            shotSize: selectedShot.properties?.shotSize || "#4",
            modelId: (selectedShot._id && selectedShot._id.length === 24) 
                       ? selectedShot._id 
                       : undefined, // <--- ADDED
          },
        ];
      }

      // Skickar
      const token = localStorage.getItem("token");
      const resp = await fetch("http://localhost:8000/api/loads/shotshell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(doc),
      });
      if (!resp.ok) throw new Error("Kunde inte spara hagelladdningen.");

      alert("Laddning sparad!");

      // Återställ allt
      setLoadName("");
      setLoadPurpose("");
      setCaliber("12");
      setShellLength("70");
      setSelectedHull(null);
      setHullHasPrimer(false);
      setSelectedPrimer(null);
      setOverridePrimer(false);

      setSelectedPowder(null);
      setPowderChargeValue("");
      setPowderChargeUnit("g");

      setSelectedWad(null);
      setShotType("lead");
      setSelectedShot(null);

      setSelectedSlug(null);
      setSlugWeightValue("");
      setSlugWeightUnit("g");

      setDuplexA(null);
      setDuplexB(null);
      setDuplexAvalue("");
      setDuplexBvalue("");
      setDuplexAunit("g");
      setDuplexBunit("g");

      setShotWeightValue("");
      setShotWeightUnit("g");

      setUseFiller(false);
      setFillerPosition("underWad");
      setFillerQuantity("");

      setCrimpType("star");
      setTags([]);
      setNewTag("");

      setOpenSections({
        hull: true,
        primer: false,
        powder: false,
        wad: false,
        shot: false,
        filler: true,
        crimp: true,
        naming: true,
      });
    } catch (err) {
      setError(err.message);
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
          {loading && <Loader2 className="h-5 w-5 animate-spin text-gray-300" />}
        </div>

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
          onToggle={() => setOpenSections((prev) => ({ ...prev, hull: !prev.hull }))}
          selected={!!selectedHull}
          selectedText={selectedHull ? `Hylsa vald: ${selectedHull.name}` : ""}
        >
          <div className="grid grid-cols-2 gap-3 text-xs mb-2">
            <div>
              <p className="text-[10px] text-gray-300 mb-1">Kaliber</p>
              <select
                className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100"
                value={caliber}
                onChange={(e) => setCaliber(e.target.value)}
              >
                <option value="10">10 ga</option>
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
                onChange={(e) => setShellLength(e.target.value)}
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
          onToggle={() => setOpenSections((p) => ({ ...p, primer: !p.primer }))}
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
                  setOverridePrimer(e.target.checked);
                  if (!e.target.checked) {
                    if (selectedHull) {
                      const pStr = selectedHull.properties?.primer || "";
                      setSelectedPrimer({
                        _id: null,
                        name: `Inbyggd primer: ${pStr}`,
                        manufacturer: selectedHull.manufacturer,
                      });
                    }
                  } else {
                    setSelectedPrimer(null);
                  }
                }}
              />
              <span>Välj annan tändhatt?</span>
            </label>
          )}
          {(!hullHasPrimer || overridePrimer) && (
            <GroupedComponents comps={primers} onSelect={selectPrimerComp} onHover={setHoverComp} />
          )}
        </CollapsibleSection>

        {/* (3) Krut */}
        <CollapsibleSection
          title="(3) Krut"
          isOpen={openSections.powder}
          onToggle={() => setOpenSections((p) => ({ ...p, powder: !p.powder }))}
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
                onChange={(e) => handlePowderValueChange(e.target.value)}
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
            onSelect={selectPowderComp}
            onHover={setHoverComp}
          />
        </CollapsibleSection>

        {/* (4) Wad */}
        <CollapsibleSection
          title="(4) Förladdning (Wad)"
          isOpen={openSections.wad}
          onToggle={() => setOpenSections((p) => ({ ...p, wad: !p.wad }))}
          selected={!!selectedWad}
          selectedText={selectedWad ? selectedWad.name : ""}
        >
          <GroupedComponents
            comps={wads}
            onSelect={selectWadComp}
            onHover={setHoverComp}
          />
        </CollapsibleSection>

        {/* (5) Shot/Slug */}
        <CollapsibleSection
          title="(5) Hagel / Slug"
          isOpen={openSections.shot}
          onToggle={() => setOpenSections((p) => ({ ...p, shot: !p.shot }))}
          selected={isShotSectionComplete()}
          selectedText={isShotSectionComplete() ? "Hagel / Slug klart" : ""}
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
                      onChange={(e) => handleSlugWeightChange(e.target.value)}
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
                onSelect={selectSlugModel}
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
                    onChange={(e) => handleDuplexAvalueChange(e.target.value)}
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
                  onSelect={selectDuplexAcomp}
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
                    onChange={(e) => handleDuplexBvalueChange(e.target.value)}
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
                  onSelect={selectDuplexBcomp}
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
                      onChange={(e) => handleShotWeightValue(e.target.value)}
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
                onSelect={selectShotModel}
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
          onToggle={() => setOpenSections((p) => ({ ...p, filler: !p.filler }))}
        >
          <label className="inline-flex items-center mb-2 text-xs">
            <input
              type="checkbox"
              className="mr-2"
              checked={useFiller}
              onChange={(e) => setUseFiller(e.target.checked)}
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
                  onChange={(e) => setFillerPosition(e.target.value)}
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
                  onChange={(e) => setFillerQuantity(e.target.value)}
                />
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* (7) Crimp */}
        <CollapsibleSection
          title="(7) Crimp"
          isOpen={openSections.crimp}
          onToggle={() => setOpenSections((p) => ({ ...p, crimp: !p.crimp }))}
        >
          <select
            className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100 text-xs"
            value={crimpType}
            onChange={(e) => setCrimpType(e.target.value)}
          >
            <option value="star">Stjärncrimp</option>
            <option value="roll">Rullcrimp (overshotcard)</option>
          </select>
        </CollapsibleSection>

        {/* (8) Namn & Övrigt */}
        <CollapsibleSection
          title="(8) Namn & Övrigt att notera"
          isOpen={openSections.naming}
          onToggle={() => setOpenSections((p) => ({ ...p, naming: !p.naming }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-300 mb-1">Laddningens Namn</p>
              <input
                type="text"
                className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100 text-xs"
                value={loadName}
                onChange={(e) => setLoadName(e.target.value)}
              />
            </div>
            <div>
              <p className="text-[10px] text-gray-300 mb-1">Övrigt att notera</p>
              <input
                type="text"
                className="w-full rounded bg-military-700 border-military-600 p-2 text-gray-100 text-xs"
                value={loadPurpose}
                onChange={(e) => setLoadPurpose(e.target.value)}
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
                onChange={(e) => setNewTag(e.target.value)}
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
            disabled={loading}
            className={`
              flex items-center gap-2 px-4 py-2 rounded shadow 
              bg-blue-600 hover:bg-blue-500 text-sm
              ${loading ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Spara laddning</span>
          </button>
        </div>
      </div>

      {/* Tooltip */}
      <HoverTooltip comp={hoverComp} />
    </div>
  );
}
