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
import { yardToMeter, inchToMm, fpsToMps } from "./penetrationUtils";

function CustomTooltip({ active, payload, label, isMetric }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-gray-900 p-2 rounded text-xs text-white shadow-md">
      <p className="font-semibold mb-1">
        {isMetric ? `Avstånd: ${label} m` : `Distance: ${label} yd`}
      </p>
      {payload.map((pl, i) => (
        <p key={i} style={{ color: pl.color }}>
          {pl.name}: {pl.value}
        </p>
      ))}
    </div>
  );
}

export default function PenetrationChart({ data=[], isMetric=false }) {
  if(!data || data.length===0) {
    return <div className="text-gray-400 text-sm">Ingen data</div>;
  }

  // Konvertera
  const convertedData = data.map(item => {
    const dist = isMetric ? yardToMeter(item.distance_yd) : item.distance_yd;
    const pen = isMetric ? inchToMm(item.penetration_in) : item.penetration_in;
    const vel = isMetric ? fpsToMps(item.velocity_fps) : item.velocity_fps;
    return {
      distance: Number(dist.toFixed(1)),
      penetration: Number(pen.toFixed(2)),
      velocity: Number(vel.toFixed(1))
    };
  });

  const distanceLabel = isMetric ? "Avstånd (m)" : "Distance (yd)";
  const penetrationLabel = isMetric ? "Penetration (mm)" : "Penetration (in)";
  const velocityLabel = isMetric ? "Hastighet (m/s)" : "Velocity (fps)";

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
        <LineChart data={convertedData} margin={{top:10,right:30,left:0,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="distance"
            label={{
              value: distanceLabel,
              position:"insideBottomRight",
              offset:-5,
              style:{fill:"#aaa"}
            }}
          />
          <YAxis
            yAxisId="left"
            stroke="#f97316"
            label={{
              value: penetrationLabel,
              angle:-90,
              position:"insideLeft",
              style:{ fill:"#aaa"}
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#3b82f6"
            label={{
              value: velocityLabel,
              angle:-90,
              position:"insideRight",
              style:{fill:"#aaa"}
            }}
          />
          <Tooltip
            content={(props)=><CustomTooltip {...props} isMetric={isMetric}/>}
          />
          <Legend />

          {/* Linje penetration */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="penetration"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            name={penetrationLabel}
          />
          {/* Linje velocity */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="velocity"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name={velocityLabel}
          />

          {/* Referens-linjer */}
          <ReferenceLine
            yAxisId="left"
            y={duckLine}
            stroke="green"
            strokeDasharray="3 3"
            label="And/Duck-min"
          />
          <ReferenceLine
            yAxisId="left"
            y={roeLine}
            stroke="red"
            strokeDasharray="3 3"
            label="Rådjur-min"
          />
          <ReferenceLine
            yAxisId="left"
            y={boarLine}
            stroke="purple"
            strokeDasharray="3 3"
            label="Vildsvin-min"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
