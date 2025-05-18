import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, User, AlertCircle, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * LoginPage – en moderniserad inloggningssida med mörkare tema
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
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

  // Hantera formuläret (login)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        // Hantera "Kom ihåg mig"
        if (rememberMe) {
          localStorage.setItem("rememberedUser", formData.username);
        } else {
          localStorage.removeItem("rememberedUser");
        }
        
        navigate("/dashboard");
      } else {
        setError(result.error || "Inloggningen misslyckades");
      }
    } catch (err) {
      console.error("Login error details:", err);
      setError(
        typeof err.message === "string" ? err.message : "Ett oväntat fel inträffade"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 bg-gradient-to-b from-gray-800 to-gray-950">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <Shield className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Hagelskott Analys</h1>
          <p className="text-gray-400 mt-1">Säker inloggning till analysplattformen</p>
        </div>
        
        <Card className="shadow-2xl border-0 bg-gray-800/80 backdrop-blur-sm">
          {/* Header */}
          <CardHeader className="text-center pb-2 border-b border-gray-700">
            <CardTitle className="text-xl font-medium text-gray-100">
              Logga in
            </CardTitle>
          </CardHeader>

          {/* Innehåll */}
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-6 bg-red-900/30 border-red-800 text-red-200">
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
                    py-3
                    rounded-md
                    border
                    border-gray-600
                    bg-gray-700/60
                    leading-5
                    placeholder-gray-400
                    text-gray-100
                    focus:outline-none
                    focus:ring-2
                    focus:ring-green-500
                    focus:border-green-500
                    transition-colors
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
                    py-3
                    rounded-md
                    border
                    border-gray-600
                    bg-gray-700/60
                    leading-5
                    placeholder-gray-400
                    text-gray-100
                    focus:outline-none
                    focus:ring-2
                    focus:ring-green-500
                    focus:border-green-500
                    transition-colors
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
                    hover:text-gray-200
                    transition-colors
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
                      border-gray-600
                      rounded
                      focus:ring-green-500
                      bg-gray-700
                    "
                  />
                  <label
                    htmlFor="rememberMe"
                    className="ml-2 text-sm text-gray-300"
                  >
                    Kom ihåg mig
                  </label>
                </div>
                <div className="text-sm">
                  <Link 
                    to="/forgot-password" 
                    className="text-green-400 hover:text-green-300 font-medium transition-colors"
                  >
                    Glömt lösenord?
                  </Link>
                </div>
              </div>

              {/* Inloggningsknapp */}
              <button
                type="submit"
                disabled={isLoading}
                className="
                  w-full
                  flex
                  justify-center
                  py-3
                  px-4
                  mt-6
                  border
                  border-transparent
                  rounded-md
                  shadow-sm
                  text-sm
                  font-medium
                  text-white
                  bg-green-600
                  hover:bg-green-700
                  focus:outline-none
                  focus:ring-2
                  focus:ring-offset-2
                  focus:ring-green-500
                  focus:ring-offset-gray-800
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  transition-colors
                  duration-200
                "
              >
                {isLoading ? "Loggar in..." : "Logga in"}
              </button>
            </form>
          </CardContent>

          <CardFooter className="text-center pt-2 pb-6 border-t border-gray-700 mt-6">
            <p className="text-sm text-gray-400">
              Har du inget konto?{" "}
              <Link
                to="/register"
                className="font-medium text-green-400 hover:text-green-300 transition-colors"
              >
                Registrera dig här
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
