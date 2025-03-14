import React, { useEffect, useState } from "react";

/**
 * QuizList.jsx
 * ============ 
 * En modern, interaktiv lista av quizfrågor.
 * Nu med fixad bild-URL: "http://localhost:8000" + q.imageUrl
 */

// Ändra vid behov om du använder environment-variabel 
// eller annan port:
const API_BASE_URL = "http://localhost:8000";
const BACKEND_ORIGIN = "http://localhost:8000";

function QuizList() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtrering/sök
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Visning
  const [showAnswers, setShowAnswers] = useState(false);

  // Slumpat läge + limit
  const [randomMode, setRandomMode] = useState(false);
  const [limit, setLimit] = useState(10);

  // Hämta frågor vid mount/förändring
  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [randomMode]);

  /**
   * Hämtar frågor från backend:
   * - Om randomMode = true => /api/quiz/random?amount=limit
   * - Annars => /api/quiz?limit=...
   */
  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);

    let url;
    if (randomMode) {
      url = `${API_BASE_URL}/api/quiz/random?amount=${limit}`;
    } else {
      url = `${API_BASE_URL}/api/quiz?limit=${limit}&skip=0`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Kunde inte hämta quiz-frågor");
      }
      const data = await res.json();
      setQuestions(data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching quiz data:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filtrera frågor baserat på sök och kategori
   */
  const filteredQuestions = questions.filter((q) => {
    if (categoryFilter !== "all" && q.category !== categoryFilter) {
      return false;
    }
    const lowerSearch = searchTerm.toLowerCase();
    // sök i questionText + prompt
    if (
      !q.questionText.toLowerCase().includes(lowerSearch) &&
      !(q.prompt || "").toLowerCase().includes(lowerSearch)
    ) {
      return false;
    }
    return true;
  });

  /**
   * Rendera en enskild fråga
   */
  const renderQuestionCard = (q) => {
    return (
      <div
        key={q._id}
        className="border border-gray-300 rounded-md p-4 mb-4 bg-white shadow-md"
      >
        <h2 className="text-lg font-semibold mb-2">{q.questionText}</h2>

        {/* Visa bild om imageUrl finns */}
        {q.imageUrl ? (
          <img
            src={`${BACKEND_ORIGIN}${q.imageUrl}`}
            alt="quiz illustration"
            className="max-w-xs mb-3 rounded-md"
          />
        ) : (
          <p className="italic text-gray-500 mb-3">Ingen bild</p>
        )}

        {/* Visa prompt (valfritt) */}
        {q.prompt && (
          <p className="text-sm text-gray-600 mb-2">
            <strong>Prompt:</strong> {q.prompt}
          </p>
        )}

        {/* Svarsalternativ */}
        {showAnswers ? (
          <ul className="list-disc list-inside pl-4 mb-2">
            {q.answers.map((ans, idx) => (
              <li
                key={idx}
                className={
                  ans.isCorrect
                    ? "font-medium text-green-600"
                    : "text-gray-800"
                }
              >
                {ans.text}
                {ans.isCorrect && <span className="ml-1 text-green-700">(Rätt)</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 mb-2 text-sm">[Svar dolda]</p>
        )}

        <p className="text-sm text-gray-600 mb-1">
          <strong>Kategori: </strong> {q.category}
        </p>
        <p className="text-xs text-gray-400">
          <strong>CreatedAt: </strong> {q.createdAt}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto mt-6 px-4">
      <h1 className="text-2xl font-bold mb-4">Quiz-frågor</h1>

      {/* Sök + filter + slump + limit */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">
            Sök (fråga/prompt):
          </label>
          <input
            type="text"
            className="border border-gray-300 rounded-md px-2 py-1 w-full"
            placeholder="Sökord..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">
            Kategori:
          </label>
          <select
            className="border border-gray-300 rounded-md px-2 py-1 w-full"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Alla</option>
            <option value="vapen">Vapen</option>
            <option value="jakt">Jakt</option>
            <option value="skytte">Skytte</option>
            <option value="prepping">Prepping</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">
            Antal frågor:
          </label>
          <input
            type="number"
            className="border border-gray-300 rounded-md px-2 py-1 w-full"
            value={limit}
            min={1}
            max={100}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={fetchQuestions}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
        >
          Hämta
        </button>
        <button
          onClick={() => setRandomMode(!randomMode)}
          className={`px-4 py-2 rounded-md transition ${
            randomMode
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
          }`}
        >
          {randomMode ? "Slump: På" : "Slump: Av"}
        </button>
        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
        >
          {showAnswers ? "Dölj svar" : "Visa svaren"}
        </button>
      </div>

      {/* Error- och loading-hantering */}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-gray-600 mb-4">Laddar...</p>}

      {/* Visa filtrerade frågor */}
      {!loading && filteredQuestions.length === 0 && (
        <p className="text-gray-700">Inga frågor matchar filtreringen.</p>
      )}
      {!loading &&
        filteredQuestions.map((q) => renderQuestionCard(q))}
    </div>
  );
}

export default QuizList;
