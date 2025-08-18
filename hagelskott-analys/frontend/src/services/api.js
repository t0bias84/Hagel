const getApiUrl = () => {
  // In a real app, you might have different URLs for dev, staging, prod
  return import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${getApiUrl()}${endpoint}`;
  const headers = getAuthHeaders();

  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})); // Try to parse error, but don't fail if it's not JSON
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  // Handle responses with no content
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  } else {
    return; // Return undefined for non-JSON responses
  }
};

export const apiFetchFormData = async (endpoint, formData, method = 'POST') => {
    const url = `${getApiUrl()}${endpoint}`;
    const token = localStorage.getItem('token');
    const headers = {
        ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(url, {
        method: method,
        headers: headers,
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};
