import React, { useState } from "react";
import {
  Settings2,
  User,
  Shield,
  Trophy,
  Save,
  AlertCircle,
  Check,
  Users,
  Target,
} from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSettings } from "@/hooks/useSettings";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";

import GeneralSettings from "./SettingsPage/GeneralSettings";
import ProfileSettings from "./SettingsPage/ProfileSettings";
import EquipmentSettings from "./SettingsPage/EquipmentSettings";
import SecuritySettings from "./SettingsPage/SecuritySettings";
import SocialSettings from "./SettingsPage/SocialSettings";
import AchievementsSettings from "./SettingsPage/AchievementsSettings";

const SettingsPage = () => {
  const { language, setLanguage } = useLanguage();
  const t = language === 'en' ? en : sv;
  const {
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
  } = useSettings();

  const tabs = [
    { id: "general", icon: Settings2, label: t.settings?.tabs?.general || "Allmänt", component: GeneralSettings },
    { id: "profile", icon: User, label: t.settings?.tabs?.profile || "Profil", component: ProfileSettings },
    { id: "equipment", icon: Target, label: t.settings?.tabs?.equipment || "Utrustning", component: EquipmentSettings },
    { id: "security", icon: Shield, label: t.settings?.tabs?.security || "Säkerhet", component: SecuritySettings },
    { id: "achievements", icon: Trophy, label: t.settings?.tabs?.achievements || "Prestationer", component: AchievementsSettings },
    { id: "social", icon: Users, label: t.settings?.tabs?.social || "Socialt", component: SocialSettings },
  ];

  const [activeTab, setActiveTab] = useState("general");

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin text-dark-accent">
          <Settings2 className="w-8 h-8" />
        </div>
      </div>
    );
  }

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

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

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 bg-dark-accent/20 text-white border-dark-accent">
            <Check className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          <Card className="bg-dark-800 border-dark-700">
            <CardHeader>
              <CardTitle className="text-white">
                {tabs.find(tab => tab.id === activeTab)?.label || "Settings"}
              </CardTitle>
              <CardDescription className="text-gray-200">
                {t.settings?.sections?.[activeTab]?.description || `Manage your ${activeTab} settings`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ActiveComponent && (
                <ActiveComponent
                  settings={settings}
                  setSettings={setSettings}
                  updateNestedState={updateNestedState}
                  updateEquipment={updateEquipment}
                  addEquipment={addEquipment}
                  handleSave={handleSave}
                  setLanguage={setLanguage}
                />
              )}
            </CardContent>
          </Card>
        </div>

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
