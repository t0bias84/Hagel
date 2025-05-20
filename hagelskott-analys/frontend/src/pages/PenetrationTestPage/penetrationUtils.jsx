// penetrationUtils.jsx
// ====================

//////////////////////
// 1) Konverteringar
//////////////////////
export function yardToMeter(yd) {
    return yd * 0.9144;
  }
  
  export function fpsToMps(fps) {
    return fps * 0.3048;
  }
  
  export function ftLbsToJoule(ftlbs) {
    return ftlbs * 1.3558179483314;
  }
  
  export function inchToMm(inch) {
    return inch * 25.4;
  }
  
  /////////////////////////
  // 2) "dragConstant" mapp
  /////////////////////////
  // Vi gör en enkel lookup beroende på hagelstorlek (sfärisk form).
  // Ju mindre hagel, desto större dragConstant => velocity avtar fortare.
  const DRAG_MAP = {
    "1": 0.016,
    "2": 0.018,
    "3": 0.020,
    "4": 0.022,
    "5": 0.025,
    "6": 0.028,
    "7": 0.032,
    // fallback
    "default": 0.025
  };
  
  // Material-faktor: stål ~ 1.1–1.3, bly=1.0, tungsten=1.4–1.6, hevi=1.3...
  function getMaterialFactor(mat) {
    let m = mat.toLowerCase();
    if (m.includes("steel")) return 1.2;
    if (m.includes("tungsten")) return 1.5;
    if (m.includes("hevi")) return 1.3;
    // bly default
    return 1.0;
  }
  
  //////////////////////////
  // 3) Beräkna velocity(d)
  //////////////////////////
  // Exponentiell avtagning: v(d) = muzzle * exp(-k*d)
export function getVelocityAtDistance(dYd, muzzle_fps, shotSize="4") {
  const dragC = DRAG_MAP[shotSize] ?? DRAG_MAP.default;
  const dist_m = dYd * 0.9144;
  return muzzle_fps * Math.exp(-dragC * (dist_m / 50));
}
  
  /////////////////////////////
  // 4) Beräkna penetration
  /////////////////////////////
  // Ex: penetration_in = 0.8 * diameter_in * v_fps^1.0 * materialFactor / 1000
  // Justeras efter experiment.
  function computePenetration(v_fps, diameter_in, matFactor) {
    // 0.8–1.0 i normaliseringsfaktor => test 
    const K = 0.9; 
    // Vi multiplicerar diameter_in (tum), velocity (fps) och matFactor, sedan normaliserar vi ner /1000
    return (K * diameter_in * v_fps * matFactor) / 1000.0;
  }
  
  /////////////////////////////
  // 5) Samlingsfunktion: generera dataPoints
  /////////////////////////////
  export function computePenetrationShots(
    muzzle_fps,
    shotSize,        // "1","2","3","4"...
    shotType="lead",
    maxDistYd = 60,  // t.ex. 60 yard
    step = 2         // steglängd i yard
  ) {
    // Diametertabell (tum) => approx
    const DIAM_MAP = {
      "1": 0.16,
      "2": 0.15,
      "3": 0.14,
      "4": 0.13,
      "5": 0.12,
      "6": 0.11,
      "7": 0.10
    };
    const d_in = DIAM_MAP[shotSize] ?? 0.10;
    const matF = getMaterialFactor(shotType);
    
    let data = [];
    for(let yd=0; yd<=maxDistYd; yd += step) {
      const v = getVelocityAtDistance(yd, muzzle_fps, shotSize);
      // KE = 1/2 m v^2 => men vi skippar mass -> utgår från foot-lbs direkt:
      // footPounds = 0.5 * massSlug * v^2
      // men i stället approximera massSlug via diameter, densitet => genväg: e ~ c * v^2
      // (Enklare approach: e = c * v^2)
      // ex. c ~ 0.000225 * diameter_in^3 * dens....
      // Men för enkelhet tar vi en "big guess" -> 
      const energy_ftlbs = approximateEnergy(v, shotSize, shotType);
      
      const pen_in = computePenetration(v, d_in, matF);
      data.push({
        distance_yd: yd,
        velocity_fps: v,
        energy_ftlbs: energy_ftlbs,
        penetration_in: pen_in
      });
    }
    return data;
  }
  
  // Liten approx-fn: E ~ c * v^2
  function approximateEnergy(vel_fps, shotSize, shotType) {
    // Ju större hagel => mer massa => c större
    const sizeNum = Number(shotSize) || 4;
    // Ex. #1 => stor => c= 0.0003, #7 => c=0.00013
    // rough mapping
    let c = 0.00022 - (sizeNum * 0.00001); 
    if(c < 0.00010) c = 0.00010; 
    if(c > 0.0003) c = 0.0003; 
    // material densitet?
    const matF = getMaterialFactor(shotType); 
    // Ex: tungsten => 1.5 => mass +20–50% => c*g
    const c2 = c * matF;
    return c2 * (vel_fps * vel_fps);
  }
  
  ////////////////////////////////
  // 6) Lethal Dist – som tidigare
  ////////////////////////////////
  export const ALL_GAME = [
    { id: "duck", name: "And/Duck", minPen_in: 1.5 },
    { id: "roe",  name: "Rådjur",   minPen_in: 3.0 },
    { id: "boar", name: "Vildsvin", minPen_in: 4.0 }
  ];
  
  // Return ex. { duck: 38, roe: 25, boar: 0 }
  export function getAllLethalDistances(data) {
    let result = {};
    ALL_GAME.forEach(g => {
      result[g.id] = getLethalDistance(data, g.minPen_in);
    });
    return result;
  }
  
  function getLethalDistance(dataArray, minPen) {
    // dataArray sorteras stigande distance
    let lethal = 0;
    for(const row of dataArray) {
      if(row.penetration_in >= minPen) {
        lethal = row.distance_yd;
      } else {
        break;
      }
    }
    return lethal;
  }
  
  