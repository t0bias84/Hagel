import React from 'react';

const SocialSettings = ({ settings, updateNestedState }) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="space-y-2">
          <label className="text-white">Profilsynlighet</label>
          <select
            value={settings.privacy?.profileVisibility}
            onChange={(e) => updateNestedState('privacy', 'profileVisibility', e.target.value)}
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
                onChange={(e) => updateNestedState('social', 'allowFriendRequests', e.target.checked)}
                className="w-4 h-4 rounded border-dark-600"
              />
              <label className="text-white">Tillåt vänförfrågningar</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.social?.allowMessages}
                onChange={(e) => updateNestedState('social', 'allowMessages', e.target.checked)}
                className="w-4 h-4 rounded border-dark-600"
              />
              <label className="text-white">Tillåt direktmeddelanden</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.social?.showActivity}
                onChange={(e) => updateNestedState('social', 'showActivity', e.target.checked)}
                className="w-4 h-4 rounded border-dark-600"
              />
              <label className="text-white">Visa min aktivitet</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialSettings;
