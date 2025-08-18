import { apiFetch } from './api';

export const saveShotshellLoad = (loadData) => {
  return apiFetch('/loads/shotshell', {
    method: 'POST',
    body: JSON.stringify(loadData),
  });
};

// We can add other load-related API calls here in the future
// e.g., getLoads, getLoadById, updateLoad, deleteLoad, etc.
