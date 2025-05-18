// src/data/firearms.js
// Central plats för att definiera standardvapenkonfigurationer

export const predefinedFirearms = [
  {
    _id: "default_beretta_686", // Unikt ID för detta standardvapen
    manufacturer: "Beretta",
    model: "686 Silver Pigeon I",
    gauge: 12,
    barrelLength: 71, // cm
    // Lägg till ev. andra standardegenskaper här
  },
  {
    _id: "default_browning_b525",
    manufacturer: "Browning",
    model: "B525 Sporter",
    gauge: 12,
    barrelLength: 76, // cm
  },
  {
    _id: "default_benelli_m2",
    manufacturer: "Benelli",
    model: "M2 Field",
    gauge: 20,
    barrelLength: 66, // cm
  },
  // Lägg till fler vapen efter behov
]; 