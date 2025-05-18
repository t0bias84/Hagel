/**
 * API Utilities
 * 
 * Common utilities for making API requests with proper authentication and error handling
 */

// Cache för kategorier och andra ofta-frågade data
const apiCache = {
  categories: {
    data: null,
    timestamp: 0,
    expiresAt: 0
  },
  hotThreads: {
    data: null,
    timestamp: 0,
    expiresAt: 0
  }
};

// Cache TTL (Time To Live) i millisekunder
const CACHE_TTL = {
  CATEGORIES: 5 * 60 * 1000, // 5 minuter
  HOT_THREADS: 2 * 60 * 1000  // 2 minuter
};

/**
 * Makes an authenticated fetch request to the API
 * 
 * @param {string} endpoint - The API endpoint to call (without base URL)
 * @param {Object} options - Fetch options including method, body, etc.
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 * @throws {Error} - If the request fails
 */
export async function fetchWithAuth(endpoint, options = {}) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const url = `${apiUrl}${endpoint}`;
    
    // Set up headers with authentication
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    
    // Add authentication token if available
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Handle common error responses
    if (!response.ok) {
      // Try to parse error message from response
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || `API Error: ${response.status}`;
      } catch (e) {
        errorMessage = `API Error: ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }
    
    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error(`API request failed:`, error);
    throw error;
  }
}

/**
 * Gets data from an API endpoint with proper error handling
 * 
 * @param {string} endpoint - The API endpoint to fetch from
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 */
export async function getData(endpoint, options = {}) {
  return fetchWithAuth(endpoint, {
    method: 'GET',
    ...options
  });
}

/**
 * Hämtar forum-kategorier med caching
 * 
 * @param {string} language - Språkkod (sv/en)
 * @param {boolean} forceRefresh - Tvinga uppdatering av cache
 * @returns {Promise<Array>} - Lista med kategorier
 */
export async function getCategories(language = 'en', forceRefresh = false) {
  const currentTime = Date.now();
  const cacheKey = 'categories';
  
  // Använd cache om den finns och inte har utgått
  if (!forceRefresh && 
      apiCache[cacheKey].data !== null && 
      apiCache[cacheKey].expiresAt > currentTime) {
    console.log('Using cached categories data');
    return apiCache[cacheKey].data;
  }
  
  try {
    // Hämta nya data från API
    const refreshParam = forceRefresh ? '&refresh_cache=true' : '';
    const data = await getData(`/api/forum/categories-with-counts?language=${language}${refreshParam}`);
    
    // Uppdatera cache
    apiCache[cacheKey] = {
      data,
      timestamp: currentTime,
      expiresAt: currentTime + CACHE_TTL.CATEGORIES
    };
    
    return data;
  } catch (error) {
    // Om förfrågan misslyckas, använd gammal cache om tillgänglig
    if (apiCache[cacheKey].data !== null) {
      console.warn('Failed to fetch categories, using stale cache data');
      return apiCache[cacheKey].data;
    }
    throw error;
  }
}

/**
 * Hämtar populära trådar med caching
 * 
 * @param {number} limit - Antal trådar att hämta
 * @param {boolean} forceRefresh - Tvinga uppdatering av cache
 * @returns {Promise<Array>} - Lista med populära trådar
 */
export async function getHotThreads(limit = 10, forceRefresh = false) {
  const currentTime = Date.now();
  const cacheKey = 'hotThreads';
  
  // Använd cache om den finns och inte har utgått
  if (!forceRefresh && 
      apiCache[cacheKey].data !== null && 
      apiCache[cacheKey].expiresAt > currentTime) {
    console.log('Using cached hot threads data');
    return apiCache[cacheKey].data;
  }
  
  try {
    // Hämta nya data från API
    const data = await getData(`/api/forum/hot?limit=${limit}`);
    
    // Uppdatera cache
    apiCache[cacheKey] = {
      data,
      timestamp: currentTime,
      expiresAt: currentTime + CACHE_TTL.HOT_THREADS
    };
    
    return data;
  } catch (error) {
    // Om förfrågan misslyckas, använd gammal cache om tillgänglig
    if (apiCache[cacheKey].data !== null) {
      console.warn('Failed to fetch hot threads, using stale cache data');
      return apiCache[cacheKey].data;
    }
    throw error;
  }
}

/**
 * Invaliderar cache för specifik datatyp
 * 
 * @param {string} cacheKey - Nyckel för cache att invalidera (t.ex. 'categories')
 */
export function invalidateCache(cacheKey) {
  if (apiCache[cacheKey]) {
    apiCache[cacheKey].data = null;
    apiCache[cacheKey].timestamp = 0;
    apiCache[cacheKey].expiresAt = 0;
    console.log(`Cache invalidated for ${cacheKey}`);
  }
}

/**
 * Posts data to an API endpoint
 * 
 * @param {string} endpoint - The API endpoint to post to
 * @param {Object} data - The data to send in the request body
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 */
export async function postData(endpoint, data, options = {}) {
  // Automatiskt invalidera cachad data vid POST-anrop relaterade till kategorier
  if (endpoint.includes('/api/forum/categories')) {
    invalidateCache('categories');
  }
  
  return fetchWithAuth(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * Updates data at an API endpoint
 * 
 * @param {string} endpoint - The API endpoint to update
 * @param {Object} data - The data to send in the request body
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 */
export async function updateData(endpoint, data, options = {}) {
  // Automatiskt invalidera cachad data vid PUT-anrop relaterade till kategorier
  if (endpoint.includes('/api/forum/categories')) {
    invalidateCache('categories');
  }
  
  return fetchWithAuth(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * Deletes a resource at an API endpoint
 * 
 * @param {string} endpoint - The API endpoint to delete from
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 */
export async function deleteData(endpoint, options = {}) {
  // Automatiskt invalidera cachad data vid DELETE-anrop relaterade till kategorier
  if (endpoint.includes('/api/forum/categories')) {
    invalidateCache('categories');
  }
  
  return fetchWithAuth(endpoint, {
    method: 'DELETE',
    ...options
  });
}

/**
 * Uploads a file or form data to an API endpoint
 * 
 * @param {string} endpoint - The API endpoint to upload to
 * @param {FormData} formData - The form data to upload
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 */
export async function uploadData(endpoint, formData, options = {}) {
  // Don't set Content-Type header as it will be set automatically with the boundary
  const headers = {
    'Accept': 'application/json'
  };
  
  // Add authentication token if available
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetchWithAuth(endpoint, {
    method: 'POST',
    body: formData,
    headers,
    ...options
  });
} 