import React from 'react';

/** Tooltip nere i hörnet */
export default function HoverTooltip({ comp }) {
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
