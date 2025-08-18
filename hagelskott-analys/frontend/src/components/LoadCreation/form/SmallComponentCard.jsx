import React from 'react';

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

/** Kort för komponenter i en grid */
export default function SmallComponentCard({ comp, onSelect, onHover }) {
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
