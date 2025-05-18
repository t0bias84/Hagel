// src/pages/ForumCategory.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  ArrowLeftCircle,
  MessageSquare,
  Eye,
  Clock,
  Plus,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/translations/en";
import { sv } from "@/translations/sv";

/**
 * ForumCategory
 * =============
 * Displays a single category, any subcategories
 * and a list of threads.
 *
 * If you want to restrict thread creation to admin only,
 * you can fetch current_user (with roles) and
 * check before showing the "New Thread" button.
 */

// Wrapper component for links
const StyledLink = ({ to, children }) => (
  <div className="block w-full">
    <Link 
      to={to}
      className="!text-white no-underline hover:!text-dark-accent"
      style={{ 
        textDecoration: 'none !important',
        color: 'white !important'
      }}
    >
      {children}
    </Link>
  </div>
);

export default function ForumCategory() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;

  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [threads, setThreads] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Exempel: om du vill kolla om user är admin ---
  // const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        // 1) Fetch category info
        const catRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/forum/categories/${categoryId}`,
          { headers }
        );
        if (!catRes.ok) {
          throw new Error("Could not fetch category information.");
        }
        const catData = await catRes.json();
        if (!isMounted) return;
        setCategory(catData);

        // 2) Fetch subcategories (if you have such an endpoint)
        let subsData = [];
        try {
          const subsRes = await fetch(
            `${import.meta.env.VITE_API_URL}/api/forum/categories?parent_id=${categoryId}`,
            { headers }
          );
          if (subsRes.ok) {
            subsData = await subsRes.json();
          }
        } catch (errSubs) {
          // If you don't have a subcategories endpoint or it fails,
          // skip setting subcategories
        }
        if (!isMounted) return;
        setSubcategories(subsData);

        // 3) Fetch threads in this category
        const threadsRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/forum/categories/${categoryId}/threads`,
          { headers }
        );
        if (!threadsRes.ok) {
          throw new Error("Could not fetch threads.");
        }
        const threadsData = await threadsRes.json();
        if (!isMounted) return;
        setThreads(threadsData);

        // 4) (Valfritt) hämta currentUser om du vill kolla roller
        /*
        const userRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/me`,
          { headers }
        );
        if (userRes.ok) {
          const userData = await userRes.json();
          if (isMounted) setCurrentUser(userData);
        }
        */
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "An unexpected error occurred.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  // --- Optional function to create new thread ---
  // Om du vill skydda den för admin eller liknande
  const handleCreateThread = () => {
    // Ex: om du vill kolla currentUser?.roles?.includes("admin")
    // if (!currentUser?.roles?.includes("admin")) {
    //   return alert("Only admin can create new thread in this category.");
    // }
    navigate(`/forum/categories/${categoryId}/new-thread`);
  };

  // --- Render-lägen ---
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-dark-accent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="bg-dark-800 border-red-900">
          <AlertCircle className="h-4 w-4 text-white" />
          <AlertDescription className="text-white">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!category) {
    return (
      <Alert variant="destructive" className="m-6 bg-dark-800 border-red-900">
        <AlertCircle className="h-4 w-4 text-white" />
        <AlertDescription className="text-white">Category not found.</AlertDescription>
      </Alert>
    );
  }

  // --- UI: Show category, subcategories, threads ---
  return (
    <div className="container mx-auto px-4 py-8 bg-dark-900">
      {/* Tillbaka-knapp och kategorititel */}
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate("/forum")}
          className="flex items-center !text-white hover:!text-dark-accent transition-colors"
        >
          <ArrowLeftCircle className="w-5 h-5 mr-2" />
          {t.forum.backToForum}
        </button>
        <Link
          to={`/forum/new?category=${categoryId}`}
          className="flex items-center px-4 py-2 bg-dark-accent hover:bg-dark-accent/90 !text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t.forum.newThread}
        </Link>
      </div>

      {/* Kategorititel */}
      <Card className="mb-8 !bg-dark-800 !border-dark-700">
        <CardHeader className="p-6">
          <CardTitle className="text-3xl font-bold !text-white">
            {category.name}
          </CardTitle>
          {category.description && (
            <p className="mt-2 text-lg !text-white/90">{category.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Underkategorier (om finns) */}
      {subcategories?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 !text-white">{t.forum.subcategories}</h3>
          <ul className="space-y-2">
            {subcategories.map((sub) => (
              <li
                key={sub._id || sub.id}
                onClick={() => navigate(`/forum/category/${sub._id}`)}
                className="p-3 rounded-lg !bg-dark-800 !border-dark-700 hover:!bg-dark-700 cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="font-medium !text-white">{sub.name}</p>
                  {sub.description && (
                    <p className="text-sm !text-white/90">
                      {sub.description}
                    </p>
                  )}
                  {typeof sub.threadCount === "number" && (
                    <p className="text-xs !text-white/80 mt-1">
                      {sub.threadCount} {t.forum.threadCount}, {sub.postCount} {t.forum.postCount}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trådlista */}
      <div className="space-y-4">
        {threads.map((thread) => (
          <div key={thread.id}>
            <StyledLink to={`/forum/thread/${thread.id}`}>
              <Card className="!bg-dark-800 !border-dark-700 hover:!bg-dark-700/80 transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold !text-white">
                        {thread.title}
                      </h3>
                      <p className="!text-white/90 line-clamp-2 mb-4">
                        {thread.content}
                      </p>
                      <div className="flex items-center space-x-6 !text-white/80">
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2 !text-white/80" />
                          <span className="!text-white/80">{thread.post_count || 0} {t.forum.posts}</span>
                        </div>
                        <div className="flex items-center">
                          <Eye className="w-4 h-4 mr-2 !text-white/80" />
                          <span className="!text-white/80">{thread.view_count || 0} {t.forum.views}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 !text-white/80" />
                          <span className="!text-white/80">
                            {new Date(thread.last_post_at || thread.created_at).toLocaleString(
                              language === 'en' ? 'en-US' : 'sv-SE'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-6 flex flex-col items-end">
                      <span className="!text-white font-medium">
                        {thread.author?.username || "Anonymous"}
                      </span>
                      <span className="!text-white/80">
                        {new Date(thread.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StyledLink>
          </div>
        ))}

        {threads.length === 0 && (
          <div className="text-center p-8 !bg-dark-800 rounded-lg !text-white/80">
            {t.forum.noThreadsBeFirst}
          </div>
        )}
      </div>
    </div>
  );
}
