import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadCard from '@/components/LoadCreation/LoadCard'; // Assuming LoadCard is reusable
import { apiFetch } from '@/services/api'; // Assuming a generic fetch wrapper

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // This is a placeholder for the current user, would come from AuthContext
  const [currentUser, setCurrentUser] = useState({ id: 'some_current_user_id' });
  const [favorites, setFavorites] = useState(new Set()); // Placeholder

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch profile and loads in parallel
        const [profileData, loadsData] = await Promise.all([
          apiFetch(`/users/profile/${userId}`),
          apiFetch(`/users/${userId}/loads`)
        ]);

        setProfile(profileData);
        setLoads(loadsData);

      } catch (err) {
        setError(err.message || 'Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfileData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!profile) {
    return <div className="text-center py-20">User not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start gap-8">
        {/* Profile Sidebar */}
        <div className="w-1/4">
          <div className="bg-military-800 p-6 rounded-lg shadow-lg">
            <img
              src={profile.imageUrl || '/path/to/default/avatar.png'}
              alt={profile.displayName}
              className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-military-700"
            />
            <h1 className="text-2xl font-bold text-center text-white">{profile.displayName}</h1>
            {profile.location && <p className="text-center text-gray-400 text-sm mt-1">{profile.location}</p>}
            <p className="text-center text-gray-300 text-sm mt-4">{profile.bio || 'No bio available.'}</p>
          </div>
        </div>

        {/* User's Loads */}
        <div className="w-3/4">
          <h2 className="text-xl font-bold mb-4 text-white">Loads created by {profile.displayName}</h2>
          {loads.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loads.map(load => (
                <LoadCard
                  key={load._id}
                  load={load}
                  currentUser={currentUser}
                  isFavorite={favorites.has(load._id)}
                  // Passing empty functions for actions that might not be relevant on this page
                  onToggleFavorite={() => {}}
                  onDelete={() => {}}
                  onEdit={() => {}}
                  onShare={() => {}}
                  onGoToForum={() => {}}
                  onGoToPattern={() => {}}
                  onGoToPenetration={() => {}}
                  onGoToRecoil={() => {}}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-400">This user has not published any loads yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
