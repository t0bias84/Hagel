import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Trash2,
  Edit3,
  Share2,
  MessageSquarePlus,
  ArrowRightCircle,
  ArrowUpCircle,
  Zap,
} from 'lucide-react';

// A small component to display a single load component detail
const ComponentDetail = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="flex justify-between text-xs">
            <span className="font-medium text-gray-400">{label}:</span>
            <span className="text-gray-200 truncate">{value}</span>
        </div>
    );
};

export default function LoadCard({
  load,
  currentUser,
  isFavorite,
  onToggleFavorite,
  onDelete,
  onEdit,
  onShare,
  onGoToForum,
  onGoToPattern,
  onGoToPenetration,
  onGoToRecoil,
}) {
  const navigate = useNavigate();

  const getPrimerDisplay = (ld) => {
    if (ld.primerObject?.name) return ld.primerObject.name;
    if (ld.primerId && ld.primerId.startsWith("inHull:")) return "Inbyggd";
    return "N/A";
  };

  return (
    <div
      className={`bg-military-800 rounded-lg shadow-lg overflow-hidden border ${
        isFavorite ? "border-yellow-500" : "border-military-700"
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-base font-bold text-white flex-1 pr-2">
            <button
              onClick={() => navigate(`/loads/${load._id}`)}
              className="hover:text-red-400 transition-colors text-left"
            >
              {load.name}
            </button>
          </h2>
          <button
            onClick={() => onToggleFavorite(load._id)}
            className="text-yellow-500 hover:text-yellow-400 text-xl"
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>

        {/* Meta Info */}
        <div className="text-xs text-gray-400 mb-4">
          <p>
            av{' '}
            <Link to={`/profile/${load.ownerId}`} className="hover:text-white hover:underline">
              {load.ownerName || 'Okänd'}
            </Link>
          </p>
          {load.tags && load.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {load.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-military-700 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Core Load Data - Redesigned for clarity */}
        <div className="space-y-2 border-t border-b border-military-700 py-3">
            <ComponentDetail label="Hylsa" value={load.hullObject?.name} />
            <ComponentDetail label="Tändhatt" value={getPrimerDisplay(load)} />
            <ComponentDetail label="Krut" value={`${load.powderObject?.name || ''} (${load.powderWeight || '?'} gr)`} />
            <ComponentDetail label="Förladdning" value={load.wadObject?.name} />
            <ComponentDetail label="Hagel" value={`${load.shotObject?.name || load.shotLoads?.[0]?.material || ''} (${load.shotWeight || '?'} gr)`} />
        </div>

        {load.description && (
            <p className="mt-3 text-xs text-gray-300 italic">
                {load.description}
            </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          {currentUser && load.ownerId === currentUser.id && (
            <>
              <button onClick={() => onEdit(load._id)} className="p-2 bg-military-700 hover:bg-blue-700 rounded-full" title="Redigera">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(load._id)} className="p-2 bg-military-700 hover:bg-red-700 rounded-full" title="Radera">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={() => onShare(load)} className="p-2 bg-military-700 hover:bg-military-600 rounded-full" title="Dela">
            <Share2 className="w-4 h-4" />
          </button>
          <button onClick={() => onGoToForum(load)} className="p-2 bg-military-700 hover:bg-military-600 rounded-full" title="Skapa foruminlägg">
            <MessageSquarePlus className="w-4 h-4" />
          </button>
          <button onClick={() => onGoToPattern(load)} className="p-2 bg-military-700 hover:bg-military-600 rounded-full" title="Mönsteranalys">
            <ArrowRightCircle className="w-4 h-4" />
          </button>
          <button onClick={() => onGoToPenetration(load)} className="p-2 bg-military-700 hover:bg-military-600 rounded-full" title="Penetrationsanalys">
            <ArrowUpCircle className="w-4 h-4" />
          </button>
          <button onClick={() => onGoToRecoil(load)} className="p-2 bg-military-700 hover:bg-military-600 rounded-full" title="Rekylanalys">
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
