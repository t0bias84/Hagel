import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, MessageSquare, Share2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [load, setLoad] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState('');
  const [votes, setVotes] = useState({ upvotes: 0, downvotes: 0 });
  const [userVote, setUserVote] = useState(null);

  // Hämta laddningsdata
  useEffect(() => {
    async function fetchLoadDetails() {
      try {
        const token = localStorage.getItem('token');
        const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/loads/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!resp.ok) throw new Error('Kunde inte hämta laddningsdetaljer');
        const data = await resp.json();
        setLoad(data);
        
        // Hämta röster
        const votesResp = await fetch(`${import.meta.env.VITE_API_URL}/api/loads/${id}/votes`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (votesResp.ok) {
          const votesData = await votesResp.json();
          setVotes(votesData.votes);
          setUserVote(votesData.userVote);
        }

        // Hämta kommentarer
        const commentsResp = await fetch(`${import.meta.env.VITE_API_URL}/api/loads/${id}/comments`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (commentsResp.ok) {
          const commentsData = await commentsResp.json();
          setComments(commentsData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLoadDetails();
  }, [id]);

  // Hantera röstning
  const handleVote = async (voteType) => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/loads/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ voteType })
      });
      if (!resp.ok) throw new Error('Kunde inte rösta');
      const data = await resp.json();
      setVotes(data.votes);
      setUserVote(voteType);
    } catch (err) {
      setError(err.message);
    }
  };

  // Lägg till kommentar
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/loads/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });
      if (!resp.ok) throw new Error('Kunde inte lägga till kommentar');
      const comment = await resp.json();
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Laddar...</div>;
  if (!load) return <div className="flex justify-center items-center h-screen">Laddning hittades inte</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tillbaka-knapp */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Tillbaka till laddningar
      </button>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Huvudinformation */}
      <div className="bg-military-800 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{load.name}</h1>
            {load.ownerName && (
              <p className="text-gray-400 mt-1">
                Skapad av: {load.ownerName}
              </p>
            )}
            {load.tags && load.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {load.tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="px-2 py-1 text-xs bg-military-700 text-gray-300 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleVote('up')}
              className={`flex items-center space-x-1 ${
                userVote === 'up' ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
              }`}
            >
              <ThumbsUp className="w-5 h-5" />
              <span>{votes.upvotes}</span>
            </button>
            <button
              onClick={() => handleVote('down')}
              className={`flex items-center space-x-1 ${
                userVote === 'down' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              }`}
            >
              <ThumbsDown className="w-5 h-5" />
              <span>{votes.downvotes}</span>
            </button>
            <button
              onClick={() => {/* Dela-funktion */}}
              className="text-gray-400 hover:text-white"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Detaljerad laddningsinformation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-red-400">Komponenter</h2>
            <div className="space-y-2 text-gray-300">
              <p className="flex justify-between">
                <span className="font-medium">Hylsa:</span>
                <span>{load.hullObject?.name || "Ej vald"}</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">Tändhatt:</span>
                <span>{load.primerObject?.name || "Ej vald"}</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">Krut:</span>
                <span>{load.powderObject?.name || "Ej valt"} {load.powderWeight ? `(${load.powderWeight} gr)` : ""}</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">Förladdning:</span>
                <span>{load.wadObject?.name || "Ej vald"}</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">Hagel:</span>
                <span>
                  {load.shotObject?.name || load.shotLoads?.[0]?.material || "Ej valt"} 
                  {load.shotWeight ? ` (${load.shotWeight} gr)` : ""}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-red-400">Specifikationer</h2>
            <div className="space-y-2 text-gray-300">
              <p className="flex justify-between">
                <span className="font-medium">Kaliber:</span>
                <span>{load.gauge}</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">Hylslängd:</span>
                <span>{load.shellLength} mm</span>
              </p>
              {load.velocity && (
                <p className="flex justify-between">
                  <span className="font-medium">Hastighet:</span>
                  <span>{load.velocity} m/s</span>
                </p>
              )}
              {load.pressure && (
                <p className="flex justify-between">
                  <span className="font-medium">Tryck:</span>
                  <span>{load.pressure} bar</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {load.description && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Beskrivning</h2>
            <p className="text-gray-300">{load.description}</p>
          </div>
        )}
      </div>

      {/* Kommentarer */}
      <div className="bg-military-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          Kommentarer
        </h2>

        {/* Kommentarformulär */}
        <form onSubmit={handleAddComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Skriv en kommentar..."
            className="w-full p-3 rounded bg-military-700 text-white placeholder-gray-400 border border-military-600 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            rows="3"
          />
          <button
            type="submit"
            className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-white"
          >
            Lägg till kommentar
          </button>
        </form>

        {/* Kommentarlista */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment._id} className="border-b border-military-700 pb-4">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-300">{comment.author}</span>
                <span className="text-sm text-gray-500">
                  {new Date(comment.createdAt).toLocaleDateString('sv-SE')}
                </span>
              </div>
              <p className="text-gray-300">{comment.content}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-gray-500 text-center">Inga kommentarer än</p>
          )}
        </div>
      </div>
    </div>
  );
} 