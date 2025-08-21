import React from 'react';

const EquipmentSettings = ({ settings, updateEquipment, addEquipment }) => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-semibold">Vapen</h3>
          <button
            onClick={() => addEquipment('firearms')}
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
                    onChange={(e) => updateEquipment('firearms', index, 'manufacturer', e.target.value)}
                    className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white">Modell</label>
                  <input
                    type="text"
                    value={firearm.model}
                    onChange={(e) => updateEquipment('firearms', index, 'model', e.target.value)}
                    className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-white">Kaliber</label>
                  <select
                    value={firearm.gauge}
                    onChange={(e) => updateEquipment('firearms', index, 'gauge', e.target.value)}
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
                    onChange={(e) => updateEquipment('firearms', index, 'barrelLength', e.target.value)}
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
            onClick={() => addEquipment('reloadingEquipment')}
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
                    onChange={(e) => updateEquipment('reloadingEquipment', index, 'type', e.target.value)}
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
                    onChange={(e) => updateEquipment('reloadingEquipment', index, 'manufacturer', e.target.value)}
                    className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-white">Anteckningar</label>
                <textarea
                  value={equipment.notes}
                  onChange={(e) => updateEquipment('reloadingEquipment', index, 'notes', e.target.value)}
                  className="w-full p-2 rounded-lg bg-dark-600 text-white border border-dark-500 min-h-[100px]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EquipmentSettings;
