import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, User, AlertCircle, Eye, EyeOff, Mail, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * RegisterPage – registreringssida i samma stil som login-sidan
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { API_URL } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Hantering av formulärfälten
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Visa/dölj lösenord
  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  // Visa/dölj bekräfta lösenord
  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  // Hantera formuläret (registrering)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    // Validera att lösenorden matchar
    if (formData.password !== formData.confirmPassword) {
      setError("Lösenorden matchar inte");
      setIsLoading(false);
      return;
    }

    try {
      console.log(`Försöker ansluta till: ${API_URL}/api/auth/register`);
      
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword
        })
      });

      // Hantera icke-JSON-svar
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.detail || "Ett fel inträffade vid registrering");
        } else {
          throw new Error(`Serverfel: ${response.status} ${response.statusText}`);
        }
      }

      // Försök tolka JSON-svaret
      const data = await response.json();

      // Registrering lyckades
      setSuccess("Konto skapat! Kontrollera din e-post för att verifiera ditt konto.");
      
      // Rensa formuläret efter framgångsrik registrering
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
      });

      // Automatiskt omdirigera till inloggningssidan efter 3 sekunder
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Ett fel inträffade vid registrering");
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
              Skapa konto - Hagelskott Analys
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

            {success && (
              <Alert variant="default" className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-600 dark:text-green-400">{success}</AlertDescription>
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
                  minLength={3}
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

              {/* E-post */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="E-postadress"
                  value={formData.email}
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
                  minLength={8}
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

              {/* Bekräfta lösenord */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Bekräfta lösenord"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
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
                  onClick={toggleShowConfirmPassword}
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
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Registreringsknapp */}
              <button
                type="submit"
                disabled={isLoading}
                className="
                  w-full
                  flex
                  justify-center
                  py-2
                  px-4
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
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  transition-colors
                  duration-200
                  dark:bg-green-700
                  dark:hover:bg-green-600
                "
              >
                {isLoading ? "Registrerar..." : "Skapa konto"}
              </button>
            </form>
          </CardContent>

          <CardFooter className="text-center pt-2 pb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Har du redan ett konto?{" "}
              <Link
                to="/login"
                className="font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
              >
                Logga in här
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 