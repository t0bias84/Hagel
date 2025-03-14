import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  Plus,
  ArrowLeftCircle,
  Edit,
  Trash2,
} from "lucide-react";

export default function CategoryView() {
  const { catId } = useParams();
  const navigate = useNavigate();

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
        const catRes = await fetch(`${apiBase}/api/forum/categories/${catId}`, {
          headers,
        });
        if (!catRes.ok) {
          throw new Error("Kunde inte hämta kategoriinfo.");
        }
        const catData = await catRes.json();
        setCategory(catData);

        // --- C) Försök hämta subkategorier (om endpoint finns) ---
        // Skulle ge 404 om du inte har en sådan endpoint.
        // Om den inte existerar, sätter vi subcategories = []
        try {
          const subsRes = await fetch(
            `${apiBase}/api/forum/categories/${catId}/subcategories`,
            { headers }
          );
          if (subsRes.ok) {
            const dataSubs = await subsRes.json();
            setSubcategories(dataSubs);
          } else {
            setSubcategories([]); // Fallback
          }
        } catch (subErr) {
          console.warn("Ingen subkategorilist-endpoint hittad:", subErr);
          setSubcategories([]);
        }

        // --- D) Hämta alla trådar för denna kategori ---
        const thrRes = await fetch(
          `${apiBase}/api/forum/categories/${catId}/threads`,
          { headers }
        );
        if (!thrRes.ok) {
          throw new Error("Kunde inte hämta trådar i denna kategori.");
        }
        const thrData = await thrRes.json();
        setThreads(thrData);
      } catch (err) {
        console.error("Error i CategoryView:", err);
        setError(err.message || "Ett oväntat fel uppstod.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [catId, apiBase]);

  // ----------------------------------------------------------------------------
  // 2) Ny tråd
  // ----------------------------------------------------------------------------
  const handleNewThread = () => {
    navigate(`/forum/new?categoryId=${catId}`);
  };

  // ----------------------------------------------------------------------------
  // 3) Radera en tråd (endast admin)
  // ----------------------------------------------------------------------------
  const handleDeleteThread = async (threadId) => {
    const confirmDel = window.confirm(
      "Är du säker på att du vill radera denna tråd?"
    );
    if (!confirmDel) return;

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${apiBase}/api/forum/threads/${threadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Kunde inte radera tråden.");
      }

      // Ta bort lokalt i state
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      alert("Tråd raderad!");
    } catch (err) {
      console.error("Fel vid radering av tråd:", err);
      alert("Misslyckades med att radera tråd.");
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
        throw new Error("Kunde inte uppdatera tråd.");
      }
      const updated = await res.json();

      // Uppdatera i state
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, title: updated.title } : t))
      );
      alert("Tråd uppdaterad!");
    } catch (err) {
      console.error("Fel vid uppdatering av tråd:", err);
      alert("Misslyckades med att uppdatera tråd.");
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
          <p>Laddar kategori...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
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
          <AlertDescription>Kategorin hittades inte.</AlertDescription>
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
          <span>Tillbaka</span>
        </button>
        <button
          onClick={handleNewThread}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Ny tråd
        </button>
      </div>

      {/* Kategori-info */}
      <Card className="shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {category.name}
          </CardTitle>
          {category.description && (
            <p className="text-sm text-gray-500 mt-1">{category.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Ev. subkategorier */}
      {subcategories.length > 0 && (
        <Card className="shadow">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Underkategorier</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {subcategories.map((sub) => (
                <li
                  key={sub.id}
                  onClick={() => navigate(`/forum/category/${sub.id}`)}
                  className="p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="font-semibold text-gray-800">{sub.name}</div>
                  {sub.description && (
                    <div className="text-sm text-gray-600">{sub.description}</div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Lista av trådar */}
      <Card className="shadow">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Trådar ({threads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {threads.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Inga trådar ännu. Var först med att skapa en!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-sm">
                    <th className="p-2 font-medium">Titel</th>
                    <th className="p-2 font-medium">Skapad av</th>
                    <th className="p-2 font-medium">Skapad</th>
                    <th className="p-2 font-medium w-24">Åtgärder</th>
                  </tr>
                </thead>
                <tbody>
                  {threads.map((thread) => (
                    <tr
                      key={thread.id}
                      className="border-b hover:bg-gray-50 text-sm"
                    >
                      <td
                        className="p-2 cursor-pointer text-blue-600 underline"
                        onClick={() => navigate(`/forum/threads/${thread.id}`)}
                      >
                        {thread.title}
                      </td>
                      <td className="p-2 text-gray-700">
                        {thread.author_id || "Okänd"}
                      </td>
                      <td className="p-2 text-gray-600">
                        {thread.created_at
                          ? new Date(thread.created_at).toLocaleDateString("sv-SE", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </td>
                      <td className="p-2">
                        {isAdmin ? (
                          <div className="flex gap-2">
                            {/* Edit-knapp */}
                            <button
                              onClick={() => handleEditThread(thread)}
                              title="Redigera tråd"
                              className="text-yellow-600 hover:text-yellow-800"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {/* Delete-knapp */}
                            <button
                              onClick={() => handleDeleteThread(thread.id)}
                              title="Radera tråd"
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Ingen åtgärd
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
