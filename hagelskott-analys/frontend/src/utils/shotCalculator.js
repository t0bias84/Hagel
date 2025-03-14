// Fil: shotCalculator.js
// ======================
const SHOT_DIAMETERS_MM = {
  "#3": 3.56,
  "#4": 3.30,
  "#5": 3.05,
  "#6": 2.79,
  "#7": 2.54,
  "#7.5": 2.41,
  "#8": 2.29,
  "#9": 2.03,
  // ...
};

// Densiteter i g/cm³
const MATERIAL_DENSITY = {
  lead: 11.34,
  steel: 7.86,
  tungsten: 19.3,
  hevi: 14.0,    // ex. genomsnitt
};

const DEFAULT_LOAD_GRAMS = 28; // ex. 28g-laddning

// 1) computePelletMassGram(shotSize, shotType) => en hagels massa i gram
function computePelletMassGram(shotSize, shotType) {
  const d_mm = SHOT_DIAMETERS_MM[shotSize.toLowerCase()];
  if (!d_mm) {
    throw new Error("Okänd shotSize: " + shotSize);
  }
  const density = MATERIAL_DENSITY[shotType.toLowerCase()] || 11.34; // fallback bly

  // Volym i mm³ => V = (π * d³) / 6
  const volume_mm3 = (Math.PI * d_mm ** 3) / 6;

  // mm³ -> cm³ => /1000
  const volume_cm3 = volume_mm3 / 1000;

  // massa (g) = densitet*g/cm³ * volym_cm³
  const mass_g = density * volume_cm3;
  return mass_g; // i gram
}

// 2) getPelletCount(shotSize, shotType, totalGram) => hur många hagel?
export function getPelletCount(shotSize, shotType, totalGram = DEFAULT_LOAD_GRAMS) {
  const pelletMass = computePelletMassGram(shotSize, shotType);
  const count = totalGram / pelletMass;
  return Math.round(count); // avrupa
}
