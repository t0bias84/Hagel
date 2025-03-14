import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// UI-komponenter (exempel)
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Ikoner (Lucide)
import { Camera, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

// Din formulärkomponent för uppladdning
import ShotUploadForm from "@/components/upload/ShotUploadForm";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  // -- Callbacks för ShotUploadForm --
  function handleUploadStart() {
    setUploading(true);
    setError(null);
    setSuccess(null);
  }

  function handleUploadSuccess(result) {
    setUploading(false);
    setSuccess({
      message: "Analysen genomfördes utan problem!",
      pattern_id: result.pattern_id
    });

    // Visa meddelande en kort stund
    setTimeout(() => {
      navigate(`/analysis/${result.pattern_id}`);
    }, 1500);
  }

  function handleUploadError(err) {
    setUploading(false);
    setError(err.message || "Ett fel uppstod under uppladdningen.");
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-8">
      {/* Rubrik + ikon */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <Camera className="h-8 w-8 text-green-600" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          Ladda upp ny analys
        </h1>
      </div>

      {/* Eventuell fel-Alert */}
      {error && (
        <Alert
          variant="destructive"
          className="animate-in fade-in duration-300 shadow-sm"
        >
          <AlertCircle className="h-5 w-5" />
          <div className="ml-2 flex flex-col">
            <AlertTitle>Uppladdningsfel</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* Eventuell success-Alert */}
      {success && (
        <Alert
          variant="default"
          className="
            bg-green-50 border-green-200 text-green-700 
            animate-in fade-in duration-300 shadow-sm
          "
        >
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertDescription className="ml-2">
            {success.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Kort med uppladdningsformulär eller loader */}
      <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="p-4 text-center">
          <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Hagelsvärmsanalys
          </CardTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Ladda upp en bild av din hagelsvärm för detaljerad analys
          </p>
        </CardHeader>

        <CardContent className="p-6">
          {uploading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <p className="text-gray-600 dark:text-gray-300">
                Bearbetar bild...
              </p>
            </div>
          ) : (
            <ShotUploadForm
              onUploadStart={handleUploadStart}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          )}
        </CardContent>
      </Card>

      {/* Tips-kort */}
      <Card className="shadow-sm border border-green-200 bg-green-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg text-green-700 mb-4">
            Tips för bästa resultat
          </h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li className="flex items-start gap-2">
              <div className="mt-1 h-2 w-2 rounded-full bg-green-700" />
              <span>Ta bilden i bra ljus, rakt framifrån.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-1 h-2 w-2 rounded-full bg-green-700" />
              <span>Se till att hela tavlan syns (hela träffbilden).</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-1 h-2 w-2 rounded-full bg-green-700" />
              <span>Undvik starka skuggor eller reflektioner.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-1 h-2 w-2 rounded-full bg-green-700" />
              <span>Använd helst .jpg eller .png (max ~10MB).</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Support-länk */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p>
          Problem med uppladdningen?{" "}
          <button
            onClick={() => navigate("/support")}
            className="text-green-700 hover:underline"
          >
            Kontakta support
          </button>
        </p>
      </div>
    </div>
  );
}
