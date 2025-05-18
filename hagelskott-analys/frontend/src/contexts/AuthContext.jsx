import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 seconds timeout

// Debug function for logging with timestamp
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString();
  if (import.meta.env.DEV) {
    console.log(`[${timestamp}] Auth:`, message, data ? data : '');
  }
};

// Test connection to the API directly with XMLHttpRequest for more control
const testApiConnectionWithXHR = () => {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        const timeout = 5000; // 5 sekunder timeout
        const timeoutId = setTimeout(() => {
            xhr.abort();
            console.warn("Test API connection timeout reached");
            resolve(false);
        }, timeout);

        xhr.onload = () => {
            clearTimeout(timeoutId);
            if (xhr.status === 200) {
                console.log("Test API connection successful");
                resolve(true);
            } else {
                console.warn(`Test API connection failed with status ${xhr.status}`);
                resolve(false);
            }
        };

        xhr.onerror = () => {
            clearTimeout(timeoutId);
            console.warn("Test API connection error:", xhr.statusText);
            resolve(false);
        };

        xhr.open("GET", `${API_URL}/api/health`);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.send();
    });
};

// Fallback test connection with fetch
const testApiConnection = async () => {
  try {
    console.log('=== TEST API CONNECTION WITH FETCH ===');
    console.log(`API_URL: ${API_URL}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Test API connection timeout reached');
      controller.abort();
    }, 10000);
    
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('Fetch response received:', response.status);
    
    return response.ok;
  } catch (error) {
    console.log('Test API connection error:', error);
    return false;
  }
};

// Login with XMLHttpRequest to get more debugging info
const loginWithXHR = (username, password) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const timeout = 10000; // 10 sekunder timeout
        const timeoutId = setTimeout(() => {
            xhr.abort();
            console.warn("Login XHR request timed out");
            reject(new Error("Login request timed out"));
        }, timeout);

        xhr.onload = () => {
            clearTimeout(timeoutId);
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log("Login successful:", response);
                    resolve(response);
                } catch (error) {
                    console.error("Error parsing login response:", error);
                    reject(error);
                }
            } else {
                console.warn(`Login failed with status ${xhr.status}`);
                reject(new Error(`Login failed with status ${xhr.status}`));
            }
        };

        xhr.onerror = () => {
            clearTimeout(timeoutId);
            console.warn("Login XHR request error:", xhr.statusText);
            reject(new Error("Login request failed"));
        };

        xhr.open("POST", `${API_URL}/api/auth/login`);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("Accept", "application/json");
        
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);
        
        xhr.send(formData.toString());
    });
};

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    debugLog('AuthProvider mounted');
    // Test API connection first using both methods for comparison
    Promise.all([
      testApiConnectionWithXHR(),
      testApiConnection()
    ]).then(([xhrResult, fetchResult]) => {
      debugLog(`API connection test results - XHR: ${xhrResult}, Fetch: ${fetchResult}`);
      fetchCurrentUser();
    });

    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 1000 * 60 * 14); // Refresh every 14 minutes

    return () => {
      debugLog('AuthProvider unmounting, clearing refresh interval');
      clearInterval(refreshInterval);
    };
  }, []);

  const refreshToken = async () => {
    try {
      debugLog('Attempting to refresh token');
      const token = localStorage.getItem('token');
      if (!token) {
        debugLog('No token found in localStorage');
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        debugLog('Token refresh timeout reached');
        controller.abort();
      }, API_TIMEOUT);

      debugLog('Sending refresh token request');
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      debugLog(`Refresh token response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        debugLog('Token refreshed successfully');
        await fetchCurrentUser();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        debugLog('Token refresh failed', errorData);
        await logout();
        return false;
      }
    } catch (error) {
      debugLog('Token refresh error', { name: error.name, message: error.message });
      await logout();
      return false;
    }
  };

  const fetchCurrentUser = async () => {
    try {
      debugLog('Fetching current user');
      const token = localStorage.getItem('token');
      if (!token) {
        debugLog('No token found, clearing user state');
        setUser(null);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        debugLog('User fetch timeout reached');
        controller.abort();
      }, API_TIMEOUT);

      debugLog('Sending user fetch request');
      const response = await fetch(`${API_URL}/api/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      debugLog(`User fetch response status: ${response.status}`);

      if (response.ok) {
        const userData = await response.json();
        debugLog('User data fetched successfully', userData);
        setUser(userData);
        setLoading(false);
      } else if (response.status === 401) {
        debugLog('Unauthorized, attempting token refresh');
        const refreshed = await refreshToken();
        if (!refreshed) {
          debugLog('Token refresh failed, clearing user state');
          setUser(null);
          setLoading(false);
        }
      } else {
        debugLog('User fetch failed with non-401 status');
        setUser(null);
        setLoading(false);
      }
    } catch (error) {
      debugLog('User fetch error', { name: error.name, message: error.message });
      setUser(null);
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      // Try the XHR method first as it gives more detailed errors
      const xhrResult = await loginWithXHR(username, password);
      
      if (xhrResult.success) {
        debugLog('Login successful via XHR', xhrResult.data);
        localStorage.setItem('token', xhrResult.data.access_token);
        await fetchCurrentUser();
        return { success: true };
      }
      
      // If XHR method fails, try fetch as a fallback
      console.log('XHR login failed, trying fetch method as fallback');
      
      // Testa hälso-endpointen först för att se om API:et är nåbart
      try {
        console.log('=== LOGIN ATTEMPT ===');
        debugLog('Testing API health before login');
        const healthCheck = await fetch(`${API_URL}/api/health`, {
          method: 'GET',
          mode: 'cors',
          // Temporarily remove credentials
          // credentials: 'include',
        });
        
        console.log('Health check status:', healthCheck.status);
        
        if (healthCheck.ok) {
          const healthData = await healthCheck.json();
          console.log('Health data:', healthData);
          debugLog('API health check successful', healthData);
        } else {
          console.log('Health check failed with status:', healthCheck.status);
          debugLog('API health check failed', {
            status: healthCheck.status,
            statusText: healthCheck.statusText
          });
        }
      } catch (healthError) {
        console.log('Health check error:', healthError);
        debugLog('API health check error', { 
          name: healthError.name, 
          message: healthError.message 
        });
        // Fortsätt ändå med inloggningsförsöket
      }

      debugLog('Attempting login', { username, apiUrl: API_URL });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Login timeout reached after', API_TIMEOUT, 'ms');
        debugLog('Login timeout reached');
        controller.abort();
      }, API_TIMEOUT);

      const formBody = new URLSearchParams({
        username,
        password,
        grant_type: 'password'
      });

      console.log('Form data prepared, sending to:', `${API_URL}/api/auth/login`);
      debugLog('Sending login request');
      
      // Log the current time before fetch
      const startTime = Date.now();
      console.log('Starting fetch at:', new Date(startTime).toISOString());
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formBody,
        signal: controller.signal,
        mode: 'cors',
        // Temporarily remove credentials
        // credentials: 'include'
      });
      
      // Log the time after fetch completes
      const endTime = Date.now();
      console.log('Fetch completed at:', new Date(endTime).toISOString());
      console.log('Fetch took:', endTime - startTime, 'ms');

      clearTimeout(timeoutId);
      console.log('Fetch response received. Status:', response.status);
      debugLog(`Login response status: ${response.status}`, {
        ok: response.ok,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries([...response.headers.entries()])
      });

      // Försök tolka svaret även om det inte är JSON 
      let responseData;
      try {
        responseData = await response.json();
        console.log('Response data parsed successfully:', responseData);
      } catch (jsonError) {
        console.log('Error parsing JSON response:', jsonError);
        const responseText = await response.text().catch(() => 'Could not get response text');
        console.log('Response text:', responseText);
        
        debugLog('Error parsing login response', { 
          error: jsonError,
          text: responseText
        });
        responseData = {};
      }

      if (!response.ok) {
        debugLog('Login failed', responseData);
        return {
          success: false,
          error: responseData.detail || 'Login failed'
        };
      }

      debugLog('Login successful, setting token');
      localStorage.setItem('token', responseData.access_token);
      await fetchCurrentUser();

      return { success: true };

    } catch (error) {
      debugLog('Login error', { name: error.name, message: error.message });
      return {
        success: false,
        error: error.name === 'AbortError' 
          ? 'Login request timed out'
          : 'An error occurred during login'
      };
    }
  };

  const logout = async () => {
    debugLog('Logging out');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    refreshToken,
    API_URL
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 