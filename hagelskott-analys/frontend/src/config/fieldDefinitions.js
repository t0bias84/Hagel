// src/config/fieldDefinitions.js

/**
 * Kategorier – om du vill lista kategorier eller matcha mot "category" i backend.
 * Kan förstås anpassas eller utökas. 
 */
export const categories = [
    { id: "ammunition", label: "Ammunition" },
    { id: "firearm",    label: "Vapen" },
    { id: "tool",       label: "Verktyg" },
    // Lägg till fler vid behov
  ];
  
  /**
   * typeDefinitions
   * =================
   * Varje nyckel i exportobjektet motsvarar en “type” (ex: "powder", "primer" osv.).
   * - category: vilken kategori typ tillhör
   * - label: hur typen ska visas (t.ex. "Krut")
   * - fields: en array av objekt för property-fält (dynamiska)
   *   - name (unikt fältnamn i databasen)
   *   - label (visas i UI)
   *   - type: "text" | "number" | "select" | "textarea" | ...
   *   - required: true/false
   *   - placeholder / helpText / options / step / mm. (valfritt)
   */
  export const fieldDefinitions = {
    // Tändhattar
    primer: {
      category: "ammunition",
      label: "Tändhatt",
      fields: [
        { name: "name", label: "Namn", type: "text", required: true },
        { name: "manufacturer", label: "Tillverkare", type: "text", required: true },
        { name: "caliber", label: "Kaliberkompat.", type: "text", required: false },
        { name: "primerType", label: "Typ av Tändhatt", type: "select", required: true, 
          options: ["Standard", "Magnum", "High Performance"] },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
      ],
    },
  
    // Krut
    powder: {
      category: "ammunition",
      label: "Krut",
      fields: [
        { name: "name", label: "Krutnamn", type: "text", required: true },
        { name: "manufacturer", label: "Tillverkare", type: "text", required: true },
        { name: "burnRate", label: "Brännläge", type: "text", required: false },
        { name: "density", label: "Densitet (g/cm³)", type: "number", required: false },
        { name: "recommendedLoadData", label: "Rek. laddata", type: "textarea", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
      ],
    },
  
    // Förladdning
    wad: {
      category: "ammunition",
      label: "Förladdning (Wad)",
      fields: [
        { name: "name", label: "Namn/Modell", type: "text", required: true },
        { name: "manufacturer", label: "Tillverkare", type: "text", required: true },
        { name: "gauge", label: "Gauge/Kaliber", type: "text", required: false },
        { name: "wadDepth", label: "Djup (mm)", type: "number", required: false },
        { name: "diameter", label: "Diameter (mm)", type: "number", required: false },
        { name: "material", label: "Material", type: "text", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
      ],
    },
  
    // Hagel
    shot: {
      category: "ammunition",
      label: "Hagel",
      fields: [
        { name: "name", label: "Hagelnamn", type: "text", required: true },
        { name: "material", label: "Material (bly/stål/…)", type: "text", required: false },
        { name: "shotSize", label: "Hagelstorlek", type: "number", required: false },
        { name: "weight", label: "Vikt (g)", type: "number", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
      ],
    },
  
    // Slug
    slug: {
      category: "ammunition",
      label: "Slug",
      fields: [
        { name: "name", label: "Slug-namn", type: "text", required: true },
        { name: "manufacturer", label: "Tillverkare", type: "text", required: false },
        { name: "caliber", label: "Kaliber/Gauge", type: "text", required: true },
        { name: "weight", label: "Vikt (g)", type: "number", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
      ],
    },
  
    // Kula (Rifle/Pistol)
    bullet: {
      category: "ammunition",
      label: "Kula",
      fields: [
        { name: "name", label: "Kulnamn", type: "text", required: true },
        { name: "manufacturer", label: "Tillverkare", type: "text", required: true },
        { name: "caliber", label: "Kaliber", type: "text", required: true },
        { name: "bulletWeight", label: "Vikt (grains/gram)", type: "text", required: false },
        { name: "bc", label: "Ballistisk Koeff. (BC)", type: "text", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
      ],
    },
  
    // Hylsa
    hull: {
      category: "ammunition",
      label: "Hylsa",
      fields: [
        { name: "name", label: "Modell/Beteckning", type: "text", required: true },
        { name: "manufacturer", label: "Tillverkare", type: "text", required: true },
        { name: "length", label: "Längd (mm)", type: "number", required: false },
        { name: "gaugeOrCaliber", label: "Gauge/Kaliber", type: "text", required: false },
        { name: "material", label: "Material", type: "text", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
      ],
    },
  
    // Exempel: Hagelgevär (shotgun)
    shotgun: {
      category: "firearm",
      label: "Hagelgevär",
      fields: [
        { name: "name", label: "Modellnamn", type: "text", required: true },
        { name: "manufacturer", label: "Tillverkare", type: "text", required: true },
        { name: "gauge", label: "Gauge (12/20/...)", type: "text", required: true },
        { name: "barrelLength", label: "Piplängd", type: "text", required: false },
        { name: "chokeSystem", label: "Choke-system", type: "text", required: false },
        { name: "weight", label: "Vikt (kg/lbs)", type: "text", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
      ],
    },
  
    // Exempel: Kulgevär
    rifle: {
      category: "firearm",
      label: "Kulgevär",
      fields: [
        { name: "name", label: "Modell", type: "text", required: true },
        { name: "manufacturer", label: "Tillverkare", type: "text", required: true },
        { name: "caliber", label: "Kaliber (.308 etc.)", type: "text", required: true },
        { name: "barrelLength", label: "Piplängd", type: "text", required: false },
        { name: "magCapacity", label: "Magasinkapacitet", type: "number", required: false },
        { name: "weight", label: "Vikt (kg/lbs)", type: "text", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
      ],
    },
  
    // Exempel: Laddverktyg
    reloader: {
      category: "tool",
      label: "Laddverktyg",
      fields: [
        { name: "name", label: "Modellnamn", type: "text", required: true },
        { name: "manufacturer", label: "Tillverkare", type: "text", required: true },
        { name: "toolType", label: "Verktygstyp", type: "text", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
      ],
    },
  
    // Exempel: Våg
    scale: {
      category: "tool",
      label: "Våg",
      fields: [
        { name: "name", label: "Namn/Modell", type: "text", required: true },
        { name: "manufacturer", label: "Tillverkare", type: "text", required: true },
        { name: "scaleType", label: "Typ (digital/mekanisk...)", type: "text", required: false },
        { name: "maxWeight", label: "Max viktkapacitet", type: "text", required: false },
        { name: "accuracy", label: "Noggrannhet", type: "text", required: false },
        { name: "shopLink", label: "Butikslänk", type: "text", required: false },
        { name: "notes", label: "Anteckningar", type: "textarea", required: false },
      ],
    },
  };
  