// src/pages/Forum.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  Plus,
  Search,
  XCircle,
  Trash2,
  Edit3,
  ChevronRight,
} from "lucide-react";

/**
 * Bygger ett kategoriträd (rekursivt) genom att sortera in
 * varje kategori i `subcategories` baserat på parent_id.
 */
function buildCategoryTree(allCats, parentId = null) {
  return allCats
    .filter((cat) => cat.parent_id === parentId)
    .map((cat) => {
      const newCat = {
        ...cat,
        id: cat._id, // alias
        subcategories: [],
      };
      newCat.subcategories = buildCategoryTree(allCats, cat._id);
      return newCat;
    });
}

/**
 * Returnerar en CSS-klass för bakgrund beroende på djup:
 *  - depth=0 → lite mörkare grå (bg-gray-300)
 *  - depth=1 → ljusare grå (bg-gray-100)
 *  - depth>1 → ingen bakgrund
 */
function getCategoryBg(depth) {
  if (depth === 0) {
    return "bg-gray-300"; // Mörkare gråton för huvudkategorier
  } else if (depth === 1) {
    return "bg-gray-100"; // Ljusare för underkategorier
  }
  return ""; // Ingen bakgrund för ännu djupare
}

/**
 * Renders en kategori-rad med expandering, plus (X trådar, Y inlägg).
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

  const hasSubcats = category.subcategories && category.subcategories.length > 0;
  const isExpanded = expandedMap[category.id] ?? true;
  const canGoDeeper = depth < maxDepth;

  // Klick på pilen => expand/collapse
  const handleToggleExpand = (e) => {
    e.stopPropagation();
    if (hasSubcats && canGoDeeper) {
      setExpandedMap((prev) => ({
        ...prev,
        [category.id]: !isExpanded,
      }));
    }
  };

  // Klick på text eller ikon => navigera till CategoryView
  const handleNavigate = (e) => {
    e.stopPropagation();
    navigate(`/forum/category/${category.id}`);
  };

  const marginLeft = `${0.75 * depth}rem`;
  const rowBg = getCategoryBg(depth);

  const threadCount = category.threadCount || 0;
  const postCount = category.postCount || 0;

  return (
    <div style={{ marginLeft }}>
      <div
        className={`
          flex items-center justify-between
          px-2 py-1 rounded hover:bg-gray-50 cursor-pointer group
          text-sm transition
          ${rowBg}
        `}
        aria-expanded={isExpanded}
      >
        {/* Vänster del */}
        <div className="flex items-center gap-2 overflow-hidden">
          {/* 1) Pilen (endast om subkategorier finns och depth < maxDepth) */}
          {hasSubcats && canGoDeeper ? (
            <ChevronRight
              onClick={handleToggleExpand}
              className={`h-4 w-4 text-gray-600 transition-transform ${
                isExpanded ? "rotate-90" : ""
              } hover:text-gray-800`}
            />
          ) : (
            <div className="w-4 h-4" />
          )}

          {/* 2) Ikon för kategori */}
          <MessageSquare
            onClick={handleNavigate}
            className={`h-4 w-4 ${
              depth === 0 ? "text-blue-800" : "text-gray-500"
            } hover:scale-105 transition`}
          />

          {/* 3) Kategori-namnet */}
          <span
            onClick={handleNavigate}
            className={`truncate ${
              depth === 0 ? "font-semibold" : "font-normal"
            }`}
            title={category.description || ""}
          >
            {category.name}
          </span>

          {/* 4) Siffror: (X trådar, Y inlägg) */}
          <span className="text-xs text-gray-700 whitespace-nowrap">
            ({threadCount} trådar, {postCount} inlägg)
          </span>
        </div>

        {/* Höger del (Edit/Radera) */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditCategory?.(category);
            }}
            title="Redigera kategori"
            className="text-xs text-yellow-600 hover:text-yellow-800"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCategory?.(category);
            }}
            title="Radera kategori"
            className="text-xs text-red-600 hover:text-red-800"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subkategorier */}
      {isExpanded && hasSubcats && canGoDeeper && (
        <div className="ml-1 border-l border-gray-300">
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
  const [categories, setCategories] = useState([]);
  const [expandedMap, setExpandedMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const maxDepth = 10; // hur djupt vi kan expandera

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Hämta kategorier + counts
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/forum/categories-with-counts`
        );
        if (!res.ok) throw new Error("Kunde inte hämta kategorier med counts.");
        const data = await res.json();

        // Bygg träd
        const tree = buildCategoryTree(data);
        setCategories(tree);

        // Expandera alla
        const expandAll = {};
        const markAllExpanded = (arr) => {
          arr.forEach((cat) => {
            expandAll[cat.id] = true;
            if (cat.subcategories) markAllExpanded(cat.subcategories);
          });
        };
        markAllExpanded(tree);
        setExpandedMap(expandAll);

      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  // Expandera alla
  const handleExpandAll = () => {
    const newMap = {};
    const markAll = (arr) => {
      arr.forEach((cat) => {
        newMap[cat.id] = true;
        if (cat.subcategories) markAll(cat.subcategories);
      });
    };
    markAll(categories);
    setExpandedMap(newMap);
  };

  // Komprimera alla
  const handleCollapseAll = () => {
    const newMap = {};
    const markAll = (arr) => {
      arr.forEach((cat) => {
        newMap[cat.id] = false;
        if (cat.subcategories) markAll(cat.subcategories);
      });
    };
    markAll(categories);
    setExpandedMap(newMap);
  };

  // Sökfunktion
  function searchCats(catsArr, term) {
    if (!term) return catsArr;
    return catsArr
      .map((cat) => {
        const match = cat.name.toLowerCase().includes(term.toLowerCase());
        const childRes = cat.subcategories
          ? searchCats(cat.subcategories, term)
          : [];
        if (match || childRes.length > 0) {
          return { ...cat, subcategories: childRes };
        }
        return null;
      })
      .filter(Boolean);
  }

  const filtered = searchCats(categories, searchTerm);

  // Exempel: Radera kategori
  const handleDeleteCategory = async (cat) => {
    const confirmed = window.confirm(`Ta bort kategori "${cat.name}"?`);
    if (!confirmed) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/forum/categories/${cat.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Kunde inte radera kategori.");
      alert("Kategorin raderad.");

      // Ta bort lokalt
      const newTree = removeCatById([...categories], cat.id);
      setCategories(newTree);
    } catch (error) {
      console.error(error);
      alert("Fel vid radering av kategori.");
    }
  };

  function removeCatById(catsArr, catId) {
    return catsArr
      .filter((c) => c.id !== catId)
      .map((c) => ({
        ...c,
        subcategories: removeCatById(c.subcategories || [], catId),
      }));
  }

  const handleEditCategory = (cat) => {
    alert(`Här kan du navigera till /forum/edit-category/${cat.id} eller liknande.`);
  };

  return (
    <div className="container mx-auto px-3 py-2 max-w-4xl">
      {/* Titel-rad */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-lg font-semibold">Forum</h1>
          <p className="text-gray-600 text-sm">Diskutera jakt, metodik och utrustning</p>
        </div>
        <button
          onClick={() => navigate("/forum/new")}
          className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white 
                     rounded hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Ny tråd
        </button>
      </div>

      {/* Sök & expand/collapse */}
      <Card className="mb-2">
        <CardContent className="p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Sök..."
              className="pl-7 pr-6 py-1 rounded border text-sm w-full
                         focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 
                           text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExpandAll}
              className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
            >
              Expandera alla
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
            >
              Komprimera alla
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Kategoriträd-lista */}
      <Card>
        <CardContent className="p-2 space-y-2">
          {filtered.length > 0 ? (
            filtered.map((cat) => (
              <CategoryBlock
                key={cat.id}
                category={cat}
                depth={0}
                expandedMap={expandedMap}
                setExpandedMap={setExpandedMap}
                maxDepth={maxDepth}
                onDeleteCategory={handleDeleteCategory}
                onEditCategory={handleEditCategory}
              />
            ))
          ) : (
            <div className="text-center text-sm text-gray-500 py-4">
              Inga matchande kategorier
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
