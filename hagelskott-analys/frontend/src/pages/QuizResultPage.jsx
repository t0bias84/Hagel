import React from "react";
import { useNavigate } from "react-router-dom";

function QuizResultPage({ correctCount, totalQuestions, onRestart }) {
  const navigate = useNavigate();

  // Räkna ut procent rätt
  const percentCorrect = Math.round((correctCount / totalQuestions) * 100);

  // Välj budskap beroende på resultat
  let resultMessage = "";
  if (percentCorrect < 50) {
    resultMessage =
      "Aj då, dags att ladda om bössan och plugga mer! Du har en bit kvar.";
  } else if (percentCorrect < 75) {
    resultMessage =
      "Helt okej! Du är på god väg, men lite mer övning och du är där.";
  } else if (percentCorrect < 90) {
    resultMessage =
      "Bra jobbat! Du visar på fin känsla. Kanske finslipa lite mer så blir det super.";
  } else if (percentCorrect < 95) {
    resultMessage =
      "Strålande insats! Du är en riktig stjärna. Fortsätt så här!";
  } else {
    resultMessage =
      "Du är gränslöst gudomlig! Finns det något du inte kan?";
  }

  // Hantera "Spela igen"
  function handleReplay() {
    if (onRestart) {
      onRestart();
    } else {
      // Om du vill navigera till en startsida / quiz
      navigate("/quiz");
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-gray-800 text-gray-100 rounded shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Resultat</h2>

      <div className="mb-5">
        <p className="text-lg mb-2">
          Du fick <span className="font-bold">{correctCount}</span> av{" "}
          <span className="font-bold">{totalQuestions}</span> rätt.
        </p>
        <p className="text-xl font-semibold text-green-400">
          {percentCorrect} %
        </p>
      </div>

      <div className="mb-5 bg-gray-700 p-4 rounded">
        <p className="text-md text-gray-50">{resultMessage}</p>
      </div>

      <button
        onClick={handleReplay}
        className="inline-block px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded"
      >
        Spela igen
      </button>
    </div>
  );
}

export default QuizResultPage;
