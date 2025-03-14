import React, { useState, useEffect } from "react";
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
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SettingsPage = () => {
  // **FLIKAR**: definiera vilka flikar som finns
  const tabs = [
    { id: "general", icon: Settings2, label: "Allmänt" },
    { id: "profile", icon: User, label: "Profil" },
    { id: "equipment", icon: Target, label: "Utrustning" },
    { id: "security", icon: Shield, label: "Säkerhet" },
    { id: "achievements", icon: Trophy, label: "Prestationer" },
    { id: "social", icon: Users, label: "Socialt" },
  ];

  // **STATE**
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Alla inställningar (standardvärden om inte backend ger något)
  const [settings, setSettings] = useState({
    interface: {
      theme: "light",
      language: "sv",
      measurementUnit: "metric",
      alerts: {
        newMessages: true,
        forumMentions: true,
        productUpdates: true,
      },
      notifications: {
        email: true,
        browser: true,
        mobile: false,
      },
      layout: {
        compactView: false,
        showSidebar: true,
        dashboardLayout: "grid",
      },
    },
    privacy: {
      profileVisibility: "public",
      showOnlineStatus: true,
      showLoadingData: true,
      showForumStats: true,
    },
    equipment: {
      firearms: [
        {
          manufacturer: "Beretta",
          model: "Silver Pigeon",
          gauge: "12",
          serial: "AB1234",
          image: null,
        },
      ],
      optics: [
        {
          manufacturer: "Zeiss",
          model: "Conquest V4",
          magnification: "4-16x44",
          type: "Kikarsikte",
        },
      ],
      accessories: [],
    },
    connectedAccounts: {
      google: false,
      facebook: false,
      github: false,
    },
    achievements: {
      rank: "Nybörjare",
      points: 100,
      badgeList: [
        {
          id: "sharpshooter",
          name: "Skarpskyttemästare",
          description: "10 perfekta träffbilder",
          progress: 7,
          total: 10,
          unlocked: false,
        },
        {
          id: "expert",
          name: "Analysexpert",
          description: "100 analyserade skott",
          progress: 100,
          total: 100,
          unlocked: true,
        },
      ],
      experiencePoints: 300,
      experiencePercent: 30,
      nextLevelPoints: 1000,
      level: 1,
      recent: [
        {
          title: "Första Perfekta Träffbilden",
          description: "Du fick en 100% täckning i centrum!",
          date: "2024-01-10",
          points: 50,
        },
      ],
      competitions: [
        {
          name: "KM Lerduvor",
          position: 2,
          score: 45,
          date: "2024-02-05",
          participants: 20,
        },
      ],
      stats: {
        totalShots: 50,
        averageAccuracy: 85,
        perfectPatterns: 3,
        competitionsWon: 0,
      },
    },
    security: {
      twoFactorEnabled: false,
    },
    displayName: "MinProfil",
    bio: "Kort presentation om mig...",
    profileImage: null,
  });

  // Hämta inställningar vid start
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:8000/api/users/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Kunde inte hämta inställningar");
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

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
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8000/api/users/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        throw new Error("Misslyckades att spara inställningar");
      }

      // Om vi vill ladda om från servern efter sparning:
      // const updated = await response.json();
      // setSettings(updated);

      setSuccessMessage("Inställningar sparade");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Kunde inte spara inställningar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Exempel: Ladda upp profilbild
  const handleProfileImageUpload = async (file) => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/api/users/profile-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Kunde inte ladda upp fil");
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

  // Laddar vi fortfarande?
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="text-gray-600">Laddar inställningar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inställningar</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Spara ändringar
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Main layout: Sidebar + Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* SIDEBAR */}
        <div className="col-span-3">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-md text-left ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-600"
                    : "bg-transparent text-gray-600 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="col-span-9 space-y-6">
          {/* ================= ALLMÄNT ================= */}
          {activeTab === "general" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Gränssnitt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Tema */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tema
                      </label>
                      <select
                        value={settings.interface.theme}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            interface: {
                              ...settings.interface,
                              theme: e.target.value,
                            },
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300"
                      >
                        <option value="light">Ljust</option>
                        <option value="dark">Mörkt</option>
                        <option value="system">Systemstandard</option>
                      </select>
                    </div>
                    {/* Språk */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Språk
                      </label>
                      <select
                        value={settings.interface.language}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            interface: {
                              ...settings.interface,
                              language: e.target.value,
                            },
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300"
                      >
                        <option value="sv">Svenska</option>
                        <option value="en">English</option>
                        <option value="de">Deutsch</option>
                        <option value="it">Italiano</option>
                        <option value="fi">Suomi</option>
                        <option value="es">Español</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Måttenheter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Måttsystem
                    </label>
                    <select
                      value={settings.interface.measurementUnit}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          interface: {
                            ...settings.interface,
                            measurementUnit: e.target.value,
                          },
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300"
                    >
                      <option value="metric">Metriskt (meter, gram)</option>
                      <option value="imperial">Imperial (yards, grains)</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ================= PROFIL ================= */}
          {activeTab === "profile" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Profilbild och presentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-6">
                    {/* Profilbild */}
                    <div className="flex-shrink-0 relative">
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {settings.profileImage ? (
                          <img
                            src={settings.profileImage}
                            alt="Profilbild"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <label
                        htmlFor="profile-image"
                        className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50"
                      >
                        <Upload className="h-4 w-4 text-gray-600" />
                        <input
                          id="profile-image"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            await handleProfileImageUpload(file);
                          }}
                        />
                      </label>
                    </div>

                    {/* Profilinfo */}
                    <div className="flex-grow space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Visningsnamn
                        </label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border-gray-300"
                          value={settings.displayName || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              displayName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Om mig
                        </label>
                        <textarea
                          className="mt-1 block w-full rounded-md border-gray-300"
                          rows={4}
                          value={settings.bio || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              bio: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ================= UTRUSTNING ================= */}
          {activeTab === "equipment" && (
            <Card>
              <CardHeader>
                <CardTitle>Min utrustning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Vapen */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Vapen</h3>
                  <div className="space-y-4">
                    {settings.equipment.firearms.map((firearm, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                      >
                        <img
                          src={firearm.image || "/placeholder-firearm.jpg"}
                          alt={firearm.model}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div>
                          <h4 className="font-medium">
                            {firearm.manufacturer} {firearm.model}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Kaliber: {firearm.gauge} | Serie: {firearm.serial}
                          </p>
                        </div>
                      </div>
                    ))}
                    <button className="w-full px-4 py-2 border-2 border-dashed rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500">
                      + Lägg till vapen
                    </button>
                  </div>
                </div>

                {/* Optik */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Optik</h3>
                  <div className="space-y-4">
                    {settings.equipment.optics.map((optic, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                      >
                        <Crosshair className="h-8 w-8 text-gray-400" />
                        <div>
                          <h4 className="font-medium">
                            {optic.manufacturer} {optic.model}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Förstoring: {optic.magnification} | Typ:{" "}
                            {optic.type}
                          </p>
                        </div>
                      </div>
                    ))}
                    <button className="w-full px-4 py-2 border-2 border-dashed rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500">
                      + Lägg till optik
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ================= SÄKERHET ================= */}
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Säkerhet och autentisering</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Lösenord */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Ändra lösenord</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nuvarande lösenord
                      </label>
                      <input
                        type="password"
                        className="mt-1 block w-full rounded-md border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nytt lösenord
                      </label>
                      <input
                        type="password"
                        className="mt-1 block w-full rounded-md border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Bekräfta nytt lösenord
                      </label>
                      <input
                        type="password"
                        className="mt-1 block w-full rounded-md border-gray-300"
                      />
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Uppdatera lösenord
                    </button>
                  </div>
                </div>

                {/* Tvåfaktors */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-medium mb-4">
                    Tvåfaktorsautentisering
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Tvåfaktorsautentisering</p>
                        <p className="text-sm text-gray-600">
                          Öka säkerheten genom en kod från din mobil
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.security.twoFactorEnabled}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              security: {
                                ...settings.security,
                                twoFactorEnabled: e.target.checked,
                              },
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </label>
                    </div>

                    {settings.security.twoFactorEnabled && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">
                          Återställningskoder
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Spara dessa koder på ett säkert ställe. De kan
                          användas om du förlorar åtkomst till din
                          autentiseringsapp.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {["ABCD-EFGH-IJKL", "MNOP-QRST-UVWX", "YZAB-CDEF-GHIJ"].map(
                            (code, index) => (
                              <div
                                key={index}
                                className="p-2 bg-white border rounded text-center font-mono"
                              >
                                {code}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aktiva sessioner */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-medium mb-4">Aktiva sessioner</h3>
                  <div className="space-y-4">
                    {[
                      {
                        device: "Windows PC - Chrome",
                        location: "Stockholm, Sverige",
                        lastActive: "Nu",
                        current: true,
                      },
                      {
                        device: "iPhone 13 - Safari",
                        location: "Göteborg, Sverige",
                        lastActive: "För 2 timmar sedan",
                        current: false,
                      },
                    ].map((session, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {session.device}
                            {session.current && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Nuvarande session
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {session.location} • Senast aktiv:{" "}
                            {session.lastActive}
                          </p>
                        </div>
                        {!session.current && (
                          <button className="text-red-600 hover:text-red-700 text-sm">
                            Avsluta session
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* API-nycklar */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-medium mb-4">
                    API-nycklar och integreringar
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="font-medium">Utvecklar-API</p>
                          <p className="text-sm text-gray-600">
                            För anpassade applikationer och integrationer
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                          Skapa ny nyckel
                        </button>
                      </div>
                      <div className="space-y-2">
                        {[
                          {
                            name: "Mobilapp integration",
                            created: "2023-12-15",
                            lastUsed: "2024-01-20",
                          },
                        ].map((key, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-2"
                          >
                            <div>
                              <p className="font-medium">{key.name}</p>
                              <p className="text-xs text-gray-500">
                                Skapad: {key.created} • Senast använd:{" "}
                                {key.lastUsed}
                              </p>
                            </div>
                            <button className="text-red-600 hover:text-red-700 text-sm">
                              Återkalla
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dataexport och kontoradering */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-medium mb-4">Datahantering</h3>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Exportera din data</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Ladda ner en kopia av din data i ett portabelt format
                      </p>
                      <div className="space-y-2">
                        <button className="w-full px-4 py-2 text-left border rounded hover:bg-gray-50 flex items-center justify-between">
                          <span>Exportera all data</span>
                          <span className="text-sm text-gray-500">JSON, CSV</span>
                        </button>
                        <button className="w-full px-4 py-2 text-left border rounded hover:bg-gray-50 flex items-center justify-between">
                          <span>Exportera ladddata</span>
                          <span className="text-sm text-gray-500">CSV</span>
                        </button>
                        <button className="w-full px-4 py-2 text-left border rounded hover:bg-gray-50 flex items-center justify-between">
                          <span>Exportera analyser</span>
                          <span className="text-sm text-gray-500">PDF, CSV</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <h4 className="font-medium text-red-800 mb-2">
                        Radera konto
                      </h4>
                      <p className="text-sm text-red-600 mb-4">
                        När du raderar ditt konto tas all din data bort
                        permanent. Denna åtgärd kan inte ångras.
                      </p>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Radera mitt konto
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ================= PRESTATIONER ================= */}
          {activeTab === "achievements" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Prestationer och utmärkelser</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Ranksystem & Nivå */}
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">
                          {settings.achievements.rank || "Nybörjare"}
                        </h3>
                        <p className="text-blue-100">
                          Nivå {settings.achievements.level || 1}
                        </p>
                      </div>
                      <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center">
                        <Trophy className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="w-full bg-blue-700 rounded-full h-4 mb-2">
                      <div
                        className="bg-white rounded-full h-4 transition-all duration-500"
                        style={{
                          width: `${settings.achievements.experiencePercent || 0}%`,
                        }}
                      />
                    </div>
                    <p className="text-sm text-blue-100">
                      {settings.achievements.experiencePoints || 0} /{" "}
                      {settings.achievements.nextLevelPoints || 1000} XP till
                      nästa nivå
                    </p>
                  </div>

                  {/* Senaste prestationer */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">
                      Senaste prestationer
                    </h3>
                    <div className="space-y-4">
                      {(settings.achievements?.recent || []).map(
                        (achievement, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <Trophy className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{achievement.title}</h4>
                              <p className="text-sm text-gray-600">
                                {achievement.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                Upplåst {achievement.date}
                              </p>
                            </div>
                            <div className="ml-auto">
                              <span className="text-blue-600 font-medium">
                                +{achievement.points} XP
                              </span>
                            </div>
                          </div>
                        )
                      )}
                      {(settings.achievements?.recent || []).length === 0 && (
                        <p className="text-sm text-gray-600">
                          Inga prestationer upplåsta ännu.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badge-liste */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-4">Utmärkelser</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(settings.achievements?.badgeList || []).map((badge) => (
                        <div
                          key={badge.id}
                          className={`p-4 border text-center rounded-lg ${
                            badge.unlocked
                              ? "bg-blue-50 border-blue-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <div
                              className={`h-16 w-16 rounded-full flex items-center justify-center mb-2 ${
                                badge.unlocked ? "bg-blue-100" : "bg-gray-100"
                              }`}
                            >
                              <Trophy
                                className={`h-8 w-8 ${
                                  badge.unlocked
                                    ? "text-blue-600"
                                    : "text-gray-400"
                                }`}
                              />
                            </div>
                            <h4 className="font-medium">{badge.name}</h4>
                            <p className="text-xs text-gray-600 mb-2">
                              {badge.description}
                            </p>
                            {!badge.unlocked && (
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                <div
                                  className="bg-blue-600 rounded-full h-2"
                                  style={{
                                    width: `${
                                      (badge.progress / badge.total) * 100
                                    }%`,
                                  }}
                                />
                              </div>
                            )}
                            <p className="text-xs text-gray-500">
                              {badge.unlocked
                                ? "Upplåst"
                                : `${badge.progress}/${badge.total}`}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(settings.achievements?.badgeList || []).length === 0 && (
                        <p className="col-span-4 text-sm text-gray-600">
                          Inga utmärkelser ännu.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tävlingar */}
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-medium mb-4">Tävlingsresultat</h3>
                    <div className="space-y-4">
                      {(settings.achievements?.competitions || []).map(
                        (comp, i) => (
                          <div key={i} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{comp.name}</h4>
                              <span
                                className={`px-2 py-1 rounded-full text-sm ${
                                  comp.position <= 3
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {comp.position}:a plats
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{comp.date}</p>
                            <div className="mt-2 flex items-center gap-4">
                              <span className="text-sm text-gray-600">
                                Poäng: {comp.score}
                              </span>
                              <span className="text-sm text-gray-600">
                                Deltagare: {comp.participants}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                      {(settings.achievements?.competitions || []).length ===
                        0 && (
                        <p className="text-sm text-gray-600">
                          Inga tävlingsresultat hittades.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Statistik och milstolpar */}
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-medium mb-4">
                      Statistik och milstolpar
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {settings.achievements?.stats?.totalShots || 0}
                        </p>
                        <p className="text-sm text-gray-600">
                          Analyserade skott
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {settings.achievements?.stats?.averageAccuracy || 0}%
                        </p>
                        <p className="text-sm text-gray-600">
                          Genomsnittlig träffsäkerhet
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {settings.achievements?.stats?.perfectPatterns || 0}
                        </p>
                        <p className="text-sm text-gray-600">
                          Perfekta träffbilder
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {
                            settings.achievements?.stats?.competitionsWon ||
                              0
                          }
                        </p>
                        <p className="text-sm text-gray-600">Vunna tävlingar</p>
                      </div>
                    </div>
                  </div>

                  {/* Communityranking */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Communityranking</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Topp 3 */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          {[
                            { position: 2, name: "AnnaS", points: 2850 },
                            { position: 1, name: "JohanL", points: 3100 },
                            { position: 3, name: "ErikM", points: 2600 },
                          ].map((user, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-lg text-center ${
                                user.position === 1
                                  ? "bg-gradient-to-b from-yellow-100 to-yellow-50 border border-yellow-200"
                                  : "bg-gray-50"
                              }`}
                            >
                              <div className="relative">
                                {user.position === 1 && (
                                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <Trophy className="h-8 w-8 text-yellow-500" />
                                  </div>
                                )}
                                <p
                                  className={`text-2xl font-bold ${
                                    user.position === 1 ? "mt-4" : ""
                                  }`}
                                >
                                  #{user.position}
                                </p>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-gray-600">
                                  {user.points} poäng
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Platser 4–8 */}
                        <div className="space-y-2">
                          {Array.from({ length: 5 }, (_, i) => ({
                            position: i + 4,
                            name: `Användare${i + 4}`,
                            points: 2500 - i * 100,
                            change: i % 2 === 0 ? "up" : "down",
                          })).map((u) => (
                            <div
                              key={u.position}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-gray-500">
                                  #{u.position}
                                </span>
                                <span className="font-medium">{u.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{u.points} poäng</span>
                                <span
                                  className={
                                    u.change === "up"
                                      ? "text-green-500"
                                      : "text-red-500"
                                  }
                                >
                                  {u.change === "up" ? "↑" : "↓"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </>
          )}

          {/* ================= SOCIAL ================= */}
          {activeTab === "social" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Anslutna konton</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Google */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Mail className="h-6 w-6 text-red-500" />
                      <div>
                        <h4 className="font-medium">Google</h4>
                        <p className="text-sm text-gray-600">
                          {settings.connectedAccounts.google
                            ? "Anslutet konto"
                            : "Anslut för enkel inloggning"}
                        </p>
                      </div>
                    </div>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        settings.connectedAccounts.google
                          ? "bg-gray-100 text-gray-700"
                          : "bg-blue-600 text-white"
                      }`}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          connectedAccounts: {
                            ...settings.connectedAccounts,
                            google: !settings.connectedAccounts.google,
                          },
                        })
                      }
                    >
                      {settings.connectedAccounts.google
                        ? "Koppla från"
                        : "Anslut"}
                    </button>
                  </div>

                  {/* Facebook */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Facebook className="h-6 w-6 text-blue-600" />
                      <div>
                        <h4 className="font-medium">Facebook</h4>
                        <p className="text-sm text-gray-600">
                          {settings.connectedAccounts.facebook
                            ? "Anslutet konto"
                            : "Anslut för delning av resultat"}
                        </p>
                      </div>
                    </div>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        settings.connectedAccounts.facebook
                          ? "bg-gray-100 text-gray-700"
                          : "bg-blue-600 text-white"
                      }`}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          connectedAccounts: {
                            ...settings.connectedAccounts,
                            facebook: !settings.connectedAccounts.facebook,
                          },
                        })
                      }
                    >
                      {settings.connectedAccounts.facebook
                        ? "Koppla från"
                        : "Anslut"}
                    </button>
                  </div>

                  {/* GitHub */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Github className="h-6 w-6" />
                      <div>
                        <h4 className="font-medium">GitHub</h4>
                        <p className="text-sm text-gray-600">
                          {settings.connectedAccounts.github
                            ? "Anslutet konto"
                            : "Anslut för utvecklarbidrag"}
                        </p>
                      </div>
                    </div>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        settings.connectedAccounts.github
                          ? "bg-gray-100 text-gray-700"
                          : "bg-blue-600 text-white"
                      }`}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          connectedAccounts: {
                            ...settings.connectedAccounts,
                            github: !settings.connectedAccounts.github,
                          },
                        })
                      }
                    >
                      {settings.connectedAccounts.github
                        ? "Koppla från"
                        : "Anslut"}
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Integritetsinställningar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Profilsynlighet */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Profilsynlighet</h4>
                      <p className="text-sm text-gray-600">
                        Vem kan se din profil?
                      </p>
                    </div>
                    <select
                      value={settings.privacy.profileVisibility}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          privacy: {
                            ...settings.privacy,
                            profileVisibility: e.target.value,
                          },
                        })
                      }
                      className="rounded-md border-gray-300"
                    >
                      <option value="public">Alla</option>
                      <option value="friends">Endast vänner</option>
                      <option value="private">Privat</option>
                    </select>
                  </div>

                  {/* Onlinestatus */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Visa onlinestatus</h4>
                      <p className="text-sm text-gray-600">
                        Låt andra se när du är aktiv
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.privacy.showOnlineStatus}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            privacy: {
                              ...settings.privacy,
                              showOnlineStatus: e.target.checked,
                            },
                          })
                        }
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  {/* Ladddata */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Visa ladddata</h4>
                      <p className="text-sm text-gray-600">
                        Dela dina ladddata med andra
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.privacy.showLoadingData}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            privacy: {
                              ...settings.privacy,
                              showLoadingData: e.target.checked,
                            },
                          })
                        }
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
