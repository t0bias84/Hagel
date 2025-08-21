import React from 'react';

const AchievementsSettings = ({ settings, updateNestedState }) => {
  return (
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
                    updateNestedState('hunting', 'licenses', newLicenses);
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
                  const newLicenses = [...(settings.hunting?.licenses || []), license];
                  updateNestedState('hunting', 'licenses', newLicenses);
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
              onChange={(e) => updateNestedState('hunting', 'experience', e.target.value)}
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
                    updateNestedState('hunting', 'preferredGame', newPreferredGame);
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
                  const newPreferredGame = [...(settings.hunting?.preferredGame || []), game];
                  updateNestedState('hunting', 'preferredGame', newPreferredGame);
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
  );
};

export default AchievementsSettings;
