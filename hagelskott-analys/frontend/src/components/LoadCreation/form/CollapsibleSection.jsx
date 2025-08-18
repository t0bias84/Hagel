import React from 'react';

export default function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  selectedText,
  selected = false,
  children,
  locked = false,
  lockedText = "",
}) {
  const bg = selected ? "bg-green-900" : "bg-military-800";
  return (
    <div className={`${bg} p-3 rounded mb-3 transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
          {selectedText && <p className="text-xs text-gray-200 mt-1">{selectedText}</p>}
        </div>
        {locked ? (
          <p className="text-[10px] text-gray-400">{lockedText}</p>
        ) : (
          <button onClick={onToggle} className="text-xs text-gray-300 hover:text-gray-100">
            {isOpen ? "Dölj" : "Visa"}
          </button>
        )}
      </div>
      {isOpen && !locked && <div>{children}</div>}
    </div>
  );
}
