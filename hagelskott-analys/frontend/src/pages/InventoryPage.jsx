import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getInventory, removeInventoryItem } from '@/services/inventoryService';
import AddInventoryItemForm from '@/components/inventory/AddInventoryItemForm';
import { Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function InventoryPage() {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getInventory();
      setInventory(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleInventoryUpdate = (updatedInventory) => {
    setInventory(updatedInventory);
  };

  const handleDeleteItem = async (componentId) => {
    if (!window.confirm("Are you sure you want to remove this item?")) return;
    try {
      const updatedInventory = await removeInventoryItem(componentId);
      setInventory(updatedInventory);
      toast({ title: "Success", description: "Item removed from inventory." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold text-white mb-6">My Inventory</h1>
          <div className="bg-military-800 p-6 rounded-lg shadow-lg">
            {inventory && inventory.items && inventory.items.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-military-700">
                    <th className="p-2 text-sm font-semibold text-gray-400">Component</th>
                    <th className="p-2 text-sm font-semibold text-gray-400">Quantity</th>
                    <th className="p-2 text-sm font-semibold text-gray-400">Unit</th>
                    <th className="p-2 text-sm font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.items.map(item => (
                    <tr key={item.componentId} className="border-b border-military-700">
                      <td className="p-2">{item.component_details?.name || 'Unknown Component'}</td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">{item.unit}</td>
                      <td className="p-2">
                        <button onClick={() => handleDeleteItem(item.componentId)} className="text-red-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 text-center py-8">Your inventory is empty.</p>
            )}
          </div>
        </div>
        <div>
          <AddInventoryItemForm onInventoryUpdate={handleInventoryUpdate} />
        </div>
      </div>
    </div>
  );
}
