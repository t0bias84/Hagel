/**
 * Forum Utilities
 * 
 * Common utilities for forum functionality including:
 * - Category tree building
 * - Date formatting
 * - Background styling based on depth
 */

/**
 * Builds a category tree from a flat list of categories
 * Uses a non-recursive approach to prevent stack overflow
 * 
 * @param {Array} categories - Flat list of categories
 * @param {string|null} parentId - Parent ID for root categories (null for top level)
 * @returns {Array} - Tree structure of categories
 */
export function buildCategoryTree(categories, parentId = null) {
  try {
    // Create a copy of all categories and initialize subcategories array
    const allCategories = categories.map(cat => ({
      ...cat,
      id: cat._id || cat.id, // Ensure we have an id property
      subcategories: []
    }));
    
    // Create a map for quick access by ID
    const categoryMap = new Map();
    allCategories.forEach(cat => {
      categoryMap.set(cat.id, cat);
    });
    
    // Separate arrays for root and non-root categories
    const rootCategories = [];
    const nonRootCategories = [];
    
    // Split categories into root and non-root
    allCategories.forEach(cat => {
      if (cat.parent_id === parentId) {
        rootCategories.push(cat);
      } else {
        nonRootCategories.push(cat);
      }
    });
    
    // Add non-root categories to their parents
    for (const cat of nonRootCategories) {
      const parent = categoryMap.get(cat.parent_id);
      // If parent exists and isn't referencing itself
      if (parent && parent.id !== cat.id) {
        parent.subcategories.push(cat);
      } else {
        // If parent doesn't exist, add as root
        rootCategories.push(cat);
      }
    }
    
    return rootCategories;
  } catch (error) {
    console.error("Error in buildCategoryTree:", error);
    return []; // Return empty array on error
  }
}

/**
 * Formats a date string according to the current language
 * 
 * @param {string} dateString - ISO date string
 * @param {string} language - Current language ('en' or 'sv')
 * @returns {string} - Formatted date string
 */
export function formatDate(dateString, language = 'en') {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString; // Return original string on error
  }
}

/**
 * Returns appropriate CSS background class based on category depth
 * 
 * @param {number} depth - Depth level of the category
 * @returns {string} - CSS class for background
 */
export function getCategoryBackground(depth) {
  if (depth === 0) {
    return "bg-dark-800"; // Darker background for main categories
  } else if (depth === 1) {
    return "bg-dark-700"; // Slightly lighter for subcategories
  }
  return "bg-dark-600"; // Lightest background for deeper levels
}

/**
 * Searches categories and their subcategories for a search term
 * 
 * @param {Array} categories - Tree of categories
 * @param {string} searchTerm - Term to search for
 * @returns {Array} - Flat list of matching categories
 */
export function searchCategories(categories, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return categories;
  }
  
  const term = searchTerm.toLowerCase().trim();
  const results = [];
  
  // Recursive search function
  const search = (cats) => {
    for (const cat of cats) {
      // Check if category matches search term
      if (
        cat.name?.toLowerCase().includes(term) || 
        cat.description?.toLowerCase().includes(term)
      ) {
        results.push(cat);
      }
      
      // Search in subcategories
      if (cat.subcategories && cat.subcategories.length > 0) {
        search(cat.subcategories);
      }
    }
  };
  
  search(categories);
  return results;
} 