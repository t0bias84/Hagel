// src/pages/NewThread.jsx

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "../../components/ui/card";
import {
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Link2,
  Trash2,
  ChevronLeft,
  Plus
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useLanguage } from "../../contexts/LanguageContext";
import { en } from "../../translations/en";
import { sv } from "../../translations/sv";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";

// React Quill för rik text
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/**
 * NewThread
 * =========
 * Creates a new thread in a selected category (via dropdown).
 * Alternativ: om du vill låsa till en :categoryId från URL,
 *   använd parametern i stället för att visa dropdown.
 * 
 * Exemplet nedan visar en flexibel lösning:
 *   - Hämta alla kategorier
 *   - Låt användaren välja vilken (om man inte har en param)
 */
export default function NewThread() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const t = language === 'en' ? en : sv;
  
  // Om du *vill* ta emot en categoryId från URL:en:
  const { categoryId: paramCatId } = useParams();
  
  // Hämta categoryId från query-parametern (om den finns)
  const searchParams = new URLSearchParams(location.search);
  const queryCatId = searchParams.get("categoryId");
  
  // Använd param eller query param om tillgänglig
  const initialCategoryId = paramCatId || queryCatId || "";

  // State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // HTML/Text från Quill
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Kategorier & vald kategori
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);

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
          throw new Error("Could not fetch category list");
        }
        const data = await res.json();
        // Sortera kategorier i alfabetisk ordning
        data.sort((a, b) => a.name.localeCompare(b.name));
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
      setError(t.forum.selectCategoryError || "You must select a category.");
      return;
    }
    if (!title.trim()) {
      setError(t.forum.titleRequiredError || "You must enter a title.");
      return;
    }
    // Kolla att content inte är tomt (i ren text):
    const plainText = content.replace(/<[^>]+>/g, "").trim();
    if (!plainText) {
      setError(t.forum.contentRequiredError || "You must enter some content.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 2) Bygg formData
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content); // Quill-HTML
      
      // Använd token för att få användar-ID från servern
      const token = localStorage.getItem("token") || "";
      
      // Bifoga author_id om du har det i localStorage
      // Annars hämta det från servern eller låt servern hantera det
      formData.append("author_id", localStorage.getItem("userId") || "current_user");

      // Bifoga filer
      attachedFiles.forEach((file, idx) => {
        formData.append(`file_${idx}`, file);
      });

      // 3) Skicka anrop
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
        throw new Error(await res.text() || "Could not create thread");
      }

      const createdThread = await res.json();
      // Navigera till den nya tråden
      navigate(`/forum/thread/${createdThread.id}`);
    } catch (err) {
      setError(err.message || t.forum.threadCreationError || "Something went wrong when creating the thread");
      console.error("Fel vid skapandet av tråd:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Link to="/forum" className="flex items-center text-white mb-6 hover:underline">
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t.forum.backToForum}
      </Link>

      <Card className="bg-dark-800 border-dark-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-white text-xl">{t.forum.createNewThread}</CardTitle>
          <CardDescription className="text-gray-300">
            {t.forum.createThreadDescription}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-950 border-red-800 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="category" className="block text-white text-sm font-medium">
                {t.forum.category}
              </label>
              <Select 
                value={selectedCategory} 
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder={t.forum.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {language === 'en' ? category.english_name || category.name : category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="title" className="block text-white text-sm font-medium">
                {t.forum.threadTitle}
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-dark-700 border-dark-600 text-white"
                placeholder={t.forum.threadTitlePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="block text-white text-sm font-medium">
                {t.forum.threadContent}
              </label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-dark-700 border-dark-600 text-white min-h-[200px]"
                placeholder={t.forum.threadContentPlaceholder}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-white text-sm font-medium">
                {t.forum.attachFiles}
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-dark-700 border-dark-600 text-white hover:bg-dark-600"
                  onClick={() => document.getElementById("file-upload").click()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t.forum.selectFiles}
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFilesSelected}
                />
              </div>
              {attachedFiles.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-white text-sm font-medium mb-2">{t.forum.selectedFiles}:</h4>
                  <ul className="space-y-1">
                    {attachedFiles.map((file, index) => (
                      <li key={index} className="flex items-center justify-between bg-dark-700 rounded p-2">
                        <span className="text-white text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-white hover:text-red-400"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 border-t border-dark-700 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-white hover:bg-dark-700"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              {t.forum.cancel}
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={loading}
            >
              {loading ? t.common.loading : t.forum.submit}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
