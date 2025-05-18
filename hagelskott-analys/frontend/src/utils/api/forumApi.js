const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

/**
 * Hämtar kategorier för forumet baserat på valt språk.
 * @param {string} language - Det aktuella språket (ex: "sv", "en").
 * @returns {Promise<Array>} - En lista med kategorier.
 */
export const getCategories = async (language) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forum/categories?language=${language}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Fel vid hämtning av kategorier: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Kunde inte hämta kategorier:", error);
    throw error;
  }
};

/**
 * Hämtar en specifik kategori baserat på dess ID.
 * @param {string} categoryId - ID för kategorin som ska hämtas.
 * @returns {Promise<Object>} - Data för den specifika kategorin.
 */
export const getCategoryById = async (categoryId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forum/categories/${categoryId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Fel vid hämtning av kategori: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Kunde inte hämta kategori:", error);
    throw error;
  }
};

/**
 * Skapar en ny kategori i forumet.
 * @param {Object} category - Objektet med kategoriens data.
 * @returns {Promise<Object>} - Den skapade kategorin.
 */
export const createCategory = async (category) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forum/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(category),
    });

    if (!response.ok) {
      throw new Error(`Fel vid skapandet av kategori: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Kunde inte skapa kategori:", error);
    throw error;
  }
};
