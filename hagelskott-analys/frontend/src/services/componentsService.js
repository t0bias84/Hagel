import { apiFetch } from './api';

export const getComponents = () => {
  return apiFetch('/components');
};
