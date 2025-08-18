import React from 'react';
import SmallComponentCard from './SmallComponentCard';

export default function GroupedComponents({ comps, onSelect, onHover }) {
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
