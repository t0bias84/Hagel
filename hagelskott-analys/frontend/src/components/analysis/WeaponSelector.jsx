import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Exempel på vanliga vapen och deras vikter
const COMMON_WEAPONS = [
  { name: "Beretta 686 Silver Pigeon", weight: 3.4 },
  { name: "Browning B525", weight: 3.5 },
  { name: "Remington 870", weight: 3.2 },
  { name: "Winchester SX4", weight: 3.1 },
  { name: "Benelli M2", weight: 3.25 },
];

export default function WeaponSelector({ onWeightChange }) {
  const [selectedWeapon, setSelectedWeapon] = useState("");
  const [customWeight, setCustomWeight] = useState("");

  const handleWeaponSelect = (value) => {
    setSelectedWeapon(value);
    if (value === "custom") {
      onWeightChange(parseFloat(customWeight) || 0);
    } else {
      const weapon = COMMON_WEAPONS.find(w => w.name === value);
      if (weapon) {
        setCustomWeight(weapon.weight.toString());
        onWeightChange(weapon.weight);
      }
    }
  };

  const handleCustomWeightChange = (e) => {
    const value = e.target.value;
    setCustomWeight(value);
    if (selectedWeapon === "custom") {
      onWeightChange(parseFloat(value) || 0);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1">
          Välj vapen
        </label>
        <Select value={selectedWeapon} onValueChange={handleWeaponSelect}>
          <SelectTrigger className="w-full bg-military-800 border-military-600 text-gray-100">
            <SelectValue placeholder="Välj ett vapen" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_WEAPONS.map((weapon) => (
              <SelectItem key={weapon.name} value={weapon.name}>
                {weapon.name} ({weapon.weight} kg)
              </SelectItem>
            ))}
            <SelectItem value="custom">Ange egen vikt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1">
          Vapenvikt (kg)
        </label>
        <Input
          type="number"
          step="0.1"
          value={customWeight}
          onChange={handleCustomWeightChange}
          placeholder="3.4"
          className="bg-military-800 border-military-600 text-gray-100"
        />
      </div>
    </div>
  );
} 