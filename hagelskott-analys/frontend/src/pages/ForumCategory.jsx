// src/pages/ForumCategory.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  FolderPlus,
} from "lucide-react";

/**
 * ForumCategory
 * =============
 * Visar en enskild kategori, ev. underkategorier
 * samt en lista av trådar.
 *
 * Om man vill styra att endast admin kan skapa ny tråd
 * kan man hämta in current_user (med roller) och
 * göra en check innan man visar "Ny tråd"-knappen.
 */
export default function ForumCategory() {
  const { id } = useParams(); // :id = categoryId
  const navigate = useNavigate();

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

        // 1) Hämta kategori-info
        const catRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/forum/categories/${id}`,
          { headers }
        );
        if (!catRes.ok) {
          throw new Error("Kunde inte hämta kategoriinfo.");
        }
        const catData = await catRes.json();
        if (!isMounted) return;
        setCategory(catData);

        // 2) Hämta underkategorier (om du har en sådan endpoint)
        //    Om ej: ta bort detta block!
        let subsData = [];
        try {
          const subsRes = await fetch(
            `${import.meta.env.VITE_API_URL}/api/forum/categories?parent_id=${id}`,
            { headers }
          );
          if (subsRes.ok) {
            subsData = await subsRes.json();
          }
        } catch (errSubs) {
          // Om du inte har subkat-endpoint eller den fallerar,
          // låt bli att sätta subcategories
        }
        if (!isMounted) return;
        setSubcategories(subsData);

        // 3) Hämta trådar i denna kategori
        const threadsRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/forum/categories/${id}/threads`,
          { headers }
        );
        if (!threadsRes.ok) {
          throw new Error("Kunde inte hämta trådar.");
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
        setError(err.message || "Ett oväntat fel uppstod.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // --- Ev. en funktion för att skapa ny tråd ---
  // Om du vill skydda den för admin eller liknande
  const handleCreateThread = () => {
    // Ex: om du vill kolla currentUser?.roles?.includes("admin")
    // if (!currentUser?.roles?.includes("admin")) {
    //   return alert("Endast admin får skapa ny tråd i denna kategori.");
    // }
    navigate(`/forum/categories/${id}/new-thread`);
  };

  // --- Render-lägen ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">Laddar kategori...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!category) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Kategorin hittades inte.</AlertDescription>
      </Alert>
    );
  }

  // --- UI: Visa kategori, underkategorier, trådar ---
  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <Card className="shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* Vänster del: Tillbaka + Kategorins titel */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/forum")}
                title="Tillbaka"
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
              <CardTitle className="text-lg font-semibold">
                {category.name}
              </CardTitle>
            </div>

            {/* Höger del: Ny tråd-knapp */}
            <button
              onClick={handleCreateThread}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              <FolderPlus className="h-4 w-4" />
              Ny tråd
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Kategoribeskrivning */}
          {category.description ? (
            <p className="text-gray-700 mb-4">{category.description}</p>
          ) : (
            <p className="text-gray-500 mb-4 italic">
              Ingen beskrivning för denna kategori
            </p>
          )}

          {/* Underkategorier (om finns) */}
          {subcategories?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-3">Underkategorier</h3>
              <ul className="space-y-2">
                {subcategories.map((sub) => (
                  <li
                    key={sub._id || sub.id}
                    onClick={() => navigate(`/forum/category/${sub._id}`)}
                    className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-700">{sub.name}</p>
                      {sub.description && (
                        <p className="text-sm text-gray-500">
                          {sub.description}
                        </p>
                      )}
                      {/* Ex: om du har threadCount/postCount på sub */}
                      {typeof sub.threadCount === "number" && (
                        <p className="text-xs text-gray-400 mt-1">
                          {sub.threadCount} trådar, {sub.postCount} inlägg
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lista av trådar */}
          <div>
            <h3 className="text-md font-semibold mb-3">Trådar</h3>
            {threads?.length > 0 ? (
              <ul className="space-y-2">
                {threads.map((thread) => (
                  <li
                    key={thread.id}
                    onClick={() => navigate(`/forum/thread/${thread.id}`)}
                    className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <h4 className="font-semibold text-gray-800">
                      {thread.title}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {/* Kort förhandsvisning av content */}
                      {thread.content.length > 120
                        ? thread.content.slice(0, 120) + "..."
                        : thread.content}
                    </p>
                    {/* Ex: Skapad-datum eller annat */}
                    {thread.created_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(thread.created_at).toLocaleString("sv-SE")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                Inga trådar skapade i denna kategori.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
