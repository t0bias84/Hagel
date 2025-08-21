import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

export const useSettings = () => {
  const navigate = useNavigate();
  const { token, user, refreshToken } = useAuth();

  const [settings, setSettings] = useState({
    interface: { theme: 'dark', language: 'sv', measurementUnit: 'metric' },
    privacy: { profileVisibility: 'public', showOnlineStatus: true, showLoadingData: true, showForumStats: true },
    social: {
      allowFriendRequests: true,
      allowMessages: true,
      allowGroupInvites: true,
      showActivity: true,
      blockedUsers: [],
      preferredCommunication: 'both',
      notificationPreferences: { friendRequests: true, messages: true, mentions: true, loadComments: true, groupInvites: true },
    },
    displayName: user?.username || '',
    bio: '',
    location: { country: 'Sverige', city: '', club: '' },
    hunting: { interests: [], experience: '', preferredGame: [], licenses: [] },
    equipment: { firearms: [], reloadingEquipment: [], accessories: [] },
    profileImage: '',
    security: { twoFactorEnabled: false },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!token || !user) {
      setError('You must be logged in to view settings');
      navigate('/login', { state: { from: '/settings', message: 'Please log in to view your settings' } });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/user/settings`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await refreshToken();
          if (refreshed) {
            fetchSettings(); // Retry with new token
          } else {
            setError('Your session has expired. Please log in again.');
            navigate('/login', { state: { from: '/settings', message: 'Your session has expired. Please log in again.' } });
          }
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      if (data && Object.keys(data).length > 0) {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      setError(`Ett fel uppstod: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [token, user, navigate, refreshToken]);

  useEffect(() => {
    if (!initialized) {
      fetchSettings();
      setInitialized(true);
    }
  }, [initialized, fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!token) {
        setError('You must be logged in to save settings');
        navigate('/login', { state: { from: '/settings' } });
        return;
      }

      const response = await fetch(`${API_URL}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.');
          navigate('/login', { state: { from: '/settings' } });
        } else {
          setError(`Could not save settings: ${errorText}`);
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      setSuccessMessage('Settings saved');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(`Ett fel uppstod: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateNestedState = (category, field, value) => {
    setSettings(prev => ({
        ...prev,
        [category]: {
            ...prev[category],
            [field]: value
        }
    }));
  };

  const updateEquipment = (type, index, field, value) => {
      setSettings(prev => {
          const newEquipment = [...(prev.equipment[type] || [])];
          newEquipment[index] = { ...newEquipment[index], [field]: value };
          return {
              ...prev,
              equipment: {
                  ...prev.equipment,
                  [type]: newEquipment
              }
          };
      });
  };

  const addEquipment = (type) => {
      const newEquipment = { id: crypto.randomUUID() };
      if (type === 'firearms') {
          Object.assign(newEquipment, { manufacturer: "", model: "", gauge: "12", barrelLength: "", chokes: [], serialNumber: "", purchaseYear: "", notes: "" });
      } else if (type === 'reloadingEquipment') {
          Object.assign(newEquipment, { type: "press", manufacturer: "", model: "", purchaseYear: "", notes: "" });
      }

      setSettings(prev => ({
          ...prev,
          equipment: {
              ...prev.equipment,
              [type]: [...(prev.equipment[type] || []), newEquipment]
          }
      }));
  };

  return {
    settings,
    loading,
    saving,
    error,
    successMessage,
    setSettings,
    handleSave,
    updateNestedState,
    updateEquipment,
    addEquipment,
  };
};
