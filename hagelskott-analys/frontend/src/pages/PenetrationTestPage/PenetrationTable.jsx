// Fil: PenetrationTable.jsx
import React from "react";

export default function PenetrationTable({ data }) {
  // data = [ { distance, velocity, penetration }, ... ]
  if (!data || data.length === 0) {
    return <p className="text-gray-300">Inga beräkningar gjorda.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-700">
          <th className="p-2 text-left">Avstånd (yd)</th>
          <th className="p-2 text-left">Hastighet (fps)</th>
          <th className="p-2 text-left">Penetration (tum)</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => {
          // ex. om du vill markera en färg under 1.5" penetration:
          const penClass =
            row.penetration < 1.5
              ? "text-red-400 font-bold"
              : row.penetration < 2.5
              ? "text-yellow-300"
              : "text-green-300";

          return (
            <tr key={idx} className="border-b border-military-600">
              <td className="p-2">{row.distance.toFixed(0)}</td>
              <td className="p-2">{row.velocity.toFixed(0)}</td>
              <td className={`p-2 ${penClass}`}>{row.penetration.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
