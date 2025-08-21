import { apiFetch, apiFetchFormData } from './api';

export const getComponents = () => {
  return apiFetch('/components/');
};

export const getComponentById = (id) => {
  return apiFetch(`/components/${id}`);
};

export const createComponent = (formData) => {
  return apiFetchFormData('/components/', formData, 'POST');
};

export const updateComponent = (id, formData) => {
  return apiFetchFormData(`/components/${id}`, formData, 'PUT');
};

export const deleteComponent = (id) => {
  return apiFetch(`/components/${id}`, {
    method: 'DELETE',
  });
};
