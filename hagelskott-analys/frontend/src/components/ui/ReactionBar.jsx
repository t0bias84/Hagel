// src/components/ui/ReactionBar.jsx

import React from "react";

// Exempelikoner från Lucide (om du vill):
import { 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  Smile, 
  Star 
} from "lucide-react";

/**
 * ReactionBar
 * ===========
 * Visar en rad reaktionsknappar. När man klickar på en reaktion
 * anropas `onReact`-callbacken med en kod för reaktionen.
 *
 * Props:
 *  - onReact(reactionCode): callback som triggas när användaren klickar
 *  - reactionIcons: array med { code, label, icon }
 */
export default function ReactionBar({ 
  onReact, 
  userReaction = null 
}) {
  // Exempel: hårdkodade reaktioner
  // code = unik sträng, label = tooltip-text, icon = en React-komponent
  const REACTIONS = [
    { code: "like", label: "Gilla", icon: <ThumbsUp className="w-4 h-4" /> },
    { code: "dislike", label: "Ogilla", icon: <ThumbsDown className="w-4 h-4" /> },
    { code: "wtf", label: "WTF?", icon: <AlertTriangle className="w-4 h-4" /> },
    { code: "lol", label: "LOL", icon: <Smile className="w-4 h-4" /> },
    { code: "fav", label: "Favorit", icon: <Star className="w-4 h-4" /> },
  ];

  const handleClick = (reactionCode) => {
    // Ex: toggla bort reaktion om man klickar samma igen
    if (userReaction === reactionCode) {
      onReact?.(null);  // tar bort reaktionen
    } else {
      onReact?.(reactionCode);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {REACTIONS.map((r) => {
        const active = r.code === userReaction;  
        return (
          <button
            key={r.code}
            title={r.label}
            onClick={() => handleClick(r.code)}
            className={`
              flex items-center gap-1 px-2 py-1 text-xs border rounded 
              hover:bg-gray-100 transition
              ${active ? "bg-blue-50 border-blue-400 text-blue-800" : "border-gray-200"}
            `}
          >
            {r.icon}
            <span>{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
