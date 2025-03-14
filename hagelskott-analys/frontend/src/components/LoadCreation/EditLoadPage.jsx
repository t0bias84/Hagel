import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2,
  Save,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * EditLoadPage
 * ============
 * Sida för att redigera en specifik laddning (hagel, kula m.m.).
 *  - Hämtar data från /api/loads/:id
 *  - Uppdaterar via PUT /api/loads/:id
 *  - Visar en loading-spinner under hämtning
 *  - Visar felmeddelanden och success-meddelanden
 *  - Återgår till listan efter lyckad uppdatering
 */
const EditLoadPage = () => {
  const { id } = useParams(); // Hämta laddningens ID från URL:en
  const navigate = useNavigate();

  // Laddningens data
  const [loadData, setLoadData] = useState(null);

  // States för laddningsstatus och eventuella meddelanden
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /**
   * 1) Hämta laddning (GET /api/loads/:id)
   */
  useEffect(() => {
    const fetchLoad = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const token = localStorage.getItem("token"); // eller annan metod att hämta token
        const response = await fetch(`http://localhost:8000/api/loads/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Kunde inte hämta laddningen.");
        }

        const data = await response.json();
        setLoadData(data);
      } catch (err) {
        setError(
          err.message || "Ett oväntat fel uppstod vid hämtning av laddningen."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLoad();
  }, [id]);

  /**
   * Uppdaterar state när man skriver i fälten
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoadData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Sparar ändringar i laddningen (PUT /api/loads/:id).
   */
  const handleSave = async () => {
    if (!loadData) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8000/api/loads/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(loadData),
      });

      if (!response.ok) {
        throw new Error("Kunde inte spara ändringarna.");
      }

      setSuccess("Laddningen har uppdaterats!");
      // Navigera tillbaka till listan (eller valfri sida) efter kort fördröjning
      setTimeout(() => {
        navigate("/load-list");
      }, 1500);
    } catch (err) {
      setError(err.message || "Ett fel uppstod vid sparandet.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gå tillbaka till listan
   */
  const handleBack = () => {
    navigate("/load-list");
  };

  /**
   * Om vi fortfarande laddar data och ännu inte har loadData
   */
  if (loading && !loadData && !error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg font-medium text-gray-600">Laddar...</span>
      </div>
    );
  }

  /**
   * Om vi fick ett fel innan vi har loadData
   */
  if (error && !loadData) {
    return (
      <div className="max-w-lg mx-auto mt-10 p-4 border border-red-200 bg-red-50 text-red-500 rounded-md">
        <p className="mb-2 font-semibold">Fel: {error}</p>
        <button
          onClick={handleBack}
          className="mt-4 inline-flex items-center gap-1 bg-gray-200 text-gray-800 px-3 py-2 rounded-md hover:bg-gray-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Tillbaka till listan
        </button>
      </div>
    );
  }

  /**
   * Om inget laddningsobjekt alls - ex. om ID saknas
   */
  if (!loadData) {
    return (
      <div className="text-center mt-20 text-gray-500">
        <p className="mb-2">Ingen laddningsdata att visa.</p>
        <button
          onClick={handleBack}
          className="mt-4 bg-gray-200 text-gray-800 px-3 py-2 rounded-md hover:bg-gray-300 inline-flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Tillbaka
        </button>
      </div>
    );
  }

  /**
   * Slutligen, rendera själva redigeringsformuläret
   */
  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header med "Tillbaka"-knapp och sidtitel */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className="inline-flex items-center bg-gray-200 text-gray-800 px-3 py-2 rounded-md hover:bg-gray-300"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Tillbaka
        </button>
        <h1 className="text-2xl font-bold">Redigera Laddning</h1>
      </div>

      {/* Felmeddelande */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Framgångsmeddelande */}
      {success && (
        <Alert variant="default" className="mb-4">
          <CheckCircle className="h-5 w-5" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Formulärfält */}
      <div className="space-y-4">
        <div>
          <label className="block font-semibold mb-2" htmlFor="name">
            Namn på laddning
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={loadData.name || ""}
            onChange={handleChange}
            className="border border-gray-300 p-2 rounded-md w-full focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Tobias laddning #1"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2" htmlFor="purpose">
            Syfte
          </label>
          <input
            id="purpose"
            name="purpose"
            type="text"
            value={loadData.purpose || ""}
            onChange={handleChange}
            className="border border-gray-300 p-2 rounded-md w-full focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Jakt på småvilt"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2" htmlFor="type">
            Typ
          </label>
          <input
            id="type"
            name="type"
            type="text"
            value={loadData.type || ""}
            onChange={handleChange}
            className="border border-gray-300 p-2 rounded-md w-full focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Hagel, Kula..."
          />
        </div>

        <div>
          <label className="block font-semibold mb-2" htmlFor="caliber">
            Kaliber
          </label>
          <input
            id="caliber"
            name="caliber"
            type="text"
            value={loadData.caliber || ""}
            onChange={handleChange}
            className="border border-gray-300 p-2 rounded-md w-full focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: 12, 20, .308..."
          />
        </div>

        <div>
          <label className="block font-semibold mb-2" htmlFor="shellLength">
            Hylslängd (mm)
          </label>
          <input
            id="shellLength"
            name="shellLength"
            type="text"
            value={loadData.shellLength || ""}
            onChange={handleChange}
            className="border border-gray-300 p-2 rounded-md w-full focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: 70, 76..."
          />
        </div>
      </div>

      {/* Spara-knapp */}
      <button
        onClick={handleSave}
        disabled={loading}
        className={`mt-6 w-full flex items-center justify-center px-4 py-2 
          rounded-md text-white font-semibold 
          ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Sparar...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Spara ändringar
          </>
        )}
      </button>
    </div>
  );
};

export default EditLoadPage;
