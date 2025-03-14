import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:8000"; // eller import.meta.env.VITE_API_URL

export default function QuizPlayPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "regular";
  const category = searchParams.get("category") || "jakt";
  const difficulty = searchParams.get("difficulty") || "normal";
  const amount = Number(searchParams.get("amount")) || 5;

  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Exempel: 60 min = 3600 sek
  // Om du vill ta "timer" från queryParams => Number(searchParams.get("timer")) || 3600
  const EXAM_TIME_LIMIT = 60 * 60; 
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME_LIMIT);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchQuizQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Om "examen"-läge => starta nedräkning
  useEffect(() => {
    if (mode === "examen") {
      startExamTimer();
    }
    return () => stopExamTimer();
  }, [mode]);

  function startExamTimer() {
    stopExamTimer(); // Säkerställ att ingen gammal timer kör
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Tiden ute
          clearInterval(timerRef.current);
          setShowResult(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopExamTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function fetchQuizQuestions() {
    setLoading(true);
    setError(null);

    try {
      let url;
      if (mode === "examen") {
        // Hämta t.ex. 70 frågor, eller använd ?amount=70
        url = `${API_BASE_URL}/api/quiz/jagarexamen?amount=${amount}`;
        if (difficulty) {
          url += `&difficulty=${difficulty}`;
        }
      } else {
        // ”Vanligt” slumpat quiz
        url = `${API_BASE_URL}/api/quiz/random?amount=${amount}`;
        if (category) url += `&category=${category}`;
        if (difficulty) url += `&difficulty=${difficulty}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Kunde inte hämta frågor.");
      }
      const data = await res.json();
      setQuestions(data);
      setUserAnswers(Array(data.length).fill(null));
    } catch (err) {
      setError(err.message || "Ett fel uppstod");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectAnswer(answerIndex) {
    if (showResult) return; 
    const updated = [...userAnswers];
    updated[currentIndex] = answerIndex;
    setUserAnswers(updated);
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResult(true);
    }
  }

  // Räkna rätt
  let correctCount = 0;
  if (showResult && questions.length > 0) {
    for (let i = 0; i < questions.length; i++) {
      const userIndex = userAnswers[i];
      if (
        userIndex !== null &&
        questions[i].answers[userIndex] &&
        questions[i].answers[userIndex].isCorrect
      ) {
        correctCount++;
      }
    }
  }

  function handleRestart() {
    stopExamTimer();
    navigate("/quiz"); 
  }

  // --------- UI: Error-hantering ---------
  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-10 p-6 bg-gray-800 text-gray-100 rounded shadow-md">
        <p className="text-red-400 text-xl mb-4">{error}</p>
        <button
          onClick={() => navigate("/quiz")}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Tillbaka
        </button>
      </div>
    );
  }

  // --------- UI: Laddar/inga frågor ---------
  if (loading || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-10 p-6 bg-gray-800 text-gray-100 rounded shadow-md">
        <p className="text-gray-200">
          {loading
            ? "Laddar frågor..."
            : "Inga frågor hittades eller tom result."}
        </p>
      </div>
    );
  }

  // --------- UI: Visa resultat ---------
  if (showResult) {
    return (
      <div className="max-w-3xl mx-auto my-10 p-6 bg-gray-800 text-gray-100 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-4">
          {mode === "examen" ? "Jägarexamen – Resultat" : "Quiz – Resultat"}
        </h2>
        <p className="text-lg mb-6">
          Du fick <span className="font-bold">{correctCount}</span> av{" "}
          <span className="font-bold">{questions.length}</span> rätt!
        </p>

        {/* Lista varje fråga med ditt svar vs korrekt */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const userIndex = userAnswers[idx];
            const userAnswer = userIndex !== null ? q.answers[userIndex] : null;
            const isCorrect = userAnswer && userAnswer.isCorrect;
            return (
              <div
                key={q._id || idx}
                className="border border-gray-700 rounded p-4"
              >
                <h3 className="font-semibold mb-1 text-gray-200">
                  {q.questionText}
                </h3>
                <p className="mb-1">
                  <span className="font-medium">Ditt svar:</span>{" "}
                  {userAnswer ? (
                    <>
                      {userAnswer.text}{" "}
                      {isCorrect ? (
                        <span className="text-green-400 ml-2">(Rätt)</span>
                      ) : (
                        <span className="text-red-400 ml-2">(Fel)</span>
                      )}
                    </>
                  ) : (
                    <span className="italic text-gray-400">Ingen svar</span>
                  )}
                </p>
                {!isCorrect && (
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Rätt svar:</span>{" "}
                    {q.answers.find((ans) => ans.isCorrect)?.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleRestart}
          className="mt-6 px-5 py-2 bg-green-600 text-white rounded hover:bg-green-500"
        >
          Spela igen
        </button>
      </div>
    );
  }

  // --------- UI: Visa nuvarande fråga ---------
  const question = questions[currentIndex];
  const userAnswerIndex = userAnswers[currentIndex];

  // Timer
  let minutesLeft = 0;
  let secondsLeft = 0;
  if (mode === "examen") {
    minutesLeft = Math.floor(timeLeft / 60);
    secondsLeft = timeLeft % 60;
  }

  // Procent (progress bar)
  const progressPercent = Math.round(
    ((currentIndex + 1) / questions.length) * 100
  );

  return (
    <div className="max-w-3xl mx-auto my-10 p-4 sm:p-6 bg-gray-800 text-gray-100 rounded shadow-lg">
      {/* Överdel: rubrik, progress, timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">
            {mode === "examen" ? "Jägarexamen" : "Quiz"}
          </h2>
          <p className="text-sm text-gray-300">
            Fråga {currentIndex + 1} / {questions.length} | Svårighetsgrad:{" "}
            <span className="italic">{difficulty}</span>
          </p>
        </div>
        {mode === "examen" && (
          <div className="text-red-400 font-semibold text-lg mt-2 sm:mt-0">
            {minutesLeft}:{String(secondsLeft).padStart(2, "0")}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 h-2 rounded mb-4">
        <div
          className="bg-green-500 h-2 rounded"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Frågetext */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{question.questionText}</h3>
      </div>

      {/* Bild om finns */}
      {question.imageUrl ? (
        <div className="mb-4">
          <img
            src={
              question.imageUrl.startsWith("http")
                ? question.imageUrl
                : `${API_BASE_URL}${question.imageUrl}`
            }
            alt="quiz illustration"
            className="max-w-full sm:max-w-md rounded"
          />
        </div>
      ) : (
        <p className="italic text-sm text-gray-400 mb-4">Ingen bild</p>
      )}

      {/* Svarsalternativ */}
      <div className="space-y-3 mb-6">
        {question.answers.map((ans, idx) => {
          const isSelected = userAnswerIndex === idx;
          return (
            <button
              key={idx}
              onClick={() => handleSelectAnswer(idx)}
              className={`block w-full text-left px-4 py-2 rounded-md transition-colors
                ${
                  isSelected
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600"
                }
              `}
            >
              {ans.text}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleNext}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
      >
        {currentIndex < questions.length - 1 ? "Nästa" : "Slutför"}
      </button>
    </div>
  );
}
