import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";

/**
 * LoginPage – en moderniserad inloggningssida i Slack-liknande stil
 * med militärgrön accentfärg.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: localStorage.getItem("rememberedUser") || "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    !!localStorage.getItem("rememberedUser")
  );

  // Hantering av formulärfälten
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Visa/dölj lösenordet
  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  // Testanvändare (ifyllnad av credentials)
  const fillTestCredentials = () => {
    setFormData({ username: "test_user", password: "test_password" });
  };

  // Hantera formuläret (login)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Bygg formulärkropp (x-www-form-urlencoded)
      const formBody = new URLSearchParams({
        username: formData.username,
        password: formData.password,
        grant_type: "password"
      }).toString();

      console.log("Sending request with body:", formBody);

      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json"
        },
        body: formBody
      });

      // Avkoda svarsdata
      const data = await response.json();
      console.log("Server response:", data);

      if (!response.ok) {
        switch (response.status) {
          case 401:
            throw new Error(data.detail || "Felaktiga inloggningsuppgifter");
          case 403:
            throw new Error(data.detail || "Konto är låst eller saknar behörighet");
          case 500:
            throw new Error(data.detail || "Serverfel vid inloggning");
          default:
            throw new Error(data.detail || "Inloggningen misslyckades");
        }
      }

      // Spara token i localStorage
      localStorage.setItem("token", data.access_token);

      // Hantera "Kom ihåg mig"
      if (rememberMe) {
        localStorage.setItem("rememberedUser", formData.username);
      } else {
        localStorage.removeItem("rememberedUser");
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error details:", err);
      setError(
        typeof err.message === "string" ? err.message : "Ett oväntat fel uppstod"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md px-6">
        <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
          {/* Header */}
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Hagelskott Analys
            </CardTitle>
          </CardHeader>

          {/* Innehåll */}
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Användarnamn */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  placeholder="Användarnamn"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="
                    w-full
                    pl-10
                    pr-3
                    py-2
                    rounded-md
                    border
                    border-gray-300
                    bg-white
                    leading-5
                    placeholder-gray-500
                    text-gray-900
                    focus:outline-none
                    focus:ring-2
                    focus:ring-green-500
                    focus:border-green-500
                    dark:border-gray-600
                    dark:bg-gray-700
                    dark:text-gray-100
                    dark:placeholder-gray-400
                  "
                />
              </div>

              {/* Lösenord */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Lösenord"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="
                    w-full
                    pl-10
                    pr-10
                    py-2
                    rounded-md
                    border
                    border-gray-300
                    bg-white
                    leading-5
                    placeholder-gray-500
                    text-gray-900
                    focus:outline-none
                    focus:ring-2
                    focus:ring-green-500
                    focus:border-green-500
                    dark:border-gray-600
                    dark:bg-gray-700
                    dark:text-gray-100
                    dark:placeholder-gray-400
                  "
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={toggleShowPassword}
                  className="
                    absolute
                    inset-y-0
                    right-0
                    pr-3
                    flex
                    items-center
                    text-gray-400
                    hover:text-gray-600
                    dark:text-gray-300
                    dark:hover:text-gray-100
                  "
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Kom ihåg mig */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="
                      h-4
                      w-4
                      text-green-600
                      border-gray-300
                      rounded
                      focus:ring-green-500
                      dark:bg-gray-700
                      dark:border-gray-600
                    "
                  />
                  <label
                    htmlFor="rememberMe"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-200"
                  >
                    Kom ihåg mig
                  </label>
                </div>
                <button
                  type="button"
                  onClick={fillTestCredentials}
                  className="
                    text-sm
                    text-gray-600
                    hover:text-gray-800
                    dark:text-gray-300
                    dark:hover:text-gray-100
                  "
                >
                  Använd testinloggning
                </button>
              </div>

              {/* Inloggningsknapp */}
              <button
                type="submit"
                disabled={isLoading}
                className={`
                  w-full
                  flex
                  justify-center
                  items-center
                  py-2
                  px-4
                  text-sm
                  font-medium
                  rounded-md
                  transition-colors
                  bg-green-600
                  hover:bg-green-700
                  focus:outline-none
                  focus:ring-2
                  focus:ring-green-500
                  focus:ring-offset-2
                  text-white
                  ${
                    isLoading
                      ? "opacity-70 cursor-not-allowed"
                      : ""
                  }
                `}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="
                      animate-spin
                      rounded-full
                      h-4
                      w-4
                      border-b-2
                      border-white
                      mr-2
                    "></div>
                    Loggar in...
                  </div>
                ) : (
                  "Logga in"
                )}
              </button>

              {/* Exempelinfo eller footnote */}
              <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                <p className="leading-tight">
                  Testanvändare: <strong>test_user</strong> / <strong>test_password</strong>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
