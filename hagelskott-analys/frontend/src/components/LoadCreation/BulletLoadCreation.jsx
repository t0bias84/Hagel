import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// UI-komponenter – justera efter dina faktiska imports
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

/**
 * BulletLoadCreation
 * ==================
 * Sida för att skapa en kulladdning genom att välja komponenter från databasen.
 * - Hämtar primer-, krut- och kul-listor från ex. /api/components/bullet
 * - Tillåter användare att välja vilka komponenter som ingår
 * - Tar in värden som kaliber, COL (cartridgeLength), krutmängd m.m.
 * - Skickar data via POST /api/loads/bullet
 */
const BulletLoadCreation = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ”Valbara” komponenter, hämtas från backend
  const [primers, setPrimers] = useState([]);
  const [powders, setPowders] = useState([]);
  const [bullets, setBullets] = useState([]);
  // Du kan även ha hylsor (cases) mm. om API:t erbjuder det:
  // const [cases, setCases] = useState([]);

  // Formulärdata för att skapa laddningen
  const [loadData, setLoadData] = useState({
    // Exempel på några vanliga fält:
    caliber: "6.5x55",
    cartridgeLength: 0, // Patronens totallängd (mm)
    primer: null,       // Valt primer-objekt
    powder: null,       // Valt powder-objekt
    powderWeight: 0,    // Mängd krut (grains eller gram)
    bullet: null,       // Valt bullet-objekt
    bulletSeating: 0,   // Kulansättning (mm)
    notes: "",

    // Om du vill stödja hylsval:
    // case: null,
    // t.ex. caseLength: "",
  });

  /**
   * Hämta valbara komponenter (primer, powder, bullet, ev. cases) vid mount
   */
  useEffect(() => {
    const fetchComponents = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const token = localStorage.getItem("token");
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/components/bullet`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Kunde inte hämta komponenter");
        }

        const data = await response.json();

        // Filtrera efter typ (justera efter hur ditt API returnerar data)
        setPrimers(data.filter((c) => c.type === "primer"));
        setPowders(data.filter((c) => c.type === "powder"));
        setBullets(data.filter((c) => c.type === "bullet"));
        // setCases(data.filter((c) => c.type === "case")); // ex.

      } catch (err) {
        setError(err.message || "Ett oväntat fel uppstod.");
      } finally {
        setLoading(false);
      }
    };

    fetchComponents();
  }, []);

  /**
   * handleSave()
   * -----------
   * Skickar laddnings-data till /api/loads/bullet (eller annan valfri endpoint)
   */
  const handleSave = async () => {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/loads/bullet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...loadData,
            primerId: loadData.primer?.id || null,
            powderId: loadData.powder?.id || null,
            bulletId: loadData.bullet?.id || null,
            // caseId: loadData.case?.id || null, // om du stödjer hylsval
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Kunde inte spara laddningen");
      }

      setSuccess("Laddningen har sparats!");
      // Rensa ev. fält eller låt användaren fortsätta
      // setLoadData({ ...loadData, notes: "" });
    } catch (err) {
      setError(err.message || "Ett oväntat fel uppstod vid sparandet.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Laddning pågår (endast om ingen data finns ännu) 
   * och inget error är returnerat
   */
  if (loading && !primers.length && !powders.length && !bullets.length && !error) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Skapa ny kulladdning</h1>
      </div>

      {/* Felmeddelande */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Framgångsmeddelande */}
      {success && (
        <Alert variant="default">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Grundinformation</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kaliber */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Kaliber
            </label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              value={loadData.caliber}
              onChange={(e) =>
                setLoadData((prev) => ({ ...prev, caliber: e.target.value }))
              }
            >
              <option value="6.5x55">6.5x55</option>
              <option value=".308win">.308 Winchester</option>
              <option value=".30-06">.30-06 Springfield</option>
              {/* Fyll på med fler kalibrar enligt behov */}
            </select>
          </div>

          {/* Patronens totallängd */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Patronlängd (COL) i mm
            </label>
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              value={loadData.cartridgeLength}
              onChange={(e) =>
                setLoadData((prev) => ({
                  ...prev,
                  cartridgeLength: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Komponenter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Komponenter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tändhatt */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tändhatt
            </label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              value={loadData.primer?.id || ""}
              onChange={(e) => {
                const found = primers.find((p) => p.id === e.target.value);
                setLoadData((prev) => ({ ...prev, primer: found || null }));
              }}
            >
              <option value="">Välj tändhatt</option>
              {primers.map((primer) => (
                <option key={primer.id} value={primer.id}>
                  {primer.name} ({primer.manufacturer})
                </option>
              ))}
            </select>
          </div>

          {/* Krut */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Krut
            </label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              value={loadData.powder?.id || ""}
              onChange={(e) => {
                const found = powders.find((pw) => pw.id === e.target.value);
                setLoadData((prev) => ({ ...prev, powder: found || null }));
              }}
            >
              <option value="">Välj krut</option>
              {powders.map((powder) => (
                <option key={powder.id} value={powder.id}>
                  {powder.name} ({powder.manufacturer})
                </option>
              ))}
            </select>
          </div>

          {/* Krutmängd */}
          {loadData.powder && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Krutmängd (gr)
              </label>
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                value={loadData.powderWeight}
                onChange={(e) =>
                  setLoadData((prev) => ({
                    ...prev,
                    powderWeight: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          )}

          {/* Kula */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Kula
            </label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              value={loadData.bullet?.id || ""}
              onChange={(e) => {
                const found = bullets.find((b) => b.id === e.target.value);
                setLoadData((prev) => ({ ...prev, bullet: found || null }));
              }}
            >
              <option value="">Välj kula</option>
              {bullets.map((bullet) => (
                <option key={bullet.id} value={bullet.id}>
                  {bullet.name} ({bullet.manufacturer}), {bullet.weight} gr
                </option>
              ))}
            </select>
          </div>

          {/* Kulansättning */}
          {loadData.bullet && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Kulansättning (mm)
              </label>
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                value={loadData.bulletSeating}
                onChange={(e) =>
                  setLoadData((prev) => ({
                    ...prev,
                    bulletSeating: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anteckningar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Anteckningar</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            rows={4}
            placeholder="Ex: testat i 20° C, siktar på ~800 m/s..."
            value={loadData.notes}
            onChange={(e) =>
              setLoadData((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
        </CardContent>
      </Card>

      {/* Spara-knapp */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Spara laddning
        </button>
      </div>
    </div>
  );
};

export default BulletLoadCreation;
