import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Save, ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function EditLoadPage() {
  const { id } = useParams(); // Hämta laddningens ID från URL:en
  const navigate = useNavigate();

  // Tillstånd för loading, error, success etc.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Laddnings-data
  const [loadData, setLoadData] = useState({
    name: "",
    purpose: "",
    type: "Hagel",
    caliber: "12",
    shellLength: "70",
    components: [],
  });

  // 1) Hämta laddningsdata baserat på ID (mockad fetch)
  useEffect(() => {
    const fetchLoad = async () => {
      try {
        setLoading(true);
        setError(null);

        // Mockat API-anrop, ersätt med riktigt:
        //   const response = await fetch(`/api/loads/${id}`);
        //   const data = await response.json();
        //   if (!response.ok) throw new Error("Kunde inte hämta laddningen.");

        // Simulerad delay och mock-data
        const response = await new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              ok: true,
              data: {
                id,
                name: "Tobias laddning #1",
                purpose: "Duvjakt",
                type: "Hagel",
                caliber: "12",
                shellLength: "70",
                components: [
                  { name: "Krut", amount: "1.5g" },
                  { name: "Förladdning", amount: "Standard" },
                  { name: "Hagel", amount: "28g" },
                ],
              },
            });
          }, 1000)
        );

        if (!response.ok) {
          throw new Error("Kunde inte hämta laddningen.");
        }
        setLoadData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLoad();
  }, [id]);

  // 2) Hantera input-förändringar (textfält etc.)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoadData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 3) Hantera spara/uppdatera-laddning (mock)
  const handleSave = async () => {
    try {
      setLoading(true);
      setSuccessMsg(null);
      setError(null);

      // Mock av API-anrop:
      //   const response = await fetch(`/api/loads/${id}`, {
      //     method: "PUT",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify(loadData),
      //   });
      //   if (!response.ok) throw new Error("Kunde inte spara ändringarna.");

      // Simulerad delay
      const response = await new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true }), 1000)
      );

      if (!response.ok) {
        throw new Error("Kunde inte spara ändringarna.");
      }

      // Om allt gick bra
      setSuccessMsg("Laddningen har uppdaterats!");
      setLoading(false);

      // Navigera tillbaka till en "load-list" eller var du vill:
      //  setTimeout(() => navigate("/load-list"), 1500);

    } catch (err) {
      console.error(err);
      setError(err.message || "Ett fel uppstod vid sparandet.");
      setLoading(false);
    }
  };

  // 4) Hantera tillbaka-knappen
  const handleBack = () => {
    navigate("/load-list");
  };

  // -------------- Render --------------

  // Loading-läge
  if (loading && !loadData.name && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="text-lg font-medium text-gray-600">Laddar laddning...</span>
      </div>
    );
  }

  // Fel-läge
  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 p-4 border border-red-200 bg-red-50 rounded-md">
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="h-5 w-5" />
          <p className="font-semibold">Ett fel uppstod</p>
        </div>
        <p className="text-sm text-red-700">{error}</p>

        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Tillbaka till listan
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Tillbaka
        </button>
        <h1 className="text-2xl font-bold">Redigera Laddning</h1>
      </div>

      {/* Successmeddelande om sparning lyckas */}
      {successMsg && (
        <div className="mb-4 flex items-center space-x-2 border border-green-200 bg-green-50 text-green-700 rounded-md p-3">
          <CheckCircle2 className="h-5 w-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Formulär */}
      <div className="space-y-4 bg-white shadow-md rounded-md p-4">
        {/* Namn */}
        <div>
          <label className="block font-semibold mb-1" htmlFor="name">
            Namn på laddningen:
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={loadData.name || ""}
            onChange={handleChange}
            className="border p-2 rounded-md w-full"
            placeholder="Ex: Tobias laddning #1"
          />
        </div>

        {/* Syfte */}
        <div>
          <label className="block font-semibold mb-1" htmlFor="purpose">
            Syfte:
          </label>
          <input
            id="purpose"
            type="text"
            name="purpose"
            value={loadData.purpose || ""}
            onChange={handleChange}
            className="border p-2 rounded-md w-full"
            placeholder="Ex: Jakt på småvilt"
          />
        </div>

        {/* Typ (ev. dropdown) */}
        <div>
          <label className="block font-semibold mb-1" htmlFor="type">
            Typ av laddning:
          </label>
          <input
            id="type"
            type="text"
            name="type"
            value={loadData.type || ""}
            onChange={handleChange}
            className="border p-2 rounded-md w-full"
          />
          {/* Exempel: du kan göra detta till en <select> om du vill. */}
        </div>

        {/* Kaliber */}
        <div>
          <label className="block font-semibold mb-1" htmlFor="caliber">
            Kaliber:
          </label>
          <input
            id="caliber"
            type="text"
            name="caliber"
            value={loadData.caliber || ""}
            onChange={handleChange}
            className="border p-2 rounded-md w-full"
          />
        </div>

        {/* Hylslängd */}
        <div>
          <label className="block font-semibold mb-1" htmlFor="shellLength">
            Hylslängd:
          </label>
          <input
            id="shellLength"
            type="text"
            name="shellLength"
            value={loadData.shellLength || ""}
            onChange={handleChange}
            className="border p-2 rounded-md w-full"
          />
        </div>

        {/* Komponentlista? (om du vill ha en upprepningsbar sektion) */}
        {/* Exempelvis loadData.components, du kan mappa över dem osv. */}
      </div>

      {/* Spara-knapp */}
      <button
        onClick={handleSave}
        disabled={loading}
        className={`mt-6 w-full flex items-center justify-center bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors ${
          loading ? "opacity-75 cursor-not-allowed" : ""
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sparar...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Spara ändringar
          </>
        )}
      </button>
    </div>
  );
}
