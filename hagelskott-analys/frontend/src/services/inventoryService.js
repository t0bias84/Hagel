import { apiFetch } from './api';

export const getInventory = () => {
  return apiFetch('/inventory/');
};

export const addInventoryItem = (itemData) => {
  return apiFetch('/inventory/', {
    method: 'POST',
    body: JSON.stringify(itemData),
  });
};

export const removeInventoryItem = (componentId) => {
  return apiFetch(`/inventory/${componentId}`, {
    method: 'DELETE',
  });
};
