import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function QuizStartPage() {
  const navigate = useNavigate();

  const [category, setCategory] = useState("jakt");
  const [difficulty, setDifficulty] = useState("normal");
  const [amount, setAmount] = useState(5);

  function handleStartQuiz() {
    // Navigera till /quiz/play?category=...&difficulty=...&amount=...
    navigate(`/quiz/play?category=${category}&difficulty=${difficulty}&amount=${amount}&mode=random`);
  }

  function handleStartJagarexamen() {
    // Här sätter vi mode=jagarexamen, 70 frågor, svårighetsgrad = valfri, etc.
    // Du kan ev. hårdkoda amount=70 för jägarexamen, eller läsa av ex. 70 från en state.
    navigate(`/quiz/play?mode=jagarexamen&difficulty=${difficulty}&amount=70`);
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 p-4 text-gray-100">
      <h1 className="text-3xl font-bold mb-4">Starta ett quiz</h1>
      <p className="mb-6 text-gray-300">
        Förbered dig inför <strong>jägarexamen</strong> eller testa dina{" "}
        <strong>jaktkunskaper</strong> i våra interaktiva quiz.
        Välj mellan olika kategorier (<em>jakt, prepping, bushcraft</em> etc.) och svårighetsgrad för att anpassa upplevelsen.
      </p>

      {/* Stort kort: Jägarexamen Test & Quiz */}
      <div className="bg-gray-800 p-5 rounded shadow mb-6">
        <h2 className="text-2xl font-semibold mb-3">Jägarexamen Test & Quiz</h2>
        <p className="mb-4 text-gray-200 leading-relaxed">
          Välkommen till vårt jakt- och jägarexamen-test, där du kan öva på allt från{" "}
          <em>artkännedom</em> och <em>vapenlagstiftning</em> till <em>jaktetik</em>,
          säker <em>vapenhantering</em> och <em>skottverkan</em>.
          Våra quizfrågor är anpassade för dig som vill klara teoriprovet till jägarexamen,
          men även för erfarna jägare som vill hålla kunskaperna uppdaterade.
        </p>
        <p className="mb-4 text-gray-200 leading-relaxed">
          I det vanliga quizläget kan du enkelt mixa frågor från olika kategorier,
          medan jägarexamen-läget fokuserar mer på grundläggande teori och
          de ämnesområden som Naturvårdsverket kräver. Här får du 
          <strong> omväxlande frågor</strong> med feedback och kan se vilka områden du behöver förbättra.
        </p>
        <p className="mb-4 text-gray-200 leading-relaxed">
          Oavsett om du är ny inom jakt eller redan har erfarenhet är ett 
          <em>jaktquiz</em> ett utmärkt sätt att förbereda dig. Genom att välja 
          svårighetsgrad <strong>Normal</strong> eller <strong>Nerd</strong> 
          kan du få en nivå som passar dig. Testa dina kunskaper nu och bli redo för jägarexamen!
        </p>
      </div>

      {/* Två "kort" bredvid varandra: Vanligt quiz och Jägarexamen-läge */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Vanligt quiz */}
        <div className="flex-1 bg-gray-800 rounded p-4 shadow">
          <h3 className="text-xl font-semibold mb-2">Vanligt quiz</h3>
          <p className="text-sm text-gray-300 mb-4">
            Perfekt för dig som vill ha en blandning av frågor från olika kategorier.
            Träna på allt från vapenhantering till bushcraft och prepping.
          </p>
          <button
            onClick={handleStartQuiz}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition"
          >
            Välj "Vanligt quiz"
          </button>
        </div>

        {/* Jägarexamen-läge */}
        <div className="flex-1 bg-gray-800 rounded p-4 shadow">
          <h3 className="text-xl font-semibold mb-2 flex items-center justify-between">
            <span>Jägarexamen-läge <span className="text-green-400 text-sm ml-2">(För jägarexamen)</span></span>
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            Välj detta läge för att fokusera på ämnena i jägarexamen:
            artkännedom, vapenlagstiftning, jaktmetoder, säkerhet, med mera. <br />
            <strong>70 frågor</strong> och <strong>60 minuters tidsgräns</strong>.
          </p>
          <button
            onClick={handleStartJagarexamen}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition"
          >
            Starta jägarexamen-test
          </button>
        </div>
      </div>

      {/* Här nedan: extra text om kategorierna, bra för SEO. */}
      <div className="bg-gray-800 p-4 rounded mb-6">
        <h4 className="text-lg font-semibold mb-3">Om våra kategorier</h4>
        <p className="text-sm text-gray-300 mb-2 leading-relaxed">
          <strong>Jakt:</strong> Fokus på jaktvapen, ammunition, skytte, jaktlagstiftning och jaktetik.
          Perfekt för blivande jägare och erfarna som vill fräscha upp sina kunskaper.
        </p>
        <p className="text-sm text-gray-300 mb-2 leading-relaxed">
          <strong>Prepping:</strong> Lär dig hur du förbereder dig för krissituationer,
          hur du hanterar mat och vattenlagring, samt grundläggande överlevnadsutrustning.
        </p>
        <p className="text-sm text-gray-300 mb-2 leading-relaxed">
          <strong>Bushcraft:</strong> Fördjupa dig i friluftsteknik, naturkunskap och hantverk i skogen.
          Hur du tänder eld, bygger skydd, hittar mat i naturen och mer.
        </p>
        <p className="text-sm text-gray-300 mb-2 leading-relaxed">
          <em>Vi kommer fortsätta fylla på med fler kategorier och ämnen i takt med att quizen växer!</em>
        </p>
      </div>

      {/* Anpassa ditt quiz */}
      <div className="bg-gray-800 p-4 rounded shadow">
        <h3 className="text-xl font-semibold mb-3">Anpassa ditt quiz</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Kategori */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-900 text-gray-100 border border-gray-700 rounded px-2 py-1"
            >
              <option value="jakt">jakt</option>
              <option value="prepping">prepping</option>
              <option value="bushcraft">bushcraft</option>
              <option value="friluftsliv">friluftsliv</option>
              <option value="skytte">skytte</option>
              <option value="vapen">vapen</option>
              {/* Lägg till övriga om du vill */}
            </select>
          </div>

          {/* Svårighetsgrad */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Svårighetsgrad</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full bg-gray-900 text-gray-100 border border-gray-700 rounded px-2 py-1"
            >
              <option value="normal">Normal</option>
              <option value="nerd">Nerd</option>
              {/* om du har fler svårighetsnivåer */}
            </select>
          </div>

          {/* Antal frågor */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Antal frågor</label>
            <input
              type="number"
              min={1}
              max={100}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-gray-900 text-gray-100 border border-gray-700 rounded px-2 py-1"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleStartQuiz}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition"
          >
            Starta quiz
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuizStartPage;
