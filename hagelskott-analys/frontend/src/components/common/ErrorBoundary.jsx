import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Om ni har en "Button" enligt nytt tema:
import Button from "@/components/common/Button";
// Exempelvis import av Card om ni vill paketera detaljer
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Uppdaterar state så nästa render visar fallback
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    // Ladda om sidan
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo } = this.state;

    if (hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-lg w-full space-y-4 animate-in fade-in duration-300">
            {/* Felmeddelandet i Alert */}
            <Alert variant="destructive" className="shadow-sm">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div className="flex flex-col ml-2">
                <AlertTitle className="text-lg font-semibold">
                  Oväntat fel
                </AlertTitle>
                <AlertDescription>
                  Ett fel har inträffat i applikationen.
                </AlertDescription>
              </div>
            </Alert>

            {/* Kort/Container för reload-knapp och ev. tekniska detaljer */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow p-4 space-y-4">
              <Button
                variant="default"
                onClick={this.handleReload}
                className="w-full"
              >
                Ladda om sidan
              </Button>

              {/* Extra felsökningsdetaljer endast i dev-miljö */}
              {process.env.NODE_ENV === "development" && (
                <details className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <summary className="cursor-pointer text-sm text-gray-700 dark:text-gray-200 font-medium">
                    Tekniska detaljer
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {error?.toString()}
                    {"\n"}
                    {errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Om inget fel => rendera barnkomponenter
    return this.props.children;
  }
}

export default ErrorBoundary;
