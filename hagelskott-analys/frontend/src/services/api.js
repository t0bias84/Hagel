import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Interceptor to add auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getMyShots = () => {
  // Fetches all shots for the logged-in user
  return api.get('/results', {
    params: {
      my_shots: true,
      limit: 100 // Fetch up to 100 shots for comparison
    }
  });
};

// Example of other functions that might exist here
export const login = (username, password) => {
  return api.post('/auth/token', new URLSearchParams({ username, password }));
};

export const getAnalysisResult = (id) => {
  return api.get(`/analysis/results/${id}`);
};

export const reanalyzeShot = (id, params) => {
  return api.patch(`/analysis/results/${id}/reanalyze`, params);
};

export const previewHits = (id, params) => {
  return api.post(`/analysis/results/${id}/preview_hits`, params);
};

export const getPublicAnalyses = (filters) => {
  return api.get('/analysis/public', { params: filters });
};

export default api;
