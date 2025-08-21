// PenetrationChart.jsx
// ====================

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine
} from "recharts";
import { yardToMeter, inchToMm, fpsToMps, ftLbsToJoule } from "./penetrationUtils";

function CustomTooltip({ active, payload, label, isMetric }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-gray-900 p-2 rounded text-xs text-white shadow-md">
      <p className="font-semibold mb-1">
        {isMetric ? `Avstånd: ${label.toFixed(1)} m` : `Distance: ${label.toFixed(1)} yd`}
      </p>
      {payload.map((pl, i) => (
        <p key={i} style={{ color: pl.stroke }}>
          {pl.name}: {pl.value.toFixed(2)}
        </p>
      ))}
    </div>
  );
}

export default function PenetrationChart({ data=[], isMetric=false, visibleLines }) {
  if(!data || data.length===0) {
    return <div className="text-gray-400 text-sm">Ingen data</div>;
  }

  // Konvertera
  const convertedData = data.map(item => {
    const dist = isMetric ? yardToMeter(item.distance_yd) : item.distance_yd;
    const pen = isMetric ? inchToMm(item.penetration_in) : item.penetration_in;
    const vel = isMetric ? fpsToMps(item.velocity_fps) : item.velocity_fps;
    const energy = isMetric ? ftLbsToJoule(item.energy_pellet_ftlbs || item.energy_per_hagel_j || 0) : (item.energy_pellet_ftlbs || item.energy_per_hagel_j || 0);

    return {
      distance: dist,
      penetration: pen,
      velocity: vel,
      energy: energy,
    };
  });

  const distanceLabel = isMetric ? "Avstånd (m)" : "Distance (yd)";
  const penetrationLabel = isMetric ? "Penetration (mm)" : "Penetration (in)";
  const velocityLabel = isMetric ? "Hastighet (m/s)" : "Velocity (fps)";
  const energyLabel = isMetric ? "Energi (J)" : "Energy (ft-lbs)";

  // Referens-linjer
  const duckMin_in = 1.5;
  const roeMin_in  = 3.0;
  const boarMin_in = 4.0;
  const duckLine = isMetric ? inchToMm(duckMin_in) : duckMin_in;
  const roeLine  = isMetric ? inchToMm(roeMin_in)  : roeMin_in;
  const boarLine = isMetric ? inchToMm(boarMin_in) : boarMin_in;

  return (
    <div style={{width:"100%", height:320}}>
      <ResponsiveContainer>
        <LineChart data={convertedData} margin={{top:10,right:40,left:20,bottom:5}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="distance"
            stroke="#aaa"
            label={{
              value: distanceLabel,
              position:"insideBottomRight",
              offset: -5,
              style:{fill:"#aaa"}
            }}
          />
          {visibleLines.penetration && <YAxis
            yAxisId="left"
            stroke="#f97316"
            label={{
              value: penetrationLabel,
              angle:-90,
              position:"insideLeft",
              style:{ fill:"#f97316"}
            }}
          />}
          {visibleLines.velocity && <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#3b82f6"
            label={{
              value: velocityLabel,
              angle:-90,
              position:"insideRight",
              style:{fill:"#3b82f6"}
            }}
          />}
           {visibleLines.energy && <YAxis
            yAxisId="energy"
            orientation="right"
            stroke="#22c55e"
            domain={[0, 'dataMax + 10']}
            label={{
              value: energyLabel,
              angle: -90,
              position: 'insideRight',
              offset: 40,
              style: { fill: '#22c55e' },
            }}
          />}
          <Tooltip
            content={(props)=><CustomTooltip {...props} isMetric={isMetric}/>}
          />
          <Legend />

          {/* Linje penetration */}
          {visibleLines.penetration && <Line
            yAxisId="left"
            type="monotone"
            dataKey="penetration"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            name={penetrationLabel}
          />}
          {/* Linje velocity */}
          {visibleLines.velocity && <Line
            yAxisId="right"
            type="monotone"
            dataKey="velocity"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name={velocityLabel}
          />}
          {/* Linje energy */}
          {visibleLines.energy && <Line
            yAxisId="energy"
            type="monotone"
            dataKey="energy"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            name={energyLabel}
          />}

          {/* Referens-linjer */}
          {visibleLines.penetration && <>
            <ReferenceLine
                yAxisId="left"
                y={duckLine}
                stroke="green"
                strokeDasharray="3 3"
                label={{ value: "And/Duck", fill: 'green', position: 'insideTopLeft' }}
            />
            <ReferenceLine
                yAxisId="left"
                y={roeLine}
                stroke="red"
                strokeDasharray="3 3"
                label={{ value: "Rådjur", fill: 'red', position: 'insideTopLeft' }}
            />
            <ReferenceLine
                yAxisId="left"
                y={boarLine}
                stroke="purple"
                strokeDasharray="3 3"
                label={{ value: "Vildsvin", fill: 'purple', position: 'insideTopLeft' }}
            />
          </>}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
