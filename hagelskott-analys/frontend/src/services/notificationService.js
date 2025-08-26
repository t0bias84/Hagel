import { apiFetch } from './api';

export const getNotifications = () => {
  return apiFetch('/notifications');
};
