import React from 'react';

const SecuritySettings = ({ settings, updateNestedState }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={settings.security?.twoFactorEnabled}
          onChange={(e) => updateNestedState('security', 'twoFactorEnabled', e.target.checked)}
          className="w-4 h-4 rounded border-dark-600"
        />
        <label className="text-white">Aktivera tvåfaktorsautentisering</label>
      </div>
    </div>
  );
};

export default SecuritySettings;
