import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  Plus,
  ArrowLeftCircle,
  Edit,
  Trash2,
  ChevronLeft,
  MessageCircle,
  Eye,
  Clock,
  User,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";

import { formatDate } from "@/utils/forumUtils";
import { getData } from "@/utils/apiUtils";

// CategoryCard component to display subcategories
function CategoryCard({ category, onClick }) {
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;
  
  return (
    <Card 
      className="cursor-pointer hover:bg-dark-700 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 text-white">{category.name}</h3>
        {category.description && (
          <p className="text-sm text-gray-300 mb-2">{category.description}</p>
        )}
        <div className="flex items-center text-xs text-gray-400">
          <span>{category.threadCount || 0} {t.forum.threadCount}</span>
          <span className="mx-2">•</span>
          <span>{category.postCount || 0} {t.forum.postCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ThreadRow component for displaying threads in a category
function ThreadRow({ thread, onClick }) {
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;
  
  return (
    <div 
      className="border-b border-dark-600 p-4 hover:bg-dark-700 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <h3 className="font-medium text-white mb-2">{thread.title}</h3>
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center">
          <User className="h-3 w-3 mr-1" />
          <span>{thread.author?.username || t.forum.author}</span>
        </div>
        <div className="flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          <span>{formatDate(thread.createdAt, language)}</span>
        </div>
        <div className="flex items-center">
          <MessageCircle className="h-3 w-3 mr-1" />
          <span>{thread.replyCount || 0}</span>
        </div>
        <div className="flex items-center">
          <Eye className="h-3 w-3 mr-1" />
          <span>{thread.views || 0}</span>
        </div>
      </div>
    </div>
  );
}

export default function CategoryView() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;

  const [category, setCategory] = useState(null);
  const [threads, setThreads] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Användare + admin-koll
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL;

  // ----------------------------------------------------------------------------
  // 1) useEffect: Hämta kategori, trådar, subkategorier (om det går), user (för admin-check)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token") || "";
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // --- A) Hämta inloggad user, för ev. admin-check ---
        const userRes = await fetch(`${apiBase}/api/auth/me`, { headers });
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData);
          if (userData.roles && userData.roles.includes("admin")) {
            setIsAdmin(true);
          }
        }

        // --- B) Hämta kategori-info ---
        const categoryData = await getData(`/api/forum/categories/${categoryId}`);
        setCategory(categoryData);

        // --- C) Försök hämta subkategorier (om endpoint finns) ---
        // Skulle ge 404 om du inte har en sådan endpoint.
        // Om den inte existerar, sätter vi subcategories = []
        try {
          const subcategoriesData = await getData(`/api/forum/categories/${categoryId}/subcategories`);
          setSubcategories(subcategoriesData);
        } catch (subErr) {
          console.warn("No subcategory list endpoint found:", subErr);
          setSubcategories([]);
        }

        // --- D) Hämta alla trådar för denna kategori ---
        const threadsData = await getData(`/api/forum/categories/${categoryId}/threads`);
        setThreads(threadsData);
      } catch (err) {
        console.error("Error in CategoryView:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchData();
    }
  }, [categoryId, apiBase]);

  // ----------------------------------------------------------------------------
  // 2) Ny tråd
  // ----------------------------------------------------------------------------
  const handleCreateThread = () => {
    navigate(`/forum/new-thread?category=${categoryId}`);
  };

  // ----------------------------------------------------------------------------
  // 3) Radera en tråd (endast admin)
  // ----------------------------------------------------------------------------
  const handleDeleteThread = async (threadId) => {
    const confirmDel = window.confirm(
      "Are you sure you want to delete this thread?"
    );
    if (!confirmDel) return;

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${apiBase}/api/forum/threads/${threadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Could not delete the thread.");
      }

      // Ta bort lokalt i state
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      alert("Thread deleted!");
    } catch (err) {
      console.error("Error deleting thread:", err);
      alert("Failed to delete thread.");
    }
  };

  // ----------------------------------------------------------------------------
  // 4) Redigera en tråd (endast admin)
  // ----------------------------------------------------------------------------
  const handleEditThread = async (thread) => {
    const newTitle = window.prompt("Ny titel:", thread.title);
    if (!newTitle || !newTitle.trim()) return;

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${apiBase}/api/forum/threads/${thread.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) {
        throw new Error("Could not update thread.");
      }
      const updated = await res.json();

      // Uppdatera i state
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, title: updated.title } : t))
      );
      alert("Thread updated!");
    } catch (err) {
      console.error("Error updating thread:", err);
      alert("Failed to update thread.");
    }
  };

  // ----------------------------------------------------------------------------
  // 5) Render: laddningsvy, felvy, vanlig vy
  // ----------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-[60vh] justify-center items-center">
        <div className="flex flex-col items-center gap-2 text-gray-700">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <p>{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.common.error}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Category not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 6) UI: Kategorinfo + subkategorier + trådar
  // ----------------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header: Tillbaka & Ny tråd-knapp */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/forum")}
          className="flex items-center gap-1 text-sm px-3 py-1 rounded hover:bg-gray-100 transition"
        >
          <ArrowLeftCircle className="w-4 h-4 text-gray-500" />
          <span>{t.common.back}</span>
        </button>
        <button
          onClick={handleCreateThread}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          {t.forum.newThread}
        </button>
      </div>

      {/* Kategori-info */}
      <Card className="shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {category.name}
          </CardTitle>
          {category.description && (
            <p className="text-sm text-gray-300 dark:text-gray-300 mt-1">{category.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <Card className="shadow">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t.forum.subcategories}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subcategories.map((sub) => (
                <CategoryCard 
                  key={sub._id} 
                  category={sub}
                  onClick={() => navigate(`/forum/category/${sub._id}`)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista av trådar */}
      <Card className="shadow">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t.forum.threadsInCategory} ({threads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {threads.length === 0 ? (
            <p className="text-sm text-gray-300 dark:text-gray-300 italic">
              {t.forum.noThreadsBeFirst}
            </p>
          ) : (
            <div className="divide-y divide-dark-600">
              {threads.map((thread) => (
                <ThreadRow 
                  key={thread._id} 
                  thread={thread}
                  onClick={() => navigate(`/forum/thread/${thread._id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
