import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Target, Crosshair, Info, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * LoadTypeSelection
 * =================
 * Komponent för att välja vilken typ av laddning (hagel, kula m.m.)
 * man vill skapa. Hämtar en lista av laddningstyper från backend
 * (valfritt) och visar en interaktiv grid av kort.
 *
 * När användaren klickar på ett kort, navigerar vi till rätt route
 * (ex. "/load-creation/shotgun").
 */
const LoadTypeSelection = () => {
  const navigate = useNavigate();

  // Laddningsstatus och ev. felmeddelande
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Exempel: hårdkodade kort för hagel- vs. kul-laddningar
  // Du kan ersätta detta med server-data om du vill
  const loadTypeCards = [
    {
      id: "shotgun",
      title: "Hagel",
      description: "Skapa hagelladdningar för jakt och sportskytte",
      icon: Target,
      color: "bg-green-700", // eller t.ex. "bg-military-700"
      features: [
        "Stöd för alla kalibrar",
        "Komplett komponenthantering",
        "Mönsteranalys (Pattern Analysis)",
        "Historik & statistik",
      ],
      route: "/load-creation/shotgun",
    },
    {
      id: "bullet",
      title: "Kula",
      description: "Skapa precisa och kraftfulla kulladdningar",
      icon: Crosshair,
      color: "bg-blue-700", // eller t.ex. "bg-military-700"
      features: [
        "Alla kalibrar & kultyper",
        "Avancerad ballistik",
        "Kronograf-integration",
        "Laddningshistorik",
      ],
      route: "/load-creation/bullet",
    },
  ];

  /**
   * useEffect: Exempel på att hämta laddningstyper från en backend-endpoint.
   * Just nu är funktionen mockad, men du kan aktivera/förändra den om du
   * verkligen vill hämta data dynamiskt från servern.
   */
  useEffect(() => {
    const fetchLoadTypes = async () => {
      try {
        setError("");
        // Exempel: GET /api/loads/types
        // const response = await fetch("http://localhost:8000/api/loads/types");
        // if (!response.ok) {
        //   throw new Error("Kunde inte hämta laddningstyper.");
        // }
        // const data = await response.json();
        // ...uppdatera state med data
      } catch (err) {
        setError(
          err.message || "Ett oväntat fel uppstod vid laddningstyp-hämtning."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchLoadTypes();
  }, []);

  /**
   * handleLoadType
   * --------------
   * När användaren klickar på ett kort,
   * navigerar vi till kortets definierade route.
   */
  const handleLoadType = (typeId) => {
    const selectedCard = loadTypeCards.find((card) => card.id === typeId);
    if (selectedCard) {
      navigate(selectedCard.route);
    } else {
      setError("Ogiltig laddningstyp vald.");
    }
  };

  // Visa en enkel spinner/skärm om data laddas
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-military-900">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-military-900 text-gray-100 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Rubrik & introduktion */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Välj laddningstyp</h1>
          <p className="mt-2 text-gray-400">
            Skapa dina egna laddningar med full kontroll över komponenter.
          </p>
        </div>

        {/* Eventuellt felmeddelande */}
        {error && (
          <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Kortvisning av laddningstyper */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {loadTypeCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                className={`
                  flex flex-col p-6 rounded-lg transition
                  transform hover:scale-105 focus:outline-none
                  ${card.color}
                `}
                onClick={() => handleLoadType(card.id)}
              >
                <div className="flex items-center mb-4 text-white">
                  <Icon className="h-12 w-12 mr-4" />
                  <div>
                    <h2 className="text-2xl font-bold">{card.title}</h2>
                    <p className="text-sm text-white/90">{card.description}</p>
                  </div>
                </div>
                <ul className="pl-1 text-left text-sm text-white/90 space-y-1">
                  {card.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-white/80" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LoadTypeSelection;
