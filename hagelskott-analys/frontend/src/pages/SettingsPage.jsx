import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings2,
  User,
  Shield,
  Trophy,
  Mail,
  Facebook,
  Github,
  Target,
  Save,
  AlertCircle,
  Check,
  Upload,
  Crosshair,
  Users,
  CheckCircle2,
  Switch,
} from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";

const API_URL = import.meta.env.VITE_API_URL;

const SettingsPage = () => {
  const navigate = useNavigate();
  const { token, user, refreshToken } = useAuth();
  const { language, setLanguage } = useLanguage();
  const t = language === 'en' ? en : sv;

  // **FLIKAR**: definiera vilka flikar som finns
  const tabs = [
    { id: "general", icon: Settings2, label: t.settings?.tabs?.general || "Allmänt" },
    { id: "profile", icon: User, label: t.settings?.tabs?.profile || "Profil" },
    { id: "equipment", icon: Target, label: t.settings?.tabs?.equipment || "Utrustning" },
    { id: "security", icon: Shield, label: t.settings?.tabs?.security || "Säkerhet" },
    { id: "achievements", icon: Trophy, label: t.settings?.tabs?.achievements || "Prestationer" },
    { id: "social", icon: Users, label: t.settings?.tabs?.social || "Socialt" },
  ];

  // **STATE**
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Alla inställningar (standardvärden om inte backend ger något)
  const [settings, setSettings] = useState({
    interface: {
      theme: "dark",
      language: "sv",
      measurementUnit: "metric",
    },
    privacy: {
      profileVisibility: "public",
      showOnlineStatus: true,
      showLoadingData: true,
      showForumStats: true,
    },
    social: {
      allowFriendRequests: true,
      allowMessages: true,
      allowGroupInvites: true,
      showActivity: true,
      blockedUsers: [],
      preferredCommunication: "both", // "messages", "comments", "both"
      notificationPreferences: {
        friendRequests: true,
        messages: true,
        mentions: true,
        loadComments: true,
        groupInvites: true,
      },
    },
    displayName: user?.username || "",
    bio: "",
    location: {
      country: "Sverige",
      city: "",
      club: "",
    },
    hunting: {
      interests: [],
      experience: "",
      preferredGame: [],
      licenses: [],
    },
    equipment: {
      firearms: [],
      reloadingEquipment: [],
      accessories: []
    },
    profileImage: "",
    security: {
      twoFactorEnabled: false,
    }
  });

  // Memoize checkAuthAndFetchSettings function
  const checkAuthAndFetchSettings = useCallback(async () => {
    console.log('Auth state:', {
      hasToken: !!token,
      hasUser: !!user,
      username: user?.username
    });

    if (!token || !user) {
      console.error('Missing authentication:', {
        hasToken: !!token,
        hasUser: !!user
      });
      setError('You must be logged in to view settings');
      navigate('/login', { 
        state: { 
          from: '/settings',
          message: 'Please log in to view your settings'
        } 
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/user/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await refreshToken();
          if (!refreshed) {
            setError('Your session has expired. Please log in again.');
            navigate('/login', { 
              state: { 
                from: '/settings',
                message: 'Your session has expired. Please log in again.'
              } 
            });
            return;
          }
          // Försök hämta inställningar igen med ny token
          return checkAuthAndFetchSettings();
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Settings response:', data);
      if (data && Object.keys(data).length > 0) {
        setSettings(data);
      } else {
        console.log('Using default settings since API returned empty data');
      }
    } catch (error) {
      console.error('Settings fetch error:', error);
      setError(`Ett fel uppstod: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [token, user, navigate, refreshToken]);

  // Kontrollera inloggningsstatus endast vid första renderingen
  useEffect(() => {
    if (!initialized) {
      checkAuthAndFetchSettings();
      setInitialized(true);
    }
  }, [initialized, checkAuthAndFetchSettings]);

  // Uppdatera dark-mode när "theme" ändras
  useEffect(() => {
    if (settings?.interface?.theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [settings?.interface?.theme]);

  // Spara inställningar
  const handleSave = async () => {
    console.log('Attempting to save settings...');
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!token) {
        console.error('No token available for saving settings');
        setError('You must be logged in to save settings');
        navigate('/login', { state: { from: '/settings' } });
        return;
      }

      console.log('Saving settings with token:', token.substring(0, 20) + '...');
      
      const response = await fetch(`${API_URL}/api/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      console.log('Save settings response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save settings error:', errorText);
        
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.');
          navigate('/login', { state: { from: '/settings' } });
        } else {
          setError(`Could not save settings: ${errorText}`);
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      console.log('Settings saved successfully');
      setSuccessMessage('Settings saved');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error in handleSave:', error);
      setError(`Ett fel uppstod: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Exempel: Ladda upp profilbild
  const handleProfileImageUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/user/profile-image`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Could not upload file");
      const data = await res.json();

      // Uppdatera state med nya fil-URL:en
      setSettings((prev) => ({
        ...prev,
        profileImage: data.image_url,
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  // Funktioner för att hantera utrustning
  const addFirearm = () => {
    setSettings({
      ...settings,
      equipment: {
        ...settings.equipment,
        firearms: [
          ...(settings.equipment?.firearms || []),
          {
            id: crypto.randomUUID(),
            manufacturer: "",
            model: "",
            gauge: "12",
            barrelLength: "",
            chokes: [],
            serialNumber: "",
            purchaseYear: "",
            notes: "",
          }
        ],
      },
    });
  };

  const addReloadingEquipment = () => {
    setSettings({
      ...settings,
      equipment: {
        ...settings.equipment,
        reloadingEquipment: [
          ...(settings.equipment?.reloadingEquipment || []),
          {
            id: crypto.randomUUID(),
            type: "press",
            manufacturer: "",
            model: "",
            purchaseYear: "",
            notes: "",
          }
        ],
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin text-dark-accent">
          <Settings2 className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-4 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            {t.settings?.title || "Settings"}
          </h1>
          <p className="text-gray-200 mt-2">
            {t.settings?.description || "Manage your account settings and preferences"}
          </p>
        </div>

        {/* Flikar */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  transition-colors duration-200
                  ${
                    activeTab === tab.id
                      ? "bg-dark-accent text-white"
                      : "bg-dark-800 text-gray-200 hover:bg-dark-700 hover:text-white"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Felmeddelande */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Framgångsmeddelande */}
        {successMessage && (
          <Alert className="mb-6 bg-dark-accent/20 text-white border-dark-accent">
            <Check className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Innehåll */}
        <div className="grid gap-6">
          <Card className="bg-dark-800 border-dark-700">
            <CardHeader>
              <CardTitle className="text-white">
                {t.settings?.sections?.[activeTab]?.title || "Settings"}
              </CardTitle>
              <CardDescription className="text-gray-200">
                {t.settings?.sections?.[activeTab]?.description || "Manage your settings"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-white">Tema</label>
                      <select 
                        value={settings.interface.theme}
                        onChange={(e) => setSettings({
                          ...settings,
                          interface: { ...settings.interface, theme: e.target.value }
                        })}
                        className="w-full p-2 rounded-lg bg-dark-700 text-white border border-dark-600"
                      >
                        <option value="dark">Mörkt</option>
                        <option value="light">Ljust</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-white">Språk</label>
                      <select 
                        value={settings.interface.language}
                        onChange={(e) => setSettings({
                          ...settings,
                          interface: { ...settings.interface, language: e.target.value }
                        })}
                        className="w-full p-2 rounded-lg bg-dark-700 text-white border border-dark-600"
                      >
                        <option value="sv">Svenska</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-white">Måttenhet</label>
                      <select 
                        value={settings.interface.measurementUnit}
                        onChange={(e) => setSettings({
                          ...settings,
                          interface: { ...settings.interface, measurementUnit: e.target.value }
                        })}
                        className="w-full p-2 rounded-lg bg-dark-700 text-white border border-dark-600"
                      >
                        <option value="metric">Metrisk (mm, gram)</option>
                        <option value="imperial">Imperial (tum, grain)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Profile Settings</h3>
                    <p className="text-sm text-gray-500">
                      Update your profile information
                    </p>
                  </div>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="Enter your username"
                        value={settings.displayName}
                        onChange={(e) => setSettings({
                          ...settings,
                          displayName: e.target.value
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="Enter your email"
                        value={settings.email || ""}
                        onChange={(e) => setSettings({
                          ...settings,
                          email: e.target.value
                        })}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              )}

              {activeTab === "equipment" && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white text-lg font-semibold">Vapen</h3>
                      <button
                        onClick={addFirearm}
                        className="px-4 py-2 rounded-lg bg-dark-accent text-white hover:bg-dark-accent/90"
                      >
                        Lägg till vapen
                      </button>
                    </div>
                    {settings.equipment?.firearms?.map((firearm, index) => (
                      <div key={firearm.id} className="p-4 bg-dark-700 rounded-lg mb-4">
                        <div className="grid gap-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-white">Tillverkare</label>
                              <input 
                                type="text"
                                value={firearm.manufacturer}
                                onChange={(e) => {
                                  const newFirearms = [...settings.equipment.firearms];
                                  newFirearms[index] = {
                                    ...newFirearms[index],
                                    manufacturer: e.target.value
                                  };
                                  setSettings({
                                    ...settings,
                                    equipment: {
                                      ...settings.equipment,
                                      firearms: newFirearms
                                    }
                                  });
                                }}
                                className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-white">Modell</label>
                              <input 
                                type="text"
                                value={firearm.model}
                                onChange={(e) => {
                                  const newFirearms = [...settings.equipment.firearms];
                                  newFirearms[index] = {
                                    ...newFirearms[index],
                                    model: e.target.value
                                  };
                                  setSettings({
                                    ...settings,
                                    equipment: {
                                      ...settings.equipment,
                                      firearms: newFirearms
                                    }
                                  });
                                }}
                                className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-white">Kaliber</label>
                              <select
                                value={firearm.gauge}
                                onChange={(e) => {
                                  const newFirearms = [...settings.equipment.firearms];
                                  newFirearms[index] = {
                                    ...newFirearms[index],
                                    gauge: e.target.value
                                  };
                                  setSettings({
                                    ...settings,
                                    equipment: {
                                      ...settings.equipment,
                                      firearms: newFirearms
                                    }
                                  });
                                }}
                                className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500"
                              >
                                <option value="12">12</option>
                                <option value="16">16</option>
                                <option value="20">20</option>
                                <option value="28">28</option>
                                <option value="410">.410</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-white">Piplängd (mm)</label>
                              <input 
                                type="number"
                                value={firearm.barrelLength}
                                onChange={(e) => {
                                  const newFirearms = [...settings.equipment.firearms];
                                  newFirearms[index] = {
                                    ...newFirearms[index],
                                    barrelLength: e.target.value
                                  };
                                  setSettings({
                                    ...settings,
                                    equipment: {
                                      ...settings.equipment,
                                      firearms: newFirearms
                                    }
                                  });
                                }}
                                className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white text-lg font-semibold">Laddutrustning</h3>
                      <button
                        onClick={addReloadingEquipment}
                        className="px-4 py-2 rounded-lg bg-dark-accent text-white hover:bg-dark-accent/90"
                      >
                        Lägg till laddutrustning
                      </button>
                    </div>
                    {settings.equipment?.reloadingEquipment?.map((equipment, index) => (
                      <div key={equipment.id} className="p-4 bg-dark-700 rounded-lg mb-4">
                        <div className="grid gap-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-white">Typ</label>
                              <select
                                value={equipment.type}
                                onChange={(e) => {
                                  const newEquipment = [...settings.equipment.reloadingEquipment];
                                  newEquipment[index] = {
                                    ...newEquipment[index],
                                    type: e.target.value
                                  };
                                  setSettings({
                                    ...settings,
                                    equipment: {
                                      ...settings.equipment,
                                      reloadingEquipment: newEquipment
                                    }
                                  });
                                }}
                                className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500"
                              >
                                <option value="press">Laddpress</option>
                                <option value="scale">Våg</option>
                                <option value="powder_measure">Krutdoserare</option>
                                <option value="tumbler">Hylsrengörare</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-white">Tillverkare</label>
                              <input 
                                type="text"
                                value={equipment.manufacturer}
                                onChange={(e) => {
                                  const newEquipment = [...settings.equipment.reloadingEquipment];
                                  newEquipment[index] = {
                                    ...newEquipment[index],
                                    manufacturer: e.target.value
                                  };
                                  setSettings({
                                    ...settings,
                                    equipment: {
                                      ...settings.equipment,
                                      reloadingEquipment: newEquipment
                                    }
                                  });
                                }}
                                className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-white">Anteckningar</label>
                            <textarea
                              value={equipment.notes}
                              onChange={(e) => {
                                const newEquipment = [...settings.equipment.reloadingEquipment];
                                newEquipment[index] = {
                                  ...newEquipment[index],
                                  notes: e.target.value
                                };
                                setSettings({
                                  ...settings,
                                  equipment: {
                                    ...settings.equipment,
                                    reloadingEquipment: newEquipment
                                  }
                                });
                              }}
                              className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500 min-h-[100px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.security?.twoFactorEnabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          twoFactorEnabled: e.target.checked
                        }
                      })}
                      className="w-4 h-4 rounded border-dark-600"
                    />
                    <label className="text-white">Aktivera tvåfaktorsautentisering</label>
                  </div>
                </div>
              )}

              {activeTab === "social" && (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-white">Profilsynlighet</label>
                      <select 
                        value={settings.privacy?.profileVisibility}
                        onChange={(e) => setSettings({
                          ...settings,
                          privacy: {
                            ...settings.privacy,
                            profileVisibility: e.target.value
                          }
                        })}
                        className="w-full p-2 rounded-lg bg-dark-700 text-white border border-dark-600"
                      >
                        <option value="public">Offentlig</option>
                        <option value="friends">Endast vänner</option>
                        <option value="private">Privat</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-white">Kommunikationsinställningar</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.social?.allowFriendRequests}
                            onChange={(e) => setSettings({
                              ...settings,
                              social: {
                                ...settings.social,
                                allowFriendRequests: e.target.checked
                              }
                            })}
                            className="w-4 h-4 rounded border-dark-600"
                          />
                          <label className="text-white">Tillåt vänförfrågningar</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.social?.allowMessages}
                            onChange={(e) => setSettings({
                              ...settings,
                              social: {
                                ...settings.social,
                                allowMessages: e.target.checked
                              }
                            })}
                            className="w-4 h-4 rounded border-dark-600"
                          />
                          <label className="text-white">Tillåt direktmeddelanden</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.social?.showActivity}
                            onChange={(e) => setSettings({
                              ...settings,
                              social: {
                                ...settings.social,
                                showActivity: e.target.checked
                              }
                            })}
                            className="w-4 h-4 rounded border-dark-600"
                          />
                          <label className="text-white">Visa min aktivitet</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "achievements" && (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="p-4 bg-dark-700 rounded-lg">
                      <h3 className="text-white text-lg font-semibold mb-4">Jaktprestationer</h3>
                      <div className="space-y-4">
                        {settings.hunting?.licenses?.map((license, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-white">{license}</span>
                            <button
                              onClick={() => {
                                const newLicenses = settings.hunting.licenses.filter((_, i) => i !== index);
                                setSettings({
                                  ...settings,
                                  hunting: {
                                    ...settings.hunting,
                                    licenses: newLicenses
                                  }
                                });
                              }}
                              className="text-white hover:text-red-500"
                            >
                              Ta bort
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const license = prompt('Lägg till ny jaktlicens:');
                            if (license) {
                              setSettings({
                                ...settings,
                                hunting: {
                                  ...settings.hunting,
                                  licenses: [...(settings.hunting?.licenses || []), license]
                                }
                              });
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-dark-accent text-white hover:bg-dark-accent/90"
                        >
                          Lägg till jaktlicens
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-dark-700 rounded-lg">
                      <h3 className="text-white text-lg font-semibold mb-4">Erfarenhet</h3>
                      <div className="space-y-2">
                        <label className="text-white">Jakterfarenhet (år)</label>
                        <input
                          type="number"
                          value={settings.hunting?.experience || ""}
                          onChange={(e) => setSettings({
                            ...settings,
                            hunting: {
                              ...settings.hunting,
                              experience: e.target.value
                            }
                          })}
                          className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-dark-700 rounded-lg">
                      <h3 className="text-white text-lg font-semibold mb-4">Föredragna vilttyper</h3>
                      <div className="space-y-4">
                        {settings.hunting?.preferredGame?.map((game, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-white">{game}</span>
                            <button
                              onClick={() => {
                                const newPreferredGame = settings.hunting.preferredGame.filter((_, i) => i !== index);
                                setSettings({
                                  ...settings,
                                  hunting: {
                                    ...settings.hunting,
                                    preferredGame: newPreferredGame
                                  }
                                });
                              }}
                              className="text-white hover:text-red-500"
                            >
                              Ta bort
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const game = prompt('Lägg till ny vilttyp:');
                            if (game) {
                              setSettings({
                                ...settings,
                                hunting: {
                                  ...settings.hunting,
                                  preferredGame: [...(settings.hunting?.preferredGame || []), game]
                                }
                              });
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-dark-accent text-white hover:bg-dark-accent/90"
                        >
                          Lägg till vilttyp
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Spara-knapp */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg
              bg-dark-accent text-white
              hover:bg-dark-accent/90
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            `}
          >
            {saving ? (
              <Settings2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Saving..." : "Save changes"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
