import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// UI-components (example)
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons (Lucide)
import { Camera, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

// Din formulärkomponent för uppladdning
import ShotUploadForm from "@/components/upload/ShotUploadForm";

export default function UploadPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  // -- Callbacks for ShotUploadForm --
  function handleUploadStart() {
    setLoading(true);
    setError(null);
    setSuccess(null);
  }

  function handleUploadSuccess(result) {
    setLoading(false);
    setSuccess({
      message: "Analysis completed successfully!",
      result,
    });

    // Show message briefly
    setTimeout(() => {
      navigate(`/analysis/${result.id}`);
    }, 1500);
  }

  function handleUploadError(err) {
    setLoading(false);
    setError(err.message || "An error occurred during upload.");
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <Camera className="h-8 w-8 text-green-600" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          Upload New Analysis
        </h1>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          variant="destructive"
          className="animate-in fade-in duration-300 shadow-sm"
        >
          <AlertCircle className="h-5 w-5" />
          <div className="ml-2 flex flex-col">
            <AlertTitle>Upload Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert
          variant="success"
          className={`
            animate-in fade-in duration-300 shadow-sm
          `}
        >
          <AlertDescription className="ml-2">
            {success.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Card with upload form or loader */}
      <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="p-4 text-center">
          <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Shot Pattern Analysis
          </CardTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Upload an image of your shot pattern for detailed analysis
          </p>
        </CardHeader>

        <CardContent className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Processing image...
              </p>
            </div>
          ) : (
            <ShotUploadForm
              onStart={handleUploadStart}
              onSuccess={handleUploadSuccess}
              onError={handleUploadError}
            />
          )}
        </CardContent>
      </Card>

      {/* Tips card */}
      <Card className="shadow-sm border border-green-200 bg-green-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg text-green-700 mb-4">
            Tips for Best Results
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-green-800">
            <li>Ensure good lighting when taking the photo</li>
            <li>Keep the camera parallel to the target surface</li>
            <li>Include the entire pattern in the frame</li>
            <li>Avoid shadows and reflections if possible</li>
          </ul>
        </CardContent>
      </Card>

      {/* Support link */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p>
          Problem with upload?{" "}
          <button
            onClick={() => navigate("/support")}
            className="text-green-700 hover:underline"
          >
            Contact support
          </button>
        </p>
      </div>
    </div>
  );
}
