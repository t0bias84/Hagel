// forumApi.js

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

/**
 * Skapar headers för anrop till forumets API.
 * Sätter Authorization om token finns i localStorage.
 */
const createHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Centraliserad fetch-funktion för API-anrop.
 * Om svarskod ej är 2xx kastas ett Error som fångas i anropande kod.
 */
const apiFetch = async (endpoint, options = {}) => {
  let response;

  try {
    response = await fetch(`${BASE_URL}${endpoint}`, options);
  } catch (err) {
    console.error("Nätverksfel eller CORS-problem:", err);
    throw new Error("Kunde inte nå servern. Kontrollera nätverksanslutning.");
  }

  if (!response.ok) {
    let errorDetails = null;
    try {
      // Vissa fel kan vara i JSON
      errorDetails = await response.json();
    } catch (jsonErr) {
      console.warn("Svar var ej i JSON-format:", jsonErr);
    }
    const msg = errorDetails?.message || `HTTP-fel! status: ${response.status}`;
    throw new Error(msg);
  }

  try {
    return await response.json();
  } catch (err) {
    console.warn("Kunde inte parsa JSON:", err);
    return null; // eller returnera något annat
  }
};

// ====================== KATEGORIER ======================

/**
 * Hämta alla kategorier (kan ha query params om du vill)
 */
export const getCategories = async () => {
  const endpoint = `/api/forum/categories`;
  return apiFetch(endpoint, {
    method: "GET",
    headers: createHeaders(),
  });
};

/**
 * Hämta en kategori via ID
 */
export const getCategoryById = async (categoryId) => {
  const endpoint = `/api/forum/categories/${categoryId}`;
  return apiFetch(endpoint, {
    method: "GET",
    headers: createHeaders(),
  });
};

/**
 * Skapa ny kategori
 */
export const createCategory = async (categoryData) => {
  const endpoint = `/api/forum/categories`;
  return apiFetch(endpoint, {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify(categoryData),
  });
};

/**
 * Uppdatera en kategori
 */
export const updateCategory = async (categoryId, updatedData) => {
  const endpoint = `/api/forum/categories/${categoryId}`;
  return apiFetch(endpoint, {
    method: "PUT",
    headers: createHeaders(),
    body: JSON.stringify(updatedData),
  });
};

/**
 * Radera en kategori
 */
export const deleteCategory = async (categoryId) => {
  const endpoint = `/api/forum/categories/${categoryId}`;
  return apiFetch(endpoint, {
    method: "DELETE",
    headers: createHeaders(),
  });
};

// ====================== TRÅDAR (THREADS) ======================

/**
 * Hämta alla trådar i en viss kategori
 */
export const getThreadsByCategoryId = async (categoryId) => {
  const endpoint = `/api/forum/categories/${categoryId}/threads`;
  return apiFetch(endpoint, {
    method: "GET",
    headers: createHeaders(),
  });
};

/**
 * Hämta en enskild tråd
 */
export const getThreadById = async (threadId) => {
  const endpoint = `/api/forum/threads/${threadId}`;
  return apiFetch(endpoint, {
    method: "GET",
    headers: createHeaders(),
  });
};

/**
 * Skapa en ny tråd i en kategori
 * OBS: Om din server använder Form(...), kan du behöva form-data.
 * Här skickar vi JSON som exempel.
 */
export const createThread = async (categoryId, threadData) => {
  const endpoint = `/api/forum/categories/${categoryId}/threads`;
  return apiFetch(endpoint, {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify(threadData),
  });
};

/**
 * Uppdatera en tråd, om du har t.ex. PUT /api/forum/threads/{threadId}
 */
export const updateThread = async (threadId, updatedData) => {
  const endpoint = `/api/forum/threads/${threadId}`;
  return apiFetch(endpoint, {
    method: "PUT", // eller PATCH
    headers: createHeaders(),
    body: JSON.stringify(updatedData),
  });
};

/**
 * Radera en tråd
 */
export const deleteThread = async (threadId) => {
  const endpoint = `/api/forum/threads/${threadId}`;
  return apiFetch(endpoint, {
    method: "DELETE",
    headers: createHeaders(),
  });
};

// ====================== INLÄGG (POSTS) ======================

/**
 * Hämta inlägg i en viss tråd
 */
export const getPostsByThreadId = async (threadId) => {
  const endpoint = `/api/forum/threads/${threadId}/posts`;
  return apiFetch(endpoint, {
    method: "GET",
    headers: createHeaders(),
  });
};

/**
 * Skapa nytt inlägg i en tråd
 */
export const createPost = async (threadId, postData) => {
  const endpoint = `/api/forum/threads/${threadId}/posts`;
  return apiFetch(endpoint, {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify(postData),
  });
};

/**
 * Uppdatera ett inlägg, ex. PUT /api/forum/threads/{threadId}/posts/{postId}
 */
export const updatePost = async (threadId, postId, updatedData) => {
  const endpoint = `/api/forum/threads/${threadId}/posts/${postId}`;
  return apiFetch(endpoint, {
    method: "PUT",
    headers: createHeaders(),
    body: JSON.stringify(updatedData),
  });
};

/**
 * Radera ett inlägg
 */
export const deletePost = async (threadId, postId) => {
  const endpoint = `/api/forum/threads/${threadId}/posts/${postId}`;
  return apiFetch(endpoint, {
    method: "DELETE",
    headers: createHeaders(),
  });
};

// ====================== NYA FUNKTIONER: HOT & CONTROVERSIAL ======================

/**
 * Hämta 'heta' trådar (mest views), ex. /api/forum/hot
 */
export const getHotThreads = async (limit = 10) => {
  const endpoint = `/api/forum/hot?limit=${limit}`;
  return apiFetch(endpoint, {
    method: "GET",
    headers: createHeaders(),
  });
};

/**
 * Hämta 'kontroversiella' trådar, ex. /api/forum/controversial
 */
export const getControversialThreads = async (limit = 10) => {
  const endpoint = `/api/forum/controversial?limit=${limit}`;
  return apiFetch(endpoint, {
    method: "GET",
    headers: createHeaders(),
  });
};
