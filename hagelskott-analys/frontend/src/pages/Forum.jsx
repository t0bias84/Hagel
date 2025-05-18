// src/pages/Forum.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  Plus,
  Search,
  XCircle,
  Trash2,
  Edit3,
  ChevronRight,
  AlertCircle,
  User,
  Calendar,
  MessageCircle
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";

// Import utils
import { 
  buildCategoryTree, 
  formatDate, 
  getCategoryBackground, 
  searchCategories 
} from "@/utils/forumUtils";
import { getData, getCategories, getHotThreads } from "@/utils/apiUtils";

// ThreadCard component to display thread summaries
function ThreadCard({ thread }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;

  return (
    <Card 
      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      onClick={() => navigate(`/forum/thread/${thread._id}`)}
    >
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{thread.title}</h3>
        <div className="flex items-center text-sm text-gray-500 space-x-4">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-1" />
            <span>{thread.author?.username || t.forum.author}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formatDate(thread.createdAt, language)}</span>
          </div>
          <div className="flex items-center">
            <MessageCircle className="h-4 w-4 mr-1" />
            <span>{thread.replyCount || 0} {t.forum.replies}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Renders a category row with expansion, plus (X threads, Y posts).
 */
function CategoryBlock({
  category,
  depth = 0,
  expandedMap,
  setExpandedMap,
  maxDepth,
  onDeleteCategory,
  onEditCategory,
}) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;

  const hasSubcats = category.subcategories && category.subcategories.length > 0;
  const isExpanded = expandedMap[category.id] ?? false;
  const canGoDeeper = depth < maxDepth;

  // Click on arrow => expand/collapse
  const handleToggleExpand = (e) => {
    e.stopPropagation();
    if (hasSubcats && canGoDeeper) {
      setExpandedMap((prev) => ({
        ...prev,
        [category.id]: !isExpanded,
      }));
    }
  };

  // Click on text or icon => navigate to CategoryView
  const handleNavigate = (e) => {
    e.stopPropagation();
    navigate(`/forum/category/${category.id}`);
  };

  const marginLeft = `${0.75 * depth}rem`;
  const rowBg = getCategoryBackground(depth);

  const threadCount = category.threadCount || 0;
  const postCount = category.postCount || 0;

  return (
    <div style={{ marginLeft }}>
      <div
        className={`
          flex items-center justify-between
          px-3 py-2 rounded-lg hover:bg-dark-500 cursor-pointer group
          text-sm transition duration-200 ease-in-out
          ${rowBg}
        `}
        aria-expanded={isExpanded}
      >
        {/* Left section */}
        <div className="flex items-center gap-3 overflow-hidden">
          {/* 1) Arrow */}
          {hasSubcats && canGoDeeper ? (
            <ChevronRight
              onClick={handleToggleExpand}
              className={`h-4 w-4 text-white transition-transform ${
                isExpanded ? "rotate-90" : ""
              } hover:text-blue-400`}
            />
          ) : (
            <div className="w-4 h-4" />
          )}

          {/* 2) Category icon */}
          <MessageSquare
            onClick={handleNavigate}
            className={`h-5 w-5 ${
              depth === 0 ? "text-blue-400" : "text-gray-300"
            } hover:scale-110 transition-all`}
          />

          {/* 3) Category name */}
          <span
            onClick={handleNavigate}
            className={`truncate ${
              depth === 0 ? "font-semibold text-white" : "font-normal text-white"
            } hover:text-blue-400 transition-colors`}
            title={category.description || ""}
          >
            {category.name}
          </span>

          {/* 4) Statistics */}
          <span className="text-xs text-white/80 whitespace-nowrap">
            ({threadCount} {t.forum.threadCount}, {postCount} {t.forum.postCount})
          </span>
        </div>

        {/* Right section (Edit/Delete) */}
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditCategory?.(category);
            }}
            title={t.forum.editCategory}
            className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCategory?.(category);
            }}
            title={t.forum.deleteCategory}
            className="text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subcategories */}
      {isExpanded && hasSubcats && canGoDeeper && (
        <div className="ml-2 border-l border-dark-400">
          {category.subcategories.map((sub) => (
            <CategoryBlock
              key={sub.id}
              category={sub}
              depth={depth + 1}
              expandedMap={expandedMap}
              setExpandedMap={setExpandedMap}
              maxDepth={maxDepth}
              onDeleteCategory={onDeleteCategory}
              onEditCategory={onEditCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Forum() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;
  
  const [categories, setCategories] = useState([]);
  const [expandedMap, setExpandedMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentThreads, setRecentThreads] = useState([]);
  const [popularThreads, setPopularThreads] = useState([]);

  const maxDepth = 10; // How deep we can expand categories

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Använd cache-funktion för att hämta kategorier
        const categoriesData = await getCategories(language);
        
        // Build category tree with our safe utility function
        const tree = buildCategoryTree(categoriesData);
        setCategories(tree);
        
        // Initialize expansion state (all collapsed by default)
        const expandAll = {};
        const setupExpansionState = (arr) => {
          arr.forEach((cat) => {
            expandAll[cat.id] = false;
            if (cat.subcategories) setupExpansionState(cat.subcategories);
          });
        };
        setupExpansionState(tree);
        setExpandedMap(expandAll);
        
        // Fetch recent threads
        try {
          const recentThreadsData = await getData('/api/forum/threads?sort=latest&limit=5');
          setRecentThreads(recentThreadsData);
        } catch (recentErr) {
          console.warn("Failed to fetch recent threads:", recentErr);
        }
        
        // Använd cache-funktion för att hämta populära trådar
        try {
          const popularThreadsData = await getHotThreads(5);
          setPopularThreads(popularThreadsData);
        } catch (popularErr) {
          console.warn("Failed to fetch popular threads:", popularErr);
        }
        
        setError(null);
      } catch (err) {
        console.error("Error fetching forum data:", err);
        setError(err.message || "Failed to load forum data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [language]); // Refresh when language changes

  // Function to refresh forum data (e.g., after category update)
  const refreshForumData = async () => {
    try {
      setLoading(true);
      
      // Använd forceRefresh för att tvinga uppdatering av cache
      const categoriesData = await getCategories(language, true);
      
      const tree = buildCategoryTree(categoriesData);
      setCategories(tree);
      
      // Update popular threads
      const popularThreadsData = await getHotThreads(5, true);
      setPopularThreads(popularThreadsData);
      
      // Update recent threads
      const recentThreadsData = await getData('/api/forum/threads?sort=latest&limit=5');
      setRecentThreads(recentThreadsData);
      
      setError(null);
    } catch (err) {
      console.error("Error refreshing forum data:", err);
      setError(err.message || "Failed to refresh forum data");
    } finally {
      setLoading(false);
    }
  };

  // Filter categories based on search term
  const filtered = searchTerm
    ? searchCategories(categories, searchTerm)
    : categories;

  // Handlers for category actions
  const handleDeleteCategory = (category) => {
    // Implement category deletion
    console.log("Delete category:", category);
  };

  const handleEditCategory = (category) => {
    // Implement category editing
    console.log("Edit category:", category);
  };

  return (
    <div className="space-y-8 mb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">{t.forum.forum}</h1>
        <Button 
          onClick={() => navigate("/forum/new-category")}
          className="flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t.forum.newCategory}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.common.error}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Threads */}
        <Card>
          <CardHeader className="bg-dark-800 rounded-t-lg">
            <CardTitle className="text-white">{t.forum.recentThreads}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {recentThreads.length > 0 ? (
              <div className="space-y-4">
                {recentThreads.map((thread) => (
                  <ThreadCard key={thread._id} thread={thread} />
                ))}
              </div>
            ) : (
              <p className="text-white/70">{t.forum.noThreads}</p>
            )}
            <Button 
              variant="outline" 
              className="mt-4 w-full"
              onClick={() => navigate("/forum/new-thread")}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.forum.createThread}
            </Button>
          </CardContent>
        </Card>

        {/* Popular Threads */}
        <Card>
          <CardHeader className="bg-dark-800 rounded-t-lg">
            <CardTitle className="text-white">{t.forum.popularThreads}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {popularThreads.length > 0 ? (
              <div className="space-y-4">
                {popularThreads.map((thread) => (
                  <ThreadCard key={thread._id} thread={thread} />
                ))}
              </div>
            ) : (
              <p className="text-white/70">{t.forum.noPopularThreads}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader className="bg-dark-800 rounded-t-lg">
          <CardTitle className="text-white">{t.forum.categories}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Category search field */}
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-xs">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.forum.searchCategories}
                className="w-full py-2 pl-10 pr-4 bg-dark-700 rounded-lg border border-dark-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category tree */}
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-400">{t.common.noResults}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((cat) => (
                <CategoryBlock
                  key={cat.id}
                  category={cat}
                  expandedMap={expandedMap}
                  setExpandedMap={setExpandedMap}
                  maxDepth={maxDepth}
                  onDeleteCategory={handleDeleteCategory}
                  onEditCategory={handleEditCategory}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
