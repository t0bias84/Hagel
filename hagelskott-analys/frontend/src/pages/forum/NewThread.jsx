// src/pages/NewThread.jsx

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Link2,
  Trash2,
  ChevronLeft
} from "lucide-react";

// React Quill för rik text
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/**
 * NewThread
 * =========
 * Skapar en ny tråd i en vald kategori (via dropdown).
 * Alternativ: om du vill låsa till en :categoryId från URL,
 *   använd parametern i stället för att visa dropdown.
 * 
 * Exemplet nedan visar en flexibel lösning:
 *   - Hämta alla kategorier
 *   - Låt användaren välja vilken (om man inte har en param)
 */
export default function NewThread() {
  const navigate = useNavigate();
  // Om du *vill* ta emot en categoryId från URL:en:
  const { categoryId: paramCatId } = useParams();

  // State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // HTML/Text från Quill
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Kategorier & vald kategori
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(paramCatId || "");

  // Filinput-ref om du vill trigga .click() programatiskt
  const fileInputRef = useRef(null);

  // =========================
  // 1) Hämta kategorier
  // =========================
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/forum/categories`);
        if (!res.ok) {
          throw new Error("Kunde inte hämta kategorilistan");
        }
        const data = await res.json();
        // Sortera eller filtrera om du vill
        setCategories(data);
      } catch (err) {
        console.error("Fel vid hämtning av kategorier:", err);
        // Ingen hård error-state här, men du kan visa fel om du vill
      }
    };
    fetchCategories();
  }, []);

  // =========================
  // Hantera filuppladdning
  // =========================
  const handleFilesSelected = (e) => {
    const newFiles = Array.from(e.target.files);
    setAttachedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // =========================
  // Skicka formuläret
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1) Validera
    if (!selectedCategory) {
      setError("Du måste välja (eller ange) en kategori.");
      return;
    }
    if (!title.trim()) {
      setError("Du måste ange en titel.");
      return;
    }
    // Kolla att content inte är tomt (i ren text):
    const plainText = content.replace(/<[^>]+>/g, "").trim();
    if (!plainText) {
      setError("Du måste ange något innehåll.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 2) Bygg formData
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content); // Quill-HTML
      // Exempel: sätt author_id till inloggad user (hämta från store/ctx)
      formData.append("author_id", "myLoggedInUser123");

      // Bifoga filer
      attachedFiles.forEach((file, idx) => {
        formData.append(`file_${idx}`, file);
      });

      // 3) Skicka anrop
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        // Anropa rätt kategori. selectedCategory => ex "1234abcd"
        `${import.meta.env.VITE_API_URL}/api/forum/categories/${selectedCategory}/threads`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
            // Låt bli att sätta 'Content-Type' -> browsern sätter multipart
          },
          body: formData
        }
      );

      if (!res.ok) {
        throw new Error("Kunde inte skapa ny tråd. Kontrollera dina fält och försök igen.");
      }

      const createdThread = await res.json();
      // Navigera till den nya tråden
      navigate(`/forum/threads/${createdThread.id}`);
    } catch (err) {
      setError(err.message || "Något gick fel vid skapandet av tråden.");
      console.error("Fel vid skapandet av tråd:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 space-y-4">
      {/* Tillbaka-knapp / Sidhuvud */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Tillbaka</span>
        </button>
      </div>

      {/* Kort: Skapa ny tråd */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Skapa ny tråd</CardTitle>
        </CardHeader>

        <CardContent>
          {/* Felmeddelande */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Laddningsindikator */}
          {loading && (
            <div className="flex items-center gap-2 text-gray-500 mb-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Skapar tråd...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Välj kategori (om paramCatId saknas) */}
            {!paramCatId && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 rounded-md border border-gray-300
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- Välj kategori --</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Titel */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Titel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-md border border-gray-300 
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="En kort och beskrivande titel..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Innehåll: ReactQuill */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Innehåll <span className="text-red-500">*</span>
              </label>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                placeholder="Dela med dig av dina tankar, länkar eller frågor..."
                className="bg-white"
                readOnly={loading}
              />
            </div>

            {/* Bifogade filer (valfritt) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Bifoga filer (valfritt)
              </label>

              {/* Uppladdningsknapp */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm 
                             rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600"
                >
                  <ImageIcon className="h-4 w-4" />
                  Lägg till filer
                </button>

                {/* (ex. Infoga-länk-knapp om du vill, i framtiden) */}
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm
                             rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
                >
                  <Link2 className="h-4 w-4" />
                  Infoga länk (kommer senare)
                </button>
              </div>

              {/* Filinput (gömd) */}
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFilesSelected}
                className="hidden"
              />

              {/* Förhandsvisning av valda filer */}
              {attachedFiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  {attachedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-red-500 hover:text-red-600"
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Knappar */}
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="px-4 py-2 rounded-md border border-gray-300
                           text-gray-600 hover:bg-gray-100"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white
                           rounded-md hover:bg-blue-500"
              >
                Publicera
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
