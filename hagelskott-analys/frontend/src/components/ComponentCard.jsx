import React from 'react';
import { Camera, Edit, Trash2 } from 'lucide-react';

export default function ComponentCard({ component, onEdit, onDelete }) {
  return (
    <div className="bg-military-700 rounded p-2 hover:bg-military-600 transition-colors">
      <div className="flex items-start gap-2">
        {component.image?.url ? (
          <img
            src={component.image.url}
            alt={component.name}
            className="w-12 h-12 rounded object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-military-600 rounded flex items-center justify-center">
            <Camera className="w-6 h-6 text-gray-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-medium truncate">{component.name}</h4>
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(component._id)}
                className="text-blue-400 p-1 hover:text-blue-300"
                title="Edit"
              >
                <Edit className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDelete(component._id)}
                className="text-red-400 p-1 hover:text-red-300"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 truncate">{component.manufacturer || "—"}</p>
          {component.caliber && (
            <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] bg-military-600 rounded">
              {component.caliber}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
