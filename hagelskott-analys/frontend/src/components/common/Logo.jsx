import React from "react";

const Logo = ({ className = "" }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <svg
        viewBox="0 0 200 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <text
          x="0"
          y="30"
          className="text-3xl font-bold"
          style={{
            fill: "#ffffff",
            fontSize: "32px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: "bold"
          }}
        >
          ShotForge
        </text>
      </svg>
    </div>
  );
};

export default Logo; 