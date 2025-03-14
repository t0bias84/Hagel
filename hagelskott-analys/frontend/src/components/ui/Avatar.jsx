// src/components/ui/Avatar.jsx

import React from "react";

/**
 * Avatar
 * ======
 * Visar första bokstaven i username, eller "?" om tomt.
 * Props:
 *  - username (string): Användarens namn
 *  - size (number): px-storlek (bredd & höjd)
 *  - bgColor (string): valfri bakgrundsfärg i ex. #hex eller tailwind-klass
 */
export default function Avatar({ 
  username = "", 
  size = 40, 
  bgColor = "bg-blue-500" 
}) {
  const initial = username.trim().charAt(0).toUpperCase() || "?";

  // In-line style för höjd/bredd (px), sedan lite Tailwind för form & text
  const style = { width: size, height: size };

  return (
    <div
      className={`
        ${bgColor} 
        text-white 
        rounded-full 
        flex 
        items-center 
        justify-center 
        font-semibold 
        select-none
      `}
      style={style}
      title={username || "Okänd användare"}
    >
      {initial}
    </div>
  );
}
