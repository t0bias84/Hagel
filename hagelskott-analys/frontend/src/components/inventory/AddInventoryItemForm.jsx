import React, { useState, useEffect } from 'react';
import { getComponents } from '@/services/componentsService';
import { addInventoryItem } from '@/services/inventoryService';
import { useToast } from "@/hooks/use-toast";

export default function AddInventoryItemForm({ onInventoryUpdate }) {
  const { toast } = useToast();
  const [allComponents, setAllComponents] = useState([]);
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pieces');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllComponents = async () => {
      const data = await getComponents();
      setAllComponents(data);
    };
    fetchAllComponents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComponentId || !quantity) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please select a component and enter a quantity." });
      return;
    }

    setLoading(true);
    try {
      const newItem = {
        componentId: selectedComponentId,
        quantity: parseFloat(quantity),
        unit: unit,
      };
      const updatedInventory = await addInventoryItem(newItem);
      onInventoryUpdate(updatedInventory); // Callback to update parent state
      toast({ title: "Success", description: "Inventory updated." });
      // Reset form
      setSelectedComponentId('');
      setQuantity('');
      setUnit('pieces');
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-military-700 p-4 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-white">Add to Inventory</h3>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Component</label>
        <select
          value={selectedComponentId}
          onChange={(e) => setSelectedComponentId(e.target.value)}
          className="w-full bg-military-800 border border-military-600 rounded px-3 py-2 text-sm"
        >
          <option value="">Select a component...</option>
          {allComponents.map(comp => (
            <option key={comp._id} value={comp._id}>{comp.name} ({comp.type})</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-military-800 border border-military-600 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Unit</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full bg-military-800 border border-military-600 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Add Item'}
        </button>
      </div>
    </form>
  );
}
