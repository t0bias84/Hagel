import { apiFetch } from './api';

export const saveShotshellLoad = (loadData) => {
  return apiFetch('/loads/shotshell', {
    method: 'POST',
    body: JSON.stringify(loadData),
  });
};

export const getPenetrationData = (params) => {
  const qs = new URLSearchParams({
    muzzle: params.muzzle,
    shotSize: params.shotSize,
    shotType: params.shotType,
    shotLoadGram: params.shotLoadGram,
  }).toString();
  return apiFetch(`/loads/penetration-flex-params?${qs}`);
};

// We can add other load-related API calls here in the future
// e.g., getLoads, getLoadById, updateLoad, deleteLoad, etc.
